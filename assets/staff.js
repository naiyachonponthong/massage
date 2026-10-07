/* ==========================================================
 * NuadOne LIFF หมอนวด · staff.js
 *  ผูกบัญชีด้วยรหัสจากร้าน · วันนี้ (เริ่ม/จบงาน) · คิวถัดไป 7 วัน · ลงเวลา · รายได้ · ขอลา · โปรไฟล์
 *  พัฒนาโดย Naiyachon Ponthong · ห้ามจำหน่าย
 * ========================================================== */
(function () {
  'use strict';
  var NU = window.NU, esc = NU.esc, fm = NU.fmtMin, money = NU.money;
  var LEAVE_ST = { pending: ['รออนุมัติ', 'st-pending'], approved: ['อนุมัติแล้ว', 'st-completed'], rejected: ['ไม่อนุมัติ', 'st-cancelled'], cancelled: ['ยกเลิกแล้ว', 'st-cancelled'] };

  function hero(title, sub, extra) {
    var me = NU.auth.me() || {};
    return '<section class="m-hero">' + '<div class="m-hero-top"><div class="brand-logo">' + (me.shop && me.shop.logo ? '<img src="' + esc(me.shop.logo) + '" alt="">' : '<i class="bi bi-flower1"></i>') + '</div>' +
      '<div><div class="brand-name">' + esc((me.shop && me.shop.name) || 'NuadOne') + '</div><div style="font-size:.82rem;opacity:.9">สำหรับหมอนวด</div></div>' +
      '<span class="m-av" style="border:2px solid rgba(255,255,255,.7)">' + (me.photo_url ? '<img src="' + esc(me.photo_url) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">' : '<i class="bi bi-person"></i>') + '</span></div>' +
      '<h1>' + esc(title) + '</h1><p>' + esc(sub) + '</p>' + (extra || '') + '</section>';
  }
  function greet() { var h = Math.floor(NU.nowMin() / 60); return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'; }
  function credit() { return '<div class="foot">NuadOne · สำหรับหมอนวด<small>พัฒนาโดย Naiyachon Ponthong · ห้ามจำหน่าย</small></div>'; }

  /** ต้องเข้าสู่ระบบก่อนทุกหน้า · ยังไม่ผูก = หน้าใส่รหัส */
  function withLogin(view, fn) {
    if (NU.auth.loggedIn() && NU.auth.me()) return fn();
    view.innerHTML = hero('กำลังเข้าสู่ระบบ', 'ด้วยบัญชี LINE ของคุณ') + '<div class="m-float"><div class="skel" style="height:90px"></div></div>';
    return NU.auth.ensure().then(function () { return fn(); }).catch(function (e) {
      if (e.needBind) { bindPage(view, e.lineName); return; }
      view.innerHTML = hero('เข้าสู่ระบบไม่สำเร็จ', '') + '<div class="card-x">' + NU.empty('bi-shield-exclamation', 'ยังเข้าใช้งานไม่ได้', e.message, '<button class="btn-soft" onclick="location.reload()"><i class="bi bi-arrow-clockwise"></i> ลองใหม่</button>') + '</div>';
    });
  }
  function bindPage(view, name) {
    NU.$('#bnav').classList.add('hidden');
    view.innerHTML = hero('ยินดีต้อนรับ' + (name ? ' ' + name : ''), 'ผูกบัญชี LINE กับร้านครั้งแรกครั้งเดียว') +
      '<div class="m-float"><h2><i class="bi bi-link-45deg"></i> ใส่รหัสจากร้าน</h2><p class="muted" style="font-size:.9rem;margin:0 0 .8rem">ขอรหัส 6 หลักจากเจ้าของร้าน (เมนูหมอนวด > ผูก LINE) รหัสใช้ได้ 24 ชั่วโมง</p>' +
      '<input class="code6" id="bdCode" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code"><button class="btn-main" id="bdGo" style="margin-top:.8rem">ผูกบัญชี</button></div>' + credit();
    var inp = NU.$('#bdCode');
    inp.oninput = function () { this.value = this.value.replace(/\D/g, '').slice(0, 6); };
    NU.$('#bdGo').onclick = function () {
      var b = this, code = inp.value;
      if (code.length !== 6) { NU.toast('กรุณากรอกรหัส 6 หลัก', 'error'); return; }
      NU.busy(b, true, 'กำลังผูกบัญชี');
      NU.api('stf.bind', { id_token: NU.auth.idToken(), code: code, ua: navigator.userAgent }, { toast: true }).then(function (d) {
        NU.auth.save(d); NU.$('#bnav').classList.remove('hidden'); NU.go('today', true);
      }).catch(function (e) { NU.busy(b, false); NU.fail(e); });
    };
  }

  /* ======================================================
   * วันนี้
   * ====================================================== */
  function jobCard(j, isToday) {
    var st = j.finished_at ? 'done' : j.started_at ? 'run' : 'wait';
    var btn = '';
    if (isToday && st === 'wait' && j.status !== 'pending_verify') btn = '<button class="btn-main" data-job="start" data-id="' + esc(j.booking_id) + '" data-p="' + j.person + '" data-d="' + j.date + '"><i class="bi bi-play-fill"></i> เริ่มนวด</button>';
    else if (isToday && st === 'run') btn = '<button class="btn-main" data-job="finish" data-id="' + esc(j.booking_id) + '" data-p="' + j.person + '" data-d="' + j.date + '" style="background:linear-gradient(135deg,#22c55e,#15803d)"><i class="bi bi-stop-fill"></i> จบงาน</button>';
    return '<div class="job job-' + st + '"><div class="job-time"><b>' + fm(j.s) + '</b><small>' + fm(j.e) + '</small></div><div class="job-b">' +
      '<div class="job-h"><b>' + esc(j.customer) + (j.persons > 1 ? ' <span class="tg">กลุ่ม ' + j.persons + ' ท่าน</span>' : '') + '</b>' +
      (st === 'done' ? '<span class="st st-completed">จบแล้ว</span>' : st === 'run' ? '<span class="st st-in_service">กำลังนวด</span>' : '<span class="st st-' + j.status + '">' + esc(j.status_label) + '</span>') + '</div>' +
      '<div class="job-s">' + esc(j.service_name) + ' ' + j.min + ' นาที · ' + esc(j.resource_name) + (j.pref ? ' · <span style="color:var(--sb-primary-700);font-weight:600">ลูกค้าเลือกคุณ</span>' : '') + '</div>' +
      (j.note ? '<div class="job-note"><i class="bi bi-exclamation-circle"></i> ' + esc(j.note) + '</div>' : '') +
      '<div class="job-f"><span>ค่ามือ ฿' + money(j.staff_rate) + (j.tip ? ' + ทิป ฿' + money(j.tip) : '') + '</span>' + (j.started_at && !j.finished_at ? '<span class="muted">เริ่ม ' + esc(timeOf(j.started_at)) + '</span>' : '') + '</div>' + btn + '</div></div>';
  }
  function timeOf(iso) { try { return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)); } catch (e) { return ''; } }
  NU.pages.today = {
    render: function (view) {
      return withLogin(view, function () {
        var me = NU.auth.me();
        view.innerHTML = hero(greet() + ' ' + me.nickname, NU.thDate(NU.todayStr(), 'long')) + '<div class="m-float"><div class="skel" style="height:80px"></div></div><div id="tdBody" class="page-pad"><div class="skel" style="height:140px"></div></div>';
        var load = function () {
          return NU.api('stf.today', {}, { auth: true }).then(function (d) {
            if (NU.state.route.page !== 'today') return;
            NU.auth.setMe(d.me);
            var s = d.summary, sh = d.shift || {};
            NU.$('.m-float').outerHTML = '<div class="m-float"><div class="sf3"><div><b>' + s.count + '</b><small>คิววันนี้</small></div><div><b>' + s.minutes + '</b><small>นาทีงาน</small></div><div><b>฿' + money(s.earned) + '</b><small>ค่ามือ+ทิปแล้ว</small></div></div>' +
              '<div class="sf-row"><span><i class="bi bi-clock"></i> ' + (d.leave ? 'วันลา' : sh.on ? 'กะ ' + fm(sh.start) + ' ถึง ' + fm(sh.end) : 'วันหยุด') + '</span>' +
              '<button class="btn-soft" id="tdClock">' + (!d.att ? '<i class="bi bi-box-arrow-in-right"></i> ลงเวลาเข้า' : !d.att.out_at ? '<i class="bi bi-box-arrow-right"></i> เข้า ' + esc(timeOf(d.att.in_at)) + ' · ลงเวลาออก' : '<i class="bi bi-check2"></i> ' + esc(timeOf(d.att.in_at)) + ' ถึง ' + esc(timeOf(d.att.out_at))) + '</button></div></div>';
            NU.$('#tdClock').onclick = function () { clockSheet(load); };
            var next = d.jobs.filter(function (j) { return !j.finished_at; })[0];
            NU.$('#tdBody').innerHTML = (d.jobs.length ? (next ? '<div class="lbl">คิวถัดไป</div>' + jobCard(next, true) : '') +
              '<div class="lbl" style="margin-top:1rem">ทั้งหมดวันนี้ (' + d.jobs.length + ')</div>' + d.jobs.filter(function (j) { return j !== next; }).map(function (j) { return jobCard(j, true); }).join('')
              : NU.empty('bi-cup-hot', d.leave ? 'วันนี้เป็นวันลา' : 'ยังไม่มีคิววันนี้', 'เมื่อมีลูกค้าจอง ระบบจะแจ้งทาง LINE และคิวจะขึ้นที่นี่')) + credit();
          });
        };
        NU.$('#tdBody').onclick = function (e) {
          var b = e.target.closest('[data-job]'); if (!b) return;
          var act = b.getAttribute('data-job');
          NU.busy(b, true, act === 'start' ? 'กำลังเริ่ม' : 'กำลังบันทึก');
          NU.api('stf.item', { booking_id: b.getAttribute('data-id'), date: b.getAttribute('data-d'), person: +b.getAttribute('data-p'), action: act }, { auth: true, toast: true })
            .then(load).catch(function (err) { NU.busy(b, false); NU.fail(err); });
        };
        clearInterval(NU.state.tdTimer);
        NU.state.tdTimer = setInterval(function () { if (NU.state.route.page === 'today' && !document.hidden && !NU.sheet.isOpen()) load().catch(function () {}); else if (NU.state.route.page !== 'today') clearInterval(NU.state.tdTimer); }, 60000);
        return load();
      });
    }
  };

  /* ----- ลงเวลา ----- */
  function clockSheet(after) {
    NU.sheet.open({ title: 'ลงเวลาทำงาน', body: '<div class="skel" style="height:160px"></div>' });
    NU.api('stf.today', {}, { auth: true }).then(function (d) {
      var a = d.att, act = !a ? 'in' : !a.out_at ? 'out' : '';
      NU.sheet.set({
        body: '<div class="clock-big" id="ckNow">' + fm(NU.nowMin()) + '</div><div class="muted" style="text-align:center;margin-bottom:1rem">' + esc(NU.thDate(NU.todayStr(), 'long')) + '</div>' +
          '<div class="sum"><div class="sum-row"><span>เข้างาน</span><span>' + (a ? esc(timeOf(a.in_at)) : '-') + '</span></div><div class="sum-row"><span>ออกงาน</span><span>' + (a && a.out_at ? esc(timeOf(a.out_at)) : '-') + '</span></div>' +
          (a && a.minutes ? '<div class="sum-row total"><span>รวม</span><span>' + Math.floor(a.minutes / 60) + ' ชม. ' + (a.minutes % 60) + ' นาที</span></div>' : '') + '</div>',
        foot: act ? '<button class="btn-main" id="ckGo">' + (act === 'in' ? '<i class="bi bi-box-arrow-in-right"></i> ลงเวลาเข้างาน' : '<i class="bi bi-box-arrow-right"></i> ลงเวลาออกงาน') + '</button>' : '<button class="btn-ghost" id="ckClose">ลงเวลาครบแล้ววันนี้</button>'
      });
      var c = NU.$('#ckClose'); if (c) c.onclick = function () { NU.sheet.close(); };
      var g = NU.$('#ckGo');
      if (g) g.onclick = function () {
        NU.busy(g, true, 'กำลังบันทึก');
        NU.api('stf.clock', { action: act }, { auth: true, toast: true }).then(function () { NU.sheet.close(); if (after) after(); }).catch(function (e) { NU.busy(g, false); NU.fail(e); });
      };
    }).catch(function (e) { NU.sheet.set({ body: '<div class="err-box" style="margin:0">' + esc(e.message) + '</div>' }); });
  }

  /* ======================================================
   * คิวถัดไป 7 วัน
   * ====================================================== */
  NU.pages.next = {
    render: function (view) {
      return withLogin(view, function () {
        view.innerHTML = '<div class="ph-top"><h1>คิว 7 วันข้างหน้า</h1></div><div class="page-pad" id="nxBody"><div class="skel" style="height:120px;margin-bottom:.7rem"></div><div class="skel" style="height:120px"></div></div>';
        return NU.api('stf.upcoming', {}, { auth: true }).then(function (d) {
          if (NU.state.route.page !== 'next') return;
          var total = d.days.reduce(function (a, x) { return a + x.jobs.length; }, 0);
          NU.$('#nxBody').innerHTML = (total ? '' : '<div class="note-box info"><i class="bi bi-info-circle"></i><span>ยังไม่มีคิวล่วงหน้า เมื่อมีลูกค้าจอง ระบบจะแจ้งทาง LINE</span></div>') + d.days.map(function (x) {
            var rel = NU.relDay(x.date);
            var sh = x.leave ? '<span class="tg" style="background:#fdecec;color:#b91c1c">ลา</span>' : x.shift.on ? '<span class="tg">' + fm(x.shift.start) + ' ถึง ' + fm(x.shift.end) + '</span>' : '<span class="tg">วันหยุด</span>';
            return '<div class="day-h"><b>' + esc((rel ? rel + ' · ' : '') + NU.thDate(x.date, 'long')) + '</b>' + sh + '</div>' +
              (x.jobs.length ? x.jobs.map(function (j) { return jobCard(j, false); }).join('') : '<div class="muted" style="font-size:.88rem;padding:.2rem 0 .8rem">ไม่มีคิว</div>');
          }).join('') + credit();
        });
      });
    }
  };

  /* ======================================================
   * รายได้
   * ====================================================== */
  NU.pages.money = {
    render: function (view) {
      return withLogin(view, function () {
        var months = [], t = NU.todayStr();
        for (var i = 0; i < 6; i++) { var d = new Date(t.slice(0, 7) + '-15T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() - i); months.push(d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2)); }
        var cur = NU.state.mnMonth || months[0];
        view.innerHTML = '<div class="ph-top"><h1>รายได้ของฉัน</h1><select id="mnSel" class="mn-sel" aria-label="เดือน">' + months.map(function (m) { return '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + NU.TH_M[Number(m.slice(5)) - 1] + ' ' + (Number(m.slice(0, 4)) + 543) + '</option>'; }).join('') + '</select></div><div id="mnBody" class="page-pad"><div class="skel" style="height:150px"></div></div>';
        NU.$('#mnSel').onchange = function () { NU.state.mnMonth = this.value; NU.render(); };
        return NU.api('stf.earnings', { month: cur }, { auth: true }).then(function (d) {
          if (NU.state.route.page !== 'money') return;
          var tt = d.total;
          NU.$('#mnBody').innerHTML = '<div class="earn-card"><small>รวมค่ามือและทิป</small><b>฿' + money(tt.rate + tt.tip) + '</b><div class="earn-split"><span>ค่ามือ ฿' + money(tt.rate) + '</span><span>ทิป ฿' + money(tt.tip) + '</span></div></div>' +
            '<div class="sf3 card-x" style="margin:1rem 0"><div><b>' + tt.jobs + '</b><small>งาน</small></div><div><b>' + Math.round(tt.minutes / 60 * 10) / 10 + '</b><small>ชั่วโมงนวด</small></div><div><b>' + (d.rating.n ? d.rating.avg + ' <i class="bi bi-star-fill star"></i>' : '-') + '</b><small>' + (d.rating.n ? d.rating.n + ' รีวิว' : 'ยังไม่มีรีวิว') + '</small></div></div>' +
            '<div class="lbl">รายวัน</div>' + (d.days.length ? '<div class="card-x" style="margin:0;padding:.3rem 1rem">' + d.days.map(function (x) {
              return '<div class="earn-row"><div><b>' + esc(NU.thDate(x.date, 'day')) + '</b><small>' + x.jobs + ' งาน · ' + x.minutes + ' นาที</small></div><div style="text-align:right"><b>฿' + money(x.rate + x.tip) + '</b>' + (x.tip ? '<small>ทิป ฿' + money(x.tip) + '</small>' : '') + '</div></div>';
            }).join('') + '</div>' : NU.empty('bi-wallet2', 'ยังไม่มีรายได้เดือนนี้', 'รายได้นับจากงานที่ร้านกดชำระเงินแล้ว')) +
            '<div class="muted" style="font-size:.8rem;margin-top:.8rem">ตัวเลขนี้เป็นข้อมูลประกอบ การจ่ายจริงเป็นไปตามที่ร้านกำหนด · ลงเวลาทำงาน ' + d.work_days + ' วัน</div>' + credit();
        });
      });
    }
  };

  /* ======================================================
   * ขอลา
   * ====================================================== */
  NU.pages.leave = {
    nav: 'me',
    render: function (view) {
      return withLogin(view, function () {
        var t = NU.todayStr();
        view.innerHTML = '<div class="ph-top"><button class="icon-btn" onclick="NU.go(\'me\')" aria-label="ย้อนกลับ"><i class="bi bi-chevron-left"></i></button><h1>ขอลา</h1></div>' +
          '<div class="card-x"><h3>ส่งคำขอลา</h3><div class="row2"><div class="fld"><label for="lvF">ตั้งแต่</label><input type="date" id="lvF" min="' + t + '" value="' + NU.addDays(t, 1) + '"></div>' +
          '<div class="fld"><label for="lvT">ถึง</label><input type="date" id="lvT" min="' + t + '" value="' + NU.addDays(t, 1) + '"></div></div>' +
          '<div class="row2"><div class="fld"><label for="lvH">ช่วง</label><select id="lvH" class="sel"><option value="">ทั้งวัน</option><option value="am">ครึ่งเช้า</option><option value="pm">ครึ่งบ่าย</option></select></div>' +
          '<div class="fld"><label for="lvType">ประเภท</label><select id="lvType" class="sel"><option value="personal">ลากิจ</option><option value="sick">ลาป่วย</option><option value="vacation">ลาพักร้อน</option><option value="other">อื่น ๆ</option></select></div></div>' +
          '<div class="fld"><label for="lvR">เหตุผล</label><textarea id="lvR" rows="2" maxlength="200" placeholder="แจ้งร้านสั้น ๆ"></textarea></div><button class="btn-main" id="lvGo">ส่งคำขอ</button></div>' +
          '<div class="card-x"><h3>คำขอลาของฉัน</h3><div id="lvList"><div class="skel" style="height:80px"></div></div></div>' + credit();
        var load = function () {
          return NU.api('stf.leaves', {}, { auth: true }).then(function (d) {
            var el = NU.$('#lvList'); if (!el) return;
            el.innerHTML = d.rows.length ? d.rows.map(function (l) {
              var st = LEAVE_ST[l.status] || [l.status, 'st-cancelled'];
              return '<div class="earn-row"><div><b>' + esc(NU.thDate(l.date_from, 'day') + (l.date_to !== l.date_from ? ' ถึง ' + NU.thDate(l.date_to, 'day') : '')) + (l.half ? (l.half === 'am' ? ' (เช้า)' : ' (บ่าย)') : '') + '</b><small>' + esc(l.type_label + (l.reason ? ' · ' + l.reason : '') + (l.decide_note ? ' · ร้าน: ' + l.decide_note : '')) + '</small></div>' +
                '<div style="text-align:right"><span class="st ' + st[1] + '">' + st[0] + '</span>' + (l.status === 'pending' ? '<br><button class="link-btn" data-cancel="' + esc(l.leave_id) + '">ยกเลิก</button>' : '') + '</div></div>';
            }).join('') : '<div class="muted" style="font-size:.9rem">ยังไม่มีคำขอลา</div>';
          });
        };
        NU.$('#lvF').onchange = function () { if (NU.$('#lvT').value < this.value) NU.$('#lvT').value = this.value; };
        NU.$('#lvGo').onclick = function () {
          var b = this, f = NU.$('#lvF').value, to = NU.$('#lvT').value, h = NU.$('#lvH').value;
          if (!f || !to) { NU.toast('กรุณาเลือกวันที่', 'error'); return; }
          if (h && f !== to) { NU.toast('ลาครึ่งวันเลือกได้วันเดียว', 'error'); return; }
          NU.busy(b, true, 'กำลังส่ง');
          NU.api('stf.leave', { date_from: f, date_to: to, half: h, type: NU.$('#lvType').value, reason: NU.$('#lvR').value.trim() }, { auth: true, toast: true })
            .then(function () { NU.busy(b, false); NU.$('#lvR').value = ''; load(); }).catch(function (e) { NU.busy(b, false); NU.fail(e); });
        };
        NU.$('#lvList').onclick = function (e) {
          var c = e.target.closest('[data-cancel]'); if (!c) return;
          NU.api('stf.leaveCancel', { leave_id: c.getAttribute('data-cancel') }, { auth: true, toast: true }).then(load).catch(NU.fail);
        };
        return load();
      });
    }
  };

  /* ======================================================
   * ฉัน
   * ====================================================== */
  NU.pages.me = {
    render: function (view) {
      return withLogin(view, function () {
        var draw = function (me) {
          view.innerHTML = '<section class="m-hero" style="padding-bottom:4rem"><div class="m-hero-top"><div class="brand-name" style="color:#fff">โปรไฟล์ของฉัน</div></div></section>' +
            '<div class="pf-card">' + (me.photo_url ? '<img src="' + esc(me.photo_url) + '" alt="">' : '<span class="pf-ph"><i class="bi bi-person"></i></span>') +
            '<div style="min-width:0"><b style="font-size:1.1rem">' + esc(me.nickname) + '</b><div class="muted" style="font-size:.85rem">' + esc(me.level_label) + ' · ' + esc(me.shop.name) + '</div></div></div>' +
            '<div class="card-x"><label class="sw-row"><span><b>รับจองออนไลน์</b><small>ปิดชั่วคราวเมื่อไม่สะดวก ลูกค้าจะเลือกคุณไม่ได้</small></span><input type="checkbox" class="sw" id="meAcc"' + (me.accepting ? ' checked' : '') + '></label>' +
            '<div class="fld" style="margin-top:.8rem"><label for="meBio">แนะนำตัว (ลูกค้าเห็น)</label><textarea id="meBio" rows="3" maxlength="300" placeholder="เช่น ถนัดนวดไทยและกดจุด ประสบการณ์ 8 ปี">' + esc(me.bio) + '</textarea></div><button class="btn-main" id="meSave">บันทึก</button></div>' +
            '<div class="card-x" id="meMenu"><button class="menu-row" data-m="leave"><i class="bi bi-calendar-x"></i><span>ขอลา / ดูวันลา</span><i class="bi bi-chevron-right"></i></button>' +
            (me.shop.phone ? '<button class="menu-row" data-m="call"><i class="bi bi-telephone"></i><span>โทรหาร้าน ' + esc(me.shop.phone) + '</span><i class="bi bi-chevron-right"></i></button>' : '') +
            '<button class="menu-row" data-m="logout"><i class="bi bi-box-arrow-right"></i><span>ออกจากระบบ</span><i class="bi bi-chevron-right"></i></button></div>' + credit();
          NU.$('#meSave').onclick = function () {
            var b = this; NU.busy(b, true, 'กำลังบันทึก');
            NU.api('stf.profileSave', { bio: NU.$('#meBio').value.trim(), accepting: NU.$('#meAcc').checked }, { auth: true, toast: true }).then(function (m) { NU.auth.setMe(m); draw(m); }).catch(function (e) { NU.busy(b, false); NU.fail(e); });
          };
          NU.$('#meMenu').onclick = function (e) {
            var m = e.target.closest('[data-m]'); if (!m) return;
            var k = m.getAttribute('data-m');
            if (k === 'leave') NU.go('leave');
            else if (k === 'call') location.href = 'tel:' + me.shop.phone;
            else if (k === 'logout') { NU.auth.logout(); NU.toast('ออกจากระบบแล้ว'); setTimeout(function () { location.reload(); }, 600); }
          };
        };
        draw(NU.auth.me());
        return NU.api('stf.me', {}, { auth: true }).then(function (m) { NU.auth.setMe(m); if (NU.state.route.page === 'me') draw(m); });
      });
    }
  };

  NU.pages.today.nav = 'today';
  NU.pages.home = NU.pages.today;
  NU.onNav = function (k) {
    if (k === 'clock') { if (NU.auth.loggedIn()) clockSheet(function () { if (NU.state.route.page === 'today') NU.render(); }); else NU.go('today'); return; }
    NU.go(k);
  };
  document.addEventListener('DOMContentLoaded', NU.boot);
})();
