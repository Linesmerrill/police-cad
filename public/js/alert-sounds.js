/**
 * AlertSounds — Centralized alert sound manager for dashboards.
 *
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
