/* ==========================================================
 * NuadOne LIFF ลูกค้า · customer.js
 *  หน้าแรก · ค้นหา · หน้าร้าน (ตามรูปอ้างอิง) · แผ่นจองคิว 4 ขั้น · จองสำเร็จ + QR
 *  การจองของฉัน · ฉัน (โปรไฟล์ ร้านโปรด)
 * ========================================================== */
(function () {
  'use strict';
  var NU = window.NU, esc = NU.esc, fm = NU.fmtMin, money = NU.money;
  var FAC_LABEL = { general: 'ทั่วไป', room: 'ห้องนวด', extra: 'บริการเสริม' };
  var ST_LABEL = { pending: 'รอร้านยืนยัน', pending_payment: 'รอชำระมัดจำ', pending_verify: 'รอตรวจสลิป', confirmed: 'ยืนยันแล้ว', checked_in: 'มาถึงแล้ว', in_service: 'กำลังนวด', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก', no_show: 'ไม่มาตามนัด', expired: 'หมดเวลาชำระ' };

  /* ---------- ความต้องการล่าสุดของลูกค้า (วันที่ จำนวนคน) ---------- */
  function want() {
    var w = NU.state.want || NU.store.json('want') || {};
    var today = NU.todayStr();
    if (!w.date || w.date < today) w.date = today;
    w.pax = Math.max(1, Math.min(6, Number(w.pax) || 1));
    NU.state.want = w;
    return w;
  }
  function saveWant(p) { var w = Object.assign(want(), p); NU.state.want = w; NU.store.set('want', JSON.stringify({ date: w.date, pax: w.pax })); }
  function geo() { var g = NU.store.json('geo'); return g && Date.now() - g.at < 3600000 ? g : null; }
  NU.open = function (url) {
    if (!url) return;
    if (NU.liffOk && window.liff.openWindow) { try { window.liff.openWindow({ url: url, external: true }); return; } catch (e) { /* ใช้ window.open แทน */ } }
    window.open(url, '_blank', 'noopener');
  };
  function mapUrl(s) {
    if (s.map_url) return s.map_url;
    if (s.lat && s.lng) return 'https://www.google.com/maps/search/?api=1&query=' + s.lat + ',' + s.lng;
    return s.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + s.address) : '';
  }
  function calUrl(b, shop) {
    var d0 = function (min) {
      var day = NU.addDays(b.date, Math.floor(min / 1440)), m = min % 1440;
      return day.replace(/-/g, '') + 'T' + ('0' + Math.floor(m / 60)).slice(-2) + ('0' + (m % 60)).slice(-2) + '00';
    };
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('นวด ' + (shop ? shop.name : '') + ' (' + b.code + ')') +
      '&dates=' + d0(b.start_min) + '/' + d0(b.end_min) + '&ctz=Asia/Bangkok&location=' + encodeURIComponent(shop ? shop.address || shop.name : '') +
      '&details=' + encodeURIComponent('รหัสการจอง ' + b.code + '\n' + (b.items || []).map(function (it) { return it.service_name + ' ' + it.min + ' นาที'; }).join('\n'));
  }
  function credit() {
    var c = NU.cfgPub || {};
    return '<div class="foot">' + esc(c.name || 'NuadOne') + ' · ' + esc(c.sub || 'จองคิวนวดเพื่อสุขภาพ') + '<small>พัฒนาโดย Naiyachon Ponthong · ห้ามจำหน่าย</small></div>';
  }
  function logoBox(url, icon) { return url ? '<img src="' + esc(url) + '" alt="">' : '<i class="bi ' + (icon || 'bi-flower1') + '"></i>'; }

  /* ---------- การ์ดร้าน ---------- */
  function cardSc(c) {
    return '<button class="sc" data-shop="' + esc(c.shop_id) + '"><div class="sc-img">' + (c.cover ? '<img src="' + esc(c.cover) + '" alt="" loading="lazy">' : '<span class="ph-ico"><i class="bi bi-flower1"></i></span>') +
      '<span class="sc-tag ' + (c.open ? 'open' : 'closed') + '">' + (c.open ? 'เปิดอยู่' : 'ปิดอยู่') + '</span></div>' +
      '<div class="sc-b"><div class="sc-n">' + esc(c.name) + '</div><div class="sc-m">' + esc(c.cat_names.slice(0, 3).join(' · ') || c.tagline) + '</div>' +
      '<div class="sc-f"><span>' + (c.reviews ? '<i class="bi bi-star-fill star"></i> ' + c.rating + ' <span class="muted">(' + c.reviews + ')</span>' : '<span class="muted">ร้านใหม่</span>') +
      (c.km !== null && c.km !== undefined ? ' <span class="muted">· ' + c.km + ' กม.</span>' : '') + '</span><span>เริ่ม <b>฿' + money(c.price_from) + '</b></span></div></div></button>';
  }
  function cardLc(c) {
    return '<button class="lc" data-shop="' + esc(c.shop_id) + '"><span class="lc-img">' + (c.cover ? '<img src="' + esc(c.cover) + '" alt="" loading="lazy">' : '<i class="bi bi-flower1"></i>') + '</span>' +
      '<span class="lc-b"><span class="sc-n">' + esc(c.name) + '</span><span class="sc-m">' + esc([c.district, c.province].filter(Boolean).join(' ') || c.tagline) + '</span>' +
      '<span class="sc-m">' + (c.reviews ? '<i class="bi bi-star-fill star"></i> ' + c.rating + ' (' + c.reviews + ' รีวิว)' : 'ร้านใหม่') + (c.km !== null && c.km !== undefined ? ' · ' + c.km + ' กม.' : '') + '</span>' +
      '<span class="lc-tags"><span class="tg ' + (c.open ? 'open' : '') + '">' + esc(c.open_label || (c.open ? 'เปิดอยู่' : 'ปิดอยู่')) + '</span><span class="tg pr">เริ่ม ฿' + money(c.price_from) + '</span></span></span></button>';
  }
  function bindShopCards(root) {
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-shop]'); if (b) NU.go('shop/' + b.getAttribute('data-shop')); });
  }

  /* ======================================================
   * หน้าแรก
   * ====================================================== */
  NU.pages.home = {
    render: function (view) {
      var c = NU.cfgPub || {};
      if (c.single_shop && c.default_shop_id) { NU.go('shop/' + c.default_shop_id, true); return; }
      var me = NU.auth.loggedIn() ? NU.auth.me() : null, w = want();
      view.innerHTML = '<section class="m-hero">' + (c.art && c.art.customer ? '<img class="m-hero-art" src="' + esc(c.art.customer) + '" alt="">' : '') +
        '<div class="m-hero-top"><div class="brand-logo">' + logoBox(c.logo) + '</div><div><div class="brand-name">' + esc(c.name || 'NuadOne') + '</div><div style="font-size:.82rem;opacity:.9">' + esc(c.sub || '') + '</div></div>' +
        '<button class="m-av" data-nav2="me" aria-label="บัญชีของฉัน" style="border:2px solid rgba(255,255,255,.7)">' + (me && me.picture ? '<img src="' + esc(me.picture) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">' : '<i class="bi bi-person"></i>') + '</button></div>' +
        '<h1>' + (me ? 'สวัสดี ' + (/^คุณ/.test(me.name || me.display_name) ? '' : 'คุณ') + esc(me.name || me.display_name) : 'ผ่อนคลายได้ทุกวัน') + '</h1><p>จองคิวนวดร้านใกล้คุณ เลือกหมอนวดและเวลาได้เอง</p></section>' +
        '<div class="m-float"><h2><i class="bi bi-calendar2-heart"></i> จองคิวนวด</h2>' +
        '<div class="search-box" style="margin-bottom:.6rem"><i class="bi bi-search"></i><input type="search" id="hQ" placeholder="ชื่อร้าน ย่าน หรือประเภทการนวด" enterkeyhint="search"></div>' +
        '<div class="qf"><label class="qf-box"><small>วันที่</small><input type="date" id="hDate" value="' + w.date + '" min="' + NU.todayStr() + '"></label>' +
        '<div class="qf-box"><small>จำนวน</small><div class="qf-pax"><button type="button" data-pax="-1" aria-label="ลด"><i class="bi bi-dash"></i></button><b id="hPax">' + w.pax + ' ท่าน</b><button type="button" data-pax="1" aria-label="เพิ่ม"><i class="bi bi-plus"></i></button></div></div></div>' +
        '<button class="btn-main" id="hGo"><i class="bi bi-search"></i> ค้นหาร้านนวด</button></div>' +
        '<div id="hBody"><div class="page-pad"><div class="skel" style="height:130px;margin-bottom:1rem"></div><div class="skel" style="height:90px;margin-bottom:1rem"></div><div class="skel" style="height:200px"></div></div></div>';
      NU.$('[data-nav2=me]').onclick = function () { NU.go('me'); };
      NU.$('.qf-pax').onclick = function (e) { var b = e.target.closest('[data-pax]'); if (!b) return; var n = Math.max(1, Math.min(6, want().pax + Number(b.getAttribute('data-pax')))); saveWant({ pax: n }); NU.$('#hPax').textContent = n + ' ท่าน'; };
      NU.$('#hDate').onchange = function () { if (this.value) saveWant({ date: this.value }); };
      var go = function () { NU.state.sf = Object.assign(NU.state.sf || {}, { q: NU.$('#hQ').value.trim() }); NU.go('search'); };
      NU.$('#hGo').onclick = go;
      NU.$('#hQ').onkeydown = function (e) { if (e.key === 'Enter') go(); };
      var g = geo();
      return NU.api('pub.home', g ? { lat: g.lat, lng: g.lng } : {}).then(function (d) {
        NU.state.home = d;
        if (NU.state.route.page !== 'home') return;
        var h = '';
        if (d.banners.length) h += '<div class="blk"><div class="banners" id="hBan">' + d.banners.map(function (b) {
          return '<button class="banner" data-ban="' + esc(b.id) + '">' + (b.image ? '<img src="' + esc(b.image) + '" alt="">' : '') + '<span class="bn-t"><b>' + esc(b.title) + '</b><small>' + esc(b.sub) + '</small></span></button>';
        }).join('') + '</div></div>';
        if (d.categories.length) h += '<div class="blk"><div class="blk-h"><h2>ประเภทการนวด</h2></div><div class="tiles">' + d.categories.slice(0, 8).map(function (cat) {
          return '<button class="tile" data-cat="' + esc(cat.cat_id) + '"><span class="tile-ico tn-' + esc(cat.tone || 'primary') + '">' + (cat.image ? '<img src="' + esc(cat.image) + '" alt="">' : '<i class="bi ' + esc(cat.icon || 'bi-stars') + '"></i>') + '</span>' + esc(cat.name) + '</button>';
        }).join('') + '</div></div>';
        if (!d.total) {
          h += NU.empty('bi-shop', 'ยังไม่มีร้านที่เปิดรับจอง', 'เมื่อร้านนวดพร้อมรับจองออนไลน์ รายชื่อร้านจะขึ้นที่นี่');
        } else {
          h += '<div class="blk"><div class="blk-h"><h2>ร้านแนะนำ</h2><button data-all="1">ดูทั้งหมด</button></div><div class="sc-row">' + d.recommended.map(cardSc).join('') + '</div></div>';
          h += '<div class="blk"><div class="blk-h"><h2>' + (g ? 'ร้านใกล้ฉัน' : 'ร้านทั้งหมด') + '</h2><button id="hNear"><i class="bi bi-geo-alt"></i> ' + (g ? 'อัปเดตตำแหน่ง' : 'ใช้ตำแหน่งของฉัน') + '</button></div>' + d.nearby.map(cardLc).join('') + '</div>';
        }
        NU.$('#hBody').innerHTML = h + credit();
        var body = NU.$('#hBody');
        bindShopCards(body);
        body.addEventListener('click', function (e) {
          var t = e.target.closest('[data-cat]');
          if (t) { NU.state.sf = { cat_id: t.getAttribute('data-cat') }; NU.go('search'); return; }
          var bn = e.target.closest('[data-ban]');
          if (bn) {
            var b = d.banners.filter(function (x) { return x.id === bn.getAttribute('data-ban'); })[0];
            if (b && b.link_type === 'shop' && b.link_shop) NU.go('shop/' + b.link_shop);
            else if (b && b.link_type === 'category' && b.link_cat) { NU.state.sf = { cat_id: b.link_cat }; NU.go('search'); }
            return;
          }
          if (e.target.closest('[data-all]')) { NU.go('search'); return; }
          if (e.target.closest('#hNear')) locate(function () { NU.render(); });
        });
      });
    }
  };
  function locate(done) {
    if (!navigator.geolocation) { NU.toast('อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง', 'error'); return; }
    NU.toast('กำลังหาตำแหน่งของคุณ');
    navigator.geolocation.getCurrentPosition(function (p) {
      NU.store.set('geo', JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude, at: Date.now() }));
      done();
    }, function () { NU.toast('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งให้ LINE แล้วลองใหม่', 'error'); }, { timeout: 10000, maximumAge: 300000 });
  }

  /* ======================================================
   * ค้นหาร้าน
   * ====================================================== */
  NU.pages.search = {
    render: function (view, r) {
      var f = NU.state.sf = Object.assign({ q: '', cat_id: '', open_now: false, gender: '', max_price: 0, sort: '' }, NU.state.sf || {});
      if (r.prm.cat) f.cat_id = r.prm.cat;
      var cats = (NU.state.home && NU.state.home.categories) || [];
      var page = 1, rows = [];
      view.innerHTML = '<div class="sp-top"><div class="row1"><div class="search-box" style="flex:1"><i class="bi bi-search"></i><input type="search" id="sQ" placeholder="ค้นหาร้านนวด" value="' + esc(f.q) + '" enterkeyhint="search"></div></div>' +
        '<div class="fl" id="sFl"><button data-f="open_now" class="' + (f.open_now ? 'on' : '') + '">เปิดอยู่ตอนนี้</button><button data-f="near"><i class="bi bi-geo-alt"></i> ใกล้ฉัน</button>' +
        '<button data-f="gender_f" class="' + (f.gender === 'f' ? 'on' : '') + '">หมอนวดหญิง</button><button data-f="gender_m" class="' + (f.gender === 'm' ? 'on' : '') + '">หมอนวดชาย</button>' +
        '<select id="sPrice" aria-label="ราคา"><option value="0">ทุกราคา</option><option value="300">ไม่เกิน ฿300</option><option value="500">ไม่เกิน ฿500</option><option value="800">ไม่เกิน ฿800</option></select>' +
        '<select id="sSort" aria-label="เรียง"><option value="">แนะนำ</option><option value="near">ใกล้สุด</option><option value="rating">คะแนนสูง</option><option value="price">ราคาต่ำ</option></select></div>' +
        (cats.length ? '<div class="fl" id="sCat"><button data-c="" class="' + (!f.cat_id ? 'on' : '') + '">ทุกประเภท</button>' + cats.map(function (c) { return '<button data-c="' + esc(c.cat_id) + '" class="' + (f.cat_id === c.cat_id ? 'on' : '') + '">' + esc(c.name) + '</button>'; }).join('') + '</div>' : '') +
        '</div><div class="res-n" id="sN"></div><div id="sList"><div class="page-pad"><div class="skel" style="height:110px;margin-bottom:.7rem"></div><div class="skel" style="height:110px;margin-bottom:.7rem"></div><div class="skel" style="height:110px"></div></div></div><div id="sMore"></div>';
      NU.$('#sPrice').value = String(f.max_price || 0);
      NU.$('#sSort').value = f.sort || '';
      var t = null;
      NU.$('#sQ').oninput = function () { clearTimeout(t); var v = this.value.trim(); t = setTimeout(function () { f.q = v; reload(); }, 450); };
      NU.$('#sQ').onkeydown = function (e) { if (e.key === 'Enter') { this.blur(); f.q = this.value.trim(); reload(); } };
      NU.$('#sPrice').onchange = function () { f.max_price = Number(this.value); reload(); };
      NU.$('#sSort').onchange = function () { f.sort = this.value; if (f.sort === 'near' && !geo()) locate(reload); else reload(); };
      NU.$('#sFl').onclick = function (e) {
        var b = e.target.closest('[data-f]'); if (!b) return;
        var k = b.getAttribute('data-f');
        if (k === 'open_now') f.open_now = !f.open_now;
        else if (k === 'gender_f') f.gender = f.gender === 'f' ? '' : 'f';
        else if (k === 'gender_m') f.gender = f.gender === 'm' ? '' : 'm';
        else if (k === 'near') { f.sort = 'near'; NU.$('#sSort').value = 'near'; locate(reload); return; }
        NU.$$('#sFl [data-f]').forEach(function (x) {
          var kk = x.getAttribute('data-f');
          x.classList.toggle('on', (kk === 'open_now' && f.open_now) || (kk === 'gender_f' && f.gender === 'f') || (kk === 'gender_m' && f.gender === 'm'));
        });
        reload();
      };
      var sc = NU.$('#sCat');
      if (sc) sc.onclick = function (e) { var b = e.target.closest('[data-c]'); if (!b) return; f.cat_id = b.getAttribute('data-c'); NU.$$('#sCat button').forEach(function (x) { x.classList.toggle('on', x === b); }); reload(); };
      bindShopCards(NU.$('#sList'));
      NU.$('#sMore').onclick = function (e) { if (e.target.closest('button')) { page++; load(true); } };
      function reload() { page = 1; rows = []; return load(false); }
      function load(more) {
        var g = geo();
        var p = { q: f.q, cat_id: f.cat_id, open_now: f.open_now, gender: f.gender, max_price: f.max_price, sort: f.sort, page: page, size: 20 };
        if (g) { p.lat = g.lat; p.lng = g.lng; }
        if (!more) NU.$('#sList').style.opacity = '.5';
        return NU.api('pub.shops', p).then(function (d) {
          if (NU.state.route.page !== 'search') return;
          NU.$('#sList').style.opacity = '';
          rows = rows.concat(d.rows);
          NU.$('#sN').textContent = d.total ? 'พบ ' + d.total + ' ร้าน' : '';
          NU.$('#sList').innerHTML = rows.length ? rows.map(cardLc).join('') : NU.empty('bi-search', 'ไม่พบร้านที่ตรงเงื่อนไข', 'ลองลบตัวกรองบางอย่าง หรือค้นด้วยคำอื่น');
          NU.$('#sMore').innerHTML = rows.length < d.total ? '<div style="padding:0 1rem 1rem"><button class="btn-ghost">ดูร้านเพิ่มเติม</button></div>' : '';
        }).catch(function (e) { NU.$('#sList').style.opacity = ''; NU.fail(e); });
      }
      return reload();
    }
  };

  /* ======================================================
   * หน้าร้าน (โครงตามรูปอ้างอิง)
   * ====================================================== */
  NU.pages.shop = {
    hideNav: true, bbar: true, nav: 'search',
    render: function (view, r) {
      view.innerHTML = '<header class="top"><div class="top-row"><button class="icon-btn" onclick="NU.back()" aria-label="ย้อนกลับ"><i class="bi bi-chevron-left"></i></button><div class="brand"><div class="skel" style="height:36px;width:60%"></div></div><span class="icon-btn"></span></div></header>' +
        '<div class="skel" style="aspect-ratio:4/3;border-radius:0"></div><div class="page-pad"><div class="skel" style="height:28px;width:70%;margin-bottom:.6rem"></div><div class="skel" style="height:18px;width:45%;margin-bottom:1.2rem"></div><div class="skel" style="height:160px"></div></div>';
      return NU.api('pub.shop', { shop_id: r.id }).then(function (s) {
        if (NU.state.route.page !== 'shop') return;
        NU.state.shop = s;
        shopPage(view, s);
        if (r.prm.book === '1') openBook(1);
      });
    }
  };

  var BK = null; // สถานะการจองที่กำลังเลือก (ต่อร้าน)
  function bkInit(s) {
    var w = want();
    if (BK && BK.shop_id === s.shop_id) return BK;
    var first = s.services[0];
    BK = {
      shop_id: s.shop_id, date: w.date, start_min: null, mode: 'any', req: NU.rid(),
      persons: [], max: Math.max(1, s.rules.max_persons || 4)
    };
    var n = Math.min(w.pax, BK.max);
    for (var i = 0; i < n; i++) BK.persons.push({ service_id: first.service_id, min: first.variants[0].min, pref: 'any' });
    if (!dayOpen(s, BK.date)) BK.date = nextOpen(s, BK.date);
    return BK;
  }
  function svcOf(s, id) { return s.services.filter(function (x) { return x.service_id === id; })[0] || s.services[0]; }
  function priceOf(s, p) { var v = svcOf(s, p.service_id).variants.filter(function (x) { return x.min === p.min; })[0]; return v ? v.price : 0; }
  function totalOf(s) { return BK.persons.reduce(function (a, p) { return a + priceOf(s, p); }, 0); }
  function dayOpen(s, d) {
    if ((s.holidays || []).some(function (h) { return h.date === d; })) return false;
    var h = s.hours[String(NU.wd(d))];
    return !!(h && h.on);
  }
  function nextOpen(s, d) { for (var i = 0; i < 31; i++) { var x = NU.addDays(d, i); if (dayOpen(s, x)) return x; } return d; }

  function shopPage(view, s) {
    var b = bkInit(s);
    var gal = s.gallery.length ? s.gallery : (s.logo ? [s.logo] : []);
    var fav = NU.auth.loggedIn() && (NU.auth.me().favorites || []).indexOf(s.shop_id) >= 0;
    var today = NU.todayStr(), th = s.hours[String(NU.wd(today))] || {};
    var h = '<header class="top"><div class="top-row"><button class="icon-btn" id="spBack" aria-label="ย้อนกลับ"><i class="bi bi-chevron-left"></i></button>' +
      '<div class="brand"><div class="brand-logo">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:13px">' : '<i class="bi bi-flower1"></i>') + '</div><div style="min-width:0"><div class="brand-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56vw">' + esc(s.name) + '</div><div class="brand-sub">' + esc(s.tagline || [s.district, s.province].filter(Boolean).join(' ')) + '</div></div></div>' +
      '<button class="icon-btn" id="spShare" aria-label="แชร์ร้าน"><i class="bi bi-share"></i></button></div>' +
      '<div class="chips"><button class="chip" data-chip="3"><i class="bi bi-calendar3"></i><span id="chDate"></span></button><button class="chip" data-chip="3"><i class="bi bi-clock"></i><span id="chTime"></span></button>' +
      '<button class="chip" data-chip="1"><i class="bi bi-people"></i><span id="chPax"></span></button><button class="chip chip-edit" data-chip="1"><i class="bi bi-pencil-square"></i>แก้ไข</button></div></header>';
    h += '<div class="gal"><div class="gal-track" id="galTrack">' + (gal.length ? gal.map(function (u, i) { return '<img src="' + esc(u) + '" alt="รูปร้าน ' + (i + 1) + '"' + (i ? ' loading="lazy"' : '') + '>'; }).join('') : '<span class="ph-ico"><i class="bi bi-flower1"></i></span>') + '</div>' +
      '<button class="gal-fav" id="spFav" aria-label="ร้านโปรด"><i class="bi bi-heart' + (fav ? '-fill' : '') + '"></i></button>' +
      (gal.length > 1 ? '<button class="gal-nav prev" data-g="-1" aria-label="รูปก่อนหน้า"><i class="bi bi-chevron-left"></i></button><button class="gal-nav next" data-g="1" aria-label="รูปถัดไป"><i class="bi bi-chevron-right"></i></button>' : '') +
      (gal.length ? '<div class="gal-count" id="galCount">1/' + gal.length + '</div>' : '') + '</div>' +
      (gal.length > 1 ? '<div class="thumbs" id="thumbs">' + gal.map(function (u, i) { return '<img src="' + esc(u) + '" data-i="' + i + '" class="' + (i ? '' : 'on') + '" alt="" loading="lazy">'; }).join('') + '</div>' : '');
    h += '<div class="title"><h1>' + esc(s.name) + '</h1><div class="meta"><span>' + esc(s.categories.map(function (c) { return c.name; }).join(' · ')) + '</span></div>' +
      '<div class="meta" style="margin-top:.45rem">' + (s.reviews ? '<span class="rate-pill"><i class="bi bi-star-fill" style="font-size:.75rem"></i>' + s.rating + '</span><span>' + s.reviews + ' รีวิว</span>' : '<span class="tg">ร้านใหม่</span>') +
      '<span class="' + (s.open.open ? 'badge-open' : 'tg') + '">' + esc(s.open.label) + '</span></div></div>';
    if (s.highlights.length || s.desc) h += '<section class="sec"><div class="sec-h"><h2>จุดเด่น</h2></div>' + s.highlights.map(function (x) { return '<div class="hl"><i class="bi ' + esc(x.icon || 'bi-star') + '"></i><span>' + esc(x.text) + '</span></div>'; }).join('') +
      (s.desc ? '<p class="muted" style="margin:.5rem 0 0;line-height:1.6;font-size:.95rem">' + esc(s.desc) + '</p>' : '') + '</section>';
    h += '<section class="sec"><div class="sec-h"><h2>ข้อมูลร้าน</h2></div><div class="stat-grid">' +
      '<div class="stat"><i class="bi bi-person-heart"></i><b>' + s.stats.staff + '</b><span>หมอนวด</span></div>' +
      '<div class="stat"><i class="bi bi-grid-1x2"></i><b>' + s.stats.beds + '</b><span>เตียง/เบาะ</span></div>' +
      '<div class="stat"><i class="bi bi-door-closed"></i><b>' + (s.stats.rooms || '-') + '</b><span>ห้องส่วนตัว</span></div>' +
      '<div class="stat"><i class="bi bi-p-circle"></i><b style="font-size:' + (s.parking && s.parking.length > 4 ? '.86rem' : '1.15rem') + '">' + esc(s.parking || '-') + '</b><span>ที่จอดรถ</span></div></div></section>';
    h += '<section class="sec" id="secSvc"><div class="sec-h"><h2>เมนูบริการ</h2><span class="muted" style="font-size:.85rem">ราคาต่อท่าน</span></div>' +
      (s.categories.length > 1 ? '<div class="pills" id="catPills"><button class="pill on" data-pc="">ทั้งหมด</button>' + s.categories.map(function (c) { return '<button class="pill" data-pc="' + esc(c.cat_id) + '">' + esc(c.name) + '</button>'; }).join('') + '</div>' : '') +
      '<div id="svcList"></div></section>';
    if (s.staff.length) h += '<section class="sec"><div class="sec-h"><h2>หมอนวดของร้าน</h2><a href="javascript:void 0" data-open="2">เลือกหมอนวด</a></div><div class="hscroll" id="tpList"></div></section>';
    var facs = Object.keys(FAC_LABEL).filter(function (k) { return (s.facilities[k] || []).length; });
    if (facs.length) h += '<section class="sec"><div class="sec-h"><h2>บริการและสิ่งอำนวยความสะดวก</h2></div>' + facs.map(function (k) {
      return '<div class="am-g">' + FAC_LABEL[k] + '</div><div class="am">' + s.facilities[k].map(function (x) { return '<div><i class="bi bi-check-lg"></i>' + esc(x) + '</div>'; }).join('') + '</div>';
    }).join('') + '</section>';
    var nextHol = (s.holidays || [])[0];
    h += '<section class="sec"><div class="sec-h"><h2>เวลาทำการ</h2></div><div class="tc-grid">' +
      '<div class="tc"><i class="bi bi-door-open"></i><b>' + (th.on ? fm(th.open) : 'ปิด') + '</b><span>' + (th.on ? 'เปิดวันนี้' : 'วันนี้ร้านปิด') + '</span></div>' +
      '<div class="tc"><i class="bi bi-moon-stars"></i><b>' + (th.on ? fm(th.close) : '-') + '</b><span>ปิดร้าน' + (th.on && th.close > 1440 ? ' (เลยเที่ยงคืน)' : '') + '</span></div></div>' +
      '<div class="hours-list">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) {
        var x = s.hours[String(d)] || {};
        return '<div class="' + (d === NU.wd(today) ? 'today' : '') + '"><span>วัน' + NU.DAYS[d] + '</span><span>' + (x.on ? fm(x.open) + ' ถึง ' + fm(x.close) : 'ปิด') + '</span></div>';
      }).join('') + '</div>' + (nextHol ? '<div class="note"><i class="bi bi-info-circle"></i><span>หยุดพิเศษ ' + esc(NU.thDate(nextHol.date, 'long')) + (nextHol.note ? ' (' + esc(nextHol.note) + ')' : '') + '</span></div>' : '') + '</section>';
    h += '<section class="sec"><div class="sec-h"><h2>เงื่อนไขการจอง</h2></div>' + s.conditions.map(function (c, i) {
      var ic = ['bi-wallet2', 'bi-arrow-repeat', 'bi-alarm', 'bi-heart-pulse', 'bi-people', 'bi-info-circle'][i] || 'bi-info-circle';
      return '<div class="cond"><i class="bi ' + ic + '"></i><span>' + esc(c) + '</span></div>';
    }).join('') + '</section>';
    if (s.address || s.lat) h += '<section class="sec"><div class="sec-h"><h2>ที่ตั้ง</h2></div><div class="mapc"><div class="pin"><i class="bi bi-geo-alt-fill"></i></div><div style="flex:1;min-width:0;font-size:.92rem;line-height:1.45">' +
      esc(s.address || s.name) + (s.district || s.province ? '<div class="muted">' + esc([s.district, s.province].filter(Boolean).join(' ')) + '</div>' : '') + '</div><button class="btn-soft" id="spMap">นำทาง</button></div>' +
      (s.phone ? '<button class="btn-ghost" id="spCall" style="margin-top:.7rem"><i class="bi bi-telephone"></i> โทร ' + esc(s.phone) + '</button>' : '') + '</section>';
    h += '<section class="sec"><div class="sec-h"><h2>รีวิวจากลูกค้า</h2></div><div id="rvBox">' + reviewSum(s) + '</div></section>' + credit();
    view.innerHTML = h + '<div class="bbar"><div class="bb-price"><b id="bbPrice"></b><div class="bb-sub" id="bbSub"></div></div><button class="btn-book" id="bbBook">จองคิว</button></div>';

    drawServices(s, '');
    drawStaff(s);
    syncShop(s);
    loadReviews(s);

    NU.$('#spBack').onclick = function () { NU.back(); };
    NU.$('#bbBook').onclick = function () { openBook(1); };
    NU.$('.chips').onclick = function (e) { var c = e.target.closest('[data-chip]'); if (c) openBook(+c.getAttribute('data-chip')); };
    var pills = NU.$('#catPills');
    if (pills) pills.onclick = function (e) { var p = e.target.closest('[data-pc]'); if (!p) return; NU.$$('#catPills .pill').forEach(function (x) { x.classList.toggle('on', x === p); }); drawServices(s, p.getAttribute('data-pc')); };
    var op = NU.$('[data-open="2"]'); if (op) op.onclick = function () { openBook(2); };
    var mp = NU.$('#spMap'); if (mp) mp.onclick = function () { NU.open(mapUrl(s)); };
    var cl = NU.$('#spCall'); if (cl) cl.onclick = function () { location.href = 'tel:' + s.phone; };
    NU.$('#spShare').onclick = function () { share(s); };
    NU.$('#spFav').onclick = function () { toggleFav(s, this); };
    var tr = NU.$('#galTrack');
    var setIdx = function (i) {
      var c = NU.$('#galCount'); if (c) c.textContent = (i + 1) + '/' + gal.length;
      NU.$$('#thumbs img').forEach(function (x, k) { x.classList.toggle('on', k === i); });
    };
    tr.onscroll = function () { setIdx(Math.round(tr.scrollLeft / tr.clientWidth)); };
    NU.$$('.gal-nav').forEach(function (x) { x.onclick = function () { var i = Math.round(tr.scrollLeft / tr.clientWidth) + Number(x.getAttribute('data-g')); i = (i + gal.length) % gal.length; tr.scrollTo({ left: i * tr.clientWidth, behavior: 'smooth' }); }; });
    var thb = NU.$('#thumbs'); if (thb) thb.onclick = function (e) { var im = e.target.closest('[data-i]'); if (im) tr.scrollTo({ left: +im.getAttribute('data-i') * tr.clientWidth, behavior: 'smooth' }); };
  }

  function drawServices(s, cat) {
    var p1 = BK.persons[0];
    NU.$('#svcList').innerHTML = s.services.filter(function (x) { return !cat || x.cat_id === cat; }).map(function (x) {
      var sel = p1.service_id === x.service_id;
      return '<div class="svc' + (sel ? ' sel' : '') + '" data-svc="' + esc(x.service_id) + '">' + (x.image ? '<img class="svc-img" src="' + esc(x.image) + '" alt="" loading="lazy">' : '<span class="svc-img ph" style="display:grid;place-items:center;font-size:1.6rem;color:#c9a88f"><i class="bi bi-stars"></i></span>') +
        '<div class="svc-b"><div class="svc-n">' + esc(x.name) + '</div><div class="svc-d">' + esc(x.desc || x.cat_name) + '</div><div class="dur">' + x.variants.map(function (v) {
          return '<button type="button" data-min="' + v.min + '" class="' + (sel && p1.min === v.min ? 'on' : '') + '">' + v.min + ' นาที<small>฿' + money(v.price) + '</small></button>';
        }).join('') + '</div></div></div>';
    }).join('') || '<div class="muted">ไม่มีบริการในหมวดนี้</div>';
    NU.$('#svcList').onclick = function (e) {
      var card = e.target.closest('[data-svc]'); if (!card) return;
      var sv = svcOf(s, card.getAttribute('data-svc'));
      var d = e.target.closest('[data-min]');
      BK.persons[0].service_id = sv.service_id;
      BK.persons[0].min = d ? +d.getAttribute('data-min') : (sv.variants.some(function (v) { return v.min === BK.persons[0].min; }) ? BK.persons[0].min : sv.variants[0].min);
      fixPrefs(s);
      BK.start_min = null;
      drawServices(s, cat); drawStaff(s); syncShop(s);
    };
  }
  function staffFor(s, svcId) { return s.staff.filter(function (x) { return x.skills.indexOf(svcId) >= 0; }); }
  function fixPrefs(s) {
    BK.persons.forEach(function (p) { if (p.pref !== 'any' && p.pref !== 'f' && p.pref !== 'm' && !staffFor(s, p.service_id).some(function (x) { return x.staff_id === p.pref; })) p.pref = BK.mode === 'pick' ? '' : BK.mode; });
  }
  function avatar(st, cls) {
    return st.photo_url ? '<img class="' + (cls || 'tp-av') + '" src="' + esc(st.photo_url) + '" alt="" loading="lazy">' : '<span class="' + (cls || 'tp-av') + ' tp-any" style="font-size:1.3rem">' + esc((st.nickname || '?').charAt(0)) + '</span>';
  }
  function drawStaff(s) {
    var box = NU.$('#tpList'); if (!box) return;
    var p1 = BK.persons[0];
    box.innerHTML = '<div class="tp' + (p1.pref === 'any' || p1.pref === 'f' || p1.pref === 'm' || !p1.pref ? ' sel' : '') + '" data-tp="any"><span class="tp-av tp-any"><i class="bi bi-shuffle"></i></span><div class="tp-n">ไม่ระบุ</div><div class="tp-s">ร้านจัดหมอนวดที่ว่างให้</div></div>' +
      s.staff.map(function (st) {
        var can = st.skills.indexOf(p1.service_id) >= 0;
        return '<div class="tp' + (p1.pref === st.staff_id ? ' sel' : '') + '" data-tp="' + esc(st.staff_id) + '" style="' + (can ? '' : 'opacity:.45') + '">' + avatar(st) + '<div class="tp-n">' + esc(st.nickname) + '</div><div class="tp-s">' + (st.reviews ? '<i class="bi bi-star-fill star"></i> ' + st.rating + ' · ' : '') + esc(st.level_label + (st.years ? ' · ' + st.years + ' ปี' : '')) + '<br>' + esc(st.skill_names.slice(0, 2).join(', ')) + '</div></div>';
      }).join('');
    box.onclick = function (e) {
      var t = e.target.closest('[data-tp]'); if (!t) return;
      var id = t.getAttribute('data-tp');
      if (id === 'any') { BK.persons[0].pref = 'any'; if (BK.mode === 'pick' && BK.persons.length === 1) BK.mode = 'any'; }
      else {
        var st = s.staff.filter(function (x) { return x.staff_id === id; })[0];
        if (st.skills.indexOf(BK.persons[0].service_id) < 0) { NU.toast(st.nickname + ' ไม่ได้ให้บริการ ' + svcOf(s, BK.persons[0].service_id).name, 'error'); return; }
        BK.mode = 'pick';
        BK.persons.forEach(function (p, i) { if (i && p.pref === id) p.pref = ''; });
        BK.persons[0].pref = id;
      }
      BK.start_min = null;
      drawStaff(s); syncShop(s);
    };
  }
  function syncShop(s) {
    var n = BK.persons.length;
    var c = NU.$('#chDate'); if (!c) return;
    c.textContent = (NU.relDay(BK.date) ? NU.relDay(BK.date) + ' ' : '') + NU.thDate(BK.date, 'day');
    NU.$('#chTime').textContent = BK.start_min === null ? 'เลือกเวลา' : fm(BK.start_min);
    NU.$('#chPax').textContent = n + ' ท่าน';
    NU.$('#bbPrice').innerHTML = '฿' + money(totalOf(s)) + '<small>/ ' + n + ' ท่าน</small>';
    var p1 = BK.persons[0], sv = svcOf(s, p1.service_id);
    NU.$('#bbSub').textContent = sv.name + ' ' + p1.min + ' นาที' + (n > 1 ? ' และอีก ' + (n - 1) + ' ท่าน' : '');
  }
  function reviewSum(s) {
    if (!s.reviews) return '<div class="muted" style="font-size:.92rem">ยังไม่มีรีวิว ลูกค้าที่ใช้บริการแล้วจะให้คะแนนได้หลังจบงาน</div>';
    var max = Math.max.apply(null, s.rating_dist) || 1;
    return '<div class="rv-sum"><div style="text-align:center"><div class="rv-big">' + s.rating + '</div>' + NU.stars(s.rating) + '<div class="muted" style="font-size:.8rem">' + s.reviews + ' รีวิว</div></div><div class="bars">' +
      [5, 4, 3, 2, 1].map(function (k) { return '<div class="bar">' + k + '<div><span style="width:' + Math.round(s.rating_dist[k - 1] * 100 / max) + '%"></span></div></div>'; }).join('') + '</div></div><div id="rvList"></div>';
  }
  function loadReviews(s) {
    if (!s.reviews) return;
    NU.api('pub.reviews', { shop_id: s.shop_id, size: 5 }).then(function (d) {
      var el = NU.$('#rvList'); if (!el) return;
      el.innerHTML = d.rows.map(function (r) {
        return '<div class="rv"><div class="rv-h"><b>' + esc(r.name) + '</b>' + NU.stars(r.rating) + '</div><p>' + esc(r.text || '') + '</p>' + ((r.tags || []).length ? '<div class="lc-tags" style="margin-top:.35rem">' + r.tags.map(function (t) { return '<span class="tg">' + esc(t) + '</span>'; }).join('') + '</div>' : '') + (r.staff ? '<div class="muted" style="font-size:.8rem;margin-top:.25rem">หมอนวด ' + esc(r.staff) + '</div>' : '') +
          (r.reply ? '<div class="muted" style="font-size:.85rem;margin-top:.45rem;border-left:3px solid var(--sb-primary-200);padding-left:.6rem">ร้านตอบ: ' + esc(r.reply) + '</div>' : '') + '</div>';
      }).join('');
    }).catch(function () { /* รีวิวโหลดไม่ได้ไม่กระทบการจอง */ });
  }
  function share(s) {
    var c = NU.cfgPub || {};
    var url = c.liff_customer ? 'https://liff.line.me/' + c.liff_customer + '?shop=' + encodeURIComponent(s.shop_id) : location.href.split('#')[0] + '?shop=' + encodeURIComponent(s.shop_id);
    if (NU.liffOk && window.liff.isApiAvailable && window.liff.isApiAvailable('shareTargetPicker')) {
      window.liff.shareTargetPicker([{ type: 'text', text: s.name + '\nจองคิวนวดออนไลน์ได้ที่ ' + url }]).catch(function () { /* ผู้ใช้ปิดหน้าต่าง */ });
    } else if (navigator.share) navigator.share({ title: s.name, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { NU.toast('คัดลอกลิงก์ร้านแล้ว', 'success'); });
  }
  function toggleFav(s, btn) {
    NU.auth.ensure().then(function (me) {
      var on = (me.favorites || []).indexOf(s.shop_id) < 0;
      return NU.api('cus.favorite', { shop_id: s.shop_id, on: on }, { auth: true, toast: true }).then(function (m) {
        NU.auth.setMe(m);
        btn.innerHTML = '<i class="bi bi-heart' + (on ? '-fill' : '') + '"></i>';
      });
    }).catch(NU.fail);
  }

  /* ======================================================
   * แผ่นจองคิว 4 ขั้น
   * ====================================================== */
  var STEP_LBL = ['', 'ขั้นที่ 1 จาก 4 · เลือกบริการ', 'ขั้นที่ 2 จาก 4 · เลือกหมอนวด', 'ขั้นที่ 3 จาก 4 · เลือกวันและเวลา', 'ขั้นที่ 4 จาก 4 · ยืนยันการจอง'];
  function stepsHtml(n) { return '<div class="steps">' + [1, 2, 3, 4].map(function (i) { return '<span class="' + (i <= n ? 'on' : '') + '"></span>'; }).join('') + '</div><div class="step-lbl">' + STEP_LBL[n] + '</div>'; }
  function openBook(step) {
    var s = NU.state.shop;
    if (!s) return;
    NU.sheet.open({ title: 'จองคิว ' + s.name, onClose: function () { syncShop(s); drawServices(s, ''); drawStaff(s); } });
    goStep(step || 1);
  }
  NU.openBook = openBook;
  function foot(back, next, nextLabel, disabled) {
    return (back ? '<button class="btn-ghost" data-step="' + back + '"><i class="bi bi-chevron-left"></i></button>' : '') +
      '<button class="btn-main" id="stNext"' + (disabled ? ' disabled' : '') + ' data-next="' + next + '">' + esc(nextLabel || 'ถัดไป') + '</button>';
  }
  function bindFoot(onNext) {
    NU.$('#shFoot').onclick = function (e) {
      var b = e.target.closest('[data-step]'); if (b) { goStep(+b.getAttribute('data-step')); return; }
      var n = e.target.closest('#stNext'); if (n && !n.disabled) onNext(n);
    };
  }
  function goStep(n) {
    var s = NU.state.shop;
    if (n === 1) step1(s); else if (n === 2) step2(s); else if (n === 3) step3(s); else step4(s);
  }

  function step1(s) {
    var opts = s.categories.map(function (c) {
      return '<optgroup label="' + esc(c.name) + '">' + s.services.filter(function (x) { return x.cat_id === c.cat_id; }).map(function (x) { return '<option value="' + esc(x.service_id) + '">' + esc(x.name) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
    function draw() {
      NU.sheet.set({
        steps: stepsHtml(1),
        body: '<div class="stepper"><div><b style="font-size:1rem">จำนวนผู้รับบริการ</b><div class="muted" style="font-size:.82rem">เริ่มพร้อมกัน สูงสุด ' + BK.max + ' ท่าน</div></div><div class="ctl"><button data-px="-1" aria-label="ลด"' + (BK.persons.length <= 1 ? ' disabled' : '') + '><i class="bi bi-dash"></i></button><b>' + BK.persons.length + '</b><button data-px="1" aria-label="เพิ่ม"' + (BK.persons.length >= BK.max ? ' disabled' : '') + '><i class="bi bi-plus"></i></button></div></div>' +
          BK.persons.map(function (p, i) {
            var sv = svcOf(s, p.service_id);
            return '<div class="person"><div class="person-h"><span><i class="bi bi-person"></i> ท่านที่ ' + (i + 1) + '</span><span style="color:var(--sb-primary-700)">฿' + money(priceOf(s, p)) + '</span></div>' +
              '<select data-ps="' + i + '" aria-label="บริการของท่านที่ ' + (i + 1) + '">' + opts.replace('value="' + esc(p.service_id) + '"', 'value="' + esc(p.service_id) + '" selected') + '</select>' +
              '<div class="dur">' + sv.variants.map(function (v) { return '<button type="button" data-pm="' + i + '" data-min="' + v.min + '" class="' + (v.min === p.min ? 'on' : '') + '">' + v.min + ' นาที<small>฿' + money(v.price) + '</small></button>'; }).join('') + '</div></div>';
          }).join('') + '<div class="sum"><div class="sum-row total" style="border:0;margin:0;padding:0"><span>รวม</span><span>฿' + money(totalOf(s)) + '</span></div></div>',
        foot: foot(0, 2)
      });
    }
    draw();
    var body = NU.$('#shBody');
    body.onclick = function (e) {
      var px = e.target.closest('[data-px]');
      if (px && !px.disabled) {
        if (+px.getAttribute('data-px') > 0) { var last = BK.persons[BK.persons.length - 1]; BK.persons.push({ service_id: last.service_id, min: last.min, pref: BK.mode === 'pick' ? '' : BK.mode }); }
        else BK.persons.pop();
        saveWant({ pax: BK.persons.length }); BK.start_min = null; draw(); return;
      }
      var d = e.target.closest('[data-pm]');
      if (d) { BK.persons[+d.getAttribute('data-pm')].min = +d.getAttribute('data-min'); BK.start_min = null; draw(); }
    };
    body.onchange = function (e) {
      var sel = e.target.closest('[data-ps]'); if (!sel) return;
      var p = BK.persons[+sel.getAttribute('data-ps')], sv = svcOf(s, sel.value);
      p.service_id = sv.service_id;
      if (!sv.variants.some(function (v) { return v.min === p.min; })) p.min = sv.variants[0].min;
      fixPrefs(s); BK.start_min = null; draw();
    };
    bindFoot(function () { goStep(2); });
  }

  function step2(s) {
    function pickOk() { return BK.mode !== 'pick' || BK.persons.every(function (p) { return p.pref && p.pref !== 'any'; }); }
    function draw() {
      var hasF = s.staff.some(function (x) { return x.gender === 'f'; }), hasM = s.staff.some(function (x) { return x.gender === 'm'; });
      var opt = function (k, ic, t, sub, dis) { return '<button class="opt' + (BK.mode === k ? ' on' : '') + '" data-mode="' + k + '"' + (dis ? ' disabled style="opacity:.45"' : '') + '><i class="bi ' + ic + '"></i><span><b>' + t + '</b><small>' + sub + '</small></span></button>'; };
      var h = '<div class="opt-grid">' + opt('any', 'bi-shuffle', 'ไม่ระบุ', 'ร้านจัดให้ ได้คิวเร็วสุด') + opt('pick', 'bi-person-check', 'เลือกเอง', 'ระบุหมอนวดที่ชอบ', !s.staff.length) +
        opt('f', 'bi-gender-female', 'หมอนวดหญิง', 'ร้านเลือกคนที่ว่าง', !hasF) + opt('m', 'bi-gender-male', 'หมอนวดชาย', 'ร้านเลือกคนที่ว่าง', !hasM) + '</div>';
      if (BK.mode === 'pick') {
        h += BK.persons.map(function (p, i) {
          var list = staffFor(s, p.service_id), taken = BK.persons.filter(function (q, j) { return j !== i; }).map(function (q) { return q.pref; });
          return '<div class="lbl">ท่านที่ ' + (i + 1) + ' <span class="lbl-sub">· ' + esc(svcOf(s, p.service_id).name) + ' ' + p.min + ' นาที</span></div>' +
            (list.length ? '<div class="tp-mini" style="margin-bottom:1rem">' + list.map(function (st) {
              return '<button data-pp="' + i + '" data-id="' + esc(st.staff_id) + '" class="' + (p.pref === st.staff_id ? 'on' : '') + '"' + (taken.indexOf(st.staff_id) >= 0 ? ' disabled' : '') + '>' +
                (st.photo_url ? '<img src="' + esc(st.photo_url) + '" alt="">' : '<span class="av0">' + esc(st.nickname.charAt(0)) + '</span>') + esc(st.nickname) + '</button>';
            }).join('') + '</div>' : '<div class="note-box warn"><i class="bi bi-info-circle"></i><span>ไม่มีหมอนวดที่เลือกได้สำหรับบริการนี้ ร้านจะจัดให้</span></div>');
        }).join('');
      } else {
        h += '<div class="note-box info"><i class="bi bi-lightbulb"></i><span>' + (BK.mode === 'any' ? 'ระบบจะจัดหมอนวดที่ว่างและเชี่ยวชาญบริการที่เลือกให้อัตโนมัติ' : 'ระบบจะจัดหมอนวด' + (BK.mode === 'f' ? 'หญิง' : 'ชาย') + 'ที่ว่างให้ทุกท่าน') + '</span></div>';
      }
      NU.sheet.set({ steps: stepsHtml(2), body: h, foot: foot(1, 3, 'ถัดไป', !pickOk()) });
    }
    draw();
    NU.$('#shBody').onclick = function (e) {
      var m = e.target.closest('[data-mode]');
      if (m && !m.disabled) {
        BK.mode = m.getAttribute('data-mode');
        BK.persons.forEach(function (p) {
          if (BK.mode === 'pick') { if (p.pref === 'any' || p.pref === 'f' || p.pref === 'm') p.pref = ''; var l = staffFor(s, p.service_id); if (l.length === 0) p.pref = 'any'; }
          else p.pref = BK.mode;
        });
        BK.start_min = null; draw(); return;
      }
      var pp = e.target.closest('[data-pp]');
      if (pp && !pp.disabled) { BK.persons[+pp.getAttribute('data-pp')].pref = pp.getAttribute('data-id'); BK.start_min = null; draw(); }
    };
    bindFoot(function () { goStep(3); });
  }

  function step3(s) {
    var today = NU.todayStr(), n = Math.min(30, Math.max(1, s.rules.days_ahead || 14));
    var dates = [];
    for (var i = 0; i <= n; i++) dates.push(NU.addDays(today, i));
    if (BK.date > dates[dates.length - 1] || BK.date < today) BK.date = nextOpen(s, today);
    var body = '<div class="dates" id="dStrip">' + dates.map(function (d) {
      var off = !dayOpen(s, d);
      return '<button class="dt' + (d === BK.date ? ' on' : '') + (off ? ' off' : '') + '" data-d="' + d + '"' + (off ? ' disabled' : '') + '><small>' + (d === today ? 'วันนี้' : NU.DAYS_S[NU.wd(d)]) + '</small><b>' + Number(d.slice(8)) + '</b><small>' + NU.TH_M[Number(d.slice(5, 7)) - 1] + '</small></button>';
    }).join('') + '</div><div id="slotBox"></div>';
    NU.sheet.set({ steps: stepsHtml(3), body: body, foot: foot(2, 4, 'ถัดไป', BK.start_min === null) });
    var on = NU.$('#dStrip .dt.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    NU.$('#dStrip').onclick = function (e) {
      var b = e.target.closest('[data-d]'); if (!b || b.disabled) return;
      BK.date = b.getAttribute('data-d'); BK.start_min = null; saveWant({ date: BK.date });
      NU.$$('#dStrip .dt').forEach(function (x) { x.classList.toggle('on', x === b); });
      NU.$('#stNext').disabled = true;
      loadSlots();
    };
    function loadSlots() {
      var box = NU.$('#slotBox'), date = BK.date;
      box.innerHTML = '<div class="skel" style="height:44px;margin-bottom:.5rem"></div><div class="skel" style="height:44px;margin-bottom:.5rem"></div><div class="skel" style="height:44px"></div>';
      NU.api('pub.slots', { shop_id: s.shop_id, date: date, persons: BK.persons }).then(function (r) {
        if (date !== BK.date || !NU.$('#slotBox')) return;
        var okN = r.slots.filter(function (x) { return x.ok; }).length;
        if (!r.slots.length || !okN) {
          box.innerHTML = NU.empty('bi-calendar-x', r.day && !r.day.on ? 'วันนี้ร้านปิด' : 'คิวเต็มแล้ว', 'ลองเลือกวันอื่น' + (BK.mode !== 'any' ? ' หรือเปลี่ยนเป็น "ไม่ระบุหมอนวด"' : ''));
          return;
        }
        var groups = [['ช่วงเช้า', 'bi-sunrise', 0, 720], ['ช่วงบ่าย', 'bi-sun', 720, 1020], ['ช่วงเย็น', 'bi-sunset', 1020, 1260], ['ช่วงดึก', 'bi-moon-stars', 1260, 9999]];
        box.innerHTML = groups.map(function (g) {
          var list = r.slots.filter(function (x) { return x.t >= g[2] && x.t < g[3]; });
          if (!list.length) return '';
          return '<div class="slot-g"><i class="bi ' + g[1] + '"></i>' + g[0] + '</div><div class="slots">' + list.map(function (x) {
            return '<button class="sl' + (x.t === BK.start_min ? ' on' : '') + '" data-t="' + x.t + '"' + (x.ok ? '' : ' disabled') + '>' + esc(x.label) + '</button>';
          }).join('') + '</div>';
        }).join('') + '<div class="legend"><span><span class="dot" style="background:var(--sb-primary)"></span>เลือกแล้ว</span><span><span class="dot" style="background:#d1d5db"></span>เต็ม</span><span>ว่าง ' + okN + ' ช่วงเวลา</span></div>';
        if (BK.start_min !== null && !r.slots.some(function (x) { return x.t === BK.start_min && x.ok; })) BK.start_min = null;
        NU.$('#stNext').disabled = BK.start_min === null;
      }).catch(function (e) { box.innerHTML = '<div class="err-box">' + esc(e.message) + '</div>'; });
    }
    NU.$('#shBody').onclick = function (e) {
      var b = e.target.closest('.sl'); if (!b || b.disabled) return;
      BK.start_min = +b.getAttribute('data-t');
      NU.$$('#slotBox .sl').forEach(function (x) { x.classList.toggle('on', x === b); });
      NU.$('#stNext').disabled = false;
    };
    bindFoot(function () { goStep(4); });
    loadSlots();
  }

  function step4(s) {
    if (BK.start_min === null) { goStep(3); return; }
    if (!NU.auth.loggedIn()) {
      NU.sheet.set({
        steps: stepsHtml(4),
        body: '<div class="sum">' + sumRows(s, null) + '</div><div class="note-box info"><i class="bi bi-shield-lock"></i><span>เข้าสู่ระบบด้วย LINE เพื่อยืนยันการจอง ร้านจะส่งรายละเอียดคิวให้ทาง LINE</span></div>' +
          '<button class="btn-line" id="lgLine"><i class="bi bi-line"></i> เข้าสู่ระบบด้วย LINE</button>',
        foot: foot(3, 0, 'ยืนยันการจอง', true)
      });
      NU.$('#lgLine').onclick = function () { var b = this; NU.busy(b, true, 'กำลังเข้าสู่ระบบ'); NU.auth.ensure().then(function () { step4(s); }).catch(function (e) { NU.busy(b, false); NU.fail(e); }); };
      bindFoot(function () {});
      return;
    }
    var me = NU.auth.me();
    NU.sheet.set({
      steps: stepsHtml(4),
      body: '<div class="line-user"><span class="lg">' + (me.picture ? '<img src="' + esc(me.picture) + '" alt="" style="width:100%;height:100%;border-radius:11px;object-fit:cover">' : '<i class="bi bi-line"></i>') + '</span><div style="min-width:0"><b>' + esc(me.display_name || me.name) + '</b><div class="muted" style="font-size:.8rem">เข้าสู่ระบบด้วย LINE แล้ว</div></div></div>' +
        '<div class="fld"><label for="bName">ชื่อผู้จอง</label><input id="bName" maxlength="80" value="' + esc(me.name || me.display_name) + '" autocomplete="name"></div>' +
        '<div class="fld"><label for="bPhone">เบอร์โทร</label><input id="bPhone" type="tel" inputmode="tel" maxlength="12" value="' + esc(me.phone) + '" placeholder="08xxxxxxxx" autocomplete="tel"></div>' +
        '<div class="fld"><label for="bNote">จุดที่ต้องการเน้น หรือข้อควรระวัง <span class="lbl-sub">(ถ้ามี)</span></label><textarea id="bNote" rows="2" maxlength="300" placeholder="เช่น ปวดบ่าข้างขวา ตั้งครรภ์ 4 เดือน แพ้น้ำมันบางชนิด">' + esc(BK.note || '') + '</textarea></div>' +
        '<div class="lbl">คูปองส่วนลด <span class="lbl-sub">(ถ้ามี)</span></div><div class="cp-row"><input id="bCp" maxlength="20" placeholder="กรอกรหัสคูปอง" value="' + esc(BK.coupon || '') + '" autocapitalize="characters"><button class="btn-soft" id="bCpGo">' + (BK.coupon ? 'เอาออก' : 'ใช้คูปอง') + '</button></div>' +
        '<div class="lbl">สรุปการจอง</div><div class="sum" id="bSum">' + sumRows(s, null) + '<div class="skel" style="height:20px;margin-top:.4rem"></div></div>' +
        '<label class="chk"><input type="checkbox" id="bAcc"><span>ฉันได้อ่านและยอมรับ<a href="javascript:void 0" id="bCond">เงื่อนไขการจองของร้าน</a></span></label>',
      foot: foot(3, 0, 'ยืนยันการจอง', false)
    });
    NU.$('#bCond').onclick = function (e) { e.preventDefault(); NU.toast(s.conditions.slice(0, 3).join(' · ')); };
    NU.$('#bNote').oninput = function () { BK.note = this.value; };
    var quote = function () {
      return NU.api('cus.quote', { shop_id: s.shop_id, date: BK.date, start_min: BK.start_min, persons: BK.persons, coupon_code: BK.coupon || '' }, { auth: true }).then(function (q) {
        var el = NU.$('#bSum'); if (!el) return;
        BK.quote = q;
        el.innerHTML = sumRows(s, q);
        NU.$('#stNext').disabled = false;
        NU.$('#stNext').textContent = q.deposit ? 'จองและชำระมัดจำ ฿' + money(q.deposit) : 'ยืนยันการจอง';
      });
    };
    quote().catch(function (e) {
      if (e.auth) { step4(s); return; }
      if (BK.coupon) { NU.toast(e.message, 'error'); BK.coupon = ''; NU.$('#bCp').value = ''; NU.$('#bCpGo').textContent = 'ใช้คูปอง'; quote().catch(NU.fail); return; }
      var el = NU.$('#bSum'); if (el) el.innerHTML = '<div class="err-box" style="margin:0">' + esc(e.message) + '</div>';
      NU.$('#stNext').disabled = true;
    });
    NU.$('#bCpGo').onclick = function () {
      var b = this, code = NU.$('#bCp').value.trim().toUpperCase();
      if (BK.coupon) { BK.coupon = ''; NU.$('#bCp').value = ''; b.textContent = 'ใช้คูปอง'; quote().catch(NU.fail); return; }
      if (!code) { NU.toast('กรุณากรอกรหัสคูปอง', 'error'); return; }
      BK.coupon = code; NU.busy(b, true, '');
      quote().then(function () { NU.busy(b, false); b.textContent = 'เอาออก'; NU.toast('ใช้คูปอง ' + code + ' แล้ว', 'success'); })
        .catch(function (e) { NU.busy(b, false); BK.coupon = ''; NU.toast(e.message, 'error'); quote().catch(NU.fail); });
    };
    bindFoot(function (btn) {
      var name = NU.$('#bName').value.trim(), phone = NU.$('#bPhone').value.replace(/\D/g, '');
      if (!name) { NU.toast('กรุณากรอกชื่อผู้จอง', 'error'); NU.$('#bName').focus(); return; }
      if (!/^0\d{8,9}$/.test(phone)) { NU.toast('กรุณากรอกเบอร์โทรให้ถูกต้อง', 'error'); NU.$('#bPhone').focus(); return; }
      if (!NU.$('#bAcc').checked) { NU.toast('กรุณายอมรับเงื่อนไขการจอง', 'error'); return; }
      NU.busy(btn, true, 'กำลังจอง');
      var cur = NU.auth.me();
      var pre = name !== cur.name || phone !== cur.phone ? NU.api('cus.profileSave', { name: name, phone: phone, pdpa: true }, { auth: true }).then(function (m) { NU.auth.setMe(m); }) : Promise.resolve();
      pre.then(function () {
        return NU.api('cus.book', { shop_id: s.shop_id, date: BK.date, start_min: BK.start_min, persons: BK.persons, note: BK.note || '', accept: true, coupon_code: BK.coupon || '' }, { auth: true, request_id: BK.req });
      }).then(function (b) {
        BK.req = NU.rid(); BK.start_min = null; BK.note = ''; BK.coupon = '';
        NU.state.bkDirty = true;
        if (b.status === 'pending_payment') payView(b.booking_id); else doneView(b);
      }).catch(function (e) {
        NU.busy(btn, false);
        if (/ไม่ว่าง/.test(e.message)) { NU.toast(e.message, 'error'); BK.start_min = null; goStep(3); return; }
        NU.fail(e);
      });
    });
  }
  function sumRows(s, q) {
    var rows = '<div class="sum-row"><span>ร้าน</span><span>' + esc(s.name) + '</span></div><div class="sum-row"><span>วันที่</span><span>' + esc(NU.thDate(BK.date, 'long')) + '</span></div>' +
      '<div class="sum-row"><span>เวลา</span><span>' + (q ? esc(q.time_label) : fm(BK.start_min)) + '</span></div>';
    if (q) {
      rows += q.items.map(function (it) { return '<div class="sum-row"><span>ท่านที่ ' + it.person + ' · ' + esc(it.service_name) + ' ' + it.min + ' น. · ' + esc(it.staff_name) + '</span><span>฿' + money(it.price) + '</span></div>'; }).join('');
      if (q.coupon) rows += '<div class="sum-row" style="color:var(--sb-success)"><span>คูปอง ' + esc(q.coupon.code) + '</span><span>-฿' + money(q.coupon.discount) + '</span></div>';
      rows += '<div class="sum-row total"><span>รวม</span><span>฿' + money(q.net) + '</span></div>';
      if (q.deposit) rows += '<div class="sum-row"><span>ชำระมัดจำตอนนี้ (PromptPay)</span><span><b>฿' + money(q.deposit) + '</b></span></div><div class="sum-row"><span>ชำระที่ร้าน</span><span>฿' + money(q.net - q.deposit) + '</span></div>' +
        '<div class="muted" style="font-size:.82rem;margin-top:.3rem">ระบบกันคิวไว้ ' + q.hold_min + ' นาที กรุณาโอนและแนบสลิปภายในเวลา</div>';
      else rows += '<div class="muted" style="font-size:.82rem;margin-top:.3rem">ชำระที่ร้านหลังรับบริการ</div>';
      if (!q.auto_confirm) rows += '<div class="muted" style="font-size:.82rem">ร้านจะยืนยันคิวให้อีกครั้งทาง LINE</div>';
    }
    return rows;
  }
  function qrInto(box, text, size) {
    if (!box) return;
    box.innerHTML = '';
    if (window.QRCode) { try { new window.QRCode(box, { text: text, width: size || 148, height: size || 148, correctLevel: window.QRCode.CorrectLevel.M }); return; } catch (e) { /* แสดงรหัสแทน */ } }
    box.innerHTML = '<div style="display:grid;place-items:center;height:100%;font-weight:700;word-break:break-all;font-size:' + (text.length > 30 ? '.62rem' : '1rem') + ';text-align:center">' + esc(text) + '</div>';
  }
  function doneView(b) {
    var ok = b.status === 'confirmed';
    NU.sheet.set({
      title: ok ? 'จองคิวสำเร็จ' : 'ส่งคำขอจองแล้ว', steps: '',
      body: '<div class="done"><div class="done-ico"' + (ok ? '' : ' style="background:#fef6e7;color:#d97706"') + '><i class="bi bi-' + (ok ? 'check-lg' : 'hourglass-split') + '"></i></div>' +
        '<h3 style="font-weight:700;margin:0">' + (ok ? 'แล้วพบกันที่ร้านนะคะ' : 'รอร้านยืนยันคิว') + '</h3><div class="muted" style="font-size:.9rem">' + (ok ? 'แสดง QR นี้ที่หน้าร้านเพื่อเช็คอิน' : 'เมื่อร้านยืนยันแล้ว สถานะในหน้าการจองจะเปลี่ยนเป็น "ยืนยันแล้ว"') + '</div>' +
        '<div class="qr" id="qrBox"></div><div class="code">' + esc(b.code) + '</div></div>' +
        '<div class="sum" style="margin-top:1rem"><div class="sum-row"><span>ร้าน</span><span>' + esc(b.shop.name) + '</span></div><div class="sum-row"><span>วันที่</span><span>' + esc(NU.thDate(b.date, 'long')) + '</span></div>' +
        '<div class="sum-row"><span>เวลา</span><span>' + esc(b.time_label) + '</span></div>' + b.items.map(function (it) { return '<div class="sum-row"><span>' + esc(it.service_name + ' ' + it.min + ' น.') + '</span><span>' + esc(it.staff_name) + '</span></div>'; }).join('') +
        '<div class="sum-row total"><span>รวม</span><span>฿' + money(b.total) + '</span></div></div>' +
        '<div class="act-row"><button class="btn-soft" id="dCal"><i class="bi bi-calendar-plus"></i> เพิ่มลงปฏิทิน</button><button class="btn-soft" id="dMap"><i class="bi bi-signpost-2"></i> นำทาง</button></div>',
      foot: '<button class="btn-main" id="dMine">ดูการจองของฉัน</button>'
    });
    qrInto(NU.$('#qrBox'), b.code);
    NU.$('#dCal').onclick = function () { NU.open(calUrl(b, b.shop)); };
    NU.$('#dMap').onclick = function () { NU.open(mapUrl(b.shop)); };
    NU.$('#dMine').onclick = function () { NU.sheet.close(true); NU.go('bookings'); };
    NU.$('#shFoot').onclick = null;
  }

  /* ======================================================
   * การจองของฉัน
   * ====================================================== */
  function needLogin(view, title, sub) {
    view.innerHTML = '<div class="ph-top"><h1>' + esc(title) + '</h1></div>' + NU.empty('bi-person-lock', 'เข้าสู่ระบบก่อน', sub, '<div style="max-width:300px;margin:0 auto"><button class="btn-line" id="needLg"><i class="bi bi-line"></i> เข้าสู่ระบบด้วย LINE</button></div>');
    NU.$('#needLg').onclick = function () { var b = this; NU.busy(b, true, 'กำลังเข้าสู่ระบบ'); NU.auth.ensure().then(function () { NU.render(); }).catch(function (e) { NU.busy(b, false); NU.fail(e); }); };
  }
  NU.pages.bookings = {
    render: function (view, r) {
      if (!NU.auth.loggedIn()) { needLogin(view, 'การจองของฉัน', 'ดูคิวที่จองไว้ ประวัติการนวด และ QR สำหรับเช็คอิน'); return; }
      var tab = NU.state.bkTab || 'upcoming';
      view.innerHTML = '<div class="ph-top"><h1>การจองของฉัน</h1><button class="icon-btn" id="bkRe" aria-label="รีเฟรช"><i class="bi bi-arrow-clockwise"></i></button></div>' +
        '<div class="tabs" id="bkTabs"></div><div id="bkList" style="padding-top:1rem"><div class="page-pad"><div class="skel" style="height:130px;margin-bottom:.7rem"></div><div class="skel" style="height:130px"></div></div></div>';
      NU.$('#bkRe').onclick = function () { load(); };
      NU.$('#bkTabs').onclick = function (e) { var b = e.target.closest('[data-t]'); if (b) { tab = NU.state.bkTab = b.getAttribute('data-t'); load(); } };
      var rows = [];
      NU.$('#bkList').onclick = function (e) { var c = e.target.closest('[data-bk]'); if (c) detail(rows.filter(function (x) { return x.booking_id === c.getAttribute('data-bk'); })[0]); };
      function load() {
        NU.$('#bkList').style.opacity = '.5';
        return NU.api('cus.bookings', { tab: tab }, { auth: true }).then(function (d) {
          if (NU.state.route.page !== 'bookings') return;
          rows = d.rows;
          NU.$('#bkList').style.opacity = '';
          NU.$('#bkTabs').innerHTML = [['upcoming', 'กำลังจะถึง'], ['past', 'ผ่านแล้ว'], ['cancelled', 'ยกเลิก']].map(function (t) {
            return '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '<span class="n">' + (d.counts[t[0]] || 0) + '</span></button>';
          }).join('');
          NU.$('#bkList').innerHTML = rows.length ? rows.map(bkCard).join('') : NU.empty('bi-calendar2-heart', tab === 'upcoming' ? 'ยังไม่มีคิวที่จะถึง' : 'ไม่มีรายการ', tab === 'upcoming' ? 'เลือกร้านนวดแล้วจองคิวได้ในไม่กี่ขั้นตอน' : '',
            tab === 'upcoming' ? '<button class="btn-soft" onclick="NU.go(\'home\')"><i class="bi bi-search"></i> หาร้านนวด</button>' : '');
        }).catch(function (e) {
          NU.$('#bkList').style.opacity = '';
          if (e.auth) { needLogin(view, 'การจองของฉัน', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'); return; }
          NU.$('#bkList').innerHTML = '<div class="err-box">' + esc(e.message) + '</div>';
        });
      }
      return load();
    }
  };
  function bkCard(b) {
    var d = new Date(b.date + 'T12:00:00Z');
    return '<button class="bk" data-bk="' + esc(b.booking_id) + '"><div class="bk-h"><span class="bk-logo">' + logoBox(b.shop && b.shop.logo, 'bi-shop') + '</span><div style="flex:1;min-width:0"><b>' + esc(b.shop ? b.shop.name : '-') + '</b><small>' + esc(b.code) + '</small></div><span class="st st-' + b.status + '">' + esc(b.status_label || ST_LABEL[b.status]) + '</span></div>' +
      '<div class="bk-b"><div class="bk-date"><small>' + NU.DAYS_S[d.getUTCDay()] + '</small><b>' + d.getUTCDate() + '</b><small>' + NU.TH_M[d.getUTCMonth()] + '</small></div><div class="bk-i"><b>' + esc(b.time_label) + '</b>' +
      '<div>' + esc(b.items.map(function (it) { return it.service_name + ' ' + it.min + ' น.'; }).join(', ')) + '</div><div><i class="bi bi-person-heart"></i> ' + esc(b.items.map(function (it) { return it.staff_name; }).join(', ')) + ' · ฿' + money(b.total - (b.coupon ? b.coupon.discount : 0)) + '</div>' + (b.status === 'pending_payment' ? '<div style="color:#b45309;font-weight:600">แตะเพื่อชำระมัดจำ ฿' + money(b.payment.deposit_due) + '</div>' : b.policy && b.policy.can_review ? '<div style="color:var(--sb-primary-700);font-weight:600"><i class="bi bi-star"></i> แตะเพื่อให้คะแนน</div>' : '') + '</div><i class="bi bi-chevron-right" style="color:var(--sb-faint)"></i></div></button>';
  }
  /* ---------- รายละเอียดการจอง + เลื่อน ยกเลิก ชำระมัดจำ รีวิว ---------- */
  function detail(b) {
    if (!b) return;
    if (!NU.sheet.isOpen()) NU.sheet.open({ title: 'รายละเอียดการจอง', body: '', foot: '', onClose: refreshIfDirty });
    NU.sheet.set({ title: 'รายละเอียดการจอง', steps: '', body: '<div class="skel" style="height:220px"></div>', foot: '' });
    NU.api('cus.booking', { booking_id: b.booking_id }, { auth: true }).then(detailDraw).catch(function (e) { NU.sheet.set({ body: '<div class="err-box" style="margin:0">' + esc(e.message) + '</div>' }); });
  }
  function refreshIfDirty() { clearInterval(payTimer); if (NU.state.bkDirty && NU.state.route && NU.state.route.page === 'bookings') { NU.state.bkDirty = false; NU.render(); } }
  function detailDraw(b) {
    var live = ['pending', 'confirmed', 'checked_in', 'pending_verify'].indexOf(b.status) >= 0;
    var pol = b.policy || {}, pay = b.payment || {};
    var note = '';
    if (b.status === 'pending_payment') note = '<div class="note-box warn"><i class="bi bi-hourglass-split"></i><span>รอชำระมัดจำ ฿' + money(pay.deposit_due) + (b.expires_at ? ' ภายใน ' + esc(timeOf(b.expires_at)) + ' น.' : '') + (pay.slip_reject ? '<br><b>ร้านแจ้ง:</b> ' + esc(pay.slip_reject) : '') + '</span></div>';
    if (b.status === 'pending_verify') note = '<div class="note-box info"><i class="bi bi-receipt-cutoff"></i><span>ส่งสลิปแล้ว ร้านกำลังตรวจสอบมัดจำ ฿' + money(pay.deposit_due) + '</span></div>';
    if (b.status === 'cancelled') note = '<div class="note-box warn"><i class="bi bi-x-octagon"></i><span>' + (b.cancelled_by === 'customer' ? 'คุณยกเลิกการจองนี้' : 'ร้านยกเลิก') + (b.cancel_reason ? ': ' + esc(b.cancel_reason) : '') +
      (pay.refund === 'pending' ? '<br>ร้านจะติดต่อคืนมัดจำ ฿' + money(pay.deposit_paid) : pay.refund === 'done' ? '<br>ร้านคืนมัดจำแล้ว' : '') + '</span></div>';
    if (b.status === 'expired') note = '<div class="note-box warn"><i class="bi bi-clock-history"></i><span>หมดเวลาชำระมัดจำ ระบบปล่อยคิวแล้ว จองใหม่ได้จากหน้าร้าน</span></div>';
    var acts = '';
    if (b.status === 'pending_payment') acts += '<button class="btn-main" data-d="pay" style="margin-bottom:.5rem"><i class="bi bi-qr-code"></i> ชำระมัดจำ ฿' + money(pay.deposit_due) + '</button>';
    if (pol.can_review) acts += '<button class="btn-main" data-d="review" style="margin-bottom:.5rem"><i class="bi bi-star"></i> ให้คะแนนร้านและหมอนวด</button>';
    var small = [];
    if (pol.can_reschedule) small.push('<button class="btn-soft" data-d="move"><i class="bi bi-calendar2-range"></i> เลื่อนนัด</button>');
    if (pol.can_cancel) small.push('<button class="btn-soft" data-d="cancel" style="background:#fdecec;color:#b91c1c"><i class="bi bi-x-circle"></i> ยกเลิก</button>');
    NU.sheet.set({
      title: 'รายละเอียดการจอง',
      body: '<div class="done" style="padding-top:0"><span class="st st-' + b.status + '">' + esc(b.status_label) + '</span>' + (live ? '<div class="qr" id="qrBox"></div>' : '') + '<div class="code" style="margin-top:.5rem">' + esc(b.code) + '</div>' +
        (live ? '<div class="muted" style="font-size:.85rem">แสดง QR นี้ที่หน้าร้านเพื่อเช็คอิน</div>' : '') + '</div>' + note +
        '<div class="sum" style="margin-top:1rem"><div class="sum-row"><span>ร้าน</span><span>' + esc(b.shop ? b.shop.name : '-') + '</span></div><div class="sum-row"><span>วันที่</span><span>' + esc(NU.thDate(b.date, 'long')) + '</span></div>' +
        '<div class="sum-row"><span>เวลา</span><span>' + esc(b.time_label) + '</span></div>' + b.items.map(function (it) { return '<div class="sum-row"><span>ท่านที่ ' + it.person + ' · ' + esc(it.service_name + ' ' + it.min + ' น.') + '</span><span>' + esc(it.staff_name) + '</span></div>'; }).join('') +
        (b.coupon ? '<div class="sum-row" style="color:var(--sb-success)"><span>คูปอง ' + esc(b.coupon.code) + '</span><span>-฿' + money(b.coupon.discount) + '</span></div>' : '') +
        '<div class="sum-row total"><span>รวม</span><span>฿' + money(b.total - (b.coupon ? b.coupon.discount : 0)) + '</span></div>' +
        (pay.deposit_paid ? '<div class="sum-row"><span>ชำระมัดจำแล้ว</span><span>฿' + money(pay.deposit_paid) + '</span></div>' : '') + '</div>' +
        (b.note ? '<div class="note-box info"><i class="bi bi-sticky"></i><span>' + esc(b.note) + '</span></div>' : '') + acts +
        (small.length ? '<div class="act-row" style="margin-top:0">' + small.join('') + '</div>' : '') +
        (b.shop ? '<div class="act-row">' + (live ? '<button class="btn-soft" data-d="cal"><i class="bi bi-calendar-plus"></i> ปฏิทิน</button>' : '<button class="btn-soft" data-d="shop"><i class="bi bi-shop"></i> ไปที่ร้าน</button>') +
          '<button class="btn-soft" data-d="map"><i class="bi bi-signpost-2"></i> นำทาง</button>' + (b.shop.phone ? '<button class="btn-soft" data-d="call" style="grid-column:1/-1"><i class="bi bi-telephone"></i> โทรหาร้าน ' + esc(b.shop.phone) + '</button>' : '') + '</div>' : '') +
        ((pol.cancel_note || pol.reschedule_note) ? '<div class="muted" style="font-size:.82rem;margin-top:.9rem;text-align:center">' + esc(pol.cancel_note || pol.reschedule_note) + '</div>' : '') +
        (pol.can_reschedule ? '<div class="muted" style="font-size:.8rem;margin-top:.4rem;text-align:center">เลื่อนนัดเองได้อีก ' + pol.moves_left + ' ครั้ง</div>' : ''),
      foot: ''
    });
    if (live) qrInto(NU.$('#qrBox'), b.code);
    NU.$('#shBody').onclick = function (e) {
      var x = e.target.closest('[data-d]'); if (!x) return;
      var a = x.getAttribute('data-d');
      if (a === 'pay') payView(b.booking_id);
      else if (a === 'review') reviewView(b);
      else if (a === 'move') moveView(b);
      else if (a === 'cancel') cancelView(b);
      else if (a === 'cal') NU.open(calUrl(b, b.shop));
      else if (a === 'map') NU.open(mapUrl(b.shop));
      else if (a === 'call') location.href = 'tel:' + b.shop.phone;
      else if (a === 'shop') { NU.sheet.close(true); NU.go('shop/' + b.shop.shop_id); }
    };
  }
  function timeOf(iso) {
    try { return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)); } catch (e) { return ''; }
  }

  /* ----- ชำระมัดจำ: QR PromptPay + นับถอยหลัง + แนบสลิป ----- */
  var payTimer = null;
  function payView(id) {
    if (!NU.sheet.isOpen()) NU.sheet.open({ title: 'ชำระมัดจำ', body: '', foot: '', onClose: refreshIfDirty });
    NU.sheet.set({ title: 'ชำระมัดจำ', steps: '', body: '<div class="skel" style="height:320px"></div>', foot: '' });
    NU.api('cus.booking', { booking_id: id }, { auth: true }).then(function (b) {
      if (b.status !== 'pending_payment' || !b.pay) { if (b.status === 'pending_verify') slipSent(b); else detailDraw(b); return; }
      var p = b.pay, dataUrl = null;
      NU.sheet.set({
        body: '<div class="pay-card"><div class="pp-logo">PromptPay</div><div class="qr" id="ppQr" style="width:208px;height:208px"></div>' +
          '<div class="muted" style="font-size:.85rem">ชื่อบัญชี</div><b>' + esc(p.promptpay_name) + '</b><div class="muted" style="font-size:.8rem">PromptPay ลงท้าย ' + esc(p.promptpay_tail) + '</div>' +
          '<div class="pp-amt">฿' + money(p.amount) + '</div><div class="pp-time" id="ppTime"><i class="bi bi-stopwatch"></i> <span>--:--</span></div></div>' +
          (p.reject ? '<div class="note-box warn"><i class="bi bi-exclamation-triangle"></i><span><b>ร้านขอสลิปใหม่:</b> ' + esc(p.reject) + '</span></div>' : '') +
          '<div class="note-box info"><i class="bi bi-info-circle"></i><span>แคปหน้าจอ QR แล้วสแกนจ่ายในแอปธนาคาร ยอดต้องตรง ฿' + money(p.amount) + ' จากนั้นแนบสลิปด้านล่าง</span></div>' +
          '<div class="slip-pick" id="slipPick" role="button" tabindex="0"><i class="bi bi-image"></i><b>แนบรูปสลิปโอนเงิน</b><small>รูป JPG หรือ PNG</small></div>' +
          '<div class="sum"><div class="sum-row"><span>รหัสการจอง</span><span>' + esc(b.code) + '</span></div><div class="sum-row"><span>ร้าน</span><span>' + esc(b.shop.name) + '</span></div><div class="sum-row"><span>วันเวลา</span><span>' + esc(NU.thDate(b.date) + ' ' + b.time_label) + '</span></div></div>',
        foot: '<button class="btn-main" id="slipSend" disabled>ส่งสลิป</button>'
      });
      qrInto(NU.$('#ppQr'), p.payload, 188);
      clearInterval(payTimer);
      var tick = function () {
        var el = NU.$('#ppTime span'); if (!el) { clearInterval(payTimer); return; }
        var left = Math.floor((new Date(p.expires_at).getTime() - Date.now()) / 1000);
        if (left <= 0) { clearInterval(payTimer); el.textContent = 'หมดเวลาแล้ว'; NU.$('#ppTime').classList.add('over'); NU.$('#slipSend').disabled = true; return; }
        el.textContent = 'เหลือเวลา ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2) + ' นาที';
        NU.$('#ppTime').classList.toggle('warn', left < 180);
      };
      tick(); payTimer = setInterval(tick, 1000);
      var pick = function () {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function () {
          var f = inp.files[0]; if (!f) return;
          if (!/^image\//.test(f.type)) { NU.toast('กรุณาเลือกไฟล์รูปภาพ', 'error'); return; }
          shrink(f, 1400, 0.82).then(function (u) {
            dataUrl = u;
            var box = NU.$('#slipPick'); box.classList.add('has');
            box.innerHTML = '<img src="' + u + '" alt="สลิป" style="max-height:220px;border-radius:12px"><small>แตะเพื่อเปลี่ยนรูป</small>';
            if (!NU.$('#ppTime').classList.contains('over')) NU.$('#slipSend').disabled = false;
          }).catch(function () { NU.toast('อ่านรูปไม่ได้ ลองเลือกรูปใหม่', 'error'); });
        };
        NU.state.__slipInput = inp;
        inp.click();
      };
      NU.$('#slipPick').onclick = pick;
      NU.$('#slipSend').onclick = function () {
        if (!dataUrl) return;
        var btn = this; NU.busy(btn, true, 'กำลังส่งสลิป');
        NU.api('cus.slip', { booking_id: b.booking_id, mime: 'image/jpeg', data: dataUrl.split(',')[1] }, { auth: true, timeout: 60000 }).then(function (nb) {
          clearInterval(payTimer); NU.state.bkDirty = true; slipSent(nb);
        }).catch(function (e) { NU.busy(btn, false); NU.fail(e); });
      };
    }).catch(function (e) { NU.sheet.set({ body: '<div class="err-box" style="margin:0">' + esc(e.message) + '</div>' }); });
  }
  NU.payView = payView;
  function slipSent(b) {
    NU.sheet.set({
      title: 'ส่งสลิปแล้ว', steps: '',
      body: '<div class="done"><div class="done-ico" style="background:#e8f4fb;color:#0284c7"><i class="bi bi-receipt-cutoff"></i></div><h3 style="font-weight:700;margin:0">ร้านกำลังตรวจสอบมัดจำ</h3>' +
        '<div class="muted" style="font-size:.9rem">เมื่อร้านยืนยันแล้ว สถานะจะเปลี่ยนเป็น "ยืนยันแล้ว" ในหน้าการจองของฉัน</div><div class="qr" id="qrBox"></div><div class="code">' + esc(b.code) + '</div></div>' +
        '<div class="sum" style="margin-top:1rem"><div class="sum-row"><span>ร้าน</span><span>' + esc(b.shop.name) + '</span></div><div class="sum-row"><span>วันเวลา</span><span>' + esc(NU.thDate(b.date, 'long') + ' ' + b.time_label) + '</span></div>' +
        '<div class="sum-row"><span>มัดจำ</span><span>฿' + money(b.payment.deposit_due) + '</span></div></div>',
      foot: '<button class="btn-main" id="dMine">ดูการจองของฉัน</button>'
    });
    qrInto(NU.$('#qrBox'), b.code);
    NU.$('#dMine').onclick = function () { NU.state.bkDirty = false; NU.sheet.close(true); if (NU.state.route.page === 'bookings') NU.render(); else NU.go('bookings'); };
  }
  /** ย่อรูปในเครื่องก่อนส่ง (สลิปจากมือถือมักใหญ่หลาย MB) */
  function shrink(file, max, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = rej;
      fr.onload = function () {
        var im = new Image();
        im.onerror = rej;
        im.onload = function () {
          var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', q));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ----- ยกเลิกเอง ----- */
  function cancelView(b) {
    var chips = ['ติดธุระด่วน', 'ไม่สบาย', 'จองผิดวันเวลา', 'เปลี่ยนใจ'];
    var pol = b.policy || {};
    NU.sheet.set({
      title: 'ยกเลิกการจอง',
      body: '<div class="note-box warn"><i class="bi bi-exclamation-triangle"></i><span>ยกเลิกคิว ' + esc(b.code) + ' ' + esc(NU.thDate(b.date, 'long') + ' ' + b.time_label) + (pol.refund_note ? '<br>' + esc(pol.refund_note) : '') + '</span></div>' +
        '<div class="lbl">เหตุผล</div><div class="lc-tags" id="cxChips" style="margin-bottom:.6rem">' + chips.map(function (c) { return '<button class="pill" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
        '<div class="fld"><textarea id="cxR" rows="2" maxlength="200" placeholder="บอกร้านสั้น ๆ (ไม่บังคับ)"></textarea></div>',
      foot: '<button class="btn-ghost" id="cxBack"><i class="bi bi-chevron-left"></i></button><button class="btn-main" id="cxOk" style="background:#dc2626;box-shadow:none">ยืนยันยกเลิก</button>'
    });
    NU.$('#shBody').onclick = function (e) { var c = e.target.closest('[data-c]'); if (c) { NU.$('#cxR').value = c.getAttribute('data-c'); NU.$$('#cxChips .pill').forEach(function (x) { x.classList.toggle('on', x === c); }); } };
    NU.$('#cxBack').onclick = function () { detail(b); };
    NU.$('#cxOk').onclick = function () {
      var btn = this; NU.busy(btn, true, 'กำลังยกเลิก');
      NU.api('cus.cancel', { booking_id: b.booking_id, reason: NU.$('#cxR').value.trim() }, { auth: true, toast: true }).then(function (nb) { NU.state.bkDirty = true; detailDraw(nb); })
        .catch(function (e) { NU.busy(btn, false); NU.fail(e); });
    };
  }

  /* ----- เลื่อนนัดเอง ----- */
  function moveView(b) {
    var today = NU.todayStr(), sel = { date: b.date, t: null };
    var dates = []; for (var i = 0; i <= 30; i++) dates.push(NU.addDays(today, i));
    NU.sheet.set({
      title: 'เลื่อนนัด',
      body: '<div class="note-box info"><i class="bi bi-info-circle"></i><span>เดิม ' + esc(NU.thDate(b.date, 'long') + ' ' + b.time_label) + ' · บริการและหมอนวดตามที่จองไว้</span></div>' +
        '<div class="dates" id="mvDates">' + dates.map(function (d) { return '<button class="dt' + (d === sel.date ? ' on' : '') + '" data-d="' + d + '"><small>' + (d === today ? 'วันนี้' : NU.DAYS_S[NU.wd(d)]) + '</small><b>' + Number(d.slice(8)) + '</b><small>' + NU.TH_M[Number(d.slice(5, 7)) - 1] + '</small></button>'; }).join('') + '</div><div id="mvSlots"></div>',
      foot: '<button class="btn-ghost" id="mvBack"><i class="bi bi-chevron-left"></i></button><button class="btn-main" id="mvOk" disabled>ยืนยันเลื่อนนัด</button>'
    });
    var on = NU.$('#mvDates .dt.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    NU.$('#mvBack').onclick = function () { detail(b); };
    var load = function () {
      var box = NU.$('#mvSlots'), d0 = sel.date; sel.t = null; NU.$('#mvOk').disabled = true;
      box.innerHTML = '<div class="skel" style="height:120px"></div>';
      NU.api('cus.rescheduleSlots', { booking_id: b.booking_id, date: d0 }, { auth: true }).then(function (r) {
        if (d0 !== sel.date) return;
        var okN = r.slots.filter(function (x) { return x.ok && !(d0 === b.date && x.t === b.start_min); }).length;
        box.innerHTML = okN ? '<div class="slots">' + r.slots.map(function (x) { var mine = d0 === b.date && x.t === b.start_min; return '<button class="sl" data-t="' + x.t + '"' + (x.ok && !mine ? '' : ' disabled') + '>' + esc(x.label) + '</button>'; }).join('') + '</div>'
          : NU.empty('bi-calendar-x', r.day && !r.day.on ? 'วันนี้ร้านปิด' : 'ไม่มีเวลาว่าง', 'ลองเลือกวันอื่น');
      }).catch(function (e) { box.innerHTML = '<div class="err-box" style="margin:0">' + esc(e.message) + '</div>'; });
    };
    NU.$('#mvDates').onclick = function (e) { var x = e.target.closest('[data-d]'); if (!x) return; sel.date = x.getAttribute('data-d'); NU.$$('#mvDates .dt').forEach(function (y) { y.classList.toggle('on', y === x); }); load(); };
    NU.$('#mvSlots').onclick = function (e) { var x = e.target.closest('.sl'); if (!x || x.disabled) return; sel.t = +x.getAttribute('data-t'); NU.$$('#mvSlots .sl').forEach(function (y) { y.classList.toggle('on', y === x); }); NU.$('#mvOk').disabled = false; };
    NU.$('#mvOk').onclick = function () {
      var btn = this; NU.busy(btn, true, 'กำลังเลื่อนนัด');
      NU.api('cus.reschedule', { booking_id: b.booking_id, date: sel.date, start_min: sel.t }, { auth: true, toast: true }).then(function (nb) { NU.state.bkDirty = true; detailDraw(nb); })
        .catch(function (e) { NU.busy(btn, false); NU.fail(e); if (/ไม่ว่าง/.test(e.message)) load(); });
    };
    load();
  }

  /* ----- รีวิว ----- */
  function reviewView(b) {
    var st = { rating: 0, tags: [] };
    var TAGS = ['แรงกำลังดี', 'ตรงจุด', 'สุภาพ อัธยาศัยดี', 'ร้านสะอาด', 'ตรงเวลา', 'คุ้มราคา'];
    var LBL = ['', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก', 'ประทับใจมาก'];
    NU.sheet.set({
      title: 'ให้คะแนน ' + (b.shop ? b.shop.name : ''),
      body: '<div style="text-align:center"><div class="muted" style="font-size:.9rem">' + esc(b.items.map(function (it) { return it.service_name + ' · ' + it.staff_name; }).join(', ')) + '</div>' +
        '<div class="rate-stars" id="rvStars">' + [1, 2, 3, 4, 5].map(function (k) { return '<button data-s="' + k + '" aria-label="' + k + ' ดาว"><i class="bi bi-star"></i></button>'; }).join('') + '</div><div class="muted" id="rvLbl" style="min-height:1.4em">แตะดาวเพื่อให้คะแนน</div></div>' +
        '<div class="lbl" style="margin-top:.8rem">ชอบอะไรบ้าง</div><div class="lc-tags" id="rvTags" style="margin-bottom:.8rem">' + TAGS.map(function (t) { return '<button class="pill" data-t="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
        '<div class="fld"><label for="rvText">เล่าประสบการณ์ <span class="lbl-sub">(ไม่บังคับ)</span></label><textarea id="rvText" rows="3" maxlength="500" placeholder="ช่วยให้ลูกค้าคนอื่นตัดสินใจได้ง่ายขึ้น"></textarea></div>' +
        '<div class="muted" style="font-size:.8rem">รีวิวแสดงชื่อแบบย่อ เช่น "นก ส."</div>',
      foot: '<button class="btn-ghost" id="rvBack"><i class="bi bi-chevron-left"></i></button><button class="btn-main" id="rvOk" disabled>ส่งรีวิว</button>'
    });
    NU.$('#rvStars').onclick = function (e) {
      var x = e.target.closest('[data-s]'); if (!x) return;
      st.rating = +x.getAttribute('data-s');
      NU.$$('#rvStars button').forEach(function (y, i) { y.innerHTML = '<i class="bi bi-star' + (i < st.rating ? '-fill' : '') + '"></i>'; y.classList.toggle('on', i < st.rating); });
      NU.$('#rvLbl').textContent = LBL[st.rating]; NU.$('#rvOk').disabled = false;
    };
    NU.$('#rvTags').onclick = function (e) { var x = e.target.closest('[data-t]'); if (!x) return; var t = x.getAttribute('data-t'), i = st.tags.indexOf(t); if (i >= 0) st.tags.splice(i, 1); else st.tags.push(t); x.classList.toggle('on', i < 0); };
    NU.$('#rvBack').onclick = function () { detail(b); };
    NU.$('#rvOk').onclick = function () {
      var btn = this; NU.busy(btn, true, 'กำลังส่ง');
      NU.api('cus.review', { booking_id: b.booking_id, rating: st.rating, tags: st.tags, text: NU.$('#rvText').value.trim() }, { auth: true }).then(function () {
        NU.state.bkDirty = true;
        NU.sheet.set({ title: 'ขอบคุณค่ะ', body: '<div class="done"><div class="done-ico"><i class="bi bi-heart-fill"></i></div><h3 style="font-weight:700;margin:0">ขอบคุณสำหรับรีวิว</h3><div class="muted">ความเห็นของคุณช่วยให้ร้านพัฒนาบริการ</div></div>', foot: '<button class="btn-main" id="dMine">เสร็จสิ้น</button>' });
        NU.$('#dMine').onclick = function () { NU.sheet.close(); };
      }).catch(function (e) { NU.busy(btn, false); NU.fail(e); });
    };
  }

  /* ======================================================
   * ฉัน (โปรไฟล์)
   * ====================================================== */
  NU.pages.me = {
    render: function (view) {
      if (!NU.auth.loggedIn()) { needLogin(view, 'บัญชีของฉัน', 'บันทึกชื่อและเบอร์โทรไว้ใช้จองครั้งต่อไป และเก็บร้านโปรด'); return; }
      var c = NU.cfgPub || {};
      var draw = function (me) {
        view.innerHTML = '<section class="m-hero" style="padding-bottom:4rem"><div class="m-hero-top"><div class="brand-name" style="color:#fff">บัญชีของฉัน</div></div></section>' +
          '<div class="pf-card">' + (me.picture ? '<img src="' + esc(me.picture) + '" alt="">' : '<span class="pf-ph"><i class="bi bi-person"></i></span>') + '<div style="min-width:0"><b style="font-size:1.1rem">' + esc(me.name || me.display_name) + '</b>' +
          '<div class="muted" style="font-size:.85rem">' + esc(me.phone || 'ยังไม่ได้ใส่เบอร์โทร') + '</div><div class="muted" style="font-size:.8rem"><i class="bi bi-line" style="color:#06c755"></i> ' + esc(me.display_name) + (me.visits ? ' · ใช้บริการแล้ว ' + me.visits + ' ครั้ง' : '') + '</div></div></div>' +
          '<div class="card-x"><h3>ข้อมูลสำหรับการจอง</h3><div class="fld"><label for="mName">ชื่อ</label><input id="mName" maxlength="80" value="' + esc(me.name) + '"></div>' +
          '<div class="fld"><label for="mPhone">เบอร์โทร</label><input id="mPhone" type="tel" inputmode="tel" maxlength="12" value="' + esc(me.phone) + '" placeholder="08xxxxxxxx"></div>' +
          '<label class="chk" style="margin-bottom:.9rem"><input type="checkbox" id="mPdpa"' + (me.pdpa_at ? ' checked disabled' : '') + '><span>ยินยอมให้ร้านที่ฉันจองใช้ชื่อและเบอร์โทร เพื่อยืนยันและติดต่อเรื่องคิว</span></label>' +
          '<button class="btn-main" id="mSave">บันทึก</button></div>' +
          '<div class="card-x"><h3>ร้านโปรด</h3><div id="mFav">' + ((me.favorites || []).length ? '<div class="skel" style="height:90px"></div>' : '<div class="muted" style="font-size:.92rem">แตะรูปหัวใจในหน้าร้านเพื่อเก็บไว้ที่นี่</div>') + '</div></div>' +
          '<div class="card-x" id="mMenu"><button class="menu-row" data-m="bookings"><i class="bi bi-receipt"></i><span>การจองของฉัน</span><i class="bi bi-chevron-right"></i></button>' +
          (c.phone ? '<button class="menu-row" data-m="call"><i class="bi bi-headset"></i><span>ติดต่อผู้ดูแล ' + esc(c.phone) + '</span><i class="bi bi-chevron-right"></i></button>' : '') +
          '<button class="menu-row" data-m="logout"><i class="bi bi-box-arrow-right"></i><span>ออกจากระบบ</span><i class="bi bi-chevron-right"></i></button></div>' + credit();
        NU.$('#mSave').onclick = function () {
          var b = this, name = NU.$('#mName').value.trim(), phone = NU.$('#mPhone').value.replace(/\D/g, '');
          if (!name) { NU.toast('กรุณากรอกชื่อ', 'error'); return; }
          if (!/^0\d{8,9}$/.test(phone)) { NU.toast('เบอร์โทรไม่ถูกต้อง', 'error'); return; }
          NU.busy(b, true, 'กำลังบันทึก');
          NU.api('cus.profileSave', { name: name, phone: phone, pdpa: NU.$('#mPdpa').checked }, { auth: true, toast: true }).then(function (m) { NU.auth.setMe(m); draw(m); })
            .catch(function (e) { NU.busy(b, false); NU.fail(e); });
        };
        NU.$('#mMenu').onclick = function (e) {
          var m = e.target.closest('[data-m]'); if (!m) return;
          var k = m.getAttribute('data-m');
          if (k === 'bookings') NU.go('bookings');
          else if (k === 'call') location.href = 'tel:' + c.phone;
          else if (k === 'logout') { NU.auth.logout(); NU.toast('ออกจากระบบแล้ว'); NU.go('home'); }
        };
        if ((me.favorites || []).length) {
          NU.api('pub.shops', { size: 50 }).then(function (d) {
            var el = NU.$('#mFav'); if (!el) return;
            var list = me.favorites.map(function (id) { return d.rows.filter(function (x) { return x.shop_id === id; })[0]; }).filter(Boolean);
            el.innerHTML = list.length ? '<div style="margin:0 -1rem">' + list.map(cardLc).join('') + '</div>' : '<div class="muted" style="font-size:.92rem">ร้านโปรดปิดรับจองชั่วคราว</div>';
            bindShopCards(el);
          }).catch(function () { /* ไม่กระทบหน้า */ });
        }
      };
      draw(NU.auth.me());
      return NU.api('cus.me', {}, { auth: true }).then(function (m) { NU.auth.setMe(m); if (NU.state.route.page === 'me') draw(m); })
        .catch(function (e) { if (e.auth) needLogin(view, 'บัญชีของฉัน', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'); });
    }
  };

  /* ---------- bottom nav ---------- */
  NU.onNav = function (k) {
    var c = NU.cfgPub || {};
    if (k === 'book') {
      if (NU.state.route && NU.state.route.page === 'shop' && NU.state.shop) { openBook(1); return; }
      if (c.single_shop && c.default_shop_id) { NU.go('shop/' + c.default_shop_id + '?book=1'); return; }
      NU.go('search'); return;
    }
    NU.go(k);
  };

  document.addEventListener('DOMContentLoaded', NU.boot);
})();
