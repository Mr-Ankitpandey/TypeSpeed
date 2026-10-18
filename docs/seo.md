# Search visibility and deployment

Public pages are rendered into HTML at build time, using the same React components shown to users. This includes original typing guides, unique titles/descriptions, semantic headings, internal links, and author information. No crawler-specific page content, keyword stuffing, fabricated reviews, or ranking guarantees are used.

## Production URL

Set `SITE_URL` to the exact assigned HTTPS origin (for example, your actual Vercel project domain) before building. Do not use a guessed or unowned domain. On Vercel production deployments, `VERCEL_PROJECT_PRODUCTION_URL` is used when SITE_URL is absent. Explicit SITE_URL takes precedence for a custom domain. Preview deployments omit canonical URLs and sitemaps. Vercel preview indexing restrictions should remain enabled.

The build generates unique canonical links, Open Graph/Twitter metadata, WebApplication/WebPage JSON-LD, robots.txt, and a sitemap containing only public pages. Without a production origin, local builds intentionally omit absolute canonical URLs and the sitemap. No current timestamp is presented as a content modification date.

## Vercel frontend setup

Import the repository with the repository root as Root Directory. The tracked vercel.json defines the frontend build and output. Add SITE_URL once the assigned domain is known. If multiplayer is publicly hosted separately, set VITE_SERVER_URL to its HTTPS origin and configure that backend's ALLOWED_ORIGINS to the frontend origin. Redeploy after changing build-time settings.

The current in-memory backend requires all room members to reach one persistent process. Vercel's WebSocket beta supports connections but pins each connection to an individual Function with duration limits; subsequent connections are not guaranteed to reach the same instance. Deploying this backend unchanged as independent Functions would break room consistency. The frontend deployment therefore does not pretend to host the multiplayer server. Keep a persistent self-hosted backend unless the architecture is intentionally changed later.

The domain `typespeed.vercel.app` is only a possible name, not a verified assigned deployment. No deployment or account configuration has been performed by these code changes.

## Indexing boundaries

Public pages: home/practice, multiplayer information, typing guides, about, and privacy. Personal analytics, settings, recordings, room invitations, and unknown routes are not indexable. Vercel adds X-Robots-Tag to private paths. Do not replace the deployment configuration with a universal SPA rewrite: unknown URLs must return a real 404. Keep JavaScript and CSS crawlable. A robots exclusion is not access control; room authorization remains on the server.

## After launch

1. Confirm every canonical uses the actual public origin and redirects alternate domains consistently.
2. Check HTML source, response status codes, mobile layouts, and sitemap.xml on the deployed site.
3. Verify ownership in Google Search Console and submit the sitemap. This requires the site owner's account.
4. Use URL Inspection and the Rich Results Test to check live rendering and structured data. Eligibility does not guarantee a rich result.
5. Measure real-user loading, interaction, and layout stability; optimize from measured data. No perfect Lighthouse score or Core Web Vitals result is claimed without a deployed measurement.
6. Keep guides useful and accurate. Search ranking also depends on relevance, competition, reputation, and indexing decisions outside this codebase.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google developer guide](https://developers.google.com/search/docs/fundamentals/get-started-developers), [Vercel WebSocket lifecycle](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections).
