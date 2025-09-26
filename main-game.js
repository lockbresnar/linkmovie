/* Movie Link Game Logic (Daily + Infinite, global actors, persistent timer, no overlay repeat) */

const API_KEY = "455bd5e0331130bf58534b98e8c2b901"; 
const IMAGE_URL = "https://image.tmdb.org/t/p/w300";

let startActor, endActor, targetMovie;
let triesLeft = 6;
let usedHints = new Set();
let hintsPool = [];
let started = false;
let ended = false;
let seconds = 0;
let timerId = null;
let topEnglishMovies = []; 
let lastPopupTitle = "";
let lastPopupMsg = "";
let dailyMode = true;

// Elements
const els = {
  overlay: document.getElementById("introOverlay"),
  actor1Img: document.getElementById("actor1Img"),
  actor2Img: document.getElementById("actor2Img"),
  actor1Name: document.getElementById("actor1"),
  actor2Name: document.getElementById("actor2"),
  movieInput: document.getElementById("movieInput"),
  submitBtn: document.getElementById("submitBtn"),
  hintSkipBtn: document.getElementById("hintSkipBtn"),
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
  return today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate();
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
function formatTime(secTotal) {
  const m = Math.floor(secTotal / 60);
  const s = secTotal % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
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
    if (!localStorage.getItem("dailyStart")) {
      localStorage.setItem("dailyStart", Date.now().toString());
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
    const start = parseInt(localStorage.getItem("dailyStart"), 10);
    const now = Date.now();
    seconds = Math.floor((now - start) / 1000);
    els.timer.textContent = formatTime(seconds);
  } else {
    seconds++;
    els.timer.textContent = formatTime(seconds);
  }
}

// ---------- State save/load (Daily only) ----------
function saveDailyState() {
  if (!dailyMode) return;
  const state = {
    triesLeft,
    ended,
    started,
    chain: els.chainList.innerHTML,
    usedHints: Array.from(usedHints),
    lastPopupTitle,
    lastPopupMsg,
    targetMovieId: targetMovie?.id || null
  };
  localStorage.setItem("dailyState", JSON.stringify(state));
}
async function restoreDailyState() {
  const savedState = JSON.parse(localStorage.getItem("dailyState") || "null");
  if (!savedState) return;
  triesLeft = savedState.triesLeft;
  ended = savedState.ended;
  started = savedState.started;
  els.chainList.innerHTML = savedState.chain;
  usedHints = new Set(savedState.usedHints);
  lastPopupTitle = savedState.lastPopupTitle;
  lastPopupMsg = savedState.lastPopupMsg;

  if (ended && lastPopupTitle) {
    showPopup(lastPopupTitle, lastPopupMsg);
  }
}

// ---------- Load Top 250 English Films ----------
async function loadTopEnglishFilms() {
  let movies = [];
  let totalPages = 13;
  for (let page = 1; page <= totalPages; page++) {
    let res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}` +
      `&with_original_language=en&sort_by=vote_average.desc&vote_count.gte=1000&page=${page}`
    );
    let data = await res.json();
    movies = movies.concat(data.results);
  }
  return movies.slice(0, 250); 
}

// ---------- Select Movie ----------
async function selectMovie() {
  let movies = await loadTopEnglishFilms();
  if (dailyMode) {
    const seed = getTodaySeed();
    const index = seed % movies.length;
    return movies[index];
  } else {
    return movies[Math.floor(Math.random() * movies.length)];
  }
}

// ---------- Load Actors ----------
async function initRound() {
  try {
    if (!topEnglishMovies.length) {
      topEnglishMovies = await loadTopEnglishFilms();
    }
    targetMovie = await selectMovie();

    let creditsRes = await fetch(`https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`);
    let credits = await creditsRes.json();
    let actorsWithPhotos = credits.cast.filter(c => c.profile_path).slice(0, 5);
    if (actorsWithPhotos.length < 2) {
      els.status.textContent = "Could not load actors. Refresh to try again.";
      return;
    }

    if (dailyMode) {
      // Deterministic actor selection (global consistency)
      const seed = getTodaySeed();
      const idx1 = seed % actorsWithPhotos.length;
      const idx2 = Math.floor(seed / 10) % actorsWithPhotos.length;
      startActor = actorsWithPhotos[idx1];
      endActor = actorsWithPhotos[idx2 === idx1 ? (idx2 + 1) % actorsWithPhotos.length : idx2];
    } else {
      // Infinite = random
      let shuffled = actorsWithPhotos.sort(() => 0.5 - Math.random()).slice(0, 2);
      startActor = shuffled[0];
      endActor = shuffled[1];
    }

    els.actor1Img.src = IMAGE_URL + startActor.profile_path;
    els.actor1Name.textContent = startActor.name;
    els.actor2Img.src = IMAGE_URL + endActor.profile_path;
    els.actor2Name.textContent = endActor.name;

    await buildHints(targetMovie.id, [startActor.id, endActor.id]);
  } catch (err) {
    console.error("initRound failed:", err);
    els.status.textContent = "Error loading game. Please refresh.";
  }
}

async function buildHints(movieId, excludedActorIds) {
  try {
    const [details, credits] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`).then(r=>r.json()),
      fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`).then(r=>r.json())
    ]);
    const hints = [];
    if (details.release_date) hints.push(`Released in ${details.release_date.slice(0,4)}`);
    if (details.genres?.length) hints.push(`Genre: ${details.genres.map(g=>g.name).slice(0,2).join(", ")}`);
    if (details.runtime) hints.push(`Runtime ≈ ${details.runtime} min`);
    if (details.tagline) hints.push(`Tagline: “${details.tagline}”`);
    const director = (credits.crew||[]).find(c=>c.job==="Director");
    if (director) hints.push(`Directed by ${director.name}`);
    const castNames = (credits.cast||[])
      .filter(c => !excludedActorIds.includes(c.id))
      .slice(0,3).map(c=>c.name);
    if (castNames.length) hints.push(`Also stars: ${castNames.join(", ")}`);
    hintsPool = [...new Set(hints)].slice(0, 8);
  } catch (err) {
    console.error("buildHints failed:", err);
    hintsPool = [];
  }
}

// ---------- Game flow ----------
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
  els.movieInput.disabled = true;
  els.submitBtn.disabled = false; 
  els.hintSkipBtn.disabled = false; 
  if (win) {
    lastPopupTitle = "You got it! 🎉";
    lastPopupMsg = `The movie was <strong>${targetMovie.title}</strong>. You solved it in <strong>${6 - triesLeft}</strong> tries and <strong>${formatTime(seconds)}</strong>.`;
  } else {
    lastPopupTitle = "Out of tries!";
    lastPopupMsg = `The correct movie was <strong>${targetMovie.title}</strong>.`;
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

// ---------- Events ----------
els.submitBtn.addEventListener("click", () => {
  if (ended) { showPopup(lastPopupTitle, lastPopupMsg); return; }
  if (!started) return;
  const guess = (els.movieInput.value || "").trim();
  if (!guess) return;
  if (guess.toLowerCase() === targetMovie.title.toLowerCase()) {
    addListItem(guess, "green");
    endGame(true);
  } else {
    addListItem(guess, "grey");
    consumeTry();
  }
  els.movieInput.value = "";
  saveDailyState();
});
els.hintSkipBtn.addEventListener("click", () => {
  if (ended) { showPopup(lastPopupTitle, lastPopupMsg); return; }
  if (!started) return;
  const remaining = hintsPool.filter(h => !usedHints.has(h));
  if (remaining.length) {
    const hint = remaining[Math.floor(Math.random()*remaining.length)];
    usedHints.add(hint);
    addListItem(hint, "orange");
  } else {
    addListItem("Skipped", "grey");
  }
  consumeTry();
  saveDailyState();
});
els.movieInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.submitBtn.click();
});

// ---------- Mode Switching ----------
els.dailyLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.setItem("mode", "daily");
  dailyMode = true;
  location.reload();
});
els.infiniteLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.setItem("mode", "infinite");
  dailyMode = false;
  location.reload();
});

// ---------- Init ----------
window.startGame = async function() {
  if (!targetMovie) {
    await initRound();
  }
  doStartGame();
  saveDailyState();
};

(async function bootstrap() {
  const savedMode = localStorage.getItem("mode");
  if (savedMode === "infinite") dailyMode = false;

  updateCounter();
  els.timer.textContent = "00:00";
  await initRound();

  if (dailyMode) {
    await restoreDailyState();

    const savedState = JSON.parse(localStorage.getItem("dailyState") || "null");
    if (savedState && savedState.started) {
      // Already started → skip overlay
      els.overlay.classList.remove("visible");
      started = true;
      if (!ended) startTimer();
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
