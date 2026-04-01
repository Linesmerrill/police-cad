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
    holdTraffic: '/static/audio/Hold_traffic_sound_adj.mp3',
    toneLeo: '/static/audio/Tone_leo_alert_adj.mp3',
    toneFd: '/static/audio/Tone_fd_alert_adj.mp3',
    toneEms: '/static/audio/Tone_ems_alert_adj.mp3'
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
  // Creates a temporary silent Audio element and plays it to unlock
  // the browser's autoplay policy for the AudioContext.
  function warmUp() {
    if (warmedUp) return;
    warmedUp = true;

    // Play a brief silent audio to unlock the browser AudioContext
    // without touching the cached elements (avoids race conditions
    // where a .then(pause) could kill real playback that starts
    // in the same click event).
    try {
      var silent = new Audio();
      silent.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
      silent.volume = 0;
      silent.play().then(function() { silent.pause(); }).catch(function() {});
    } catch (e) {}

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
    // Use the DB user preference as the source of truth.
    // The checkbox (on dashboards that have it) is just a UI mirror of this value.
    var userPref = window.dbUser?.user?.panicButtonSound;
    if (userPref === false) {
      // Sound disabled by user preference
      return false;
    }
    return true;
  }

  // Custom/uploaded tones are typically mastered at full volume (~0 dB).
  // Our built-in _adj files are normalized to ~-22 dB. This multiplier
  // brings custom uploads roughly in line with the built-in sounds.
  var CUSTOM_TONE_GAIN = 0.15;

  function playNext() {
    if (queue.length === 0) {
      isPlaying = false;
      return;
    }
    isPlaying = true;
    var item = queue.shift();
    var src = typeof item === 'string' ? item : item.src;
    var isCustom = typeof item === 'object' && item.custom;
    var audio = getOrCreateAudio(src);

    var vol = getVolume();
    audio.volume = isCustom ? vol * CUSTOM_TONE_GAIN : vol;
    audio.currentTime = 0;

    // Clean up listeners from any previous play on this element
    audio.onended = playNext;
    audio.onerror = function() {
      console.warn('[AlertSounds] Audio error for:', src);
      playNext();
    };

    audio.play().then(function() {
      // Playing successfully
    }).catch(function(e) {
      console.warn('[AlertSounds] Play failed:', src, e.message);
      playNext();
    });
  }

  return {
    /**
     * Play a sound by key. Queues if another sound is already playing.
     * @param {string} soundKey - One of: 'panic', 'signal100', 'holdTraffic', 'toneLeo', 'toneFd', 'toneEms'
     */
    play: function(soundKey) {
      if (!isSoundEnabled()) return;
      var src = resolveUrl(soundKey);
      if (!src) return;
      queue.push(src);
      if (!isPlaying) playNext();
    },

    /**
     * Preview a sound at a specific volume (0-100). Ignores the enabled check
     * so users can hear the level they're setting in the settings modal.
     * Stops any currently-playing preview before starting a new one.
     * @param {string} soundKey - e.g. 'signal100'
     * @param {number} volumePercent - 0–100
     */
    preview: function(soundKey, volumePercent) {
      var src = resolveUrl(soundKey);
      if (!src) return;
      var audio = getOrCreateAudio(src);
      audio.volume = Math.max(0, Math.min(1, volumePercent / 100));
      audio.currentTime = 0;
      audio.play().catch(function() {});
    },

    /**
     * Play a sound by direct URL. Queues if another sound is already playing.
     * Used for custom tone sounds where the URL comes from the server.
     * @param {string} url - Direct URL to the audio file
     */
    playUrl: function(url) {
      if (!isSoundEnabled()) return;
      if (!url) return;
      queue.push({ src: url, custom: true });
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

/**
 * Initialize the sound settings UI (checkbox + volume slider) from the
 * user's saved DB preferences. Call this after dbUser is available.
 */
window.initSoundSettings = function() {
  var pref = window.dbUser?.user?.panicButtonSound;
  // Default to enabled if never set (undefined)
  $('#panic-button-check-sound').prop('checked', pref !== false);
  $('#alert-volume-slider').val(window.dbUser?.user?.alertVolumeLevel || 50);
};

/**
 * Open the sound settings modal.
 */
window.openSoundSettings = function() {
  var modal = document.getElementById('accountModal');
  if (modal) {
    modal.style.display = 'flex';
  }
  // Ensure settings are initialized when opening
  if (typeof window.initSoundSettings === 'function') {
    window.initSoundSettings();
  }
};

/**
 * Toggle the panic button sound preference and save to DB.
 * Shared across all dashboards — replaces per-dashboard implementations.
 */
window.togglePanicBtnSound = function() {
  var socket = io({ transports: ['websocket'] });
  socket.emit('update_panic_btn_sound', window.dbUser);
  socket.on('load_panic_btn_result', function(res) {
    var newVal = !res.user.panicButtonSound;
    $('#panic-button-check-sound').prop('checked', newVal);
    window.dbUser.user.panicButtonSound = newVal;
    $('#successfully-updated-alert').show().delay(2000).fadeOut(1000);
  });
};

/**
 * Save the alert volume slider value to DB.
 * Shared across all dashboards — replaces per-dashboard implementations.
 */
window.adjustAlertVolumeSlider = function() {
  var socket = io({ transports: ['websocket'] });
  var vol = $('#alert-volume-slider').val();
  socket.emit('update_alert_volume_slider', { dbUser: window.dbUser, volume: vol });
  socket.on('load_alert_volume_result', function() {
    window.dbUser.user.alertVolumeLevel = vol;
    $('#successfully-updated-alert').show().delay(2000).fadeOut(1000);
  });
};
