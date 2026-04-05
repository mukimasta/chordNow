/** 参与级数演奏的物理键（含与 I 级完全等价的 KeyK） */
export const ALL_DEGREE_KEY_CODES: readonly string[] = [
  "KeyA",
  "KeyK",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyJ",
];

/** `,` 键：属七（与乐理里 `quote` 对应） */
export const CODE_COMMA = "Comma";
/** `.` 键：同根大/小翻转（与乐理里 `semicolon` 对应） */
export const CODE_PERIOD = "Period";
/** `/` 大七/小七（依调内大/小） */
export const CODE_SLASH = "Slash";

export function codeToDegree(code: string): number | null {
  switch (code) {
    case "KeyA":
    case "KeyK":
      return 1;
    case "KeyS":
      return 2;
    case "KeyD":
      return 3;
    case "KeyF":
      return 4;
    case "KeyG":
      return 5;
    case "KeyH":
      return 6;
    case "KeyJ":
      return 7;
    default:
      return null;
  }
}

export function isDegreeCode(code: string): boolean {
  return codeToDegree(code) !== null;
}

/** If any degree key is held, return its degree 1–7（按 ALL 列表顺序取第一个按住的键） */
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
