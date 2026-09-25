let scenario = null;
let currentRoom = 0;
let timerId = null;
let timeLeft = 0;
let selected = new Set();
let evidence = 0;
let mistakes = 0;
let missed = 0;
let threat = 16;
let containment = 0;
let soundOn = true;
let audioCtx = null;
let rainNode = null;
let rainGain = null;
let tensionOsc = null;
let tensionGain = null;

const screen = document.getElementById("screen");
const hud = document.getElementById("hud");
const soundBtn = document.getElementById("soundBtn");
const restartBtn = document.getElementById("restartBtn");
const roomMetric = document.getElementById("roomMetric");
const threatMetric = document.getElementById("threatMetric");
const evidenceMetric = document.getElementById("evidenceMetric");
const timerMetric = document.getElementById("timerMetric");
const caseMetric = document.getElementById("caseMetric");
const toast = document.getElementById("toast");
const flash = document.getElementById("flash");
const footerSignal = document.getElementById("footerSignal");

function ensureAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = Math.random()*2-1;
  rainNode = audioCtx.createBufferSource();
  rainNode.buffer = buffer; rainNode.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass"; filter.frequency.value = 1300;
  rainGain = audioCtx.createGain(); rainGain.gain.value = .018;
  rainNode.connect(filter).connect(rainGain).connect(audioCtx.destination);
  rainNode.start();

  tensionOsc = audioCtx.createOscillator();
  tensionOsc.type = "sine"; tensionOsc.frequency.value = 48;
  tensionGain = audioCtx.createGain(); tensionGain.gain.value = .007;
  tensionOsc.connect(tensionGain).connect(audioCtx.destination);
  tensionOsc.start();
}

function setAmbient(on){
  if(!audioCtx) return;
  const t = audioCtx.currentTime;
  rainGain.gain.cancelScheduledValues(t);
  tensionGain.gain.cancelScheduledValues(t);
  rainGain.gain.linearRampToValueAtTime(on ? .018 : .0001, t+.25);
  tensionGain.gain.linearRampToValueAtTime(on ? .007 : .0001, t+.25);
}

function tone(freq=440,duration=.08,type="sine",gain=.025){
  if(!soundOn) return;
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(gain,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime+duration);
}
function softAlert(){ tone(330,.11,"triangle",.018); setTimeout(()=>tone(440,.11,"triangle",.014),100); }
function thunder(){
  if(!soundOn) return;
  ensureAudio();
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type="sawtooth"; o.frequency.setValueAtTime(58,audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(28,audioCtx.currentTime+.7);
  g.gain.setValueAtTime(.035,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.9);
  o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+.9);
  flash.classList.add("on"); setTimeout(()=>flash.classList.remove("on"),120);
}

function notify(message, danger=false){
  toast.textContent = message;
  toast.style.borderColor = danger ? "rgba(255,111,125,.55)" : "rgba(145,183,255,.38)";
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),2100);
}

soundBtn.addEventListener("click",()=>{
  ensureAudio();
  soundOn=!soundOn;
  soundBtn.textContent=`SOUND // ${soundOn?"ON":"OFF"}`;
  setAmbient(soundOn);
  if(soundOn) tone(520,.06,"sine",.015);
});
restartBtn.addEventListener("click",()=>location.reload());

document.getElementById("startBtn").addEventListener("click", async ()=>{
  ensureAudio(); setAmbient(soundOn); tone(420,.08,"triangle",.016);
  scenario = await fetch("/api/scenario").then(r=>r.json());
  currentRoom=0; evidence=0; mistakes=0; missed=0; threat=16; containment=0;
  caseMetric.textContent=scenario.incident;
  hud.classList.remove("hidden"); restartBtn.classList.remove("hidden");
  renderRoom();
  setTimeout(()=>thunder(),1700);
});

