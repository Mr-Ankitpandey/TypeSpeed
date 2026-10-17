# Local and self-hosted operation

No hosting account, domain, Docker, database or paid service is needed. Local development is the supported default. Initial dependency and browser downloads require network access; the running application does not need external services.

For production on existing hardware, build with `npm run build`, serve `apps/web/dist` as static files with SPA fallback to index.html, and run `apps/server/dist/index.js` as a persistent Node process. Reverse proxy `/socket.io` including WebSocket upgrade headers to the server. Terminate HTTPS at the reverse proxy, use WSS, and set `ALLOWED_ORIGINS` to the exact frontend origin. The backend exposes `/health`. Set PORT (default 3001), HOST (default 127.0.0.1), and comma-separated ALLOWED_ORIGINS. Do not expose the Vite development server as a production server.

For a local production preview, set `ALLOWED_ORIGINS=http://127.0.0.1:4173`, start the built server, and run the frontend preview command. The Vite configuration's proxy also supports local preview.

For LAN development, bind Vite to `0.0.0.0` using `npm run dev -w @typespeed/web -- --host 0.0.0.0`; add the exact LAN frontend URL (e.g. http://192.168.1.10:5173) to ALLOWED_ORIGINS before starting the backend. The Vite proxy allows the backend to remain loopback-bound. Allow inbound frontend access only on your trusted network using your operating-system firewall. The application does not modify firewall rules automatically. Clipboard access may be unavailable on HTTP LAN origins; the UI displays copyable text as fallback.

Existing hardware/network self-hosting avoids a new service subscription but may still have electricity and network costs. Permanent zero-cost public hosting is not guaranteed. No public free-tier service has been evaluated or selected. A future selection must verify persistent WebSockets, process lifetime, HTTPS/WSS, usage limits and no billing activation.

Before public exposure: load-test bounded resource limits, review proxy/IP handling and TLS, add operational monitoring without third-party dependencies, and test broader latency/disconnect conditions. The current burst detection is not a full anti-bot solution. Backend restarts erase rooms; browser history is device-specific; multiplayer results are transient.
