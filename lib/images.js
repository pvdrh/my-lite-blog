const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { glob } = require('glob');
const { ensureDir, getFileHash, loadBuildCache, saveBuildCache } = require('./utils.js');

/**
 * Image optimization settings
 */
const defaultSettings = {
  quality: 80
};

/**
 * Check if file is an image that needs WebP conversion
 */
function isOptimizableImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // Only JPG/PNG need conversion to WebP
  // GIF: animated, can't convert well
  // WebP: already optimized
  // SVG: vector, no conversion needed
  return ['.jpg', '.jpeg', '.png'].includes(ext);
}

/**
 * Check if file is any image type (for copying)
 */
function isAnyImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
}

/**
 * Optimize a single image - convert to WebP, keep original size
 */
async function optimizeImage(inputPath, outputDir, settings = {}) {
  const opts = { ...defaultSettings, ...settings };
  const filename = path.basename(inputPath);
  const name = path.basename(filename, path.extname(filename));

  const results = [];

  try {
    // Convert to WebP only (no original copy to save space)
    const webpPath = path.join(outputDir, `${name}.webp`);
    await sharp(inputPath)
      .webp({ quality: opts.quality })
      .toFile(webpPath);
    results.push(webpPath);

  } catch (error) {
    console.error(`  Error optimizing ${filename}:`, error.message);
    // Fallback: copy original if WebP conversion fails
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

  // Store cache in input dir (not public) to avoid exposing it
  const cacheFile = path.join(inputDir, '.image-cache.json');
  const cache = loadBuildCache(cacheFile);
  const newCache = {};

  ensureDir(outputDir);

  const files = await glob('**/*', { 
    cwd: inputDir, 
    nodir: true,
    ignore: ['**/.image-cache.json']  // Exclude cache file
  });
  
  // Separate optimizable images from others
  const optimizableImages = files.filter(f => isOptimizableImage(f));
  const otherFiles = files.filter(f => !isOptimizableImage(f));
  
  // GIFs and SVGs - copy without optimization
  const copyOnlyImages = otherFiles.filter(f => isAnyImage(f));
  const nonImageFiles = otherFiles.filter(f => !isAnyImage(f));

  const totalImages = optimizableImages.length + copyOnlyImages.length;
  console.log(`  Found ${totalImages} images (${optimizableImages.length} to optimize, ${copyOnlyImages.length} to copy)`);

  const results = [];
  let skippedCount = 0;

  // Process optimizable images in parallel (batch of 5)
  const batchSize = 5;
  for (let i = 0; i < optimizableImages.length; i += batchSize) {
    const batch = optimizableImages.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (file) => {
      const inputPath = path.join(inputDir, file);
      const fileDir = path.dirname(file);
      const outDir = path.join(outputDir, fileDir);
      const name = path.basename(file, path.extname(file));
      const webpOutput = path.join(outDir, `${name}.webp`);
      
      ensureDir(outDir);

      const hash = getFileHash(inputPath);
      newCache[inputPath] = hash;

      // Skip if unchanged AND output exists
      if (cache[inputPath] === hash && fs.existsSync(webpOutput)) {
        skippedCount++;
        return [];
      }

      console.log(`  Optimizing: ${file}`);
      return optimizeImage(inputPath, outDir, settings);
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(r => results.push(...r));
  }

  if (skippedCount > 0) {
    console.log(`  Skipped ${skippedCount} unchanged images (cached)`);
  }

  // Copy GIFs and SVGs without optimization
  for (const file of copyOnlyImages) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    ensureDir(path.dirname(outputPath));
    fs.copyFileSync(inputPath, outputPath);
  }

  // Copy non-image files
  for (const file of nonImageFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    ensureDir(path.dirname(outputPath));
    fs.copyFileSync(inputPath, outputPath);
  }

  saveBuildCache(cacheFile, newCache);

  return results;
}

/**
 * Convert image paths in HTML to WebP
 * Replaces .jpg, .jpeg, .png with .webp in img src attributes
 */
function convertImagesToWebp(html) {
  // Match img tags with src pointing to /images/
  return html.replace(
    /<img([^>]*?)src=["']([^"']*\/images\/[^"']+\.(jpg|jpeg|png))["']([^>]*?)>/gi,
    (match, before, src, ext, after) => {
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return `<img${before}src="${webpSrc}"${after}>`;
    }
  );
}

module.exports = {
  optimizeImage,
  processImages,
  convertImagesToWebp,
  isOptimizableImage
};
