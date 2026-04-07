import type { HarmonyModifiers, ResolvedChord } from "../harmony";
import type { AudioSink, ChordResolver, VoicingEngine } from "./contracts";

/**
 * 编排「解析 → 声部 → 发声」，与 UI/输入解耦。
 * 换调性、换解析器时可重置上一和弦声部。
 */
export class ChordPlaybackSession {
  tonicPc = 0;
  lastVoicing: number[] | null = null;

  constructor(
    private resolver: ChordResolver,
    private voicing: VoicingEngine,
    private sink: AudioSink,
  ) {}

  setResolver(resolver: ChordResolver): void {
    this.resolver = resolver;
    this.lastVoicing = null;
  }

  setVoicingEngine(engine: VoicingEngine): void {
    this.voicing = engine;
    this.lastVoicing = null;
  }

  setAudioSink(sink: AudioSink): void {
    this.sink = sink;
  }

  setTonic(tonicPc: number): void {
    this.tonicPc = tonicPc;
    this.lastVoicing = null;
  }

  play(degree: number, modifiers: HarmonyModifiers): ResolvedChord {
    const chord = this.resolver.resolve(this.tonicPc, degree, modifiers);
    const midis = this.voicing.resolve(this.lastVoicing, chord);
    this.lastVoicing = midis;
    void this.sink.ensureRunning().then(() => {
      this.sink.playMidi(midis);
    });
    return chord;
  }

  stop(): void {
    this.sink.stop();
  }

  /** 与换调/换模式时一致：清空声部记忆 */
  resetVoicingMemory(): void {
    this.lastVoicing = null;
  }

  /** 用户手势后唤醒音频（浏览器策略） */
  ensureAudio(): Promise<void> {
    return this.sink.ensureRunning();
  }
}
