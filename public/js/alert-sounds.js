/**
 * AlertSounds — Centralized alert sound manager for dashboards.
 *
 * Plays sounds sequentially (queued, never overlapping).
 * Supports community-uploaded sound overrides via configure().
 *
 * Uses Web Audio API to unlock audio on first user interaction,
 * ensuring sounds play reliably even from async callbacks and socket events.
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
  var audioContext = null;
  var unlocked = false;

  // Unlock audio playback on first user interaction.
  // Browsers block audio until a user gesture has resumed an AudioContext.
  function unlock() {
    if (unlocked) return;
    try {
      if (!audioContext) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioContext = new AC();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      // Also play a silent HTML5 Audio to unlock that pathway
      var silent = new Audio();
      silent.volume = 0;
      silent.play().then(function() { silent.pause(); }).catch(function() {});
      unlocked = true;
    } catch (e) {
      // Ignore — best-effort unlock
    }
  }

  // Listen for common user gestures to unlock audio
  ['click', 'touchstart', 'keydown'].forEach(function(event) {
    document.addEventListener(event, unlock, { once: false, capture: true });
  });

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
    return checkboxEnabled && userPref !== false;
  }

  function playNext() {
    if (queue.length === 0) {
      isPlaying = false;
      return;
    }
    isPlaying = true;
    var src = queue.shift();

    var audio = new Audio(src);
    audio.volume = getVolume();

    audio.addEventListener('ended', playNext);
    audio.addEventListener('error', playNext);

    audio.play().catch(function(e) {
      console.log('Alert sound play failed:', e.message);
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
        }
      }
    }
  };
})();
