import type { HarmonyModifiers, ResolvedChord } from "../harmony";

/**
 * 和声解析：给定主音、级数与修饰，产出根音与和弦类型。
 * 新增调式/规则时实现此接口并在 {@link Registry} 中注册即可。
 */
export interface ChordResolver {
  readonly id: string;
  readonly label: string;
  resolve(
    tonicPc: number,
    degree: number,
    modifiers: HarmonyModifiers,
  ): ResolvedChord;
}

/**
 * 声部编排：把解析结果变成 MIDI 音高列表（可含就近连接、音区等策略）。
 */
export interface VoicingEngine {
  readonly id: string;
  readonly label: string;
  resolve(
    previousMidis: number[] | null,
    chord: ResolvedChord,
  ): number[];
}

/**
 * 发声后端：可替换为采样器、外接 MIDI 等。
 */
export interface AudioSink {
  playMidi(midiNotes: number[]): void;
  stop(): void;
  ensureRunning(): Promise<void>;
}
