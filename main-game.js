/* Movie Link Game Logic */

const API_KEY = "455bd5e0331130bf58534b98e8c2b901"; // ✅ Your TMDb key
const IMG_BASE = "https://image.tmdb.org/t/p/w300";

const els = {
  overlay: document.getElementById("introOverlay"),
  movieInput: document.getElementById("movieInput"),
  submitBtn: document.getElementById("submitBtn"),
  skipBtn: document.getElementById("skipBtn"),
  hintBtn: document.getElementById("hintBtn"),
  chainList: document.getElementById("chainList"),
  counter: document.getElementById("counterCircle"),
  timer: document.getElementById("timer"),
  actor1Img: document.getElementById("actor1Img"),
  actor2Img: document.getElementById("actor2Img"),
  actor1Name: document.getElementById("actor1"),
  actor2Name: document.getElementById("actor2"),
  popup: document.getElementById("popup"),
  popupTitle: document.getElementById("popupTitle"),
  popupMsg: document.getElementById("popupMsg"),
  status: document.getElementById("status"),
};

let game = {
  maxTries: 6,
  triesLeft: 6,
  started: false,
  ended: false,
  sec: 0,
  timerId: null,
  actor1: null,
  actor2: null,
  answerMovie: null,
  usedHints: new Set(),
  hintsPool: [],
};

// ---------- Helpers ----------
function addListItem(text, colorClass) {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add(colorClass);
  els.chainList.appendChild(li);
}

function updateCounter() {
  const used = game.maxTries - game.triesLeft;
  els.counter.textContent = used;
}

function formatTime(secTotal) {
  const m = Math.floor(secTotal / 60);
  const s = secTotal % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function startTimer() {
  game.timerId = setInterval(() => {
    game.sec += 1;
    els.timer.textContent = formatTime(game.sec);
  }, 1000);
}

function stopTimer() {
  if (game.timerId) clearInterval(game.timerId);
  game.timerId = null;
}

// ---------- Popups ----------
window.openHelp = function openHelp() {
  document.getElementById("helpPopup").style.display = "block";
};
window.closeHelp = function closeHelp() {
  document.getElementById("helpPopup").style.display = "none";
};
function showPopup(title, msg) {
  els.popupTitle.textContent = title;
  els.popupMsg.innerHTML = msg;
  els.popup.style.display = "block";
}
window.closePopup = function closePopup() {
  els.popup.style.display = "none";
};

// ---------- Actor setup ----------
function randomOf(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function pickActorsFromGlobals() {
  const candidates = [
    window.ACTOR_PAIRS, window.actorPairs, window.PAIRS,
    window.ACTORS, window.actors, window.actorList
  ].filter(a => Array.isArray(a) && a.length);

  if (candidates.length) {
    const src = randomOf(candidates);
    const item = randomOf(src);
    if (item && item.a && item.b) return [item.a, item.b];
    if (item && (item.id || item.tmdb_id || item.personId)) {
      const pool = src;
      let a = randomOf(pool), b = randomOf(pool);
      while (b === a && pool.length > 1) b = randomOf(pool);
      return [a, b];
    }
  }

  // fallback pair
  return [
    { id: 6193, name: "Leonardo DiCaprio", profile_path: "/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg" },
    { id: 24045, name: "Joseph Gordon-Levitt", profile_path: "/4U9G4YwTlIEbBvQe5o6mXSHtYvC.jpg" },
  ];
}

function normalizeActor(o) {
  return {
    id: o.id || o.tmdb_id || o.personId,
    name: o.name || o.title || "Unknown",
    profile_path: o.profile_path || o.profile || o.img || null,
  };
}

function renderActors(a1, a2) {
  els.actor1Name.textContent = a1.name;
  els.actor2Name.textContent = a2.name;
  els.actor1Img.src = a1.profile_path ? (IMG_BASE + a1.profile_path) : "assets/avatar.svg";
  els.actor2Img.src = a2.profile_path ? (IMG_BASE + a2.profile_path) : "assets/avatar.svg";
  els.actor1Img.alt = a1.name;
  els.actor2Img.alt = a2.name;
}

// ---------- TMDb data ----------
async function tmdbJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb error ${res.status}`);
  return res.json();
}

async function findCommonMovie(actorId1, actorId2) {
  const [c1, c2] = await Promise.all([
    tmdbJson(`https://api.themoviedb.org/3/person/${actorId1}/movie_credits?api_key=${API_KEY}`),
    tmdbJson(`https://api.themoviedb.org/3/person/${actorId2}/movie_credits?api_key=${API_KEY}`)
  ]);

  const set1 = new Map(c1.cast.map(m => [m.id, m]));
  const commons = c2.cast.filter(m => set1.has(m.id));
  if (!commons.length) return null;

  commons.sort((a,b)=> (b.popularity||0)-(a.popularity||0));
  return commons[0];
}

