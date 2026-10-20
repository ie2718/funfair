# 释迦塔 · FogongPagoda

**Made by Claude Opus 5.5** — 应县木塔（佛宫寺释迦塔）程序化三维重建，funfair 展位肆。

全部几何体都在页面里用 Three.js 程序化生成，不依赖外部模型文件。Three.js r170 已放在 `vendor/three/`，无需安装或构建。由于使用 ES Module，请通过静态服务器打开（直接双击 `index.html` 打不开）：

```bash
python3 -m http.server 8080   # 在仓库根目录运行
# 打开 http://localhost:8080/FogongPagoda/
```

## 文件

- `index.html`：单文件页面，包含模型、界面与程序贴图。
- `vendor/three/`：Three.js 0.170.0 核心与所用插件（OrbitControls、CSS2DRenderer、BufferGeometryUtils、RoomEnvironment），MIT 许可见 `vendor/three/LICENSE`。

## 操作

拖动旋转、滚轮或双指缩放、右键平移。视角：全景 / 斗拱 / 塔刹 / 台基。显示：剖切（切去南半，可看到一层约 10 m 的释迦坐像与各层塑像）、层位标注（各层名称与标高）、自动旋转、日照高度。

## 复原范围

- 台基：下方上八角两层，约 4 m，南面有月台和踏道，东西两面有月台
- 一层副阶周匝与檐柱墙，二至五层各带平坐暗层；每层外槽 24 柱、内槽 8 柱
- 柱头与补间铺作，下层双下昂，由下往上逐层简化
- 八面曲面屋檐（上陡下缓、翼角起翘），椽子、垂脊、套兽、风铃、勾栏、格子门
- 匾额：万古观瞻、释迦塔、天下奇观、峻极神工
- 铁塔刹：仰莲、覆钵、五重相轮、圆光、仰月、宝盖、宝珠，8 条铁链

通高 67.31 m（梁思成逐层实测）和底层直径 30.27 m 有资料依据，模型顶点正好落在 67.31 m。各层层高、出檐深度和斗拱比例是参照照片估算的，并非测绘精度。2006 年和 2011 年的测量结果分别为 65.86 m 和 65.84 m，本模型沿用 67.31 m。

## 资料来源

- [维基百科：佛宫寺释迦塔](https://zh.wikipedia.org/wiki/佛宫寺释迦塔)
- [澎湃新闻](https://m.thepaper.cn/detail/31652924)
- [清华新闻](https://www.tsinghua.edu.cn/info/1182/51169.htm)
- [China Daily](https://epaper.chinadaily.com.cn/a/202507/25/WS6882d10ca310af1daa82554a.html)
- [中国新闻网](https://www.chinanews.com.cn/cul/2011/10-31/3425768.shtml)
- 比例参照照片：[Fogong Pagoda 1.jpg](https://commons.wikimedia.org/wiki/File:Fogong_Pagoda_1.jpg)（Patrick Streule，CC BY 2.0，未嵌入页面）
