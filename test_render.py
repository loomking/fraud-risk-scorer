from playwright.sync_api import sync_playwright
import os

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.on('console', lambda msg: print(f'BROWSER_CONSOLE: {msg.text}'))
    page.on('pageerror', lambda err: print(f'PAGE_ERROR: {err}'))
    
    file_url = f'file://{os.path.abspath("frontend/index.html")}'
    print(f"Navigating to {file_url}")
    page.goto(file_url)
    page.wait_for_timeout(2000)
    browser.close()
