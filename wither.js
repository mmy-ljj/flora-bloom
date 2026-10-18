/* Wither / 凋零 engine.
 *
 * 做法：把 29 帧开花序列倒着放慢（花瓣一层层合拢，和参考视频里花瓣收拢的过程一致），
 * 同时给整朵花做“失水”处理：褪色、发黄褐、稍稍下沉，最后按花种收尾。
 *
 * 所有画面都画在 canvas 上，不给 <img> 直接加 CSS filter：
 * Chromium 对“带透明像素的图片 + CSS filter”会把颜色渗进透明区域，出现一块淡色方块；
 * 走 canvas 的 drawImage（配合 ctx.filter）+ source-atop 叠色，透明区域才不会泛色。
 *
 * 收尾按植物习性分三类：
 *   settle  —— 合拢发枯后停住（孤挺花 / 香雪兰 / 百合 / 上传的自定义花）
 *   fall    —— 合拢后整朵垂落淡出（山茶：花谢整朵脱落、不散瓣）
 *   shatter —— 合拢后花瓣成片散落（芍药：一开即散）
 *
 * 之后若拿到真实的凋零视频帧，给对应花种加上 witherFrames，用帧序列替换 A 段即可，
 * B 段的收尾与衔接逻辑不用改。
 */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInCubic = (t) => t * t * t;
const smoothstep = (a, b, t) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

const A_END = 0.66; // 合拢段占整段凋零的比例

export const WITHER_PROFILES = {
  /* 孤挺花：花被片宽厚，先一层层合拢、花喉发黄，最后整朵往下沉 */
  original: { duration: 7200, closeTo: 19, sag: 0.055, grade: { sat: 0.62, bri: 0.965, sepia: 0.20, hue: -5 }, finale: "settle" },
  /* 白山茶：花冠厚实，合拢后整朵脱落（不散瓣），所以是 fall */
  white: { duration: 6600, closeTo: 21, sag: 0.035, grade: { sat: 0.66, bri: 0.975, sepia: 0.22, hue: -4 }, finale: "settle" },
  /* 香雪兰：花朵小、失水快，先垂头再收成细长的枯花，黄得最明显 */
  purple: { duration: 6200, closeTo: 23, sag: 0.045, grade: { sat: 0.6, bri: 0.97, sepia: 0.24, hue: 6 }, finale: "settle" },
  /* 百合：花瓣薄长，从瓣尖开始干枯卷缩，垂得最明显 */
  lily: { duration: 7400, closeTo: 17, sag: 0.062, grade: { sat: 0.6, bri: 0.965, sepia: 0.22, hue: -7 }, finale: "settle" },
  /* 芍药：花瓣多而散，合拢之后一碰即碎，所以是 shatter */
  peony: { duration: 6800, closeTo: 19, sag: 0.04, grade: { sat: 0.64, bri: 0.97, sepia: 0.2, hue: -4 }, finale: "settle" },
  custom: { duration: 6000, closeTo: 20, sag: 0.05, grade: { sat: 0.62, bri: 0.97, sepia: 0.21, hue: -5 }, finale: "settle" },
};

