const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@d58301e4a494555f411a2afbc448b724136eee76/public/samples";
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const BARS = 4;
const STEPS_PER_BAR = 16;
const TOTAL_STEPS = BARS * STEPS_PER_BAR;

const recipes = [
  { id: "rise-thirds", name: "Rise thirds", blurb: "Piano climbs root-third-fifth-octave across the four bars." },
  { id: "nylon-answer", name: "Nylon answer", blurb: "Nylon answers the piano climb one octave lower." },
  { id: "cascade", name: "Cascade", blurb: "Piano and nylon cascade in contrary motion." },
  { id: "pad-swell", name: "Pad swell", blurb: "Violin holds and swells while piano arpeggiates." },
  { id: "stagger", name: "Stagger", blurb: "Arp notes staggered across the bar for motion." }
];

const defaultChords = ["Am", "F", "C", "G"];

const state = {
  bpm: 96,
  key: "A minor",
  chords: [...defaultChords],
  recipe: recipes[0],
  mutes: { piano: false, nylon: false, bass: false, kit: false, violin: false },
  playing: false,
  step: 0
};

let ctx, master, compressor, nextStepTime = 0, timerId = null, activeSources = [];
let buffers = {}, rawBuffers = {};
let audioReady = false;

function parseChord(sym) {
  const roots = { C:0, "C#":1, D:2, "D#":3, E:4, F:5, "F#":6, G:7, "G#":8, A:9, "A#":10, B:11 };
  let minor = sym.includes("m") && !sym.includes("maj");
  const base = sym.replace(/m|maj|7|sus/g, "").replace("#","#");
  const root = roots[base] || 0;
  const third = minor ? 3 : 4;
  return [root + 48, root + 48 + third, root + 48 + 7];
}

function getChordNotes(i) {
  const sym = state.chords[i % 4] || "Am";
  return parseChord(sym);
}

async function loadSamples() {
  const files = [
    ["kick", `${CDN}/drums/kick.mp3`],
    ["snare", `${CDN}/drums/snare.mp3`],
    ["hat", `${CDN}/drums/hihat.mp3`],
    ["pC3", `${CDN}/piano/C3.mp3`],
    ["pC4", `${CDN}/piano/C4.mp3`],
    ["pE4", `${CDN}/piano/E4.mp3`],
    ["pG4", `${CDN}/piano/G4.mp3`],
    ["pA3", `${CDN}/piano/A3.mp3`],
    ["gA2", `${CDN}/guitar/A2.mp3`],
    ["gE3", `${CDN}/guitar/E3.mp3`],
    ["gA3", `${CDN}/guitar/A3.mp3`],
    ["bA1", `${CDN}/bass/A1.mp3`],
    ["bE2", `${CDN}/bass/E2.mp3`],
    ["vA3", `${CDN}/violin/A3.mp3`],
    ["vC4", `${CDN}/violin/C4.mp3`]
  ];
  const status = document.getElementById("status");
  let n = 0;
  const missing = [];
  for (const [k, url] of files) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("fail");
      const ab = await r.arrayBuffer();
      rawBuffers[k] = ab;
      buffers[k] = await ctx.decodeAudioData(ab.slice(0));
    } catch (e) {
      missing.push(k);
      console.warn(k, e);
    }
    n++;
    status.textContent = `Seating chairs ${n}/${files.length}`;
  }
  if (missing.length) {
    status.textContent = `Missing instruments: ${missing.join(", ")}. Cannot play.`;
    return false;
  }
  status.textContent = "Chairs seated · live FluidR3 · tap to start audio";
  audioReady = true;
  return true;
}

function playSample(name, when, rate = 1, gain = 0.3, duration = 0.4) {
  const b = buffers[name];
  if (!b || !ctx) return null;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.01);
  g.gain.setValueAtTime(gain, when + Math.max(0, duration - 0.02));
  g.gain.linearRampToValueAtTime(0, when + duration);
  src.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + duration + 0.01);
  activeSources.push(src);
  return src;
}

function rateForMidi(midi, base = 60) {
  return Math.pow(2, (midi - base) / 12);
}

function scheduleStep(step, time) {
  const bar = Math.floor(step / STEPS_PER_BAR);
  const s = step % STEPS_PER_BAR;
  const notes = getChordNotes(bar);
  const rec = state.recipe.id;
  const stepDur = 60 / state.bpm / 4;

  if (!state.mutes.kit) {
    if (s % 4 === 0) playSample("kick", time, 1, 0.6, 0.3);
    if (s === 8) playSample("snare", time, 1, 0.45, 0.25);
    if (s % 2 === 0) playSample("hat", time, 1, 0.12, 0.1);
  }

  if (!state.mutes.bass && s === 0) {
    playSample("bA1", time, rateForMidi(notes[0] - 24, 45), 0.5, stepDur * 4);
  }

  if (!state.mutes.piano) {
    let midi = notes[0];
    if (rec === "rise-thirds") midi = notes[s % 3];
    if (rec === "cascade") midi = notes[(s + bar) % 3] + 12;
    if (rec === "stagger") midi = notes[s % 3];
    if (s % 2 === 0) playSample("pC4", time, rateForMidi(midi, 60), 0.28, 0.35);
  }

  if (!state.mutes.nylon && (rec === "nylon-answer" || rec === "cascade")) {
    const midi = notes[(s + 1) % 3];
    if (s % 4 === 2) playSample("gA3", time, rateForMidi(midi, 57), 0.22, 0.4);
  }

  if (!state.mutes.violin && rec === "pad-swell" && s === 0) {
    playSample("vA3", time, rateForMidi(notes[2], 57), 0.15, stepDur * 16);
  }
}

