/* Same-origin cache: an optional, explicit offline download, not a promise
 * that GitHub Pages is reachable on every network. */
const CACHE_NAME = "flora-offline-v4";
const scope = self.registration.scope;
const local = (path) => new URL(path, scope).href;
const shell = [
  "./", "./index.html", "./studies.html", "./poetry.html", "./collection.html",
  "./garden.js", "./gesture-core.js", "./wither.js", "./wither-cycle.js",
  "./styles.css", "./pages.css", "./fonts.local.css",
  "./assets/favicon.svg", "./assets/pink-bloom-open.webp", "./assets/white-camellias.webp",
];
const frames = ["frames", "seedance/white", "seedance/purple", "seedance/lily", "seedance/peony", "seedance/blush-peony"]
  .flatMap((folder) => Array.from({ length: 29 }, (_, i) =>
    `./assets/${folder}/flower_${String(i).padStart(2, "0")}.webp`));
const lilyWilt = Array.from({ length: 81 }, (_, i) =>
  `./assets/wither/lily/wilt_${String(i).padStart(3, "0")}.webp`);
const mediapipe = [
  "./assets/mediapipe/tasks-vision.mjs",
  "./assets/mediapipe/hand_landmarker.task",
  "./assets/mediapipe/wasm/vision_wasm_internal.js",
  "./assets/mediapipe/wasm/vision_wasm_internal.wasm",
  "./assets/mediapipe/wasm/vision_wasm_nosimd_internal.js",
  "./assets/mediapipe/wasm/vision_wasm_nosimd_internal.wasm",
];
const offlineFiles = [...shell, ...frames, ...lilyWilt, ...mediapipe];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(shell)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("flora-offline-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cached assets start immediately even on a slow or captive network.
    // Navigations still try the network first so fresh page versions are seen.
    if (request.mode !== "navigate") {
      const cachedAsset = await cache.match(request, { ignoreSearch: true });
      if (cachedAsset) return cachedAsset;
    }
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === "navigate") {
        const fallback = await cache.match(local("./index.html"));
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE" || !event.ports?.[0]) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const fontsCss = await (await cache.match(local("./fonts.local.css"))).text();
    const fontPaths = [...fontsCss.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1].replace(/["']/g, "").trim());
    const files = [...new Set([...offlineFiles, ...fontPaths])];
    let completed = 0;
    for (const path of files) {
      const url = local(path);
      if (!(await cache.match(url))) {
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok) throw new Error(`Could not cache ${path}: ${response.status}`);
        await cache.put(url, response);
      }
      completed += 1;
      if (completed % 10 === 0 || completed === files.length) {
        port.postMessage({ type: "progress", completed, total: files.length });
      }
    }
    port.postMessage({ type: "ready" });
  })().catch((error) => port.postMessage({ type: "error", message: String(error) })));
});
