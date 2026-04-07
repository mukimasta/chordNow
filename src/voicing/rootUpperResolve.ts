import type { ChordKind } from "../harmony";
import { chordToMidi, voiceLeadingCost } from "../pitches";

/** 根音与上层允许的 MIDI 闭区间（默认 D2–A3、B3–C5） */
export interface RootUpperRegisterConfig {
  bass: { minMidi: number; maxMidi: number };
  upper: { minMidi: number; maxMidi: number };
  /** 上层音高（不含根）整体跨度上限（半音） */
  upperMaxSpan: number;
}

export const DEFAULT_ROOT_UPPER_REGISTER: RootUpperRegisterConfig = {
  bass: { minMidi: 38, maxMidi: 57 }, // D2–A3
  upper: { minMidi: 59, maxMidi: 72 }, // B3–C5
  upperMaxSpan: 12,
};

export interface RootUpperOpenWeights {
  /** 根音相对 bass 区间中心的平方惩罚权重（不参与上一和弦） */
  bassRegisterWeight: number;
  /** 上层整体相对 upper 区间中心的平方惩罚 */
  upperRegisterWeight: number;
  /** 越大越倾向拉大上层 span；从代价中减去 `openSpanWeight * span` */
  openSpanWeight: number;
}

export const DEFAULT_ROOT_UPPER_WEIGHTS: RootUpperOpenWeights = {
  bassRegisterWeight: 0.022,
  upperRegisterWeight: 0.018,
  openSpanWeight: 0.06,
};

function chordIntervalsFromRoot(kind: ChordKind): readonly number[] {
  switch (kind) {
    case "majorTriad":
      return [0, 4, 7];
    case "minorTriad":
      return [0, 3, 7];
    case "diminishedTriad":
      return [0, 3, 6];
    case "dominant7":
      return [0, 4, 7, 10];
    case "major7":
      return [0, 4, 7, 11];
    case "minor7":
      return [0, 3, 7, 10];
    case "halfDiminished7":
      return [0, 3, 6, 10];
  }
}

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function midiCandidatesForPc(
  pc: number,
  minMidi: number,
  maxMidi: number,
): number[] {
  const p = normalizePc(pc);
  const out: number[] = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    if (normalizePc(m) === p) out.push(m);
  }
  return out;
}

function cartesianMidi(arrays: number[][]): number[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const tail = cartesianMidi(rest);
  const out: number[][] = [];
  for (const a of first) {
    for (const t of tail) {
      out.push([a, ...t]);
    }
  }
  return out;
}

function registerPenalty1(midi: number, center: number, weight: number): number {
  const d = midi - center;
  return weight * d * d;
}

function upperRegisterPenalty(
  upper: number[],
  upperMin: number,
  upperMax: number,
  weight: number,
): number {
  const center = (upperMin + upperMax) / 2;
  let s = 0;
  for (const m of upper) s += registerPenalty1(m, center, 1);
  return (weight * s) / upper.length;
}

/** 上一完整和弦 MIDI → 上层（不含最低音；三和弦为 3 个上层音，七和弦为 3 个） */
export function extractUpperFromChord(midis: number[] | null): number[] | null {
  if (!midis || midis.length < 2) return null;
  const sorted = [...midis].sort((a, b) => a - b);
  return sorted.slice(1);
}

/**
 * 根音仅在注册表内优化（不跟上一和弦根音做就近），上层在区间内枚举：
 * 跨度 ≤ upperMaxSpan、上层音高于根音；目标 = 上层就近 + 上层开放（偏大 span）+ 音区软惩罚。
 */
export function resolveRootUpperOpen(
  prevMidis: number[] | null,
  rootPc: number,
  kind: ChordKind,
  reg: RootUpperRegisterConfig = DEFAULT_ROOT_UPPER_REGISTER,
  weights: RootUpperOpenWeights = DEFAULT_ROOT_UPPER_WEIGHTS,
): number[] {
  const intervals = chordIntervalsFromRoot(kind);
  const rootP = normalizePc(rootPc);
  /** 三和弦：上层为根+三+五（根在 bass 再于上层重复一次）；七和弦：三+五+七 */
  const upperPcs =
    intervals.length === 3
      ? intervals.map((s) => normalizePc(rootP + s))
      : intervals.slice(1).map((s) => normalizePc(rootP + s));

  const bassCenter = (reg.bass.minMidi + reg.bass.maxMidi) / 2;

  const bassCandidates = midiCandidatesForPc(
    rootP,
    reg.bass.minMidi,
    reg.bass.maxMidi,
  );
  if (bassCandidates.length === 0) {
    return chordToMidi(rootPc, kind);
  }

  const prevUpper = extractUpperFromChord(prevMidis);

  const optionArrays = upperPcs.map((pc) =>
    midiCandidatesForPc(pc, reg.upper.minMidi, reg.upper.maxMidi),
  );
  if (optionArrays.some((a) => a.length === 0)) {
    return chordToMidi(rootPc, kind);
  }

  let best: number[] | null = null;
  let bestCost = Infinity;

  for (const bass of bassCandidates) {
    for (const upper of cartesianMidi(optionArrays)) {
      const sortedU = [...upper].sort((a, b) => a - b);
      const span = sortedU[sortedU.length - 1]! - sortedU[0]!;
      if (span > reg.upperMaxSpan) continue;
      if (sortedU[0]! <= bass) continue;

      const vl =
        prevUpper && prevUpper.length > 0
          ? voiceLeadingCost(prevUpper, sortedU)
          : 0;

      const bp = registerPenalty1(bass, bassCenter, weights.bassRegisterWeight);
      const up = upperRegisterPenalty(
        sortedU,
        reg.upper.minMidi,
        reg.upper.maxMidi,
        weights.upperRegisterWeight,
      );

      const cost = bp + up + vl - weights.openSpanWeight * span;

      if (cost < bestCost) {
        bestCost = cost;
        best = [bass, ...sortedU].sort((a, b) => a - b);
      } else if (cost === bestCost && best !== null) {
        const bSpan = best[best.length - 1]! - best[0]!;
        const tie = [bass, ...sortedU].sort((a, b) => a - b);
        const tSpan = tie[tie.length - 1]! - tie[0]!;
        if (tSpan > bSpan) best = tie;
      }
    }
  }

  return best ?? chordToMidi(rootPc, kind);
}
