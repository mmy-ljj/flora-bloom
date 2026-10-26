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
    for number in (0, 1):
        page.evaluate("number => window.__floraDebug.selectFlower(number, false)", number)
        page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-smooth')", timeout=12000)
        signatures = []
        for frame in (0, 0.5, 1):
            signatures.append(page.evaluate("frame => { window.__floraDebug.setOpenness(1 - frame / 28); const data = document.querySelector('.bloom-smooth-layer').getContext('2d').getImageData(0, 0, document.querySelector('.bloom-smooth-layer').width, document.querySelector('.bloom-smooth-layer').height).data; let total = 0; for (let i = 0; i < data.length; i += 97) total += data[i] * ((i % 7) + 1); return total; }", frame))
            if frame == 0.5:
                page.screenshot(path=str(Path(__file__).resolve().parents[1] / "qa" / f"smooth-{number + 1}.png"))
        assert len(set(signatures)) == 3, f"flower {number + 1} has no distinct in-between frame"
        opacity = page.evaluate("""() => {
          const canvas = document.querySelector('.bloom-smooth-layer');
          const context = canvas.getContext('2d');
          const alpha = frame => {
            window.__floraDebug.setOpenness(1 - frame / 28);
            return context.getImageData(0, 0, canvas.width, canvas.height).data;
          };
          const start = alpha(0), end = alpha(1), middle = alpha(.5);
          let common = 0, lowest = 255;
          for (let i = 3; i < start.length; i += 4) {
            if (start[i] > 250 && end[i] > 250) {
              common++;
              lowest = Math.min(lowest, middle[i]);
            }
          }
          return { common, lowest };
        }""")
        assert opacity["common"] > 100, f"flower {number + 1} has no common opaque pixels"
        assert opacity["lowest"] >= 250, f"flower {number + 1} fades during frame blending: {opacity}"
    for number in (0, 1, 2, 4, 5):
        page.evaluate("number => window.__floraDebug.selectFlower(number, false)", number)
        page.wait_for_timeout(200)
        assert page.evaluate("window.__floraDebug.wither()") is False
        page.locator("#demo-button").click()
        page.wait_for_timeout(800)
        assert not page.locator("#bloom-stage").evaluate("el => el.classList.contains('is-withering')")
        assert not page.locator("#bloom-stage").evaluate("el => el.classList.contains('is-withered')")
        page.locator("#demo-button").click()
    page.evaluate("() => window.__floraDebug.selectFlower(4, false)")
    page.evaluate("() => window.__floraDebug.setOpenness(1)")
    page.wait_for_function("document.querySelector('#bloom-animation').complete && document.querySelector('#bloom-animation').naturalWidth === 480")
    assert "peony/flower_00.webp" in page.locator("#bloom-animation").get_attribute("src")
    page.screenshot(path=str(Path(__file__).resolve().parents[1] / "qa" / "fifth-replacement-mobile.png"))
    page.evaluate("() => window.__floraDebug.setOpenness(0)")
    assert "peony/flower_28.webp" in page.locator("#bloom-animation").get_attribute("src")
    page.evaluate("() => window.__floraDebug.selectFlower(3, false)")
    page.wait_for_timeout(200)
    page.evaluate("() => { window.__qaWilt = window.__floraDebug.wither(); }")
    page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withering')")
    page.wait_for_function("document.querySelector('#bloom-stage').classList.contains('is-withered')", timeout=15000)
    page.goto(BASE + "&flower=6", wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#flower-title').textContent.includes('浅粉重瓣芍药')")
    page.screenshot(path=str(Path(__file__).resolve().parents[1] / "qa" / "sixth-mobile.png"))
    page.locator("#flower-info-button").click()
    assert "Paeonia" in page.locator("#flower-dialog").inner_text()
    assert not errors, errors
    browser.close()
print("mobile QA OK: only pink lily withers")
