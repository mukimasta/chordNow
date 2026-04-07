/**
 * Polyphonic chord voice: one oscillator per note, shared bus to destination.
 * 重触发时交叉淡化 + 总线压缩/余量；支持多种音色（见 {@link TimbreId}）。
 */

import type { AudioSink } from "./core/contracts";
import type { TimbreId } from "./timbres";

/** 交叉淡化加长，重叠期更平滑 */
const CROSSFADE_S = 0.072;
/** 首和弦起音略拉长，减轻起振瞬态 */
const FIRST_ATTACK_S = 0.024;
const RELEASE_S = 0.062;
/** 和弦主增益峰值（原 0.22，留余量给多音叠加） */
const CHORD_MASTER_PEAK = 0.13;
/** 单音层基准增益（三角单源） */
const PER_OSC_GAIN = 0.58;
/** 掐断旧层时极短淡出，避免硬切咔哒 */
const HARD_STOP_FADE_S = 0.012;

type VoiceSlot = {
  master: GainNode;
  oscillators: OscillatorNode[];
  /** 滤波、中间增益等非声源节点，释音时需 disconnect */
  extraNodes: AudioNode[];
};

export class ChordVoice implements AudioSink {
  private ctx: AudioContext | null = null;
  private current: VoiceSlot | null = null;
  private fadingOut: VoiceSlot | null = null;
  private fadingOutCleanup: ReturnType<typeof setTimeout> | null = null;
  private mixOut: GainNode | null = null;
  private timbre: TimbreId = "piano";

  private getContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  /** 切换音色；下次 `playMidi` 起生效，不改变已发声层。 */
  setTimbre(id: TimbreId): void {
    this.timbre = id;
  }

  getTimbre(): TimbreId {
    return this.timbre;
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

  private muteAndDisconnect(slot: VoiceSlot): void {
    const ctx = this.getContext();
    const t = ctx.currentTime;
    slot.master.gain.cancelScheduledValues(t);
    const v = Math.min(slot.master.gain.value, CHORD_MASTER_PEAK);
    slot.master.gain.setValueAtTime(v, t);
    slot.master.gain.linearRampToValueAtTime(0, t + HARD_STOP_FADE_S);

    const { oscillators, extraNodes } = slot;
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
      for (const n of extraNodes) {
        try {
          n.disconnect();
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
      for (const n of slot.extraNodes) {
        try {
          n.disconnect();
        } catch {
          /* ignore */
        }
      }
    }, (RELEASE_S + 0.05) * 1000);
  }

  /**
   * 按当前音色把单音接到 `target`（和弦总增益），并登记振荡器与需断开的节点。
   */
  private addNoteForTimbre(
    ctx: AudioContext,
    t: number,
    midi: number,
    target: GainNode,
    oscillators: OscillatorNode[],
    extraNodes: AudioNode[],
  ): void {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    switch (this.timbre) {
      case "triangle": {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(PER_OSC_GAIN, t);
        o.connect(g);
        g.connect(target);
        o.start(t);
        oscillators.push(o);
        extraNodes.push(g);
        break;
      }
      case "sine": {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(PER_OSC_GAIN * 1.06, t);
        o.connect(g);
        g.connect(target);
        o.start(t);
        oscillators.push(o);
        extraNodes.push(g);
        break;
      }
      case "warm": {
        const gSum = PER_OSC_GAIN * 0.92;
        const oTri = ctx.createOscillator();
        oTri.type = "triangle";
        oTri.frequency.setValueAtTime(freq, t);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(gSum * 0.52, t);
        oTri.connect(g1);
        g1.connect(target);

        const oSin = ctx.createOscillator();
        oSin.type = "sine";
        oSin.frequency.setValueAtTime(freq, t);
        oSin.detune.setValueAtTime(3.5, t);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(gSum * 0.48, t);
        oSin.connect(g2);
        g2.connect(target);

        oTri.start(t);
        oSin.start(t);
        oscillators.push(oTri, oSin);
        extraNodes.push(g1, g2);
        break;
      }
      case "sawPad": {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(freq, t);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2400, t);
        filter.Q.setValueAtTime(0.85, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(PER_OSC_GAIN * 0.72, t);
        o.connect(filter);
        filter.connect(g);
        g.connect(target);
        o.start(t);
        oscillators.push(o);
        extraNodes.push(filter, g);
        break;
      }
      case "piano": {
        /** 弦的非谐和近似：fn ≈ n·f·(1 + α·n²) */
        const inharm = (n: number): number =>
          freq * n * (1 + 0.00014 * n * n);
        const partialRel = [0.5, 0.26, 0.14, 0.08, 0.05];
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0, t);
        noteGain.gain.linearRampToValueAtTime(0.38, t + 0.003);
        noteGain.gain.linearRampToValueAtTime(0.2, t + 0.22);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        const fc = Math.min(7800, Math.max(3200, 4200 + (midi - 48) * 38));
        filter.frequency.setValueAtTime(fc, t);
        filter.Q.setValueAtTime(0.55, t);

        noteGain.connect(filter);
        filter.connect(target);

        const base = PER_OSC_GAIN * 0.55;
        for (let i = 0; i < partialRel.length; i++) {
          const n = i + 1;
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(inharm(n), t);
          const g = ctx.createGain();
          g.gain.setValueAtTime(base * partialRel[i]!, t);
          o.connect(g);
          g.connect(noteGain);
          o.start(t);
          oscillators.push(o);
          extraNodes.push(g);
        }
        extraNodes.push(noteGain, filter);
        break;
      }
    }
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
    const extraNodes: AudioNode[] = [];
    for (const midi of midiNotes) {
      this.addNoteForTimbre(ctx, t, midi, master, oscillators, extraNodes);
    }

    this.current = { master, oscillators, extraNodes };
  }
}
