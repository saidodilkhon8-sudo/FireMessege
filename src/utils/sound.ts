/**
 * Web Audio API Minimalist Sound Synthesizer
 * Zero-asset, zero-lag, works offline and in PWA mode.
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private ringOscillator: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;

  constructor() {
    // Check localStorage preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fm_sounds_enabled');
      this.isEnabled = stored !== 'false';
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fm_sounds_enabled', enabled ? 'true' : 'false');
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /** Subtle futuristic tactile click */
  public playClick() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /** Message received chime */
  public playMessageReceived() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.08); // A5

      osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);

      osc1.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } catch {}
  }

  /** Message sent pop */
  public playMessageSent() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  /** Start incoming/outgoing call ringing */
  public startRingtone() {
    if (!this.isEnabled) return;
    try {
      this.stopRingtone();
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.ringOscillator = osc;
      this.ringGain = gain;
    } catch {}
  }

  public stopRingtone() {
    try {
      if (this.ringOscillator) {
        this.ringOscillator.stop();
        this.ringOscillator.disconnect();
        this.ringOscillator = null;
      }
      if (this.ringGain) {
        this.ringGain.disconnect();
        this.ringGain = null;
      }
    } catch {}
  }
}

export const sound = new SoundController();
