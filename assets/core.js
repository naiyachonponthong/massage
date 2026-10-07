/* ==========================================================
 * NuadOne LIFF · core.js
 *  NU.api (fetch → Apps Script doPost) · NU.auth (LINE Login → cus.login)
 *  NU.go / router แบบ hash · NU.sheet แผ่นเลื่อนขึ้น · toast · ตัวช่วยวันที่และตัวเลข
 *  พัฒนาโดย Naiyachon Ponthong · ห้ามจำหน่าย
 * ========================================================== */
(function () {
  'use strict';
  var NU = window.NU = {};
  var CFG = window.NUAD_CONFIG || {};
  NU.cfg = CFG;
  NU.mode = window.NUAD_MODE === 'staff' ? 'staff' : 'customer';
  var PFX = NU.mode === 'staff' ? 'nuadstf:' : 'nuad:';
  var LIFF_ID = NU.mode === 'staff' ? CFG.LIFF_ID_STAFF : CFG.LIFF_ID;
  NU.state = {};
  NU.pages = {};

  /* ---------- ตัวช่วยทั่วไป ---------- */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  NU.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  NU.$ = function (s, r) { return (r || document).querySelector(s); };
  NU.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  NU.money = function (n) { return Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }); };
  NU.fmtMin = function (m) { m = Number(m) || 0; return ('0' + (Math.floor(m / 60) % 24)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
  NU.store = {
    get: function (k) { try { return window.localStorage.getItem(PFX + k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(PFX + k, v); } catch (e) { /* โหมดส่วนตัว */ } },
    del: function (k) { try { window.localStorage.removeItem(PFX + k); } catch (e) { /* ไม่เป็นไร */ } },
    json: function (k) { try { return JSON.parse(NU.store.get(k) || 'null'); } catch (e) { return null; } }
  };
  var DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  var DAYS_S = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  NU.DAYS = DAYS; NU.DAYS_S = DAYS_S; NU.TH_M = TH_M;
  function pad(n) { return ('0' + n).slice(-2); }
  NU.todayStr = function () {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  };
  NU.nowMin = function () {
    try { var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':'); return (+p[0] % 24) * 60 + (+p[1]); }
    catch (e) { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  };
  NU.addDays = function (s, n) {
    var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  };
  NU.wd = function (s) { return new Date(s + 'T12:00:00Z').getUTCDay(); };
  /** mode: short (8 ต.ค. 69) | day (พ. 8 ต.ค.) | long (วันพุธที่ 8 ต.ค. 2569) */
  NU.thDate = function (s, mode) {
    if (!s) return '-';
    var d = new Date(s + 'T12:00:00Z'), w = d.getUTCDay(), be = d.getUTCFullYear() + 543;
    if (mode === 'day') return DAYS_S[w] + ' ' + d.getUTCDate() + ' ' + TH_M[d.getUTCMonth()];
    if (mode === 'long') return 'วัน' + DAYS[w] + 'ที่ ' + d.getUTCDate() + ' ' + TH_M[d.getUTCMonth()] + ' ' + be;
    return d.getUTCDate() + ' ' + TH_M[d.getUTCMonth()] + ' ' + String(be).slice(-2);
  };
  NU.relDay = function (s) {
    var t = NU.todayStr();
    return s === t ? 'วันนี้' : s === NU.addDays(t, 1) ? 'พรุ่งนี้' : '';
  };
  NU.rid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  NU.stars = function (r) {
    r = Math.round(Number(r) || 0);
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<i class="bi bi-star' + (i <= r ? '-fill' : '') + '"></i>';
    return '<span class="stars">' + s + '</span>';
  };
  NU.empty = function (icon, title, sub, action) {
    return '<div class="empty"><div class="e-ico"><i class="bi ' + icon + '"></i></div><b>' + NU.esc(title) + '</b>' + (sub ? '<p>' + NU.esc(sub) + '</p>' : '') + (action || '') + '</div>';
  };
  NU.busy = function (btn, on, text) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin-d"></span> ' + NU.esc(text || 'กำลังโหลด'); }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  };

  /* ---------- toast ---------- */
  var tTimer = null;
  NU.toast = function (msg, type) {
    var el = NU.$('#toast');
    if (!el) return;
    NU.$('#toastMsg').textContent = msg;
    el.querySelector('i').className = 'bi ' + (type === 'error' ? 'bi-exclamation-octagon' : type === 'success' ? 'bi-check-circle' : 'bi-info-circle');
    el.classList.add('on');
    clearTimeout(tTimer);
    tTimer = setTimeout(function () { el.classList.remove('on'); }, type === 'error' ? 4200 : 2600);
  };
  NU.fail = function (e) { if (e && e.silent) return; NU.toast((e && e.message) || 'ทำรายการไม่สำเร็จ', 'error'); };

  /* ---------- API (POST text/plain → ไม่มี CORS preflight) ---------- */
  NU.apiReady = function () { return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(String(CFG.API_URL || '')) || !!NU.__mockApi; };
  NU.api = function (route, data, opt) {
    opt = opt || {};
    var body = { route: route, data: data || {}, token: opt.auth ? NU.auth.token() : '', request_id: opt.request_id || '' };
    var call = NU.__mockApi ? NU.__mockApi(body) : fetchJson(body, opt.timeout || 25000);
    return call.then(function (res) {
      if (!res) throw new Error('ไม่ได้รับข้อมูลจากระบบ');
      if (res.status === 'auth') {
        NU.auth.clear();
        var e = new Error(res.message || 'กรุณาเข้าสู่ระบบอีกครั้ง'); e.auth = true; throw e;
      }
      if (res.status !== 'ok') throw new Error(res.message || 'ทำรายการไม่สำเร็จ');
      if (opt.toast && res.message) NU.toast(res.message, 'success');
      return res.data;
    });
  };
  function fetchJson(body, ms) {
    if (!NU.apiReady()) return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js'));
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms);
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, redirect: 'follow' })
      .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('ระบบตอบกลับผิดพลาด (' + r.status + ')'); return r.json(); })
      .catch(function (e) {
        clearTimeout(timer);
        if (e && e.name === 'AbortError') throw new Error('อินเทอร์เน็ตช้าหรือระบบไม่ตอบสนอง ลองใหม่อีกครั้ง');
        if (e instanceof TypeError) throw new Error('เชื่อมต่อระบบไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
        throw e;
      });
  }

  /* ---------- LIFF + เข้าสู่ระบบ ---------- */
  NU.liffOk = false;
  NU.inClient = false;
  NU.initLiff = function () {
    if (!LIFF_ID || !window.liff) return Promise.resolve(false);
    var init = window.liff.init({ liffId: LIFF_ID }).then(function () {
      NU.liffOk = true;
      try { NU.inClient = window.liff.isInClient(); } catch (e) { NU.inClient = false; }
      return true;
    }).catch(function (e) { console.warn('LIFF init', e); return false; });
    var timeout = new Promise(function (res) { setTimeout(function () { res(false); }, 6000); });
    return Promise.race([init, timeout]);
  };
  NU.auth = {
    token: function () {
      var t = NU.store.json('session');
      if (!t || !t.token) return '';
      if (new Date(t.exp).getTime() < Date.now() + 60000) { NU.store.del('session'); return ''; }
      return t.token;
    },
    me: function () { return NU.state.me || NU.store.json('me'); },
    setMe: function (me) { NU.state.me = me; NU.store.set('me', JSON.stringify(me)); },
    clear: function () { NU.store.del('session'); NU.store.del('me'); NU.state.me = null; },
    loggedIn: function () { return !!NU.auth.token(); },
    /** คืน Promise<me> · ถ้ายังไม่ได้เข้าสู่ระบบ LINE จะพาไปหน้า LINE Login แล้วกลับมาหน้าเดิม */
    ensure: function () {
      if (NU.auth.token() && NU.auth.me()) return Promise.resolve(NU.auth.me());
      if (NU.__mockLogin) return NU.auth.loginWith(NU.__mockLogin());
      if (!NU.liffOk) return Promise.reject(new Error(LIFF_ID ? 'กรุณาเปิดหน้านี้ผ่าน LINE เพื่อเข้าสู่ระบบ' : 'ยังไม่ได้ตั้งค่า ' + (NU.mode === 'staff' ? 'LIFF_ID_STAFF' : 'LIFF_ID') + ' ใน config.js'));
      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: location.href });
        return new Promise(function () { /* กำลังไปหน้า LINE Login */ });
      }
      var idt = window.liff.getIDToken();
      if (!idt) { window.liff.login({ redirectUri: location.href }); return new Promise(function () {}); }
      return NU.auth.loginWith(idt).catch(function (e) {
          if (e.auth && NU.liffOk) { try { window.liff.logout(); } catch (x) { /* ไม่เป็นไร */ } window.liff.login({ redirectUri: location.href }); return new Promise(function () {}); }
        throw e;
      });
    },
    loginWith: function (idToken) {
      return NU.api(NU.mode === 'staff' ? 'stf.login' : 'cus.login', { id_token: idToken, ua: navigator.userAgent }).then(function (d) {
        if (d.need_bind) { NU.state.idToken = idToken; var e = new Error('ต้องผูกบัญชีกับร้านก่อน'); e.needBind = true; e.lineName = d.name; throw e; }
        return NU.auth.save(d);
      });
    },
    save: function (d) {
      NU.store.set('session', JSON.stringify({ token: d.token, exp: d.exp }));
      NU.auth.setMe(d.me);
      return d.me;
    },
    idToken: function () {
      if (NU.__mockLogin) return NU.__mockLogin();
      if (NU.state.idToken) return NU.state.idToken;
      return NU.liffOk && window.liff.isLoggedIn() ? window.liff.getIDToken() : '';
    },
    logout: function () {
      NU.auth.clear();
      try { if (NU.liffOk && window.liff.isLoggedIn() && !NU.inClient) window.liff.logout(); } catch (e) { /* ไม่เป็นไร */ }
    }
  };

  /* ---------- ธีมจากหลังบ้าน (เปลี่ยนสีเดียวได้ทั้งแอป) ---------- */
  NU.theme = function (p) {
    if (!p || !p.p) return;
    NU.$('#themeVars').textContent = ':root{--sb-primary:' + p.p + ';--sb-primary-600:' + p.p600 + ';--sb-primary-700:' + p.p700 + ';--sb-primary-50:' + p.p50 +
      ';--sb-primary-100:' + p.p100 + ';--sb-primary-200:' + p.p200 + ';--sb-grad-from:' + p.from + ';--sb-grad-to:' + p.to + ';--sb-primary-rgb:' + p.rgb + '}';
    var m = NU.$('meta[name=theme-color]'); if (m) m.setAttribute('content', p.p);
  };

  /* ---------- router (#/home, #/shop/ID, #/search?cat=x) ---------- */
  function parse() {
    var h = String(location.hash || '').replace(/^#\/?/, '');
    var qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, prm = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); prm[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    var seg = path.split('/').filter(Boolean);
    return { page: seg[0] || 'home', id: seg[1] || '', prm: prm };
  }
  NU.go = function (path, replace) {
    var h = '#/' + String(path || 'home').replace(/^#?\/?/, '');
    if (location.hash === h) { NU.render(); return; }
    if (replace) { history.replaceState(null, '', h); NU.render(); } else location.hash = h;
  };
  NU.back = function () {
    if (NU.state.navCount > 1) history.back(); else NU.go(NU.cfgPub && NU.cfgPub.single_shop ? 'shop/' + NU.cfgPub.default_shop_id : 'home', true);
  };
  NU.render = function () {
    var r = parse();
    if (!NU.pages[r.page]) r = { page: 'home', id: '', prm: {} };
    NU.state.route = r;
    NU.sheet.close(true);
    var view = NU.$('#view');
    var pg = NU.pages[r.page];
    document.getElementById('app').classList.toggle('has-bbar', !!pg.bbar);
    NU.$('#bnav').classList.toggle('hidden', !!pg.hideNav);
    NU.$$('#bnav [data-nav]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-nav') === (pg.nav || r.page)); });
    window.scrollTo(0, 0);
    try {
      var p = pg.render(view, r);
      if (p && p.catch) p.catch(function (e) { if (e && e.silent) return; view.innerHTML = errorPage(e); });
    } catch (e) { view.innerHTML = errorPage(e); console.error(e); }
  };
  function errorPage(e) {
    return '<div class="ph-top"><button class="icon-btn" onclick="NU.back()" aria-label="ย้อนกลับ"><i class="bi bi-chevron-left"></i></button><h1>เกิดข้อผิดพลาด</h1></div>' +
      NU.empty('bi-wifi-off', 'โหลดข้อมูลไม่สำเร็จ', (e && e.message) || String(e), '<button class="btn-soft" onclick="NU.render()"><i class="bi bi-arrow-clockwise"></i> ลองใหม่</button>');
  }
  NU.state.navCount = 0;
  window.addEventListener('hashchange', function () { NU.state.navCount++; NU.render(); });

  /* ---------- แผ่นเลื่อนขึ้น (bottom sheet) ---------- */
  var onClose = null;
  NU.sheet = {
    open: function (o) {
      NU.$('#shTitle').textContent = o.title || '';
      NU.$('#shSteps').innerHTML = o.steps || '';
      NU.$('#shBody').innerHTML = o.body || '';
      NU.$('#shFoot').innerHTML = o.foot || '';
      NU.$('#shFoot').classList.toggle('hidden', !o.foot);
      NU.$('#shBody').scrollTop = 0;
      onClose = o.onClose || null;
      NU.$('#scrim').classList.add('on');
      NU.$('#sheet').classList.add('on');
      document.body.style.overflow = 'hidden';
      return NU.$('#shBody');
    },
    set: function (o) {
      if (o.title !== undefined) NU.$('#shTitle').textContent = o.title;
      if (o.steps !== undefined) NU.$('#shSteps').innerHTML = o.steps;
      if (o.body !== undefined) { NU.$('#shBody').innerHTML = o.body; NU.$('#shBody').scrollTop = 0; }
      if (o.foot !== undefined) { NU.$('#shFoot').innerHTML = o.foot; NU.$('#shFoot').classList.toggle('hidden', !o.foot); }
    },
    isOpen: function () { return NU.$('#sheet').classList.contains('on'); },
    close: function (silent) {
      if (!NU.sheet.isOpen()) return;
      NU.$('#scrim').classList.remove('on');
      NU.$('#sheet').classList.remove('on');
      document.body.style.overflow = '';
      var f = onClose; onClose = null;
      if (f && !silent) f();
    }
  };
  document.addEventListener('DOMContentLoaded', function () {
    NU.$('#scrim').onclick = function () { NU.sheet.close(); };
    NU.$('#shClose').onclick = function () { NU.sheet.close(); };
    NU.$('#bnav').onclick = function (e) {
      var b = e.target.closest('[data-nav]');
      if (b && NU.onNav) NU.onNav(b.getAttribute('data-nav'));
    };
  });

  /* ---------- เริ่มแอป ---------- */
  NU.boot = function () {
    var cached = NU.store.json('pubcfg');
    if (cached) applyCfg(cached);
    if (!NU.apiReady()) {
      NU.$('#view').innerHTML = '<div class="ph-top"><h1>ตั้งค่ายังไม่ครบ</h1></div>' + NU.empty('bi-gear', 'ยังไม่ได้ใส่ API_URL', 'เปิดไฟล์ config.js แล้วใส่ URL เว็บแอป Apps Script ที่ลงท้าย /exec จากนั้น push ขึ้น GitHub อีกครั้ง');
      NU.$('#bnav').classList.add('hidden');
      return;
    }
    var cfgP = NU.api('pub.config', {}).then(function (c) { NU.store.set('pubcfg', JSON.stringify(c)); applyCfg(c); return c; })
      .catch(function (e) { if (cached) return cached; throw e; });
    Promise.all([cfgP, NU.initLiff()]).then(function () {
      var q = new URLSearchParams(location.search);
      if (q.get('shop') && !location.hash) history.replaceState(null, '', location.pathname + '#/shop/' + encodeURIComponent(q.get('shop')));
      else if (/^[a-z]{2,20}$/.test(q.get('page') || '') && !location.hash && NU.pages[q.get('page')]) history.replaceState(null, '', location.pathname + '#/' + q.get('page'));
      NU.render();
    }).catch(function (e) {
      NU.$('#view').innerHTML = NU.empty('bi-wifi-off', 'เปิดแอปไม่สำเร็จ', e.message, '<button class="btn-soft" onclick="location.reload()"><i class="bi bi-arrow-clockwise"></i> ลองใหม่</button>');
    });
  };
  function applyCfg(c) {
    NU.cfgPub = c;
    NU.theme(c.theme);
    document.title = (c.name || 'NuadOne') + (NU.mode === 'staff' ? ' · สำหรับหมอนวด' : ' · จองคิวนวด');
    if (c.single_shop && NU.mode !== 'staff') { var s = NU.$('#bnav [data-nav=search]'); if (s) s.classList.add('hidden'); NU.$('#bnav').style.gridTemplateColumns = 'repeat(4,1fr)'; }
  }
})();