function updateHud(){
  roomMetric.textContent=`${Math.min(currentRoom+1,scenario?.rooms.length||6)}/${scenario?.rooms.length||6}`;
  threatMetric.textContent=`${Math.max(0,Math.min(100,Math.round(threat)))}%`;
  evidenceMetric.textContent=evidence;
  timerMetric.textContent=`${Math.floor(timeLeft/60)}:${String(Math.max(0,timeLeft%60)).padStart(2,"0")}`;
  footerSignal.textContent = threat > 70 ? "SIGNAL // CRITICAL" : threat > 42 ? "SIGNAL // DEGRADED" : "SIGNAL // STABLE";
}

function startTimer(seconds){
  clearInterval(timerId); timeLeft=seconds; updateHud();
  timerId=setInterval(()=>{
    timeLeft--; updateHud();
    if(timeLeft===22) notify("Response window narrowing.",true);
    if(timeLeft===12) softAlert();
    if(timeLeft<=0){
      clearInterval(timerId);
      threat+=8; mistakes+=1;
      notify("Window expired. Incident pressure increased.",true);
      setTimeout(()=>advanceRoom(true),750);
    }
  },1000);
}

function sceneVisual(type, count){
  const orbs = Array.from({length:Math.min(count,4)},()=>'<span class="hotspot-orb"></span>').join("");
  return `<div class="scene-visual ${type}">${orbs}</div>`;
}

function renderRoom(){
  selected = new Set();
  const room = scenario.rooms[currentRoom];
  startTimer(scenario.roomTime);
  screen.className="screen transitioning";
  const isAction = room.type === "actions";
  const items = isAction ? room.actions : room.clues;
  screen.innerHTML = `
    <div class="room-shell">
      <div class="room-head">
        <div>
          <div class="room-index">STAGE ${String(room.id).padStart(2,"0")} // ${scenario.incident}</div>
          <h2>${room.title}</h2>
          <p class="room-scene">${room.scene}</p>
        </div>
        <div class="objective-box"><span>OBJECTIVE</span><strong>${room.objective}</strong></div>
      </div>

      <div class="investigation">
        <div class="scene-card">
          <div class="scene-label">LIVE CASE VIEW // ${room.visual.toUpperCase()}</div>
          ${sceneVisual(room.visual, items.length)}
        </div>
        <div class="evidence-panel">
          <h3>${isAction ? "Response actions" : "Evidence candidates"}</h3>
          <p>${isAction ? "Choose the actions you would take. Multiple actions may be appropriate." : "Mark what you believe matters. No immediate correctness feedback will be shown."}</p>
          <div class="${isAction?"action-list":"clue-list"}">
            ${items.map(item=>`
              <button class="${isAction?"action-card":"clue-card"}" data-id="${item.id}" type="button">
                <strong>${item.label}</strong>
                <small>${item.detail}</small>
              </button>`).join("")}
          </div>
        </div>
      </div>

      <div class="room-actions">
        <div class="selection-note" id="selectionNote">Nothing marked yet.</div>
        <button class="continue-btn" id="continueBtn" type="button" disabled>${isAction?"EXECUTE RESPONSE":"LOCK FINDINGS"}</button>
      </div>
    </div>`;

  screen.querySelectorAll(".clue-card,.action-card").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.dataset.id;
      if(selected.has(id)){selected.delete(id);btn.classList.remove("selected");}
      else{selected.add(id);btn.classList.add("selected");tone(610,.045,"sine",.009);}
      const note=document.getElementById("selectionNote");
      note.textContent=selected.size?`${selected.size} item${selected.size===1?"":"s"} marked.`:"Nothing marked yet.";
      document.getElementById("continueBtn").disabled=selected.size===0;
    });
  });
  document.getElementById("continueBtn").addEventListener("click",()=>advanceRoom(false));
  updateHud();
}

