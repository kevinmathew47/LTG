/* Let's Talk GFC — shared engine: config, API client (Apps Script or demo), pixel sky, fx, 8-bit sound, QR, ticket image. */
(function () {
"use strict";
const CFG = Object.assign({
  apiUrl: "", eventDate: "2026-11-13", eventStart: "2026-11-13T18:00:00+05:30", arriveBy: "5:45 PM", lateFee: 100, demoPin: "1234"
}, window.GFC_CONFIG || {});
// ?demo=1 = practice mode: everything stays on this device, live Google Sheet untouched (volunteer training / testing)
if (/[?&]demo=1\b/.test(location.search)) CFG.apiUrl = "";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const normPhone = p => String(p || "").replace(/\D/g, "").slice(-10);
const fmtT = ms => ms ? new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase() : "";
const fmtDT = ms => ms ? new Date(ms).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const cutLabel = c => { const [h, m] = String(c || "17:45").split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return fmtT(+d); };

/* ---------------- demo backend (no apiUrl): same rules as Code.gs, this device only ---------------- */
const Local = (() => {
  const KEY = "gfc-demo-db", ALPH = "ACDEFHJKMNPRTUVWXY34679";
  const load = () => store.get(KEY, { regs: [], cfg: { cutoff: "17:45", fee: CFG.lateFee } });
  const save = d => store.set(KEY, d);
  const mins = ms => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
  const cut = c => { const [h, m] = c.split(":").map(Number); return h * 60 + m; };
  function validate(b) {
    const name = String(b.name || "").trim().replace(/\s+/g, " "), phone = normPhone(b.phone), email = String(b.email || "").trim(), org = String(b.org || "").trim().slice(0, 80);
    if (name.length < 2 || name.length > 80) throw new Error("Enter your full name.");
    if (phone.length !== 10) throw new Error("Enter a 10-digit mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That email doesn’t look right. Fix it or leave it blank.");
    return { name, phone, email, org };
  }
  const PREPAY_MODE = "UPI prepaid";
  function checkin(d, r) {
    const now = Date.now(), late = now > lateFrom(d.cfg), fee = late ? Number(d.cfg.fee) || 0 : 0;
    if (late && fee > 0 && r.prepay === "received") Object.assign(r, { checkedInAt: now, fee, dinner: "paid", payMode: PREPAY_MODE, paidAt: now });
    else Object.assign(r, { checkedInAt: now, fee, dinner: late && fee > 0 ? "due" : "free" });
  }
  const pubDon = x => ({ id: x.id, name: x.name, amount: x.amount, status: x.status, utr: x.utr ? "••••" + x.utr.slice(-4) : "", submittedAt: x.submittedAt, checkedAt: x.checkedAt });
  const pub = r => ({ code: r.code, name: r.name, phone: r.phone, checkedInAt: r.checkedInAt, dinner: r.dinner, fee: r.fee, prepay: r.prepay || "none", utr: r.utr ? "••••" + r.utr.slice(-4) : "", prepayAt: r.prepayAt || null });
  // fee applies only after the event date + cutoff, India time (+05:30)
  const lateFrom = c => new Date(`${c.eventDate || CFG.eventDate}T${c.cutoff || "17:45"}:59.999+05:30`).getTime();
  const find = (d, c) => d.regs.find(r => r.code === String(c || "").toUpperCase().trim());
  const A = {
    info() { const d = load(); return Object.assign({ count: d.regs.length }, d.cfg); },
    register(b) {
      const d = load(), v = validate(b), ex = d.regs.find(r => r.phone === v.phone);
      if (ex) {
        const same = ex.name.toLowerCase().split(/\s+/)[0] === v.name.toLowerCase().split(/\s+/)[0];
        if (!same && !b.staff) throw new Error('This mobile number is already registered. Use "Already registered? Get my pass again" below.');
        return { existing: true, pass: b.staff ? ex : pub(ex) };
      }
      let code; do { code = "GFC-" + Array.from({ length: 4 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join(""); } while (find(d, code));
      const r = Object.assign({ code }, v, { registeredAt: Date.now(), checkedInAt: null, dinner: "wait", fee: 0, payMode: "", paidAt: null, prepay: "none", utr: "", prepayAt: null, prepayCheckedAt: null });
      d.regs.push(r); save(d); return { pass: pub(r) };
    },
    findPass(b) {
      const phone = normPhone(b.phone), first = String(b.name || "").trim().split(/\s+/)[0].toLowerCase();
      if (phone.length !== 10 || !first) throw new Error("Enter the mobile number and first name you registered with.");
      const r = load().regs.find(r => r.phone === phone && r.name.toLowerCase().split(/\s+/)[0] === first);
      if (!r) throw new Error("No pass matches that name and number. Check the spelling or register again.");
      return { pass: pub(r) };
    },
    claimPrepay(b) {
      const d = load(), r = find(d, b.code);
      if (!r || r.phone !== normPhone(b.phone)) throw new Error("Pass not found. Open your pass again and retry.");
      if (r.prepay === "received") return { pass: pub(r) };
      const utr = String(b.utr || "").replace(/\s+/g, "").toUpperCase();
      if (!/^[A-Z0-9]{10,35}$/.test(utr)) throw new Error("Enter the UPI transaction ID (UTR) from your payment app, usually 12 digits.");
      if (d.regs.some(x => x.utr === utr && x.code !== r.code)) throw new Error("That transaction ID is already used for another pass.");
      Object.assign(r, { prepay: "claimed", utr, prepayAt: Date.now(), prepayCheckedAt: null }); save(d); return { pass: pub(r) };
    },
    prepay(b) {
      const d = load(), r = find(d, b.code); if (!r) throw new Error("Pass not found.");
      const st = { Received: "received", Rejected: "rejected" }[b.status] || "none";
      Object.assign(r, { prepay: st, prepayCheckedAt: st === "none" ? null : Date.now() });
      if (st === "none") Object.assign(r, { utr: "", prepayAt: null });
      if (st === "received" && r.dinner === "due") Object.assign(r, { dinner: "paid", payMode: PREPAY_MODE, paidAt: Date.now() });
      if (st !== "received" && r.dinner === "paid" && r.payMode === PREPAY_MODE) Object.assign(r, { dinner: "due", payMode: "", paidAt: null });
      save(d); return { rec: r };
    },
    verify() { return load().cfg; },
    list() { const d = load(); return { regs: d.regs, cfg: d.cfg }; },
    checkin(b) { const d = load(), r = find(d, b.code); if (!r) return { status: "notfound" }; if (r.checkedInAt) return { status: "already", rec: r }; checkin(d, r); save(d); return { status: "ok", rec: r }; },
    walkin(b) { const res = A.register(Object.assign({}, b, { staff: true })), d = load(), r = find(d, res.pass.code); if (r.checkedInAt) return { status: "already", rec: r, existing: true }; checkin(d, r); save(d); return { status: "ok", rec: r, existing: !!res.existing }; },
    pay(b) { const d = load(), r = find(d, b.code); if (!r) throw new Error("Pass not found."); if (r.dinner === "due") Object.assign(r, { dinner: "paid", payMode: b.mode === "UPI" ? "UPI" : "Cash", paidAt: Date.now() }); save(d); return { rec: r }; },
    undo(b) { const d = load(), r = find(d, b.code); if (!r) throw new Error("Pass not found."); Object.assign(r, { checkedInAt: null, dinner: "wait", fee: 0, payMode: "", paidAt: null }); save(d); return { rec: r }; },
    remove(b) { const d = load(); d.regs = d.regs.filter(r => r.code !== b.code); save(d); return {}; },
    donate(b) {
      const d = load(); d.donations = d.donations || [];
      const amount = Math.round(Number(b.amount));
      if (!(amount >= 10 && amount <= 100000)) throw new Error("Enter an amount between ₹10 and ₹1,00,000.");
      const phone = normPhone(b.phone); if (phone.length !== 10) throw new Error("Enter your 10-digit mobile number so you can check the status later.");
      const utr = String(b.utr || "").replace(/\s+/g, "").toUpperCase();
      if (!/^[A-Z0-9]{10,35}$/.test(utr)) throw new Error("Enter the UPI transaction ID (UTR) from your payment app, usually 12 digits.");
      if (d.donations.some(x => x.utr === utr) || d.regs.some(x => x.utr === utr)) throw new Error("That transaction ID has already been submitted.");
      let id; do { id = "DON-" + Array.from({ length: 5 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join(""); } while (d.donations.some(x => x.id === id));
      const x = { id, name: String(b.name || "").trim().slice(0, 80), phone, amount, utr, status: "pending", submittedAt: Date.now(), checkedAt: null };
      d.donations.push(x); save(d); return { donation: pubDon(x) };
    },
    donationStatus(b) {
      const x = (load().donations || []).find(x => x.id === String(b.id || "").toUpperCase().trim());
      if (!x || x.phone !== normPhone(b.phone)) throw new Error("Donation not found.");
      return { donation: pubDon(x) };
    },
    donations() { return { donations: load().donations || [] }; },
    donationSet(b) {
      const d = load(), x = (d.donations || []).find(x => x.id === b.id); if (!x) throw new Error("Donation not found.");
      x.status = { Verified: "verified", Rejected: "rejected" }[b.status] || "pending"; x.checkedAt = x.status === "pending" ? null : Date.now();
      save(d); return { donation: x };
    },
    settings(b) {
      const d = load();
      if (b.cutoff != null) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.cutoff)) throw new Error("Cutoff must look like 17:45."); d.cfg.cutoff = b.cutoff; }
      if (b.fee != null) d.cfg.fee = Math.max(0, Math.round(Number(b.fee) || 0));
      save(d); return { cfg: d.cfg };
    }
  };
  const STAFF = ["verify", "list", "checkin", "walkin", "pay", "prepay", "undo", "remove", "settings", "donations", "donationSet"];
  return {
    call(action, b) {
      return new Promise((res, rej) => setTimeout(() => {
        try {
          if (STAFF.includes(action) && String(b.pin) !== String(CFG.demoPin)) { const e = new Error("Wrong staff PIN."); e.auth = false; throw e; }
          if (!A[action]) throw new Error("Unknown action.");
          res(Object.assign({ ok: true }, A[action](b)));
        } catch (e) { rej(e); }
      }, 220));
    }
  };
})();

/* UPI payment link (NPCI format). Amount is fixed; the pass code goes in the note and reference. */
function upiLink(code, amount, note) {
  // Personal (P2P) UPI link: only pa, pn, am, cu, tn. No `tr`/`mc`/`url` — those mark it as a merchant
  // payment, and GPay/PhonePe then refuse it for a personal UPI ID ("exceeded bank limit" / "declined").
  const u = CFG.upi || {}; if (!u.vpa) return "";
  const clean = s => String(s || "").replace(/[^A-Za-z0-9 .-]/g, "").replace(/\s+/g, " ").trim().slice(0, 50);
  const amt = Number(amount), am = Number.isInteger(amt) ? String(amt) : amt.toFixed(2);
  const q = new URLSearchParams({ pa: u.vpa, pn: clean(u.name) || "Lets Talk GFC", am, cu: "INR", tn: clean(note || `${code} dinner`) });
  return "upi://pay?" + q.toString().replace(/\+/g, "%20");
}

async function api(action, data = {}) {
  if (!CFG.apiUrl) return Local.call(action, data);
  let r, j;
  try { r = await fetch(CFG.apiUrl, { method: "POST", body: JSON.stringify(Object.assign({ action }, data)) }); }
  catch (e) { throw new Error("No connection. Check the internet and try again."); }
  try { j = await r.json(); } catch (e) { throw new Error("The server sent an unexpected reply. Try again."); }
  if (!j.ok) { const e = new Error(j.error || "Something went wrong."); if (j.auth === false) e.auth = false; throw e; }
  return j;
}

/* ---------------- 8-bit sound ---------------- */
const Snd = {
  ctx: null, on: store.get("gfc-sound", true),
  _c() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; },
  tone(f, d, type = "square", at = 0, vol = .05) {
    if (!this.on) return; const c = this._c(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
  },
  coin() { this.tone(988, .07); this.tone(1319, .3, "square", .07); },
  level() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .14, "square", i * .08)); this.tone(1568, .5, "triangle", .42, .06); },
  pop() { this.tone(700 + Math.random() * 400, .06, "triangle", 0, .07); this.tone(1400, .05, "square", .04, .03); },
  blip() { this.tone(1200, .04, "square", 0, .03); },
  good() { [784, 988, 1319].forEach((f, i) => this.tone(f, .12, "square", i * .07)); },
  due() { this.tone(880, .16, "square", 0, .07); this.tone(660, .16, "square", .18, .07); this.tone(880, .3, "square", .36, .07); },
  bad() { this.tone(160, .35, "sawtooth", 0, .07); this.tone(120, .35, "sawtooth", .05, .05); },
  toggle() { this.on = !this.on; store.set("gfc-sound", this.on); if (this.on) this.coin(); return this.on; }
};

