# 木构千年 · YingxianPagoda

**Made by OpenAI Codex** — 应县木塔 Three.js 交互复原，funfair 展位叁。

直接双击 `index.html`，在支持 WebGL 的现代浏览器中打开。Three.js、OrbitControls、GLTFExporter 与程序纹理均已内嵌，不需要联网或安装依赖。

## 文件

- `index.html`：完整离线交互页面。
- `yingxian-pagoda.glb`：完整外观、未展开状态的三维模型；单位为米，Y 轴向上。
- `preview.jpg`：交互页面预览。
- `model.js`：可编辑的 Three.js 模型和交互源码。
- `template.html`：界面与样式源文件。
- `build.mjs`、`package.json`：重新构建单文件页面。
- `THREE-LICENSE.txt`：Three.js 的 MIT 许可。

## 操作

拖动旋转、滚轮缩放、右键平移；触屏可单指旋转、双指缩放。可切换完整外观、移去屋面和木构骨架，使用滑块分层展开，点击楼层靠近观察。支持正立面、俯视、自动环绕、PNG 保存和 GLB 导出。

GLB 导出保留当前显示模式和展开位置。要导出完整模型，请选择「完整外观」，将展开值归零，再点击「导出模型」。模型使用 `EXT_mesh_gpu_instancing` 存储重复构件；导入软件须支持此扩展。

## 复原范围

按公开的 67.31 米通高组织模型，表达八角平面、五层六檐、底层副阶、四个暗层、内外柱圈、平座栏杆、曲面灰瓦、斗拱、格扇、匾额、双层台基与塔刹。模型含约 4.56 万个实例化构件，此数字仅为本模型的程序化构件数。

这是基于资料和照片的形制、结构示意复原，不是测绘级数字孪生。各层高、柱径、屋面曲线、径向尺寸与斗拱比例为近似。未逐一复刻 54 种真实斗拱，也不包含佛像、壁画、全部匾额、精确榫卯与现状倾斜变形。暗层斜撑和屋顶支架经过简化，分层展开不表示真实拆卸顺序。

## 资料来源

查阅日期：2026-10-20。

1. UNESCO 世界遗产中心预备名单（不是已列入世界遗产名录）：https://whc.unesco.org/en/tentativelists/5803/ 。核对 1056 年、67.31 米、八角、五层六檐、明五暗四、双筒柱圈与暗层斜撑。
2. 无锡博物院《在线微课｜探古寻迹——千年不倒的木塔》：https://www.wxmuseum.cn/Wap/News/Details/a1edc98b-90d0-45f0-a1b0-77ddeded57db 。参照台基、斗拱、暗层与外观照片。参考照片没有打包进交付文件。
3. Pagoda of Fogong Temple：https://en.wikipedia.org/wiki/Pagoda_of_Fogong_Temple 。交叉参照台基与塔刹、建筑文献索引。

## 修改与构建

页面已预先打包，日常体验无需依赖、无需构建；仅编辑源码并重新打包时需要 Node.js。Three.js 已内嵌并保留其 MIT 许可。进入本目录后运行：

```sh
npm install
npm run build
```

修改 `model.js` 中的 `bases`、`radii`、`eaves`、`outers` 可调整各层比例，`roof()` 控制曲面屋顶、瓦垄与翘角。`facade()` 和 `bracket()` 分别生成格扇柱网与示意斗拱。

构建只更新 `index.html`。若修改模型，GLB 需在页面中重新导出。

## 验证

已在浏览器实际验证完整外观、骨架模式、分层展开、楼层近看与 GLB 下载；初次渲染无控制台错误。导出的 GLB 已核对文件头、长度、节点和实例扩展。
