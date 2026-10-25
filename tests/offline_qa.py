from pathlib import Path
from playwright.sync_api import sync_playwright


EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
BASE = "http://127.0.0.1:5176/"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        **({"executable_path": str(EDGE)} if EDGE.exists() else {}),
    )
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="allow", permissions=["camera"])
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + "?debug=1", wait_until="domcontentloaded")
    page.locator("#offline-button").wait_for(state="visible")
    page.locator("#offline-button").click()
    page.wait_for_function("document.querySelector('#offline-button').textContent === '已可离线使用'", timeout=180000)
    context.set_offline(True)
    page.goto(BASE + "?debug=1&wither=1", wait_until="domcontentloaded")
    page.wait_for_function("Boolean(window.__floraDebug)")
    for number in range(5):
        page.evaluate("number => window.__floraDebug.selectFlower(number, false)", number)
        page.wait_for_function("document.querySelector('#bloom-animation').complete && document.querySelector('#bloom-animation').naturalWidth > 0")
    assert page.evaluate("async () => (await fetch('./assets/mediapipe/hand_landmarker.task')).ok")
    assert page.evaluate("async () => (await fetch('./assets/mediapipe/wasm/vision_wasm_internal.wasm')).ok")
    page.locator("#camera-button").click()
    page.wait_for_function("window.__floraDebug.bloomState.mode === 'camera'", timeout=45000)
    assert not errors, errors
    browser.close()
print("offline QA OK: site, five flowers, lily frames and camera tracking")
