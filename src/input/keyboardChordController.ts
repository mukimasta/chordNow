import { shouldRouteChordKeys } from "../chordKeyboard";
import type { HarmonyModifiers } from "../harmony";
import type { ChordPlaybackSession } from "../core/session";
import {
  CODE_COMMA,
  CODE_PERIOD,
  CODE_SLASH,
  codeToDegree,
  getActiveDegree,
  isDegreeCode,
} from "../keymap";

const keysDown = new Set<string>();
/** 级数键 KeyCode → 按下序号，越大表示越晚按下 */
const degreePressOrder = new Map<string, number>();
let degreePressSeq = 0;

function modifiersFromKeys(): HarmonyModifiers {
  return {
    quote: keysDown.has(CODE_COMMA),
    semicolon: keysDown.has(CODE_PERIOD),
    slash: keysDown.has(CODE_SLASH),
  };
}

function isModifierCode(code: string): boolean {
  return (
    code === CODE_COMMA || code === CODE_PERIOD || code === CODE_SLASH
  );
}

function shouldHandle(ev: KeyboardEvent): boolean {
  return isDegreeCode(ev.code) || isModifierCode(ev.code);
}

function updateHint(onHint: (text: string) => void): void {
  const parts: string[] = [];
  if (keysDown.has(CODE_COMMA)) parts.push(", 属七");
  if (keysDown.has(CODE_SLASH)) parts.push("/ 大七或小七(看调内)");
  if (keysDown.has(CODE_PERIOD)) parts.push(". 大小翻转");
  onHint(parts.length ? parts.join(" · ") : "（无修饰）");
}

export interface KeyboardChordControllerOptions {
  session: ChordPlaybackSession;
  onChordLabel: (label: string) => void;
  onIdleChordLine: () => void;
  onHint: (text: string) => void;
}

/**
 * 键盘 → 级数/修饰 → {@link ChordPlaybackSession}。
 * 将来可并列接入 MIDI、触屏等「输入适配器」，共用同一会话。
 */
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
