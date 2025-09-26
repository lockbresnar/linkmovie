/* Actor Chain — Daily/Infinite modes + persistent Daily timer
   IMPORTANT: No HTML/CSS changes required. Uses existing ACTOR_POOL and autocomplete.
   Respects global 'mode' (daily/infinite) set by the main game.
*/

const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMG = "https://image.tmdb.org/t/p/w200";

// ===== State =====
let startActor = null;
let endActor = null;
let steps = 0;
let timerInterval = null;
let lastCastIds = null; // Set of TMDb person IDs from the last accepted movie
let dailyMode = true;

const LS_MODE_KEY       = "mode";                // shared with main game: "daily" | "infinite"
const LS_AC_STARTED     = "ac_started";          // "true" after first Start on Daily
const LS_AC_START_TS    = "ac_dailyStart";       // timestamp (ms) when Daily started
const LS_AC_CHAIN_HTML  = "ac_chain_html";       // saved <ul id="chainList"> markup
const LS_AC_STEPS       = "ac_steps";            // numeric steps

// ===== UI helpers (match your existing structure) =====
function setCounter(val) {
  const el = document.getElementById("counterCircle");
  el.textContent = val;
  if (val < 4) el.style.background = "#4edd00";
  else if (val < 7) el.style.background = "#fa8b48";
  else el.style.background = "#e53935";
}
function setTimerFromSeconds(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  document.getElementById("timer").textContent =
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function addChainItem(text, color) {
  const li = document.createElement("li");
  li.textContent = text;
  li.className = color;  // uses your colors in styles.css
  document.getElementById("chainList").appendChild(li);
  if (dailyMode) {
    localStorage.setItem(LS_AC_CHAIN_HTML, document.getElementById("chainList").innerHTML);
  }
}
function showPopup(title, msg) {
  const p = document.getElementById("popup");
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMsg").innerHTML = msg.replace(/\n/g,"<br/>");
  p.style.display = "block";
}
function closePopup(){ document.getElementById("popup").style.display = "none"; }
function openHelp(){ document.getElementById("helpPopup").style.display = "block"; }
function closeHelp(){ document.getElementById("helpPopup").style.display = "none"; }
window.closePopup = closePopup;
window.openHelp = openHelp;
window.closeHelp = closeHelp;

// ===== Actor pool helpers (use your ACTOR_POOL names) =====
function todaySeed() {
  const d = new Date();
  return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
}
async function pickActorByName(name) {
  const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`);
  const data = await res.json();
  if (data.results && data.results.length) {
    const p = data.results[0];
    return { id: p.id, name: p.name, profile_path: p.profile_path || "" };
  }
  return { id: null, name, profile_path: "" };
}
async function pickRandomActor() {
  const name = ACTOR_POOL[Math.floor(Math.random()*ACTOR_POOL.length)];
  return pickActorByName(name);
}
function pickTwoDeterministicNames() {
  const N = ACTOR_POOL.length;
  const seed = todaySeed();
  const i1 = seed % N;
  const i2raw = Math.floor(seed / 7) + 13;
  const i2 = (i2raw % N === i1) ? (i2raw+1) % N : (i2raw % N);
  return [ACTOR_POOL[i1], ACTOR_POOL[i2]];
}

// ===== Actors on UI =====
async function setActorsOnUI(a1, a2) {
  const img1 = document.getElementById("actor1Img");
  const img2 = document.getElementById("actor2Img");
  img1.src = a1.profile_path ? (IMG + a1.profile_path) : "";
  img2.src = a2.profile_path ? (IMG + a2.profile_path) : "";
  document.getElementById("actor1").textContent = a1.name;
  document.getElementById("actor2").textContent = a2.name;
}

// ===== Init round (Daily vs Infinite) =====
async function initActors() {
  if (dailyMode) {
    const [n1, n2] = pickTwoDeterministicNames();
    startActor = await pickActorByName(n1);
    endActor   = await pickActorByName(n2);
    if (startActor.id && endActor.id && startActor.id === endActor.id) {
      // extremely rare — nudge one index forward
      const idx = (ACTOR_POOL.indexOf(n2)+1) % ACTOR_POOL.length;
      endActor = await pickActorByName(ACTOR_POOL[idx]);
    }
  } else {
    startActor = await pickRandomActor();
    endActor   = await pickRandomActor();
    while (startActor.id && endActor.id && startActor.id === endActor.id) {
      endActor = await pickRandomActor();
    }
  }
  await setActorsOnUI(startActor, endActor);
}

// ===== Timer =====
function startDailyTimer() {
  if (!localStorage.getItem(LS_AC_START_TS)) {
    localStorage.setItem(LS_AC_START_TS, Date.now().toString());
  }
  const tick = () => {
    const start = parseInt(localStorage.getItem(LS_AC_START_TS), 10);
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - start) / 1000));
    setTimerFromSeconds(seconds);
  };
  tick();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
}
function startInfiniteTimer() {
  const t0 = Date.now();
  setTimerFromSeconds(0);
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const seconds = Math.floor((Date.now() - t0) / 1000);
    setTimerFromSeconds(seconds);
  }, 1000);
}

// ===== Controls wiring (keep your existing selectors) =====
let wired = false;
function wireControls() {
  if (wired) return;
  wired = true;

  // Autocomplete you already had (kept exactly as-is)
  const input = document.getElementById("movieInput");
  const box = document.getElementById("suggestions");
  input.addEventListener("input", async (e) => {
    const q = e.target.value.trim();
    box.innerHTML = "";
    if (q.length < 3) return;
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    data.results.slice(0, 7).forEach(m => {
      const d = document.createElement("div");
      d.textContent = m.title;
      d.onclick = () => { input.value = m.title; box.innerHTML = ""; };
      box.appendChild(d);
    });
  });

  // Submit / Reset buttons (use your class names)
  const submitBtn = document.querySelector(".btn-submit");
  const resetBtn  = document.querySelector(".btn-red");
  if (submitBtn) submitBtn.addEventListener("click", submitGuess);
  if (resetBtn)  resetBtn.addEventListener("click", resetChain);
}

// ===== Submit logic (chain-follow mechanic) =====
async function submitGuess() {
  const q = document.getElementById("movieInput").value.trim();
  if (!q) return;

  // Search movie
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!data.results.length) {
    addChainItem(q, "grey");
    clearInput();
    persistDaily();
    return;
  }
  const movie = data.results[0];

  // Credits
  const credRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`);
  const credits = await credRes.json();
  const castIds = new Set(credits.cast.map(c => c.id));

  const includesStart  = startActor.id && castIds.has(startActor.id);
  const includesTarget = endActor.id   && castIds.has(endActor.id);

  // First accepted must include the start actor
  if (lastCastIds === null) {
    if (!includesStart) {
      addChainItem(movie.title, "grey");
      clearInput();
      persistDaily();
      return;
    }
    addChainItem(movie.title, "blue");
    steps += 1; setCounter(steps);
    lastCastIds = castIds;
    if (includesTarget) {
      winNow(); // edge: first movie also contains target
    }
    clearInput();
    persistDaily();
    return;
  }

  // Subsequent: must share at least one actor with previous accepted movie
  const sharesWithLast = [...lastCastIds].some(id => castIds.has(id));
  if (!sharesWithLast) {
    addChainItem(movie.title, "grey");
    clearInput();
    persistDaily();
    return;
  }

  // Valid link → color
  if (includesTarget) {
    addChainItem(movie.title, "green");
    steps += 1; setCounter(steps);
    winNow();
  } else if (includesStart) {
    addChainItem(movie.title, "blue");
    steps += 1; setCounter(steps);
    lastCastIds = castIds;
  } else {
    addChainItem(movie.title, "orange");
    steps += 1; setCounter(steps);
    lastCastIds = castIds;
  }
  clearInput();
  persistDaily();
}