export function createWither(stage) {
  let layer = stage.querySelector(".wither-layer");
  if (!layer) {
    layer = document.createElement("canvas");
    layer.className = "wither-layer";
    layer.setAttribute("aria-hidden", "true");
    stage.appendChild(layer);
  }
  const ctx = layer.getContext("2d");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  let running = false;
  let raf = 0;
  let timer = 0;
  let settleResolve = null;
  let activeImg = null;

  const clearTimers = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    timer = 0;
  };

  function releaseImage() {
    if (!activeImg) return;
    activeImg.style.transition = "opacity .6s ease";
    activeImg.style.opacity = "";
    activeImg = null;
  }

  function resetLayer() {
    clearTimers();
    running = false;
    releaseImage();
    layer.style.transition = "";
    layer.style.opacity = "0";
    if (layer.width) ctx.setTransform(1, 0, 0, 1, 0, 0), ctx.clearRect(0, 0, layer.width, layer.height);
    stage.classList.remove("is-withering", "is-withered");
    if (settleResolve) {
      const resolve = settleResolve;
      settleResolve = null;
      resolve(false);
    }
  }

  function gradeString(profile, k) {
    const g = profile.grade;
    const sat = 1 + (g.sat - 1) * k;
    const bri = 1 + (g.bri - 1) * k;
    const sepia = g.sepia * k;
    const hue = g.hue * k;
    const con = 1 + 0.08 * k;
    return `saturate(${sat.toFixed(3)}) brightness(${bri.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${hue.toFixed(2)}deg) contrast(${con.toFixed(3)})`;
  }

  /* 在已经画上去的花瓣像素上叠“干枯色”（source-atop），花心浅、外缘深 */
  function dryTint(w, h, k) {
    if (k <= 0) return;
    const g = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.1, w / 2, h * 0.42, Math.max(w, h) * 0.62);
    g.addColorStop(0, `rgba(126,92,58,${(0.02 * k).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(108,76,47,${(0.06 * k).toFixed(3)})`);
    g.addColorStop(0.85, `rgba(86,58,34,${(0.12 * k).toFixed(3)})`);
    g.addColorStop(1, `rgba(64,42,25,${(0.18 * k).toFixed(3)})`);
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function play(opts) {
    const img = opts?.img;
    if (!img || !img.complete || !img.naturalWidth) return Promise.resolve(false);
    resetLayer();
    const profile = WITHER_PROFILES[opts.profileKey] || WITHER_PROFILES.custom;
    const from = Math.max(0, Math.min(28, opts.from ?? 0));
    const closeTo = Math.max(0, Math.min(28, profile.closeTo));
    const setFrame = typeof opts.setFrame === "function" ? opts.setFrame : () => {};
    const duration = reduced ? Math.min(2400, profile.duration) : profile.duration;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const boxW = stage.clientWidth || 1;
    const boxH = stage.clientHeight || 1;
    const scale = Math.min(boxW / nw, boxH / nh);
    const w = Math.max(1, nw * scale);
    const h = Math.max(1, nh * scale);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    layer.style.width = `${w}px`;
    layer.style.height = `${h}px`;
    layer.style.left = `${(boxW - w) / 2}px`;
    layer.style.top = `${(boxH - h) / 2}px`;
    const DW = Math.max(1, Math.round(w * dpr));
    const DH = Math.max(1, Math.round(h * dpr));
    layer.width = DW;
    layer.height = DH;

    activeImg = img;
    img.style.transition = "opacity .5s ease";
    img.style.opacity = "0";
    layer.style.transition = "opacity .5s ease";
    layer.style.opacity = "1";
    running = true;
    stage.classList.add("is-withering");

    /* 画一帧：变换 + 上色 + 干枯色，src 为空时用当前帧图 */
    const fill = (transform, alpha, tintK, src) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, DW, DH);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.filter = gradeString(profile, tintK);
      transform(ctx, DW, DH);
      if (src) {
        ctx.drawImage(src, 0, 0, DW, DH);
      } else {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, nw, nh, 0, 0, DW, DH);
      }
      ctx.restore();
      ctx.filter = "none";
      dryTint(DW, DH, tintK);
    };

    const sagMatrix = (c, W, H, amount, extraB) => {
      c.translate(W / 2, H * 0.94);
      c.translate(0, H * profile.sag * amount);
      const s = 1 - 0.012 * amount - 0.014 * (extraB || 0);
      c.scale(s, s);
      c.translate(-W / 2, -H * 0.94);
    };

    return new Promise((resolve) => {
      settleResolve = resolve;
      const started = performance.now();
      let pendingFrame = from;
      let drawnFrame = -1;
      let snap = null;
      const snapCanvas = document.createElement("canvas");
      const snapCtx = snapCanvas.getContext("2d");

      const step = (now) => {
        if (!running) return;
        const t = clamp01((now - started) / duration);
        const tint = smoothstep(0.02, 0.92, t);
        if (t < A_END || profile.finale === "settle") {
          const closing = t < A_END;
          const a = closing ? easeInOutSine(t / A_END) : 1;
          const idx = closing ? Math.round(from + (closeTo - from) * a) : closeTo;
          if (idx !== pendingFrame) { pendingFrame = idx; setFrame(idx); }
          const b = closing ? 0 : (t - A_END) / (1 - A_END);
          const amount = closing ? a : 0.75 + 0.25 * b;
          if (closing) {
            if (pendingFrame !== drawnFrame && img.complete && img.naturalWidth) {
              drawnFrame = pendingFrame;
              fill((c, W, H) => sagMatrix(c, W, H, amount), 1, tint, null);
            }
          } else if (img.complete && img.naturalWidth) {
            /* 收尾段：整朵继续往里缩、往下塌，同时慢慢失掉些血色（透明度），
             * 这样“凋零”和“用手把花合上”一眼就能区分开 */
            const shrink = 1 - 0.02 - 0.15 * b;
            const alpha = 1 - 0.3 * b;
            fill((c, W, H) => {
              c.translate(W / 2, H * 0.94);
              c.translate(0, H * profile.sag * amount);
              c.scale(shrink, shrink);
              c.translate(-W / 2, -H * 0.94);
            }, alpha, tint, null);
          }
        } else {
          const b = (t - A_END) / (1 - A_END);
          if (!snap) {
            /* 进入收尾前先把“合拢且已发枯”的这一帧复制一份，落瓣/脱落都基于这份拷贝，
             * 避免把自己画到自己身上产生拖影 */
            snapCanvas.width = DW;
            snapCanvas.height = DH;
            snapCtx.clearRect(0, 0, DW, DH);
            snapCtx.drawImage(layer, 0, 0);
            snap = true;
          }
          if (profile.finale === "fall") {
            const drop = smoothstep(0, 1, b);
            const alpha = 1 - smoothstep(0.55, 1, b);
            fill((c, W, H) => {
              sagMatrix(c, W, H, 0.8 + 0.2 * b, b);
              c.translate(easeInCubic(drop) * W * 0.06, easeInCubic(drop) * H * 0.92);
              c.rotate(-0.13 * drop);
            }, alpha, tint, snapCanvas);
          } else {
            fill((c, W, H) => sagMatrix(c, W, H, 0.8 + 0.2 * b, b), 1 - 0.45 * b, tint, snapCanvas);
            drawShatter(snapCanvas, b);
          }
        }
        if (t < 1) {
          raf = requestAnimationFrame(step);
          return;
        }
        raf = 0;
        /* 收尾：枯掉的花先停一拍，再把画布淡出、帧图淡入，交还给下一次张开手掌 */
        stage.classList.remove("is-withering");
        stage.classList.add("is-withered");
        timer = setTimeout(() => {
          layer.style.transition = "opacity .7s ease";
          layer.style.opacity = "0";
          releaseImage();
          timer = setTimeout(() => {
            running = false;
            settleResolve = null;
            resolve(true);
          }, 780);
        }, 900);
      };
      raf = requestAnimationFrame(step);
    });
  }

  /* 芍药：花瓣按竖条带散落 */
  function drawShatter(snapCanvas, b) {
    const slabs = 9;
    for (let i = 0; i < slabs; i += 1) {
      const seed = ((i * 9301 + 49297) % 233280) / 233280;
      const dir = i % 2 === 0 ? -1 : 1;
      const fall = easeInCubic(b) * layer.height * (0.2 + seed * 0.28);
      const drift = dir * easeInCubic(b) * layer.width * (0.03 + seed * 0.07);
      const rot = dir * easeInCubic(b) * (0.12 + seed * 0.22);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.max(0, 1 - Math.pow(b, 1.25)) * 0.92;
      ctx.beginPath();
      ctx.rect((i / slabs) * layer.width, 0, layer.width / slabs + 1, layer.height);
      ctx.clip();
      ctx.translate(layer.width / 2 + drift, layer.height * 0.42 + fall);
      ctx.rotate(rot);
      ctx.drawImage(snapCanvas, -layer.width / 2, -layer.height * 0.42, layer.width, layer.height);
      ctx.restore();
    }
  }

  return {
    play,
    stop: resetLayer,
    get running() { return running; },
    get element() { return layer; },
  };
}
