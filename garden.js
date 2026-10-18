import { assignHands, HandOpenness, SecondHandSwipe } from "./gesture-core.js";

const MODEL_URL = new URL("./assets/mediapipe/hand_landmarker.task", import.meta.url).href;
const WASM_URL = new URL("./assets/mediapipe/wasm", import.meta.url).href;
const LIBRARY_URL = new URL("./assets/mediapipe/tasks-vision.mjs", import.meta.url).href;
const FLOWERS = [
  { name: "花开<span>·</span>花合<br /><i>Bloom · In Motion</i>", label: "粉色数字花", meaning: "指尖呼吸 · 自由开合", kind: "frames", folder: "original", image: "./assets/pink-bloom-open.png", intro: "一朵从你最初提供的即梦视频中走出的粉色数字花。", detail: "原视频未标注真实植物种类，且花形经过生成与设计，因此不把它误认成某个确定的物种。手掌张合会直接选取它盛开到合拢的逐帧花态。" },
  { name: "白色山茶<br /><i>Camellia · In Motion</i>", label: "白色山茶（推测）", meaning: "层叠白瓣 · 缓缓舒展", kind: "frames", folder: "white", image: "./assets/seedance/white/flower_00.webp", intro: "层叠的白色花瓣围住金黄色花心，外形接近重瓣山茶。", detail: "这段新视频呈现单朵白花由盛开合成花苞。山茶有单瓣到重瓣等多种花形；这里仅按生成画面的外观推测为山茶意象，不能据此鉴定具体物种或品种。", source: "https://www.rhs.org.uk/plants/camellia/growing-guide" },
  { name: "香雪兰<br /><i>Freesia · In Motion</i>", label: "香雪兰（推测）", meaning: "紫色花序 · 轻盈舒展", kind: "frames", folder: "purple", image: "./assets/seedance/purple/flower_00.webp", intro: "紫色漏斗状小花沿一侧花枝排列，外形接近香雪兰。", detail: "香雪兰常形成单侧花序，花色可呈紫色或淡紫色。这段生成视频只提供外观，因此名称是形态推测，不能确认品种，也无法从画面判断香气。手掌开合可让两朵花同步变化。", source: "https://www.rhs.org.uk/plants/freesia" },
  { name: "重瓣百合<br /><i>Lily · In Motion</i>", label: "粉色重瓣百合（推测）", meaning: "柔粉花瓣 · 舒展如星", kind: "frames", folder: "lily", image: "./assets/seedance/lily/flower_00.webp", intro: "修长而外展的粉色花瓣，形态接近重瓣百合。", detail: "画面取自你新提供的视频。百合的重瓣花形可出现额外花瓣；这里只能依据数字影像推测外观，不能确认真实品种或香味。主手张合可让花在盛开与花苞间停留。", source: "https://www.rhs.org.uk/plants/lilies/how-to-grow-lilies" },
  { name: "粉色芍药<br /><i>Peony · In Motion</i>", label: "粉色芍药（推测）", meaning: "柔软花瓣 · 层层拥抱", kind: "frames", folder: "peony", image: "./assets/seedance/peony/flower_00.webp", intro: "宽大的粉色外瓣围住浅色花心，外形接近芍药的花型。", detail: "画面取自你新提供的另一段视频。芍药有单瓣、重瓣与中央花瓣化等多种形态；数字影像不足以确认物种或品种，因此这里保留“推测”标注。", source: "https://www.rhs.org.uk/plants/peony/herbaceous/growing-guide" },
];
const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const $ = (selector) => document.querySelector(selector);
const page = $(".experience"), camera = $("#camera"), canvas = $("#hand-overlay"), context = canvas.getContext("2d");
const stage = $("#bloom-stage"), animation = $("#bloom-animation"), bud = $("#species-bud"), open = $("#species-open");
const custom = $("#custom-flower"), cameraButton = $("#camera-button"), demoButton = $("#demo-button");
const indicator = $("#mode-indicator"), note = $("#interaction-note"), debug = $("#gesture-debug");
const palmValue = $("#palm-value"), palmProgress = $("#palm-progress"), switchValue = $("#switch-value"), switchProgress = $("#switch-progress");
const mainGesture = new HandOpenness(), secondGesture = new HandOpenness({ smoothMs: 55 }), switcher = new SecondHandSwipe();
if (debug && new URLSearchParams(location.search).has("debug")) debug.hidden = false;
const dialog = $("#flower-dialog");
const state = { mode: "idle", stream: null, tracker: null, lastFrameTime: -1,
  transitionTimer: null, customUrl: null, frames: {}, currentFrame: null, openness: 1, demoStartedAt: null, species: 0, primaryPalm: null };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const frameUrl = (species, index) => FLOWERS[species].folder === "original"
  ? `./assets/frames/flower_${String(index).padStart(2, "0")}.webp`
  : `./assets/seedance/${FLOWERS[species].folder}/flower_${String(index).padStart(2, "0")}.webp`;

