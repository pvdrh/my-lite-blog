const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculate reading time in minutes
 */
function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

/**
 * Generate table of contents from markdown headings
 */
function generateTOC(html) {
  const headingRegex = /<h([2-4])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[2-4]>/gi;
  const toc = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    toc.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]*>/g, '').trim()
    });
  }

  if (toc.length === 0) return '';

  let tocHtml = '<nav class="toc"><h2>Table of Contents</h2><ul>';
  toc.forEach(item => {
    const indent = (item.level - 2) * 20;
    tocHtml += `<li style="margin-left: ${indent}px"><a href="#${item.id}">${item.text}</a></li>`;
  });
  tocHtml += '</ul></nav>';

  return tocHtml;
}

/**
 * Add IDs to headings for TOC linking
 */
function addHeadingIds(html) {
  let counter = {};
  return html.replace(/<h([2-6])>([^<]*)<\/h[2-6]>/gi, (match, level, text) => {
    let id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    if (counter[id]) {
      counter[id]++;
      id = `${id}-${counter[id]}`;
    } else {
      counter[id] = 1;
    }

    return `<h${level} id="${id}">${text}</h${level}>`;
  });
}

/**
 * Find related posts based on shared tags
 */
function findRelatedPosts(currentPost, allPosts, limit = 3) {
  if (!currentPost.tags || currentPost.tags.length === 0) {
    return [];
  }

  const scored = allPosts
    .filter(p => p.slug !== currentPost.slug && !p.draft && 
                 p.slug !== 'index' && p.slug !== 'about' && !p.slug.startsWith('tags/'))
    .map(post => {
      const sharedTags = (post.tags || []).filter(tag => 
        currentPost.tags.includes(tag)
      ).length;
      return { post, score: sharedTags };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.post);

  return scored;
}

/**
 * Generate RSS feed XML
 */
function generateRSS(posts, siteConfig) {
  const { title, description, siteUrl } = siteConfig;
  const sortedPosts = posts
    .filter(p => !p.draft && p.slug !== 'index' && !p.slug.startsWith('tags/') && p.slug !== 'about')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(title)}</title>
  <description>${escapeXml(description)}</description>
  <link>${siteUrl}</link>
  <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
`;

  sortedPosts.forEach(post => {
    const postUrl = `${siteUrl}/${post.slug}.html`;
    rss += `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${postUrl}</link>
    <guid>${postUrl}</guid>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <description>${escapeXml(post.description || '')}</description>
  </item>
`;
  });

  rss += `</channel>
</rss>`;

  return rss;
}

/**
 * Generate sitemap XML
 */
function generateSitemap(posts, siteConfig) {
  const { siteUrl } = siteConfig;
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  posts.filter(p => !p.draft && p.slug !== 'index' && !p.slug.startsWith('tags/')).forEach(post => {
    sitemap += `  <url>
    <loc>${siteUrl}/${post.slug}.html</loc>
    <lastmod>${new Date(post.date).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;
  return sitemap;
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate file hash for incremental build
 */
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Load or create build cache
 */
function loadBuildCache(cacheFile) {
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Save build cache
 */
function saveBuildCache(cacheFile, cache) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

/**
 * Check if file needs rebuild
 */
function needsRebuild(filePath, cache) {
  const currentHash = getFileHash(filePath);
  const cachedHash = cache[filePath];
  return currentHash !== cachedHash;
}

/**
 * Format date for display
 */
function formatDate(dateStr, locale = 'en-US') {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Slugify string
 */
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Clean directory
 */
function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  ensureDir(dirPath);
}

/**
 * Generate pagination
 */
function paginate(items, perPage = 10) {
  const totalPages = Math.ceil(items.length / perPage);
  const pages = [];

  for (let i = 0; i < totalPages; i++) {
    const start = i * perPage;
    const end = start + perPage;
    pages.push({
      items: items.slice(start, end),
      currentPage: i + 1,
      totalPages,
      hasNext: i < totalPages - 1,
      hasPrev: i > 0,
      nextPage: i < totalPages - 1 ? i + 2 : null,
      prevPage: i > 0 ? i : null
    });
  }

  return pages;
}

module.exports = {
  calculateReadingTime,
  generateTOC,
  addHeadingIds,
  findRelatedPosts,
  generateRSS,
  generateSitemap,
  escapeXml,
  getFileHash,
  loadBuildCache,
  saveBuildCache,
  needsRebuild,
  formatDate,
  slugify,
  ensureDir,
  copyDir,
  cleanDir,
  paginate
};
