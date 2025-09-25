const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let actor1, actor2;
let targetMovie = null;
let chain = [];
let tries = 0;
let timerInterval = null;
let startTime = null;
let gameOver = false;

/* --- Timer --- */
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

/* --- Counter --- */
function updateCounter() {
  document.getElementById("counterCircle").textContent = tries;
}

/* --- Game Setup --- */
async function setupGame() {
  // Pick a random movie
  const res = await fetch(
    `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&page=${Math.floor(
      Math.random() * 50 + 1
    )}`
  );
  const data = await res.json();
  targetMovie = data.results[Math.floor(Math.random() * data.results.length)];

  // Get credits and pick 2 top billed actors
  const creditsRes = await fetch(
    `https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`
  );
  const credits = await creditsRes.json();
  const topActors = credits.cast.slice(0, 6);
  if (topActors.length < 2) {
    return setupGame(); // retry if not enough actors
  }

  const chosen = [];
  while (chosen.length < 2) {
    const pick = topActors[Math.floor(Math.random() * topActors.length)];
    if (!chosen.find(a => a.id === pick.id)) {
      chosen.push(pick);
    }
  }
  actor1 = chosen[0];
  actor2 = chosen[1];

  // Display actors
  displayActor(actor1, "actor1Img", "actor1");
  displayActor(actor2, "actor2Img", "actor2");

  chain = [];
  tries = 0;
  gameOver = false;
  updateCounter();
  startTimer();
}

/* --- Display Actor --- */
function displayActor(actor, imgId, nameId) {
  if (actor.profile_path) {
    document.getElementById(imgId).src = IMAGE_URL + actor.profile_path;
  } else {
    document.getElementById(imgId).src = "assets/placeholder.png";
  }
  document.getElementById(nameId).textContent = actor.name;
}

/* --- Suggestions --- */
document.getElementById("movieInput").addEventListener("input", async e => {
  const query = e.target.value.trim();
  const container = document.getElementById("suggestions");
  container.innerHTML = "";

  if (query.length > 2) {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
        query
      )}`
    );
    const data = await res.json();
    data.results.slice(0, 5).forEach(movie => {
      const div = document.createElement("div");
      div.textContent = movie.title;
      div.onclick = () => {
        document.getElementById("movieInput").value = movie.title;
        container.innerHTML = "";
      };
      container.appendChild(div);
    });
  }
});

/* --- Submit Guess --- */
async function submitGuess() {
  if (gameOver) return;

  const query = document.getElementById("movieInput").value.trim();
  if (!query) return;

  tries++;
  updateCounter();

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      query
    )}`
  );
  const data = await res.json();
  document.getElementById("movieInput").value = "";
  document.getElementById("suggestions").innerHTML = "";

  if (data.results.length === 0) {
    addToChain(query, "grey");
    return;
  }

  const movie = data.results[0];

  if (movie.id === targetMovie.id) {
    addToChain(movie.title, "green");
    winGame();
  } else {
    // give a hint (add a top billed actor from the target film)
    const creditsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`
    );
    const credits = await creditsRes.json();
    const hintActor =
      credits.cast[Math.floor(Math.random() * Math.min(5, credits.cast.length))];
    addToChain(`${movie.title} → Hint: ${hintActor.name}`, "orange");
  }
}

/* --- Skip Turn --- */
async function skipTurn() {
  if (gameOver) return;
  tries++;
  updateCounter();

  // add a hint actor to chain
  const creditsRes = await fetch(
    `https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`
  );
  const credits = await creditsRes.json();
  const hintActor =
    credits.cast[Math.floor(Math.random() * Math.min(5, credits.cast.length))];
  addToChain(`Hint: ${hintActor.name}`, "orange");
}

/* --- Add to Chain --- */
function addToChain(text, color) {
  const li = document.createElement("li");
  li.textContent = text;
  li.className = color;
  document.getElementById("chainList").appendChild(li);
  chain.push(text);
}

/* --- Win Game --- */
function winGame() {
  gameOver = true;
  stopTimer();
  showPopup(`🎉 Correct! You linked them in ${tries} tries and ${document.getElementById("timer").textContent}`);
}

/* --- Popup --- */
function showPopup(message) {
  document.getElementById("popupMessage").textContent = message;
  document.getElementById("popup").style.display = "flex";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

/* --- Start --- */
setupGame();
