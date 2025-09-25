let maxTries = 6;
let triesLeft = maxTries;
let timer = 0;
let timerInterval;
let gameOver = false;

// Example target movie (replace with TMDb logic)
const targetMovie = {
  title: "Inception",
  hints: [
    "Released in 2010",
    "Directed by Christopher Nolan",
    "Stars Leonardo DiCaprio",
  ],
};

let usedHints = [];

const startOverlay = document.getElementById("start-overlay");
const startBtn = document.getElementById("start-btn");
const guessInput = document.getElementById("guess-input");
const submitBtn = document.getElementById("submit-btn");
const skipBtn = document.getElementById("skip-btn");
const hintBtn = document.getElementById("hint-btn");
const triesDisplay = document.getElementById("tries-left");
const timerDisplay = document.getElementById("timer");
const chain = document.getElementById("chain");
const resultPopup = document.getElementById("result-popup");
const popupContent = document.getElementById("popup-content");

function startGame() {
  startOverlay.classList.add("hidden");
  timer = 0;
  timerInterval = setInterval(() => {
    timer++;
    timerDisplay.textContent = timer;
  }, 1000);
}

function endGame(win) {
  gameOver = true;
  clearInterval(timerInterval);
  guessInput.disabled = true;
  submitBtn.disabled = true;
  skipBtn.disabled = true;
  hintBtn.disabled = true;

  let content = "";
  if (win) {
    content = `<h2>You linked to <strong>${targetMovie.title}</strong>!</h2>
               <p>Tries used: ${maxTries - triesLeft}</p>
               <p>Time: ${timer}s</p>
               <button onclick="location.reload()">Play Again</button>`;
  } else {
    content = `<h2>Out of tries!</h2>
               <p>The correct movie was <strong>${targetMovie.title}</strong>.</p>
               <button onclick="location.reload()">Try Again</button>`;
  }
  popupContent.innerHTML = content;
  resultPopup.classList.remove("hidden");
}

function useTry() {
  triesLeft--;
  triesDisplay.textContent = triesLeft;
  if (triesLeft <= 0 && !gameOver) {
    endGame(false);
  }
}

function addToChain(text, type = "") {
  const item = document.createElement("div");
  item.classList.add("chain-item");
  if (type) item.classList.add(type);
  item.textContent = text;
  chain.appendChild(item);
}

submitBtn.addEventListener("click", () => {
  if (gameOver) return;
  const guess = guessInput.value.trim();
  if (!guess) return;

  if (guess.toLowerCase() === targetMovie.title.toLowerCase()) {
    addToChain(guess, "correct");
    endGame(true);
  } else {
    addToChain(guess);
    useTry();
  }
  guessInput.value = "";
});

skipBtn.addEventListener("click", () => {
  if (gameOver) return;
  addToChain("Skipped");
  useTry();
});

hintBtn.addEventListener("click", () => {
  if (gameOver) return;
  const available = targetMovie.hints.filter(h => !usedHints.includes(h));
  if (available.length === 0) return;
  const hint = available[Math.floor(Math.random() * available.length)];
  usedHints.push(hint);
  addToChain(hint, "hint");
  useTry();
});

startBtn.addEventListener("click", startGame);
