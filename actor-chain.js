/* Actor Chain — Daily/Infinite modes with persistent Daily timer */

const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let startActor = null;
let endActor = null;
let steps = 0;
let timerInterval = null;
let lastCastIds = null;
let dailyMode = true;
let ended = false;

const LS_MODE_KEY       = "mode";
const LS_AC_STARTED     = "ac_started";
const LS_AC_START_TS    = "ac_dailyStart";
const LS_AC_CHAIN_HTML  = "ac_chain_html";
const LS_AC_STEPS       = "ac_steps";

/* ---------------- Timer ---------------- */
function startTimer() {
  if (dailyMode) {
    if (!localStorage.getItem(LS_AC_START_TS)) {
      localStorage.setItem(LS_AC_START_TS, Date.now().toString());
    }
  }
  timerInterval = setInterval(updateTimer, 1000);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}
function updateTimer() {
  let seconds;
  if (dailyMode) {
    const start = parseInt(localStorage.getItem(LS_AC_START_TS), 10);
    const now = Date.now();
    seconds = Math.floor((now - start) / 1000);
  } else {
    seconds = parseInt(document.getElementById("timer").dataset.s || "0", 10) + 1;
    document.getElementById("timer").dataset.s = seconds;
  }
  document.getElementById("timer").textContent = formatTime(seconds);
}
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

/* ---------------- Game Flow ---------------- */
async function startGame() {
  if (startActor) return;
  steps = 0;
  ended = false;
  document.getElementById("chainList").innerHTML = "";
  document.getElementById("counterCircle").textContent = steps;
  document.getElementById("introOverlay").classList.remove("visible");
  await initActors();
  startTimer();
  saveDailyState();
}
async function initActors() {
  const res = await fetch(`https://api.themoviedb.org/3/person/popular?api_key=${API_KEY}&page=1`);
  const data = await res.json();
  const picks = data.results.filter(a => a.profile_path).slice(0, 10);
  startActor = picks[Math.floor(Math.random() * picks.length)];
  endActor = picks[Math.floor(Math.random() * picks.length)];
  if (startActor.id === endActor.id) {
    return initActors();
  }
  document.getElementById("actor1Img").src = IMAGE_URL + startActor.profile_path;
  document.getElementById("actor1").textContent = startActor.name;
  document.getElementById("actor2Img").src = IMAGE_URL + endActor.profile_path;
  document.getElementById("actor2").textContent = endActor.name;
}

/* ---------------- Guess Handling ---------------- */
document.querySelector(".btn-submit").addEventListener("click", submitGuess);
document.querySelector(".btn-red").addEventListener("click", resetGame);
document.getElementById("movieInput").addEventListener("keydown", (e)=>{
  if (e.key==="Enter") submitGuess();
});

async function submitGuess() {
  if (ended) return; // game already finished
  const input = document.getElementById("movieInput").value.trim();
  if (!input) return;

  // Validate guess
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(input)}`);
  const data = await res.json();
  if (!data.results.length) {
    document.getElementById("status").textContent = "Movie not found.";
    return;
  }
  const movie = data.results[0];
  const credits = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`).then(r=>r.json());

  steps++;
  document.getElementById("counterCircle").textContent = steps;
  const li = document.createElement("li");
  li.textContent = movie.title;
  li.classList.add("blue");
  document.getElementById("chainList").appendChild(li);

  // Check if movie contains target actor
  const castIds = credits.cast.map(c => c.id);
  lastCastIds = castIds;
  if (castIds.includes(endActor.id)) {
    endGame();
  }
  document.getElementById("movieInput").value = "";
  saveDailyState();
}

function resetGame() {
  localStorage.removeItem(LS_AC_CHAIN_HTML);
  localStorage.removeItem(LS_AC_STEPS);
  location.reload();
}

/* ---------------- End Game Popup ---------------- */
function endGame() {
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

  let c = "#2ecc71";
  if (steps >= 4 && steps <= 6) c = "#f39c12";
  else if (steps > 6) c = "#e74c3c";
  document.getElementById("popupSteps").style.backgroundColor = c;

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

function closePopup() {
  document.getElementById("popup").style.display = "none";
}
function openHelp() {
  document.getElementById("helpPopup").style.display = "block";
}
function closeHelp() {
  document.getElementById("helpPopup").style.display = "none";
}

/* ---------------- State Save/Restore ---------------- */
function saveDailyState() {
  if (!dailyMode) return;
  const state = {
    steps,
    chain: document.getElementById("chainList").innerHTML,
    started: true
  };
  localStorage.setItem("actorDailyState", JSON.stringify(state));
}
function restoreDailyState() {
  const saved = JSON.parse(localStorage.getItem("actorDailyState")||"null");
  if (!saved) return;
  steps = saved.steps;
  document.getElementById("chainList").innerHTML = saved.chain;
  document.getElementById("counterCircle").textContent = steps;
}

/* ---------------- Mode Switching ---------------- */
document.getElementById("dailyLink").addEventListener("click",(e)=>{
  e.preventDefault();
  localStorage.setItem(LS_MODE_KEY,"daily");
  dailyMode = true;
  location.reload();
});
document.getElementById("infiniteLink").addEventListener("click",(e)=>{
  e.preventDefault();
  localStorage.setItem(LS_MODE_KEY,"infinite");
  dailyMode = false;
  location.reload();
});

/* ---------------- Bootstrap ---------------- */
(function bootstrap(){
  const savedMode = localStorage.getItem(LS_MODE_KEY);
  if (savedMode==="infinite") dailyMode = false;

  if (dailyMode) restoreDailyState();

  if (dailyMode) {
    document.getElementById("dailyLink").style.textDecoration="underline";
  } else {
    document.getElementById("infiniteLink").style.textDecoration="underline";
  }
})();
