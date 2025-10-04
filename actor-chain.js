/* Actor Chain — Daily/Infinite modes with persistent Daily timer
   Uses ACTOR_POOL (actors.js). Style and autocomplete remain unchanged.
*/

const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMG = "https://image.tmdb.org/t/p/w200";

let startActor = null;
let endActor = null;
let steps = 0;
let timerInterval = null;
let lastCastIds = null;
let dailyMode = true;
let ended = false;                 // prevent re-trigger after completion
let _acFirstMovie = null;          // first accepted film
let _acLastMovie = null;           // last accepted film (updates each step)

const LS_MODE_KEY       = "mode";                // "daily" | "infinite"
const LS_AC_STARTED     = "ac_started";
const LS_AC_START_TS    = "ac_dailyStart";
const LS_AC_CHAIN_HTML  = "ac_chain_html";
const LS_AC_STEPS       = "ac_steps";
const LS_AC_DAYKEY      = "ac_dayKey";          // track local calendar day

// ===== Helpers =====
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
  li.className = color;
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

// ===== Actor pool =====
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
  // Both actors change daily (fixes the “second actor sticks for a week” issue).
  const N = ACTOR_POOL.length;
  const seed = todaySeed();
  const i1 = seed % N;
  let i2 = ((seed * 97 + 23) % N);  // mixes the day seed so it varies every day
  if (i2 === i1) i2 = (i2 + 1) % N;
  return [ACTOR_POOL[i1], ACTOR_POOL[i2]];
}

// ===== Actors on UI =====
async function setActorsOnUI(a1, a2) {
  document.getElementById("actor1Img").src = a1.profile_path ? IMG+a1.profile_path : "";
  document.getElementById("actor1").textContent = a1.name;
  document.getElementById("actor2Img").src = a2.profile_path ? IMG+a2.profile_path : "";
  document.getElementById("actor2").textContent = a2.name;
}

