/**
 * AlertSounds — Centralized alert sound manager for dashboards.
 *
 * Pre-loads audio files and reuses Audio elements for reliable playback.
 * Plays sounds sequentially (queued, never overlapping).
 * Supports community-uploaded sound overrides via configure().
 */
window.AlertSounds = (function() {
  var defaults = {
    panic: '/static/audio/Police_panic_button_sound_adj.mp3',
    signal100: '/static/audio/Dispatch_signal_100_beep_adj.mp3',
    holdTraffic: '/static/audio/Hold_traffic_sound_adj.mp3'
  };

  var overrides = {};
  var queue = [];
  var isPlaying = false;

  // Pre-loaded Audio elements keyed by URL — reused across plays
  var audioCache = {};
  var warmedUp = false;

  // Pre-load all default sounds so they're ready to play instantly
  function preload() {
    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        getOrCreateAudio(defaults[key]);
      }
    }
  }

  function getOrCreateAudio(src) {
    if (!audioCache[src]) {
      var audio = new Audio();
      audio.preload = 'auto';
      audio.src = src;
      audioCache[src] = audio;
    }
    return audioCache[src];
  }

  // Warm up audio on first user interaction.
  // Plays each pre-loaded Audio at volume 0 to unlock the browser's
  // autoplay policy for that element, then pauses and rewinds.
  function warmUp() {
    if (warmedUp) return;
    warmedUp = true;

    for (var src in audioCache) {
      if (audioCache.hasOwnProperty(src)) {
        var audio = audioCache[src];
        audio.volume = 0;
        audio.play().then(function(a) {
          return function() { a.pause(); a.currentTime = 0; };
        }(audio)).catch(function() {});
      }
    }

    // Remove listeners after warm-up
    ['click', 'touchstart', 'keydown'].forEach(function(event) {
      document.removeEventListener(event, warmUp, true);
    });
  }

  // Listen for user gestures to warm up audio
  ['click', 'touchstart', 'keydown'].forEach(function(event) {
    document.addEventListener(event, warmUp, { capture: true });
  });

  // Kick off preloading immediately (downloads files, no playback)
  preload();

  function resolveUrl(soundKey) {
    return overrides[soundKey] || defaults[soundKey] || null;
  }

  function getVolume() {
    var level = window.dbUser?.user?.alertVolumeLevel;
    return level ? level / 100 : 0.1;
  }

  function isSoundEnabled() {
    var $checkbox = $('#panic-button-check-sound');
    var checkboxEnabled = $checkbox.length ? $checkbox.prop('checked') : true;
    var userPref = window.dbUser?.user?.panicButtonSound;
    var enabled = checkboxEnabled && userPref !== false;
    if (!enabled) {
      console.log('[AlertSounds] Sound disabled — checkbox:', checkboxEnabled, 'userPref:', userPref);
    }
    return enabled;
  }

  function playNext() {
    if (queue.length === 0) {
      isPlaying = false;
      return;
    }
    isPlaying = true;
    var src = queue.shift();
    var audio = getOrCreateAudio(src);

    audio.volume = getVolume();
    audio.currentTime = 0;

    // Clean up listeners from any previous play on this element
    audio.onended = playNext;
    audio.onerror = function() {
      console.warn('[AlertSounds] Audio error for:', src);
      playNext();
    };

    audio.play().then(function() {
      console.log('[AlertSounds] Playing:', src, 'volume:', audio.volume);
    }).catch(function(e) {
      console.warn('[AlertSounds] Play failed:', src, e.message);
      playNext();
    });
  }

  return {
    /**
     * Play a sound by key. Queues if another sound is already playing.
     * @param {string} soundKey - One of: 'panic', 'signal100', 'holdTraffic'
     */
    play: function(soundKey) {
      if (!isSoundEnabled()) return;
      var src = resolveUrl(soundKey);
      if (!src) return;
      queue.push(src);
      if (!isPlaying) playNext();
    },

    /**
     * Override default sound URLs (e.g. with community-uploaded files).
     * @param {Object} soundMap - e.g. { panic: 'https://cdn.example.com/custom.mp3' }
     */
    configure: function(soundMap) {
      for (var key in soundMap) {
        if (soundMap.hasOwnProperty(key)) {
          overrides[key] = soundMap[key];
          getOrCreateAudio(soundMap[key]); // Pre-load override too
        }
      }
    }
  };
})();
