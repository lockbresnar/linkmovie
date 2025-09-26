/* Actor Chain Game (Daily + Infinite, unified timer like Main Game) */

const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w300";

let startActor, endActor;
let started = false;
let ended = false;
let triesLeft = 6;
let seconds = 0;
let timerId = null;
let dailyMode = true;

const els = {
  overlay: document.getElementById("introOverlay"),
  actor1Img: document.getElementById("actor1Img"),
  actor2Img: document.getElementById("actor2Img"),
  actor1Name: document.getElementById("actor1"),
  actor2Name: document.getElementById("actor2"),
  movieInput: document.getElementById("movieInput"),
  submitBtn: document.querySelector(".btn-submit"),
  resetBtn: document.querySelector(".btn-red"),
  chainList: document.getElementById("chainList"),
  counter: document.getElementById("counterCircle"),
  timer: document.getElementById("timer"),
  popup: document.getElementById("popup"),
  popupTitle: document.getElementById("popupTitle"),
  popupMsg: document.getElementById("popupMsg"),
  status: document.getElementById("status"),
  dailyLink: document.getElementById("dailyLink"),
  infiniteLink: document.getElementById("infiniteLink"),
};

// ---------- Helpers ----------
function getTodaySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}
function formatTime(secTotal) {
  const m = Math.floor(secTotal / 60);
  const s = secTotal % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function updateCounter() {
  const used = 6 - triesLeft;
  els.counter.textContent = used;
  let color;
  if (used <= 2) color = "#2ecc71";
  else if (used <= 4) color = "#f39c12";
  else color = "#e74c3c";
  els.counter.style.backgroundColor = color;
}
function showPopup(title, msg) {
  els.popupTitle.textContent = title;
  els.popupMsg.innerHTML = msg;
  els.popup.style.display = "block";
}
window.closePopup = () => { els.popup.style.display = "none"; };
window.openHelp = () => { document.getElementById("helpPopup").style.display = "block"; };
window.closeHelp = () => { document.getElementById("helpPopup").style.display = "none"; };

// ---------- Timer ----------
function startTimer() {
  if (dailyMode) {
    if (!localStorage.getItem("dailyStart_AC")) {
      localStorage.setItem("dailyStart_AC", Date.now().toString());
    }
  } else {
    seconds = 0;
  }
  timerId = setInterval(updateTimer, 1000);
}
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}
function updateTimer() {
  if (dailyMode) {
    const start = parseInt(localStorage.getItem("dailyStart_AC"), 10);
    const now = Date.now();
    seconds = Math.floor((now - start) / 1000);
    els.timer.textContent = formatTime(seconds);
  } else {
    seconds++;
    els.timer.textContent = formatTime(seconds);
  }
}

// ---------- Init ----------
async function initRound() {
  // Pick 2 actors deterministically (daily) or random (infinite)
  const seed = getTodaySeed();
  if (dailyMode) {
    startActor = ACTORS[seed % ACTORS.length];
    endActor = ACTORS[(seed * 7) % ACTORS.length];
  } else {
    let shuffled = ACTORS.sort(() => 0.5 - Math.random()).slice(0, 2);
    startActor = shuffled[0];
    endActor = shuffled[1];
  }

  els.actor1Img.src = IMAGE_URL + startActor.profile_path;
  els.actor1Name.textContent = startActor.name;
  els.actor2Img.src = IMAGE_URL + endActor.profile_path;
  els.actor2Name.textContent = endActor.name;
}

// ---------- Game Flow ----------
function doStartGame() {
  if (started) return;
  started = true;
  els.overlay.classList.remove("visible");
  updateCounter();
  startTimer();
}

window.startGame = async function() {
  await initRound();
  doStartGame();
};

// ---------- Mode Switching ----------
els.dailyLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.setItem("mode_AC", "daily");
  dailyMode = true;
  location.reload();
});
els.infiniteLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.setItem("mode_AC", "infinite");
  dailyMode = false;
  location.reload();
});

// ---------- Bootstrap ----------
(async function bootstrap() {
  const savedMode = localStorage.getItem("mode_AC");
  if (savedMode === "infinite") dailyMode = false;

  updateCounter();
  els.timer.textContent = "00:00";
  await initRound();

  if (dailyMode) {
    if (localStorage.getItem("dailyStart_AC")) {
      els.overlay.classList.remove("visible");
      started = true;
      startTimer();
    } else {
      els.overlay.classList.add("visible");
    }
  }

  if (dailyMode) {
    els.dailyLink.style.textDecoration = "underline";
  } else {
    els.infiniteLink.style.textDecoration = "underline";
  }
})();
