import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  pageMeta,
  publicPages,
  structuredData,
  type PublicPath,
} from '../lib/seo';
export function Seo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = pageMeta(pathname);
    const origin = import.meta.env.VITE_SITE_URL || '';
    document.title = meta.title;
    for (const [name, content] of Object.entries({
      description: meta.description,
      robots:
        meta.index && !import.meta.env.VITE_NOINDEX
          ? 'index,follow'
          : 'noindex,nofollow',
      'og:title': meta.title,
      'og:description': meta.description,
      'og:type': 'website',
      'og:site_name': 'TypeSpeed',
      'twitter:card': 'summary',
      'twitter:title': meta.title,
      'twitter:description': meta.description,
    })) {
      const attr = name.startsWith('og:') ? 'property' : 'name';
      let tag = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${name}"]`,
      );
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.append(tag);
      }
      tag.content = content;
    }
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
    document.getElementById('page-schema')?.remove();
    if (origin && meta.index) {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = origin + pathname;
      document.head.append(link);
      const og = document.createElement('meta');
      og.setAttribute('property', 'og:url');
      og.content = link.href;
      document.head.append(og);
      const schema = document.createElement('script');
      schema.id = 'page-schema';
      schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify(structuredData(pathname, origin));
      document.head.append(schema);
    }
  }, [pathname]);
  return null;
}
export function ContentPage({ path }: { path: PublicPath }) {
  const page = publicPages[path];
  return (
    <article className="content-page">
      <div className="page-heading">
        <div className="eyebrow">TYPESPEED GUIDES</div>
        <h1>{page.heading}</h1>
        <p>{page.description}</p>
      </div>
      {page.sections.map(([title, text]) => (
        <section className="panel" key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
      <nav className="guide-links" aria-label="Typing guides">
        <Link to="/">Start a typing test</Link>
        <Link to="/learn">Practice guide</Link>
        <Link to="/learn/typing-speed">How WPM works</Link>
        <Link to="/learn/accuracy">Accuracy guide</Link>
      </nav>
    </article>
  );
}
