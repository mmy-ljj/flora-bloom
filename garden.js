import { assignHands, HandOpenness, SecondHandSwipe } from "./gesture-core.js";

const MODEL_URL = new URL("./assets/mediapipe/hand_landmarker.task", import.meta.url).href;
const WASM_URL = new URL("./assets/mediapipe/wasm", import.meta.url).href;
const LIBRARY_URL = new URL("./assets/mediapipe/tasks-vision.mjs", import.meta.url).href;
const FLOWERS = [
  { name: "重瓣孤挺花<br /><i>Amaryllis · In Motion</i>", label: "石蒜科孤挺花属 · Hippeastrum hybridum", short: "重瓣孤挺花", meaning: "骄傲 · 渴望被爱 · 华丽", kind: "frames", folder: "original", image: "./assets/pink-bloom-open.png",
    intro: "六枚宽卵形的花被片分两轮交错展开，瓣身玫瑰粉、正中一条白色中脉，花喉收成黄绿色；最中心的重瓣化小瓣簇层层卷叠，把花蕊收在瓣间。花蕾是长梭形，被两枚绿色膜质苞片托住，从粗壮中空的花葶顶端抽出。",
    facts: [["学名", "Hippeastrum hybridum"], ["科属", "石蒜科 Amaryllidaceae · 孤挺花属"], ["花期", "1—4 月，单葶着花 2—4 朵，每朵开 5—7 天"], ["原产", "南美巴西、秘鲁的林缘与灌丛"], ["花语", "骄傲 · 渴望被爱 · 华丽"]],
    detail: "识别依据：把这朵数字花提取的 29 帧逐张比对，花被片两轮各 3 枚、瓣基黄绿色花喉、每枚瓣面一条白色中脉、花葶顶端两枚佛焰苞状苞片、花葶中空，这五项特征同时落在重瓣孤挺花上；中心那簇卷叠的小瓣由雄蕊瓣化而来，所以看不到外伸的花药。习性：球根植物，鳞茎直径 6—8 厘米，喜排水良好的介质与明亮散射光，花后进入生长期。页面按 29 帧推进：张开手掌看它层层盛开，握拳回到花苞。",
    source: "https://www.rhs.org.uk/plants/hippeastrum/growing-guide" },
  { name: "白山茶<br /><i>Camellia · In Motion</i>", label: "山茶科山茶属 · Camellia japonica", short: "白山茶", meaning: "理想的爱 · 谦逊 · 可爱", kind: "frames", folder: "white", image: "./assets/seedance/white/flower_00.webp",
    intro: "花瓣自外向内排成六层以上的重瓣型，倒卵形、瓣缘微微起皱，白色调里透一点奶油光；花心收着一簇金黄色雄蕊，花丝与花药团成一个小绒球。花蕾圆球带尖，外面裹着青绿色萼片，开放时从顶端一圈圈翻卷出来。",
    facts: [["学名", "Camellia japonica"], ["科属", "山茶科 Theaceae · 山茶属"], ["花期", "11—5 月，盛期 1—3 月，单朵开 7—10 天"], ["原产", "中国东部、日本、朝鲜半岛"], ["花语", "理想的爱 · 谦逊 · 可爱"]],
    detail: "识别依据：分层重瓣、花心一束金黄雄蕊、圆尖花蕾、厚革质深绿叶，这一组结构是山茶属重瓣型的稳定特征；白色品种的瓣心带一点暖黄，与白色月季的蕊心排布不同。习性：常绿灌木，耐半阴，冬春开花，花谢整朵脱落而不散瓣。这组帧从盛开推向花苞，手掌开合可在两者之间来回。",
    source: "https://www.rhs.org.uk/plants/camellia/growing-guide" },
  { name: "香雪兰<br /><i>Freesia · In Motion</i>", label: "鸢尾科香雪兰属 · Freesia × hybrida", short: "香雪兰", meaning: "清香 · 纯洁 · 敏感的心", kind: "frames", folder: "purple", image: "./assets/seedance/purple/flower_00.webp",
    intro: "花朵在花枝一侧依次排成单侧总状花序，每一朵都是漏斗形：细长花被筒从苞片里伸出，末端 6 枚近圆形花被片向外铺开，喉部转成乳白与浅黄；下方还挂着几枚青绿色花苞，按自下而上的顺序陆续开放。",
    facts: [["学名", "Freesia × hybrida"], ["科属", "鸢尾科 Iridaceae · 香雪兰属"], ["花期", "3—5 月，单枝着花 2—4 朵"], ["原产", "南非开普敦一带的冬季降雨区"], ["花语", "清香 · 纯洁 · 敏感的心"]],
    detail: "识别依据：单侧花序、漏斗状花被筒、6 枚近圆形花被片、细而有分枝的花茎，是鸢尾科香雪兰属的组合特征；这一枝上方的紫粉色花朵与下方成串花苞，正是切花香雪兰的标准花枝形态。习性：球茎植物，秋季下种、春季开花，昼夜温差大时香气最明显，切花可插 7—10 天。张合手掌，整枝花会同步在盛开与含苞之间移动。",
    source: "https://www.rhs.org.uk/plants/freesia" },
  { name: "粉色百合<br /><i>Lily · In Motion</i>", label: "百合科百合属 · Lilium", short: "粉色百合", meaning: "纯洁 · 庄严 · 百年好合", kind: "frames", folder: "lily", image: "./assets/seedance/lily/flower_00.webp",
    intro: "六枚披针形花被片先端外翻、瓣身向上卷起，粉白渐变的花瓣内面撒着深红色细斑；中心另有一小簇白色瓣片与淡绿色花丝、三裂柱头，让花心比外围更厚。花蕾是细长的梭形，颜色从青绿过渡到浅粉。",
    facts: [["学名", "Lilium（百合属园艺杂交种）"], ["科属", "百合科 Liliaceae · 百合属"], ["花期", "5—7 月，单朵开 5—8 天"], ["原产", "北半球温带：中国、日本、欧洲、北美"], ["花语", "纯洁 · 庄严 · 百年好合"]],
    detail: "识别依据：6 枚花被片（3 外 + 3 内）、瓣基成片的深色斑点、细长花丝与三裂柱头，是百合属的辨识特征；花瓣内面的斑点只在百合属稳定出现，石蒜科与天南星科的花不具这一结构。习性：鳞茎植物，喜光、需低温春化，花大而香，是夏季切花主力。这组 29 帧由盛开走向花苞，手掌开合控制它停留的开放程度。",
    source: "https://www.rhs.org.uk/plants/lilies/how-to-grow-lilies" },
  { name: "粉色芍药<br /><i>Peony · In Motion</i>", label: "芍药科芍药属 · Paeonia lactiflora", short: "粉色芍药", meaning: "情有独钟 · 依依惜别", kind: "frames", folder: "peony", image: "./assets/seedance/peony/flower_00.webp",
    intro: "花朵大而松软：外层几枚宽卵形花被片先端起波浪，颜色从瓣缘的粉收到瓣根的乳白；向内的瓣片越收越小、边缘起细褶，花心立着一圈奶白色瓣化雄蕊和金黄色雌蕊，构成层层包裹的花型。花蕾圆球形，被青绿色萼片紧裹。",
    facts: [["学名", "Paeonia lactiflora"], ["科属", "芍药科 Paeoniaceae · 芍药属"], ["花期", "5 月，单朵开 5—7 天"], ["原产", "中国北方、西伯利亚、朝鲜半岛"], ["花语", "情有独钟 · 依依惜别"]],
    detail: "识别依据：宽大波缘的外瓣、向内逐渐细碎的瓣化雄蕊、花心露出的金黄雌蕊、圆球花蕾与青绿萼片，这一组结构是芍药属重瓣型（千层类）的标准形态；单枝单朵、花葶直立，符合切花芍药。习性：多年生草本，秋植春发，5 月开花，是中国传统名花，与牡丹的区别在木质与草质茎。手掌张合让它在盛开与紧裹的花苞之间移动。",
    source: "https://www.rhs.org.uk/plants/peony/herbaceous/growing-guide" },
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
    $("#flower-info-button").setAttribute("aria-label", `了解${flower.short}`);
    if (dialog.open) updateFlowerDialog();
    stage.classList.toggle("is-pair", flower.kind === "pair"); stage.classList.remove("has-image");
    page.classList.remove("is-demo-pair");
    state.currentFrame = null;
    if (flower.kind === "pair") { bud.src = flower.bud; open.src = flower.open; }
    else { bud.removeAttribute("src"); open.removeAttribute("src"); showFrame(Math.round((1 - state.openness) * 28)); }
    if (state.mode === "demo") { state.demoStartedAt = performance.now(); page.classList.toggle("is-demo-pair", flower.kind === "pair"); }
    note.textContent = `已切换至${flower.short} · 张合手掌控制开合`;
    stage.classList.remove("is-switching");
  };
  if (animate) { stage.classList.add("is-switching"); state.transitionTimer = setTimeout(apply, 280); }
  else apply();
}
function updateFlowerDialog() {
  const uploaded = stage.classList.contains("has-image");
  const flower = uploaded ? { label: "本机上传 · 自定义花朵", short: "你上传的花朵", image: state.customUrl, intro: "这是你刚刚加入 FLORA 的花朵素材。", facts: [["来源", "你在本机选择的图片文件"], ["控制方式", "单张静态图 · 手势控制大小"]], detail: "网页会在本机浏览器中展示这张图片；由于只有一张静态图，手势控制的是大小变化，而不是逐帧花瓣形变。若想获得真正的开合过程，需要提供花苞与盛开素材或一段开合视频。" } : FLOWERS[state.species];
  $("#dialog-flower-number").textContent = uploaded ? "FLORA / YOUR FLOWER" : `FLORA / ${String(state.species + 1).padStart(2, "0")}`;
  $("#dialog-flower-label").textContent = flower.label;
  $("#dialog-flower-name").textContent = flower.short;
  $("#dialog-flower-image").src = flower.image;
  $("#dialog-flower-image").alt = `${flower.short}盛开的图像`;
  $("#dialog-flower-intro").textContent = flower.intro;
  $("#dialog-flower-facts").innerHTML = (flower.facts || []).map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join("");
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
  note.textContent = `${FLOWERS[state.species].short}的缓缓呼吸`;
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
