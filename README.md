# FLORA — In full bloom

指尖花开 · a hand-gesture flower bloom experience.

Pure static site (HTML + CSS + ES modules). No build step, no server, no third-party CDN.

## Why this fork exists

The original page was published behind Cloudflare and loaded fonts from
`fonts.googleapis.com`, which is not reachable from mainland China without a VPN.
This copy:

- self-hosts **all** fonts in `assets/fonts/` (`fonts.local.css`) instead of Google Fonts;
- self-hosts MediaPipe HandLandmarker (`assets/mediapipe/`, task + WASM), no CDN fetch;
- drops the Cloudflare bot-challenge script;
- keeps every path relative, so it works from any static host.

Open the site and it works with no network calls outside this repository.

## 花种

页面里的六款花，按逐帧比对整理；第六款只到芍药属，因视频缺少枝叶与完整花蕾：

| # | 花种 | 学名 | 科属 | 花期 | 原产 | 花语 |
|---|---|---|---|---|---|---|
| 01 | 重瓣孤挺花 | *Hippeastrum hybridum* | 石蒜科 · 孤挺花属 | 1—4 月 | 南美巴西、秘鲁 | 骄傲 · 渴望被爱 · 华丽 |
| 02 | 白山茶 | *Camellia japonica* | 山茶科 · 山茶属 | 11—5 月 | 中国东部、日本、朝鲜半岛 | 理想的爱 · 谦逊 · 可爱 |
| 03 | 香雪兰 | *Freesia × hybrida* | 鸢尾科 · 香雪兰属 | 3—5 月 | 南非开普敦 | 清香 · 纯洁 · 敏感的心 |
| 04 | 粉色百合 | *Lilium* | 百合科 · 百合属 | 5—7 月 | 北半球温带 | 纯洁 · 庄严 · 百年好合 |
| 05 | 粉色芍药 | *Paeonia lactiflora* | 芍药科 · 芍药属 | 5 月 | 中国北方、西伯利亚 | 情有独钟 · 依依惜别 |
| 06 | 浅粉重瓣芍药 | *Paeonia* | 芍药科 · 芍药属 | 晚春至初夏（属级参考） | 未定 | 层叠 · 柔粉 · 盛放 |

每款花的详情弹窗里附有画面观察、形态资料和来源。第六款不凭花冠视频指定具体物种或栽培品种。

## 站点结构（导航四项都已补齐）

| 导航 | 页面 | 内容 |
|---|---|---|
| STUDIES | `studies.html` | 判种方法（五项形态判据）、六份研究条目、手势算法（21 关键点 → 张开度 → 29 帧映射）、素材清单、资料出处 |
| POETRY | `poetry.html` | 苏轼《邵伯梵行寺山茶》、韩愈《芍药》、姜夔《扬州慢》摘句、陆游咏百合七绝（均标集本与异文），另说明香雪兰与孤挺花为何没有旧体诗 |
| COLLECTION | `collection.html` | 六款花卡片：29 帧、尺寸与花型，可一键跳回花开页对应花款（`?flower=1..6`） |
| BLOOM | `index.html` | 花开交互本体：手势开合、切换花种、上传花朵 |


## 凋零（withering）

只有**粉色百合**会凋零。完成「张开 → 合拢 → 再张开」**2 次**后，
从第 **3 次合拢途中**开始独立抽取：**30% 概率**直接进入连续凋零，其余 70% 继续正常开合。
其余五款花仅随手掌开合，不参与凋零抽签；`?wither=1` 也不改变这一点。
闭合和重新张开的姿态都需要稳定约 120 毫秒；手部追踪中断不会补算未完成的开合。

- 想测试必定触发：`index.html?wither=1`（第 3 次合拢途中触发）
- 想完全关掉：`index.html?wither=0`
- 命令行/自动化里也可以直接调 `window.__floraDebug.wither()`（返回 Promise）

### 表现

粉色百合使用提供的视频提取的透明逐帧素材；其他花保留原先的 29 帧开合：

1. **合拢途中直接凋零**——从当前花形进入动画，提前预载视频帧，避免抽中后等素材造成停顿；
2. **连续过渡**——收拢未结束时就开始下垂或散瓣，收尾沿用上一帧画面，不再二次上色或跳位；
3. **只作用于百合**——别的花保持正常开合，不会进入枯态。

凋零结束后文字提示重新开花；切换花种会立即取消尚在播放的凋零效果。

| 花种 | 效果 |
|---|---|
| 粉色百合 | 开合；满足次数后 30% 概率凋零，约 10 秒 |
| 其他五款 | 只开合 |

### 离线使用和访问边界

网页脚本、花朵帧、字体和 MediaPipe 模型都由本站提供，没有运行所必需的第三方 CDN。
首次在有网络时点击「保存离线版」，等到显示「已可离线使用」，同一浏览器便会缓存交互所需文件；
断网后仍可打开这个网址使用演示和手势（摄像头权限仍须允许）。清除浏览器网站数据或换设备后需重新保存。
GitHub Pages 无法保证所有地区、运营商或受限网络都能连上，首次访问和首次保存离线版仍需要能访问 GitHub Pages。

### 粉色百合素材

目前百合凋零采用用户视频提取的 81 张透明 WebP 帧，位于 `assets/wither/lily/`。
若今后替换素材，尽量保持与开花帧相同的机位、构图和光线，以减少切换时的形状跳变。

### 已知限制

源帧从 AI 视频中抠出，部分花朵边缘有浅色矩形残边；百合的开花帧与凋零视频
不是同一连续拍摄，因此交接处仍可能有轻微形状差异。

## Layout

```
index.html            page shell (BLOOM)
studies.html          STUDIES · 花的研究
poetry.html           POETRY · 花与诗
collection.html       COLLECTION · 花集
styles.css            styles
pages.css             styles for the three content pages
garden.js             bloom logic + hand tracking (ES module)
wither.js             pink lily withering renderer
offline-sw.js         optional same-origin offline cache
gesture-core.js       hand math helpers
fonts.local.css       @font-face for the self-hosted fonts
assets/fonts/         woff2 subsets (Cormorant Garamond, DM Sans, Noto Serif SC)
assets/frames/        flower bloom frames (webp 00..28)
assets/seedance/      5 additional flower frame sets
tools/extract_sixth_flower.py  source-video frame extraction (requires OpenCV, NumPy, Pillow)
assets/mediapipe/     hand_landmarker.task + tasks-vision runtime + wasm
```

## Run locally

```
python -m http.server 8080
```

Then open http://localhost:8080/ (the camera/microphone features need https or localhost).

## Deploy

Any static host works. With GitHub Pages: Settings → Pages → Deploy from a branch →
`main` / root.
# 粉色百合凋零视频

粉色百合的凋零动画使用用户提供的视频提取的 81 张透明 WebP 帧，约 10 秒，先与盛开帧渐变衔接，再播放花瓣收拢、下垂和消失的完整过程。素材位于 `assets/wither/lily/`，提取脚本位于 `tools/extract_lily_wilt.py`。若素材加载失败，会自动回退到原有程序化凋零动画；其余花仍只开合。

