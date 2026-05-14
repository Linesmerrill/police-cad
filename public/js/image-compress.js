/**
 * Image Compression Helper
 *
 * Re-encodes a user-selected image to JPEG using HTML5 Canvas, with an
 * auto-shrink loop that reduces quality and dimensions until the output
 * fits under a target byte budget. Mirrors the result of:
 *
 *   ffmpeg -y -i input.png -q:v 8 out.jpg
 *
 * but runs entirely in the browser with no extra dependencies.
 */
(function (global) {
  'use strict';

  // Each preset bundles a starting JPEG quality and a maximum longest-edge
  // dimension. Higher presets keep more pixels AND fewer compression
  // artifacts — important when owners zoom past 10x to verify legibility.
  var QUALITY_PRESETS = {
    low:    { quality: 0.65, maxDimension: 3072 },
    medium: { quality: 0.82, maxDimension: 4096 },
    high:   { quality: 0.96, maxDimension: 6144 },
  };

  var DEFAULTS = {
    quality:     QUALITY_PRESETS.medium.quality,
    maxDimension: QUALITY_PRESETS.medium.maxDimension,
    maxBytes:    5 * 1024 * 1024,
    mimeType:    'image/jpeg',
    minQuality:  0.40,
    minDimension: 1024,
  };

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not decode image'));
      };
      img.src = url;
    });
  }

  function drawToCanvas(img, maxDim) {
    var w = img.naturalWidth;
    var h = img.naturalHeight;
    var longest = Math.max(w, h);
    if (longest > maxDim) {
      var ratio = maxDim / longest;
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    // JPEG has no alpha; paint a white background so transparent PNGs don't
    // render as black after re-encoding.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error('Canvas encoding failed'));
        else resolve(blob);
      }, mime, quality);
    });
  }

  /**
   * Compress a File/Blob to JPEG, auto-shrinking until <= maxBytes.
   * Returns { blob, width, height, quality, originalBytes, bytes }.
   */
  async function compressImage(file, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    var img = await loadImage(file);
    var maxDim = opts.maxDimension;
    var quality = opts.quality;
    var blob;
    var canvas;

    // Try at requested settings first. If too large, alternate between
    // dropping quality 10% and downscaling 15% until under the cap.
    for (var i = 0; i < 12; i++) {
      canvas = drawToCanvas(img, maxDim);
      blob = await canvasToBlob(canvas, opts.mimeType, quality);
      if (blob.size <= opts.maxBytes) break;
      if (i % 2 === 0 && quality > opts.minQuality) {
        quality = Math.max(opts.minQuality, quality - 0.10);
      } else if (maxDim > opts.minDimension) {
        maxDim = Math.max(opts.minDimension, Math.round(maxDim * 0.85));
      } else if (quality > opts.minQuality) {
        quality = Math.max(opts.minQuality, quality - 0.05);
      } else {
        break;
      }
    }

    return {
      blob: blob,
      width: canvas.width,
      height: canvas.height,
      quality: quality,
      originalBytes: file.size,
      bytes: blob.size,
      mimeType: opts.mimeType,
    };
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * Inject Cloudinary delivery transforms into a Cloudinary URL so the
   * delivered bytes auto-pick the best format (AVIF/WebP/JPEG) and quality
   * per client. No-op for non-Cloudinary URLs.
   */
  function withCloudinaryDelivery(url, extra) {
    if (!url || typeof url !== 'string') return url;
    if (url.indexOf('res.cloudinary.com') === -1) return url;
    if (url.indexOf('/upload/') === -1) return url;
    var transform = 'f_auto,q_auto';
    if (extra) transform += ',' + extra;
    // Don't double-inject if a transform segment already starts with f_/q_.
    var afterUpload = url.split('/upload/')[1] || '';
    if (/^[^/]*\b(f_auto|q_auto)\b/.test(afterUpload)) return url;
    return url.replace('/upload/', '/upload/' + transform + '/');
  }

  global.ImageCompress = {
    QUALITY_PRESETS: QUALITY_PRESETS,
    compressImage: compressImage,
    formatBytes: formatBytes,
    withCloudinaryDelivery: withCloudinaryDelivery,
  };
})(window);