async function buildHints(movieId, excludedActorIds) {
  const [details, credits] = await Promise.all([
    tmdbJson(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`),
    tmdbJson(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`)
  ]);

  const hints = [];
  if (details.release_date) hints.push(`Released in ${details.release_date.slice(0,4)}`);
  if (Array.isArray(details.genres) && details.genres.length) {
    hints.push(`Genre: ${details.genres.map(g=>g.name).slice(0,2).join(", ")}`);
  }
  if (details.runtime) hints.push(`Runtime ≈ ${details.runtime} min`);
  if (details.tagline) hints.push(`Tagline: “${details.tagline}”`);

  const director = (credits.crew || []).find(c=>c.job==="Director");
  if (director) hints.push(`Directed by ${director.name}`);

  const castNames = (credits.cast || [])
    .filter(c => !excludedActorIds.includes(c.id))
    .slice(0,3).map(c=>c.name);
  if (castNames.length) hints.push(`Also stars: ${castNames.join(", ")}`);

  return [...new Set(hints)].slice(0, 8);
}

// ---------- Game flow ----------
async function initRound() {
  const [aRaw, bRaw] = pickActorsFromGlobals();
  const a = normalizeActor(aRaw), b = normalizeActor(bRaw);
  game.actor1 = a; game.actor2 = b;
  renderActors(a, b);

  try {
    const common = await findCommonMovie(a.id, b.id);
    if (common) {
      game.answerMovie = { id: common.id, title: common.title || common.original_title };
      game.hintsPool = await buildHints(common.id, [a.id, b.id]);
    } else {
      game.answerMovie = { id: 27205, title: "Inception" };
      game.hintsPool = ["Released in 2010","Directed by Christopher Nolan","Stars Leonardo DiCaprio"];
    }
  } catch (e) {
    game.answerMovie = { id: 27205, title: "Inception" };
    game.hintsPool = ["Released in 2010","Directed by Christopher Nolan","Stars Leonardo DiCaprio"];
  }
  els.status.textContent = "";
}

function startGame() {
  if (game.started) return;
  game.started = true;
  els.overlay.classList.remove("visible");
  game.sec = 0;
  els.timer.textContent = "00:00";
  startTimer();
}

function endGame(win) {
  if (game.ended) return;
  game.ended = true;
  stopTimer();

  els.movieInput.disabled = true;
  els.submitBtn.disabled = true;
  els.skipBtn.disabled = true;
  els.hintBtn.disabled = true;

  if (win) {
    showPopup(
      "You got it! 🎉",
      `You linked to <strong>${game.answerMovie.title}</strong> in <strong>${game.maxTries - game.triesLeft}</strong> tries and <strong>${formatTime(game.sec)}</strong>.`
    );
  } else {
    showPopup(
      "Out of tries!",
      `The correct movie was <strong>${game.answerMovie.title}</strong>.`
    );
  }
}

function consumeTry() {
  if (game.ended) return;
  game.triesLeft -= 1;
  updateCounter();
  if (game.triesLeft <= 0) endGame(false);
}

// ---------- Events ----------
els.submitBtn.addEventListener("click", () => {
  if (game.ended || !game.started) return;
  const guess = (els.movieInput.value || "").trim();
  if (!guess) return;

  if (game.answerMovie && guess.toLowerCase() === game.answerMovie.title.toLowerCase()) {
    addListItem(guess, "green");
    endGame(true);
  } else {
    addListItem(guess, "grey");
    consumeTry();
  }
  els.movieInput.value = "";
  els.movieInput.focus();
});

els.skipBtn.addEventListener("click", () => {
  if (game.ended || !game.started) return;
  addListItem("Skipped", "grey");
  consumeTry();
});

els.hintBtn.addEventListener("click", () => {
  if (game.ended || !game.started) return;
  const remaining = game.hintsPool.filter(h => !game.usedHints.has(h));
  if (!remaining.length) {
    els.status.textContent = "No more hints available.";
    return;
  }
  const hint = remaining[Math.floor(Math.random()*remaining.length)];
  game.usedHints.add(hint);
  addListItem(hint, "orange");
  consumeTry();
});

els.movieInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.submitBtn.click();
});

// ---------- Init ----------
window.startGame = async function() {
  await initRound();
  startGame();
};

(async function bootstrap(){
  updateCounter();
  els.timer.textContent = "00:00";
  await initRound();
})();
