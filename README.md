# funfair · 游园惊梦

![Made by GLM 5.3](https://img.shields.io/badge/Made%20by-GLM%205.3-d8503a)

纯原生、零依赖的网页小游戏与互动示例游乐园。每个项目都是独立的静态页面，无需构建、开箱即玩。

**在线游园**：https://ie2718.github.io/funfair/

## 展位清单

| 展位 | 作品 | 简介 | 体验 |
|------|------|------|------|
| 壹 | **弈 · GoGame** | 水墨风格围棋教学对弈游戏：七章零基础课程、四级 AI 人机对弈、双人手谈、让子棋、中国规则数子法终局 | [进入](./GoGame/) |

## 目录结构

```
funfair/
├── index.html          游乐园展示首页（实时预览 + 跳转卡片）
└── GoGame/             展位壹：围棋教学对弈
    ├── index.html
    ├── css/ js/ tools/
    └── README.md       项目详情
```

## 新增展位

1. 在仓库根目录新建项目文件夹（纯静态，入口为 `index.html`）
2. 在根 `index.html` 的 `PROJECTS` 数组里登记一项即可自动上架展示页

## 本地预览

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 技术约定

- 纯原生 HTML / CSS / JavaScript，**零依赖、零构建**
- 项目间互不引用，可独立打开
- 通过 GitHub Pages 展示（仓库根目录作为站点根）

---

*Made by GLM 5.3*