async function preloadFrames() {
  for (const species of FLOWERS.keys()) {
    if (state.frames[species]) continue;
    const frames = await Promise.all(Array.from({ length: 29 }, (_, index) => new Promise((resolve) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = frameUrl(species, index);
    })));
    if (frames.some((frame) => !frame)) throw new Error("Flower frame download failed");
    state.frames[species] = frames;
  }
  return state.frames;
}
function setLabel(label, active = false) { indicator.innerHTML = `<i></i> ${label}`; indicator.classList.toggle("is-live", active); }
function showFrame(index) {
  if (FLOWERS[state.species].kind !== "frames" || stage.classList.contains("has-image") || index === state.currentFrame) return;
  animation.src = state.frames[state.species]?.[index]?.src ?? frameUrl(state.species, index); state.currentFrame = index;
}
function setOpenness(value) {
  const openness = clamp(value, 0, 1);
  state.openness = openness;
  page.style.setProperty("--bloom-open", openness.toFixed(3));
  page.style.setProperty("--bud-opacity", (1 - openness).toFixed(3));
  page.style.setProperty("--bud-scale", (.78 + openness * .12).toFixed(3));
  page.style.setProperty("--open-scale", (.76 + openness * .24).toFixed(3));
  page.style.setProperty("--flower-scale", stage.classList.contains("has-image") ? (.72 + openness * .28).toFixed(3) : "1");
  if (FLOWERS[state.species].kind === "frames") showFrame(Math.round((1 - openness) * 28));
  palmValue.textContent = `${Math.round(openness * 100)}%`; palmProgress.style.width = `${Math.round(openness * 100)}%`;
}
function selectFlower(index, animate = true) {
  const next = (index + FLOWERS.length) % FLOWERS.length;
  clearTimeout(state.transitionTimer);
  const apply = () => {
    state.species = next;
    const flower = FLOWERS[next], count = String(next + 1).padStart(2, "0");
    $("#flower-count").textContent = count; $("#flower-no").textContent = count;
    $("#flower-title").innerHTML = flower.name; $("#flower-meaning").textContent = flower.meaning;
    $("#flower-info-button").setAttribute("aria-label", `了解${flower.label}`);
    if (dialog.open) updateFlowerDialog();
    stage.classList.toggle("is-pair", flower.kind === "pair"); stage.classList.remove("has-image");
    page.classList.remove("is-demo-pair");
    state.currentFrame = null;
    if (flower.kind === "pair") { bud.src = flower.bud; open.src = flower.open; }
    else { bud.removeAttribute("src"); open.removeAttribute("src"); showFrame(Math.round((1 - state.openness) * 28)); }
    if (state.mode === "demo") { state.demoStartedAt = performance.now(); page.classList.toggle("is-demo-pair", flower.kind === "pair"); }
    note.textContent = `已切换至${flower.label} · 张合手掌控制开合`;
    stage.classList.remove("is-switching");
  };
  if (animate) { stage.classList.add("is-switching"); state.transitionTimer = setTimeout(apply, 280); }
  else apply();
}
function updateFlowerDialog() {
  const uploaded = stage.classList.contains("has-image");
  const flower = uploaded ? { label: "你上传的花朵", image: state.customUrl, intro: "这是你刚刚加入 FLORA 的花朵素材。", detail: "网页会在本机浏览器中展示这张图片；由于只有一张静态图，手势控制的是大小变化，而不是逐帧花瓣形变。若想获得真正的开合过程，需要提供花苞与盛开素材或一段开合视频。" } : FLOWERS[state.species];
  $("#dialog-flower-number").textContent = uploaded ? "FLORA / YOUR FLOWER" : `FLORA / ${String(state.species + 1).padStart(2, "0")}`;
  $("#dialog-flower-name").textContent = flower.label;
  $("#dialog-flower-image").src = flower.image;
  $("#dialog-flower-image").alt = `${flower.label}盛开的图像`;
  $("#dialog-flower-intro").textContent = flower.intro;
  $("#dialog-flower-detail").textContent = flower.detail;
  const source = $("#dialog-flower-source");
  source.hidden = !flower.source;
  if (flower.source) source.href = flower.source;
}
function openFlowerDialog() { updateFlowerDialog(); dialog.showModal(); }
function drawHands(landmarks, primaryIndex) {
  if (!camera.videoWidth || !camera.videoHeight) return;
  if (canvas.width !== camera.videoWidth || canvas.height !== camera.videoHeight) { canvas.width = camera.videoWidth; canvas.height = camera.videoHeight; }
  context.clearRect(0, 0, canvas.width, canvas.height);
  landmarks.forEach((points, index) => {
    const color = index === primaryIndex ? "#c3ef88" : "#ffe2a5";
    context.strokeStyle = color; context.fillStyle = color; context.lineWidth = Math.max(2, canvas.width / 400);
    context.shadowColor = color; context.shadowBlur = 7;
    for (const [a, b] of CONNECTIONS) { context.beginPath(); context.moveTo(points[a].x * canvas.width, points[a].y * canvas.height); context.lineTo(points[b].x * canvas.width, points[b].y * canvas.height); context.stroke(); }
    for (const point of points) { context.beginPath(); context.arc(point.x * canvas.width, point.y * canvas.height, canvas.width / 200, 0, Math.PI * 2); context.fill(); }
    context.shadowBlur = 0;
  });
}
function readHand(result, now) {
  const all = result?.landmarks ?? [], selected = assignHands(all, state.primaryPalm);
  const primary = all[selected.primary], secondary = all[selected.secondary];
  const reading = mainGesture.update(primary, result?.worldLandmarks?.[selected.primary], now);
  const other = secondGesture.update(secondary, result?.worldLandmarks?.[selected.secondary], now);
  const switching = switcher.update(secondary && other.visible && !other.uncertain ? other : null, now);
  if (primary && reading.visible && !reading.uncertain) state.primaryPalm = { x: reading.x, y: reading.y };
  else if (!reading.visible) state.primaryPalm = null;
  page.classList.toggle("is-tracking", reading.visible);
  $("#hand-count").textContent = `${all.length} / 2`; drawHands(all, selected.primary);
  if (reading.visible && primary && !reading.uncertain) {
    setOpenness(reading.openness); setLabel(`花朵开放 ${Math.round(reading.openness * 100)}%`, true);
  } else if (!reading.visible) {
    palmValue.textContent = "等待识别"; palmProgress.style.width = "0%";
    if (state.mode === "camera") setLabel("请把手放入画面", true);
  }
  if (secondary) { switchValue.textContent = !switching.armed ? "右移后再滑" : switching.progress > 0 ? `${Math.round(switching.progress * 100)}%` : "← 向左滑"; switchProgress.style.width = `${Math.round(switching.progress * 100)}%`; }
  else { switchValue.textContent = "等待识别"; switchProgress.style.width = "0%"; }
  if (switching.triggered) selectFlower(state.species + 1);
  if (debug) debug.textContent = `主手 ${reading.visible ? Math.round((reading.openness ?? 0) * 100) + "%" : "未识别"} · 第二只手 ${other.visible ? Math.round((other.openness ?? 0) * 100) + "%" : "未识别"} · 左滑 ${Math.round(switching.progress * 100)}% · 花种 ${state.species + 1}`;
}
if (debug && !debug.hidden) window.__floraDebug = { readHand, selectFlower };
function track(now) {
  if (state.mode === "demo" && FLOWERS[state.species].kind === "frames") {
    const phase = ((now - state.demoStartedAt) % 7000) / 7000;
    showFrame(Math.round((1 - Math.cos(phase * Math.PI * 2)) * 14));
  }
  if (state.mode === "camera" && state.tracker && camera.readyState >= 2 && camera.currentTime !== state.lastFrameTime) {
    try { const result = state.tracker.detectForVideo(camera, now); state.lastFrameTime = camera.currentTime; readHand(result, now); }
    catch (error) { console.error("Hand tracking stopped", error); stopCamera(); setLabel("手势识别异常"); }
  }
  requestAnimationFrame(track);
}
async function getTracker() {
  if (state.tracker) return state.tracker;
  const { FilesetResolver, HandLandmarker } = await import(LIBRARY_URL);
  const files = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = { runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: .6, minHandPresenceConfidence: .55, minTrackingConfidence: .55 };
  try { state.tracker = await HandLandmarker.createFromOptions(files, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" } }); }
  catch { state.tracker = await HandLandmarker.createFromOptions(files, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" } }); }
  return state.tracker;
}
function stopCamera() {
  state.stream?.getTracks().forEach((track) => track.stop());
  state.stream = null; camera.srcObject = null; state.mode = "idle"; state.lastFrameTime = -1; state.primaryPalm = null;
  mainGesture.reset(); secondGesture.reset(); switcher.reset(); context.clearRect(0, 0, canvas.width, canvas.height);
  page.classList.remove("is-camera", "is-tracking"); page.style.setProperty("--flower-scale", "1");
  cameraButton.textContent = "开启手势"; note.textContent = "轻触开始，花随你而动"; setLabel("等待开始");
  palmValue.textContent = "等待识别"; switchValue.textContent = "等待识别"; palmProgress.style.width = "0%"; switchProgress.style.width = "0%";
}
async function startCamera() {
  cameraButton.disabled = true; setLabel("正在加载花朵与手势识别…");
  try {
    await Promise.all([getTracker(), preloadFrames()]);
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    camera.srcObject = state.stream; await camera.play(); state.mode = "camera";
    mainGesture.reset(); secondGesture.reset(); switcher.reset(); state.primaryPalm = null;
    demoButton.textContent = "播放花开"; page.classList.add("is-camera"); cameraButton.textContent = "关闭手势";
    note.textContent = "主手开合控制花瓣；第二只手向左滑切换花种"; setLabel("请把手放入画面", true);
  } catch (error) { console.error("Camera unavailable", error); stopCamera(); setLabel("摄像头未开启"); note.textContent = "请允许摄像头访问，或点击播放花开"; }
  finally { cameraButton.disabled = false; }
}
function playDemo() {
  if (state.mode === "camera") stopCamera();
  if (state.mode === "demo") { state.mode = "idle"; page.classList.remove("is-demo-pair"); demoButton.textContent = "播放花开"; setLabel("等待开始"); if (FLOWERS[state.species].kind === "frames") { state.currentFrame = null; showFrame(0); } return; }
  state.mode = "demo"; state.demoStartedAt = performance.now();
  demoButton.textContent = "暂停花开"; setLabel("花开花合", true);
  if (FLOWERS[state.species].kind === "pair") page.classList.add("is-demo-pair");
  note.textContent = `${FLOWERS[state.species].label}的缓缓呼吸`;
}
function loadFlower(file) {
  if (!file) return;
  if (!["image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) { note.textContent = "请选择 15MB 以下的透明 PNG / WebP"; return; }
  if (state.customUrl) URL.revokeObjectURL(state.customUrl);
  state.customUrl = URL.createObjectURL(file); custom.src = state.customUrl; stage.classList.add("has-image");
  $("#flower-info-button").setAttribute("aria-label", "了解你上传的花朵");
  note.textContent = "已载入你的花朵，可继续用手势控制大小"; setLabel("自定义花朵", true);
}
cameraButton.addEventListener("click", () => state.mode === "camera" ? stopCamera() : startCamera());
demoButton.addEventListener("click", playDemo);
$("#next-flower").addEventListener("click", () => selectFlower(state.species + 1));
$("#flower-info-button").addEventListener("click", openFlowerDialog);
$("#dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
$("#flower-file").addEventListener("change", (event) => loadFlower(event.target.files?.[0]));
window.addEventListener("beforeunload", () => { stopCamera(); if (state.customUrl) URL.revokeObjectURL(state.customUrl); state.tracker?.close(); });
requestAnimationFrame(track);
