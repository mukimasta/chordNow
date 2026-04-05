/** Pitch class 0=C … 11=B */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ChordKind =
  | "majorTriad"
  | "minorTriad"
  | "diminishedTriad"
  | "dominant7"
  | "major7"
  | "minor7"
  | "halfDiminished7";

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

export interface HarmonyModifiers {
  /** 同根大三/小三翻转（物理键为 `.`） */
  semicolon: boolean;
  /** 属七（物理键为 `,`） */
  quote: boolean;
  /** `/` 大七或小七；与 `.` 同按时先翻转再套七 */
  slash: boolean;
}

export interface ResolvedChord {
  rootPc: PitchClass;
  kind: ChordKind;
  /** Roman + chord symbol, e.g. "V — G", "ii — Dm" */
  label: string;
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
    case "dominant7":
      return `${name}7`;
    case "major7":
      return `${name}maj7`;
    case "minor7":
      return `${name}m7`;
    case "halfDiminished7":
      return `${name}ø`;
  }
}

/** Roman numeral for scale degree in major (diatonic step label) */
const ROMAN_DEGREE = ["I", "ii", "iii", "IV", "V", "vi", "vii°"] as const;

function romanNumeral(degree: number): string {
  return ROMAN_DEGREE[degree - 1];
}

/** 调内三和弦 + 可选 `,` 翻转（与原先仅按 `,` 时一致） */
function effectiveTriadKind(diatonic: ChordKind, comma: boolean): ChordKind {
  if (!comma) return diatonic;
  if (diatonic === "majorTriad") return "minorTriad";
  if (diatonic === "minorTriad") return "majorTriad";
  return "majorTriad"; // vii° + , → 同根大三
}

/**
 * `,` 属七 > `/` 大小七 > `.` 仅三和弦翻转。
 * `/`：在「有效三和弦」上套七——大→maj7，小→m7，减→半减七（ø）。
 * `.`+`/`：先 `.` 翻转再按上式。
 */
export function resolveChord(
  keyPc: number,
  degree: number,
  mods: HarmonyModifiers,
): ResolvedChord {
  const rootPc = degreeRootPc(keyPc, degree);
  const diatonic = diatonicTriadKindForDegree(degree);
  const roman = romanNumeral(degree);

  if (mods.quote) {
    const kind: ChordKind = "dominant7";
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label };
  }

  if (mods.slash) {
    const eff = effectiveTriadKind(diatonic, mods.semicolon);
    let kind: ChordKind;
    if (eff === "majorTriad") kind = "major7";
    else if (eff === "minorTriad") kind = "minor7";
    else kind = "halfDiminished7";

    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label };
  }

  if (mods.semicolon && !mods.quote && !mods.slash) {
    const kind = effectiveTriadKind(diatonic, true);
    const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
    return { rootPc, kind, label };
  }

  const kind = diatonic;
  const label = `${roman} — ${chordKindToSymbol(rootPc, kind)}`;
  return { rootPc, kind, label };
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
