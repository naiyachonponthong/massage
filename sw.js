/* NuadOne LIFF service worker
 * เก็บไฟล์หน้าเว็บไว้ในเครื่อง เปิดเร็วขึ้นและยังเปิดหน้าได้ตอนเน็ตช้า
 * ข้อมูลจริง (Apps Script) ไม่ผ่านแคชเลย · ไฟล์หน้าเว็บใช้ stale-while-revalidate (อัปเดตเองในการเปิดครั้งถัดไป)
 * เปลี่ยน VERSION ทุกครั้งที่อัปโหลดไฟล์ชุดใหม่ */
var VERSION = 'nuadone-2.0.0';
var CORE = ['./', 'index.html', 'staff.html', 'config.js', 'assets/app.css', 'assets/core.js', 'assets/customer.js', 'assets/staff.js',
  'manifest.webmanifest', 'staff.webmanifest', 'img/icon-192.png', 'img/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // API, LINE SDK, ฟอนต์ ไปเครือข่ายตรง
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
