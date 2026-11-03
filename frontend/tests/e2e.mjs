import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const backendRoot = path.join(repoRoot, 'backend');
const frontendRoot = path.join(repoRoot, 'frontend');
const testRoot = '/tmp/opencode/portfolio-e2e';
const dbPath = path.join(testRoot, 'portfolio.db');
const serverBinary = path.join(testRoot, 'portfolio-server');
const previewUrl = 'http://127.0.0.1:4321';
const apiUrl = 'http://127.0.0.1:8080';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function kill(processHandle) {
  if (!processHandle || processHandle.killed) return;
  try {
    processHandle.kill('SIGTERM');
  } catch {}
}

async function main() {
  rmSync(testRoot, { recursive: true, force: true });
  mkdirSync(testRoot, { recursive: true });

  execFileSync('/usr/local/go/bin/go', ['run', './cmd/import', '-db', dbPath, '-dir', '../content'], {
    cwd: backendRoot,
    stdio: 'inherit',
  });
  execFileSync('/usr/local/go/bin/go', ['build', '-o', serverBinary, './cmd/server'], {
    cwd: backendRoot,
    stdio: 'inherit',
  });

  const backend = spawn(serverBinary, [], {
    env: {
      ...process.env,
      PORTFOLIO_ADDR: '127.0.0.1:8080',
      PORTFOLIO_DB: dbPath,
      PORTFOLIO_ADMIN_TOKEN: 'phase-6-test-token',
      PORTFOLIO_CONTACT_ORIGINS: 'http://127.0.0.1:4321',
    },
    stdio: 'ignore',
  });
  let preview;

  try {
    await waitForUrl(`${apiUrl}/healthz`);
    execFileSync('npm', ['run', 'build'], {
      cwd: frontendRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        CONTENT_API_URL: apiUrl,
        PUBLIC_CONTACT_API_URL: `${apiUrl}/api/v1/contact`,
      },
    });

    preview = spawn('node', ['node_modules/astro/bin/astro.mjs', 'preview', '--host', '127.0.0.1', '--port', '4321'], {
      cwd: frontendRoot,
      stdio: 'ignore',
    });
    await waitForUrl(`${previewUrl}/id/`);

    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    async function assertNoHorizontalOverflow(route, width) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${previewUrl}${route}`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      assert.equal(overflow, false, `${route} overflows at ${width}px`);
    }

    const routes = [
      '/id/', '/en/', '/id/tentang/', '/en/about/', '/id/proyek/', '/en/projects/',
      '/id/proyek/lampu-terjadwal-arduino/', '/en/projects/scheduled-lighting-arduino/',
      '/id/keahlian/', '/en/expertise/', '/id/blog/', '/en/blog/',
      '/id/blog/memasang-lampu-terjadwal-arduino/', '/en/blog/scheduled-lighting-with-arduino/',
      '/id/kontak/', '/en/contact/',
    ];

    // Responsive layout: no horizontal scroll at the required widths.
    for (const width of [320, 768, 1024, 1440]) {
      for (const route of routes) {
        await assertNoHorizontalOverflow(route, width);
      }
    }

    // CLS: keep layout shift below the 0.1 target on a representative page.
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(`${previewUrl}/id/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const cls = await page.evaluate(() => window.__cls);
    assert.ok(cls < 0.1, `home CLS is ${cls}`);

    // Reduced motion disables non-essential animation.
    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(`${previewUrl}/id/`);
    const duration = await reducedPage.locator('.hero-rise').first().evaluate(
      (element) => getComputedStyle(element).animationDuration,
    );
    assert.ok(parseFloat(duration) <= 0.0001, `reduced-motion duration is ${duration}`);
    assert.equal(await reducedPage.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    await reducedPage.close();

    // Language switcher preserves localized detail routes.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${previewUrl}/id/proyek/lampu-terjadwal-arduino/`);
    await page.locator('a[hreflang="en"]').click();
    await page.waitForURL(/\/en\/projects\/scheduled-lighting-arduino\//);
    assert.match(await page.locator('h1').textContent(), /Scheduled Automatic Lighting/);
    await page.locator('a[hreflang="id"]').click();
    await page.waitForURL(/\/id\/proyek\/lampu-terjadwal-arduino\//);

    // Mobile menu: mouse, touch, and keyboard.
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobile.newPage();
    const mobileErrors = [];
    mobilePage.on('console', (message) => {
      if (message.type() === 'error') mobileErrors.push(message.text());
    });
    mobilePage.on('pageerror', (error) => mobileErrors.push(error.message));
    await mobilePage.goto(`${previewUrl}/id/`);

    const trigger = mobilePage.locator('button[aria-label="Buka menu navigasi"]');
    const dialog = mobilePage.locator('#mobile-navigation');
    const close = mobilePage.locator('button[aria-label="Tutup menu navigasi"]');

    await trigger.click();
    await dialog.waitFor({ state: 'visible' });
    await close.click();
    await dialog.waitFor({ state: 'hidden' });

    const box = await trigger.boundingBox();
    await mobilePage.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await dialog.waitFor({ state: 'visible' });
    const closeButtonBox = await close.boundingBox();
    await mobilePage.touchscreen.tap(closeButtonBox.x + closeButtonBox.width / 2, closeButtonBox.y + closeButtonBox.height / 2);
    await dialog.waitFor({ state: 'hidden' });

    await trigger.focus();
    await mobilePage.keyboard.press('Enter');
    await dialog.waitFor({ state: 'visible' });
    await close.focus();
    await mobilePage.keyboard.press('Tab');
    const firstFocused = await mobilePage.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    assert.equal(firstFocused, 'Buka menu navigasi', 'Tab should wrap from close to trigger');
    await close.focus();
    await mobilePage.keyboard.press('Shift+Tab');
    const lastFocused = await mobilePage.evaluate(() => document.activeElement?.href);
    assert.match(lastFocused ?? '', /\/en\/$/, 'Shift+Tab should wrap from close to the last language link');
    await mobilePage.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await mobilePage.waitForFunction(
      () => document.activeElement?.getAttribute('aria-label') === 'Buka menu navigasi',
    );
    assert.equal(mobileErrors.length, 0, mobileErrors.join('\n'));
    await mobilePage.close();

    // Contact form: client validation, network failure, and a successful submit.
    const contactPage = await context.newPage();
    await contactPage.goto(`${previewUrl}/en/contact/`);
    await contactPage.click('button[type="submit"]');
    await contactPage.locator('[role="alert"]').waitFor();
    assert.match(await contactPage.locator('[name="name"]').evaluate((el) => el.getAttribute('aria-invalid')), /true/);
    await contactPage.fill('[name="name"]', 'Phase Six Test');
    await contactPage.fill('[name="email"]', 'invalid-email');
    await contactPage.fill('[name="message"]', 'This message is long enough to pass validation.');
    await contactPage.click('button[type="submit"]');
    await contactPage.locator('[role="alert"]').waitFor();
    assert.match(await contactPage.locator('[name="email"]').evaluate((el) => el.getAttribute('aria-invalid')), /true/);

    await contactPage.fill('[name="email"]', 'phase-six@example.com');
    await contactPage.route('**/api/v1/contact', (route) => route.abort());
    await contactPage.click('button[type="submit"]');
    await contactPage.locator('[role="alert"]').waitFor();
    assert.match(await contactPage.locator('[role="alert"]').textContent(), /Could not connect/);
    await contactPage.unroute('**/api/v1/contact');

    await contactPage.fill('[name="subject"]', 'E2E submission');
    await contactPage.click('button[type="submit"]');
    await contactPage.locator('[role="status"]').waitFor();
    assert.match(await contactPage.locator('[role="status"]').textContent(), /msg_[0-9a-f]{32}/);

    assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'));

    // The successful submission is the only row in the isolated test database.
    const stored = execFileSync('python3', [
      '-c',
      "import sqlite3,sys; con=sqlite3.connect(sys.argv[1]); print(con.execute('select count(*) from contact_submissions').fetchone()[0])",
      dbPath,
    ], { encoding: 'utf8' }).trim();
    assert.equal(stored, '1', `expected one stored submission, got ${stored}`);

    await contactPage.close();
    await context.close();
    await browser.close();
    console.log('Phase 6 browser checks passed.');
  } finally {
    kill(preview);
    kill(backend);
    rmSync(testRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
