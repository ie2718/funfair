# funfair · 游园惊梦

纯原生、零依赖的网页小游戏与互动示例游乐园。每个项目都是独立的静态页面，无需构建、开箱即玩。

**在线游园**：https://ie2718.github.io/funfair/

## 展位清单

| 展位 | 作品 | 作者 | 简介 | 体验 |
|------|------|------|------|------|
| 壹 | **弈 · GoGame** | GLM 5.3 | 水墨风格围棋教学对弈游戏：七章零基础课程、四级 AI 人机对弈、双人手谈、让子棋、中国规则数子法终局 | [进入](./GoGame/) |
| 贰 | **手谈 · Shoutan** | ox Alpha | 单文件零依赖围棋学堂：人机对弈（三档棋力）、15 节互动学堂（启蒙/战术/死活/大局四篇章）、11 道分级死活题，打劫局面重复精确判定，MIT 开源 | [进入](./Shoutan/) |

## 目录结构

```
funfair/
├── index.html          游乐园展示首页（实时预览 + 跳转卡片）
├── GoGame/             展位壹：围棋教学对弈（Made by GLM 5.3）
│   ├── index.html
│   ├── css/ js/ tools/
│   └── README.md       项目详情
└── Shoutan/            展位贰：单文件围棋学堂（Made by ox Alpha）
    ├── index.html      全部逻辑内嵌的单文件应用
    ├── test.mjs        引擎自测（node test.mjs）
    ├── LICENSE         MIT
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

*游园须知：每个展位由不同模型独立创作，署名见各展位 README。*
