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
    <section class="keys-hint" aria-labelledby="keys-hint-title">
      <h2 class="keys-hint__title" id="keys-hint-title">键盘说明</h2>

      <div class="keymap-card keymap-card--degrees">
        <div class="keymap-card__head">
          <span class="keymap-card__label">级数</span>
          <p class="keymap-card__lead">
            与物理键盘主行一致：<kbd class="kbd-inline">A</kbd> <kbd class="kbd-inline">S</kbd> … <kbd class="kbd-inline">J</kbd> <kbd class="kbd-inline">K</kbd>；最左 <kbd class="kbd-inline">A</kbd> 与最右 <kbd class="kbd-inline">K</kbd> 均为 <strong>I</strong>，中间为 <strong>II → VII</strong>。
          </p>
        </div>
        <div class="key-strip" role="presentation">
          <div class="key-strip__cell key-strip__cell--i">
            <kbd class="kbd-key">A</kbd>
            <span class="key-strip__roman">I</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">S</kbd>
            <span class="key-strip__roman">II</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">D</kbd>
            <span class="key-strip__roman">III</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">F</kbd>
            <span class="key-strip__roman">IV</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">G</kbd>
            <span class="key-strip__roman">V</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">H</kbd>
            <span class="key-strip__roman">VI</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">J</kbd>
            <span class="key-strip__roman">VII</span>
          </div>
          <div class="key-strip__cell key-strip__cell--i">
            <kbd class="kbd-key">K</kbd>
            <span class="key-strip__roman">I</span>
          </div>
        </div>
      </div>

      <div class="keymap-card keymap-card--mods">
        <div class="keymap-card__head">
          <span class="keymap-card__label">修饰键</span>
          <p class="keymap-card__lead">与级数键同时生效；按住级数时再按修饰会立刻重算和弦。</p>
        </div>
        <div class="modifier-grid">
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">,</kbd>
            <span class="modifier-tile__name">属七</span>
            <span class="modifier-tile__note">V<sup>7</sup> 等</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">/</kbd>
            <span class="modifier-tile__name">大七 / 小七</span>
            <span class="modifier-tile__note">按调内三和弦性质：大 → maj7，小 → m7；vii° → ø</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">.</kbd>
            <span class="modifier-tile__name">同根大 / 小</span>
            <span class="modifier-tile__note">仅三和弦时翻转；与 <kbd class="kbd-inline">/</kbd> 同按则先翻转再套七度</span>
          </div>
        </div>
        <div class="keymap-priority">
          <span class="keymap-priority__label">优先级</span>
          <span class="keymap-priority__value"><kbd class="kbd-inline">,</kbd> 属七 ＞ <kbd class="kbd-inline">/</kbd> 大七/小七</span>
        </div>
      </div>
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
