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

页面里的五朵花，按逐帧比对得出的形态鉴定：

| # | 花种 | 学名 | 科属 | 花期 | 原产 | 花语 |
|---|---|---|---|---|---|---|
| 01 | 重瓣孤挺花 | *Hippeastrum hybridum* | 石蒜科 · 孤挺花属 | 1—4 月 | 南美巴西、秘鲁 | 骄傲 · 渴望被爱 · 华丽 |
| 02 | 白山茶 | *Camellia japonica* | 山茶科 · 山茶属 | 11—5 月 | 中国东部、日本、朝鲜半岛 | 理想的爱 · 谦逊 · 可爱 |
| 03 | 香雪兰 | *Freesia × hybrida* | 鸢尾科 · 香雪兰属 | 3—5 月 | 南非开普敦 | 清香 · 纯洁 · 敏感的心 |
| 04 | 粉色百合 | *Lilium* | 百合科 · 百合属 | 5—7 月 | 北半球温带 | 纯洁 · 庄严 · 百年好合 |
| 05 | 粉色芍药 | *Paeonia lactiflora* | 芍药科 · 芍药属 | 5 月 | 中国北方、西伯利亚 | 情有独钟 · 依依惜别 |

每朵花的详情弹窗里附有形态描述、识别依据（逐帧比对的特征）、习性与花语；文字中不含推测性措辞，鉴定结论直接给出。

## 站点结构（导航四项都已补齐）

| 导航 | 页面 | 内容 |
|---|---|---|
| STUDIES | `studies.html` | 判种方法（五项形态判据）、五份研究条目、手势算法（21 关键点 → 张开度 → 29 帧映射）、素材清单、资料出处 |
| POETRY | `poetry.html` | 苏轼《邵伯梵行寺山茶》、韩愈《芍药》、姜夔《扬州慢》摘句、陆游咏百合七绝（均标集本与异文），另说明香雪兰与孤挺花为何没有旧体诗 |
| COLLECTION | `collection.html` | 五个花种卡片：29 帧、尺寸体积、花期原产、从盛开帧取出的三种主色，可一键跳回花开页对应花种（`?flower=1..5`） |
| BLOOM | `index.html` | 花开交互本体：手势开合、切换花种、上传花朵 |


## 凋零（withering）

同一朵花完成「张开 → 合拢 → 再张开」算一次完整开合。完成 **3 次**后，
每次再完成一轮时独立抽取一次：**30% 概率**进入凋零，其余 70% 继续正常开合。
闭合和重新张开的姿态都需要稳定约 120 毫秒；手部追踪中断不会补算未完成的开合。

- 想测试必定触发：`index.html?wither=1`（完成第 3 次开合时触发）
- 想完全关掉：`index.html?wither=0`
- 命令行/自动化里也可以直接调 `window.__floraDebug.wither()`（返回 Promise）

### 表现

本版以提供的玫瑰视频为节奏参考；没有把红玫瑰画面直接贴到其他花上。凋零由已有的
29 帧花态和程序化画布处理组成：

1. **失水收拢**——从刚盛开的画面缓慢推进到各花种的半合状态，同时逐渐褪色、变暗、下垂；
2. **因花而异的收尾**——孤挺花与香雪兰停在枯态，白山茶整朵下落，百合与芍药花瓣分片散落；
3. **平滑恢复**——枯态先停留。手势模式下需要再次合拢再张开，接近枯态对应的花形时交还控制；演示模式在停留后从相近花形继续。

凋零结束后文字提示重新开花；切换花种会立即取消尚在播放的凋零效果。

| 花种 | 时长 | 收尾 |
|---|---|---|
| 重瓣孤挺花 | 7.6s | 花冠收拢、下沉 |
| 白山茶 | 7.2s | 整朵下落 |
| 香雪兰 | 7.8s | 花枝垂头、停在枯态 |
| 粉色百合 | 8.6s | 长瓣分片散落 |
| 粉色芍药 | 8.2s | 多层花瓣散落 |

### 将来使用真正的凋零视频

现在这套是「倒放 + 程序化处理」的近似。如果之后有真正的凋零素材（每朵花一段，
最好与开花帧同样的机位、同样的平光、30fps、4～8 秒）：

需要为每朵花提取、去背景并对齐视频帧，再在 `wither.js` 中接入；当前版本尚未实现
自动加载后续凋零视频。最好提供与已有开花帧同角度、同构图的素材，以免切换时跳变。

### 已知限制

源帧从 AI 视频中抠出，部分花朵边缘有浅色矩形残边；程序化调色无法生成
视频里真实卷曲、破损的新花瓣细节。要达到参考片的真实凋落质感，仍需各花对应的凋零素材。

## Layout

```
index.html            page shell (BLOOM)
studies.html          STUDIES · 花的研究
poetry.html           POETRY · 花与诗
collection.html       COLLECTION · 花集
styles.css            styles
pages.css             styles for the three content pages
garden.js             bloom logic + hand tracking (ES module)
wither.js             withering engine (frame rewind + grade + settle)
gesture-core.js       hand math helpers
fonts.local.css       @font-face for the self-hosted fonts
assets/fonts/         woff2 subsets (Cormorant Garamond, DM Sans, Noto Serif SC)
assets/frames/        flower bloom frames (webp 00..28)
assets/seedance/      4 extra species frame sets
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

粉色百合的凋零动画使用用户提供的视频提取的 81 张透明 WebP 帧，约 10 秒，先与盛开帧渐变衔接，再播放花瓣收拢、下垂和消失的完整过程。素材位于 `assets/wither/lily/`，提取脚本位于 `tools/extract_lily_wilt.py`。若素材加载失败，会自动回退到原有程序化凋零动画；其余花仍保持原有动画。

