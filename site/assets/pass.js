/* Event pass image in the poster style: sky + pixel clouds, crest lockup, outlined title,
   QR panel with name + code, date bar, navy map ground with venue and dinner rule. 1080 × 1800 PNG. */
(function () {
"use strict";
const W = 1080, H = 1800, NAVY = "#0B1838", LIME = "#D8FF1F", CYAN = "#33D4FF", YELLOW = "#FFE81A", BLUE = "#1A55E0";
let logoImg = null;
function loadLogo() {
  if (logoImg) return logoImg;
  logoImg = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = "assets/logo.png"; });
  return logoImg;
}
async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('italic 900 100px "Kanit"'), document.fonts.load('800 40px "Kanit"'),
      document.fonts.load("700 40px Kanit"), document.fonts.load("600 40px Kanit")
    ]);
  } catch (e) { }
}

function stepped(g, x, y, w, h, s) {
  g.beginPath();
  g.moveTo(x, y + 2 * s); g.lineTo(x + s, y + 2 * s); g.lineTo(x + s, y + s); g.lineTo(x + 2 * s, y + s); g.lineTo(x + 2 * s, y);
  g.lineTo(x + w - 2 * s, y); g.lineTo(x + w - 2 * s, y + s); g.lineTo(x + w - s, y + s); g.lineTo(x + w - s, y + 2 * s); g.lineTo(x + w, y + 2 * s);
  g.lineTo(x + w, y + h - 2 * s); g.lineTo(x + w - s, y + h - 2 * s); g.lineTo(x + w - s, y + h - s); g.lineTo(x + w - 2 * s, y + h - s); g.lineTo(x + w - 2 * s, y + h);
  g.lineTo(x + 2 * s, y + h); g.lineTo(x + 2 * s, y + h - s); g.lineTo(x + s, y + h - s); g.lineTo(x + s, y + h - 2 * s); g.lineTo(x, y + h - 2 * s);
  g.closePath();
}
function panel(g, x, y, w, h, border, fill, s = 12, bw = 7) {
  stepped(g, x, y, w, h, s); g.fillStyle = border; g.fill();
  stepped(g, x + bw, y + bw, w - 2 * bw, h - 2 * bw, s); g.fillStyle = fill; g.fill();
}
function outlined(g, txt, x, y, font, fill, lw, depth) {
  g.font = font; g.lineJoin = "round"; g.miterLimit = 2;
  if (depth) {
    for (let d = depth; d > 0; d -= 2) { g.lineWidth = lw; g.strokeStyle = NAVY; g.strokeText(txt, x + d * .8, y + d); }
    g.fillStyle = BLUE; g.fillText(txt, x + depth * .8 - 2, y + depth - 3);
  }
  g.lineWidth = lw; g.strokeStyle = NAVY; g.strokeText(txt, x, y);
  g.fillStyle = fill; g.fillText(txt, x, y);
}
function fitFont(g, txt, maxW, size, tpl) { let s = size; do { g.font = tpl(s); if (g.measureText(txt).width <= maxW) break; s -= 4; } while (s > 28); return tpl(s); }
function cloud(g, x, y, P) {
  const rows = ["....wwww.......", "..wwwwwwwww.ww.", ".wwwwwwwwwwwwww", "wwwwwwwwwwwwwww", "ssswwwwwwssssss", ".ssssssssssss.."];
  rows.forEach((r, ry) => [...r].forEach((c, rx) => { if (c !== ".") { g.fillStyle = c === "w" ? "#FFFFFF" : "#D6ECFF"; g.fillRect(x + rx * P, y + ry * P, P, P); } }));
}
function bird(g, x, y, P) {
  g.fillStyle = NAVY; [[0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [5, 3], [6, 2], [7, 1], [8, 1], [9, 0], [10, 0]].forEach(([a, b]) => g.fillRect(x + a * P, y + b * P, P, P));
}
function spark(g, x, y, s) {
  g.fillStyle = NAVY; g.fillRect(x - s * 1.5 - 3, y - s / 2 - 3, s * 3 + 6, s + 6); g.fillRect(x - s / 2 - 3, y - s * 1.5 - 3, s + 6, s * 3 + 6);
  g.fillStyle = LIME; g.fillRect(x - s * 1.5, y - s / 2, s * 3, s); g.fillRect(x - s / 2, y - s * 1.5, s, s * 3);
}
function star4(g, cx, cy, r) {
  g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * .22, cy - r * .22); g.lineTo(cx + r, cy); g.lineTo(cx + r * .22, cy + r * .22);
  g.lineTo(cx, cy + r); g.lineTo(cx - r * .22, cy + r * .22); g.lineTo(cx - r, cy); g.lineTo(cx - r * .22, cy - r * .22); g.closePath();
  g.fillStyle = "#fff"; g.fill(); g.lineWidth = 8; g.strokeStyle = NAVY; g.lineJoin = "round"; g.stroke();
}
function qrBlock(g, code, x, y, size) {
  g.fillStyle = "#fff"; g.fillRect(x, y, size, size);
  if (!code || typeof qrcode !== "function") {
    g.fillStyle = "rgba(11,24,56,.14)"; const c = size / 9;
    for (let r = 0; r < 9; r++) for (let k = 0; k < 9; k++) if ((r * 7 + k * 3) % 4 !== 0) g.fillRect(x + k * c + 6, y + r * c + 6, c - 12, c - 12);
    g.fillStyle = NAVY; g.textAlign = "center"; g.font = '700 34px "Kanit", sans-serif';
    g.fillText("YOUR QR CODE", x + size / 2, y + size / 2 - 6); g.font = '600 26px "Kanit", sans-serif'; g.fillText("after you register", x + size / 2, y + size / 2 + 34);
    return;
  }
  const q = qrcode(0, "M"); q.addData(code); q.make();
  const n = q.getModuleCount(), quiet = 2, cell = Math.floor(size / (n + quiet * 2)), off = Math.floor((size - cell * n) / 2);
  g.fillStyle = NAVY;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
}

