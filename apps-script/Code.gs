/**
 * Let's Talk GFC — registration backend (Google Apps Script + Google Sheets)
 *
 * 1. Change STAFF_PIN below to a secret number only your volunteers know.
 * 2. Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone.
 * 3. Copy the web app URL into site/config.js (apiUrl).
 * Full steps: SETUP.md
 */

const STAFF_PIN = 'CHANGE-ME';          // <-- set this before deploying
const TZ = 'Asia/Kolkata';
const SHEET = 'Registrations';
const HEAD = ['Pass Code', 'Name', 'Mobile', 'Email', 'Parish / College / Workplace',
  'Registered At', 'Checked In At', 'Arrival', 'Dinner', 'Fee (₹)', 'Payment Mode', 'Paid At'];
// column numbers (1-based)
const C = { code: 1, name: 2, phone: 3, email: 4, org: 5, reg: 6, inAt: 7, arrival: 8, dinner: 9, fee: 10, mode: 11, paidAt: 12 };
const ALPH = 'ACDEFHJKMNPRTUVWXY34679';

/* ---------------- entry points ---------------- */
function doGet() {
  return json_(Object.assign({ ok: true, count: Math.max(0, sheet_().getLastRow() - 1) }, cfg_()));
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'Bad request.' }); }
  const lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return json_({ ok: false, error: 'The server is busy. Try again in a moment.' }); }
  try { return json_(route_(body)); }
  catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  finally { lock.releaseLock(); }
}

const PUBLIC_ACTIONS = { info: a_info, register: a_register, findPass: a_findPass };
const STAFF_ACTIONS = { verify: a_verify, list: a_list, checkin: a_checkin, walkin: a_walkin, pay: a_pay, undo: a_undo, remove: a_remove, settings: a_settings };

function route_(b) {
  if (PUBLIC_ACTIONS[b.action]) return Object.assign({ ok: true }, PUBLIC_ACTIONS[b.action](b));
  if (STAFF_ACTIONS[b.action]) {
    if (STAFF_PIN === 'CHANGE-ME') return { ok: false, auth: false, error: 'Set STAFF_PIN in Code.gs and redeploy.' };
    if (String(b.pin || '') !== STAFF_PIN) return { ok: false, auth: false, error: 'Wrong staff PIN.' };
    return Object.assign({ ok: true }, STAFF_ACTIONS[b.action](b));
  }
  return { ok: false, error: 'Unknown action.' };
}

/* ---------------- public ---------------- */
function a_info() { return Object.assign({ count: Math.max(0, sheet_().getLastRow() - 1) }, cfg_()); }

function a_register(b) {
  const v = validate_(b);
  const sh = sheet_(), rows = rows_(sh);
  const hit = rows.find(r => r.rec.phone === v.phone);
  if (hit) return { existing: true, pass: hit.rec };
  const codes = new Set(rows.map(r => r.rec.code));
  let code;
  do { code = 'GFC-' + Array.from({ length: 4 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join(''); } while (codes.has(code));
  const now = new Date();
  sh.appendRow([code, safe_(v.name), "'" + v.phone, safe_(v.email), safe_(v.org), now, '', '', '', 0, '', '']);
  return { pass: { code: code, name: v.name, phone: v.phone, email: v.email, org: v.org, registeredAt: now.getTime(), checkedInAt: null, dinner: 'wait', fee: 0, payMode: '', paidAt: null } };
}

function a_findPass(b) {
  const phone = normPhone_(b.phone), first = String(b.name || '').trim().split(/\s+/)[0].toLowerCase();
  if (phone.length !== 10 || !first) throw new Error('Enter the mobile number and first name you registered with.');
  const hit = rows_(sheet_()).find(r => r.rec.phone === phone && r.rec.name.toLowerCase().split(/\s+/)[0] === first);
  if (!hit) throw new Error('No pass matches that name and number. Check the spelling or register again.');
  return { pass: { code: hit.rec.code, name: hit.rec.name, phone: hit.rec.phone, checkedInAt: hit.rec.checkedInAt, dinner: hit.rec.dinner, fee: hit.rec.fee } };
}

/* ---------------- staff ---------------- */
function a_verify() { return cfg_(); }
function a_list() { return { regs: rows_(sheet_()).map(r => r.rec), cfg: cfg_() }; }

function a_checkin(b) {
  const sh = sheet_(), hit = find_(sh, b.code);
  if (!hit) return { status: 'notfound' };
  if (hit.rec.checkedInAt) return { status: 'already', rec: hit.rec };
  return { status: 'ok', rec: checkin_(sh, hit) };
}

function a_walkin(b) {
  const res = a_register(b);
  const sh = sheet_(), hit = find_(sh, res.pass.code);
  if (hit.rec.checkedInAt) return { status: 'already', rec: hit.rec, existing: true };
  return { status: 'ok', rec: checkin_(sh, hit), existing: !!res.existing };
}

function a_pay(b) {
  const sh = sheet_(), hit = find_(sh, b.code);
  if (!hit) throw new Error('Pass not found.');
  if (hit.rec.dinner !== 'due') return { rec: hit.rec };
  const mode = b.mode === 'UPI' ? 'UPI' : 'Cash', now = new Date();
  sh.getRange(hit.row, C.dinner).setValue('Paid');
  sh.getRange(hit.row, C.mode, 1, 2).setValues([[mode, now]]);
  return { rec: find_(sh, b.code).rec };
}

function a_undo(b) {
  const sh = sheet_(), hit = find_(sh, b.code);
  if (!hit) throw new Error('Pass not found.');
  sh.getRange(hit.row, C.inAt, 1, 6).setValues([['', '', '', 0, '', '']]);
  return { rec: find_(sh, b.code).rec };
}

function a_remove(b) {
  const sh = sheet_(), hit = find_(sh, b.code);
  if (hit) sh.deleteRow(hit.row);
  return {};
}

function a_settings(b) {
  const p = PropertiesService.getScriptProperties();
  if (b.cutoff != null) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.cutoff))) throw new Error('Cutoff must look like 17:45.');
    p.setProperty('CUTOFF', String(b.cutoff));
  }
  if (b.fee != null) {
    const fee = Math.round(Number(b.fee));
    if (!(fee >= 0 && fee <= 100000)) throw new Error('Fee must be a number.');
    p.setProperty('FEE', String(fee));
  }
  return { cfg: cfg_() };
}

