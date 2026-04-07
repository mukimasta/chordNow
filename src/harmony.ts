/** Pitch class 0=C … 11=B */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ChordKind =
  | "majorTriad"
  | "minorTriad"
  | "diminishedTriad"
  | "augmentedTriad"
  | "major6"
  | "minor6"
  | "dominant7"
  | "major7"
  | "minor7"
  | "halfDiminished7"
  | "diminished7"
  | "major9"
  | "minor9"
  | "dominant9"
  | "sus2Triad"
  | "sus4Triad"
  | "majorAdd9"
  | "minorAdd9"
  | "diminishedAdd9";

export type DiatonicTriadKind = "major" | "minor" | "diminished";

const MAJOR_SCALE_INTERVALS: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** I–VI diatonic triad quality in major (degree 1–6); VII handled separately */
const DIATONIC_TRIAD: readonly DiatonicTriadKind[] = [
  "major",
  "minor",
  "minor",
  "major",
  "major",
  "minor",
];

const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export function pitchClassToName(pc: number): string {
  return SHARP_NAMES[((pc % 12) + 12) % 12];
}

/** Major-key tonic pitch class → natural pitch class for scale degree 1–7 */
export function degreeRootPc(keyPc: number, degree: number): PitchClass {
  if (degree < 1 || degree > 7) throw new RangeError("degree 1–7");
  const k = ((keyPc % 12) + 12) % 12;
  const interval = MAJOR_SCALE_INTERVALS[degree - 1];
  return ((k + interval) % 12) as PitchClass;
}

function diatonicTriadKindForDegree(degree: number): ChordKind {
  if (degree === 7) return "diminishedTriad";
  const d = DIATONIC_TRIAD[degree - 1];
  if (d === "major") return "majorTriad";
  if (d === "minor") return "minorTriad";
  return "diminishedTriad";
}

/** 调内三和弦 + Shift：大↔小；vii°→同根大三 */
export function effectiveTriadKind(diatonic: ChordKind, shift: boolean): ChordKind {
  if (!shift) return diatonic;
  if (diatonic === "majorTriad") return "minorTriad";
  if (diatonic === "minorTriad") return "majorTriad";
  if (diatonic === "diminishedTriad") return "majorTriad";
  return diatonic;
}

/** 在当前级数上叠调内七度（`.`），依级数 + 有效三和弦性质 */
function diatonicSeventhKind(degree: number, eff: ChordKind): ChordKind {
  if (eff === "diminishedTriad") return "halfDiminished7";
  if (degree === 5 && eff === "majorTriad") return "dominant7";
  if (eff === "majorTriad") return "major7";
  if (eff === "minorTriad") return "minor7";
  return "halfDiminished7";
}

function sixthFromTriad(eff: ChordKind): ChordKind {
  if (eff === "majorTriad") return "major6";
  if (eff === "minorTriad") return "minor6";
  if (eff === "diminishedTriad") return "minor6";
  return "major6";
}

function ninthFromSeventh(base: ChordKind): ChordKind {
  if (base === "dominant7") return "dominant9";
  if (base === "major7") return "major9";
  if (base === "minor7") return "minor9";
  return "major9";
}

function add9FromTriad(eff: ChordKind): ChordKind {
  if (eff === "majorTriad") return "majorAdd9";
  if (eff === "minorTriad") return "minorAdd9";
  return "diminishedAdd9";
}

export interface HarmonyModifiers {
  shift: boolean;
  /** 调内七和弦（键盘上由物理 `/` 触发；见 `keyboardChordController` 映射） */
  period: boolean;
  /** 属七及 n/Shift 组合（键盘上由物理 `.` 触发） */
  slash: boolean;
  /** `,` 六和弦 */
  comma: boolean;
  digit9: boolean;
  sus4: boolean;
  sus2: boolean;
  dim: boolean;
  aug: boolean;
  inversion: 0 | 1 | 2;
}

export interface ResolvedChord {
  rootPc: PitchClass;
  kind: ChordKind;
  /** Roman + chord symbol */
  label: string;
  inversion: 0 | 1 | 2;
}

function chordKindToSymbol(rootPc: number, kind: ChordKind): string {
  const name = pitchClassToName(rootPc);
  switch (kind) {
    case "majorTriad":
      return name;
    case "minorTriad":
      return `${name}m`;
    case "diminishedTriad":
      return `${name}°`;
    case "augmentedTriad":
      return `${name}+`;
    case "major6":
      return `${name}6`;
    case "minor6":
      return `${name}m6`;
    case "dominant7":
      return `${name}7`;
    case "major7":
      return `${name}maj7`;
    case "minor7":
      return `${name}m7`;
    case "halfDiminished7":
      return `${name}ø`;
    case "diminished7":
      return `${name}dim7`;
    case "major9":
      return `${name}maj9`;
    case "minor9":
      return `${name}m9`;
    case "dominant9":
      return `${name}9`;
    case "sus2Triad":
      return `${name}sus2`;
    case "sus4Triad":
      return `${name}sus4`;
    case "majorAdd9":
      return `${name}add9`;
    case "minorAdd9":
      return `${name}madd9`;
    case "diminishedAdd9":
      return `${name}°add9`;
  }
}

const ROMAN_DEGREE = ["I", "ii", "iii", "IV", "V", "vi", "vii°"] as const;

function romanNumeral(degree: number): string {
  return ROMAN_DEGREE[degree - 1];
}

/**
 * 修饰键优先级见 `docs/KEYBOARD.md`。
 */
