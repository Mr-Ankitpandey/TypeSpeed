import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { App } from '../src/App';
import {
  publicPages,
  pageMeta,
  configuredOrigin,
  structuredData,
} from '../src/lib/seo';

const origin = configuredOrigin(process.env);
const dist = resolve('dist');
const template = await readFile(resolve(dist, 'index.html'), 'utf8');
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const paths = [
  ...Object.keys(publicPages),
  '/analytics',
  '/settings',
  '/replays',
  '/insights',
  '/play',
  '/404',
];
for (const path of paths) {
  const meta = pageMeta(path);
  const canonical = origin && meta.index ? origin + path : '';
  const schema = canonical ? structuredData(path, origin) : null;
  const head = `<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"><meta name="robots" content="${meta.index && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production') ? 'index,follow' : 'noindex,nofollow'}"><meta name="author" content="Ankit Pandey"><meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:type" content="website"><meta property="og:site_name" content="TypeSpeed"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(meta.title)}"><meta name="twitter:description" content="${escape(meta.description)}">${canonical ? `<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}">` : ''}${schema ? `<script id="page-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}`;
  const body = renderToString(
    <StaticRouter location={path}>
      <App />
    </StaticRouter>,
  );
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[\s\S]*?>/, '')
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const target =
    path === '/'
      ? resolve(dist, 'index.html')
      : path === '/404'
        ? resolve(dist, '404.html')
        : resolve(dist, path.slice(1), 'index.html');
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, html);
}
await writeFile(
  resolve(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`,
);
if (origin)
  await writeFile(
    resolve(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(
      publicPages,
    )
      .map((path) => `<url><loc>${escape(origin + path)}</loc></url>`)
      .join('')}</urlset>`,
  );
console.log(
  `Prerendered ${paths.length} pages. ${origin ? `Canonical origin: ${origin}` : 'SITE_URL unset: canonical URLs and sitemap intentionally omitted.'}`,
);
const assets = (await readdir(resolve(dist, 'assets'))).map(
  (name) => `/assets/${name}`,
);
const offlinePaths = [
  '/',
  '/challenges',
  '/games',
  '/play',
  '/insights',
  '/replays',
  '/settings',
  '/analytics',
];
const version = createHash('sha256')
  .update('offline-v2:' + template + assets.join('|'))
  .digest('hex')
  .slice(0, 12);
await writeFile(
  resolve(dist, 'sw.js'),
  `
const CACHE='typespeed-${version}';
const PATHS=${JSON.stringify(offlinePaths)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{
 await cache.addAll(${JSON.stringify([...assets, '/favicon.svg'])});
 for(const path of PATHS) {
  const response=await fetch(path==='/'?'/index.html':path+'/index.html');
  if(!response.ok)throw new Error('Offline page unavailable');
  await cache.put(path,response);
 }
})));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('typespeed-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'&&PATHS.includes(url.pathname)) {
  event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match(url.pathname))));
 } else if(url.pathname.startsWith('/assets/')||url.pathname==='/favicon.svg') {
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname).then(found=>found||fetch(event.request))));
 }
});
`,
);
