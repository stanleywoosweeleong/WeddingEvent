/* SS Wedding service worker.
   Content changes (seating, programme) need nothing here: the page checks the published index.html itself,
   reloads with the new copy and shows a toast. Bump VERSION only if you change the icons or the manifest. */
const VERSION = "ss-wedding-2026-1001-29";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Page: try the network for 3 s (to get any seating fix), otherwise use the saved copy.
   Weak hall wifi therefore never leaves a guest staring at a blank screen. */
function withTimeout(p, ms) {
  return new Promise((ok, fail) => { const t = setTimeout(() => fail(new Error("timeout")), ms);
    p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); fail(e); }); });
}
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.searchParams.has("fresh")) return;          /* the page's update check: always go to the network */
  if (req.mode === "navigate") {
    e.respondWith(
      withTimeout(fetch(req, {cache: "no-store"}), 3000)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); } return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req)));
});
