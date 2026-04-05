import { defineConfig } from "vite";

/**
 * GitHub Pages「项目站」地址为 https://<user>.github.io/<repo>/
 * 构建时需设置 base 为 /<repo>/，否则 JS/CSS 会从域名根路径加载导致 404。
 * CI 里通过环境变量 GITHUB_PAGES_BASE 注入；本地默认 "/" 。
 */
const base = process.env.GITHUB_PAGES_BASE?.replace(/\/?$/, "/") ?? "/";

export default defineConfig({
  base,
  server: { open: true },
});
