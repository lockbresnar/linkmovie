const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let targetMovie = null;
let targetActors = [];
let revealedActors = [];
let tries = 0;
let maxTries = 6;
let timerInterval;
let startTime;

// initialize game
async function startGame() {
  document.getElementById("introOverlay").classList.remove("visible");
  startTimer();
  await setupGame();
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    let diff = Date.now() - startTime;
    let minutes = String(Math.floor(diff / 60000)).padStart(2, "0");
    let seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    document.getElementById("timer").textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// setup game with top rated films
async function setupGame() {
  document.getElementById("status").textContent = "🎬 Finding your actors...";

  // Pick a random page from top-rated (1–13 ~ top 250 movies)
  const page = Math.floor(Math.random() * 13) + 1;
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&language=en-US&page=${page}`
  );
  const data = await res.json();
  targetMovie = data.results[Math.floor(Math.random() * data.results.length)];

  // Fetch credits
  const creditsRes = await fetch(
    `https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`
  );
  const credits = await creditsRes.json();

  // Take only top 6 billed cast
  targetActors = credits.cast.slice(0, 6);

  // Pick two random actors from the film
  const chosen = targetActors.sort(() => 0.5 - Math.random()).slice(0, 2);
  revealedActors = [...chosen];

  // Display chosen actors
  displayActor(chosen[0], "actor1Img", "actor1");
  displayActor(chosen[1], "actor2Img", "actor2");

  document.getElementById("status").textContent = "";
}

function displayActor(actor, imgId, nameId) {
  document.getElementById(imgId).src = actor.profile_path
    ? IMAGE_URL + actor.profile_path
    : "assets/placeholder.png";
  document.getElementById(nameId).textContent = actor.name;
}

// Autocomplete
document.getElementById("movieInput").addEventListener("input", (e) => {
  const query = e.target.value;
  if (query.length > 2) {
    fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`
    )
      .then((res) => res.json())
      .then((data) => {
        const container = document.getElementById("suggestions");
        container.innerHTML = "";
        data.results.slice(0, 5).forEach((movie) => {
          const div = document.createElement("div");
          div.textContent = movie.title;
          div.onclick = () => {
            document.getElementById("movieInput").value = movie.title;
            container.innerHTML = "";
          };
          container.appendChild(div);
        });
      });
  }
});

// Submit guess
async function submitGuess() {
  if (!targetMovie) return;
  const guess = document.getElementById("movieInput").value.trim();
  if (!guess) return;

  incrementCounter();

  if (guess.toLowerCase() === targetMovie.title.toLowerCase()) {
    addToChain(guess, "green");
    stopTimer();
    showWin();
  } else {
    addToChain(guess, "grey");
    if (tries >= maxTries) {
      stopTimer();
      showLose();
    }
  }

  document.getElementById("movieInput").value = "";
  document.getElementById("suggestions").innerHTML = "";
}

function skipTurn() {
  if (!targetMovie) return;
  incrementCounter();

  // reveal another actor from target film
  const unrevealed = targetActors.filter((a) => !revealedActors.includes(a));
  if (unrevealed.length > 0) {
    const nextActor = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    revealedActors.push(nextActor);
    addToChain(nextActor.name, "orange");
  } else {
    addToChain("No more hints", "grey");
  }

  if (tries >= maxTries) {
    stopTimer();
    showLose();
  }
}

function incrementCounter() {
  tries++;
  const circle = document.getElementById("counterCircle");
  circle.textContent = tries;

  // Change color as tries increase
  if (tries <= 2) circle.style.background = "#4edd00"; // green
  else if (tries <= 4) circle.style.background = "#fa8b48"; // orange
  else circle.style.background = "#e53935"; // red
}

function addToChain(text, color) {
  const li = document.createElement("li");
  li.textContent = text;
  li.className = color;
  document.getElementById("chainList").appendChild(li);
}

function showWin() {
  document.getElementById("popupTitle").textContent = "🎉 You linked them!";
  document.getElementById("popupMsg").textContent = `Film: ${
    targetMovie.title
  }\nTries: ${tries}\nTime: ${
    document.getElementById("timer").textContent
  }`;
  document.getElementById("shareBtn").style.display = "block";
  document.getElementById("popup").style.display = "block";
  disableInput();
}

function showLose() {
  document.getElementById("popupTitle").textContent = "Out of tries!";
  document.getElementById(
    "popupMsg"
  ).textContent = `The film was: ${targetMovie.title}`;
  document.getElementById("shareBtn").style.display = "none";
  document.getElementById("popup").style.display = "block";
  disableInput();
}

function disableInput() {
  document.getElementById("movieInput").disabled = true;
  document.querySelector(".btn-submit").disabled = true;
  document.querySelector(".btn-red").disabled = true;
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

function openHelp() {
  document.getElementById("helpPopup").style.display = "block";
}
function closeHelp() {
  document.getElementById("helpPopup").style.display = "none";
}

function shareResult() {
  const result = `🎬 LinkMovie — Movie Link\nFilm: ${
    targetMovie.title
  }\nTries: ${tries}\nTime: ${
    document.getElementById("timer").textContent
  }\nhttps://www.link.movie/`;
  navigator.clipboard.writeText(result).then(() => {
    alert("Result copied to clipboard!");
  });
}
