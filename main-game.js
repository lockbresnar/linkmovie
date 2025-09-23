const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let startActor, endActor, targetMovie, tries = 0, startTime, timerInterval;

// Initialize game
async function initGame() {
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
  tries = 0;
  updateChainCounter();

  // Pick a random popular movie
  let res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&page=1`);
  let data = await res.json();
  targetMovie = data.results[Math.floor(Math.random() * data.results.length)];

  let creditsRes = await fetch(`https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`);
  let credits = await creditsRes.json();
  let shuffled = credits.cast.sort(() => 0.5 - Math.random()).slice(0, 2);

  startActor = shuffled[0];
  endActor = shuffled[1];

  document.getElementById("actor1Img").src = IMAGE_URL + startActor.profile_path;
  document.getElementById("actor1").textContent = startActor.name;
  document.getElementById("actor2Img").src = IMAGE_URL + endActor.profile_path;
  document.getElementById("actor2").textContent = endActor.name;
}

function updateTimer() {
  let elapsed = formatTime(Date.now() - startTime);
  document.getElementById("timer").textContent = "⏱️ Time: " + elapsed;
}

function formatTime(ms) {
  let totalSec = Math.floor(ms / 1000);
  let min = Math.floor(totalSec / 60);
  let sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getCounterColor(steps) {
  let capped = Math.min(steps, 20);
  let r = Math.min(255, capped * 12);
  let g = Math.max(0, 200 - capped * 10);
  return `rgb(${r}, ${g}, 60)`;
}

function updateChainCounter() {
  const counter = document.getElementById("chainCounter");
  counter.textContent = "🔗 Steps: " + tries;
  counter.style.color = getCounterColor(tries);
}

// Autocomplete
document.getElementById("movieInput").addEventListener("input", async e => {
  const query = e.target.value;
  const container = document.getElementById("suggestions");
  container.innerHTML = "";
  if (query.length > 2) {
    let res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
    );
    let data = await res.json();
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

async function submitGuess() {
  const query = document.getElementById("movieInput").value.trim();
  if (!query) return;
  tries++;
  updateChainCounter();

  let res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
  );
  let data = await res.json();

  if (data.results.length > 0 && data.results[0].id === targetMovie.id) {
    showPopup("🎉 Correct!", `You guessed it in ${tries} tries!\nTime: ${formatTime(Date.now() - startTime)}`);
  } else if (tries >= 6) {
    showPopup("❌ Out of tries!", `The correct answer was: "${targetMovie.title}"`);
  }

  document.getElementById("movieInput").value = "";
  document.getElementById("suggestions").innerHTML = "";
}

async function skipTurn() {
  tries++;
  updateChainCounter();
  let creditsRes = await fetch(
    `https://api.themoviedb.org/3/movie/${targetMovie.id}/credits?api_key=${API_KEY}`
  );
  let credits = await creditsRes.json();
  let randomActor = credits.cast[Math.floor(Math.random() * credits.cast.length)];
  document.getElementById("status").textContent = `Hint: ${randomActor.name}`;
  if (tries >= 6) {
    showPopup("❌ Out of tries!", `The correct answer was: "${targetMovie.title}"`);
  }
}

function showPopup(title, msg) {
  clearInterval(timerInterval);
  document.getElementById("popup").style.display = "block";
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMsg").textContent = msg;
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

initGame();
