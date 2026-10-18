import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { configuredOrigin, publicPages } from '../src/lib/seo';
const origin = configuredOrigin(process.env);
for (const [path, page] of Object.entries(publicPages)) {
  const html = await readFile(
    `dist${path === '/' ? '' : path}/index.html`,
    'utf8',
  );
  assert.equal(
    (html.match(/<title>/g) ?? []).length,
    1,
    `Unique title: ${path}`,
  );
  assert.ok(
    html.includes(page.title.replace(/&/g, '&amp;')),
    `Correct title: ${path}`,
  );
  assert.ok(html.includes('<h1'), `Rendered main heading: ${path}`);
  assert.ok(
    !html.includes('<div id="root"></div>'),
    `HTML content without JavaScript: ${path}`,
  );
  assert.equal(
    html.includes('rel="canonical"'),
    !!origin,
    `Canonical domain policy: ${path}`,
  );
  if (origin) assert.ok(html.includes(`${origin}${path}`));
}
for (const path of ['analytics', 'settings', 'replays']) {
  const html = await readFile(`dist/${path}/index.html`, 'utf8');
  assert.ok(html.includes('noindex,nofollow'));
  assert.ok(!html.includes('rel="canonical"'));
}
if (origin) {
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  assert.equal(
    (sitemap.match(/<loc>/g) ?? []).length,
    Object.keys(publicPages).length,
  );
  assert.ok(!sitemap.includes('/room/'));
}
console.log(
  'Static HTML, metadata, canonical policy, and private-page indexing checks passed.',
);