/* ---------------- pixel sky: drifting clouds, flapping birds, twinkles ---------------- */
const CLOUDS = [
  ["..........wwww..............", ".......wwwwwwwwww...........", "......wwwwwwwwwwww..wwww....", "....wwwwwwwwwwwwwwwwwwwwww..", "..wwwwwwwwwwwwwwwwwwwwwwwwww.", ".wwwwwwwwwwwwwwwwwwwwwwwwwwww", "wwwwwwwwwwwwwwwwwwwwwwwwwwwww", "wwwwwwwwwwwwwwwwwwwwwwwwwwwww", "sssssswwwwwwwwssssswwwwssssss", ".ssssssssssssssssssssssssss..", "...dddddddddddddddddddddd...."],
  [".....wwww.......", "...wwwwwwww.ww..", "..wwwwwwwwwwwww.", ".wwwwwwwwwwwwwww", "wwwwwwwwwwwwwwww", "sssswwwwwwssssss", ".ssssssssssssss.", "..dddddddddddd.."],
  ["............wwwww.........", "....www...wwwwwwwww.......", "..wwwwwwwwwwwwwwwwwww.ww..", ".wwwwwwwwwwwwwwwwwwwwwwwww", "wwwwwwwwwwwwwwwwwwwwwwwwww", "wwwwwwwwwwwwwwwwwwwwwwwwww", "sssssssswwwwwwwwsssssssss.", "..ssssssssssssssssssssss..", "....dddddddddddddddddd...."]
];
const BIRD = [["xx.......xx", "..xx...xx..", "....x.x....", ".....x....."], ["...........", "xxxx...xxxx", "....xxx....", ".....x....."]];
function sprite(rows, pal, P) {
  const c = document.createElement("canvas"); c.width = rows[0].length * P; c.height = rows.length * P; const g = c.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * P, y * P, P, P); } }));
  return c;
}
function initSky(cv) {
  if (!cv) return {};
  const g = cv.getContext("2d"); let W = 0, H = 0, dpr = 1, bg = null, clouds = [], birds = [], stars = [], last = 0, running = true;
  const cloudSprites = [], birdSprites = [];
  function build() {
    cloudSprites.length = 0; birdSprites.length = 0;
    const P = W < 600 ? 5 : 8;
    CLOUDS.forEach(s => cloudSprites.push(sprite(s, { w: "#FFFFFF", s: "#D6ECFF", d: "#A9D2F5" }, P)));
    [2, 3].forEach(p => birdSprites.push(BIRD.map(f => sprite(f, { x: "#0B1838" }, p))));
  }
  function bird(x) { const s = Math.random() < .5 ? 0 : 1; return { x: x ?? -60 - Math.random() * 400, y: H * (.05 + Math.random() * .35), vx: 40 + Math.random() * 45, ph: Math.random() * 6, s, amp: 6 + Math.random() * 10 }; }
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = false; build();
    bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0A86EE"); bg.addColorStop(.45, "#1FA2F7"); bg.addColorStop(1, "#5CC6FF");
    const n = Math.max(4, Math.round(W / 260));
    clouds = Array.from({ length: n }, (_, i) => ({ x: Math.random() * W, y: H * (.04 + .9 * i / n) + Math.random() * 30, k: i % 3, d: .3 + Math.random() * .9 }));
    birds = Array.from({ length: Math.max(3, Math.round(W / 300)) }, () => bird(Math.random() * W));
    stars = Array.from({ length: 14 }, () => ({ x: Math.random() * W, y: Math.random() * H * .8, ph: Math.random() * 6 }));
  }
  function star(x, y, s, a) {
    g.globalAlpha = a; g.fillStyle = "#E4FF3A";
    g.fillRect(x - s, y, s * 3, s); g.fillRect(x, y - s, s, s * 3); g.globalAlpha = 1;
  }
  function frame(t) {
    const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const sy = scrollY;
    stars.forEach(s => { const a = (Math.sin(t / 500 + s.ph) + 1) / 2; if (a > .55) star(s.x, s.y - sy * .05, 3, (a - .55) * 2); });
    clouds.forEach(c => {
      const sp = cloudSprites[c.k]; c.x += (8 + 22 * c.d) * dt;
      if (c.x > W + 20) { c.x = -sp.width - Math.random() * 200; c.y = Math.random() * H * .95; }
      let y = (c.y - sy * c.d * .25) % (H + 120); if (y < -100) y += H + 120;
      g.globalAlpha = .8 + c.d * .2; g.drawImage(sp, Math.round(c.x), Math.round(y)); g.globalAlpha = 1;
    });
    birds.forEach((b, i) => {
      b.x += b.vx * dt; if (b.x > W + 60) birds[i] = bird();
      const f = Math.floor(t / 160 + b.ph) % 2, sp = birdSprites[b.s][f];
      g.drawImage(sp, Math.round(b.x), Math.round(b.y + Math.sin(t / 700 + b.ph) * b.amp - sy * .08));
    });
    if (running && !reduced) requestAnimationFrame(frame);
  }
  resize(); addEventListener("resize", () => { resize(); if (reduced) frame(0); });
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running && !reduced) requestAnimationFrame(t => { last = t; frame(t); }); });
  if (reduced) { frame(0); addEventListener("scroll", () => frame(0), { passive: true }); } else requestAnimationFrame(frame);
  return { flock(n = 24) { for (let i = 0; i < n; i++) { const b = bird(-40 - Math.random() * 600); b.vx *= 2.2; birds.push(b); } setTimeout(() => birds.splice(0, Math.max(0, birds.length - 6)), 12000); } };
}

