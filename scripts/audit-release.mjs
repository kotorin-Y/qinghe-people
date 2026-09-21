import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const excluded = new Set(['node_modules', '.git', '.npm-cache', 'test-results', 'playwright-report']);
const failures = [];
let count = 0;
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const file = join(dir, item.name);
    if (item.isDirectory()) { walk(file); continue; }
    count++;
    if (/\.(sqlite|db|log|map)$/i.test(item.name) || (item.name.startsWith('.env') && item.name !== '.env.example')) failures.push(relative('.', file) + ': private/generated file');
    if (!/\.(vue|ts|js|mjs|css|html|json|md|yaml|yml|cmd|sh|svg)$/.test(item.name)) continue;
    const text = readFileSync(file, 'utf8');
    if (/[A-Z]:[\\/](?:Users|Documents and Settings|Program Files)[\\/]/i.test(text) || /\/(?:Users|home)\/[^\s/]+\//.test(text)) failures.push(relative('.', file) + ': machine path');
    if (/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/.test(text)) failures.push(relative('.', file) + ': credential pattern');
    if (/[/][/][#@]\s*sourceMappingURL\s*=/.test(text)) failures.push(relative('.', file) + ': source map');
  }
}
walk('.');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Release scan passed: ' + count + ' files; no machine paths, credentials, databases or source maps detected.');
