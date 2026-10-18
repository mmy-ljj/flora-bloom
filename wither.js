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

const A_END = 0.56; // 前半段失水收拢，后半段留足下垂、脱落或散瓣的时间

export const WITHER_PROFILES = {
  /* 孤挺花：花被片宽厚，先一层层合拢、花喉发黄，最后整朵往下沉 */
  original: { duration: 7600, closeTo: 22, sag: 0.06, grade: { sat: 0.42, bri: 0.79, sepia: 0.33, hue: -5 }, finale: "settle" },
  /* 白山茶：花冠厚实，合拢后整朵脱落（不散瓣），所以是 fall */
  white: { duration: 7200, closeTo: 18, sag: 0.035, grade: { sat: 0.50, bri: 0.83, sepia: 0.27, hue: -4 }, finale: "fall" },
  /* 香雪兰：花朵小、失水快，先垂头再收成细长的枯花，黄得最明显 */
  purple: { duration: 7800, closeTo: 23, sag: 0.08, grade: { sat: 0.42, bri: 0.77, sepia: 0.35, hue: 6 }, finale: "settle" },
  /* 百合：花瓣薄长，从瓣尖开始干枯卷缩，垂得最明显 */
  lily: { duration: 8600, closeTo: 14, sag: 0.10, grade: { sat: 0.39, bri: 0.76, sepia: 0.34, hue: -7 }, finale: "shatter" },
  /* 芍药：花瓣多而散，合拢之后一碰即碎，所以是 shatter */
  peony: { duration: 8200, closeTo: 13, sag: 0.05, grade: { sat: 0.43, bri: 0.80, sepia: 0.30, hue: -4 }, finale: "shatter" },
  custom: { duration: 7000, closeTo: 20, sag: 0.05, grade: { sat: 0.48, bri: 0.83, sepia: 0.28, hue: -5 }, finale: "settle" },
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
  let held = false;

  const clearTimers = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    timer = 0;
  };

  function release() {
    if (!held) return;
    held = false;
    layer.style.transition = "opacity .45s ease";
    layer.style.opacity = "0";
    clearTimeout(timer);
    timer = setTimeout(() => {
      running = false;
      releaseImage();
      stage.classList.remove("is-withered");
      if (layer.width) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, layer.width, layer.height);
      }
    }, 470);
  }

  function releaseImage() {
    if (!activeImg) return;
    activeImg.style.transition = "opacity .6s ease";
    activeImg.style.opacity = "";
    activeImg = null;
  }

  function resetLayer() {
    clearTimers();
    running = false;
    held = false;
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

  async function play(opts) {
    const img = opts?.img;
    if (!img) return false;
    /* demo 模式下帧的 src 刚被换过，img 常常还没 complete；
     * 这里等它一小会儿（最多 1.5s），别让凋零还没开始就被判为失败。 */
    if (!img.complete || !img.naturalWidth) {
      const ready = await new Promise((res) => {
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
          clearTimeout(tm);
          res(v);
        };
        const onLoad = () => finish(true);
        const onError = () => finish(false);
        const tm = setTimeout(() => finish(img.complete && img.naturalWidth > 0), 1500);
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);
      });
      if (!ready) return false;
    }
    resetLayer();
    const profile = WITHER_PROFILES[opts.profileKey] || WITHER_PROFILES.custom;
    const from = Math.max(0, Math.min(28, opts.from ?? 0));
    const closeTo = Math.max(0, Math.min(28, profile.closeTo));
    const setFrame = typeof opts.setFrame === "function" ? opts.setFrame : () => {};
    const frames = Array.isArray(opts.frames) ? opts.frames : null;
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
    layer.style.transition = "opacity .5s ease";
    layer.style.opacity = "0";
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
      let handedOff = false;
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
          if (idx !== pendingFrame) {
            pendingFrame = idx;
            if (!frames) setFrame(idx);
          }
          const b = closing ? 0 : (t - A_END) / (1 - A_END);
          const amount = closing ? a : 0.75 + 0.25 * b;
          if (closing) {
            if (pendingFrame !== drawnFrame && (frames?.[idx] || (img.complete && img.naturalWidth))) {
              drawnFrame = pendingFrame;
              fill((c, W, H) => sagMatrix(c, W, H, amount), 1, tint, frames?.[idx] ?? null);
            }
          } else if (frames?.[closeTo] || (img.complete && img.naturalWidth)) {
            /* 收尾段：整朵继续往里缩、往下塌，同时慢慢失掉些血色（透明度），
             * 这样“凋零”和“用手把花合上”一眼就能区分开 */
            const shrink = 1 - 0.02 - 0.15 * b;
            const alpha = 1 - 0.3 * b;
            fill((c, W, H) => {
              c.translate(W / 2, H * 0.94);
              c.translate(0, H * profile.sag * amount);
              c.scale(shrink, shrink);
              c.translate(-W / 2, -H * 0.94);
            }, alpha, tint, frames?.[closeTo] ?? null);
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
            const alpha = 1 - 0.74 * smoothstep(0.15, 1, b);
            fill((c, W, H) => {
              sagMatrix(c, W, H, 0.8 + 0.2 * b, b);
              c.translate(easeInCubic(drop) * W * 0.06, easeInCubic(drop) * H * 0.36);
              c.rotate(-0.13 * drop);
            }, alpha, tint, snapCanvas);
          } else {
            fill((c, W, H) => sagMatrix(c, W, H, 0.8 + 0.2 * b, b), 1 - 0.66 * b, tint, snapCanvas);
            drawShatter(snapCanvas, b, opts.profileKey);
          }
        }
        if (!handedOff && (drawnFrame >= 0 || t >= A_END)) {
          handedOff = true;
          img.style.opacity = "0";
          layer.style.opacity = "1";
        }
        if (t < 1) {
          raf = requestAnimationFrame(step);
          return;
        }
        raf = 0;
        setFrame(closeTo);
        /* 停在最后一帧：画布留着这张枯掉的花，帧图仍然藏着，
           等手掌再次张开时由 release() 把画面交还给帧序列。 */
        stage.classList.remove("is-withering");
        stage.classList.add("is-withered");
        held = true;
        settleResolve = null;
        resolve(true);
      };
      raf = requestAnimationFrame(step);
    });
  }

  /* 每朵花的花瓣区域和落点不同；裁剪与图像使用同一坐标变换，避免硬直条带。 */
  function drawShatter(snapCanvas, b, key) {
    const petals = key === "lily"
      ? [[.20,.38,.17,.11,-.18,.63,-.7],[.76,.37,.18,.10,.22,.55,.65],[.26,.66,.15,.13,-.13,.43,-.5],[.71,.66,.17,.12,.18,.49,.6]]
      : [[.16,.28,.18,.16,-.17,.58,-.6],[.43,.16,.18,.13,-.07,.46,-.4],[.77,.24,.18,.17,.18,.51,.5],[.18,.55,.19,.15,-.18,.59,-.7],[.78,.57,.20,.16,.19,.56,.7],[.40,.73,.18,.12,-.10,.38,-.3],[.61,.72,.18,.12,.12,.42,.3]];
    for (let i = 0; i < petals.length; i += 1) {
      const [x, y, rx, ry, dx, dy, rot] = petals[i];
      const local = clamp01((b - i * .055) / (1 - i * .055));
      const move = easeInCubic(local);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = (1 - smoothstep(.65, 1, local)) * .94;
      ctx.translate((x + dx * move) * layer.width, (y + dy * move) * layer.height);
      ctx.rotate(rot * move);
      ctx.translate(-x * layer.width, -y * layer.height);
      ctx.beginPath();
      ctx.ellipse(x * layer.width, y * layer.height, rx * layer.width, ry * layer.height, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(snapCanvas, 0, 0);
      ctx.restore();
    }
  }

  return {
    play,
    release,
    stop: resetLayer,
    get held() { return held; },
    get running() { return running; },
    get element() { return layer; },
  };
}
