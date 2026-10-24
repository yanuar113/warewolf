// Atmospheric sound effects generated purely using Web Audio API

class SoundSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Deep eerie night gong / wolf howl harmonic
   */
  public playNightFall() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Dark gong drone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now); // A2
      osc.frequency.exponentialRampToValueAtTime(75, now + 1.8);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.2);

      // Low ominous howl resonance
      const howlOsc = ctx.createOscillator();
      const howlGain = ctx.createGain();
      howlOsc.type = 'triangle';
      howlOsc.frequency.setValueAtTime(220, now + 0.3);
      howlOsc.frequency.linearRampToValueAtTime(330, now + 1.0);
      howlOsc.frequency.exponentialRampToValueAtTime(160, now + 2.0);

      howlGain.gain.setValueAtTime(0.001, now);
      howlGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
      howlGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      howlOsc.connect(howlGain);
      howlGain.connect(ctx.destination);
      howlOsc.start(now + 0.3);
      howlOsc.stop(now + 2.0);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Crisp morning rooster / bright morning chime
   */
  public playDayDawn() {
    this.playDramaticSunrise();
  }

  /**
   * Cinematic sunrise transition: deep atmospheric dawn drone + ascending harmonic bells
   */
  public playDramaticSunrise() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Warm dawn sub-bass pad
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      padOsc.type = 'triangle';
      padOsc.frequency.setValueAtTime(130.81, now); // C3
      padOsc.frequency.linearRampToValueAtTime(146.83, now + 1.2); // D3
      padOsc.frequency.linearRampToValueAtTime(164.81, now + 2.0); // E3

      padGain.gain.setValueAtTime(0.001, now);
      padGain.gain.linearRampToValueAtTime(0.2, now + 0.6);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      padOsc.connect(padGain);
      padGain.connect(ctx.destination);
      padOsc.start(now);
      padOsc.stop(now + 2.8);

      // Ascending triumphant dawn notes (E4, G#4, B4, E5, G#5)
      const notes = [329.63, 415.30, 493.88, 659.25, 830.61];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.4 + idx * 0.16);

        gain.gain.setValueAtTime(0.001, now + 0.4 + idx * 0.16);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.4 + idx * 0.16 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + idx * 0.16 + 1.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.4 + idx * 0.16);
        osc.stop(now + 0.4 + idx * 0.16 + 1.4);
      });
    } catch {}
  }

  /**
   * Resonant village church bell (for voting / discussion alerts)
   */
  public playBell() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.6);
    } catch {}
  }

  /**
   * Card flip / mystery peek chime
   */
  public playCardFlip() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  /**
   * Elimination strike / execution thud
   */
  public playElimination() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  /**
   * Victory triumphant chime
   */
  public playVictory() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const fanfare = [523.25, 659.25, 783.99, 1046.5];

      fanfare.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.001, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.15 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.8);
      });
    } catch {}
  }
}

export const sounds = new SoundSystem();
