# ChordBoard

在浏览器里用**键盘级数（罗马数字功能）**弹奏**调内和弦**：选大调调性，按住 `A`–`J`（及与 I 级等价的 `K`）对应 **I–VII** 级，配合修饰键得到七和弦、大小翻转等；和弦用 **Web Audio** 发声，声部在相邻和弦之间做**就近连接**，并带参考音区惩罚，减轻整体越弹越低或越弹越高。

## 环境

- **Node.js**（用于本地开发与构建）
- 支持 **Web Audio API** 的现代浏览器（首次发声前可能需要一次用户手势，如点击页面）

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址即可。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 检查 + 生产构建（输出到 `dist/`） |
| `npm run preview` | 本地预览构建结果 |
| `npm test` | 运行 Vitest（`harmony` / `pitches` / `keymap`） |

## 键盘说明

| 键位 | 作用 |
|------|------|
| `A` 与 `K` | **I** 级（完全等价） |
| `S`–`J`（无 `E`） | **II**–**VII** 级 |
| `,` | **属七**（`7`） |
| `/` | **大七或小七**：按调内三和弦性质（大三 → maj7，小三 → m7；vii° → 半减七） |
| `.` | **同根大三/小三翻转**；仅三和弦时生效。若要先翻转再套 `/` 的七和弦，请**同时按住** `.` 与 `/` |
| 修饰键优先级 | `,`（属七）**高于** `/`（大七/小七） |

页面上方可切换**大调调性**。在 `<select>` 等表单控件聚焦时，不会触发和弦，避免误触。

## 实现要点

- **`src/harmony.ts`**：根据调性、级数、修饰键解析根音与和弦类型（`ChordKind`），并生成显示标签。
- **`src/pitches.ts`**：在候选八度中搜索声部，代价 = **声部移动** + **音区惩罚**（最低音相对参考 MIDI 的**平方项**），得到 `resolveVoicingNearest`。
- **`src/voice.ts`**：每音一振荡器，包络与释音，供 `main.ts` 播放 MIDI 音高列表。

## 技术栈

Vite 6、TypeScript 5、Vitest；无前端框架，纯 DOM + 原生模块。

## 部署到 GitHub Pages（别人只打开网址）

可以。本站是纯静态资源，适合托管在 **GitHub Pages**。

1. 在 GitHub 上新建仓库（或推送本仓库），**仓库名**会出现在网址里：`https://<你的用户名>.github.io/<仓库名>/`。
2. 仓库 **Settings → Pages**：**Build and deployment** 里 **Source** 选 **GitHub Actions**（不要选「Deploy from a branch」的旧方式，除非你自己改流程）。
3. 把代码推到 **`main`** 或 **`master`** 分支；工作流 **Deploy GitHub Pages**（见 `.github/workflows/deploy-github-pages.yml`）会自动 `npm ci && npm run build` 并把 `dist` 发布上去。
4. 几分钟后同一 Pages 设置页会显示站点地址；把链接发给朋友即可。

构建时通过环境变量 **`GITHUB_PAGES_BASE=/<仓库名>/`** 设置 Vite 的 `base`，否则资源路径会错。**若你使用特殊的 `<用户名>.github.io` 仓库作为个人主页**（站点在根路径、没有子路径），需要把该工作流里的 `GITHUB_PAGES_BASE` 改成 `/`，或自行调整 `vite.config.ts` 的 `base`。

**说明**：免费 GitHub Pages 通常要求仓库为**公开**；私有仓库使用 Pages 需符合条件的付费账号。音频仍需浏览器允许（用户点一下页面即可）。

## 许可

本项目为私有仓库（`package.json` 中 `"private": true`），未在仓库内声明公开许可证；若需对外分发请自行补充许可条款。
