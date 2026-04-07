import { shouldRouteChordKeys } from "../chordKeyboard";
import type { HarmonyModifiers } from "../harmony";
import type { ChordPlaybackSession } from "../core/session";
import {
  CODE_COMMA,
  CODE_DIGIT9,
  CODE_KEY_M,
  CODE_KEY_N,
  CODE_KEY_O,
  CODE_KEY_P,
  CODE_PERIOD,
  CODE_QUOTE,
  CODE_SEMICOLON,
  CODE_SHIFT_LEFT,
  CODE_SHIFT_RIGHT,
  CODE_SLASH,
  codeToDegree,
  getActiveDegree,
  getInversionFromKeys,
  hasShiftDown,
  isDegreeCode,
} from "../keymap";

const keysDown = new Set<string>();
const degreePressOrder = new Map<string, number>();
let degreePressSeq = 0;
const inversionPressOrder = new Map<string, number>();
let inversionPressSeq = 0;

/** 物理 `.` ↔ `/` 与逻辑 `slash`（属七）↔ `period`（调内七）交叉映射 */
function modifiersFromKeys(): HarmonyModifiers {
  return {
    shift: hasShiftDown(keysDown),
    period: keysDown.has(CODE_SLASH),
    slash: keysDown.has(CODE_PERIOD),
    comma: keysDown.has(CODE_COMMA),
    digit9: keysDown.has(CODE_DIGIT9),
    sus4: keysDown.has(CODE_QUOTE),
    sus2: keysDown.has(CODE_SEMICOLON),
    dim: keysDown.has(CODE_KEY_N),
    aug: keysDown.has(CODE_KEY_M),
    inversion: getInversionFromKeys(keysDown, inversionPressOrder),
  };
}

function isModifierCode(code: string): boolean {
  return (
    code === CODE_COMMA ||
    code === CODE_PERIOD ||
    code === CODE_SLASH ||
    code === CODE_QUOTE ||
    code === CODE_SEMICOLON ||
    code === CODE_DIGIT9 ||
    code === CODE_KEY_N ||
    code === CODE_KEY_M ||
    code === CODE_KEY_O ||
    code === CODE_KEY_P ||
    code === CODE_SHIFT_LEFT ||
    code === CODE_SHIFT_RIGHT
  );
}

function shouldHandle(ev: KeyboardEvent): boolean {
  return isDegreeCode(ev.code) || isModifierCode(ev.code);
}

function updateHint(onHint: (text: string) => void): void {
  const parts: string[] = [];
  if (hasShiftDown(keysDown)) parts.push("Shift 大小");
  if (keysDown.has(CODE_PERIOD)) parts.push(". 属七");
  if (keysDown.has(CODE_SLASH)) parts.push("/ 调内七");
  if (keysDown.has(CODE_COMMA)) parts.push(", 六和弦");
  if (keysDown.has(CODE_DIGIT9)) parts.push("9 add9");
  if (keysDown.has(CODE_QUOTE)) parts.push("' sus4");
  if (keysDown.has(CODE_SEMICOLON)) parts.push("; sus2");
  if (keysDown.has(CODE_KEY_N)) parts.push("n 减");
  if (keysDown.has(CODE_KEY_M)) parts.push("m 增");
  if (keysDown.has(CODE_KEY_O)) parts.push("o 三音低音");
  if (keysDown.has(CODE_KEY_P)) parts.push("p 五音低音");
  onHint(parts.length ? parts.join(" · ") : "（无修饰）");
}

export interface KeyboardChordControllerOptions {
  session: ChordPlaybackSession;
  onChordLabel: (label: string) => void;
  onIdleChordLine: () => void;
  onHint: (text: string) => void;
}

export function attachKeyboardChordController(
  options: KeyboardChordControllerOptions,
): void {
  const { session, onChordLabel, onIdleChordLine, onHint } = options;

  const playDegree = (degree: number): void => {
    const resolved = session.play(degree, modifiersFromKeys());
    onChordLabel(resolved.label);
  };

  window.addEventListener(
    "keydown",
    (ev) => {
      if (!shouldRouteChordKeys(ev)) return;
      if (!shouldHandle(ev)) return;
      ev.preventDefault();
      if (keysDown.has(ev.code)) return;
      keysDown.add(ev.code);
      const deg = codeToDegree(ev.code);
      if (deg !== null) {
        degreePressSeq += 1;
        degreePressOrder.set(ev.code, degreePressSeq);
      }
      if (ev.code === CODE_KEY_O || ev.code === CODE_KEY_P) {
        inversionPressSeq += 1;
        inversionPressOrder.set(ev.code, inversionPressSeq);
      }
      updateHint(onHint);

      if (deg !== null) {
        playDegree(deg);
      } else if (isModifierCode(ev.code)) {
        const held = getActiveDegree(keysDown, degreePressOrder);
        if (held !== null) playDegree(held);
      }
    },
    true,
  );

  window.addEventListener(
    "keyup",
    (ev) => {
      if (!shouldRouteChordKeys(ev)) return;
      if (!shouldHandle(ev)) return;
      ev.preventDefault();
      keysDown.delete(ev.code);
      if (isDegreeCode(ev.code)) {
        degreePressOrder.delete(ev.code);
      }
      if (ev.code === CODE_KEY_O || ev.code === CODE_KEY_P) {
        inversionPressOrder.delete(ev.code);
      }
      updateHint(onHint);

      if (isDegreeCode(ev.code)) {
        const still = getActiveDegree(keysDown, degreePressOrder);
        if (still !== null) {
          playDegree(still);
        } else {
          session.stop();
          onIdleChordLine();
        }
      } else if (isModifierCode(ev.code)) {
        const held = getActiveDegree(keysDown, degreePressOrder);
        if (held !== null) playDegree(held);
      }
    },
    true,
  );

  updateHint(onHint);
}
