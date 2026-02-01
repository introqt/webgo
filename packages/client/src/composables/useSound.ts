import { ref, onMounted } from 'vue';

type SoundName = 'stone-place' | 'stone-capture' | 'victory';

const sounds = ref<Record<SoundName, HTMLAudioElement | null>>({
  'stone-place': null,
  'stone-capture': null,
  'victory': null,
});

const isMuted = ref(false);
const volume = ref(0.6);

export function useSound() {
  onMounted(() => {
    // Load mute preference from localStorage
    const savedMute = localStorage.getItem('webgo-sound-muted');
    if (savedMute !== null) {
      isMuted.value = savedMute === 'true';
    }

    // Load volume preference from localStorage
    const savedVolume = localStorage.getItem('webgo-sound-volume');
    if (savedVolume !== null) {
      volume.value = parseFloat(savedVolume);
    }

    // Preload all sounds
    loadSounds();
  });

  function loadSounds() {
    const soundFiles: Record<SoundName, string> = {
      'stone-place': '/sounds/stone-place.mp3',
      'stone-capture': '/sounds/stone-capture.mp3',
      'victory': '/sounds/victory.mp3',
    };

    Object.entries(soundFiles).forEach(([name, path]) => {
      const audio = new Audio(path);
      audio.volume = volume.value;
      audio.preload = 'auto';
      sounds.value[name as SoundName] = audio;
    });
  }

  function play(soundName: SoundName) {
    if (isMuted.value) return;

    const sound = sounds.value[soundName];
    if (!sound) return;

    // Reset sound to beginning and play
    sound.currentTime = 0;
    sound.volume = volume.value;
    sound.play().catch((err) => {
      console.warn(`Failed to play sound ${soundName}:`, err);
    });
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    localStorage.setItem('webgo-sound-muted', String(isMuted.value));
  }

  function setVolume(newVolume: number) {
    volume.value = Math.max(0, Math.min(1, newVolume));
    localStorage.setItem('webgo-sound-volume', String(volume.value));

    // Update volume for all loaded sounds
    Object.values(sounds.value).forEach((sound) => {
      if (sound) {
        sound.volume = volume.value;
      }
    });
  }

  return {
    play,
    toggleMute,
    setVolume,
    isMuted,
    volume,
  };
}
