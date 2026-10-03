import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const { chromium } = await import('/tmp/kisok-browser-tools/node_modules/playwright/index.mjs');
const origin = 'http://localhost:3000';
const server = spawn('pnpm', ['start'], { stdio: 'ignore', detached: true });
let browser;

try {
  let available = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(origin + '/manifest.webmanifest')).ok) {
        available = true;
        break;
      }
    } catch {
      // Wait for the production server to bind its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(available, 'Production server did not start');
  const response = await fetch(origin + '/manifest.webmanifest');
  const manifest = await response.json();
  assert.equal(manifest.name, 'KISOK Admin');
  assert.equal(manifest.start_url, '/en/admin');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const result = await fetch(origin + icon.src);
    assert(result.ok, 'PWA icon did not render');
    assert.match(result.headers.get('content-type'), /image\/png/);
    const bytes = new Uint8Array(await result.arrayBuffer());
    assert.equal(bytes[0], 137, 'Icon must be a real PNG');
  }
  const worker = await fetch(origin + '/sw.js');
  assert(worker.ok);
  assert.match(worker.headers.get('cache-control'), /no-store/);
  assert.match(worker.headers.get('content-type'), /javascript/);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(origin + '/en/login');
  const registration = await page.evaluate(async () => {
    const result = await navigator.serviceWorker.ready;
    return { scope: result.scope, script: result.active?.scriptURL };
  });
  assert.equal(registration.scope, origin + '/');
  assert.equal(registration.script, origin + '/sw.js');
  assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), '/manifest.webmanifest');
  assert.deepEqual(await page.evaluate(() => caches.keys()), []);
  console.log('PASS: production-build manifest, PNG icons, worker headers, browser registration, no caches');
} finally {
  await browser?.close();
  if (server.pid) process.kill(-server.pid, 'SIGTERM');
}
