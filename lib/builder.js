const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const hljs = require('highlight.js');
const { glob } = require('glob');

const {
  calculateReadingTime,
  generateTOC,
  addHeadingIds,
  findRelatedPosts,
  generateRSS,
  generateSitemap,
  formatDate,
  slugify,
  ensureDir,
  copyDir,
  cleanDir,
  paginate,
  loadBuildCache,
  saveBuildCache,
  needsRebuild,
  getFileHash
} = require('./utils.js');

// Configure marked with syntax highlighting
marked.use({
  gfm: true,
  breaks: true
});

// Custom renderer for code blocks with highlighting
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
  const validLang = language && hljs.getLanguage(language);
  const highlighted = validLang 
    ? hljs.highlight(code, { language }).value 
    : hljs.highlightAuto(code).value;
  return `<pre><code class="hljs ${language || ''}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

/**
 * Load site configuration
 */
function loadConfig(projectDir) {
  const configPath = path.join(projectDir, 'config.json');
  const defaultConfig = {
    title: 'My Blog',
    description: 'A blog built with lite-blog',
    siteUrl: 'http://localhost:3000',
    author: 'Anonymous',
    postsPerPage: 10,
    language: 'vi'
  };

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...defaultConfig, ...userConfig };
    } catch (e) {
      console.warn('Warning: Invalid config.json, using defaults');
    }
  }

  return defaultConfig;
}

/**
 * Load all templates
 */
function loadTemplates(projectDir) {
  const templatesDir = path.join(projectDir, 'templates');
  const templates = {};

  if (!fs.existsSync(templatesDir)) {
    return templates;
  }

  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));
  
  for (const file of files) {
    const name = path.basename(file, '.html');
    templates[name] = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
  }

  return templates;
}

/**
 * Parse a markdown file
 */
function parseMarkdownFile(filePath, projectDir) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: markdown } = matter(content);
  
  const relativePath = path.relative(path.join(projectDir, 'pages'), filePath);
  const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

  // Parse tags
  let tags = frontmatter.tags || [];
  if (typeof tags === 'string') {
    tags = tags.split(',').map(t => t.trim());
  }

  // Calculate reading time
  const readingTime = calculateReadingTime(markdown);

  // Convert markdown to HTML
  let html = marked(markdown);
  
  // Add IDs to headings
  html = addHeadingIds(html);

  // Generate TOC
  const toc = generateTOC(html);

  return {
    slug,
    filePath,
    title: frontmatter.title || 'Untitled',
    date: frontmatter.date || new Date().toISOString(),
    description: frontmatter.description || '',
    tags,
    template: frontmatter.template || 'post',
    draft: frontmatter.draft || false,
    image: frontmatter.image || '',
    readingTime,
    toc,
    content: html,
    raw: markdown,
    frontmatter
  };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate meta tags HTML
 */
function generateMetaTags(post, config) {
  const title = escapeHtml(post.title);
  const description = escapeHtml(post.description);
  const { image, slug } = post;
  const pageUrl = `${config.siteUrl}/${slug}.html`;
  const imageUrl = image ? `${config.siteUrl}/${image}` : '';

  return `
    <meta name="description" content="${description}">
    <meta name="author" content="${escapeHtml(config.author)}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${pageUrl}">
    ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  `;
}

/**
 * Generate reading progress bar HTML/CSS/JS (minified)
 */
function getProgressBarCode() {
  return `<style>.reading-progress{position:fixed;top:0;left:0;width:0;height:4px;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);z-index:9999;transition:width .1s ease-out}</style><div class="reading-progress" id="reading-progress"></div><script>!function(){var e=document.getElementById("reading-progress");function t(){var t=window.scrollY,n=document.documentElement.scrollHeight-window.innerHeight;e.style.width=(n>0?t/n*100:0)+"%"}window.addEventListener("scroll",t),window.addEventListener("resize",t),t()}();</script>`;
}

/**
 * Generate related posts HTML
 */
function generateRelatedPostsHtml(relatedPosts) {
  if (relatedPosts.length === 0) return '';

  let html = '<section class="related-posts"><h3>Related Posts</h3><ul>';
  relatedPosts.forEach(post => {
    html += `<li><a href="/${post.slug}.html">${escapeHtml(post.title)}</a></li>`;
  });
  html += '</ul></section>';
  return html;
}

/**
 * Generate posts list HTML
 */
function generatePostsListHtml(posts, config) {
  const sortedPosts = posts
    .filter(p => !p.draft && p.slug !== 'index' && p.slug !== 'about' && !p.slug.startsWith('tags/'))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedPosts.length === 0) {
    return '<p>No posts yet.</p>';
  }

  let html = '<ul class="posts-list">';
  sortedPosts.forEach(post => {
    html += `
      <li class="post-item">
        <a href="/${post.slug}.html" class="post-title">${escapeHtml(post.title)}</a>
        <span class="post-date">${formatDate(post.date, config.language)}</span>
        <span class="post-reading-time">${post.readingTime} min read</span>
        ${post.description ? `<p class="post-description">${escapeHtml(post.description)}</p>` : ''}
      </li>
    `;
  });
  html += '</ul>';
  return html;
}

/**
 * Generate tags list HTML
 */
function generateTagsListHtml(posts) {
  const tagCounts = {};
  posts.filter(p => !p.draft).forEach(post => {
    (post.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  let html = '<ul class="tags-list">';
  sortedTags.forEach(([tag, count]) => {
    const tagSlug = slugify(tag);
    html += `<li><a href="/tags/${tagSlug}.html">${escapeHtml(tag)} (${count})</a></li>`;
  });
  html += '</ul>';
  return html;
}

/**
 * Replace template placeholders
 */
function renderTemplate(template, data) {
  let result = template;

  // Replace simple placeholders {{key}}
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(placeholder, value || '');
  }

  return result;
}

/**
 * Build a single post
 */
function buildPost(post, templates, allPosts, config) {
  const template = templates[post.template] || templates['post'] || templates['default'];
  
  if (!template) {
    console.warn(`Warning: No template found for ${post.slug}`);
    return null;
  }

  // Find related posts
  const relatedPosts = findRelatedPosts(post, allPosts);
  const relatedPostsHtml = generateRelatedPostsHtml(relatedPosts);

  // Generate meta tags
  const metaTags = generateMetaTags(post, config);

  // Progress bar
  const progressBar = getProgressBarCode();

  // Tags HTML
  const tagsHtml = post.tags.length > 0
    ? '<div class="post-tags">' + post.tags.map(t => 
        `<a href="/tags/${slugify(t)}.html" class="tag">${escapeHtml(t)}</a>`
      ).join(' ') + '</div>'
    : '';

  // Generate posts list for list templates (only when needed)
  const isListTemplate = post.template === 'list' || post.slug === 'index';
  const isTagTemplate = post.template === 'tag' || post.slug.startsWith('tags/');
  
  const postsListHtml = isListTemplate ? generatePostsListHtml(allPosts, config) : '';
  const tagsListHtml = isTagTemplate ? generateTagsListHtml(allPosts) : '';

  // Prepare template data
  const templateData = {
    title: post.title,
    description: post.description,
    date: formatDate(post.date, config.language),
    dateISO: post.date,
    author: config.author,
    content: post.content,
    toc: post.toc,
    readingTime: post.readingTime,
    tags: tagsHtml,
    relatedPosts: relatedPostsHtml,
    metaTags,
    progressBar,
    siteTitle: config.title,
    siteDescription: config.description,
    siteUrl: config.siteUrl,
    // For list/index pages
    posts: postsListHtml,
    pagination: '',
    // For tags index page
    tagsList: tagsListHtml
  };

  return renderTemplate(template, templateData);
}

/**
 * Build tag pages
 */
function buildTagPages(posts, templates, config, outputDir) {
  const tagPosts = {};
  
  posts.filter(p => !p.draft).forEach(post => {
    (post.tags || []).forEach(tag => {
      if (!tagPosts[tag]) tagPosts[tag] = [];
      tagPosts[tag].push(post);
    });
  });

  const tagsDir = path.join(outputDir, 'tags');
  ensureDir(tagsDir);

  const tagTemplate = templates['tag'] || templates['default'];
  if (!tagTemplate) return;

  for (const [tag, taggedPosts] of Object.entries(tagPosts)) {
    const tagSlug = slugify(tag);
    const sortedPosts = taggedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    let postsHtml = '<ul class="posts-list">';
    sortedPosts.forEach(post => {
      postsHtml += `
        <li class="post-item">
          <a href="/${post.slug}.html">${escapeHtml(post.title)}</a>
          <span class="post-date">${formatDate(post.date, config.language)}</span>
        </li>
      `;
    });
    postsHtml += '</ul>';

    const html = renderTemplate(tagTemplate, {
      title: `Tag: ${escapeHtml(tag)}`,
      tag: escapeHtml(tag),
      posts: postsHtml,
      postCount: sortedPosts.length,
      siteTitle: config.title,
      siteUrl: config.siteUrl,
      tagsList: ''
    });

    fs.writeFileSync(path.join(tagsDir, `${tagSlug}.html`), html);
    console.log(`  Built tag: ${tag}`);
  }
}

/**
 * Build pagination pages
 */
function buildPaginationPages(posts, templates, config, outputDir) {
  const sortedPosts = posts
    .filter(p => !p.draft && p.slug !== 'index' && p.slug !== 'about' && !p.slug.startsWith('tags/'))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const pages = paginate(sortedPosts, config.postsPerPage);
  const listTemplate = templates['list'] || templates['default'];
  
  if (!listTemplate) return;

  const pagesDir = path.join(outputDir, 'page');
  ensureDir(pagesDir);

  pages.forEach(page => {
    let postsHtml = '<ul class="posts-list">';
    page.items.forEach(post => {
      postsHtml += `
        <li class="post-item">
          <a href="/${post.slug}.html" class="post-title">${escapeHtml(post.title)}</a>
          <span class="post-date">${formatDate(post.date, config.language)}</span>
          <span class="post-reading-time">${post.readingTime} min read</span>
          ${post.description ? `<p class="post-description">${escapeHtml(post.description)}</p>` : ''}
        </li>
      `;
    });
    postsHtml += '</ul>';

    // Pagination navigation
    let paginationHtml = '<nav class="pagination">';
    if (page.hasPrev) {
      const prevUrl = page.prevPage === 1 ? '/' : `/page/${page.prevPage}.html`;
      paginationHtml += `<a href="${prevUrl}" class="prev">← Previous</a>`;
    }
    paginationHtml += `<span class="current">Page ${page.currentPage} / ${page.totalPages}</span>`;
    if (page.hasNext) {
      paginationHtml += `<a href="/page/${page.nextPage}.html" class="next">Next →</a>`;
    }
    paginationHtml += '</nav>';

    const html = renderTemplate(listTemplate, {
      title: page.currentPage === 1 ? config.title : `Page ${page.currentPage} - ${config.title}`,
      posts: postsHtml,
      pagination: paginationHtml,
      siteTitle: config.title,
      siteUrl: config.siteUrl
    });

    if (page.currentPage === 1) {
      // Also save as index if no custom index exists
      const indexPath = path.join(outputDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        fs.writeFileSync(indexPath, html);
      }
    }
    
    fs.writeFileSync(path.join(pagesDir, `${page.currentPage}.html`), html);
  });

  console.log(`  Built ${pages.length} pagination pages`);
}

/**
 * Main build function
 */
async function build(projectDir, options = {}) {
  const startTime = Date.now();
  const { incremental = true } = options;

  console.log('🚀 Starting build...');

  // Load config
  const config = loadConfig(projectDir);
  console.log(`  Site: ${config.title}`);

  // Paths
  const pagesDir = path.join(projectDir, 'pages');
  const outputDir = path.join(projectDir, 'public');
  const staticDir = path.join(projectDir, 'static');
  const cacheFile = path.join(projectDir, '.lite-blog-cache.json');

  // Load build cache for incremental builds
  const cache = incremental ? loadBuildCache(cacheFile) : {};
  const newCache = {};

  // Clean or ensure output directory
  if (!incremental) {
    cleanDir(outputDir);
  } else {
    ensureDir(outputDir);
  }

  // Load templates
  const templates = loadTemplates(projectDir);
  console.log(`  Loaded ${Object.keys(templates).length} templates`);

  // Find all markdown files
  const mdFiles = await glob('**/*.md', { cwd: pagesDir });
  console.log(`  Found ${mdFiles.length} pages`);

  // Parse all posts
  const posts = [];
  for (const file of mdFiles) {
    const filePath = path.join(pagesDir, file);
    const post = parseMarkdownFile(filePath, projectDir);
    posts.push(post);
    newCache[filePath] = getFileHash(filePath);
  }

  // Build each post
  let builtCount = 0;
  let hasNewPosts = false;
  
  for (const post of posts) {
    if (post.draft) {
      console.log(`  Skipping draft: ${post.slug}`);
      continue;
    }

    // Check if rebuild needed (incremental)
    const needsBuild = !incremental || needsRebuild(post.filePath, cache);
    
    if (needsBuild) {
      hasNewPosts = true;
      const html = buildPost(post, templates, posts, config);
      if (html) {
        const outputPath = path.join(outputDir, `${post.slug}.html`);
        ensureDir(path.dirname(outputPath));
        fs.writeFileSync(outputPath, html);
        builtCount++;
        console.log(`  Built: ${post.slug}`);
      }
    }
  }

  // If any post changed, rebuild index and list pages too
  if (hasNewPosts || !incremental) {
    // Rebuild index page
    const indexPost = posts.find(p => p.slug === 'index');
    if (indexPost) {
      const html = buildPost(indexPost, templates, posts, config);
      if (html) {
        fs.writeFileSync(path.join(outputDir, 'index.html'), html);
        console.log('  Rebuilt: index');
      }
    }
  }

  // Build tag pages
  buildTagPages(posts, templates, config, outputDir);

  // Build pagination
  buildPaginationPages(posts, templates, config, outputDir);

  // Generate RSS
  const rss = generateRSS(posts, config);
  fs.writeFileSync(path.join(outputDir, 'rss.xml'), rss);
  console.log('  Generated: rss.xml');

  // Generate sitemap
  const sitemap = generateSitemap(posts, config);
  fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap);
  console.log('  Generated: sitemap.xml');

  // Copy static files
  if (fs.existsSync(staticDir)) {
    copyDir(staticDir, outputDir);
    console.log('  Copied static files');
  }

  // Copy 404 page if exists
  const custom404 = path.join(projectDir, 'templates', '404.html');
  if (fs.existsSync(custom404)) {
    fs.copyFileSync(custom404, path.join(outputDir, '404.html'));
    console.log('  Copied 404.html');
  }

  // Save cache
  saveBuildCache(cacheFile, newCache);

  const duration = Date.now() - startTime;
  console.log(`\n✅ Build completed in ${duration}ms`);
  console.log(`   Output: ${outputDir}`);

  return { posts, config, outputDir };
}

module.exports = { build, loadConfig, loadTemplates, parseMarkdownFile };
