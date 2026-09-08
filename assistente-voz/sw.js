/* ============================================================
   DYON · SERVICE WORKER
   O app do convidado precisa abrir no credenciamento mesmo com a
   rede da cidade congestionada: o casco é servido do cache e a
   rede só atualiza a cópia em segundo plano.

   Só entra em ação sob http/https — em file:// o app já funciona
   direto do disco.
   ============================================================ */

const VERSION = "dyon-convidados-v5";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./data.js",
  "./qr.js",
  "./script.js",
  "./icon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // addAll falha inteira se um arquivo faltar; cada item é
      // adicionado por conta própria para não travar a instalação.
      .then((cache) => Promise.allSettled(SHELL.map((path) => cache.add(path))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navegação: tenta a rede e cai para o casco em cache quando offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Demais recursos: cache primeiro, com atualização silenciosa depois.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok && url.origin === location.origin) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
