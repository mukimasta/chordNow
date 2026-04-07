# Changelog

以下每条记录一行改动说明（中文）；章节标题带日期（`YYYY-MM-DD`）。

## 未发布

（暂无）

## 0.1.0 — 2026-04-07

- 产品名 **ChordNow**（`package.json` 包名 `chordnow`）；页面标题与 README 同步。
- 键盘与和声：`Shift` 大小转换；物理 **`.`↔`/`** 互换（`.` 属七、`/` 调内七）；`,` 六和弦；`n`/`m` 减/增三和弦；`9` add9；`'`/`;` sus4/sus2；`o`/`p` 转位（声部仅改低音）；扩展 `ChordKind` 与 `pitches` / `rootUpperResolve`；界面修饰键卡片与提示同步。
- 页面底部「琴谱 · **卡农进行**」：帕赫贝尔低音级数 **I–V–vi–iii–IV–I–IV–V**，数字键顺序标记。
- 产品设计文档 `docs/KEYBOARD.md`。
- 新增「纯正弦波」音色（`sine`）；「合成钢琴」音色（`piano`）；页头「音色」下拉；`timbres.ts`；`ChordVoice#setTimbre`。
- 级数键数字键 `1`–`8`（`Digit1`–`Digit8`），`1` 与 `8` 均为 I 级；发声链路 `mixOut` 总线与交叉淡化；快速重触发静音旧层；首和弦起音；默认「根音+上层开放/就近」声部引擎（`RootUpperRegisterConfig`）；`nearestVoicingEngine` 可切换。
- `ChordPlaybackSession`、`Registry`、`ChordResolver` / `VoicingEngine` / `AudioSink`；`majorDiatonicResolver`；`attachKeyboardChordController`；`main.ts` 组装。
- 键盘说明卡片式 UI；GitHub Actions 部署 GitHub Pages（`vite` base）。
- 初始：Vite 6、TypeScript 5、Vitest；大调调性；`resolveChord`；`keymap`；`chordKeyboard` 表单聚焦不抢键；`pitches` 就近声部；`ChordVoice` Web Audio；Vitest。
