from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, **({"executable_path": str(EDGE)} if EDGE.exists() else {}))
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:5176/?debug=1&wither=1", wait_until="domcontentloaded")
    page.evaluate("() => window.__floraDebug.selectFlower(3, false)")
    page.wait_for_timeout(500)
    page.evaluate("() => { window.__qaWilt = window.__floraDebug.wither(); }")
    page.wait_for_timeout(1500)
    page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withering')", timeout=10000)
    page.wait_for_timeout(900)
    page.screenshot(path=str(ROOT / "qa" / "lily-wilt-start.png"))
    page.wait_for_timeout(4800)
    page.screenshot(path=str(ROOT / "qa" / "lily-wilt-middle.png"))
    page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withered')", timeout=12000)
    page.screenshot(path=str(ROOT / "qa" / "lily-wilt-end.png"))
    page.evaluate("() => window.__floraDebug.selectFlower(1, false)")
    assert not page.locator("#bloom-stage").evaluate("el => el.classList.contains('is-withered')")
    assert not errors, errors
    browser.close()
print("lily wilt mobile QA OK")
