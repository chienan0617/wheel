// === 1. 初始化設定 ===
const API_URL = "https://chienan0617.github.io/layout/dev.cas.wheel/data.json";
let collections = {};
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 專業撥片音效：低頻、短促
function playTick() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

// === 2. 抓取 API 資料 ===
async function fetchData() {
  const loader = document.getElementById("loadingOverlay");
  try {
    const response = await fetch(API_URL);
    collections = await response.json();
    setupSelector();
    initWheel();
    setTimeout(
      () => (
        (loader.style.opacity = "0"),
        setTimeout(() => (loader.style.display = "none"), 500)
      ),
      800,
    );
  } catch (error) {
    console.error("Data fetch failed:", error);
    Swal.fire({
      title: "連線錯誤",
      text: "無法讀取路線清單",
      icon: "error",
      background: "#0a0a12",
      color: "#fff",
    });
  }
}

// === 3. 變數與 DOM ===
const wheel = document.getElementById("luckyWheel");
const spinBtn = document.getElementById("spinBtn");
const select = document.getElementById("collectionSelect");
const resultDisplay = document.getElementById("resultDisplay");
const totalItemsDisplay = document.getElementById("totalItems");

let currentRotation = 0;
let isSpinning = false;
let history = JSON.parse(localStorage.getItem("cyber_history") || "[]");

const colorPalette = [
  "#4d089a",
  "#1e3a8a",
  "#00d2ff",
  "#f425af",
  "#7000ff",
  "#007bff",
];

function setupSelector() {
  select.innerHTML = "";
  Object.keys(collections).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.innerText = key;
    select.appendChild(opt);
  });
}

function initWheel() {
  const items = collections[select.value] || [];
  const sliceAngle = 360 / items.length;

  let gradient = items.map((item, i) => {
    const color = item.color || colorPalette[i % colorPalette.length];
    return `${color} ${i * (100 / items.length)}% ${(i + 1) * (100 / items.length)}%`;
  });
  wheel.style.background = `conic-gradient(${gradient.join(",")})`;

  wheel.innerHTML = "";
  items.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "wheel-item";
    div.style.transform = `rotate(${i * sliceAngle + sliceAngle / 2}deg)`;
    div.innerHTML = `<div class="wheel-text">${item.text}</div>`;
    wheel.appendChild(div);
  });
  totalItemsDisplay.innerText = items.length;
}

// === 4. 旋轉邏輯 (含動態音效) ===
spinBtn.addEventListener("click", () => {
  if (isSpinning) return;
  const items = collections[select.value];
  if (!items || items.length === 0) return;

  const totalWeight = items.reduce((sum, i) => sum + (i.chance || 1), 0);
  let rand = Math.random() * totalWeight;
  let winnerIndex = 0;
  for (let i = 0; i < items.length; i++) {
    rand -= items[i].chance || 1;
    if (rand <= 0) {
      winnerIndex = i;
      break;
    }
  }

  const slice = 360 / items.length;
  const targetPos = (360 - (winnerIndex * slice + slice / 2)) % 360;
  const rotateTo =
    currentRotation +
    2520 +
    ((targetPos - (currentRotation % 360) + 360) % 360);

  isSpinning = true;
  spinBtn.disabled = true;
  resultDisplay.innerText = "正在決定命運...";
  wheel.style.transform = `rotate(${rotateTo}deg)`;
  currentRotation = rotateTo;

  // --- 動態音效核心：隨速度減慢播放頻率 ---
  let startTime = Date.now();
  const duration = 4000;
  function triggerTick() {
    if (!isSpinning) return;
    playTick();
    let elapsed = Date.now() - startTime;
    let progress = elapsed / duration;
    if (progress < 1) {
      // 延遲時間從 80ms 逐漸增加到 500ms
      let nextTick = 80 + Math.pow(progress, 3) * 500;
      setTimeout(triggerTick, nextTick);
    }
  }
  triggerTick();

  setTimeout(() => {
    isSpinning = false;
    spinBtn.disabled = false;
    showWinner(items[winnerIndex]);
  }, duration);
});

// === 5. 中獎與歷史紀錄 ===
function showWinner(winner) {
  resultDisplay.innerText = winner.text;
  const now = new Date().toLocaleTimeString();
  history.unshift({ ...winner, time: now });
  localStorage.setItem("cyber_history", JSON.stringify(history.slice(0, 20)));

  Swal.fire({
    background: "#0a0a12",
    color: "#fff",
    html: `
      <div class="p-4">
        <div class="text-7xl mb-4">🚇</div>
        <h2 class="text-2xl font-black text-cyber-blue uppercase italic">${winner.text}</h2>
        <p class="mt-4 text-slate-500 text-[10px] tracking-widest">ARRIVED AT ${now}</p>
      </div>
    `,
    confirmButtonText: "收下命運",
    confirmButtonColor: "#4d089a",
    customClass: { popup: "border-2 border-cyber-blue rounded-3xl" },
  });
}

document.getElementById("historyBtn").addEventListener("click", () => {
  const content =
    history
      .map(
        (h) => `
    <div class="flex items-center justify-between p-3 border-b border-white/5">
      <span class="font-bold text-cyber-blue text-sm">${h.text}</span>
      <span class="text-[10px] text-slate-500">${h.time}</span>
    </div>
  `,
      )
      .join("") || '<p class="py-10 text-slate-500">尚無紀錄</p>';

  Swal.fire({
    title: "乘車紀錄",
    background: "#0a0a12",
    color: "#fff",
    html: `<div class="max-h-80 overflow-y-auto">${content}</div>`,
    showConfirmButton: false,
    showCloseButton: true,
    customClass: { popup: "border border-cyber-purple rounded-3xl" },
  });
});

select.addEventListener("change", initWheel);
fetchData();
