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

## Layout

```
index.html            page shell
styles.css            styles
garden.js             bloom logic + hand tracking (ES module)
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