async function draw(canvas, d) {
  await fontsReady();
  const logo = await loadLogo();
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d"); g.imageSmoothingEnabled = true; g.textBaseline = "alphabetic";
  const name = String(d.name || "").trim(), code = d.code || "";

  // sky
  const sky = g.createLinearGradient(0, 0, 0, 1500); sky.addColorStop(0, "#0A86EE"); sky.addColorStop(.55, "#1FA2F7"); sky.addColorStop(1, "#5CC6FF");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  cloud(g, -40, 300, 14); cloud(g, 860, 250, 12); cloud(g, -60, 1080, 12); cloud(g, 880, 1000, 14);
  bird(g, 860, 90, 5); bird(g, 940, 140, 4); bird(g, 120, 660, 4);

  // crest lockup
  if (logo) g.drawImage(logo, 70, 50, 150, 181);
  g.fillStyle = YELLOW; g.fillRect(250, 62, 6, 160);
  g.textAlign = "center";
  outlined(g, "Christos Mar Thoma Church", 650, 118, '700 50px "Kanit", sans-serif', "#fff", 9);
  outlined(g, "Yuvajana Sakhyam", 650, 176, '700 50px "Kanit", sans-serif', "#fff", 9);
  g.fillStyle = YELLOW; g.fillRect(400, 207, 110, 5); g.fillRect(790, 207, 110, 5);
  outlined(g, "Presents", 650, 222, 'italic 600 38px "Kanit", sans-serif', "#fff", 7);

  // title
  g.save(); g.translate(540, 0); g.rotate(-.07);
  outlined(g, "LET'S TALK", 0, 420, 'italic 900 156px "Kanit", "Arial Black", sans-serif', "#fff", 22, 18);
  g.beginPath(); g.moveTo(-300, 650); g.quadraticCurveTo(0, 590, 330, 610); g.quadraticCurveTo(10, 615, -280, 672); g.closePath();
  g.fillStyle = LIME; g.fill(); g.lineWidth = 8; g.strokeStyle = NAVY; g.lineJoin = "round"; g.stroke();
  outlined(g, "GFC", -20, 640, 'italic 900 270px "Kanit", "Arial Black", sans-serif', LIME, 26, 22);
  star4(g, 290, 470, 62);
  g.restore();
  spark(g, 120, 560, 14); spark(g, 980, 520, 10); spark(g, 900, 680, 14);

  outlined(g, "God, Faith & Conversations", 540, 770, '700 56px "Kanit", sans-serif', "#fff", 10);

  // pass panel
  panel(g, 100, 815, 880, 640, LIME, NAVY, 14, 8);
  g.fillStyle = CYAN; g.font = '700 34px "Kanit", sans-serif'; g.fillText(code ? "ENTRY PASS" : "PASS PREVIEW", 540, 875);
  qrBlock(g, code, 350, 895, 380);
  g.fillStyle = code ? LIME : "#5E7BB8"; g.font = '700 84px "Kanit", sans-serif'; g.fillText(code || "GFC-····", 540, 1356);
  const nm = (name || "YOUR NAME").toUpperCase();
  g.font = fitFont(g, nm, 780, 70, s => `italic 900 ${s}px "Kanit", "Arial Black", sans-serif`);
  g.fillStyle = name ? "#fff" : "#5E7BB8"; g.fillText(nm, 540, 1425);

  // date bar
  panel(g, 90, 1480, 900, 100, LIME, NAVY, 10, 7);
  g.fillStyle = "#fff"; g.font = '700 48px "Kanit", sans-serif'; g.fillText("FRIDAY, 13 NOV 2026", 450, 1547);
  g.fillStyle = LIME; g.fillRect(745, 1505, 6, 50);
  g.fillStyle = "#fff"; g.fillText("6 PM", 865, 1547);

  // ground
  g.beginPath(); g.moveTo(0, H); g.lineTo(0, 1620); g.quadraticCurveTo(540, 1580, W, 1620); g.lineTo(W, H); g.closePath();
  g.fillStyle = NAVY; g.fill();
  g.save(); g.clip();
  g.strokeStyle = "rgba(51,212,255,.22)"; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 1630 + i * 32); g.lineTo(W, 1630 + i * 32); g.stroke(); }
  for (let k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(540 + k * 30, 1600); g.lineTo(540 + k * 120, H); g.stroke(); }
  g.strokeStyle = LIME; g.lineWidth = 5; g.beginPath(); g.moveTo(540, 1600); g.lineTo(80, H); g.moveTo(540, 1600); g.lineTo(1000, H); g.stroke();
  g.restore();
  g.fillStyle = "#fff"; g.font = '700 40px "Kanit", sans-serif'; g.fillText("Christos Mar Thoma Church, Kakkanad", 540, 1688);
  g.font = '800 38px "Kanit", sans-serif'; g.fillStyle = "#fff";
  const a = "ARRIVE BY ", b = (d.arriveBy || "5:45 PM"), c = " — DINNER IS ON US!";
  const wa = g.measureText(a).width, wb = g.measureText(b).width, wc = g.measureText(c).width, sx = 540 - (wa + wb + wc) / 2;
  g.textAlign = "left"; g.fillText(a, sx, 1752); g.fillStyle = LIME; g.fillText(b, sx + wa, 1752); g.fillStyle = "#fff"; g.fillText(c, sx + wa + wb, 1752);
  g.textAlign = "center";
  return canvas;
}

window.GFCPass = {
  draw,
  async blob(d) { const c = document.createElement("canvas"); await draw(c, d); return new Promise(r => c.toBlob(r, "image/png")); }
};
})();
