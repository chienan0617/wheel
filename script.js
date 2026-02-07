// === 1. 初始化設定與音效 ===
const API_URL = "https://chienan0617.github.io/layout/dev.cas.wheel/data.json";
let collections = {}; // 從 API 讀取的數據
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTick() {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
  g.gain.setValueAtTime(0.05, audioCtx.currentTime);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

// === 2. 抓取 API 資料 ===
async function fetchData() {
  const loader = document.getElementById("loadingOverlay");
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // 轉換資料格式 (假設 API 原始格式是陣列或特定 Key)
    // 這裡我們預設 API 資料為原本 collections 的結構
    // 如果 API 結構不同，可以在這裡進行 transform
    collections = data;

    setupSelector();
    initWheel();

    setTimeout(() => (loader.style.display = "none"), 800);
  } catch (error) {
    console.error("Data fetch failed:", error);
    Swal.fire("Error", "無法連線至 API", "error");
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

// 預設顏色庫 (以防 API 沒給顏色)
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

  // 生成顏色漸層
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
    div.innerHTML = `
            <div class="wheel-text">
                <span class="text-xl">${item.icon || "💎"}</span>
                <span class="text-[10px] mt-1 tracking-tighter uppercase font-bold">${item.text}</span>
            </div>
        `;
    wheel.appendChild(div);
  });
  totalItemsDisplay.innerText = items.length;
}

// === 4. 旋轉邏輯 ===
spinBtn.addEventListener("click", () => {
  if (isSpinning) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const items = collections[select.value];
  const totalWeight = items.reduce((sum, i) => sum + (i.chance || 1), 0);

  // 1. 權重抽獎
  let rand = Math.random() * totalWeight;
  let winnerIndex = 0;
  for (let i = 0; i < items.length; i++) {
    rand -= items[i].chance || 1;
    if (rand <= 0) {
      winnerIndex = i;
      break;
    }
  }

  // 2. 計算旋轉角度 (視覺均等分)
  const slice = 360 / items.length;
  const targetPos = (360 - (winnerIndex * slice + slice / 2)) % 360;
  const rotateTo =
    currentRotation +
    2160 +
    ((targetPos - (currentRotation % 360) + 360) % 360);

  isSpinning = true;
  spinBtn.disabled = true;
  resultDisplay.innerText = "Analyzing...";

  wheel.style.transform = `rotate(${rotateTo}deg)`;
  currentRotation = rotateTo;

  // 聲音特效
  const timer = setInterval(playTick, 150);

  setTimeout(() => {
    clearInterval(timer);
    isSpinning = false;
    spinBtn.disabled = false;
    showWinner(items[winnerIndex]);
  }, 4000);
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
                <div class="text-7xl mb-4 drop-shadow-[0_0_15px_#00d2ff]">${winner.icon || "🎁"}</div>
                <h2 class="text-3xl font-black text-cyber-blue italic uppercase">${winner.text}</h2>
                <div class="mt-4 h-1 w-full bg-gradient-to-r from-cyber-purple to-cyber-pink"></div>
                <p class="mt-4 text-slate-400 text-xs">REWARD SECURED AT ${now}</p>
            </div>
        `,
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
            <div class="flex items-center gap-3">
                <span class="text-xl">${h.icon || "✨"}</span>
                <span class="font-bold text-cyber-blue">${h.text}</span>
            </div>
            <span class="text-[10px] text-slate-500">${h.time}</span>
        </div>
    `,
      )
      .join("") || '<p class="py-10 text-slate-500">No records found</p>';

  Swal.fire({
    title: "MISSION HISTORY",
    background: "#0a0a12",
    color: "#fff",
    html: `<div class="max-h-80 overflow-y-auto">${content}</div>`,
    showConfirmButton: false,
    showCloseButton: true,
    customClass: { popup: "border border-cyber-purple rounded-3xl" },
  });
});

select.addEventListener("change", initWheel);

// 啟動 API 抓取
fetchData();
