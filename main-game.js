const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let targetMovie = null;
let allCast = [];           // full cast (we’ll take top-billed for hints)
let shownPair = [];         // the two actors we display at start
let hintPool = [];          // remaining actors available as unique hints
let revealedHintIds = new Set(); // track revealed hint actor ids

let tries = 0;
const MAX_TRIES = 6;

let timerInterval = null;
let startTime = null;
let gameOver = false;

/* ---------------- Timer ---------------- */
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const diff = Date.now() - startTime;
    const m = String(Math.floor(diff / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    document.getElementById("timer").textContent = `${m}:${s}`;
  }, 1000);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

/* --------------- Counter --------------- */
function setCounterColor() {
  const circle = document.getElementById("counterCircle");
  if (tries <= 2) circle.style.background = "#4edd00"; // green
  else if (tries <= 4) circle.style.background = "#fa8b48"; // orange
  else circle.style.background = "#e53935"; // red
}
function updateCounter() {
  document.getElementById("counterCircle").textContent = tries;
  setCounterColor();
}

/* ----------------- Setup ---------------- */
async function startGame() {
  // hide overlay and start timer
  document.getElementById("introOverlay").classList.remove("visible");
  startTimer();
  await setupGame();
}

async function setupGame() {
  gameOver = false;
  tries = 0;
  updateCounter();
  document.getElementById("chainList").innerHTML = "";

  // Choose an English-language film with good vote count
  const page = Math.floor(Math.random() * 10) + 1;
  const res = await fetch(
    `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&with_original_language=en&sort_by=vote_average.desc&vote_count.gte=1000&page=${page}`
  );
  const data = await res.json();
  targetMovie = data.results[Math.floor(Math.random() * data.results.length)];

  // Fetch credits and use top-billed for display + hints
  const credRes = await fetch(
    `https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`
  );
  const credits = await credRes.json();

  // Take top 8 for a better hint pool if available
  allCast = (credits.cast || []).slice(0, 8);

  // Pick two distinct actors to display
  if (allCast.length < 2) {
    // very rare; re-run setup
    return setupGame();
  }
  const i1 = Math.floor(Math.random() * allCast.length);
  let i2 = Math.floor(Math.random() * allCast.length);
  while (i2 === i1) i2 = Math.floor(Math.random() * allCast.length);

  shownPair = [allCast[i1], allCast[i2]];
  // Hint pool = remaining top-billed excluding the two shown
  hintPool = allCast.filter(a => a.id !== shownPair[0].id && a.id !== shownPair[1].id);
  revealedHintIds = new Set();

  // Display the two actors
  displayActor(shownPair[0], "actor1Img", "actor1");
  displayActor(shownPair[1], "actor2Img", "actor2");
}

function displayActor(actor, imgId, nameId) {
  document.getElementById(imgId).src = actor.profile_path
    ? `${IMAGE_URL}${actor.profile_path}`
    : "assets/placeholder.png";
  document.getElementById(nameId).textContent = actor.name;
}

/* ------------- Autocomplete ------------- */
document.getElementById("movieInput").addEventListener("input", async (e) => {
  const q = e.target.value.trim();
  const container = document.getElementById("suggestions");
  container.innerHTML = "";
  if (q.length <= 2) return;

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`
  );
  const data = await res.json();
  (data.results || []).slice(0, 5).forEach((m) => {
    const div = document.createElement("div");
    div.textContent = m.title;
    div.onclick = () => {
      document.getElementById("movieInput").value = m.title;
      container.innerHTML = "";
    };
    container.appendChild(div);
  });
});

/* -------------- Try Helpers -------------- */
function consumeTry() {
  tries += 1;
  updateCounter();
  if (tries >= MAX_TRIES && !gameOver) {
    // out of tries => lose
    stopTimer();
    gameOver = true;
    showPopup("Out of tries!", `The film was: ${targetMovie.title}`);
    disableInputs();
    return true; // consumed final try
  }
  return false;
}
function disableInputs() {
  document.getElementById("movieInput").disabled = true;
  document.querySelector(".btn-submit").disabled = true;
  document.querySelector(".btn-red").disabled = true;
}

/* --------------- Hints ---------------- */
function revealUniqueHint(labelPrefix = "Hint") {
  // find first unrevealed actor in hintPool
  const remaining = hintPool.filter(a => !revealedHintIds.has(a.id));
  if (remaining.length === 0) {
    addToChain("No more hints", "grey");
    return;
  }
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  revealedHintIds.add(pick.id);
  addToChain(`${labelPrefix}: ${pick.name}`, "orange");
}

/* -------------- Submit Guess ------------- */
async function submitGuess() {
  if (gameOver) return;
  const guess = document.getElementById("movieInput").value.trim();
  if (!guess) return;

  document.getElementById("movieInput").value = "";
  document.getElementById("suggestions").innerHTML = "";

  // consume a try (all guesses use a try)
  if (consumeTry()) return;

  // check guess
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(guess)}`
  );
  const data = await res.json();
  const hit = (data.results || []).find(m => m.id === targetMovie.id || (m.title || "").toLowerCase() === targetMovie.title.toLowerCase());

  if (hit) {
    addToChain(targetMovie.title, "green");
    stopTimer();
    gameOver = true;
    showPopup("🎉 Correct!", `You found "${targetMovie.title}" in ${tries} tries and ${document.getElementById("timer").textContent}.`);
    disableInputs();
  } else {
    // wrong answer acts like a skip -> add a unique hint
    addToChain(guess, "grey");
    revealUniqueHint("Hint");
  }
}

/* ----------------- Skip ------------------ */
function skipTurn() {
  if (gameOver) return;
  // consume a try
  if (consumeTry()) return;
  // reveal a unique hint
  revealUniqueHint("Hint");
}

/* ------------ Chain rendering ------------ */
function addToChain(text, colorClass) {
  const li = document.createElement("li");
  li.textContent = text;
  li.className = colorClass;
  document.getElementById("chainList").appendChild(li);
}

/* ---------------- Popup ------------------ */
function showPopup(title, msg) {
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMsg").textContent = msg;
  document.getElementById("popup").style.display = "flex";
}
function closePopup() {
  document.getElementById("popup").style.display = "none";
}

/* -------------- Start flow -------------- */
window.addEventListener("load", () => {
  // Overlay is visible initially; when Start pressed, startGame() runs
});
