/** 参与级数演奏的物理键（数字 1–8；8 与 1 同为 I 级） */
export const ALL_DEGREE_KEY_CODES: readonly string[] = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
];

/**
 * 钢琴一行黑键 `q w r t y`（相对主音的半音偏移，大调 C 白键布局）。
 * 顺序：1–q–2–w–3–4–r–5–t–6–y–7–8
 */
export const ALL_BLACK_KEY_CODES: readonly string[] = [
  "KeyQ",
  "KeyW",
  "KeyR",
  "KeyT",
  "KeyY",
];

/** 黑键相对主音的半音数（与 `ALL_BLACK_KEY_CODES` 同序） */
const BLACK_KEY_SEMITONE: readonly number[] = [1, 3, 6, 8, 10];

/** 用于标签：`KeyQ` → `q` */
const BLACK_KEY_LABEL: Record<string, string> = {
  KeyQ: "q",
  KeyW: "w",
  KeyR: "r",
  KeyT: "t",
  KeyY: "y",
};

export function isBlackKeyCode(code: string): boolean {
  return ALL_BLACK_KEY_CODES.includes(code);
}

/** 黑键 → 相对主音的半音偏移；非黑键返回 null */
export function codeToBlackKeySemitone(code: string): number | null {
  const i = ALL_BLACK_KEY_CODES.indexOf(code);
  if (i < 0) return null;
  return BLACK_KEY_SEMITONE[i]!;
}

export function blackKeyCodeToLabel(code: string): string {
  return BLACK_KEY_LABEL[code] ?? code;
}

/**
 * 多枚黑键同时按住时，取「最近按下」的那一枚。
 */
export function getActiveBlackKey(
  keysDown: ReadonlySet<string>,
  pressOrder: ReadonlyMap<string, number>,
): string | null {
  let bestCode: string | null = null;
  let bestRank = -1;
  for (const code of ALL_BLACK_KEY_CODES) {
    if (!keysDown.has(code)) continue;
    const r = pressOrder.get(code) ?? 0;
    if (r > bestRank) {
      bestRank = r;
      bestCode = code;
    }
  }
  return bestCode;
}

export const CODE_COMMA = "Comma";
export const CODE_PERIOD = "Period";
export const CODE_SLASH = "Slash";
export const CODE_QUOTE = "Quote";
export const CODE_SEMICOLON = "Semicolon";
export const CODE_DIGIT9 = "Digit9";
export const CODE_KEY_N = "KeyN";
export const CODE_KEY_M = "KeyM";
export const CODE_KEY_O = "KeyO";
export const CODE_KEY_P = "KeyP";
export const CODE_SHIFT_LEFT = "ShiftLeft";
export const CODE_SHIFT_RIGHT = "ShiftRight";

export function hasShiftDown(keysDown: ReadonlySet<string>): boolean {
  return keysDown.has(CODE_SHIFT_LEFT) || keysDown.has(CODE_SHIFT_RIGHT);
}

/**
 * `o`→第一转位（三音在低音），`p`→第二转位（五音在低音）；同时按住时后按者优先。
 */
export function getInversionFromKeys(
  keysDown: ReadonlySet<string>,
  pressOrder: ReadonlyMap<string, number>,
): 0 | 1 | 2 {
  const o = keysDown.has(CODE_KEY_O);
  const p = keysDown.has(CODE_KEY_P);
  if (!o && !p) return 0;
  if (o && !p) return 1;
  if (!o && p) return 2;
  const rO = pressOrder.get(CODE_KEY_O) ?? 0;
  const rP = pressOrder.get(CODE_KEY_P) ?? 0;
  return rP >= rO ? 2 : 1;
}

export function codeToDegree(code: string): number | null {
  switch (code) {
    case "Digit1":
    case "Digit8":
      return 1;
    case "Digit2":
      return 2;
    case "Digit3":
      return 3;
    case "Digit4":
      return 4;
    case "Digit5":
      return 5;
    case "Digit6":
      return 6;
    case "Digit7":
      return 7;
    default:
      return null;
  }
}

export function isDegreeCode(code: string): boolean {
  return codeToDegree(code) !== null;
}

export function getHeldDegree(keysDown: ReadonlySet<string>): number | null {
  for (const code of ALL_DEGREE_KEY_CODES) {
    if (keysDown.has(code)) {
      return codeToDegree(code);
    }
  }
  return null;
}

/**
 * 多枚级数键同时按住时，取「最近按下」的那一枚（pressOrder 越大越新）。
 */
export function getActiveDegree(
  keysDown: ReadonlySet<string>,
  pressOrder: ReadonlyMap<string, number>,
): number | null {
  let bestCode: string | null = null;
  let bestRank = -1;
  for (const code of ALL_DEGREE_KEY_CODES) {
    if (!keysDown.has(code)) continue;
    const r = pressOrder.get(code) ?? 0;
    if (r > bestRank) {
      bestRank = r;
      bestCode = code;
    }
  }
  return bestCode === null ? null : codeToDegree(bestCode);
}
