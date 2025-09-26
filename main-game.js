// =======================================================
// Main Game (Movie Link)
// =======================================================

const API_KEY = "455bd5e0331130bf58534b98e8c2b901";

const els = {
  movieInput: document.getElementById("movieInput"),
  submitBtn: document.getElementById("submitBtn"),
  hintSkipBtn: document.getElementById("hintSkipBtn"),
  chainList: document.getElementById("chainList"),
  status: document.getElementById("status"),
  counterCircle: document.getElementById("counterCircle"),
  timer: document.getElementById("timer"),
};

let tries = 0;
let maxTries = 6;
let targetMovie = null;
let timerInterval = null;
let startTime = null;
let gameOver = false;

// =======================================================
// GAME INITIALIZATION
// =======================================================
async function initGame() {
  tries = 0;
  gameOver = false;
  els.chainList.innerHTML = "";
  els.status.textContent = "";
  els.counterCircle.textContent = "0";
  els.counterCircle.style.background = "#4edd00";

  // Pick a random movie (you can replace with Daily logic if needed)
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`
  );
  const data = await res.json();
  targetMovie = data.results[Math.floor(Math.random() * data.results.length)];

  // Reset timer
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

window.startGame = function () {
  const ov = document.getElementById("introOverlay");
  if (ov) ov.classList.remove("visible");
  initGame();
};

// =======================================================
// TIMER
// =======================================================
function updateTimer() {
  if (gameOver) return;
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  els.timer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(
    2,
    "0"
  )}`;
}

// =======================================================
// GAMEPLAY
// =======================================================
async function handleGuess() {
  if (gameOver) return;

  const guess = els.movieInput.value.trim();
  if (!guess) return;

  tries++;
  els.counterCircle.textContent = tries;
  if (tries < 4) els.counterCircle.style.background = "#4edd00";
  else if (tries < 6) els.counterCircle.style.background = "#fa8b48";
  else els.counterCircle.style.background = "#e53935";

  const li = document.createElement("li");
  li.textContent = guess;

  if (
    guess.toLowerCase() === targetMovie.title.toLowerCase() &&
    tries <= maxTries
  ) {
    li.className = "green";
    els.chainList.appendChild(li);
    winGame();
    return;
  }

  li.className = "orange";
  els.chainList.appendChild(li);

  if (tries >= maxTries) {
    loseGame();
  }

  els.movieInput.value = "";
  document.getElementById("suggestions").innerHTML = "";
}

function winGame() {
  gameOver = true;
  if (timerInterval) clearInterval(timerInterval);
  showPopup(
    "🎉 You Win!",
    `Correct Movie: ${targetMovie.title}<br/>Tries: ${tries}<br/>Time: ${els.timer.textContent}`
  );
}

function loseGame() {
  gameOver = true;
  if (timerInterval) clearInterval(timerInterval);
  showPopup(
    "Game Over",
    `The correct movie was: ${targetMovie.title}<br/>Better luck next time!`
  );
}

function showPopup(title, msg) {
  const p = document.getElementById("popup");
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMsg").innerHTML = msg;
  p.style.display = "block";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}
window.closePopup = closePopup;

function openHelp() {
  document.getElementById("helpPopup").style.display = "block";
}
function closeHelp() {
  document.getElementById("helpPopup").style.display = "none";
}
window.openHelp = openHelp;
window.closeHelp = closeHelp;

// =======================================================
// EVENT LISTENERS
// =======================================================
els.submitBtn.addEventListener("click", handleGuess);
els.hintSkipBtn.addEventListener("click", handleGuess);

// =======================================================
// AUTOCOMPLETE
// =======================================================
const suggestionsBox = document.getElementById("suggestions");

els.movieInput.addEventListener("input", async () => {
  const query = els.movieInput.value.trim();
  suggestionsBox.innerHTML = "";
  if (!query) return;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
        query
      )}`
    );
    const data = await res.json();

    data.results.slice(0, 5).forEach((movie) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = movie.title;
      div.addEventListener("click", () => {
        els.movieInput.value = movie.title;
        suggestionsBox.innerHTML = "";
      });
      suggestionsBox.appendChild(div);
    });
  } catch (err) {
    console.error("Autocomplete failed:", err);
  }
});

// Clear suggestions when input loses focus
els.movieInput.addEventListener("blur", () => {
  setTimeout(() => {
    suggestionsBox.innerHTML = "";
  }, 200);
});
