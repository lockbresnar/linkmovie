const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMAGE_URL = "https://image.tmdb.org/t/p/w200";

let startActor, endActor, currentActor;
let chain = [];
let counter = 0;
let timerInterval;
let startTime;

// Start game
function startGame() {
  console.log("startGame triggered");
  document.getElementById("introPopup").style.display = "none";

  // Debug: check actors list
  if (typeof actors === "undefined" || !Array.isArray(actors) || actors.length < 2) {
    alert("❌ Actor list not loaded. Please check actors.js");
    console.error("actors.js not loaded or actors is not an array.");
    return;
  }
  console.log("actors loaded:", actors.length, "available.");

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

  console.log("Start actor:", startActor, "End actor:", endActor);

  fetchActorImage(startActor, "actor1Img", "actor1");
  fetchActorImage(endActor, "actor2Img", "actor2");
}
