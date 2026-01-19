const http = require('http');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const mime = require('mime-types');
const crypto = require('crypto');

/**
 * Simple in-memory file cache
 */
class FileCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if file was modified
    try {
      const stat = fs.statSync(key);
      if (stat.mtimeMs > item.mtime) {
        this.cache.delete(key);
        return null;
      }
    } catch {
      this.cache.delete(key);
      return null;
    }
    
    return item;
  }

  set(key, content, mtime) {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const etag = crypto.createHash('md5').update(content).digest('hex');
    this.cache.set(key, { content, mtime, etag });
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Security headers
 */
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/**
 * Get cache headers based on content type
 */
function getCacheHeaders(contentType, isDev = true) {
  if (isDev) {
    return { 'Cache-Control': 'no-cache, no-store, must-revalidate' };
  }
  
  // Production caching
  if (contentType.includes('image') || contentType.includes('font')) {
    return { 'Cache-Control': 'public, max-age=31536000, immutable' };
  }
  if (contentType.includes('css') || contentType.includes('javascript')) {
    return { 'Cache-Control': 'public, max-age=86400' };
  }
  return { 'Cache-Control': 'public, max-age=3600' };
}

/**
 * Validate and sanitize URL path
 */
function sanitizePath(urlPath, outputDir) {
  // Decode URL
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  // Block path traversal
  if (decoded.includes('..') || decoded.includes('//') || decoded.includes('\\')) {
    return null;
  }

  // Resolve path
  const filePath = path.join(outputDir, decoded);
  const realPath = path.resolve(filePath);

  // Ensure within outputDir
  if (!realPath.startsWith(path.resolve(outputDir))) {
    return null;
  }

  return realPath;
}

/**
 * Notify all clients to reload
 */
function notifyReload(clients) {
  clients.forEach(client => {
    try {
      client.write('data: reload\n\n');
    } catch {
      // Client disconnected
    }
  });
}

/**
 * Start development server with file watching
 */
async function startDevServer(projectDir, port, buildFn) {
  const outputDir = path.join(projectDir, 'public');
  const clients = [];
  const fileCache = new FileCache(50);

  // Initial build
  console.log('📦 Initial build...');
  await buildFn(projectDir, { incremental: false });

  // Live reload script (minified)
  const liveReloadScript = `<script>!function(){var e=new EventSource("/__live-reload");e.onmessage=function(e){"reload"===e.data&&location.reload()},e.onerror=function(){e.close(),setTimeout(function(){location.reload()},2e3)}}();</script>`;

  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];

    // Handle live reload SSE
    if (url === '/__live-reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        ...securityHeaders
      });

      clients.push(res);
      req.on('close', () => {
        const idx = clients.indexOf(res);
        if (idx !== -1) clients.splice(idx, 1);
      });
      return;
    }

    // Sanitize path
    let urlPath = url === '/' ? '/index.html' : url;
    if (!path.extname(urlPath)) urlPath += '.html';
    
    const filePath = sanitizePath(urlPath, outputDir);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain', ...securityHeaders });
      res.end('Forbidden');
      return;
    }

    // Check cache first
    let cached = fileCache.get(filePath);
    
    if (!cached) {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        const notFoundPath = path.join(outputDir, '404.html');
        if (fs.existsSync(notFoundPath)) {
          res.writeHead(404, { 'Content-Type': 'text/html', ...securityHeaders });
          res.end(fs.readFileSync(notFoundPath));
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain', ...securityHeaders });
          res.end('404 Not Found');
        }
        return;
      }

      // Read and cache file
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath);
      fileCache.set(filePath, content, stat.mtimeMs);
      cached = fileCache.get(filePath);
    }

    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    // Check ETag for 304
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === cached.etag) {
      res.writeHead(304, securityHeaders);
      res.end();
      return;
    }

    // Prepare response
    let content = cached.content;
    
    // Inject live reload for HTML
    if (contentType === 'text/html') {
      content = content.toString().replace('</body>', liveReloadScript + '</body>');
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(content),
      'ETag': cached.etag,
      ...getCacheHeaders(contentType, true),
      ...securityHeaders
    });
    res.end(content);
  });

  server.listen(port, () => {
    console.log(`\n🌐 Dev server running at http://localhost:${port}`);
    console.log('   Watching for changes...\n');
  });

  // Watch for file changes
  const watchPaths = [
    path.join(projectDir, 'pages'),
    path.join(projectDir, 'templates'),
    path.join(projectDir, 'static'),
    path.join(projectDir, 'config.json')
  ].filter(p => fs.existsSync(p));

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    depth: 10,           // Watch subdirectories
    awaitWriteFinish: {  // Wait for file to finish writing
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  let buildTimeout = null;
  const debouncedBuild = (eventType, filePath) => {
    if (buildTimeout) clearTimeout(buildTimeout);
    buildTimeout = setTimeout(async () => {
      console.log(`🔄 ${eventType}: ${path.relative(projectDir, filePath)}`);
      try {
        await buildFn(projectDir, { incremental: true });
        fileCache.clear(); // Clear cache after rebuild
        notifyReload(clients);
        console.log('✅ Rebuild complete\n');
      } catch (error) {
        console.error('❌ Build error:', error.message);
      }
    }, 150);
  };

  watcher
    .on('add', (p) => debouncedBuild('Added', p))
    .on('change', (p) => debouncedBuild('Changed', p))
    .on('unlink', (p) => debouncedBuild('Removed', p));

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    watcher.close();
    server.close();
    process.exit(0);
  });

  return server;
}

module.exports = { startDevServer, notifyReload };
