// ════════════════════════════════════════
// PromptForge — site routing Worker
// ════════════════════════════════════════
// This Worker only does ONE thing: when a request comes in for
// /creator/<anything> (a URL with no matching real file), it serves
// creator.html while keeping the pretty URL visible in the browser.
//
// Every other request — home.html, dashboard.html, library.html,
// literally everything that already works — matches a real file and
// gets served directly by Cloudflare's static asset system WITHOUT
// ever reaching this code at all. This script cannot break anything
// that currently works; it only handles requests that would
// otherwise 404.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/creator/')) {
      const assetRequest = new Request(new URL('/creator.html', url), request);
      return env.ASSETS.fetch(assetRequest);
    }

    return env.ASSETS.fetch(request);
  },
};
