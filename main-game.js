/* v12 Game Logic + Autocomplete */

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

// Helpers, timer, state save/load, actor/movie selection
// ... (keep all your v12 logic unchanged) ...

// ---------- Autocomplete Suggestions ----------
const suggestionsDiv = document.getElementById("suggestions");

els.movieInput.addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) {
    suggestionsDiv.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    suggestionsDiv.innerHTML = "";
    data.results.slice(0, 5).forEach(movie => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      const year = movie.release_date ? ` (${movie.release_date.slice(0,4)})` : "";
      div.textContent = movie.title + year;
      div.addEventListener("click", () => {
        els.movieInput.value = movie.title;
        suggestionsDiv.innerHTML = "";
      });
      suggestionsDiv.appendChild(div);
    });
  } catch (err) {
    console.error("Autocomplete failed:", err);
  }
});

els.movieInput.addEventListener("blur", () => {
  setTimeout(() => { suggestionsDiv.innerHTML = ""; }, 200);
});
