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

每一朵花都是「张开手掌 → 合拢手掌」算一次呼吸。一朵花累计呼吸 **2 次**之后，
再重新张开时开始判定：**30% 概率**这朵花进入凋零，其余 70% 照常开花。
判定结果锁定在这朵花身上——凋零过的花，直到下一次重新张开才恢复。

- 想立刻看效果：`index.html?wither=1`（每次张开必凋零）
- 想完全关掉：`index.html?wither=0`
- 命令行/自动化里也可以直接调 `window.__floraDebug.wither()`（返回 Promise）

### 表现

凋零不是额外素材，而是**把 29 帧开花序列倒着放**，再叠三层程序化处理：

1. **收拢**——从当前盛开帧缓动回到每朵花各自的「半合」帧（`closeTo`），约 6～7 秒，
   比手一合一开慢得多，所以一眼能看出「不是被我合上的」；
2. **失水**——逐渐降低饱和度、微微加压暖色偏移，再叠一层很淡的干枯色；
3. **下沉 + 收尾**——整朵向下坠一点，最后 1 秒继续缩小、褪掉约三成血色，
   然后把这张枯态画面留在原地（画布停在最后一帧）；手掌重新张开、帧序列开始往前走
   的那一刻才交还画面，所以不会出现「刚枯掉又突然变回鲜亮花苞」的跳变。

凋零结束后文字变成「花已凋零 · 重新张开手掌，再养一朵」。演示模式下枯花先停 2.4 秒
再自动进入下一轮；手势模式下则一直停在枯态，等你张开手掌。手一铺开，帧序列从停下的
那一帧自然往前接，不会跳帧，于是同一朵花又能重新开满。

| 花种 | 时长 | 停在 | 下坠 | 调色（饱和/亮度/泛黄） |
|---|---|---|---|---|
| 重瓣孤挺花 | 7.2s | 第 19 帧 | 5.5% | 0.62 / 0.965 / 0.20 |
| 白山茶 | 6.6s | 第 21 帧 | 3.5% | 0.66 / 0.975 / 0.22 |
| 香雪兰 | 6.2s | 第 23 帧 | 4.5% | 0.60 / 0.970 / 0.24 |
| 粉色百合 | 7.4s | 第 17 帧 | 6.2% | 0.60 / 0.965 / 0.22 |
| 粉色芍药 | 6.8s | 第 19 帧 | 4.0% | 0.64 / 0.970 / 0.20 |

### 换成真实的凋零视频（接口已就绪）

现在这套是「倒放 + 程序化处理」的近似。如果之后有真正的凋零素材（每朵花一段，
最好与开花帧同样的机位、同样的平光、30fps、4～8 秒）：

1. 按帧导出成 webp，放到 `assets/wither/<folder>/wither_00.webp` 开始编号；
2. 在 `garden.js` 的 `FLOWERS` 里给对应花种加一行
   `witherFrames: { folder: "<folder>", count: <帧数> }`；
3. `wither.js` 会优先用真实帧（`loadWitherFrames()`），此时时长、插值、收尾
   （`settle` / `fall` / `shatter`）都在 `WITHER_PROFILES` 里调，不需要改交互逻辑。

### 已知限制

源帧是从 AI 生成视频里抠出来的，边缘留着一小块浅色矩形残边（几乎看不出来，
但重度变色会把它显出来）。所以凋零的色彩只能做到「克制地失水」，不能做成
深褐色枯花；要做到那种强度，需要上面第 3 步的真实素材。

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
