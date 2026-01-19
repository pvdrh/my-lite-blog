const fs = require('fs');
const path = require('path');
const { build } = require('./builder.js');
const { startDevServer } = require('./server.js');
const { processImages } = require('./images.js');
const { ensureDir } = require('./utils.js');

/**
 * Theme toggle script (minified)
 */
const themeScript = `<script>!function(){const t=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",t);function e(){const e="dark"===document.documentElement.getAttribute("data-theme")?"light":"dark";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e)}document.addEventListener("DOMContentLoaded",function(){const t=document.getElementById("theme-toggle");t&&t.addEventListener("click",e)})}();</script>`;

/**
 * Smooth scroll script (minified)
 */
const smoothScrollScript = `<script>
document.addEventListener("DOMContentLoaded",function(){
  document.querySelectorAll('.toc a[href^="#"]').forEach(function(e){
    e.addEventListener("click",function(t){
      t.preventDefault();
      const n=document.querySelector(this.getAttribute("href"));
      if(n){
        n.scrollIntoView({ behavior:"smooth", block:"start" });
        history.pushState(null,null,this.getAttribute("href"));
      }
    });
  });
});
</script>`;

/**
 * Default templates
 */
const defaultTemplates = {
  'default.html': `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - {{siteTitle}}</title>
    {{metaTags}}
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/hljs.css">
    ${themeScript}
</head>
<body>
    {{progressBar}}
    <header class="site-header">
        <nav>
            <a href="/" class="logo">{{siteTitle}}</a>
            <div class="nav-links">
                <a href="/">Home</a>
                <a href="/tags">Tags</a>
                <a href="/about.html">About</a>
                <a href="/rss.xml">RSS</a>
                <button id="theme-toggle" class="theme-toggle" title="Toggle theme">
                    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
            </div>
        </nav>
    </header>

    <main>
        <article class="post">
            <header class="post-header">
                <h1>{{title}}</h1>
                <div class="post-meta">
                    <time datetime="{{dateISO}}">{{date}}</time>
                    <span class="reading-time">{{readingTime}} min read</span>
                </div>
                {{tags}}
            </header>
            
            {{toc}}
            
            <div id="page-content" class="post-content">
                {{content}}
            </div>

            {{relatedPosts}}
        </article>
    </main>

    <footer class="site-footer">
        <p>&copy; 2025 {{siteTitle}}. Built with lite-blog.</p>
    </footer>
    ${smoothScrollScript}
</body>
</html>`,

  'post.html': `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - {{siteTitle}}</title>
    {{metaTags}}
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/hljs.css">
    ${themeScript}
</head>
<body>
    {{progressBar}}
    <header class="site-header">
        <nav>
            <a href="/" class="logo">{{siteTitle}}</a>
            <div class="nav-links">
                <a href="/">Home</a>
                <a href="/tags">Tags</a>
                <a href="/about.html">About</a>
                <a href="/rss.xml">RSS</a>
                <button id="theme-toggle" class="theme-toggle" title="Toggle theme">
                    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
            </div>
        </nav>
    </header>

    <main>
        <article class="post">
            <header class="post-header">
                <h1>{{title}}</h1>
                <div class="post-meta">
                    <time datetime="{{dateISO}}">{{date}}</time>
                    <span class="reading-time">{{readingTime}} min read</span>
                </div>
                {{tags}}
            </header>
            
            {{toc}}
            
            <div id="page-content" class="post-content">
                {{content}}
            </div>

            {{relatedPosts}}
        </article>
    </main>

    <footer class="site-footer">
        <p>&copy; 2025 {{siteTitle}}. Built with lite-blog.</p>
    </footer>
    ${smoothScrollScript}
</body>
</html>`,

  'list.html': `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{siteTitle}} - Blog posts">
    <link rel="stylesheet" href="/css/style.css">
    ${themeScript}
</head>
<body>
    <header class="site-header">
        <nav>
            <a href="/" class="logo">{{siteTitle}}</a>
            <div class="nav-links">
                <a href="/">Home</a>
                <a href="/tags">Tags</a>
                <a href="/about.html">About</a>
                <a href="/rss.xml">RSS</a>
                <button id="theme-toggle" class="theme-toggle" title="Toggle theme">
                    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
            </div>
        </nav>
    </header>

    <main>
        <section class="posts-section">
            <h1>Posts</h1>
            {{posts}}
            {{pagination}}
        </section>
    </main>

    <footer class="site-footer">
        <p>&copy; 2025 {{siteTitle}}. Built with lite-blog.</p>
    </footer>
</body>
</html>`,

  'tag.html': `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - {{siteTitle}}</title>
    <link rel="stylesheet" href="/css/style.css">
    ${themeScript}
</head>
<body>
    <header class="site-header">
        <nav>
            <a href="/" class="logo">{{siteTitle}}</a>
            <div class="nav-links">
                <a href="/">Home</a>
                <a href="/tags">Tags</a>
                <a href="/about.html">About</a>
                <a href="/rss.xml">RSS</a>
                <button id="theme-toggle" class="theme-toggle" title="Toggle theme">
                    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
            </div>
        </nav>
    </header>

    <main>
        <section class="tag-section">
            <h1>{{title}}</h1>
            {{tagsList}}
            {{posts}}
        </section>
    </main>

    <footer class="site-footer">
        <p>&copy; 2025 {{siteTitle}}. Built with lite-blog.</p>
    </footer>
</body>
</html>`,

  '404.html': `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <link rel="stylesheet" href="/css/style.css">
    ${themeScript}
</head>
<body>
    <header class="site-header">
        <nav>
            <a href="/" class="logo">Blog</a>
            <div class="nav-links">
                <a href="/">Home</a>
                <button id="theme-toggle" class="theme-toggle" title="Toggle theme">
                    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
            </div>
        </nav>
    </header>

    <main>
        <section class="error-page">
            <h1>404</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/" class="btn">Go Home</a>
        </section>
    </main>

    <footer class="site-footer">
        <p>Built with lite-blog.</p>
    </footer>
</body>
</html>`
};

