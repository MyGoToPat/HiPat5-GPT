class AudioServiceClass {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private originalVolume: number = 1;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.originalVolume = this.masterGain.gain.value;
      
      // Preload sound files
      await this.loadSounds();
      this.isInitialized = true;
    } catch (error) {
      console.warn('AudioService initialization failed:', error);
    }
  }

  private async loadSounds() {
    const soundFiles = ['beep', 'start', 'end', 'bell'];
    
    for (const sound of soundFiles) {
      try {
        const response = await fetch(`/sounds/${sound}.wav`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          this.sounds.set(sound, audioBuffer);
        }
      } catch (error) {
        console.warn(`Failed to load sound: ${sound}`, error);
        // Create a simple beep as fallback
        this.createFallbackBeep(sound);
      }
    }
  }

  private createFallbackBeep(soundName: string) {
    if (!this.audioContext) return;
    
    // Create a simple synthetic beep
    const duration = 0.2;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    const frequency = soundName === 'bell' ? 800 : 440;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 3);
    }
    
    this.sounds.set(soundName, buffer);
  }

  async playCue(type: 'beep' | 'start' | 'end' | 'bell', volume: number = 1) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.audioContext || !this.masterGain) return;
    
    const buffer = this.sounds.get(type);
    if (!buffer) return;

    // Duck the master volume for the duration of the cue
    const cueDuration = buffer.duration;
    const currentTime = this.audioContext.currentTime;
    
    // Lower master volume
    this.masterGain.gain.setValueAtTime(this.originalVolume, currentTime);
    this.masterGain.gain.linearRampToValueAtTime(this.originalVolume * 0.5, currentTime + 0.1);
    
    // Play the cue
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    source.start(currentTime);
    
    // Restore master volume after cue
    this.masterGain.gain.linearRampToValueAtTime(
      this.originalVolume, 
      currentTime + cueDuration + 0.1
    );
  }

  speak(text: string, settings: { rate?: number; pitch?: number; volume?: number } = {}) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate || 1.0;
    utterance.pitch = settings.pitch || 1.0;
    utterance.volume = settings.volume || 1.0;

    speechSynthesis.speak(utterance);
  }

  setMasterVolume(volume: number) {
    this.originalVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.originalVolume;
    }
  }

  // Preview method for settings
  async previewCue(type: 'beep' | 'start' | 'end' | 'bell') {
    await this.playCue(type, 0.7);
  }
}

export const AudioService = new AudioServiceClass();