// ===== Init actors =====
async function initActors() {
  if (dailyMode) {
    const [n1, n2] = pickTwoDeterministicNames();
    startActor = await pickActorByName(n1);
    endActor   = await pickActorByName(n2);
    if (startActor.id && endActor.id && startActor.id === endActor.id) {
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
  if (!localStorage.getItem(LS_AC_DAYKEY)) {
    localStorage.setItem(LS_AC_DAYKEY, new Date().toDateString());
  }
  const tick = () => {
    // Day rollover: if calendar day changed, reset base timestamp AND clear chain/steps.
    const todayKey = new Date().toDateString();
    const savedKey = localStorage.getItem(LS_AC_DAYKEY);
    if (savedKey !== todayKey) {
      localStorage.setItem(LS_AC_DAYKEY, todayKey);
      localStorage.setItem(LS_AC_START_TS, Date.now().toString());

      // Clear daily chain & steps automatically (no manual Reset needed)
      localStorage.removeItem(LS_AC_CHAIN_HTML);
      localStorage.removeItem(LS_AC_STEPS);

      const list = document.getElementById("chainList");
      if (list) list.innerHTML = "";
      steps = 0; setCounter(0);
      lastCastIds = null;
      ended = false;
      const p = document.getElementById("popup");
      if (p) p.style.display = "none";
    }

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
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

// ===== Controls =====
let wired = false;
function wireControls() {
  if (wired) return;
  wired = true;

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

  const submitBtn = document.querySelector(".btn-submit");
  const resetBtn  = document.querySelector(".btn-red");
  if (submitBtn) submitBtn.addEventListener("click", submitGuess);
  if (resetBtn)  resetBtn.addEventListener("click", resetChain);
}

// ===== Game logic =====
async function submitGuess() {
  if (ended) { reopenWinPopup(); return; } // re-open popup after win
  const q = document.getElementById("movieInput").value.trim();
  if (!q) return;

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!data.results.length) {
    addChainItem(q, "grey");
    clearInput();
    persistDaily();
    return;
  }
  const movie = data.results[0];

  const credRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`);
  const credits = await credRes.json();
  const castIds = new Set(credits.cast.map(c => c.id));

  const includesStart  = startActor.id && castIds.has(startActor.id);
  const includesTarget = endActor.id   && castIds.has(endActor.id);

  if (lastCastIds === null) {
    if (!includesStart) {
      addChainItem(movie.title, "grey");
      clearInput(); persistDaily();
      return;
    }
    addChainItem(movie.title, "blue");
    steps += 1; setCounter(steps);
    lastCastIds = castIds;

    if (!_acFirstMovie) _acFirstMovie = movie;
    _acLastMovie = movie;

    if (includesTarget) winNow();
    clearInput(); persistDaily();
    return;
  }

  const sharesWithLast = [...lastCastIds].some(id => castIds.has(id));
  if (!sharesWithLast) {
    addChainItem(movie.title, "grey");
    clearInput(); persistDaily();
    return;
  }

  if (includesTarget) {
    addChainItem(movie.title, "green");
    steps += 1; setCounter(steps);

    if (!_acFirstMovie) _acFirstMovie = movie;
    _acLastMovie = movie;

    winNow();
  } else if (includesStart) {
    addChainItem(movie.title, "blue");
    steps += 1; setCounter(steps);
    lastCastIds = castIds;

    if (!_acFirstMovie) _acFirstMovie = movie;
    _acLastMovie = movie;
  } else {
    addChainItem(movie.title, "orange");
    steps += 1; setCounter(steps);
    lastCastIds = castIds;

    if (!_acFirstMovie) _acFirstMovie = movie;
    _acLastMovie = movie;
  }
  clearInput(); persistDaily();
}
function clearInput() {
  document.getElementById("movieInput").value = "";
  document.getElementById("suggestions").innerHTML = "";
}
function resetChain() {
  if (ended) { reopenWinPopup(); return; } // re-open popup after win
  document.getElementById("chainList").innerHTML = "";
  steps = 0; setCounter(steps);
  lastCastIds = null;
  document.getElementById("status").textContent = "";
  _acFirstMovie = null;
  _acLastMovie = null;
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

// ===== End-game popup (performance titles + two posters) =====
function winNow() {
  if (ended) return;
  ended = true;
  stopTimer();

  const timeStr = document.getElementById("timer").textContent;
  const timeSecs = timeStr.split(":").reduce((m,s)=>m*60 + +s, 0);

  let title;
  if (steps === 1 && timeSecs < 60) title = "Perfect!";
  else if (steps === 2) title = "Excellent!";
  else if (steps <= 5) title = "Nice!";
  else if (steps <= 9) title = "Not Bad!";
  else title = "You Got There!";

  const points = Math.max(0, 200 - steps*10);

  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMovie").textContent = `${startActor.name} → ${endActor.name}`;
  document.getElementById("popupSteps").textContent = steps;
  document.getElementById("popupTime").textContent = timeStr;
  document.getElementById("popupPoints").textContent = `${points} pts`;

  // mini-circle colour by steps (green → amber → red)
  let c = "#2ecc71";
  if (steps >= 4 && steps <= 6) c = "#f39c12";
  else if (steps > 6) c = "#e74c3c";
  document.getElementById("popupSteps").style.backgroundColor = c;

  // two posters (first + last accepted films, if available)
  const ps = document.getElementById("popupPosterStart");
  const pe = document.getElementById("popupPosterEnd");
  if (_acFirstMovie && _acFirstMovie.poster_path) ps.src = IMG + _acFirstMovie.poster_path;
  if (_acLastMovie  && _acLastMovie.poster_path)  pe.src = IMG + _acLastMovie.poster_path;

  // Daily only share button
  document.querySelector(".share-btn").style.display = dailyMode ? "inline-block" : "none";

  document.getElementById("popup").style.display = "block";
}

// Re-open the same win popup without changing state/timer
function reopenWinPopup() {
  const timeStr = document.getElementById("timer").textContent;
  const timeSecs = timeStr.split(":").reduce((m, s) => m * 60 + +s, 0);

  let title;
  if (steps === 1 && timeSecs < 60) title = "Perfect!";
  else if (steps === 2) title = "Excellent!";
  else if (steps <= 5) title = "Nice!";
  else if (steps <= 9) title = "Not Bad!";
  else title = "You Got There!";

  const points = Math.max(0, 200 - steps * 10);

  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMovie").textContent = `${startActor.name} → ${endActor.name}`;
  document.getElementById("popupSteps").textContent = steps;
  document.getElementById("popupTime").textContent = timeStr;
  document.getElementById("popupPoints").textContent = `${points} pts`;

  let c = "#2ecc71";
  if (steps >= 4 && steps <= 6) c = "#f39c12";
  else if (steps > 6) c = "#e74c3c";
  document.getElementById("popupSteps").style.backgroundColor = c;

  const ps = document.getElementById("popupPosterStart");
  const pe = document.getElementById("popupPosterEnd");
  if (_acFirstMovie && _acFirstMovie.poster_path) ps.src = IMG + _acFirstMovie.poster_path;
  if (_acLastMovie  && _acLastMovie.poster_path)  pe.src = IMG + _acLastMovie.poster_path;

  document.querySelector(".share-btn").style.display = dailyMode ? "inline-block" : "none";
  document.getElementById("popup").style.display = "block";
}

function shareActorResult() {
  const dateStr = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"});
  const stepsStr = document.getElementById("popupSteps").textContent;
  const timeStr = document.getElementById("popupTime").textContent;
  const pointsStr = document.getElementById("popupPoints").textContent;
  const text = `Actor.Link ${dateStr} | Steps: ${stepsStr} | Time: ${timeStr} | ${pointsStr}`;
  navigator.clipboard.writeText(text).then(()=>alert("Result copied to clipboard!"));
}

// ===== Start & Bootstrap =====
async function startGame() {
  const ov = document.getElementById("introOverlay");
  if (ov) ov.classList.remove("visible");
  if (dailyMode && !localStorage.getItem(LS_AC_STARTED)) {
    localStorage.setItem(LS_AC_STARTED, "true");
  }
  await initActors();
  stopTimer();
  if (dailyMode) startDailyTimer();
  else startInfiniteTimer();
  wireControls();
}
window.startGame = startGame;

(async function bootstrap() {
  const savedMode = localStorage.getItem(LS_MODE_KEY);
  dailyMode = savedMode !== "infinite";

  setCounter(steps);
  await initActors();

  if (dailyMode) {
    // Clear previous-day state BEFORE restoring any saved chain
    const todayKey = new Date().toDateString();
    const savedKey = localStorage.getItem(LS_AC_DAYKEY);
    if (savedKey !== todayKey) {
      localStorage.setItem(LS_AC_DAYKEY, todayKey);
      localStorage.removeItem(LS_AC_CHAIN_HTML);
      localStorage.removeItem(LS_AC_STEPS);
      localStorage.removeItem(LS_AC_START_TS);
      document.getElementById("chainList").innerHTML = "";
      steps = 0; setCounter(0);
      lastCastIds = null;
      ended = false;
      const p = document.getElementById("popup"); if (p) p.style.display = "none";
    }

    // Restore chain/steps if any (same-day only)
    const savedHTML  = localStorage.getItem(LS_AC_CHAIN_HTML);
    const savedSteps = localStorage.getItem(LS_AC_STEPS);
    if (savedHTML != null)  document.getElementById("chainList").innerHTML = savedHTML;
    if (savedSteps != null) { steps = parseInt(savedSteps, 10) || 0; setCounter(steps); }

    if (localStorage.getItem(LS_AC_STARTED) === "true") {
      const ov = document.getElementById("introOverlay");
      if (ov) ov.classList.remove("visible");
      if (!localStorage.getItem(LS_AC_START_TS)) {
        localStorage.setItem(LS_AC_START_TS, Date.now().toString());
      }
      startDailyTimer();
      wireControls();
    } else {
      document.getElementById("introOverlay").classList.add("visible");
    }
  } else {
    document.getElementById("introOverlay").classList.add("visible");
    // no daily-state clearing here (preserve original behaviour)
  }

  // Highlight active mode
  const dailyLink = document.getElementById("dailyLink");
  const infiniteLink = document.getElementById("infiniteLink");
  if (dailyMode && dailyLink) dailyLink.style.textDecoration = "underline";
  if (!dailyMode && infiniteLink) infiniteLink.style.textDecoration = "underline";

  if (dailyLink) dailyLink.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.setItem("mode", "daily");
    location.reload();
  });
  if (infiniteLink) infiniteLink.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.setItem("mode", "infinite");
    location.reload();
  });
})();