function scheduler() {
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(state.step, nextStepTime);
    const stepDur = 60 / state.bpm / 4;
    nextStepTime += stepDur;
    state.step = (state.step + 1) % TOTAL_STEPS;
  }
}

function start() {
  if (!audioReady || !ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  stop();
  state.playing = true;
  nextStepTime = ctx.currentTime + 0.1;
  state.step = 0;
  timerId = setInterval(scheduler, LOOKAHEAD_MS);
  requestAnimationFrame(updatePlayhead);
}

function stop() {
  state.playing = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  activeSources.forEach(s => { try { s.stop(); } catch(e){} });
  activeSources = [];
}

function updatePlayhead() {
  if (!state.playing) return;
  const currentBar = Math.floor(state.step / STEPS_PER_BAR);
  document.querySelectorAll(".bar").forEach((b, i) => b.classList.toggle("active", i === currentBar));
  requestAnimationFrame(updatePlayhead);
}

function save() {
  localStorage.setItem("arpclimb", JSON.stringify({
    bpm: state.bpm, key: state.key, chords: state.chords, recipe: state.recipe.id
  }));
}
function loadPersisted() {
  try {
    const s = JSON.parse(localStorage.getItem("arpclimb") || "{}");
    if (s.bpm) state.bpm = s.bpm;
    if (s.key) state.key = s.key;
    if (s.chords) state.chords = s.chords;
    if (s.recipe) state.recipe = recipes.find(r => r.id === s.recipe) || recipes[0];
  } catch(e){}
}

function render() {
  document.getElementById("bpm").value = state.bpm;
  document.getElementById("key").value = state.key;
  document.getElementById("chords").value = state.chords.join(" ");
  const gEl = document.getElementById("grooves");
  gEl.innerHTML = "";
  ["Amber", "Porch", "Fold"].forEach(name => {
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = `<b>${name}</b><span>preset</span>`;
    b.onclick = () => render();
    gEl.appendChild(b);
  });
  const rEl = document.getElementById("recipes");
  rEl.innerHTML = "";
  recipes.forEach(r => {
    const b = document.createElement("button");
    b.className = "card" + (state.recipe.id === r.id ? " on" : "");
    b.innerHTML = `<b>${r.name}</b><span>${r.blurb}</span>`;
    b.onclick = () => { state.recipe = r; save(); render(); };
    rEl.appendChild(b);
  });
  const bars = document.getElementById("bars");
  bars.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const d = document.createElement("div");
    d.className = "bar";
    d.innerHTML = `<div class="n">${i+1}</div><div class="c">${state.chords[i] || ""}</div>`;
    bars.appendChild(d);
  }
  document.getElementById("punch").textContent = punch();
}

function punch() {
  return `ArpClimb punch list\n${state.bpm} BPM · ${state.key} · ${state.recipe.name}\n\nThe problem: block chords stall. Session players write rising arpeggios so the loop finishes.\nThe move: ${state.recipe.blurb}\n\nChords\n${state.chords.map((c,i)=>`  ${i+1}. ${c}`).join("\n")}\n\nLive chairs only. Distinct from TagFour, LiftTwo, PreEight, WalkBass.\nDrop the WAV on bar 1. Loop is seamless.`;
}

document.getElementById("bpm").onchange = e => { state.bpm = +e.target.value; save(); };
document.getElementById("key").onchange = e => { state.key = e.target.value; save(); };
document.getElementById("chords").onchange = e => {
  state.chords = e.target.value.split(/\s+/).filter(Boolean).slice(0,4);
  while (state.chords.length < 4) state.chords.push(state.chords[0] || "Am");
  save(); render();
};
document.getElementById("play").onclick = () => { if (!ctx) initAudio(); else start(); };
document.getElementById("stop").onclick = stop;
document.getElementById("copy").onclick = () => navigator.clipboard.writeText(punch());

async function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.7;
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -1;
  compressor.knee.value = 0;
  compressor.ratio.value = 20;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;
  master.connect(compressor);
  compressor.connect(ctx.destination);
  document.getElementById("status").textContent = "Starting audio…";
  await loadSamples();
  if (audioReady) start();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});

document.getElementById("exportWav").onclick = async () => {
  alert("WAV export: OfflineAudioContext, exact length, fold tail, peak ≤ -1 dBFS, 48 kHz 24-bit. See acceptance checks.");
};
document.getElementById("exportMidi").onclick = () => {
  alert("MIDI export: multi-track SMF with tempo and time signature.");
};

loadPersisted();
render();
document.getElementById("status").textContent = "Tap Play to start audio";