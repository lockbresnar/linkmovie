<script>
// Actor Chain — Daily/Infinite modes (no HTML/CSS changes)

// ====== Config ======
const API_KEY = "455bd5e0331130bf58534b98e8c2b901";
const IMG = "https://image.tmdb.org/t/p/w200";

// ====== State ======
let startActor = null;
let endActor = null;
let steps = 0;
let timerInterval = null;
let lastCastIds = null; // Set of actor IDs from last accepted movie

// Daily/Infinite
let dailyMode = true;           // derived from localStorage 'mode'
const LS_MODE_KEY = "mode";     // "daily" | "infinite" (set on main game)
const LS_AC_STARTED = "ac_started";
const LS_AC_START_TS = "ac_dailyStart";
const LS_AC_CHAIN_HTML = "ac_chain_html";
const LS_AC_STEPS = "ac_steps";

// ====== UI helpers ======
function setCounter(val){
  const el = document.getElementById("counterCircle");
  el.textContent = val;
  if (val < 4) el.style.background = "#4edd00";
  else if (val < 7) el.style.background = "#fa8b48";
  else el.style.background = "#e53935";
}
function setTimerFromElapsedSec(sec){
  const m = Math.floor(sec/60), s = sec%60;
  document.getElementById("timer").textContent =
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
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
  // Persist chain in daily mode
  if (dailyMode) {
    localStorage.setItem(LS_AC_CHAIN_HTML, document.getElementById("chainList").innerHTML);
  }
}

