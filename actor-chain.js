/* Actor Chain with Daily + Infinite modes and persistent timer
   Uses ACTOR_POOL from actors.js (with autocomplete intact)
*/

let startActor, endActor;
let triesLeft = 6;
let started = false;
let ended = false;
let seconds = 0;
let timerId = null;
let dailyMode = true;
let lastPopupTitle = "";
let lastPopupMsg = "";

const els = {
  overlay: document.getElementById("introOverlay"),
  actor1Img: document.getElementById("actor1Img"),
  actor2Img: document.getElementById("actor2Img"),
  actor1Name: document.getElementById("actor1"),
  actor2Name: document.getElementById("actor2"),
  actorInput: document.getElementById("actorInput"),
  submitBtn: document.getElementById("submitBtn"),
  skipBtn: document.getElementById("skipBtn"),
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

// Helpers
function getTodaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function seededRandom(seed, max) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}
function addListItem(text, color) {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add(color);
  els.chainList.appendChild(li);
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
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function showPopup(title, msg) {
  els.popupTitle.textContent = title;
  els.popupMsg.innerHTML = msg;
  els.popup.style.display = "block";
}
window.closePopup = () => { els.popup.style.display = "none"; };
window.openHelp = () => { document.getElementById("helpPopup").style.display = "block"; };
window.closeHelp = () => { document.getElementById("helpPopup").style.display = "none"; };

// Timer
function startTimer() {
  if (dailyMode) {
    if (!localStorage.getItem("actorDailyStart")) {
      localStorage.setItem("actorDailyStart", Date.now().toString());
    }
  }
  timerId = setInterval(updateTimer, 1000);
}
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}
function updateTimer() {
  if (dailyMode) {
    const start = parseInt(localStorage.getItem("actorDailyStart"), 10);
    const now = Date.now();
    seconds = Math.floor((now - start) / 1000);
    els.timer.textContent = formatTime(seconds);
  } else {
    seconds++;
    els.timer.textContent = formatTime(seconds);
  }
}

// State
function saveDailyState() {
  if (!dailyMode) return;
  const state = {
    triesLeft,
    ended,
    started,
    chain: els.chainList.innerHTML,
    lastPopupTitle,
    lastPopupMsg,
    startActor,
    endActor
  };
  localStorage.setItem("actorDailyState", JSON.stringify(state));
}
function restoreDailyState() {
  const saved = JSON.parse(localStorage.getItem("actorDailyState") || "null");
  if (!saved) return;
  triesLeft = saved.triesLeft;
  ended = saved.ended;
  started = saved.started;
  els.chainList.innerHTML = saved.chain;
  lastPopupTitle = saved.lastPopupTitle;
  lastPopupMsg = saved.lastPopupMsg;
  if (ended && lastPopupTitle) {
    showPopup(lastPopupTitle, lastPopupMsg);
  }
}

// Game logic
function initRound() {
  if (dailyMode) {
    const seed = getTodaySeed();
    startActor = ACTOR_POOL[seededRandom(seed, ACTOR_POOL.length)];
    endActor = ACTOR_POOL[seededRandom(seed + 1, ACTOR_POOL.length)];
  } else {
    const shuffled = ACTOR_POOL.sort(() => 0.5 - Math.random()).slice(0, 2);
    startActor = shuffled[0];
    endActor = shuffled[1];
  }

  els.actor1Img.src = startActor.img;
  els.actor1Name.textContent = startActor.name;
  els.actor2Img.src = endActor.img;
  els.actor2Name.textContent = endActor.name;
}

function doStartGame() {
  if (started) return;
  started = true;
  els.overlay.classList.remove("visible");
  updateCounter();
  startTimer();
}
function endGame(win) {
  if (ended) {
    showPopup(lastPopupTitle, lastPopupMsg);
    return;
  }
  ended = true;
  stopTimer();
  els.actorInput.disabled = true;
  els.submitBtn.disabled = false;
  els.skipBtn.disabled = false;
  if (win) {
    lastPopupTitle = "You got it! 🎉";
    lastPopupMsg = `You solved it in <strong>${6 - triesLeft}</strong> tries and <strong>${formatTime(seconds)}</strong>.`;
  } else {
    lastPopupTitle = "Out of tries!";
    lastPopupMsg = `Better luck tomorrow.`;
  }
  showPopup(lastPopupTitle, lastPopupMsg);
  saveDailyState();
}
function consumeTry() {
  triesLeft--;
  updateCounter();
  saveDailyState();
  if (triesLeft <= 0) endGame(false);
}

// Events
els.submitBtn.addEventListener("click", () => {
  if (ended) { showPopup(lastPopupTitle, lastPopupMsg); return; }
  if (!started) return;
  const guess = (els.actorInput.value || "").trim();
  if (!guess) return;
  if (guess.toLowerCase() === endActor.name.toLowerCase()) {
    addListItem(guess, "green");
    endGame(true);
  } else {
    addListItem(guess, "grey");
    consumeTry();
  }
  els.actorInput.value = "";
  saveDailyState();
});
els.skipBtn.addEventListener("click", () => {
  if (ended) { showPopup(lastPopupTitle, lastPopupMsg); return; }
  if (!started) return;
  addListItem("Skipped", "grey");
  consumeTry();
  saveDailyState();
});
els.actorInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.submitBtn.click();
});

// Mode switching
els.dailyLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.setItem("actorMode", "daily");
  dailyMode = true;
  location.reload();
});
els.infiniteLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.setItem("actorMode", "infinite");
  dailyMode = false;
  location.reload();
});

// Init
window.startGame = function() {
  if (!startActor) {
    initRound();
  }
  doStartGame();
  saveDailyState();
};

(function bootstrap() {
  const savedMode = localStorage.getItem("actorMode");
  if (savedMode === "infinite") dailyMode = false;

  updateCounter();
  els.timer.textContent = "00:00";
  initRound();

  if (dailyMode) {
    restoreDailyState();
    const savedState = JSON.parse(localStorage.getItem("actorDailyState") || "null");
    if (savedState && savedState.started) {
      els.overlay.classList.remove("visible");
      started = true;
      if (!ended) startTimer();
    }
  }

  if (dailyMode) els.dailyLink.style.textDecoration = "underline";
  else els.infiniteLink.style.textDecoration = "underline";
})();
