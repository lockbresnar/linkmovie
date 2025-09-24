const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMG = "https://image.tmdb.org/t/p/w200";

let startActor = null;
let endActor = null;
let currentActor = null;

let chain = [];
let steps = 0;
let startTime = 0;
let timerInterval = null;

// Counter circle coloring
function setCounter(val) {
  const el = document.getElementById("counterCircle");
  el.textContent = val;
  if (val < 4) el.style.background = "#4edd00"; // green
  else if (val < 7) el.style.background = "#fa8b48"; // orange
  else el.style.background = "#e53935"; // red
}

// Timer update
function setTimer(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  document.getElementById("timer").textContent = `${m.toString().padStart(2,"0")}:${ss}`;
}

// Add chain item
function addChainItem(text, color) {
  const li = document.createElement("li");
  li.textContent = text;
  li.className = color;
  document.getElementById("chainList").appendChild(li);
  chain.push(text);
}

// Pick actor by name from ACTOR_POOL
async function pickActorByName(name) {
  const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`);
  const data = await res.json();
  if (data.results && data.results.length) {
    const p = data.results[0];
    return { id: p.id, name: p.name, profile_path: p.profile_path || "" };
  }
  return { id: null, name, profile_path: "" };
}

async function pickRandomActor() {
  const name = ACTOR_POOL[Math.floor(Math.random() * ACTOR_POOL.length)];
  return pickActorByName(name);
}

// Start game
async function startGame() {
  document.getElementById("introOverlay").classList.remove("visible");

  steps = 0;
  setCounter(steps);
  document.getElementById("chainList").innerHTML = "";
  chain = [];

  startActor = await pickRandomActor();
  endActor   = await pickRandomActor();
  while (endActor.id && startActor.id && endActor.id === startActor.id) {
    endActor = await pickRandomActor();
  }
  currentActor = startActor;
  chain = [startActor.name];

  document.getElementById("actor1Img").src = startActor.profile_path ? IMG + startActor.profile_path : "";
  document.getElementById("actor1").textContent = startActor.name;
  document.getElementById("actor2Img").src = endActor.profile_path ? IMG + endActor.profile_path : "";
  document.getElementById("actor2").textContent = endActor.name;

  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(() => setTimer(Date.now() - startTime), 1000);
  setTimer(0);

  wireAutocomplete("movieInput", "suggestions");
}

// Autocomplete
function wireAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(listId);
  input.addEventListener("input", async (e) => {
    const q = e.target.value.trim();
    box.innerHTML = "";
    if (q.length < 3) return;
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    data.results.slice(0, 7).forEach(m => {
      const div = document.createElement("div");
      div.textContent = m.title;
      div.onclick = () => {
        input.value = m.title;
        box.innerHTML = "";
      };
      box.appendChild(div);
    });
  });
}

// Submit guess
async function submitGuess() {
  const q = document.getElementById("movieInput").value.trim();
  if (!q || !currentActor?.id) return;

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!data.results.length) {
    addChainItem(q, "grey");
    return;
  }

  const movie = data.results[0];
  const credRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`);
  const credits = await credRes.json();
  const castIds = credits.cast.map(a => a.id);

  if (!castIds.includes(currentActor.id)) {
    addChainItem(movie.title, "grey");
  } else if (castIds.includes(endActor.id)) {
    addChainItem(movie.title, "green");
    steps += 1; setCounter(steps);
    clearInterval(timerInterval);
    showPopup("🎉 You linked them!", `Steps: ${steps}\nTime: ${document.getElementById("timer").textContent}`);
  } else {
    const next = credits.cast.find(a => a.id !== currentActor.id);
    addChainItem(movie.title, castIds.includes(startActor.id) ? "blue" : "orange");
    if (next) currentActor = { id: next.id, name: next.name };
    steps += 1; setCounter(steps);
  }

  document.getElementById("movieInput").value = "";
  document.getElementById("suggestions").innerHTML = "";
}

// Reset chain only
function resetChain() {
  document.getElementById("chainList").innerHTML = "";
  chain = [startActor?.name || ""];
  steps = 0; setCounter(steps);
  document.getElementById("status").textContent = "";
}

// Popups
function showPopup(title, msg) {
  const p = document.getElementById("popup");
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupMsg").textContent = msg;
  p.style.display = "block";
}
function closePopup() { document.getElementById("popup").style.display = "none"; }
function openHelp() { document.getElementById("helpPopup").style.display = "block"; }
function closeHelp() { document.getElementById("helpPopup").style.display = "none"; }