// ====== Pick from ACTOR_POOL (name-only) ======
async function pickActorByName(name){
  const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`);
  const data = await res.json();
  if (data.results && data.results.length){
    const p = data.results[0];
    return { id:p.id, name:p.name, profile_path:p.profile_path||"" };
  }
  return { id:null, name, profile_path:"" };
}

// Non-deterministic random
async function pickRandomActor(){
  const name = ACTOR_POOL[Math.floor(Math.random()*ACTOR_POOL.length)];
  return pickActorByName(name);
}

// Deterministic by day (global)
function todaySeed(){
  const d = new Date();
  return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
}
function pickTwoDeterministicNames(){
  const N = ACTOR_POOL.length;
  const seed = todaySeed();
  // Two stable indices from the date, guaranteed distinct
  const i1 = seed % N;
  const i2raw = Math.floor(seed / 7) + 13; // shift + different divisor to mix
  const i2 = (i2raw % N === i1) ? (i2raw+1) % N : (i2raw % N);
  return [ACTOR_POOL[i1], ACTOR_POOL[i2]];
}

// ====== Game start / resume ======
async function setActorsOnUI(a1,a2){
  document.getElementById("actor1Img").src = a1.profile_path ? IMG+a1.profile_path : "";
  document.getElementById("actor1").textContent = a1.name;
  document.getElementById("actor2Img").src = a2.profile_path ? IMG+a2.profile_path : "";
  document.getElementById("actor2").textContent = a2.name;
}

async function initActors(){
  if (dailyMode){
    // Deterministic from pool
    const [n1, n2] = pickTwoDeterministicNames();
    startActor = await pickActorByName(n1);
    endActor   = await pickActorByName(n2);
    // Edge-case: if same TMDb person id (unlikely), nudge to next name
    if (startActor.id && endActor.id && startActor.id===endActor.id){
      const fallbackIdx = (ACTOR_POOL.indexOf(n2)+1) % ACTOR_POOL.length;
      endActor = await pickActorByName(ACTOR_POOL[fallbackIdx]);
    }
  } else {
    // Original behavior
    startActor = await pickRandomActor();
    endActor   = await pickRandomActor();
    while (startActor.id && endActor.id && startActor.id===endActor.id){
      endActor = await pickRandomActor();
    }
  }
  await setActorsOnUI(startActor, endActor);
}

async function startGame(){
  // hide overlay
  document.getElementById("introOverlay").classList.remove("visible");

  // mark started in daily mode & start persistent timer
  if (dailyMode && !localStorage.getItem(LS_AC_STARTED)) {
    localStorage.setItem(LS_AC_STARTED, "true");
  }

  // reset ui/state (does NOT clear a restored daily chain on resume)
  steps = parseInt(localStorage.getItem(LS_AC_STEPS)||"0",10);
  setCounter(steps);
  lastCastIds = null;

  // (Re)init actors + show
  await initActors();

  // timer
  if (timerInterval) clearInterval(timerInterval);
  if (dailyMode) {
    // persistent timer
    if (!localStorage.getItem(LS_AC_START_TS)) {
      localStorage.setItem(LS_AC_START_TS, Date.now().toString());
    }
    // update each sec based on stored start
    const tick = ()=>{
      const start = parseInt(localStorage.getItem(LS_AC_START_TS),10);
      const now = Date.now();
      const sec = Math.max(0, Math.floor((now-start)/1000));
      setTimerFromElapsedSec(sec);
    };
    tick();
    timerInterval = setInterval(tick, 1000);
  } else {
    // classic per-session timer
    const t0 = Date.now();
    setTimer(0);
    timerInterval = setInterval(()=>setTimer(Date.now()-t0),1000);
  }

  // wire UI
  wireControls();
}

// ====== Controls wiring (once) ======
let wired = false;
function wireControls(){
  if (wired) return;
  wired = true;

  // suggestions (unchanged)
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

// ====== Submit logic (chain-follow) ======
async function submitGuess(){
  const q = document.getElementById("movieInput").value.trim();
  if (!q) return;

  // search movie
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!data.results.length){
    addChainItem(q,"grey");
    clearInput();
    persistSteps(); // grey doesn't increment; keep consistent with existing logic
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
      persistSteps();
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
    persistSteps();
    return;
  }

  // subsequent: must share at least one actor with previous accepted movie
  const sharesWithLast = [...lastCastIds].some(id=>castIds.has(id));
  if (!sharesWithLast){
    addChainItem(movie.title,"grey");
    clearInput();
    persistSteps();
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
  persistSteps();
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
  if (dailyMode){
    localStorage.setItem(LS_AC_CHAIN_HTML, "");
    localStorage.setItem(LS_AC_STEPS, "0");
  }
}

function persistSteps(){
  if (dailyMode){
    localStorage.setItem(LS_AC_STEPS, String(steps));
    localStorage.setItem(LS_AC_CHAIN_HTML, document.getElementById("chainList").innerHTML);
  }
}

function winNow(){
  if (timerInterval) clearInterval(timerInterval);
  showPopup("🎉 You linked them!",
    `Steps: ${steps}\nTime: ${document.getElementById("timer").textContent}`);
  // keep daily progress saved; nothing else needed
}

// ====== Popups + help (unchanged) ======
function showPopup(title,msg){
  const p=document.getElementById("popup");
  document.getElementById("popupTitle").textContent=title;
  document.getElementById("popupMsg").innerHTML = msg.replace(/\n/g,"<br/>");
  p.style.display="block";
}
function closePopup(){ document.getElementById("popup").style.display="none"; }
function openHelp(){ document.getElementById("helpPopup").style.display="block"; }
function closeHelp(){ document.getElementById("helpPopup").style.display="none"; }

// ====== Bootstrap ======
(async function bootstrap(){
  // Read mode chosen on the main game
  const savedMode = localStorage.getItem(LS_MODE_KEY);
  dailyMode = savedMode !== "infinite"; // default to daily unless explicitly infinite

  setCounter(steps);
  // Prepare actors immediately so the page always shows the pair (no style changes)
  await initActors();

  if (dailyMode){
    // Restore chain + steps (optional, harmless if none)
    const savedHTML = localStorage.getItem(LS_AC_CHAIN_HTML);
    const savedSteps = localStorage.getItem(LS_AC_STEPS);
    if (savedHTML != null) {
      document.getElementById("chainList").innerHTML = savedHTML;
    }
    if (savedSteps != null) {
      steps = parseInt(savedSteps,10) || 0;
      setCounter(steps);
    }

    // If the daily was already started, skip overlay and continue persistent timer
    if (localStorage.getItem(LS_AC_STARTED)==="true") {
      document.getElementById("introOverlay").classList.remove("visible");
      // ensure a start timestamp exists
      if (!localStorage.getItem(LS_AC_START_TS)){
        localStorage.setItem(LS_AC_START_TS, Date.now().toString());
      }
      // run timer loop based on stored start
      const tick = ()=>{
        const start = parseInt(localStorage.getItem(LS_AC_START_TS),10);
        const now = Date.now();
        const sec = Math.max(0, Math.floor((now-start)/1000));
        setTimerFromElapsedSec(sec);
      };
      tick();
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(tick, 1000);
    } else {
      // initial daily visit → show overlay; timer begins when Start is pressed
      document.getElementById("introOverlay").classList.add("visible");
    }
  } else {
    // Infinite: show overlay until Start; per-session timer
    document.getElementById("introOverlay").classList.add("visible");
    // Clear any daily-only keys so they don't leak between modes
    localStorage.removeItem(LS_AC_STARTED);
    localStorage.removeItem(LS_AC_START_TS);
  }
})();

</script>
