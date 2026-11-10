// Let's Talk GFC — site settings. See SETUP.md.
window.GFC_CONFIG = {
  // Paste your Google Apps Script web app URL here (ends in /exec).
  // Leave empty to run in DEMO MODE (data stays on this one device).
  apiUrl: "https://script.google.com/macros/s/AKfycbz9FsSMHrrO4ze_VdKpBc8G5fH_7rWAiSurbig1VPRn58k24LD5yy4HkXR2ND1trnBW/exec",

  eventStart: "2026-11-13T18:00:00+05:30", // used for the countdown
  arriveBy: "5:45 PM",                     // shown on the public page and the pass
  lateFee: 100,                            // late dinner fee shown on the public page
  demoPin: "1234",                         // staff PIN in demo mode only; the real PIN lives in Code.gs

  // "Vibe" background music: slowed instrumental of Coastline (Hollow Coves), vocals removed.
  // Swap `file` for any MP3 in the site folder. volume: 0 (silent) to 1 (full).
  music: { file: "assets/audio/coastline-slowed-instrumental.mp3", volume: 0.45 },

  // Dinner prepay by UPI. Put the UPI ID that should receive the money in `vpa`
  // (for example "yourname@okaxis"). Leave it empty to hide the prepay option.
  // You confirm each payment in the admin panel after checking your bank app.
  upi: { vpa: "mathewk290@oksbi", name: "Christos Mar Thoma Church Yuvajana Sakhyam", amount: 100 }
};