/**
 * Default CSS with dark mode support
 */
const defaultCSS = `/* lite-blog default styles */
:root,
[data-theme="light"] {
  --primary: #667eea;
  --primary-dark: #764ba2;
  --text: #333;
  --text-light: #666;
  --bg: #fafafa;
  --bg-white: #fff;
  --border: #eee;
  --code-bg: #2d2d2d;
  --max-width: 800px;
  --toc-bg: #f8f9fa;
  --inline-code-bg: #f4f4f4;
}

[data-theme="dark"] {
  --primary: #818cf8;
  --primary-dark: #a78bfa;
  --text: #e5e7eb;
  --text-light: #9ca3af;
  --bg: #111827;
  --bg-white: #1f2937;
  --border: #374151;
  --code-bg: #0d1117;
  --toc-bg: #1f2937;
  --inline-code-bg: #374151;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.7;
  color: var(--text);
  background: var(--bg);
  transition: background-color 0.3s ease, color 0.3s ease;
}

a {
  color: var(--primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Theme toggle button */
.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  margin-left: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.theme-toggle:hover {
  background: var(--border);
  color: var(--text);
}

.theme-toggle svg {
  transition: transform 0.3s ease;
}

/* Show/hide sun/moon icons based on theme */
[data-theme="light"] .moon-icon,
[data-theme="dark"] .sun-icon {
  display: none;
}

[data-theme="light"] .sun-icon,
[data-theme="dark"] .moon-icon {
  display: block;
}

/* Header */
.site-header {
  background: var(--bg-white);
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.site-header nav {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.site-header .logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--text);
}

.nav-links {
  display: flex;
  align-items: center;
}

.nav-links a {
  margin-left: 1.5rem;
  color: var(--text-light);
}

.nav-links a:hover {
  color: var(--primary);
  text-decoration: none;
}

/* Main content */
main {
  max-width: var(--max-width);
  margin: 2rem auto;
  padding: 0 1.5rem;
}

/* Post */
.post {
  background: var(--bg-white);
  border-radius: 12px;
  padding: 2.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

[data-theme="dark"] .post {
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.post-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.post-header h1 {
  font-size: 2.25rem;
  line-height: 1.3;
  margin-bottom: 1rem;
  color: var(--text);
}

.post-meta {
  color: var(--text-light);
  font-size: 0.95rem;
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.post-tags {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.tag:hover {
  text-decoration: none;
  opacity: 0.9;
}

/* TOC */
.toc {
  background: var(--toc-bg);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  transition: background-color 0.3s ease;
}

.toc h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--text-light);
}

.toc ul {
  list-style: none;
}

.toc li {
  margin: 0.4rem 0;
}

.toc a {
  color: var(--text);
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.toc a:hover {
  color: var(--primary);
  text-decoration: none;
}

/* Post content */
.post-content {
  font-size: 1.1rem;
}

.post-content h2 {
  font-size: 1.6rem;
  margin: 2.5rem 0 1rem;
  color: var(--text);
  scroll-margin-top: 80px;
}

.post-content h3 {
  font-size: 1.3rem;
  margin: 2rem 0 0.75rem;
  scroll-margin-top: 80px;
}

.post-content h4 {
  scroll-margin-top: 80px;
}

.post-content p {
  margin-bottom: 1.25rem;
}

.post-content ul, .post-content ol {
  margin: 1rem 0 1.25rem 1.5rem;
}

.post-content li {
  margin-bottom: 0.5rem;
}

.post-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.post-content blockquote {
  border-left: 4px solid var(--primary);
  padding-left: 1.25rem;
  margin: 1.5rem 0;
  color: var(--text-light);
  font-style: italic;
}

.post-content code {
  background: var(--inline-code-bg);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'Fira Code', 'Monaco', monospace;
  transition: background-color 0.3s ease;
}

.post-content pre {
  background: var(--code-bg);
  color: #f8f8f2;
  padding: 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5rem 0;
}

.post-content pre code {
  background: none;
  padding: 0;
  color: inherit;
}

/* Related posts */
.related-posts {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.related-posts h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-light);
}

.related-posts ul {
  list-style: none;
}

.related-posts li {
  margin: 0.5rem 0;
}

/* Posts list */
.posts-section h1 {
  margin-bottom: 2rem;
  color: var(--text);
}

.posts-list {
  list-style: none;
}

.post-item {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border);
}

.post-item:last-child {
  border-bottom: none;
}

.post-item .post-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  display: block;
  margin-bottom: 0.5rem;
}

.post-item .post-date,
.post-item .post-reading-time {
  color: var(--text-light);
  font-size: 0.9rem;
  margin-right: 1rem;
}

.post-item .post-description {
  color: var(--text-light);
  margin-top: 0.5rem;
  font-size: 0.95rem;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.pagination .current {
  color: var(--text-light);
}

.pagination a {
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: #fff;
  border-radius: 6px;
}

.pagination a:hover {
  text-decoration: none;
  background: var(--primary-dark);
}

/* Tags page */
.tag-section h1 {
  margin-bottom: 2rem;
  color: var(--text);
}

.tags-list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tags-list a {
  background: var(--bg-white);
  border: 1px solid var(--border);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  color: var(--text);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.tags-list a:hover {
  border-color: var(--primary);
  text-decoration: none;
}

/* 404 page */
.error-page {
  text-align: center;
  padding: 4rem 2rem;
}

.error-page h1 {
  font-size: 6rem;
  color: var(--primary);
  margin-bottom: 1rem;
}

.error-page p {
  color: var(--text-light);
  margin-bottom: 2rem;
}

.btn {
  display: inline-block;
  background: var(--primary);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
}

.btn:hover {
  text-decoration: none;
  background: var(--primary-dark);
}

/* Footer */
.site-footer {
  text-align: center;
  padding: 2rem;
  color: var(--text-light);
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 640px) {
  .post {
    padding: 1.5rem;
  }

  .post-header h1 {
    font-size: 1.75rem;
  }

  .site-header {
    padding: 1rem;
  }

  .nav-links a {
    margin-left: 1rem;
    font-size: 0.9rem;
  }
  
  .theme-toggle {
    margin-left: 0.5rem;
  }
}
`;