/* ---------------- fx: sparkles + confetti ---------------- */
const FX = (() => {
  let cv, g, parts = [], on = false, W, H;
  const COL = ["#D8FF1F", "#FFE81A", "#3FDCFF", "#FFFFFF", "#FF5FB7"];
  function ensure() {
    if (cv) return; cv = $("#fx"); if (!cv) return; g = cv.getContext("2d");
    const rs = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    rs(); addEventListener("resize", rs);
  }
  function loop() {
    g.clearRect(0, 0, W, H);
    parts = parts.filter(p => (p.life -= .016) > 0);
    parts.forEach(p => {
      p.vy += p.gr; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      g.globalAlpha = Math.min(1, p.life * 2); g.fillStyle = p.c;
      if (p.star) { const s = p.s; g.fillRect(p.x - s, p.y, s * 3, s); g.fillRect(p.x, p.y - s, s, s * 3); }
      else { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    });
    g.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else on = false;
  }
  function go() { if (!on) { on = true; requestAnimationFrame(loop); } }
  return {
    burst(x, y, n = 14, cols = COL) {
      if (reduced) return; ensure(); if (!cv) return;
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, gr: .12, s: 3 + Math.random() * 3, c: cols[i % cols.length], life: .6 + Math.random() * .5, rot: 0, vr: 0, star: true }); }
      go();
    },
    confetti(n = 160) {
      if (reduced) return; ensure(); if (!cv) return;
      for (let i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3, gr: .05, s: 8 + Math.random() * 8, c: COL[i % COL.length], life: 2.5 + Math.random() * 1.5, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, star: false });
      go();
    }
  };
})();

