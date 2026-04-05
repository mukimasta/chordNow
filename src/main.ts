import "./style.css";
import { shouldRouteChordKeys } from "./chordKeyboard";
import { MAJOR_KEYS, resolveChord, type HarmonyModifiers } from "./harmony";
import { resolveVoicingNearest } from "./pitches";
import {
  CODE_COMMA,
  CODE_PERIOD,
  CODE_SLASH,
  codeToDegree,
  getActiveDegree,
  isDegreeCode,
} from "./keymap";
import { ChordVoice } from "./voice";

const keysDown = new Set<string>();
/** 级数键 KeyCode → 按下序号，越大表示越晚按下（用于多键同时按住时选「当前」级数） */
const degreePressOrder = new Map<string, number>();
let degreePressSeq = 0;
const voice = new ChordVoice();

let keyTonicPc = 0;
/** 上一发声和弦的 MIDI，用于就近声部连接 */
let lastVoicing: number[] | null = null;

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <main class="board">
    <header class="header">
      <h1>ChordBoard</h1>
      <label class="key-select">
        调性（大调）
        <select id="keySelect" aria-label="调性"></select>
      </label>
    </header>
    <section class="display" aria-live="polite">
      <p class="chord-line" id="chordLine">—</p>
      <p class="hint-line" id="hintLine"></p>
      <p class="voice-line" id="voiceLine">声部：就近连接 + 参考音区（减轻越弹越低）；首和弦默认在较低音区</p>
    </section>
    <section class="keys-hint">
      <h2>键盘</h2>
      <ul>
        <li><kbd>A</kbd> 与 <kbd>K</kbd> 同为 <strong>I</strong> 级（完全等价）；<kbd>S</kbd>–<kbd>J</kbd>（缺 <kbd>E</kbd>）为 <strong>II – VII</strong> 级</li>
        <li><kbd>/</kbd> <strong>大七或小七</strong>：调内原为大三则 maj7，原为小三则 m7，vii° 则半减七 ø。要先翻转大小再套七，请<strong>同时按住</strong> <kbd>.</kbd> 与 <kbd>/</kbd>。<kbd>,</kbd> <strong>属七</strong>；仅三和弦时 <kbd>.</kbd> 同根大/小翻转。优先级：<kbd>,</kbd> &gt; <kbd>/</kbd>。</li>
      </ul>
    </section>
  </main>
`;

const keySelect = document.querySelector<HTMLSelectElement>("#keySelect")!;
for (const k of MAJOR_KEYS) {
  const opt = document.createElement("option");
  opt.value = String(k.tonicPc);
  opt.textContent = k.label;
  keySelect.appendChild(opt);
}
keySelect.value = "0";
keySelect.addEventListener("change", () => {
  keyTonicPc = Number(keySelect.value);
  lastVoicing = null;
  document.body.focus();
});

const chordLine = document.querySelector<HTMLParagraphElement>("#chordLine")!;
const hintLine = document.querySelector<HTMLParagraphElement>("#hintLine")!;

function updateHint(): void {
  const comma = keysDown.has(CODE_COMMA);
  const period = keysDown.has(CODE_PERIOD);
  const slash = keysDown.has(CODE_SLASH);
  const parts: string[] = [];
  if (comma) parts.push(", 属七");
  if (slash) parts.push("/ 大七或小七(看调内)");
  if (period) parts.push(". 大小翻转");
  hintLine.textContent = parts.length ? parts.join(" · ") : "（无修饰）";
}

function modifiersForPlay(): HarmonyModifiers {
  return {
    quote: keysDown.has(CODE_COMMA),
    semicolon: keysDown.has(CODE_PERIOD),
    slash: keysDown.has(CODE_SLASH),
  };
}

function playDegree(degree: number): void {
  const mods = modifiersForPlay();
  const resolved = resolveChord(keyTonicPc, degree, mods);
  const midis = resolveVoicingNearest(lastVoicing, resolved.rootPc, resolved.kind);
  lastVoicing = midis;
  void voice.ensureRunning().then(() => {
    voice.playMidi(midis);
    chordLine.textContent = resolved.label;
  });
}

function isModifierCode(code: string): boolean {
  return (
    code === CODE_COMMA ||
    code === CODE_PERIOD ||
    code === CODE_SLASH
  );
}

function shouldHandle(ev: KeyboardEvent): boolean {
  return isDegreeCode(ev.code) || isModifierCode(ev.code);
}

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
    updateHint();

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
    updateHint();

    if (isDegreeCode(ev.code)) {
      const still = getActiveDegree(keysDown, degreePressOrder);
      if (still !== null) {
        playDegree(still);
      } else {
        voice.stop();
        chordLine.textContent = "—";
      }
    } else if (isModifierCode(ev.code)) {
      const held = getActiveDegree(keysDown, degreePressOrder);
      if (held !== null) playDegree(held);
    }
  },
  true,
);

document.body.focus();
window.addEventListener("click", () => {
  void voice.ensureRunning();
});

updateHint();