/**
 * Highlight.js CSS (with dark mode support)
 */
const hljsCSS = `/* Highlight.js theme */
.hljs {
  background: var(--code-bg, #2d2d2d);
  color: #f8f8f2;
}
.hljs-comment, .hljs-quote { color: #999; }
.hljs-variable, .hljs-tag, .hljs-name, .hljs-selector-id, .hljs-selector-class, .hljs-regexp, .hljs-deletion { color: #f2777a; }
.hljs-number, .hljs-built_in, .hljs-literal, .hljs-type, .hljs-params, .hljs-meta, .hljs-link { color: #f99157; }
.hljs-attribute { color: #ffcc66; }
.hljs-string, .hljs-symbol, .hljs-bullet, .hljs-addition { color: #99cc99; }
.hljs-title, .hljs-section { color: #6699cc; }
.hljs-keyword, .hljs-selector-tag { color: #cc99cc; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
`;

/**
 * Default config
 */
const defaultConfig = {
  title: 'My Blog',
  description: 'A blog built with lite-blog',
  siteUrl: 'http://localhost:3000',
  author: 'Anonymous',
  postsPerPage: 10,
  language: 'en'
};

/**
 * Sample post
 */
const samplePost = `---
title: Welcome to lite-blog
date: ${new Date().toISOString().split('T')[0]}
description: Your first post with lite-blog - a lightweight static site generator.
tags: [lite-blog, introduction, markdown]
template: post
---

# Welcome to lite-blog!

This is a sample post automatically created when initializing the project.

## Features

lite-blog supports many useful features:

- **Frontmatter** - title, date, description, tags
- **Auto meta tags** - SEO and Open Graph
- **RSS feed** - auto-generated
- **Sitemap** - SEO support
- **Table of Contents** - auto-generated from headings
- **Related posts** - suggestions based on tags
- **Syntax highlighting** - beautiful code with highlight.js
- **Reading progress** - progress bar while reading
- **Image optimization** - auto-optimize images
- **Dark mode** - toggle between light and dark themes

## Code example

\`\`\`javascript
function hello() {
  console.log('Hello from lite-blog!');
}
\`\`\`

## Start writing

Create a new \`.md\` file in the \`pages/\` folder and start writing!

Happy blogging! 🎉
`;

