import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const targets = ['index.html', 'sw.js', 'src/v3'];
const files = [];

async function collect(path) {
  const url = new URL(path, root);
  const info = await stat(url);
  if (info.isDirectory()) {
    for (const name of await readdir(url)) await collect(`${path}/${name}`);
    return;
  }
  if (/\.(?:js|html|css)$/.test(path)) files.push(path);
}
for (const target of targets) await collect(target);

const rules = [
  { name: 'production console.log', pattern: /\bconsole\.log\s*\(/ },
  { name: 'eval', pattern: /\beval\s*\(/ },
  { name: 'new Function', pattern: /\bnew\s+Function\s*\(/ },
  { name: 'innerHTML', pattern: /\.innerHTML\b/ },
  { name: 'document.write', pattern: /\bdocument\.write\s*\(/ },
  { name: 'hard-coded API secret', pattern: /\b(?:OPENAI|ANTHROPIC|GEMINI|AI)_API_KEY\s*=\s*['"][^'"]+['"]/i }
];
const violations = [];
for (const path of files) {
  const text = await readFile(new URL(path, root), 'utf8');
  for (const rule of rules) if (rule.pattern.test(text)) violations.push(`${path}: ${rule.name}`);
  if (path.endsWith('.html') && /\son[a-z]+\s*=\s*['"]/i.test(text)) violations.push(`${path}: inline event handler`);
}
if (violations.length) {
  console.error(`Lint failed:\n${violations.map(v => `- ${v}`).join('\n')}`);
  process.exit(1);
}
console.info(`Lint passed (${files.length} production files scanned).`);
