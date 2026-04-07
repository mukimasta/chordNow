/**
 * Polyphonic chord voice: one oscillator per note, shared bus to destination.
 * 重触发时交叉淡化 + 总线压缩/余量，减轻并联与削波导致的爆音。
 */

import type { AudioSink } from "./core/contracts";

/** 交叉淡化加长，重叠期更平滑 */
const CROSSFADE_S = 0.072;
/** 首和弦起音略拉长，减轻起振瞬态 */
const FIRST_ATTACK_S = 0.024;
const RELEASE_S = 0.062;
/** 和弦主增益峰值（原 0.22，留余量给多音叠加） */
const CHORD_MASTER_PEAK = 0.13;
/** 单振荡器增益（原 0.9，与主增益一起降） */
const PER_OSC_GAIN = 0.58;
/** 掐断旧层时极短淡出，避免硬切咔哒 */
const HARD_STOP_FADE_S = 0.012;

export class ChordVoice implements AudioSink {
  private ctx: AudioContext | null = null;
  private current: {
    master: GainNode;
    oscillators: OscillatorNode[];
  } | null = null;
  private fadingOut: {
    master: GainNode;
    oscillators: OscillatorNode[];
  } | null = null;
  private fadingOutCleanup: ReturnType<typeof setTimeout> | null = null;
  private mixOut: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  /**
   * mixOut → DynamicsCompressor → makeup gain（略压整体）→ destination
   */
  private getMixOut(ctx: AudioContext): GainNode {
    if (!this.mixOut) {
      this.mixOut = ctx.createGain();
      this.mixOut.gain.value = 1;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -26;
      comp.knee.value = 28;
      comp.ratio.value = 8;
      comp.attack.value = 0.0015;
      comp.release.value = 0.22;

      const makeup = ctx.createGain();
      makeup.gain.value = 0.85;

      this.mixOut.connect(comp);
      comp.connect(makeup);
      makeup.connect(ctx.destination);
    }
    return this.mixOut;
  }

  private muteAndDisconnect(slot: {
    master: GainNode;
    oscillators: OscillatorNode[];
  }): void {
    const ctx = this.getContext();
    const t = ctx.currentTime;
    slot.master.gain.cancelScheduledValues(t);
    const v = Math.min(slot.master.gain.value, CHORD_MASTER_PEAK);
    slot.master.gain.setValueAtTime(v, t);
    slot.master.gain.linearRampToValueAtTime(0, t + HARD_STOP_FADE_S);

    const { oscillators } = slot;
    const m = slot.master;
    const stopAt = t + HARD_STOP_FADE_S + 0.02;
    for (const o of oscillators) {
      try {
        o.stop(stopAt);
      } catch {
        /* ignore */
      }
    }
    setTimeout(() => {
      for (const o of oscillators) {
        try {
          o.disconnect();
        } catch {
          /* ignore */
        }
      }
      try {
        m.disconnect();
      } catch {
        /* ignore */
      }
    }, (HARD_STOP_FADE_S + 0.04) * 1000);
  }

  private clearFadingOutNow(): void {
    if (this.fadingOutCleanup) {
      clearTimeout(this.fadingOutCleanup);
      this.fadingOutCleanup = null;
    }
    if (this.fadingOut) {
      this.muteAndDisconnect(this.fadingOut);
      this.fadingOut = null;
    }
  }

  async ensureRunning(): Promise<void> {
    const c = this.getContext();
    if (c.state === "suspended") await c.resume();
  }

  stop(): void {
    this.clearFadingOutNow();
    if (!this.current) return;
    const { master, oscillators } = this.current;
    const ctx = this.getContext();
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + RELEASE_S);
    for (const o of oscillators) {
      try {
        o.stop(t + RELEASE_S + 0.02);
      } catch {
        /* already stopped */
      }
    }
    const slot = this.current;
    this.current = null;
    setTimeout(() => {
      try {
        slot.master.disconnect();
      } catch {
        /* ignore */
      }
      for (const o of slot.oscillators) {
        try {
          o.disconnect();
        } catch {
          /* ignore */
        }
      }
    }, (RELEASE_S + 0.05) * 1000);
  }

  playMidi(midiNotes: number[]): void {
    const ctx = this.getContext();
    const t = ctx.currentTime;
    const mixOut = this.getMixOut(ctx);

    this.clearFadingOutNow();

    const old = this.current;
    if (old) {
      old.master.gain.cancelScheduledValues(t);
      old.master.gain.setValueAtTime(old.master.gain.value, t);
      old.master.gain.linearRampToValueAtTime(0, t + CROSSFADE_S);
      this.fadingOut = old;
      this.fadingOutCleanup = setTimeout(() => {
        this.muteAndDisconnect(old);
        if (this.fadingOut === old) this.fadingOut = null;
        this.fadingOutCleanup = null;
      }, (CROSSFADE_S + 0.035) * 1000);
    }

    const master = ctx.createGain();
    master.connect(mixOut);
    master.gain.setValueAtTime(0, t);
    if (old) {
      master.gain.linearRampToValueAtTime(CHORD_MASTER_PEAK, t + CROSSFADE_S);
    } else {
      master.gain.linearRampToValueAtTime(CHORD_MASTER_PEAK, t + FIRST_ATTACK_S);
    }

    const oscillators: OscillatorNode[] = [];
    for (const midi of midiNotes) {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(PER_OSC_GAIN, t);
      o.connect(g);
      g.connect(master);
      o.start(t);
      oscillators.push(o);
    }

    this.current = { master, oscillators };
  }
}
