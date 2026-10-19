from pathlib import Path
from playwright.sync_api import sync_playwright


BASE = "http://127.0.0.1:5176/?debug=1&wither=1"
OUTPUT = Path(__file__).resolve().parents[1] / "qa"
OUTPUT.mkdir(exist_ok=True)
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, **({"executable_path": str(EDGE)} if EDGE.exists() else {}))
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    failures = []
    page.on("pageerror", lambda error: failures.append(str(error)))
    response = page.goto(BASE, wait_until="domcontentloaded")
    assert response and response.status == 200
    assert page.locator("#flower-title").is_visible()
    for number in (1, 2, 4, 5):
        page.evaluate("number => window.__floraDebug.selectFlower(number - 1, false)", number)
        page.wait_for_timeout(350)
        page.evaluate("() => { window.__qaWilt = window.__floraDebug.wither(); return true; }")
        page.wait_for_timeout(1000)
        assert page.locator("#bloom-stage").evaluate("el => el.classList.contains('is-withering')")
        page.screenshot(path=str(OUTPUT / f"flower-{number}-wilt-start.png"))
        page.wait_for_timeout(4600)
        page.screenshot(path=str(OUTPUT / f"flower-{number}-wilt-late.png"))
        page.wait_for_timeout(1500)
        page.screenshot(path=str(OUTPUT / f"flower-{number}-wilt-falling.png"))
        page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withered')", timeout=12000)
        page.screenshot(path=str(OUTPUT / f"flower-{number}-wilt-final.png"))
        page.evaluate("() => window.__floraDebug.abortWither()")
    page.evaluate("() => window.__floraDebug.selectFlower(0, false)")
    page.wait_for_timeout(350)
    page.evaluate("() => { window.__floraDebug.wither(); return true; }")
    page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withering')")
    page.evaluate("() => window.__floraDebug.selectFlower(1, false)")
    assert not page.locator("#bloom-stage").evaluate("el => el.classList.contains('is-withering')")
    page.wait_for_timeout(500)
    assert page.locator("#flower-title").inner_text().startswith("白山茶")
    assert not failures, failures

    page.goto(BASE + "&flower=3", wait_until="domcontentloaded")
    page.locator("#demo-button").click()
    page.wait_for_function("window.__floraDebug.bloomState.withering", timeout=32000)
    assert page.evaluate("window.__floraDebug.bloomState.cycles") == 2
    page.locator("#demo-button").click()
    assert not failures, failures
    browser.close()
print("mobile browser wither QA OK")
