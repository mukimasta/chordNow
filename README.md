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
2. **必须先做**：仓库 **Settings → Pages** → **Build and deployment** → **Source** 选 **GitHub Actions**，保存。若仍是「Deploy from a branch」或未启用 Pages，`deploy-pages` 会报 **404 / Failed to create deployment**（与站点打开后 404 不同，这是 API 创建部署失败）。
3. 把代码推到 **`main`** 或 **`master`** 分支；工作流会先 **`actions/configure-pages`** 再构建，用输出的 `base_path` 设置 Vite 的 `base`，最后 **`actions/deploy-pages@v5`** 发布 `dist`。
4. 几分钟后 **Settings → Pages** 会显示站点地址；把链接发给朋友即可。

本地模拟子路径构建可执行：`GITHUB_PAGES_BASE=/你的仓库名/ npm run build`（须带首尾斜杠语义，与 CI 一致）。

**若使用 `<用户名>.github.io` 仓库作为个人根站点**（无子路径），`configure-pages` 会给出空 `base_path`，CI 里 `GITHUB_PAGES_BASE` 即为 `/`，一般无需再改 `vite.config.ts`。

**说明**：免费 GitHub Pages 通常要求仓库为**公开**；私有仓库使用 Pages 需符合条件的付费账号。音频仍需浏览器允许（用户点一下页面即可）。

## 许可

本项目为私有仓库（`package.json` 中 `"private": true`），未在仓库内声明公开许可证；若需对外分发请自行补充许可条款。
