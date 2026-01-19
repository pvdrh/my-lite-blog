const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { glob } = require('glob');
const { ensureDir, getFileHash, loadBuildCache, saveBuildCache } = require('./utils.js');

/**
 * Image optimization settings
 */
const defaultSettings = {
  quality: 80,
  maxWidth: 1920,
  maxHeight: 1080,
  formats: ['webp', 'original'],
  sizes: [
    { suffix: '-sm', width: 640 },
    { suffix: '-md', width: 1024 },
    { suffix: '-lg', width: 1920 }
  ]
};

/**
 * Check if file is an image
 */
function isImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

/**
 * Optimize a single image
 */
async function optimizeImage(inputPath, outputDir, settings = {}) {
  const opts = { ...defaultSettings, ...settings };
  const filename = path.basename(inputPath);
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);

  const results = [];

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Generate different sizes
    for (const size of opts.sizes) {
      if (metadata.width && metadata.width > size.width) {
        // WebP version
        const webpPath = path.join(outputDir, `${name}${size.suffix}.webp`);
        await sharp(inputPath)
          .resize(size.width, null, { withoutEnlargement: true })
          .webp({ quality: opts.quality })
          .toFile(webpPath);
        results.push(webpPath);

        // Original format version
        const originalPath = path.join(outputDir, `${name}${size.suffix}${ext}`);
        await sharp(inputPath)
          .resize(size.width, null, { withoutEnlargement: true })
          .jpeg({ quality: opts.quality })
          .toFile(originalPath);
        results.push(originalPath);
      }
    }

    // Also create a WebP version of the original size
    const webpOriginal = path.join(outputDir, `${name}.webp`);
    await sharp(inputPath)
      .webp({ quality: opts.quality })
      .toFile(webpOriginal);
    results.push(webpOriginal);

    // Copy original as well
    const originalCopy = path.join(outputDir, filename);
    fs.copyFileSync(inputPath, originalCopy);
    results.push(originalCopy);

  } catch (error) {
    console.error(`  Error optimizing ${filename}:`, error.message);
    // Fallback: just copy the original
    const originalCopy = path.join(outputDir, filename);
    fs.copyFileSync(inputPath, originalCopy);
    results.push(originalCopy);
  }

  return results;
}

/**
 * Process all images in a directory
 */
async function processImages(inputDir, outputDir, settings = {}) {
  if (!fs.existsSync(inputDir)) {
    return [];
  }

  const cacheFile = path.join(outputDir, '.image-cache.json');
  const cache = loadBuildCache(cacheFile);
  const newCache = {};

  ensureDir(outputDir);

  const files = await glob('**/*', { cwd: inputDir, nodir: true });
  const images = files.filter(f => isImage(f));

  console.log(`  Found ${images.length} images to process`);

  const results = [];

  for (const file of images) {
    const inputPath = path.join(inputDir, file);
    const fileDir = path.dirname(file);
    const outDir = path.join(outputDir, fileDir);
    
    ensureDir(outDir);

    const hash = getFileHash(inputPath);
    newCache[inputPath] = hash;

    // Skip if unchanged
    if (cache[inputPath] === hash) {
      continue;
    }

    console.log(`  Optimizing: ${file}`);
    const optimized = await optimizeImage(inputPath, outDir, settings);
    results.push(...optimized);
  }

  // Copy non-image files
  const nonImages = files.filter(f => !isImage(f));
  for (const file of nonImages) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    ensureDir(path.dirname(outputPath));
    fs.copyFileSync(inputPath, outputPath);
  }

  saveBuildCache(cacheFile, newCache);

  return results;
}

/**
 * Generate responsive image HTML
 */
function responsiveImageHtml(src, alt = '', className = '') {
  const ext = path.extname(src);
  const name = path.basename(src, ext);
  const dir = path.dirname(src);

  return `
<picture${className ? ` class="${className}"` : ''}>
  <source 
    type="image/webp"
    srcset="${dir}/${name}-sm.webp 640w, ${dir}/${name}-md.webp 1024w, ${dir}/${name}-lg.webp 1920w"
    sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
  />
  <source 
    srcset="${dir}/${name}-sm${ext} 640w, ${dir}/${name}-md${ext} 1024w, ${dir}/${name}-lg${ext} 1920w"
    sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
  />
  <img src="${src}" alt="${alt}" loading="lazy" />
</picture>
`;
}

module.exports = {
  optimizeImage,
  processImages,
  responsiveImageHtml,
  isImage
};
