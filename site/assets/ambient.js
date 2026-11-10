/* Soft beach ambience made in the browser (no audio files): rolling waves from filtered noise
   that swell and fade, plus a distant seagull now and then. Starts only after the visitor
   interacts (browser rule), fades in gently, and pauses when the tab is hidden. */
(function () {
"use strict";
let ctx = null, master = null, duck = null, running = false, timers = [];

function noiseBuffer(c, seconds, brown) {
  const len = c.sampleRate * seconds, buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w;
    }
  }
  return buf;
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0;
  duck = ctx.createGain(); duck.gain.value = 1;
  master.connect(duck).connect(ctx.destination);

  // low surf rumble
  const rumble = ctx.createBufferSource(); rumble.buffer = noiseBuffer(ctx, 6, true); rumble.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
  const surf = ctx.createGain(); surf.gain.value = .25;
  rumble.connect(lp).connect(surf).connect(master); rumble.start();

  // foam hiss on top
  const hiss = ctx.createBufferSource(); hiss.buffer = noiseBuffer(ctx, 4, false); hiss.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = .5;
  const foam = ctx.createGain(); foam.gain.value = 0;
  hiss.connect(bp).connect(foam).connect(master); hiss.start();

  // each wave: swell in, break, wash out
  function wave() {
    if (!running) return;
    const t = ctx.currentTime, up = 2.6 + Math.random() * 1.6, down = 3.5 + Math.random() * 2.5, peak = .55 + Math.random() * .45;
    surf.gain.cancelScheduledValues(t); surf.gain.setValueAtTime(surf.gain.value, t);
    surf.gain.linearRampToValueAtTime(peak, t + up); surf.gain.linearRampToValueAtTime(.18, t + up + down);
    lp.frequency.cancelScheduledValues(t); lp.frequency.setValueAtTime(lp.frequency.value, t);
    lp.frequency.linearRampToValueAtTime(900 + peak * 500, t + up); lp.frequency.linearRampToValueAtTime(420, t + up + down);
    foam.gain.cancelScheduledValues(t); foam.gain.setValueAtTime(foam.gain.value, t);
    foam.gain.linearRampToValueAtTime(.015, t + up * .7); foam.gain.linearRampToValueAtTime(.06 * peak, t + up + .4);
    foam.gain.exponentialRampToValueAtTime(.002, t + up + down);
    timers.push(setTimeout(wave, (up + down - .8) * 1000));
  }

  // one distant gull: 2–4 "kyow" calls
  function gull() {
    if (!running) return;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = ctx.createGain(); out.gain.value = .25 + Math.random() * .3;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 1.6;
    if (pan) { pan.pan.value = Math.random() * 1.6 - .8; f.connect(out).connect(pan).connect(master); } else f.connect(out).connect(master);
    const calls = 2 + Math.floor(Math.random() * 3), base = 1250 + Math.random() * 350;
    for (let k = 0; k < calls; k++) {
      const t = ctx.currentTime + .1 + k * (.38 + Math.random() * .12), dur = .32 + Math.random() * .12;
      const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 1.55, t + .06); o.frequency.exponentialRampToValueAtTime(base * .82, t + dur);
      vib.frequency.value = 26 + Math.random() * 10; vg.gain.value = 45; vib.connect(vg).connect(o.frequency);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(f); o.start(t); vib.start(t); o.stop(t + dur + .05); vib.stop(t + dur + .05);
    }
    timers.push(setTimeout(gull, 9000 + Math.random() * 14000));
  }
  build.wave = wave; build.gull = gull;
}

const A = {
  get on() { return running; },
  start() {
    try { if (!ctx) build(); } catch (e) { return false; }
    if (ctx.state === "suspended") ctx.resume();
    if (running) return true;
    running = true;
    const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(.28, t + 4);
    build.wave(); timers.push(setTimeout(build.gull, 3500));
    return true;
  },
  stop() {
    if (!ctx || !running) return;
    running = false; timers.forEach(clearTimeout); timers = [];
    const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.2);
  },
  duck(on) { if (!ctx) return; const t = ctx.currentTime; duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(duck.gain.value, t); duck.gain.linearRampToValueAtTime(on ? .5 : 1, t + 1.5); }
};
document.addEventListener("visibilitychange", () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (running) ctx.resume(); });
window.GFCAmbient = A;
})();