/* ---------------- QR + ticket image ---------------- */
function drawQR(canvas, text, size) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), quiet = 3, cell = Math.max(2, Math.floor(size / (n + quiet * 2))), dim = cell * (n + quiet * 2);
  canvas.width = dim; canvas.height = dim; const g = canvas.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, dim, dim); g.fillStyle = "#071330";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
  return canvas;
}
function outlined(g, txt, x, y, font, fill, stroke = 12) {
  g.font = font; g.lineJoin = "round";
  g.fillStyle = "#1A52D8"; g.strokeStyle = "#071330"; g.lineWidth = stroke;
  g.strokeText(txt, x + 6, y + 7); g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
}
async function ticketBlob(rec) {
  try { await document.fonts.ready; } catch (e) { }
  const W = 800, H = 1180, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#0A6BE0"); grd.addColorStop(1, "#5CC2FF"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.fillStyle = "#fff"; [[60, 70], [560, 120], [90, 1040], [600, 990]].forEach(([x, y]) => { g.fillRect(x, y, 120, 18); g.fillRect(x + 18, y - 18, 70, 18); });
  g.fillStyle = "#D8FF1F"; g.fillRect(40, 190, W - 80, H - 260); g.fillStyle = "#071330"; g.fillRect(48, 198, W - 96, H - 276);
  g.textAlign = "center";
  g.save(); g.translate(W / 2, 120); g.rotate(-.06);
  outlined(g, "LET'S TALK", 0, 0, "italic 900 78px Kanit, 'Arial Black', sans-serif", "#FFFFFF", 14);
  outlined(g, "GFC", 0, 92, "italic 900 110px Kanit, 'Arial Black', sans-serif", "#D8FF1F", 16);
  g.restore();
  g.fillStyle = "#3FDCFF"; g.font = "600 26px 'Pixelify Sans', monospace"; g.fillText("✦ PLAYER PASS ✦", W / 2, 262);
  const qc = drawQR(document.createElement("canvas"), rec.code, 440); g.drawImage(qc, (W - 440) / 2, 290, 440, 440);
  g.fillStyle = "#D8FF1F"; g.font = "700 64px 'Pixelify Sans', monospace"; g.fillText(rec.code, W / 2, 810);
  g.fillStyle = "#fff"; g.font = "italic 800 42px Kanit, sans-serif"; g.fillText(String(rec.name).toUpperCase().slice(0, 24), W / 2, 870);
  g.fillStyle = "#A9C3EE"; g.font = "500 27px 'Pixelify Sans', monospace";
  g.fillText("FRIDAY · 13 NOVEMBER 2026 · 6 PM", W / 2, 930); g.fillText("Christos Mar Thoma Church, Kakkanad", W / 2, 968);
  g.fillStyle = "#FFE81A"; g.fillText("Arrive by " + CFG.arriveBy + " — dinner is on us!", W / 2, 1016);
  g.fillStyle = "#fff"; g.font = "500 22px 'Pixelify Sans', monospace"; g.fillText("Show this QR at the entry · bring your phone", W / 2, 1060);
  return new Promise(res => cv.toBlob(res, "image/png"));
}
function saveBlob(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

/* ---------------- toast ---------------- */
let toastT = 0;
function toast(msg, kind) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "px toast"; t.innerHTML = '<div class="in"></div>'; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.querySelector(".in").textContent = msg; t.classList.remove("red", "yellow", "cyan"); if (kind) t.classList.add(kind);
  t.hidden = false; t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3400);
}