/* ---------------- helpers ---------------- */
function checkin_(sh, hit) {
  const now = new Date(), cfg = cfg_();
  const mins = Number(Utilities.formatDate(now, TZ, 'H')) * 60 + Number(Utilities.formatDate(now, TZ, 'm'));
  const parts = cfg.cutoff.split(':').map(Number), late = mins > parts[0] * 60 + parts[1];
  const fee = late ? cfg.fee : 0;
  sh.getRange(hit.row, C.inAt, 1, 4).setValues([[now, late ? 'Late' : 'On time', late && fee > 0 ? 'Due' : 'Free', fee]]);
  return find_(sh, hit.rec.code).rec;
}

function cfg_() {
  const p = PropertiesService.getScriptProperties();
  return { cutoff: p.getProperty('CUTOFF') || '17:45', fee: Number(p.getProperty('FEE') || 100) };
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#081633').setFontColor('#D8FF1F');
    sh.getRange('C:C').setNumberFormat('@');
    sh.getRange('F:G').setNumberFormat('dd-mmm-yyyy h:mm am/pm');
    sh.getRange('L:L').setNumberFormat('dd-mmm-yyyy h:mm am/pm');
    try { ss.setSpreadsheetTimeZone(TZ); } catch (e) {}
  }
  return sh;
}

function rows_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEAD.length).getValues().map((v, i) => ({ row: i + 2, rec: rec_(v) }));
}
function find_(sh, code) {
  code = String(code || '').toUpperCase().trim();
  return rows_(sh).find(r => r.rec.code === code) || null;
}
function rec_(v) {
  const ms = x => x instanceof Date ? x.getTime() : (x ? new Date(x).getTime() || null : null);
  const d = { Free: 'free', Due: 'due', Paid: 'paid' }[String(v[C.dinner - 1])] || 'wait';
  return {
    code: String(v[0]), name: String(v[1]), phone: normPhone_(v[2]), email: String(v[3] || ''), org: String(v[4] || ''),
    registeredAt: ms(v[5]), checkedInAt: ms(v[6]), dinner: d, fee: Number(v[9]) || 0, payMode: String(v[10] || ''), paidAt: ms(v[11])
  };
}
function validate_(b) {
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  const phone = normPhone_(b.phone);
  const email = String(b.email || '').trim();
  const org = String(b.org || '').trim().slice(0, 80);
  if (name.length < 2 || name.length > 80) throw new Error('Enter your full name.');
  if (phone.length !== 10) throw new Error('Enter a 10-digit mobile number.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That email doesn’t look right. Fix it or leave it blank.');
  return { name: name, phone: phone, email: email, org: org };
}
function normPhone_(p) { return String(p || '').replace(/\D/g, '').slice(-10); }
function safe_(s) { s = String(s || ''); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Run once from the editor to create the sheet and check permissions. */
function setup() { sheet_(); Logger.log('Ready. Settings: ' + JSON.stringify(cfg_())); }
