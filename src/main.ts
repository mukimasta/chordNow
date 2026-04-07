import "./style.css";
import { ChordPlaybackSession, Registry, type ChordResolver, type VoicingEngine } from "./core";
import { attachKeyboardChordController } from "./input/keyboardChordController";
import { MAJOR_KEYS } from "./harmony";
import { majorDiatonicResolver } from "./resolvers/majorDiatonic";
import { nearestVoicingEngine } from "./voicing/nearestVoicing";
import { rootUpperOpenVoicingEngine } from "./voicing/rootUpperOpenVoicing";
import { ChordVoice } from "./voice";

const resolverRegistry = new Registry<ChordResolver>();
resolverRegistry.register(majorDiatonicResolver);

const voicingRegistry = new Registry<VoicingEngine>();
voicingRegistry.register(nearestVoicingEngine);
voicingRegistry.register(rootUpperOpenVoicingEngine);

const voice = new ChordVoice();
const session = new ChordPlaybackSession(
  resolverRegistry.get(majorDiatonicResolver.id)!,
  voicingRegistry.get(rootUpperOpenVoicingEngine.id)!,
  voice,
);

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
      <p class="voice-line" id="voiceLine">声部：根音 D2–A3；上层 B3–C5（三和弦为根+三+五，根在上层重复），跨度≤12；上层开放 + 就近；根音不做声部连接</p>
    </section>
    <section class="keys-hint" aria-labelledby="keys-hint-title">
      <h2 class="keys-hint__title" id="keys-hint-title">键盘说明</h2>

      <div class="keymap-card keymap-card--degrees">
        <div class="keymap-card__head">
          <span class="keymap-card__label">级数</span>
          <p class="keymap-card__lead">
            数字键 <kbd class="kbd-inline">1</kbd>–<kbd class="kbd-inline">7</kbd> 对应 <strong>I</strong>–<strong>VII</strong> 级；<kbd class="kbd-inline">1</kbd> 与 <kbd class="kbd-inline">8</kbd> 均为 <strong>I</strong> 级（完全等价）。
          </p>
        </div>
        <div class="key-strip" role="presentation">
          <div class="key-strip__cell key-strip__cell--i">
            <kbd class="kbd-key">1</kbd>
            <span class="key-strip__roman">I</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">2</kbd>
            <span class="key-strip__roman">II</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">3</kbd>
            <span class="key-strip__roman">III</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">4</kbd>
            <span class="key-strip__roman">IV</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">5</kbd>
            <span class="key-strip__roman">V</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">6</kbd>
            <span class="key-strip__roman">VI</span>
          </div>
          <div class="key-strip__cell">
            <kbd class="kbd-key">7</kbd>
            <span class="key-strip__roman">VII</span>
          </div>
          <div class="key-strip__cell key-strip__cell--i">
            <kbd class="kbd-key">8</kbd>
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
  session.setTonic(Number(keySelect.value));
  document.body.focus();
});

const chordLine = document.querySelector<HTMLParagraphElement>("#chordLine")!;

attachKeyboardChordController({
  session,
  onChordLabel: (label) => {
    chordLine.textContent = label;
  },
  onIdleChordLine: () => {
    chordLine.textContent = "—";
  },
  onHint: (text) => {
    document.querySelector<HTMLParagraphElement>("#hintLine")!.textContent =
      text;
  },
});

document.body.focus();
window.addEventListener("click", () => {
  void session.ensureAudio();
});
