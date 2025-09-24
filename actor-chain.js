const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMG = "https://image.tmdb.org/t/p/w200";

let startActor = null;
let endActor = null;

let steps = 0;
let startTime = 0;
let timerInterval = null;

// core chain state
let lastCastIds = null; // Set<number> of actors from last accepted movie

// --- UI helpers ---
function setCounter(val){
  const el = document.getElementById("counterCircle");
  el.textContent = val;
  if (val < 4) el.style.background = "#4edd00";
  else if (val < 7) el.style.background = "#fa8b48";
  else el.style.background = "#e53935";
}
function setTimer(ms){
  const s = Math.floor(ms/1000), m = Math.floor(s/60);
  document.getElementById("timer").textContent =
    `${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function addChainItem(text,color){
  const li=document.createElement("li");
  li.textContent=text; li.className=color;
  document.getElementById("chainList").appendChild(li);
}

// --- actor fetching from name-only pool ---
async function pickActorByName(name){
  const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`);
  const data = await res.json();
  if (data.results && data.results.length){
    const p = data.results[0];
    return { id:p.id, name:p.name, profile_path:p.profile_path||"" };
  }
  return { id:null, name, profile_path:"" };
}
async function pickRandomActor(){
  const name = ACTOR_POOL[Math.floor(Math.random()*ACTOR_POOL.length)];
  return pickActorByName(name);
}

// --- game start ---
async function startGame(){
  // hide overlay
  document.getElementById("introOverlay").classList.remove("visible");

  // reset ui/state
  steps=0; setCounter(steps);
  document.getElementById("chainList").innerHTML="";
  lastCastIds = null;

  // pick actors
  startActor = await pickRandomActor();
  endActor = await pickRandomActor();
  while (startActor.id && endActor.id && startActor.id===endActor.id){
    endActor = await pickRandomActor();
  }

  // show
  document.getElementById("actor1Img").src = startActor.profile_path ? IMG+startActor.profile_path : "";
  document.getElementById("actor1").textContent = startActor.name;
  document.getElementById("actor2Img").src = endActor.profile_path ? IMG+endActor.profile_path : "";
  document.getElementById("actor2").textContent = endActor.name;

  // timer
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  setTimer(0);
  timerInterval = setInterval(()=>setTimer(Date.now()-startTime),1000);

  // wire UI events
  wireControls();
}

// --- controls wiring (once) ---
let wired = false;
function wireControls(){
  if (wired) return;
  wired = true;

  // suggestions
  const input = document.getElementById("movieInput");
  const box = document.getElementById("suggestions");
  input.addEventListener("input", async (e)=>{
    const q = e.target.value.trim();
    box.innerHTML="";
    if (q.length<3) return;
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    data.results.slice(0,7).forEach(m=>{
      const d=document.createElement("div");
      d.textContent=m.title;
      d.onclick=()=>{ input.value=m.title; box.innerHTML=""; };
      box.appendChild(d);
    });
  });

  // submit
  document.querySelector(".btn-submit").addEventListener("click", submitGuess);
  // reset (chain only)
  document.querySelector(".btn-red").addEventListener("click", resetChain);
}

// --- submit logic: chain-follow mechanic ---
async function submitGuess(){
  const q = document.getElementById("movieInput").value.trim();
  if (!q) return;

  // search movie
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!data.results.length){
    addChainItem(q,"grey");
    clearInput();
    return;
  }
  const movie = data.results[0];

  // credits
  const credRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`);
  const credits = await credRes.json();
  const castIds = new Set(credits.cast.map(c=>c.id));

  const includesStart = castIds.has(startActor.id);
  const includesTarget = castIds.has(endActor.id);

  // first valid must include start actor
  if (lastCastIds===null){
    if (!includesStart){
      addChainItem(movie.title,"grey");
      clearInput();
      return;
    }
    // accept blue
    addChainItem(movie.title,"blue");
    steps+=1; setCounter(steps);
    lastCastIds = castIds;
    if (includesTarget){
      winNow(); // edge case: first movie also has target
    }
    clearInput();
    return;
  }

  // subsequent: must share at least one actor with previous accepted movie
  const sharesWithLast = [...lastCastIds].some(id=>castIds.has(id));
  if (!sharesWithLast){
    addChainItem(movie.title,"grey");
    clearInput();
    return;
  }

  // valid link → color rules
  if (includesTarget){
    addChainItem(movie.title,"green");
    steps+=1; setCounter(steps);
    winNow();
  } else if (includesStart){
    addChainItem(movie.title,"blue");
    steps+=1; setCounter(steps);
    lastCastIds = castIds;
  } else {
    addChainItem(movie.title,"orange");
    steps+=1; setCounter(steps);
    lastCastIds = castIds;
  }

  clearInput();
}

function clearInput(){
  document.getElementById("movieInput").value="";
  document.getElementById("suggestions").innerHTML="";
}

function resetChain(){
  document.getElementById("chainList").innerHTML="";
  steps=0; setCounter(steps);
  lastCastIds = null; // force next valid to include start actor again
  document.getElementById("status").textContent="";
}

function winNow(){
  if (timerInterval) clearInterval(timerInterval);
  showPopup("🎉 You linked them!",
    `Steps: ${steps}\nTime: ${document.getElementById("timer").textContent}`);
}

// popups + help
function showPopup(title,msg){
  const p=document.getElementById("popup");
  document.getElementById("popupTitle").textContent=title;
  document.getElementById("popupMsg").textContent=msg.replace(/\n/g,"<br/>");
  p.style.display="block";
}
function closePopup(){ document.getElementById("popup").style.display="none"; }
function openHelp(){ document.getElementById("helpPopup").style.display="block"; }
function closeHelp(){ document.getElementById("helpPopup").style.display="none"; }
