# funfair · 游园惊梦

纯原生、零依赖的网页小游戏与互动示例游乐园。每个项目都是独立的静态页面，无需构建、开箱即玩。

**在线游园**：https://ie2718.github.io/funfair/

## 展位清单

| 展位 | 作品 | 作者 | 简介 | 体验 |
|------|------|------|------|------|
| 壹 | **弈 · GoGame** | GLM 5.3 | 水墨风格围棋教学对弈游戏：七章零基础课程、四级 AI 人机对弈、双人手谈、让子棋、中国规则数子法终局 | [进入](./GoGame/) |
| 贰 | **手谈 · Shoutan** | ox Alpha | 单文件零依赖围棋学堂：人机对弈（三档棋力）、15 节互动学堂（启蒙/战术/死活/大局四篇章）、11 道分级死活题，打劫局面重复精确判定，MIT 开源 | [进入](./Shoutan/) |
| 叁 | **木构千年 · YingxianPagoda** | OpenAI Codex | 应县木塔 Three.js 形制复原：旋转缩放、木构骨架、分层展开、楼层近看、PNG 与 GLB 导出，附来源与源码 | [进入](./YingxianPagoda/) |
| 肆 | **释迦塔 · FogongPagoda** | Claude Opus 5.5 | 应县木塔程序化三维重建：双下昂斗拱、曲面屋檐、平坐勾栏、匾额与铁塔刹，可剖切看内部塑像、标注层位标高、调节日照 | [进入](./FogongPagoda/) |

## 目录结构

```
funfair/
├── index.html          游乐园展示首页（实时预览 + 跳转卡片）
├── GoGame/             展位壹：围棋教学对弈（Made by GLM 5.3）
│   ├── index.html
│   ├── css/ js/ tools/
│   └── README.md       项目详情
├── Shoutan/            展位贰：单文件围棋学堂（Made by ox Alpha）
│   ├── index.html      全部逻辑内嵌的单文件应用
│   ├── test.mjs        引擎自测（node test.mjs）
│   ├── LICENSE         MIT
│   └── README.md       项目详情
├── YingxianPagoda/     展位叁：应县木塔（Made by OpenAI Codex）
    ├── index.html      已内嵌 Three.js 的离线单文件入口
    ├── model.js        模型与交互源码
    ├── template.html   界面与样式源码
    ├── build.mjs       可选的源码打包工具
    ├── yingxian-pagoda.glb / preview.jpg
    └── README.md       运行、复原范围与资料来源
└── FogongPagoda/       展位肆：应县木塔程序化重建（Made by Claude Opus 5.5）
    ├── index.html      模型、界面与程序贴图的单文件页面
    ├── vendor/three/   本地 Three.js r170 模块
    └── README.md       运行、复原范围与资料来源
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
- 展位叁使用已内嵌的 Three.js，展位肆使用 `vendor/` 下的本地 Three.js 模块；体验无需安装或构建，仅修改源码重新打包时使用 npm
- 项目间互不引用，可独立打开
- 通过 GitHub Pages 展示（仓库根目录作为站点根）

---

*游园须知：每个展位由不同模型独立创作，署名见各展位 README。*
