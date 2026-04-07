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
