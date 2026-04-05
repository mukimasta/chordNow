import type { ChordKind } from "./harmony";

const TRIAD_INTERVALS: Record<
  "majorTriad" | "minorTriad" | "diminishedTriad",
  readonly number[]
> = {
  majorTriad: [0, 4, 7],
  minorTriad: [0, 3, 7],
  diminishedTriad: [0, 3, 6],
};

/** 根音上的相对半音；属七 / 大七 / 小七 / 半减七（ø，vii°+/） */
const SEVENTH_INTERVALS: Record<
  "dominant7" | "major7" | "minor7" | "halfDiminished7",
  readonly number[]
> = {
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  halfDiminished7: [0, 3, 6, 10],
};

/** 无「上一和弦」时使用的根音八度：C3=48（比 C4 低一整个八度） */
const DEFAULT_ROOT_OCTAVE_OFFSET = 48;

/** 就近连接后仍偏好的参考低音（MIDI），减轻越弹越低；与初始 C3 一带一致 */
const REGISTER_CENTER_BASS = 50;

/**
 * 音区惩罚：对「最低音相对参考」的偏离用平方项，近中心更松、远离中心更狠。
 * 权重与线性版在约 ±10 半音处量级相近（原 0.22×|d| ≈ 0.022×d²）。
 */
const REGISTER_WEIGHT = 0.022;

/** Root pitch class 0–11 → MIDI note number in octave 3（C3=48 … B3=59） */
export function rootPcToMidi(rootPc: number): number {
  const pc = ((rootPc % 12) + 12) % 12;
  return DEFAULT_ROOT_OCTAVE_OFFSET + pc;
}

export function chordToMidi(rootPc: number, kind: ChordKind): number[] {
  const root = rootPcToMidi(rootPc);
  if (
    kind === "dominant7" ||
    kind === "major7" ||
    kind === "minor7" ||
    kind === "halfDiminished7"
  ) {
    return SEVENTH_INTERVALS[kind].map((x) => root + x);
  }
  return TRIAD_INTERVALS[kind].map((x) => root + x);
}

/** 低音→高音对齐后的「就近」代价：两和弦音数不同时只比较前 min(n,m) 个声部 */
export function voiceLeadingCost(prevMidis: number[], nextMidis: number[]): number {
  const a = [...prevMidis].sort((x, y) => x - y);
  const b = [...nextMidis].sort((x, y) => x - y);
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s;
}

/** 低音离参考音区越远，惩罚越大（平方项） */
export function registerPenalty(midis: number[]): number {
  const sorted = [...midis].sort((x, y) => x - y);
  const bass = sorted[0] ?? REGISTER_CENTER_BASS;
  const d = bass - REGISTER_CENTER_BASS;
  return REGISTER_WEIGHT * d * d;
}

/** 就近 + 音区参考：用于在候选 voicing 中选优 */
export function totalVoicingCost(
  prevMidis: number[],
  candidateMidis: number[],
): number {
  return voiceLeadingCost(prevMidis, candidateMidis) + registerPenalty(candidateMidis);
}

/** 四音和弦转位：低音依次上移八度 */
function invertFourNotes(notes: number[], inv: number): number[] {
  let n = [...notes].sort((a, b) => a - b);
  for (let i = 0; i < inv; i++) {
    const low = n.shift()!;
    n.push(low + 12);
    n.sort((a, b) => a - b);
  }
  return n;
}

function fourthChordFromRoot(
  R: number,
  intervals: readonly number[],
  inv: 0 | 1 | 2 | 3,
): number[] {
  const notes = intervals.map((i) => R + i);
  return invertFourNotes(notes, inv);
}

function rootMidiCandidates(rootPc: number): number[] {
  const pc = ((rootPc % 12) + 12) % 12;
  const out: number[] = [];
  for (let m = 36; m <= 78; m++) {
    if (((m % 12) + 12) % 12 === pc) out.push(m);
  }
  return out;
}

function triadVoices(
  rootMidi: number,
  inversion: 0 | 1 | 2,
  kind: "majorTriad" | "minorTriad" | "diminishedTriad",
): number[] {
  const t = TRIAD_INTERVALS[kind];
  const [i0, i1, i2] = [t[0], t[1], t[2]];
  const R = rootMidi;
  switch (inversion) {
    case 0:
      return [R + i0, R + i1, R + i2];
    case 1:
      return [R + i1, R + i2, R + 12];
    case 2:
      return [R + i2, R + 12, R + 12 + i1];
  }
}

function isSeventhKind(
  kind: ChordKind,
): kind is "dominant7" | "major7" | "minor7" | "halfDiminished7" {
  return (
    kind === "dominant7" ||
    kind === "major7" ||
    kind === "minor7" ||
    kind === "halfDiminished7"
  );
}

function enumerateVoicings(rootPc: number, kind: ChordKind): number[][] {
  const roots = rootMidiCandidates(rootPc);
  const out: number[][] = [];
  if (isSeventhKind(kind)) {
    const ints = SEVENTH_INTERVALS[kind];
    for (const R of roots) {
      for (let inv = 0; inv < 4; inv++) {
        out.push(fourthChordFromRoot(R, ints, inv as 0 | 1 | 2 | 3));
      }
    }
  } else {
    for (const R of roots) {
      for (let inv = 0; inv < 3; inv++) {
        out.push(triadVoices(R, inv as 0 | 1 | 2, kind));
      }
    }
  }
  return out;
}

/**
 * 与上一和弦做「就近」连接：枚举根音八度 × 转位，最小化
 * `voiceLeadingCost + registerPenalty`（见方案 1）；
 * 无上一和弦时与 {@link chordToMidi} 一致。
 */
export function resolveVoicingNearest(
  prevMidis: number[] | null,
  rootPc: number,
  kind: ChordKind,
): number[] {
  if (prevMidis === null || prevMidis.length === 0) {
    return chordToMidi(rootPc, kind);
  }
  const candidates = enumerateVoicings(rootPc, kind);
  let best: number[] | null = null;
  let bestCost = Infinity;
  for (const cand of candidates) {
    const sorted = [...cand].sort((x, y) => x - y);
    const c = totalVoicingCost(prevMidis, sorted);
    if (c < bestCost) {
      bestCost = c;
      best = sorted;
    } else if (c === bestCost && best !== null) {
      const b0 = sorted[0] ?? 0;
      const bb = best[0] ?? 0;
      if (Math.abs(b0 - REGISTER_CENTER_BASS) < Math.abs(bb - REGISTER_CENTER_BASS)) {
        best = sorted;
      }
    }
  }
  return best ?? chordToMidi(rootPc, kind);
}
