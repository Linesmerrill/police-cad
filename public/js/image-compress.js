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

  // "High" is the default — visually-lossless for normal viewing AND
  // sharp at deep zoom because it preserves up to an 8192px source.
  // "Medium" and "Low" exist as opt-in faster-loading alternatives surfaced
  // through the "Use less player data" disclosure in the upload modal.
  var QUALITY_PRESETS = {
    low:    { quality: 0.65, maxDimension: 3072, maxBytes:  5 * 1024 * 1024 },
    medium: { quality: 0.82, maxDimension: 4096, maxBytes:  5 * 1024 * 1024 },
    high:   { quality: 0.96, maxDimension: 8192, maxBytes: 10 * 1024 * 1024 },
  };

  // Conservative real-world 4G throughput for one community member's
  // download. 800 KB/s lines up with median LTE measurements once TLS,
  // TCP slow start, and Cloudinary RTT are folded in.
  var BYTES_PER_SECOND_4G = 800 * 1024;

  function estimateLoadSeconds(bytes) {
    return Math.max(1, Math.round(bytes / BYTES_PER_SECOND_4G));
  }

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
    var sourceLongest = Math.max(img.naturalWidth, img.naturalHeight);
    // Cap the working maxDim by the source so an Infinity/oversized request
    // can still be downscaled in the auto-shrink loop.
    var maxDim = Math.min(opts.maxDimension, sourceLongest);
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

    // If the source already fits our caps AND our re-encode ended up
    // BIGGER than the source, pass the source bytes through unchanged.
    // Phone-camera JPEGs are typically ~q=0.8 — re-encoding them at q=0.96
    // produces a larger file with no perceptual gain, and owners are
    // (correctly) confused when "Optimized" exceeds "Original".
    var sourceFitsAsIs =
      file.size > 0 &&
      file.size <= opts.maxBytes &&
      sourceLongest <= opts.maxDimension;
    if (sourceFitsAsIs && blob.size > file.size) {
      return {
        blob: file,
        width: img.naturalWidth,
        height: img.naturalHeight,
        quality: 1.0,
        originalBytes: file.size,
        bytes: file.size,
        mimeType: file.type || opts.mimeType,
      };
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
   * Return the Cloudinary URL as-is. We deliberately do NOT inject
   * f_auto/q_auto here: Cloudinary's q_auto applies its own quality
   * heuristics on top of the already-compressed JPEG we uploaded,
   * producing a visible double-compression hit at high zoom. We pay a
   * larger wire-size cost in exchange for "what you previewed is what
   * gets served", which is the contract owners expect.
   *
   * Left as a function (rather than removed entirely) so callers don't
   * need to change and so re-enabling a more conservative transform
   * (e.g. q_auto:best) later is a one-line edit.
   */
  function withCloudinaryDelivery(url /* , extra */) {
    return url;
  }

  global.ImageCompress = {
    QUALITY_PRESETS: QUALITY_PRESETS,
    compressImage: compressImage,
    formatBytes: formatBytes,
    estimateLoadSeconds: estimateLoadSeconds,
    withCloudinaryDelivery: withCloudinaryDelivery,
  };
})(window);
