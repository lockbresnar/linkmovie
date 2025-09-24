const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let startActor, endActor, currentActor;
let chain = [];
let counter = 0;
let timerInterval;
let startTime;

// Start game
function startGame() {
  document.getElementById("introPopup").style.display = "none";

  if (!actors || actors.length < 2) {
    alert("Actor list not loaded. Please check actors.js");
    return;
  }

  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);

  // Pick two random actors from list
  startActor = actors[Math.floor(Math.random() * actors.length)];
  endActor = actors[Math.floor(Math.random() * actors.length)];
  while (endActor.id === startActor.id) {
    endActor = actors[Math.floor(Math.random() * actors.length)];
  }

  currentActor = startActor;
  chain = [startActor.name];

  fetchActorImage(startActor, "actor1Img", "actor1");
  fetchActorImage(endActor, "actor2Img", "actor2");
}

// Timer
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${minutes}:${seconds}`;
}

// Actor images
function fetchActorImage(actor, elementId, nameId) {
  fetch(`https://api.themoviedb.org/3/person/${actor.id}?api_key=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.profile_path) {
        document.getElementById(elementId).src = IMAGE_URL + data.profile_path;
      }
      document.getElementById(nameId).textContent = actor.name;
    });
}

// Autocomplete
document.getElementById("guessInput").addEventListener("input", e => {
  const query = e.target.value;
  if (query.length > 2) {
    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`)
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById("suggestions");
        container.innerHTML = "";
        data.results.slice(0,5).forEach(movie => {
          const div = document.createElement("div");
          div.textContent = movie.title;
          div.onclick = () => {
            document.getElementById("guessInput").value = movie.title;
            container.innerHTML = "";
          };
          container.appendChild(div);
        });
      });
  }
});

// Submit guess
function submitGuess() {
  const query = document.getElementById("guessInput").value.trim();
  if (!query) return;

  fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`)
    .then(res => res.json())
    .then(data => {
      if (data.results.length === 0) {
        addToChain(query, "grey");
        return;
      }
      const movie = data.results[0];
      checkGuess(movie.id, movie.title);
    });

  document.getElementById("guessInput").value = "";
  document.getElementById("suggestions").innerHTML = "";
}

// Check guess
function checkGuess(movieId, movieTitle) {
  fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      const actorsInMovie = data.cast.map(a => a.id);

      if (!actorsInMovie.includes(currentActor.id)) {
        addToChain(movieTitle, "grey");
      } else if (actorsInMovie.includes(endActor.id)) {
        addToChain(movieTitle, "green");
        showPopup("🎉 You linked them!", `It took you ${counter} steps and ${document.getElementById("timer").textContent} time.`);
        clearInterval(timerInterval);
      } else {
        addToChain(movieTitle, "blue");
        const nextActor = data.cast.find(a => a.id !== currentActor.id);
        if (nextActor) {
          currentActor = { id: nextActor.id, name: nextActor.name };
        }
      }
    });
}

// Add to chain + counter
function addToChain(text, color) {
  const li = document.createElement("li");
  li.textContent = text;
  li.className = color;
  document.getElementById("chainList").appendChild(li);
  chain.push(text);

  if (color !== "grey") {
    counter++;
    updateCounterColor();
    document.getElementById("chainCounter").textContent = counter;
  }
}

// Counter color change
function updateCounterColor() {
  const circle = document.getElementById("chainCounter");
  if (counter < 4) circle.style.background = "#4edd00";
  else if (counter < 7) circle.style.background = "#fa8b48";
  else circle.style.background = "#ff0000";
}

// Reset
function resetChain() {
  document.getElementById("chainList").innerHTML = "";
  chain = [startActor.name];
  counter = 0;
  document.getElementById("chainCounter").textContent = "0";
  document.getElementById("chainCounter").style.background = "#4edd00";
}

// Popup
function showPopup(title, msg) {
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMsg").textContent = msg;
  document.getElementById("popup").style.display = "block";
}
function closePopup() {
  document.getElementById("popup").style.display = "none";
}

// Help
function openHelp() {
  document.getElementById("helpPopup").style.display = "block";
}
function closeHelp() {
  document.getElementById("helpPopup").style.display = "none";
}
