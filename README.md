# lite-blog

A lightweight, fast, and secure static site generator for blogs. Zero config, just write and publish.

## Features

- **Markdown** - Write posts in Markdown with YAML frontmatter
- **Tags** - Organize posts with tags, auto-generated tag pages
- **Table of Contents** - Auto-generated from headings
- **Reading Time** - Estimated reading time for each post
- **Related Posts** - Suggestions based on shared tags
- **Syntax Highlighting** - Beautiful code blocks with highlight.js
- **Reading Progress** - Progress bar while scrolling
- **Image Optimization** - Auto resize, WebP conversion, responsive images
- **RSS Feed** - Auto-generated RSS feed
- **Sitemap** - Auto-generated sitemap.xml for SEO
- **SEO Ready** - Auto meta tags and Open Graph
- **Incremental Build** - Only rebuild changed files
- **Hot Reload** - Live reload during development
- **Fast** - File caching, ETag support, optimized serving
- **Secure** - XSS protection, security headers, path traversal prevention

## Installation

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Install from npm

```bash
npm install -g lite-blog
```

### Install from source

```bash
# Clone the repository
git clone https://github.com/pvdrh/my-lite-blog
cd my-lite-blog

# Install dependencies
npm install

# Link globally
npm link
```

### Verify installation

```bash
lite-blog --version
```

## Quick Start

### 1. Create a new blog

```bash
lite-blog init my-blog
```

This creates:
```
my-blog/
├── config.json          # Site configuration
├── pages/               # Your content (Markdown files)
│   ├── index.md         # Home page
│   ├── about.md         # About page
│   ├── hello-world.md   # Sample post
│   └── tags/
│       └── index.md     # Tags listing page
├── templates/           # HTML templates
│   ├── default.html
│   ├── post.html
│   ├── list.html
│   ├── tag.html
│   └── 404.html
└── static/              # Static assets
    ├── css/
    └── images/
```

### 2. Start development server

```bash
cd my-blog
lite-blog dev
```

Open http://localhost:3000

### 3. Write your first post

Create `pages/my-first-post.md`:

```markdown
---
title: My First Post
date: 2026-01-19
description: This is my first blog post
tags: [blog, introduction]
---

# Hello World!

This is my first post using lite-blog.

## Features I love

- Simple Markdown writing
- Auto-generated table of contents
- Beautiful syntax highlighting

```javascript
console.log('Hello from lite-blog!');
```

Happy blogging!
```

Save the file and the browser will auto-reload.

### 4. Build for production

```bash
lite-blog build
```

Output is in the `public/` folder, ready to deploy.

## Configuration

Edit `config.json`:

```json
{
  "title": "My Blog",
  "description": "A blog about awesome things",
  "siteUrl": "https://myblog.com",
  "author": "Your Name",
  "postsPerPage": 10,
  "language": "en"
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `title` | Site title | "My Blog" |
| `description` | Site description for SEO | "" |
| `siteUrl` | Full URL of your site | "http://localhost:3000" |
| `author` | Author name | "Anonymous" |
| `postsPerPage` | Posts per page for pagination | 10 |
| `language` | Language code for date formatting | "en" |

## Writing Posts

### Frontmatter

Every post starts with YAML frontmatter:

```yaml
---
title: Post Title (required)
date: 2026-01-19
description: Short description for SEO
tags: [tag1, tag2, tag3]
template: post
image: images/cover.jpg
draft: false
---
```


| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Post title (required) |
| `date` | string | Publication date (YYYY-MM-DD) |
| `description` | string | Short description for SEO/previews |
| `tags` | array | List of tags for categorization |
| `template` | string | Template to use: `default`, `post`, `list`, `tag` |
| `image` | string | Cover image path for Open Graph |
| `draft` | boolean | If `true`, post won't be published |

### Markdown Features

lite-blog supports GitHub Flavored Markdown:

- **Bold** and *italic* text
- [Links](https://example.com)
- Images: `![alt](image.jpg)`
- Code blocks with syntax highlighting
- Tables
- Task lists
- Blockquotes
- Horizontal rules

## Templates

### Available Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{{title}}` | Post title |
| `{{content}}` | Post content (HTML) |
| `{{date}}` | Formatted date |
| `{{dateISO}}` | ISO date format |
| `{{description}}` | Post description |
| `{{tags}}` | Tag links HTML |
| `{{toc}}` | Table of contents |
| `{{readingTime}}` | Reading time in minutes |
| `{{relatedPosts}}` | Related posts section |
| `{{metaTags}}` | SEO meta tags |
| `{{progressBar}}` | Reading progress bar |
| `{{posts}}` | Posts list (for list template) |
| `{{pagination}}` | Pagination links |
| `{{tagsList}}` | All tags list |
| `{{siteTitle}}` | Site title from config |
| `{{siteUrl}}` | Site URL from config |
| `{{author}}` | Author from config |