/**
 * About page sample
 */
const aboutPage = `---
title: About
template: default
---

# About

This is the about page. Edit \`pages/about.md\` to update the content.

## About this blog

This blog is built with [lite-blog](https://github.com/pvdrh/my-lite-blog) - a lightweight static site generator.

## Contact

- Email: your@email.com
- GitHub: github.com/username
`;

/**
 * Initialize a new project
 */
function init(targetDir) {
  console.log('🚀 Initializing lite-blog project...');
  console.log(`   Directory: ${targetDir}\n`);

  // Create directories
  const dirs = ['pages', 'templates', 'static/css', 'static/images'];
  dirs.forEach(dir => {
    ensureDir(path.join(targetDir, dir));
  });

  // Create templates
  for (const [name, content] of Object.entries(defaultTemplates)) {
    const filePath = path.join(targetDir, 'templates', name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
      console.log(`   Created: templates/${name}`);
    }
  }

  // Create CSS
  const cssPath = path.join(targetDir, 'static/css/style.css');
  if (!fs.existsSync(cssPath)) {
    fs.writeFileSync(cssPath, defaultCSS);
    console.log('   Created: static/css/style.css');
  }

  const hljsPath = path.join(targetDir, 'static/css/hljs.css');
  if (!fs.existsSync(hljsPath)) {
    fs.writeFileSync(hljsPath, hljsCSS);
    console.log('   Created: static/css/hljs.css');
  }

  // Create config
  const configPath = path.join(targetDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('   Created: config.json');
  }

  // Create sample post
  const postPath = path.join(targetDir, 'pages/hello-world.md');
  if (!fs.existsSync(postPath)) {
    fs.writeFileSync(postPath, samplePost);
    console.log('   Created: pages/hello-world.md');
  }

  // Create about page
  const aboutPath = path.join(targetDir, 'pages/about.md');
  if (!fs.existsSync(aboutPath)) {
    fs.writeFileSync(aboutPath, aboutPage);
    console.log('   Created: pages/about.md');
  }

  // Create index page
  const indexPath = path.join(targetDir, 'pages/index.md');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, `---
title: Home
template: list
---
`);
    console.log('   Created: pages/index.md');
  }

  // Create tags index
  ensureDir(path.join(targetDir, 'pages/tags'));
  const tagsIndexPath = path.join(targetDir, 'pages/tags/index.md');
  if (!fs.existsSync(tagsIndexPath)) {
    fs.writeFileSync(tagsIndexPath, `---
title: Tags
template: tag
---
`);
    console.log('   Created: pages/tags/index.md');
  }

  console.log('\n✅ Project initialized successfully!');
  console.log('\nNext steps:');
  console.log('  1. cd ' + path.basename(targetDir));
  console.log('  2. Edit config.json with your site info');
  console.log('  3. Run: lite-blog dev');
  console.log('  4. Open: http://localhost:3000\n');
}

/**
 * Development server
 */
async function dev(projectDir, port = 3000) {
  // Process images before build
  const imagesDir = path.join(projectDir, 'static/images');
  const outputImagesDir = path.join(projectDir, 'public/images');
  
  if (fs.existsSync(imagesDir)) {
    console.log('🖼️  Processing images...');
    await processImages(imagesDir, outputImagesDir);
  }

  await startDevServer(projectDir, port, build);
}

module.exports = {
  init,
  build,
  dev
};
