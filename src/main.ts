import "./style.css";
import { ChordPlaybackSession, Registry, type ChordResolver, type VoicingEngine } from "./core";
import { attachKeyboardChordController } from "./input/keyboardChordController";
import { MAJOR_KEYS } from "./harmony";
import { majorDiatonicResolver } from "./resolvers/majorDiatonic";
import { nearestVoicingEngine } from "./voicing/nearestVoicing";
import { rootUpperOpenVoicingEngine } from "./voicing/rootUpperOpenVoicing";
import { isTimbreId, TIMBRE_OPTIONS } from "./timbres";
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
      <h1>ChordNow</h1>
      <label class="key-select">
        调性（大调）
        <select id="keySelect" class="chrome-select" aria-label="调性"></select>
      </label>
      <label class="key-select">
        音色
        <select id="timbreSelect" class="chrome-select" aria-label="音色"></select>
      </label>
    </header>
    <section class="display" aria-live="polite">
      <p class="chord-line" id="chordLine">—</p>
      <p class="hint-line" id="hintLine"></p>
      <p class="voice-line" id="voiceLine">声部：低音 D2–A3；上层 B3–C5；转位（o / p）仅改最低音，上层就近与开放规则不变</p>
    </section>
    <section class="score-sheet" aria-labelledby="score-sheet-title">
      <h2 class="score-sheet__title" id="score-sheet-title">琴谱 · 卡农进行</h2>
      <p class="score-sheet__lead">
        帕赫贝尔《卡农》低音固定音型（大调调内）；一音一级，按下列<strong>数字键</strong>顺序弹奏即可跟进行。
      </p>
      <div class="canon-progression" role="group" aria-label="卡农进行：级数按键顺序">
        <div class="canon-step">
          <kbd class="kbd-key">1</kbd>
          <span class="canon-roman">I</span>
        </div>
        <span class="canon-arrow" aria-hidden="true">→</span>
        <div class="canon-step">
          <kbd class="kbd-key">5</kbd>
          <span class="canon-roman">V</span>
        </div>
        <span class="canon-arrow" aria-hidden="true">→</span>
        <div class="canon-step">
          <kbd class="kbd-key">6</kbd>
          <span class="canon-roman">vi</span>
        </div>
        <span class="canon-arrow" aria-hidden="true">→</span>
        <div class="canon-step">
          <kbd class="kbd-key">3</kbd>
          <span class="canon-roman">iii</span>
        </div>
        <span class="canon-arrow" aria-hidden="true">→</span>
        <div class="canon-step">
          <kbd class="kbd-key">4</kbd>
          <span class="canon-roman">IV</span>
        </div>
        <span class="canon-arrow" aria-hidden="true">→</span>
        <div class="canon-step">
          <kbd class="kbd-key">1</kbd>
          <span class="canon-roman">I</span>
        </div>
        <span class="canon-arrow" aria-hidden="true">→</span>
        <div class="canon-step">
          <kbd class="kbd-key">4</kbd>
          <span class="canon-roman">IV</span>
        </div>
        <span class="canon-arrow" aria-hidden="true">→</span>
        <div class="canon-step">
          <kbd class="kbd-key">5</kbd>
          <span class="canon-roman">V</span>
        </div>
      </div>
      <p class="score-sheet__note">
        级数序列：<span class="score-sheet__mono">1 → 5 → 6 → 3 → 4 → 1 → 4 → 5</span>（可循环）。换调性后罗马级数不变，音响随调性移动。
      </p>
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

      <div class="keymap-card keymap-card--piano">
        <div class="keymap-card__head">
          <span class="keymap-card__label">钢琴一行</span>
          <p class="keymap-card__lead">
            主键盘一行 <strong>1 q 2 w 3 4 r 5 t 6 y 7 8</strong>：数字为白键级数，<kbd class="kbd-inline">q</kbd> <kbd class="kbd-inline">w</kbd> <kbd class="kbd-inline">r</kbd> <kbd class="kbd-inline">t</kbd> <kbd class="kbd-inline">y</kbd> 为黑键根（相对主音 +1、+3、+6、+8、+10 半音）；与数字级数同时按住时<strong>以级数为准</strong>。
          </p>
        </div>
        <div class="piano-strip" role="presentation" aria-label="钢琴式一行键位">
          <div class="piano-strip__row">
            <span class="piano-key piano-key--white"><kbd class="kbd-key">1</kbd></span>
            <span class="piano-key piano-key--black"><kbd class="kbd-key kbd-key--black">q</kbd></span>
            <span class="piano-key piano-key--white"><kbd class="kbd-key">2</kbd></span>
            <span class="piano-key piano-key--black"><kbd class="kbd-key kbd-key--black">w</kbd></span>
            <span class="piano-key piano-key--white"><kbd class="kbd-key">3</kbd></span>
            <span class="piano-key piano-key--white"><kbd class="kbd-key">4</kbd></span>
            <span class="piano-key piano-key--black"><kbd class="kbd-key kbd-key--black">r</kbd></span>
            <span class="piano-key piano-key--white"><kbd class="kbd-key">5</kbd></span>
            <span class="piano-key piano-key--black"><kbd class="kbd-key kbd-key--black">t</kbd></span>
            <span class="piano-key piano-key--white"><kbd class="kbd-key">6</kbd></span>
            <span class="piano-key piano-key--black"><kbd class="kbd-key kbd-key--black">y</kbd></span>
            <span class="piano-key piano-key--white"><kbd class="kbd-key">7</kbd></span>
            <span class="piano-key piano-key--white"><kbd class="kbd-key">8</kbd></span>
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
            <kbd class="kbd-key kbd-key--wide">⇧</kbd>
            <span class="modifier-tile__name">大小和弦</span>
            <span class="modifier-tile__note">同根大三 ↔ 小三</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">.</kbd>
            <span class="modifier-tile__name">属七</span>
            <span class="modifier-tile__note">大小七；与 <kbd class="kbd-inline">Shift</kbd> 在 V 上→小七；与 <kbd class="kbd-inline">n</kbd>→减七</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">,</kbd>
            <span class="modifier-tile__name">六和弦</span>
            <span class="modifier-tile__note">大六 / 小六</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">/</kbd>
            <span class="modifier-tile__name">七和弦</span>
            <span class="modifier-tile__note">调内 maj7 / m7 / V 属七 / vii°→ø</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">n</kbd>
            <span class="modifier-tile__name">减和弦</span>
            <span class="modifier-tile__note">减三和弦；与 <kbd class="kbd-inline">.</kbd> 为减七</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">m</kbd>
            <span class="modifier-tile__name">增和弦</span>
            <span class="modifier-tile__note">增三和弦</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">9</kbd>
            <span class="modifier-tile__name">add9</span>
            <span class="modifier-tile__note">与 <kbd class="kbd-inline">/</kbd> 同按为九和弦</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">'</kbd>
            <span class="modifier-tile__name">sus4</span>
            <span class="modifier-tile__note">挂四</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">;</kbd>
            <span class="modifier-tile__name">sus2</span>
            <span class="modifier-tile__note">挂二</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">o</kbd>
            <span class="modifier-tile__name">第一转位</span>
            <span class="modifier-tile__note">三音在低音</span>
          </div>
          <div class="modifier-tile">
            <kbd class="kbd-key kbd-key--wide">p</kbd>
            <span class="modifier-tile__name">第二转位</span>
            <span class="modifier-tile__note">五音在低音</span>
          </div>
        </div>
        <div class="keymap-priority">
          <span class="keymap-priority__label">说明</span>
          <span class="keymap-priority__value">详细优先级与组合见 <code class="kbd-inline">docs/KEYBOARD.md</code></span>
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

const timbreSelect = document.querySelector<HTMLSelectElement>("#timbreSelect")!;
for (const opt of TIMBRE_OPTIONS) {
  const o = document.createElement("option");
  o.value = opt.id;
  o.textContent = opt.label;
  o.title = opt.description;
  timbreSelect.appendChild(o);
}
timbreSelect.value = voice.getTimbre();
timbreSelect.addEventListener("change", () => {
  const v = timbreSelect.value;
  if (isTimbreId(v)) voice.setTimbre(v);
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