### Custom Templates

Edit files in `templates/` folder to customize your blog's look.

## CLI Commands

```bash
# Initialize new project
lite-blog init [directory]

# Initialize in current directory
lite-blog init .

# Start dev server (default port 3000)
lite-blog dev

# Start dev server on custom port
lite-blog dev --port 8080

# Build for production
lite-blog build

# Show help
lite-blog --help

# Show version
lite-blog --version
```

## Image Optimization

Place images in `static/images/`. lite-blog automatically:

- Creates multiple sizes (640px, 1024px, 1920px)
- Converts to WebP format
- Generates responsive `<picture>` tags
- Caches optimized images for fast rebuilds

## Deployment

### GitHub Pages

```bash
# Build
lite-blog build

# Deploy using gh-pages
npx gh-pages -d public
```

Or use GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g lite-blog
      - run: lite-blog build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

### Netlify

1. Connect your repo to Netlify
2. Build command: `npx lite-blog build`
3. Publish directory: `public`

### Vercel

1. Connect your repo to Vercel
2. Build command: `npx lite-blog build`
3. Output directory: `public`

### Cloudflare Pages

1. Connect your repo to Cloudflare Pages
2. Build command: `npx lite-blog build`
3. Build output directory: `public`

## Project Structure

```
my-blog/
├── config.json              # Site configuration
├── pages/                   # Markdown content
│   ├── index.md             # Home page (uses list template)
│   ├── about.md             # About page
│   ├── post-1.md            # Blog post
│   ├── post-2.md            # Blog post
│   └── tags/
│       └── index.md         # Tags index page
├── templates/               # HTML templates
│   ├── default.html         # Default template
│   ├── post.html            # Blog post template
│   ├── list.html            # Posts list template
│   ├── tag.html             # Tag page template
│   └── 404.html             # 404 error page
├── static/                  # Static assets (copied as-is)
│   ├── css/
│   │   ├── style.css
│   │   └── hljs.css
│   └── images/
├── public/                  # Generated output (after build)
└── .lite-blog-cache.json    # Build cache (auto-generated)
```

## Performance

lite-blog is optimized for speed:

- **File Caching** - Files cached in memory during development
- **ETag Support** - Browser caching with 304 Not Modified
- **Incremental Build** - Only rebuilds changed files
- **Minified Assets** - Progress bar and live reload scripts are minified

## Security

lite-blog includes security best practices:

- **XSS Protection** - All user content is HTML-escaped
- **Path Traversal Prevention** - Strict path validation
- **Security Headers** - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

## Comparison

| Feature | lite-blog | Jekyll | Hugo | Gatsby |
|---------|-----------|--------|------|--------|
| Setup time | ~1 min | ~5 min | ~3 min | ~10 min |
| Dependencies | 8 packages | Ruby ecosystem | Go binary | 1000+ packages |
| Build speed | Fast | Medium | Very Fast | Slow |
| Learning curve | Easy | Medium | Medium | Hard |
| Config files | 1 (JSON) | Multiple (YAML) | Multiple (TOML) | Multiple (JS) |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Made with ❤️ for developers who love simplicity.
