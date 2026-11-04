import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const backendRoot = path.join(repoRoot, 'backend');
const frontendRoot = path.join(repoRoot, 'frontend');
const testRoot = '/tmp/opencode/portfolio-e2e';
const dbPath = path.join(testRoot, 'portfolio.db');
const serverBinary = path.join(testRoot, 'portfolio-server');
// Dedicated ports keep the test isolated when a development server is already
// running on the usual frontend/backend ports.
const previewUrl = 'http://127.0.0.1:4322';
const apiUrl = 'http://127.0.0.1:18081';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Astro dev/preview servers pick the next free port when theirs is taken, so a
 * leaked server can silently answer on the test port with stale content.
 * Refuse to start instead of testing the wrong process.
 */
async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error) => {
      reject(
        new Error(
          `Port ${port} is already in use (${error.code}). Stop the process using it before running the E2E suite.`,
        ),
      );
    });
    server.once('listening', () => server.close(resolve));
    server.listen(port, '127.0.0.1');
  });
}

function spawnLogged(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.output = '';
  const collect = (chunk) => {
    child.output = `${child.output}${chunk}`.slice(-8000);
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  return child;
}

async function waitForServer(url, child, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `${label} exited with code ${child.exitCode} before ${url} was ready.\n${child.output}`,
      );
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}\n${child.output}`);
}

function kill(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return;
  try {
    // Negative pid signals the whole detached process group.
    process.kill(-processHandle.pid, 'SIGTERM');
  } catch {
    try {
      processHandle.kill('SIGTERM');
    } catch {}
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Serve `dist/` directly. `astro preview` daemonises itself, which leaks
 * background servers that keep answering on the test port after a run.
 */
function startStaticServer(root, port) {
  return new Promise((resolve, reject) => {
    const server = createHttpServer((request, response) => {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
      } catch {
        response.writeHead(400).end();
        return;
      }

      const file = path.resolve(root, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
      if (!file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }

      let isFile = false;
      try {
        isFile = statSync(file).isFile();
      } catch {}
      if (!isFile) {
        response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(readFileSync(path.join(root, '404.html')));
        return;
      }

      response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(file)] ?? 'application/octet-stream',
      });
      response.end(readFileSync(file));
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  rmSync(testRoot, { recursive: true, force: true });
  mkdirSync(testRoot, { recursive: true });

  await assertPortFree(4322);
  await assertPortFree(18081);

  execFileSync('/usr/local/go/bin/go', ['run', './cmd/import', '-db', dbPath, '-dir', '../content'], {
    cwd: backendRoot,
    stdio: 'inherit',
  });
  execFileSync('/usr/local/go/bin/go', ['build', '-o', serverBinary, './cmd/server'], {
    cwd: backendRoot,
    stdio: 'inherit',
  });

  const backend = spawnLogged(serverBinary, [], {
    env: {
      ...process.env,
      PORTFOLIO_ADDR: '127.0.0.1:18081',
      PORTFOLIO_DB: dbPath,
      PORTFOLIO_ADMIN_TOKEN: 'phase-6-test-token',
      PORTFOLIO_CONTACT_ORIGINS: 'http://127.0.0.1:4322',
    },
  });
  let previewServer;
  let browser;

  try {
    await waitForServer(`${apiUrl}/healthz`, backend, 'Backend');
    execFileSync('npm', ['run', 'build'], {
      cwd: frontendRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        CONTENT_API_URL: apiUrl,
        PUBLIC_CONTACT_API_URL: `${apiUrl}/api/v1/contact`,
      },
    });

    previewServer = await startStaticServer(path.join(frontendRoot, 'dist'), 4322);

    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
    browser = await chromium.launch({ headless: true });
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
      '/id/proyek/homelab-server-berbasis-android/', '/en/projects/android-based-self-hosted-homelab/',
      '/id/keahlian/', '/en/expertise/', '/id/blog/', '/en/blog/',
      '/id/blog/memasang-lampu-terjadwal-arduino/', '/en/blog/scheduled-lighting-with-arduino/',
      '/id/blog/membangun-homelab-server-android-termux-go-cloudflare/',
      '/en/blog/building-android-homelab-server-termux-go-cloudflare/',
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

    const idLanguageNav = page.getByRole('navigation', {
      name: 'Pilih bahasa',
      exact: true,
    });

    const englishLink = idLanguageNav.locator('a[hreflang="en"]');

    assert.equal(
      await englishLink.count(),
      1,
      'Expected exactly one English link in Indonesian language switcher',
    );

    await englishLink.click();

    await page.waitForURL(/\/en\/projects\/scheduled-lighting-arduino\//);

    assert.match(
      await page.locator('h1').textContent(),
      /Scheduled Automatic Lighting/,
    );

    const enLanguageNav = page.getByRole('navigation', {
      name: 'Select language',
      exact: true,
    });

    const indonesianLink = enLanguageNav.locator('a[hreflang="id"]');

    assert.equal(
      await indonesianLink.count(),
      1,
      'Expected exactly one Indonesian link in English language switcher',
    );

    await indonesianLink.click();

    await page.waitForURL(/\/id\/proyek\/lampu-terjadwal-arduino\//);



    // Mobile menu: mouse, touch, and keyboard.
    
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });

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
    const firstFocusable = mobilePage.locator('#mobile-navigation a[href="/id/"]').first();
    const lastFocusable = mobilePage.locator('#mobile-navigation a[hreflang="en"]').first();
    await lastFocusable.focus();
    await mobilePage.keyboard.press('Tab');
    const wrappedForward = await mobilePage.evaluate(() => document.activeElement?.getAttribute('href'));
    assert.equal(wrappedForward, '/id/', 'Tab should wrap from the last focusable to the first');
    await firstFocusable.focus();
    await mobilePage.keyboard.press('Shift+Tab');
    const wrappedBackward = await mobilePage.evaluate(() => document.activeElement?.href);
    assert.match(wrappedBackward ?? '', /\/en\/$/, 'Shift+Tab should wrap from the first focusable to the last');
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

    // Browser admin: create, edit, and delete both content collections.
    const adminPage = await context.newPage();
    const adminErrors = [];
    adminPage.on('console', (message) => {
      if (message.type() === 'error') adminErrors.push(message.text());
    });
    adminPage.on('pageerror', (error) => adminErrors.push(error.message));
    await adminPage.goto(`${apiUrl}/admin/`, { waitUntil: 'networkidle' });
    await adminPage.fill('#token-input', 'phase-6-test-token');
    await adminPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await adminPage.locator('#workspace').waitFor({ state: 'visible' });

    await adminPage.getByRole('button', { name: 'New project', exact: true }).click();
    let editor = adminPage.locator('#editor-dialog');
    await editor.locator('#entry-slug').fill('e2e-admin-project');
    await editor.locator('#entry-translation-key').fill('e2e-admin-project');
    await editor.locator('#field-title').fill('E2E Admin Project');
    await editor.locator('#field-summary').fill('Created by the isolated browser admin test.');
    await editor.locator('#field-category').fill('Testing');
    await editor.locator('#field-focus').fill('CRUD');
    await editor.locator('#field-status').fill('Complete');
    await editor.locator('#field-overview').fill('Browser administration works end to end.');
    await editor.locator('#entry-body').fill('Initial **Markdown** body.');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await adminPage.getByRole('heading', { name: 'E2E Admin Project', exact: true }).waitFor();

    await adminPage.getByRole('button', { name: 'Edit E2E Admin Project', exact: true }).click();
    await editor.locator('#field-title').fill('E2E Admin Project Updated');
    await editor.locator('#entry-body').fill('Updated Markdown body.');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await adminPage.getByRole('heading', { name: 'E2E Admin Project Updated', exact: true }).waitFor();

    await adminPage.getByRole('button', { name: 'Blog articles', exact: true }).click();
    await adminPage.getByRole('button', { name: 'New blog article', exact: true }).click();
    await editor.locator('#entry-slug').fill('e2e-admin-article');
    await editor.locator('#entry-translation-key').fill('e2e-admin-article');
    await editor.locator('#field-title').fill('E2E Admin Article');
    await editor.locator('#field-description').fill('Created by the isolated browser admin test.');
    await editor.locator('#field-category').fill('Testing');
    await editor.locator('#field-tags').fill('Browser\nCRUD');
    await editor.locator('#entry-body').fill('Article Markdown body.');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    const articleCard = adminPage.locator('.entry-card').filter({ hasText: 'E2E Admin Article' });
    await articleCard.waitFor();
    assert.match(await articleCard.textContent(), /Draft/);

    await adminPage.getByRole('button', { name: 'Edit E2E Admin Article', exact: true }).click();
    await editor.locator('#field-title').fill('E2E Admin Article Updated');
    await editor.locator('#field-draft').uncheck();
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await adminPage.getByRole('heading', { name: 'E2E Admin Article Updated', exact: true }).waitFor();

    adminPage.once('dialog', (dialog) => dialog.accept());
    await adminPage.getByRole('button', { name: 'Delete E2E Admin Article Updated', exact: true }).click();
    await adminPage.getByRole('heading', { name: 'E2E Admin Article Updated', exact: true }).waitFor({ state: 'detached' });

    await adminPage.getByRole('button', { name: 'Projects', exact: true }).click();
    adminPage.once('dialog', (dialog) => dialog.accept());
    await adminPage.getByRole('button', { name: 'Delete E2E Admin Project Updated', exact: true }).click();
    await adminPage.getByRole('heading', { name: 'E2E Admin Project Updated', exact: true }).waitFor({ state: 'detached' });
    assert.equal(adminErrors.length, 0, adminErrors.join('\n'));
    await adminPage.close();

    await context.close();
    await browser.close();
    console.log('Phase 6 browser checks passed, including admin CRUD.');
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    kill(backend);
    if (previewServer) {
      previewServer.closeAllConnections?.();
      await new Promise((resolve) => previewServer.close(resolve));
    }
    rmSync(testRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
