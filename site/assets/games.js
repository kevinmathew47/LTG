/* Two mini-games for the registration page: Dinner Dash (catch) and Memory Match. */
(function () {
"use strict";
const G = window.GFC || {};
const Snd = G.Snd || { coin() { }, bad() { }, level() { }, pop() { }, good() { }, blip() { } };
const FX = G.FX || { burst() { }, confetti() { } };
const store = G.store || { get: (k, d) => d, set() { } };

function spr(rows, pal) {
  const c = document.createElement("canvas"); c.width = rows[0].length; c.height = rows.length; const g = c.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}

/* ================= DINNER DASH ================= */
const KID = [
  ["pppppppppppppp", ".s..........s.", ".s...hhhh...s.", ".s..hhhhhh..s.", ".s..hsssss..s.", ".s...ssss...s.", ".cccccccccccc.", "..cccccccccc..", "..cccccccccc..", "..cccccccccc..", "...nnnnnnnn...", "...nnn..nnn...", "...nnn..nnn...", "...kkk..kkk..."],
  ["pppppppppppppp", ".s..........s.", ".s...hhhh...s.", ".s..hhhhhh..s.", ".s..hsssss..s.", ".s...ssss...s.", ".cccccccccccc.", "..cccccccccc..", "..cccccccccc..", "..cccccccccc..", "...nnnnnnnn...", "....nnnnnn....", "....nn..nn....", "....kk..kk...."]
];
const KIDPAL = { p: "#E6EEF8", s: "#C68642", h: "#1a0f0a", c: "#D8FF1F", n: "#1E3A8A", k: "#0a0a14" };
const ITEMS = {
  cloche: { rows: ["....kk....", "..pppppp..", ".pwppppppp", "pwpppppppp", "pppppppppp", "llllllllll"], pal: { p: "#D7E3F4", w: "#FFFFFF", k: "#FFFFFF", l: "#D8FF1F" }, pts: 10 },
  heart: { rows: [".xx.xx.", "xxxxxxx", "xxwxxxx", ".xxxxx.", "..xxx..", "...x..."], pal: { x: "#FF5FB7", w: "#FFFFFF" }, pts: 5 },
  q: { rows: [".bbbbbbb.", "bnnnnnnnb", "bnnyyynnb", "bnnnnynnb", "bnnnyynnb", "bnnnynnnb", "bnnnnnnnb", "bnnnynnnb", ".bbbbbbb.", "..b......"], pal: { b: "#3FDCFF", n: "#0B1838", y: "#D8FF1F" }, pts: 5 },
  star: { rows: ["....y....", "....y....", "...yyy...", "yyyyyyyyy", ".yyyyyyy.", "..yyyyy..", ".yy...yy.", "y.......y"], pal: { y: "#FFE81A" }, pts: 25 },
  clock: { rows: ["r.rrrrr.r", ".rwwwwwr.", "rwwwkwwwr", "rwwwkwwwr", "rwwwkkkwr", "rwwwwwwwr", ".rwwwwwr.", "..rrrrr..", ".r.....r."], pal: { r: "#FF3B3B", w: "#FFFFFF", k: "#0B1838" }, pts: -1 }
};

function initDash(root) {
  const cv = root.querySelector("canvas"), g = cv.getContext("2d");
  const W = 240, H = 180; cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;
  const kid = KID.map(r => spr(r, KIDPAL));
  const sp = {}; Object.keys(ITEMS).forEach(k => sp[k] = spr(ITEMS[k].rows, ITEMS[k].pal));
  const $ = s => root.querySelector(s);
  const ui = { score: $("[data-score]"), lives: $("[data-lives]"), best: $("[data-best]"), over: $("[data-overlay]") };
  let state = "title", score = 0, lives = 3, items = [], px = W / 2, target = W / 2, keys = {}, t = 0, spawn = 0, last = 0, raf = 0, hurt = 0;
  let best = store.get("gfc-dash-best", 0);
  const groundY = H - 14;

  function hud() {
    ui.score.textContent = score; ui.best.textContent = best;
    ui.lives.textContent = "♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, 3 - lives));
  }
  function overlay(html) { ui.over.innerHTML = html; ui.over.hidden = !html; }
  function title() {
    overlay(`<div class="gt">Dinner Dash</div><p>Catch the dinner, hearts and questions.<br>Dodge the <b class="red">late clocks</b>. Three of them and you miss dinner!</p>
      <button class="btn px" type="button" data-go><span class="in">▶ Play</span></button><p class="hint">← → keys, or drag on the screen</p>`);
    ui.over.querySelector("[data-go]").onclick = start;
  }
  function start() {
    state = "play"; score = 0; lives = 3; items = []; t = 0; spawn = .6; hurt = 0; px = target = W / 2; hud(); overlay("");
    Snd.coin(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function over() {
    state = "over";
    const nb = score > best; if (nb) { best = score; store.set("gfc-dash-best", best); }
    hud(); (nb ? Snd.level() : Snd.bad()); if (nb) FX.confetti(120);
    overlay(`<div class="gt">${nb ? "New high score!" : "Game over"}</div><p class="big">${score} pts</p>
      <p>The real dinner is free if you arrive by <b>5:45 PM</b> on 13 Nov.</p>
      <button class="btn px" type="button" data-go><span class="in">↻ Play again</span></button>`);
    ui.over.querySelector("[data-go]").onclick = start;
  }
  function pick() {
    const r = Math.random(), lvl = Math.min(1, t / 50);
    if (r < .2 + lvl * .14) return "clock";
    if (r < .26 + lvl * .14) return "star";
    if (r < .55) return "cloche";
    if (r < .78) return "heart";
    return "q";
  }
  function toScreen(x, y) { const r = cv.getBoundingClientRect(); return [r.left + x / W * r.width, r.top + y / H * r.height]; }

  function drawScene() {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#0A86EE"); sky.addColorStop(1, "#5CC6FF");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = "#FFFFFF"; const cx = (t * 6) % (W + 60) - 40;
    [[cx, 22], [(cx + 140) % (W + 60) - 40, 46]].forEach(([x, y]) => { g.fillRect(x, y, 30, 6); g.fillRect(x + 6, y - 4, 16, 4); g.fillStyle = "#D6ECFF"; g.fillRect(x, y + 6, 30, 2); g.fillStyle = "#FFFFFF"; });
    g.fillStyle = "#0B1838"; g.fillRect(0, groundY, W, H - groundY);
    g.fillStyle = "#3FDCFF"; g.fillRect(0, groundY, W, 1);
    g.fillStyle = "rgba(63,220,255,.3)"; for (let x = (-(t * 30) % 16); x < W; x += 16) g.fillRect(Math.round(x), groundY + 1, 1, H - groundY);
    g.fillStyle = "#D8FF1F"; g.fillRect(0, groundY + 6, W, 1);
  }
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (state !== "play") return;
    t += dt;
    if (keys.l) target -= 150 * dt; if (keys.r) target += 150 * dt;
    target = Math.max(8, Math.min(W - 8, target)); px += (target - px) * Math.min(1, dt * 14);
    spawn -= dt;
    if (spawn <= 0) { const k = pick(); items.push({ k, x: 8 + Math.random() * (W - 16), y: -12, vy: 34 + Math.min(80, t * 2.2) + Math.random() * 18 }); spawn = Math.max(.32, .95 - t * .018); }
    drawScene();
    const kw = kid[0].width, kh = kid[0].height, kx = Math.round(px - kw / 2), ky = groundY - kh;
    items = items.filter(it => {
      it.y += it.vy * dt; const s = sp[it.k];
      if (it.y + s.height >= ky && it.y <= ky + 4 && it.x + s.width > kx && it.x < kx + kw) {
        const pts = ITEMS[it.k].pts, [sx, sy] = toScreen(it.x + s.width / 2, ky);
        if (pts < 0) { lives--; hurt = .5; Snd.bad(); if (navigator.vibrate) navigator.vibrate(80); if (lives <= 0) { hud(); over(); } }
        else { score += pts; Snd.coin(); FX.burst(sx, sy, pts > 10 ? 18 : 8); }
        hud(); return false;
      }
      if (it.y > groundY) return false;
      g.drawImage(s, Math.round(it.x), Math.round(it.y)); return true;
    });
    hurt = Math.max(0, hurt - dt);
    if (!(hurt > 0 && Math.floor(t * 20) % 2)) g.drawImage(kid[Math.floor(t * 8) % 2], kx, ky);
    if (state === "play") raf = requestAnimationFrame(loop);
  }

  const setFromPointer = e => { const r = cv.getBoundingClientRect(); target = (e.clientX - r.left) / r.width * W; };
  cv.addEventListener("pointerdown", e => { if (state === "play") { setFromPointer(e); cv.setPointerCapture(e.pointerId); } });
  cv.addEventListener("pointermove", e => { if (state === "play" && (e.buttons || e.pointerType === "mouse")) setFromPointer(e); });
  addEventListener("keydown", e => {
    if (state !== "play") return;
    if (["ArrowLeft", "a", "A"].includes(e.key)) { keys.l = true; e.preventDefault(); }
    if (["ArrowRight", "d", "D"].includes(e.key)) { keys.r = true; e.preventDefault(); }
  });
  addEventListener("keyup", e => { if (["ArrowLeft", "a", "A"].includes(e.key)) keys.l = false; if (["ArrowRight", "d", "D"].includes(e.key)) keys.r = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") { state = "paused"; overlay(`<div class="gt">Paused</div><button class="btn px" type="button" data-go><span class="in">▶ Resume</span></button>`); ui.over.querySelector("[data-go]").onclick = () => { state = "play"; overlay(""); last = performance.now(); raf = requestAnimationFrame(loop); }; } });

  t = 0; drawScene(); g.drawImage(kid[0], Math.round(W / 2 - 7), groundY - 14);
  [["cloche", 50, 60], ["heart", 110, 40], ["q", 170, 70], ["clock", 200, 30], ["star", 80, 100]].forEach(([k, x, y]) => g.drawImage(sp[k], x, y));
  hud(); title();
}

/* ================= MEMORY MATCH ================= */
const ICONS = {
  cross: '<rect x="7" y="1" width="2" height="14" fill="#fff"/><rect x="3" y="4" width="10" height="2" fill="#fff"/><rect x="6" y="15" width="4" height="1" fill="#D8FF1F"/>',
  mic: '<rect x="5" y="1" width="6" height="7" fill="#E6EEF8"/><rect x="5" y="3" width="6" height="1" fill="#8C9DB8"/><rect x="5" y="5" width="6" height="1" fill="#8C9DB8"/><rect x="7" y="8" width="2" height="6" fill="#A9C3EE"/><rect x="4" y="14" width="8" height="1" fill="#D8FF1F"/>',
  phone: '<rect x="4" y="1" width="8" height="14" fill="#3FDCFF"/><rect x="5" y="2" width="6" height="11" fill="#0B1838"/><rect x="6" y="5" width="4" height="1" fill="#D8FF1F"/><rect x="5" y="4" width="1" height="1" fill="#D8FF1F"/><rect x="10" y="4" width="1" height="1" fill="#D8FF1F"/><rect x="7" y="7" width="2" height="1" fill="#D8FF1F"/><rect x="7" y="9" width="2" height="2" fill="#D8FF1F"/>',
  dinner: '<rect x="7" y="2" width="2" height="2" fill="#fff"/><rect x="5" y="4" width="6" height="1" fill="#E6EEF8"/><rect x="3" y="5" width="10" height="5" fill="#D7E3F4"/><rect x="4" y="6" width="2" height="2" fill="#fff"/><rect x="1" y="10" width="14" height="2" fill="#D8FF1F"/>',
  heart: '<rect x="2" y="3" width="4" height="2" fill="#FF5FB7"/><rect x="10" y="3" width="4" height="2" fill="#FF5FB7"/><rect x="1" y="5" width="14" height="3" fill="#FF5FB7"/><rect x="2" y="8" width="12" height="2" fill="#FF5FB7"/><rect x="4" y="10" width="8" height="2" fill="#FF5FB7"/><rect x="6" y="12" width="4" height="2" fill="#FF5FB7"/><rect x="3" y="5" width="2" height="2" fill="#fff"/>',
  question: '<rect x="4" y="2" width="8" height="2" fill="#D8FF1F"/><rect x="3" y="4" width="2" height="2" fill="#D8FF1F"/><rect x="11" y="4" width="2" height="3" fill="#D8FF1F"/><rect x="8" y="7" width="3" height="2" fill="#D8FF1F"/><rect x="7" y="9" width="2" height="2" fill="#D8FF1F"/><rect x="7" y="12" width="2" height="2" fill="#D8FF1F"/>',
  pin: '<rect x="5" y="1" width="6" height="2" fill="#FF3B3B"/><rect x="4" y="3" width="8" height="5" fill="#FF3B3B"/><rect x="5" y="8" width="6" height="2" fill="#FF3B3B"/><rect x="6" y="10" width="4" height="2" fill="#FF3B3B"/><rect x="7" y="12" width="2" height="2" fill="#FF3B3B"/><rect x="7" y="4" width="2" height="2" fill="#fff"/><rect x="4" y="14" width="8" height="1" fill="#D8FF1F"/>',
  star: '<rect x="7" y="1" width="2" height="4" fill="#FFE81A"/><rect x="1" y="6" width="14" height="2" fill="#FFE81A"/><rect x="4" y="5" width="8" height="5" fill="#FFE81A"/><rect x="3" y="10" width="3" height="3" fill="#FFE81A"/><rect x="10" y="10" width="3" height="3" fill="#FFE81A"/>'
};
const LABEL = { cross: "Cross", mic: "Microphone", phone: "Phone", dinner: "Dinner", heart: "Heart", question: "Question", pin: "Location pin", star: "Star" };

function initMemory(root) {
  const grid = root.querySelector("[data-grid]"), movesEl = root.querySelector("[data-moves]"), timeEl = root.querySelector("[data-time]"), bestEl = root.querySelector("[data-best]"), msg = root.querySelector("[data-msg]");
  let open = [], lock = false, moves = 0, matched = 0, t0 = 0, timer = 0;
  let best = store.get("gfc-mem-best", 0);
  const showBest = () => bestEl.textContent = best ? best + " moves" : "—";
  function deal() {
    clearInterval(timer); t0 = 0; moves = 0; matched = 0; open = []; lock = false;
    movesEl.textContent = "0"; timeEl.textContent = "0:00"; msg.textContent = "Flip two cards. Find all 8 pairs."; showBest();
    const keys = Object.keys(ICONS), deck = [...keys, ...keys];
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    grid.innerHTML = deck.map((k, i) => `<button class="card" type="button" data-k="${k}" aria-label="Card ${i + 1}, face down"><span class="face back"><span>?</span></span><span class="face front"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${ICONS[k]}</svg></span></button>`).join("");
  }
  grid.addEventListener("click", e => {
    const c = e.target.closest(".card"); if (!c || lock || c.classList.contains("up")) return;
    if (!t0) { t0 = Date.now(); timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); timeEl.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }, 500); }
    c.classList.add("up"); c.setAttribute("aria-label", LABEL[c.dataset.k] + ", face up"); Snd.blip(); open.push(c);
    if (open.length < 2) return;
    moves++; movesEl.textContent = moves;
    const [a, b] = open;
    if (a.dataset.k === b.dataset.k) {
      a.classList.add("ok"); b.classList.add("ok"); open = []; matched++; Snd.coin();
      const r = b.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 14);
      msg.textContent = `${LABEL[a.dataset.k]} pair! ${8 - matched} to go.`;
      if (matched === 8) {
        clearInterval(timer); const nb = !best || moves < best; if (nb) { best = moves; store.set("gfc-mem-best", best); }
        showBest(); Snd.level(); FX.confetti(150);
        msg.textContent = nb ? `All pairs in ${moves} moves. New best!` : `All pairs in ${moves} moves. Your best is ${best}.`;
      }
    } else {
      lock = true;
      setTimeout(() => { a.classList.remove("up"); b.classList.remove("up"); a.setAttribute("aria-label", "Card, face down"); b.setAttribute("aria-label", "Card, face down"); open = []; lock = false; }, 750);
    }
  });
  root.querySelector("[data-reset]").addEventListener("click", () => { deal(); Snd.blip(); });
  deal();
}

window.GFCGames = { initDash, initMemory };
})();