function evaluateRoom(room, timedOut){
  const items = room.type === "actions" ? room.actions : room.clues;
  if(room.type === "actions"){
    items.forEach(item=>{
      if(selected.has(item.id)){
        if(item.good){containment+=item.impact; threat-=Math.round(item.impact*.45);}
        else{mistakes+=1; threat+=Math.abs(item.impact);}
      }
    });
    const chosenGood = items.filter(x=>x.good && selected.has(x.id)).length;
    const totalGood = items.filter(x=>x.good).length;
    missed += Math.max(0,totalGood-chosenGood);
    containment=Math.min(100,containment);
  }else{
    items.forEach(item=>{
      const picked=selected.has(item.id);
      if(picked && item.good){evidence+=1; threat-=2;}
      if(picked && !item.good){mistakes+=1; threat+=5;}
      if(!picked && item.good){missed+=1; threat+=2;}
    });
  }
  if(timedOut) threat+=4;
  threat=Math.max(4,Math.min(100,threat));
}

function advanceRoom(timedOut=false){
  clearInterval(timerId);
  const room=scenario.rooms[currentRoom];
  evaluateRoom(room,timedOut);
  softAlert();
  if(Math.random()>.55) setTimeout(()=>thunder(),380);
  currentRoom++;
  if(currentRoom<scenario.rooms.length){
    notify("Findings logged. Moving deeper into the incident.");
    setTimeout(renderRoom,420);
  }else finish();
}

async function finish(){
  clearInterval(timerId);
  const totalEvidence=scenario.rooms.filter(r=>r.clues).flatMap(r=>r.clues).filter(c=>c.good).length;
  const report=await fetch("/api/report",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({evidence,totalEvidence,mistakes,missed,threat,containment})
  }).then(r=>r.json());

  roomMetric.textContent="6/6"; timerMetric.textContent="CLOSED";
  threatMetric.textContent=`${report.threat}%`; evidenceMetric.textContent=evidence;
  footerSignal.textContent=report.outcome==="Contained"?"CASE // CLOSED":"CASE // ESCALATED";

  const timeline=scenario.timeline.map((t,i)=>`<div class="timeline-item ${i===scenario.timeline.length-1?"response":""}"><div class="timeline-time">${t.time}</div><div>${t.event}</div><div class="timeline-stage">${t.stage}</div></div>`).join("");
  const stopIndex = report.outcome === "Contained" ? scenario.attackChain.length-1 : Math.max(2,scenario.attackChain.length-2);
  const chain=scenario.attackChain.map((n,i)=>`${i?'<span class="chain-arrow">→</span>':''}<span class="chain-node ${i===stopIndex?"stop":""}">${n}${i===stopIndex?" // RESPONSE":""}</span>`).join("");

  screen.className="screen transitioning";
  screen.innerHTML=`
    <div class="report-wrap">
      <div class="report-eyebrow">FINAL INCIDENT REPORT // ${scenario.incident}</div>
      <div class="report-title">
        <div><h2>${report.outcome.toUpperCase()}</h2><div class="rank-line">${report.rank}</div></div>
        <div class="outcome-pill">DATA EXPOSURE // ${report.exposure.toUpperCase()}</div>
      </div>
      <p class="report-summary">${report.message}</p>

      <div class="report-grid">
        <div class="report-card"><span>RESPONSE SCORE</span><strong>${report.score}%</strong></div>
        <div class="report-card"><span>EVIDENCE</span><strong>${report.evidenceSummary}</strong></div>
        <div class="report-card"><span>RISKY PICKS</span><strong>${report.mistakes}</strong></div>
        <div class="report-card"><span>MISSED SIGNALS</span><strong>${report.missed}</strong></div>
        <div class="report-card"><span>CONTAINMENT</span><strong>${report.containment}%</strong></div>
      </div>

      <div class="report-section"><h3>INCIDENT TIMELINE</h3><div class="timeline">${timeline}</div></div>
      <div class="report-section"><h3>ATTACK PATH</h3><div class="attack-chain">${chain}</div></div>
      <div class="report-actions"><button class="primary-btn" type="button" onclick="location.reload()">RUN CASE AGAIN</button></div>
    </div>`;
  softAlert(); setTimeout(()=>thunder(),650)}