function clearInput() {
  document.getElementById("movieInput").value = "";
  const box = document.getElementById("suggestions");
  if (box) box.innerHTML = "";
}

function resetChain() {
  document.getElementById("chainList").innerHTML = "";
  steps = 0; setCounter(steps);
  lastCastIds = null;
  document.getElementById("status").textContent = "";
  if (dailyMode) {
    localStorage.setItem(LS_AC_CHAIN_HTML, "");
    localStorage.setItem(LS_AC_STEPS, "0");
  }
}

function persistDaily() {
  if (!dailyMode) return;
  localStorage.setItem(LS_AC_STEPS, String(steps));
  localStorage.setItem(LS_AC_CHAIN_HTML, document.getElementById("chainList").innerHTML);
}

function winNow() {
  if (timerInterval) clearInterval(timerInterval);
  showPopup("🎉 You linked them!", `Steps: ${steps}\nTime: ${document.getElementById("timer").textContent}`);
}

// ===== Start & Bootstrap =====
async function startGame() {
  // Hide overlay
  const ov = document.getElementById("introOverlay");
  if (ov) ov.classList.remove("visible");

  // Mark started for Daily
  if (dailyMode && !localStorage.getItem(LS_AC_STARTED)) {
    localStorage.setItem(LS_AC_STARTED, "true");
  }

  // (Re)init actors and timers
  await initActors();

  // Timer mode
  if (timerInterval) clearInterval(timerInterval);
  if (dailyMode) startDailyTimer();
  else startInfiniteTimer();

  // Wire controls (once)
  wireControls();
}
window.startGame = startGame; // ensure inline onclick works

(async function bootstrap() {
  // Mode follows main game; default to Daily if not set
  const savedMode = localStorage.getItem(LS_MODE_KEY);
  dailyMode = savedMode !== "infinite";

  setCounter(steps);
  await initActors();

  if (dailyMode) {
    // Restore saved chain + steps if any
    const savedHTML  = localStorage.getItem(LS_AC_CHAIN_HTML);
    const savedSteps = localStorage.getItem(LS_AC_STEPS);
    if (savedHTML != null)  document.getElementById("chainList").innerHTML = savedHTML;
    if (savedSteps != null) { steps = parseInt(savedSteps, 10) || 0; setCounter(steps); }

    // If already started today, skip overlay and run persistent timer
    if (localStorage.getItem(LS_AC_STARTED) === "true") {
      const ov = document.getElementById("introOverlay");
      if (ov) ov.classList.remove("visible");
      if (!localStorage.getItem(LS_AC_START_TS)) {
        localStorage.setItem(LS_AC_START_TS, Date.now().toString());
      }
      startDailyTimer();
      wireControls();
      return;
    }
    // Otherwise, show overlay until Start is clicked
    const ov = document.getElementById("introOverlay");
    if (ov) ov.classList.add("visible");
  } else {
    // Infinite: always show overlay until Start
    const ov = document.getElementById("introOverlay");
    if (ov) ov.classList.add("visible");
    // Clear daily-only keys so they don't leak
    localStorage.removeItem(LS_AC_STARTED);
    localStorage.removeItem(LS_AC_START_TS);
  }

  // (Controls wired on start)
})();