export function resolveChord(
  keyPc: number,
  degree: number,
  mods: HarmonyModifiers,
): ResolvedChord {
  const rootPc = degreeRootPc(keyPc, degree);
  const diatonic = diatonicTriadKindForDegree(degree);
  const roman = romanNumeral(degree);
  const inv = mods.inversion;
  const eff = effectiveTriadKind(diatonic, mods.shift);

  if (mods.dim && mods.slash) {
    const kind: ChordKind = "diminished7";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.shift && mods.slash && degree === 5) {
    const kind: ChordKind = "minor7";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.dim && mods.period && !mods.slash) {
    const kind: ChordKind =
      degree === 7 ? "halfDiminished7" : "diminished7";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.period && mods.digit9) {
    const base7 = diatonicSeventhKind(degree, eff);
    const kind = ninthFromSeventh(base7);
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  /** `/`：属七（大小七，根音为当前级数根音） */
  if (mods.slash) {
    const kind: ChordKind = "dominant7";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.period) {
    const kind = diatonicSeventhKind(degree, eff);
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.comma) {
    const kind = sixthFromTriad(eff);
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.dim) {
    const kind: ChordKind = "diminishedTriad";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.aug) {
    const kind: ChordKind = "augmentedTriad";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.sus4) {
    const kind: ChordKind = "sus4Triad";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.sus2) {
    const kind: ChordKind = "sus2Triad";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  if (mods.digit9) {
    const kind = add9FromTriad(eff);
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label, inversion: inv };
  }

  const kind = eff;
  const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
  return { rootPc, kind, label, inversion: inv };
}

/**
 * 无调内级数时，在「大三和弦为默认」的框架上叠七度（与 `resolveChord` 的 `/` 分支不同：此处无 V 属七特例）。
 */
function chromaticSeventhFromTriad(eff: ChordKind): ChordKind {
  if (eff === "diminishedTriad") return "halfDiminished7";
  if (eff === "majorTriad") return "major7";
  if (eff === "minorTriad") return "minor7";
  return "halfDiminished7";
}

/**
 * 钢琴黑键根相对主音的半音偏移（1/3/6/8/10）→ 大调中常见的**双罗马**标记（升音级 / 降音级 等价根）。
 */
export function blackKeyRomanLabel(semitoneOffsetFromTonic: number): string {
  const o = (((semitoneOffsetFromTonic % 12) + 12) % 12) as number;
  switch (o) {
    case 1:
      return "#I / bII";
    case 3:
      return "#II / bIII";
    case 6:
      return "#IV / bV";
    case 8:
      return "#V / bVI";
    case 10:
      return "#VI / bVII";
    default:
      return "变音根";
  }
}

/**
 * 钢琴一行黑键（`q` `w` `r` `t` `y`）：根音为 `rootPc`，默认从大三和弦出发，修饰键优先级与 {@link resolveChord} 对齐；标签左侧为 {@link blackKeyRomanLabel}（如 `#II / bIII`）。
 */
export function resolveChordAtRoot(
  keyPc: number,
  rootPc: PitchClass,
  mods: HarmonyModifiers,
  semitoneOffsetFromTonic: number,
): ResolvedChord {
  const rootPcNorm = (((rootPc % 12) + 12) % 12) as PitchClass;
  const inv = mods.inversion;
  const diatonicBase: ChordKind = "majorTriad";
  const eff = effectiveTriadKind(diatonicBase, mods.shift);
  const prefix = blackKeyRomanLabel(semitoneOffsetFromTonic);

  if (mods.dim && mods.slash) {
    const kind: ChordKind = "diminished7";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.shift && mods.slash && rootPcNorm === degreeRootPc(keyPc, 5)) {
    const kind: ChordKind = "minor7";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.dim && mods.period && !mods.slash) {
    const kind: ChordKind = "diminished7";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.period && mods.digit9) {
    const base7 = chromaticSeventhFromTriad(eff);
    const kind = ninthFromSeventh(base7);
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.slash) {
    const kind: ChordKind = "dominant7";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.period) {
    const kind = chromaticSeventhFromTriad(eff);
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.comma) {
    const kind = sixthFromTriad(eff);
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.dim) {
    const kind: ChordKind = "diminishedTriad";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.aug) {
    const kind: ChordKind = "augmentedTriad";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.sus4) {
    const kind: ChordKind = "sus4Triad";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.sus2) {
    const kind: ChordKind = "sus2Triad";
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  if (mods.digit9) {
    const kind = add9FromTriad(eff);
    const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
    return { rootPc: rootPcNorm, kind, label, inversion: inv };
  }

  const kind = eff;
  const label = `${prefix} — ${chordKindToSymbol(rootPcNorm, kind)}`;
  return { rootPc: rootPcNorm, kind, label, inversion: inv };
}

/** 12 major keys: value = tonic pitch class */
export const MAJOR_KEYS: { label: string; tonicPc: PitchClass }[] = [
  { label: "C", tonicPc: 0 },
  { label: "C# / Db", tonicPc: 1 },
  { label: "D", tonicPc: 2 },
  { label: "D# / Eb", tonicPc: 3 },
  { label: "E", tonicPc: 4 },
  { label: "F", tonicPc: 5 },
  { label: "F# / Gb", tonicPc: 6 },
  { label: "G", tonicPc: 7 },
  { label: "G# / Ab", tonicPc: 8 },
  { label: "A", tonicPc: 9 },
  { label: "A# / Bb", tonicPc: 10 },
  { label: "B", tonicPc: 11 },
];
