const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let startActor, endActor, lastMovieCast = [], chain = [];
let startTime, timerInterval, steps = 0;

async function initGame() {
  let shuffled = ACTOR_POOL.sort(() => 0.5 - Math.random());
  let names = shuffled.slice(0, 2);
  startActor = await fetchActor(names[0]);
  endActor = await fetchActor(names[1]);
  chain = [startActor.name];
  steps = 0;
  displayActors();
  document.getElementById("chainList").innerHTML = "";
  document.getElementById("status").textContent = "";
  updateChainCounter();

  document.getElementById("introPopup").style.display = "block";
  document.getElementById("actorsSection").style.visibility = "hidden";
}

async function fetchActor(name) {
  let res = await fetch(
    `https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`
  );
  let data = await res.json();
  if (data.results.length > 0) {
    return {
      id: data.results[0].id,
      name: data.results[0].name,
      profile_path: data.results[0].profile_path
    };
  }
  return { id: null, name, profile_path: null };
}

function displayActors() {
  if (startActor.profile_path) document.getElementById("actor1Img").src = IMAGE_URL + startActor.profile_path;
  document.getElementById("actor1").textContent = startActor.name;
  if (endActor.profile_path) document.getElementById("actor2Img").src = IMAGE_URL + endActor.profile_path;
  document.getElementById("actor2").textContent = endActor.name;
}

function startGame() {
  document.getElementById("introPopup").style.display = "none";
  document.getElementById("actorsSection").style.visibility = "visible";
  startTime = Date.now();
  timerInterval = setInterval(() => {
    document.getElementById("timer").textContent = "⏱️ Time: " + formatTime(Date.now() - startTime);
  }, 1000);
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
  counter.textContent = "🔗 Steps: " + steps;
  counter.style.color = getCounterColor(steps);
}

document.getElementById("guessInput").addEventListener("input", async e => {
  const query = e.target.value.trim();
  const container = document.getElementById("suggestions");
  container.innerHTML = "";
  if (query.length < 2) return;

  let movieRes = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
  );
  let movieData = await movieRes.json();

  movieData.results.slice(0, 5).forEach(m => {
    const div = document.createElement("div");
    div.textContent = m.title;
    div.onclick = () => {
      document.getElementById("guessInput").value = m.title;
      container.innerHTML = "";
    };
    container.appendChild(div);
  });
});

async function submitGuess() {
  const query = document.getElementById("guessInput").value.trim();
  if (!query) return;

  let movieRes = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
  );
  let movieData = await movieRes.json();

  if (movieData.results.length > 0) {
    let movie = movieData.results[0];
    let creditsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`);
    let credits = await creditsRes.json();
    let castIds = credits.cast.map(a => a.id);

    if (lastMovieCast.length === 0) {
      if (castIds.includes(startActor.id)) {
        steps++;
        addToChain(movie.title, "blue");
        lastMovieCast = credits.cast;
        updateChainCounter();
      } else {
        addToChain(movie.title, "grey");
      }
    } else {
      const overlap = credits.cast.filter(a => lastMovieCast.some(b => b.id === a.id));
      if (overlap.length > 0) {
        steps++;
        if (castIds.includes(endActor.id)) {
          addToChain(movie.title, "green");
          clearInterval(timerInterval);
          showPopup(steps, movie.title, formatTime(Date.now() - startTime));
          return;
        }
        if (castIds.includes(startActor.id)) {
          addToChain(movie.title, "blue");
        } else {
          addToChain(movie.title, "orange");
        }
        lastMovieCast = credits.cast;
        updateChainCounter();
      } else {
        addToChain(movie.title, "grey");
      }
    }
  } else {
    addToChain(query, "grey");
  }

  document.getElementById("guessInput").value = "";
  document.getElementById("suggestions").innerHTML = "";
}

function resetChain() {
  chain = [startActor.name];
  steps = 0;
  document.getElementById("chainList").innerHTML = "";
  document.getElementById("status").textContent = "";
  updateChainCounter();
}

function addToChain(text, color) {
  const li = document.createElement("li");
  li.textContent = text;
  li.className = color;
  document.getElementById("chainList").appendChild(li);
  chain.push(text);
}

function showPopup(steps, finalMovie, elapsed) {
  document.getElementById("popup").style.display = "block";
  document.getElementById("popupTitle").textContent = "🎉 You Win!";
  document.getElementById("popupMsg").textContent =
    `It took you ${steps} steps to link them via "${finalMovie}".\n\n⏱️ Time: ${elapsed}`;
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

initGame();
