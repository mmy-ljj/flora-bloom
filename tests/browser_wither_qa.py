from pathlib import Path
from playwright.sync_api import sync_playwright


EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
BASE = "http://127.0.0.1:5176/?debug=1&wither=1"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, **({"executable_path": str(EDGE)} if EDGE.exists() else {}))
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until="domcontentloaded")
    for number in (0, 1, 2, 4):
        page.evaluate("number => window.__floraDebug.selectFlower(number, false)", number)
        page.wait_for_timeout(200)
        assert page.evaluate("window.__floraDebug.wither()") is False
        page.locator("#demo-button").click()
        page.wait_for_timeout(800)
        assert not page.locator("#bloom-stage").evaluate("el => el.classList.contains('is-withering')")
        assert not page.locator("#bloom-stage").evaluate("el => el.classList.contains('is-withered')")
        page.locator("#demo-button").click()
    page.evaluate("() => window.__floraDebug.selectFlower(3, false)")
    page.wait_for_timeout(200)
    page.evaluate("() => { window.__qaWilt = window.__floraDebug.wither(); }")
    page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withering')")
    page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withered')", timeout=15000)
    assert not errors, errors
    browser.close()
print("mobile QA OK: only pink lily withers")
