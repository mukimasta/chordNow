import type { ChordKind } from "./harmony";

const TRIAD_INTERVALS: Record<
  | "majorTriad"
  | "minorTriad"
  | "diminishedTriad"
  | "augmentedTriad"
  | "sus2Triad"
  | "sus4Triad",
  readonly number[]
> = {
  majorTriad: [0, 4, 7],
  minorTriad: [0, 3, 7],
  diminishedTriad: [0, 3, 6],
  augmentedTriad: [0, 4, 8],
  sus2Triad: [0, 2, 7],
  sus4Triad: [0, 5, 7],
};

const FOUR_NOTE_INTERVALS: Record<
  | "major6"
  | "minor6"
  | "dominant7"
  | "major7"
  | "minor7"
  | "halfDiminished7"
  | "diminished7",
  readonly number[]
> = {
  major6: [0, 4, 7, 9],
  minor6: [0, 3, 7, 9],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  halfDiminished7: [0, 3, 6, 10],
  diminished7: [0, 3, 6, 9],
};

const FIVE_NOTE_INTERVALS: Record<
  "major9" | "minor9" | "dominant9" | "majorAdd9" | "minorAdd9" | "diminishedAdd9",
  readonly number[]
> = {
  major9: [0, 4, 7, 11, 14],
  minor9: [0, 3, 7, 10, 14],
  dominant9: [0, 4, 7, 10, 14],
  majorAdd9: [0, 4, 7, 14],
  minorAdd9: [0, 3, 7, 14],
  diminishedAdd9: [0, 3, 6, 14],
};

const DEFAULT_ROOT_OCTAVE_OFFSET = 48;
const REGISTER_CENTER_BASS = 50;
const REGISTER_WEIGHT = 0.022;

/** Root pitch class 0–11 → MIDI note number in octave 3（C3=48 … B3=59） */
export function rootPcToMidi(rootPc: number): number {
  const pc = ((rootPc % 12) + 12) % 12;
  return DEFAULT_ROOT_OCTAVE_OFFSET + pc;
}

/** 低音依次上移八度，用于任意长度和弦转位 */
function invertChordNotes(notes: number[], inv: number): number[] {
  let n = [...notes].sort((a, b) => a - b);
  for (let i = 0; i < inv; i++) {
    const low = n.shift()!;
    n.push(low + 12);
    n.sort((a, b) => a - b);
  }
  return n;
}

function chordFromRoot(
  rootMidi: number,
  intervals: readonly number[],
  inv: number,
): number[] {
  const notes = intervals.map((i) => rootMidi + i);
  return invertChordNotes(notes, inv);
}

function triadVoices(
  rootMidi: number,
  inversion: 0 | 1 | 2,
  kind: keyof typeof TRIAD_INTERVALS,
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

function isTriadKind(
  kind: ChordKind,
): kind is keyof typeof TRIAD_INTERVALS {
  return kind in TRIAD_INTERVALS;
}

function isFourNoteKind(
  kind: ChordKind,
): kind is keyof typeof FOUR_NOTE_INTERVALS {
  return kind in FOUR_NOTE_INTERVALS;
}

function isFiveNoteKind(
  kind: ChordKind,
): kind is keyof typeof FIVE_NOTE_INTERVALS {
  return kind in FIVE_NOTE_INTERVALS;
}

export function chordToMidi(
  rootPc: number,
  kind: ChordKind,
  inversion: 0 | 1 | 2 = 0,
): number[] {
  const root = rootPcToMidi(rootPc);
  if (isTriadKind(kind)) {
    return triadVoices(root, inversion, kind);
  }
  if (isFourNoteKind(kind)) {
    const ints = FOUR_NOTE_INTERVALS[kind];
    const maxInv = 3;
    const inv = Math.min(inversion, maxInv) as 0 | 1 | 2 | 3;
    return chordFromRoot(root, ints, inv);
  }
  if (isFiveNoteKind(kind)) {
    const ints = FIVE_NOTE_INTERVALS[kind];
    const maxInv = 4;
    const inv = Math.min(inversion, maxInv);
    return chordFromRoot(root, ints, inv);
  }
  return triadVoices(root, inversion, "majorTriad");
}

export function voiceLeadingCost(prevMidis: number[], nextMidis: number[]): number {
  const a = [...prevMidis].sort((x, y) => x - y);
  const b = [...nextMidis].sort((x, y) => x - y);
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s;
}

export function registerPenalty(midis: number[]): number {
  const sorted = [...midis].sort((x, y) => x - y);
  const bass = sorted[0] ?? REGISTER_CENTER_BASS;
  const d = bass - REGISTER_CENTER_BASS;
  return REGISTER_WEIGHT * d * d;
}

export function totalVoicingCost(
  prevMidis: number[],
  candidateMidis: number[],
): number {
  return voiceLeadingCost(prevMidis, candidateMidis) + registerPenalty(candidateMidis);
}

function rootMidiCandidates(rootPc: number): number[] {
  const pc = ((rootPc % 12) + 12) % 12;
  const out: number[] = [];
  for (let m = 36; m <= 78; m++) {
    if (((m % 12) + 12) % 12 === pc) out.push(m);
  }
  return out;
}

function enumerateVoicings(
  rootPc: number,
  kind: ChordKind,
  inversion?: 0 | 1 | 2,
): number[][] {
  const roots = rootMidiCandidates(rootPc);
  const out: number[][] = [];
  if (isTriadKind(kind)) {
    for (const R of roots) {
      for (let inv = 0; inv < 3; inv++) {
        if (inversion !== undefined && inv !== inversion) continue;
        out.push(triadVoices(R, inv as 0 | 1 | 2, kind));
      }
    }
  } else if (isFourNoteKind(kind)) {
    const ints = FOUR_NOTE_INTERVALS[kind];
    for (const R of roots) {
      for (let inv = 0; inv < 4; inv++) {
        if (inversion !== undefined && inv !== inversion) continue;
        out.push(chordFromRoot(R, ints, inv));
      }
    }
  } else if (isFiveNoteKind(kind)) {
    const ints = FIVE_NOTE_INTERVALS[kind];
    for (const R of roots) {
      for (let inv = 0; inv < 5; inv++) {
        if (inversion !== undefined && inv !== inversion) continue;
        out.push(chordFromRoot(R, ints, inv));
      }
    }
  }
  return out;
}

/**
 * 与上一和弦做「就近」连接：枚举根音八度 × 转位，最小化
 * `voiceLeadingCost + registerPenalty`；
 * 无上一和弦时与 {@link chordToMidi} 一致。
 */
export function resolveVoicingNearest(
  prevMidis: number[] | null,
  rootPc: number,
  kind: ChordKind,
  inversion: 0 | 1 | 2 = 0,
): number[] {
  if (prevMidis === null || prevMidis.length === 0) {
    return chordToMidi(rootPc, kind, inversion);
  }
  const candidates = enumerateVoicings(rootPc, kind, inversion);
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
  return best ?? chordToMidi(rootPc, kind, inversion);
}