/* ---------------- staff PIN gate ---------------- */
function staffGate(onReady) {
  const saved = sessionStorage.getItem("gfc-pin");
  const el = document.createElement("div"); el.className = "gate";
  el.innerHTML = `<div class="px cyan"><div class="in">
    <div class="arcade lime-t" style="font-size:13px">STAFF ONLY</div>
    <div style="font:italic 900 30px/1 var(--f-display);text-transform:uppercase">Enter staff PIN</div>
    <form id="pinForm" novalidate><input id="pinIn" class="inp" type="password" inputmode="numeric" autocomplete="off" placeholder="••••" style="text-align:center;font-size:24px;letter-spacing:.3em">
    <p class="err" id="pinErr" role="alert"></p>
    <button class="btn px" type="submit" style="width:100%"><span class="in" style="width:100%">Unlock</span></button></form>
    ${CFG.apiUrl ? "" : `<div class="dim pixel" style="font-size:13px">Demo mode PIN: ${esc(CFG.demoPin)}</div>`}
  </div></div>`;
  const tryPin = async pin => {
    try { const r = await api("verify", { pin }); sessionStorage.setItem("gfc-pin", pin); el.remove(); onReady(pin, r); return true; }
    catch (e) { if (e.auth === false) sessionStorage.removeItem("gfc-pin"); $("#pinErr", el).textContent = e.message; Snd.bad(); return false; }
  };
  document.body.appendChild(el);
  $("#pinForm", el).addEventListener("submit", ev => { ev.preventDefault(); tryPin($("#pinIn", el).value.trim()); });
  if (saved) tryPin(saved); else setTimeout(() => $("#pinIn", el).focus(), 50);
}
function demoBanner(where) {
  if (CFG.apiUrl || !where) return;
  where.insertAdjacentHTML("afterbegin", `<div class="px yellow demo" style="margin-bottom:14px"><div class="in">DEMO MODE — no server connected yet, so entries stay on this device. Add the Apps Script URL to config.js to go live (see SETUP.md).</div></div>`);
}

window.GFC = { upiLink, CFG, $, $$, esc, store, api, Snd, FX, initSky, drawQR, ticketBlob, saveBlob, toast, staffGate, demoBanner, fmtT, fmtDT, cutLabel, normPhone, reduced };
})();
