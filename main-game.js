// ======================
// Link Movie (Main Game)
// ======================

let targetMovie;
let triesLeft = 6;
let seconds = 0;
let timerInterval;
let ended = false;

const els = {
  movieInput: document.getElementById("movieInput"),
  suggestions: document.getElementById("suggestions"),
  submitBtn: document.getElementById("submitBtn"),
  hintSkipBtn: document.getElementById("hintSkipBtn"),
  chainList: document.getElementById("chainList"),
  counterCircle: document.getElementById("counterCircle"),
  timer: document.getElementById("timer"),
  popup: document.getElementById("popup"),
  popupTitle: document.getElementById("popupTitle"),
  popupMsg: document.getElementById("popupMsg"),
};

function startGame() {
  ended = false;
  triesLeft = 6;
  seconds = 0;
  els.counterCircle.textContent = 0;
  els.timer.textContent = "00:00";
  els.movieInput.disabled = false;
  els.chainList.innerHTML = "";
  document.getElementById("introOverlay").classList.remove("visible");

  startTimer();
  loadTargetMovie();
}

function loadTargetMovie() {
  // Example: pick a movie for daily/infinite mode.
  // Replace with your own logic
  targetMovie = {
    title: "Inception",
    release_date: "2010-07-16",
    poster_path: "/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg",
  };

  document.getElementById("actor1").textContent = "Leonardo DiCaprio";
  document.getElementById("actor2").textContent = "Joseph Gordon-Levitt";
}

function startTimer() {
  timerInterval = setInterval(() => {
    seconds++;
    els.timer.textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ======================
// End Game & Popup
// ======================

function endGame(win) {
  if (ended) {
    return;
  }
  ended = true;
  stopTimer();
  els.movieInput.disabled = true;

  // Show enhanced popup
  showEndPopup(
    win,
    targetMovie.title,
    targetMovie.release_date ? targetMovie.release_date.slice(0, 4) : "—",
    6 - triesLeft,
    formatTime(seconds),
    win ? 100 : 0, // example scoring
    "https://image.tmdb.org/t/p/w200" + targetMovie.poster_path
  );

  saveDailyState();
}

function showEndPopup(win, title, year, tries, timeTaken, points, posterUrl) {
  document.getElementById("popupTitle").textContent = win
    ? "Nice"
    : "Better Luck Next Time!";
  document.getElementById("popupMovie").textContent = `${title} | ${year}`;
  document.getElementById("popupTries").textContent = tries;
  document.getElementById("popupTime").textContent = timeTaken;
  document.getElementById("popupPoints").textContent = `${points} pts`;
  document.getElementById("popupPoster").src = posterUrl;
  els.popup.style.display = "block";
}

function shareResult() {
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const tries = document.getElementById("popupTries").textContent;
  const time = document.getElementById("popupTime").textContent;
  const points = document.getElementById("popupPoints").textContent;

  const text = `Movie.Link ${dateStr} | Tries: ${tries} | Time: ${time} | ${points}`;
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  });
}

// ======================
// Popup control
// ======================

function closePopup() {
  els.popup.style.display = "none";
}

function openHelp() {
  document.getElementById("helpPopup").style.display = "block";
}

function closeHelp() {
  document.getElementById("helpPopup").style.display = "none";
}

// ======================
// Save/Load State (stub)
// ======================

function saveDailyState() {
  // stub for localStorage or backend save
}

// ======================
// Event Listeners
// ======================

els.submitBtn.addEventListener("click", () => {
  if (ended) return;
  // Example guess handler
  const guess = els.movieInput.value.trim();
  if (!guess) return;
  const li = document.createElement("li");
  li.textContent = guess;
  els.chainList.appendChild(li);
  els.counterCircle.textContent = 6 - triesLeft + 1;

  // For demo: mark win if guess == Inception
  if (guess.toLowerCase() === "inception") {
    endGame(true);
  } else {
    triesLeft--;
    if (triesLeft <= 0) {
      endGame(false);
    }
  }
});

els.hintSkipBtn.addEventListener("click", () => {
  if (ended) return;
  triesLeft--;
  const li = document.createElement("li");
  li.textContent = "Hint used / skipped";
  els.chainList.appendChild(li);
  if (triesLeft <= 0) {
    endGame(false);
  }
});
