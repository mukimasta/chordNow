# Changelog

以下每条记录一行改动说明（中文）；章节标题带日期（`YYYY-MM-DD`）。

## 0.1.0 — 2026-04-07

- 级数键改为数字键 `1`–`8`（`Digit1`–`Digit8`），`1` 与 `8` 均为 I 级；页面与 README 键盘说明同步。
- 发声链路改为共用 `mixOut` 总线，新旧和弦用同期线性交叉淡化（约 38ms），减轻按住级数时快速按修饰键产生的爆音/削波感。
- 快速连续重触发时立即静音并断开尚未结束淡出的旧层，避免多路和弦叠在总线上。
- 首和弦仍用较短起音时间（约 15ms），避免首次发声明显滞后。
- 默认声部引擎改为「根音+上层开放/就近」：根音仅在 D2–A3（MIDI）内优化（不跟上一和弦根音做就近），上层在 B3–C5 内、上层跨度≤12 半音，上层优先开放排列并与上一和弦上层做就近；`RootUpperRegisterConfig`、权重可配置。
- 三和弦上层改为三个音（根、三、五在上层重复根音），七和弦上层仍为三、五、七，便于共同音留在上层声区。
- 保留「就近+参考音区」声部引擎（`nearestVoicingEngine`）并在注册表中注册，可与根音上层策略切换。
- 新增 `ChordPlaybackSession` 统一编排解析器、声部引擎与 `AudioSink`，换调性时清空声部记忆。
- 新增 `Registry` 注册 `ChordResolver` / `VoicingEngine` 实现，便于扩展调式与声部策略。
- 定义 `ChordResolver`、`VoicingEngine`、`AudioSink` 接口；`ChordVoice` 实现 `AudioSink`。
- 大调调内解析封装为 `majorDiatonicResolver`；`nearestVoicingEngine` 包装原有 `resolveVoicingNearest`。
- 键盘和弦逻辑抽离为 `attachKeyboardChordController`，与 UI 解耦。
- `main.ts` 改为组装注册表、会话与键盘控制器，页面说明随默认声部策略更新。

## 2026-04-04 键盘说明与 GitHub Pages

- 优化键盘映射说明界面（卡片式级数与修饰键说明等）。
- 增加 GitHub Actions 工作流，构建并部署到 GitHub Pages（含 `vite` base 与 `configure-pages`）。
- 更新 README：快速开始、脚本表、GitHub Pages 部署步骤与说明。

## 2026-04-04 初始 MVP

- 使用 Vite 6、TypeScript 5、Vitest；无 UI 框架，入口 `index.html` + `main.ts` 注入页面结构。
- 大调调性下拉选择；主音 pitch class 与 `MAJOR_KEYS` 列表。
- 大调调内罗马数字级数与和弦类型解析（`resolveChord`），修饰键对应 `,` 属七、`/` 大七与小七、`.` 同根大小翻转及优先级规则。
- `keymap` 将数字键 `1`/`8` 映射为 I 级，`2`–`7` 为 II–VII；`getActiveDegree` 按最近按下处理多键。
- `chordKeyboard` 在 `input/textarea/select/contenteditable` 聚焦时不抢和弦键。
- `pitches` 枚举根音八度与转位，`resolveVoicingNearest` 最小化声部移动 + 参考低音音区平方惩罚。
- `ChordVoice` 使用 Web Audio 振荡器（三角波）与主增益包络、释音。
- 点击页面与 `ensureRunning` 处理 AudioContext 用户手势策略。
- Vitest 覆盖 `harmony`、`pitches`、`keymap` 等测试。
