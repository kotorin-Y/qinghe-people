import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

test('packaged runtime starts outside its project directory and serves only public build files', async () => {
  const child = spawn(process.execPath, [resolve('scripts/serve.mjs')], { cwd: resolve('..'), env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const url = await new Promise((ok, fail) => {
      const timeout = setTimeout(() => fail(new Error('Startup timeout')), 10000);
      child.once('error', fail);
      child.once('exit', code => { clearTimeout(timeout); fail(new Error(`Unexpected exit ${code}`)); });
      child.stdout.on('data', chunk => { const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timeout); ok(match[0]); } });
    });
    const home = await fetch(url); assert.equal(home.status, 200);
    const html = await home.text();
    const asset = html.match(/src="([^"]+\.js)"/)[1];
    const js = await fetch(new URL(asset, url + '/')); assert.equal(js.status, 200); assert.match(js.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(url, { method: 'HEAD' })).headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
    for (const path of ['/package.json', '/src/main.ts', '/.env', '/%2e%2e%5cpackage.json', '/%00', '/missing.js']) assert.equal((await fetch(url + path)).status, 404);
  } finally { child.kill(); }
});
