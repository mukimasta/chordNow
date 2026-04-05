/**
 * Polyphonic chord voice: one oscillator per note, shared master gain, ADSR-ish envelope.
 */

export class ChordVoice {
  private ctx: AudioContext | null = null;
  private current: {
    master: GainNode;
    oscillators: OscillatorNode[];
  } | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  async ensureRunning(): Promise<void> {
    const c = this.getContext();
    if (c.state === "suspended") await c.resume();
  }

  stop(): void {
    if (!this.current) return;
    const { master, oscillators } = this.current;
    const t = this.getContext().currentTime;
    const release = 0.05;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + release);
    for (const o of oscillators) {
      try {
        o.stop(t + release + 0.02);
      } catch {
        /* already stopped */
      }
    }
    setTimeout(() => {
      try {
        master.disconnect();
      } catch {
        /* ignore */
      }
      for (const o of oscillators) {
        try {
          o.disconnect();
        } catch {
          /* ignore */
        }
      }
    }, (release + 0.05) * 1000);
    this.current = null;
  }

  playMidi(midiNotes: number[]): void {
    this.stop();
    const ctx = this.getContext();
    const t = ctx.currentTime;
    const attack = 0.015;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.22, t + attack);
    master.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    for (const midi of midiNotes) {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, t);
      o.connect(g);
      g.connect(master);
      o.start(t);
      oscillators.push(o);
    }

    this.current = { master, oscillators };
  }
}
