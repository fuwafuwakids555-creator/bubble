<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>バブルボール＆ふわふわ タイマー</title>

  <link rel="manifest" href="./manifest.json">
  <meta name="theme-color" content="#111111">

  <style>
    h1 { font-size:26px; margin-bottom:6px; }
    #deviceLabel { margin:4px 0; }

    #networkStatus {
      font-size:18px;
      font-weight:bold;
      padding:8px 12px;
      border-radius:10px;
      display:inline-block;
      margin:6px 4px;
    }

    .online { background:#d9f7d9; color:#087a08; }
    .offline { background:#ffd6d6; color:#b00020; }

    #controls {
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:6px;
      flex-wrap:wrap;
      font-size:16px;
    }

    #timerCount, #startNumber, #playMode {
      font-size:16px;
      padding:2px;
      width:90px;
    }

    #createBtn, #salesBtn, #hideSalesBtn, #deviceBtn, #flushBtn {
      font-size:22px;
      padding:10px 18px;
      border-radius:10px;
      cursor:pointer;
      font-weight:bold;
      margin:8px 4px;
    }

    #flushBtn { background:#2196F3; color:white; }
    #salesBtn { background:#111; color:white; }
    #hideSalesBtn { background:#666; color:white; display:none; }

    #timers {
      display:grid;
      grid-template-columns:repeat(7, 1fr);
      gap:15px;
      width:100%;
      margin-top:6px;
    }

    .timer { text-align:center; }

    button.timerBtn {
      width:100%;
      height:70px;
      font-size:40px;
      font-weight:bold;
      border-radius:16px;
      cursor:pointer;
      padding:0;
    }

    .waiting { background:#808080; color:white; }
    .running { background:green; color:white; }
    .finished { background:red; color:white; }

    .callBtn {
      margin-top:4px;
      width:100%;
      height:38px;
      font-size:18px;
      background:#ff9800;
      color:white;
      border:none;
      border-radius:10px;
      font-weight:bold;
      cursor:pointer;
    }

    .callBtnQueued {
      background:#FFD600 !important;
      color:#000 !important;
      border:3px solid #FF9800 !important;
      animation:waitingBlink 0.9s infinite;
    }

    .callBtnPlaying {
      background:#2ecc71 !important;
      color:white !important;
      border:3px solid #1f8f4d !important;
    }

    @keyframes waitingBlink {
      0% { background:#FFD600; }
      50% { background:#FFF176; }
      100% { background:#FFD600; }
    }

    .refundBtn { background:#b00020; color:white; font-size:24px !important; }
    .yenBtn { background:#ff9800; color:white; font-size:24px !important; }
    .ownerBtn { background:#673ab7; color:white; font-size:21px !important; }
    .changeBtn { background:#00897b; color:white; font-size:21px !important; }

    .timeRow {
      display:flex;
      justify-content:center;
      align-items:center;
      gap:4px;
      margin:4px 0;
    }

    .timeRow label { font-size:18px; }
    .timeRow select { font-size:18px; padding:2px 4px; }

    .displayText { font-size:18px; margin-top:2px; font-weight:bold; }
    .displayUp { font-size:18px; font-weight:bold; margin-top:2px; }

    @keyframes blink {
      0% { color:red; }
      50% { color:transparent; }
      100% { color:red; }
    }

    .blink { animation:blink 1s step-start infinite; font-weight:bold; }

    #summary, #dailySummary {
      display:none;
      margin-top:14px;
      border-top:1px solid #ccc;
      padding-top:8px;
      font-size:16px;
    }

    #summary h2, #dailySummary h2 { font-size:20px; margin:6px 0; }
    #dailySummary input[type=date] { font-size:16px; margin-bottom:4px; }
  </style>

  <script>
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      });
    }
  </script>
</head>

<body>
  <h1>バブルボール＆ふわふわ　タイマー</h1>
  <h2 id="deviceLabel"></h2>

  <div id="networkStatus">確認中</div>

  <div id="controls">
    <label>タイマー数:</label>
    <select id="timerCount">
      <option value="10">10</option>
      <option value="15">15</option>
      <option value="20">20</option>
      <option value="25">25</option>
      <option value="30" selected>30</option>
      <option value="35">35</option>
      <option value="40">40</option>
      <option value="45">45</option>
      <option value="50">50</option>
    </select>

    <label>開始番号:</label>
    <input type="number" id="startNumber" value="1" min="1" max="999">

    <label>モード:</label>
    <select id="playMode" onchange="savePlayMode()">
      <option value="fuwafuwa">ふわふわ</option>
      <option value="bubble">バブル</option>
    </select>

    <button id="createBtn" onclick="generateTimers()">個数確定</button>
    <button id="deviceBtn" onclick="changeDeviceName()">端末名変更</button>
  </div>

  <div id="timers"></div>

  <button id="flushBtn" onclick="flushOfflineQueue(true)">未送信を送信</button>
  <button id="salesBtn" onclick="showSales()">売上を見る</button>
  <button id="hideSalesBtn" onclick="hideSales()">売上を隠す</button>

  <div id="summary">
    <h2>今日の履歴と売上</h2>
    <p>10分：<span id="count10">0回</span>（売上：<span id="fee10">0円</span>）</p>
    <p>20分：<span id="count20">0回</span>（売上：<span id="fee20">0円</span>）</p>
    <p>30分：<span id="count30">0回</span>（売上：<span id="fee30">0円</span>）</p>
    <p>500円返金：<span id="refund500Count">0回</span>（返金：<span id="refund500Fee">0円</span>）</p>
    <p>一万円札：<span id="yen10000Count">0回</span></p>
    <h2>今日のキャンセル回数：<span id="cancelCount">0回</span></h2>
    <h2>今日の売上合計：<span id="feeTotal">0円</span></h2>
  </div>

  <div id="dailySummary">
    <h2>日付ごとの集計</h2>
    <label>集計日：</label>
    <input type="date" id="summaryDate">
    <p>10分：<span id="sum10">0回</span>（売上：<span id="sumFee10">0円</span>）</p>
    <p>20分：<span id="sum20">0回</span>（売上：<span id="sumFee20">0円</span>）</p>
    <p>30分：<span id="sum30">0回</span>（売上：<span id="sumFee30">0円</span>）</p>
    <p>500円返金：<span id="sumRefund500">0回</span>（返金：<span id="sumRefund500Fee">0円</span>）</p>
    <p>一万円札：<span id="sumYen10000">0回</span></p>
    <p>キャンセル回数：<span id="sumCancel">0回</span></p>
    <h2>その日の売上合計：<span id="sumFeeTotal">0円</span></h2>
  </div>

<script>
const GAS_URL = "https://script.google.com/macros/s/AKfycbyT3SeO06Z5fpoZWbBZPmLrbEO88n7Dlx6vDhwwqJ5ZBIO-x7xSFAWKVXp88y6e_8d_aA/exec";
const SALES_PIN = "4181";

const SECOND_CALL_DELAY_MS = 180000;
const AUDIO_GAP_MS = 1000;

let DEVICE_NAME =
  localStorage.getItem("deviceName") ||
  prompt("端末名を入力してください") ||
  "未設定";

localStorage.setItem("deviceName", DEVICE_NAME);

let intervals = {};
let afterIntervals = {};
let timeoutHandles = {};
let activeCallToken = {};
let timerStates = {};

let audioQueue = [];
let audioPlaying = false;
let currentAudio = null;
let currentTask = null;
let currentFinish = null;

let press10 = 0;
let press20 = 0;
let press30 = 0;
let cancelCount = 0;
let refund500Count = 0;
let yen10000Count = 0;
let dailyStats = {};
let currentDateKey = "";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function ensureCurrentDate() {
  const today = getTodayKey();
  if (today === currentDateKey) return;

  currentDateKey = today;
  loadTodayCountersFromDailyStats();

  const summaryDateInput = document.getElementById("summaryDate");
  if (summaryDateInput && !summaryDateInput.value) {
    summaryDateInput.value = currentDateKey;
  }
}

function yen(n) {
  return Number(n).toLocaleString("ja-JP") + "円";
}

function getPrice(minutes) {
  if (minutes === 10) return 500;
  if (minutes === 20) return 500;
  if (minutes === 30) return 1000;
  return 0;
}

function getItemKey(minutes) {
  if (minutes === 10) return "p10";
  if (minutes === 20) return "p20";
  if (minutes === 30) return "p30";
  return "";
}

/* =========================
   オフライン送信
========================= */
function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem("offlineSendQueue") || "[]");
  } catch(e) {
    return [];
  }
}

function saveOfflineQueue(queue) {
  localStorage.setItem("offlineSendQueue", JSON.stringify(queue));
  updateNetworkStatus();
}

function sendToSheet(data) {
  data._queuedAt = Date.now();
  data._deviceSavedName = DEVICE_NAME;

  if (!navigator.onLine) {
    const queue = getOfflineQueue();
    queue.push(data);
    saveOfflineQueue(queue);
    return;
  }

  fetch(GAS_URL, {
    method:"POST",
    mode:"no-cors",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body:JSON.stringify(data)
  }).catch(() => {
    const queue = getOfflineQueue();
    queue.push(data);
    saveOfflineQueue(queue);
  });
}

function flushOfflineQueue(showMessage) {
  if (!navigator.onLine) {
    updateNetworkStatus();

    if (showMessage) {
      alert("オフライン中です。オンラインになってから送信します。");
    }
    return;
  }

  const queue = getOfflineQueue();

  if (queue.length === 0) {
    updateNetworkStatus();

    if (showMessage) {
      alert("未送信データはありません");
    }
    return;
  }

  fetch(GAS_URL, {
    method:"POST",
    mode:"no-cors",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body:JSON.stringify(queue)
  }).then(() => {
    localStorage.removeItem("offlineSendQueue");
    updateNetworkStatus();

    if (showMessage) {
      alert(queue.length + "件の未送信データを送信しました");
    }
  }).catch(() => {
    updateNetworkStatus();

    if (showMessage) {
      alert("送信に失敗しました。データは保存されています。");
    }
  });
}

function updateNetworkStatus() {
  const el = document.getElementById("networkStatus");
  if (!el) return;

  const count = getOfflineQueue().length;

  if (navigator.onLine) {
    el.className = "online";
    el.textContent =
      count > 0
        ? `オンライン・未送信 ${count}件`
        : "オンライン・未送信なし";
  } else {
    el.className = "offline";
    el.textContent = `オフライン・未送信 ${count}件`;
  }
}

window.addEventListener("online", () => {
  updateNetworkStatus();
  flushOfflineQueue(false);
  reconcileAllTimers();
});

window.addEventListener("offline", updateNetworkStatus);

/* =========================
   売上保存
========================= */
function loadDailyStats() {
  try {
    dailyStats = JSON.parse(
      localStorage.getItem("bbTimerDailyStats") || "{}"
    );
  } catch(e) {
    dailyStats = {};
  }
}

function saveDailyStats() {
  localStorage.setItem(
    "bbTimerDailyStats",
    JSON.stringify(dailyStats)
  );
}

function loadTimerStates() {
  try {
    timerStates = JSON.parse(
      localStorage.getItem("bbTimerStates") || "{}"
    );
  } catch(e) {
    timerStates = {};
  }
}

function saveTimerStates() {
  localStorage.setItem(
    "bbTimerStates",
    JSON.stringify(timerStates)
  );
}

function loadTodayCountersFromDailyStats() {
  const data = dailyStats[currentDateKey] || {};

  press10 = data.press10 || 0;
  press20 = data.press20 || 0;
  press30 = data.press30 || 0;
  cancelCount = data.cancel || 0;
  refund500Count = data.refund500 || 0;
  yen10000Count = data.yen10000 || 0;

  updateCountersDisplay();
}

function syncTodayToDailyStats() {
  ensureCurrentDate();

  dailyStats[currentDateKey] = {
    press10,
    press20,
    press30,
    cancel:cancelCount,
    refund500:refund500Count,
    yen10000:yen10000Count
  };

  saveDailyStats();
}

function updateCountersDisplay() {
  const count10 = document.getElementById("count10");
  if (!count10) return;

  document.getElementById("count10").textContent = press10 + "回";
  document.getElementById("count20").textContent = press20 + "回";
  document.getElementById("count30").textContent = press30 + "回";
  document.getElementById("cancelCount").textContent = cancelCount + "回";
  document.getElementById("refund500Count").textContent = refund500Count + "回";
  document.getElementById("yen10000Count").textContent = yen10000Count + "回";

  const fee10 = press10 * 500;
  const fee20 = press20 * 500;
  const fee30 = press30 * 1000;
  const refund500 = refund500Count * 500;
  const total = fee10 + fee20 + fee30 - refund500;

  document.getElementById("fee10").textContent = yen(fee10);
  document.getElementById("fee20").textContent = yen(fee20);
  document.getElementById("fee30").textContent = yen(fee30);
  document.getElementById("refund500Fee").textContent = "-" + yen(refund500);
  document.getElementById("feeTotal").textContent = yen(total);

  updateDailySummaryView(
    document.getElementById("summaryDate")?.value || currentDateKey
  );
}

function updateDailySummaryView(dateKey) {
  const data = dailyStats[dateKey] || {};

  const fee10 = (data.press10 || 0) * 500;
  const fee20 = (data.press20 || 0) * 500;
  const fee30 = (data.press30 || 0) * 1000;
  const refund500 = (data.refund500 || 0) * 500;
  const total = fee10 + fee20 + fee30 - refund500;

  const sum10 = document.getElementById("sum10");
  if (!sum10) return;

  document.getElementById("sum10").textContent =
    (data.press10 || 0) + "回";
  document.getElementById("sum20").textContent =
    (data.press20 || 0) + "回";
  document.getElementById("sum30").textContent =
    (data.press30 || 0) + "回";
  document.getElementById("sumCancel").textContent =
    (data.cancel || 0) + "回";
  document.getElementById("sumRefund500").textContent =
    (data.refund500 || 0) + "回";
  document.getElementById("sumYen10000").textContent =
    (data.yen10000 || 0) + "回";

  document.getElementById("sumFee10").textContent = yen(fee10);
  document.getElementById("sumFee20").textContent = yen(fee20);
  document.getElementById("sumFee30").textContent = yen(fee30);
  document.getElementById("sumRefund500Fee").textContent =
    "-" + yen(refund500);
  document.getElementById("sumFeeTotal").textContent = yen(total);
}

function showSales() {
  sendToSheet({
    type:"sales_view",
    ts:Date.now(),
    device:DEVICE_NAME,
    page:"ふわふわタイマー",
    message:"売上を見るボタンが押されました"
  });

  const pin = prompt("暗証番号を入力してください");

  if (pin !== SALES_PIN) {
    alert("暗証番号が違います");
    return;
  }

  document.getElementById("summary").style.display = "block";
  document.getElementById("dailySummary").style.display = "block";
  document.getElementById("hideSalesBtn").style.display = "inline-block";
}

function hideSales() {
  document.getElementById("summary").style.display = "none";
  document.getElementById("dailySummary").style.display = "none";
  document.getElementById("hideSalesBtn").style.display = "none";
}

function refund500() {
  ensureCurrentDate();
  refund500Count++;

  syncTodayToDailyStats();
  updateCountersDisplay();

  sendToSheet({
    type:"sale",
    ts:Date.now(),
    device:DEVICE_NAME,
    key:"refund500",
    name:"500円返金",
    unitPrice:-500,
    qty:1,
    subtotal:-500
  });
}

function notifyYen10000() {
  ensureCurrentDate();
  yen10000Count++;
  syncTodayToDailyStats();
  updateCountersDisplay();

  const btn = document.getElementById("yen10000Btn");

  if (btn) {
    btn.innerHTML = "送信中";
    btn.disabled = true;
  }

  sendToSheet({
    type:"yen10000",
    ts:Date.now(),
    device:DEVICE_NAME,
    page:"ふわふわタイマー",
    message:"一万円札が使用されました"
  });

  setTimeout(() => {
    if (btn) {
      btn.innerHTML = "一万円札";
      btn.disabled = false;
    }
  }, 1200);
}

function notifyOwner() {
  const btn = document.getElementById("ownerCallBtn");

  if (btn) {
    btn.innerHTML = "送信中";
    btn.disabled = true;
  }

  // 一万円札ボタンと同じ通知ルートを使い、
  // 一万円札カウントには加算しない
  sendToSheet({
    type:"owner_call",
    ts:Date.now(),
    device:DEVICE_NAME,
    page:"ふわふわタイマー",
    message:"オーナー呼び出しです"
  });

  setTimeout(() => {
    if (btn) {
      btn.innerHTML = "オーナー<br>呼び出し";
      btn.disabled = false;
    }
  }, 1200);
}


function notifyChange() {
  const btn = document.getElementById("changeCallBtn");

  if (btn) {
    btn.innerHTML = "送信中";
    btn.disabled = true;
  }

  // GAS側で change_call はオーナー1だけへLINE通知
  sendToSheet({
    type:"change_call",
    ts:Date.now(),
    device:DEVICE_NAME,
    page:"ふわふわタイマー",
    message:"両替の呼び出しです"
  });

  setTimeout(() => {
    if (btn) {
      btn.innerHTML = "両替";
      btn.disabled = false;
    }
  }, 1200);
}

/* =========================
   音声キュー
========================= */
function isStillFinished(num, token) {
  const btn = document.getElementById("btn" + num);
  const state = timerStates[num];

  return (
    btn &&
    state &&
    state.status === "finished" &&
    btn.getAttribute("data-status") === "finished" &&
    activeCallToken[num] === token
  );
}

function playAudioFile(file) {
  return new Promise(resolve => {
    const audio = new Audio(file);
    currentAudio = audio;

    let done = false;

    currentFinish = () => {
      if (done) return;

      done = true;
      currentAudio = null;
      currentFinish = null;
      resolve(false);
    };

    audio.onended = () => {
      if (done) return;

      done = true;
      currentAudio = null;
      currentFinish = null;
      resolve(true);
    };

    audio.onerror = currentFinish;
    audio.play().catch(currentFinish);
  });
}

async function playAudioChoice(files) {
  const list = Array.isArray(files) ? files : [files];

  for (const file of list) {
    const ok = await playAudioFile(file);
    if (ok) return true;
  }

  return false;
}

function stopCurrentAudioIfNum(num) {
  if (
    currentTask &&
    currentTask.num === num &&
    currentAudio
  ) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch(e) {}

    if (currentFinish) {
      currentFinish();
    }
  }
}

function enqueueAudioTask(task) {
  audioQueue.push(task);
  updateCallButtonStates();
  runAudioQueue();
}

async function runAudioQueue() {
  if (audioPlaying) return;

  while (audioQueue.length > 0) {
    const task = audioQueue.shift();

    if (
      task.requireFinished &&
      !isStillFinished(task.num, task.token)
    ) {
      continue;
    }

    audioPlaying = true;
    currentTask = task;
    updateCallButtonStates();

    for (const fileChoice of task.files) {
      if (
        task.requireFinished &&
        !isStillFinished(task.num, task.token)
      ) {
        break;
      }

      await playAudioChoice(fileChoice);
    }

    currentTask = null;
    audioPlaying = false;
    updateCallButtonStates();

    await sleep(AUDIO_GAP_MS);
  }

  updateCallButtonStates();
}

function updateCallButtonStates() {
  document.querySelectorAll(".callBtn").forEach(btn => {
    btn.classList.remove(
      "callBtnQueued",
      "callBtnPlaying"
    );

    btn.disabled = false;
    btn.textContent = "🔊 呼び出し";
  });

  if (
    currentTask &&
    currentTask.manual &&
    currentTask.callBtn
  ) {
    currentTask.callBtn.classList.add("callBtnPlaying");
    currentTask.callBtn.disabled = true;
    currentTask.callBtn.textContent = "▶ 再生中";
  }

  const manualTasks =
    audioQueue.filter(task => task.manual && task.callBtn);

  manualTasks.forEach((task, index) => {
    task.callBtn.classList.add("callBtnQueued");
    task.callBtn.textContent = "待機中 " + (index + 1);
  });
}

function messageFilesForMode() {
  const mode = document.getElementById("playMode").value;

  return mode === "bubble"
    ? ["bubble.wav", "バブル.wav"]
    : ["fuwafuwa.wav", "ふわふわ.wav"];
}

function enqueueFirstEndCall(num, token) {
  enqueueAudioTask({
    num,
    token,
    manual:false,
    requireFinished:true,
    files:[
      `${num}.wav`,
      messageFilesForMode()
    ]
  });
}

function enqueueSecondEndCall(num, token) {
  enqueueAudioTask({
    num,
    token,
    manual:false,
    requireFinished:true,
    files:[
      `${num}.wav`
    ]
  });
}

function callNumber(num, btn) {
  enqueueAudioTask({
    num,
    token:"manual_" + Date.now(),
    manual:true,
    requireFinished:false,
    callBtn:btn,
    files:[
      `${num}.wav`
    ]
  });
}

/* =========================
   タイマー・呼び出し予約
========================= */
function clearTimerHandles(num) {
  if (intervals[num]) {
    clearInterval(intervals[num]);
    intervals[num] = null;
  }

  if (afterIntervals[num]) {
    clearInterval(afterIntervals[num]);
    afterIntervals[num] = null;
  }

  if (timeoutHandles[num]) {
    timeoutHandles[num].forEach(id => clearTimeout(id));
    timeoutHandles[num] = [];
  }
}

function removeCallsForNumber(num) {
  activeCallToken[num] = null;

  audioQueue = audioQueue.filter(
    item => item.num !== num
  );

  stopCurrentAudioIfNum(num);
  updateCallButtonStates();
}

function scheduleSecondCall(num) {
  const state = timerStates[num];

  if (
    !state ||
    state.status !== "finished" ||
    state.secondCallDone
  ) {
    return;
  }

  if (timeoutHandles[num]) {
    timeoutHandles[num].forEach(id => clearTimeout(id));
  }

  const dueAt =
    Number(state.finishedAt) + SECOND_CALL_DELAY_MS;

  const delay = Math.max(0, dueAt - Date.now());

  timeoutHandles[num] = [
    setTimeout(() => {
      processAutomaticCalls(num);
    }, delay)
  ];
}

function processAutomaticCalls(num) {
  const state = timerStates[num];

  if (!state || state.status !== "finished") {
    return;
  }

  const button = document.getElementById("btn" + num);

  if (
    !button ||
    button.getAttribute("data-status") !== "finished"
  ) {
    return;
  }

  if (!state.token) {
    state.token =
      Date.now() + "_" + num + "_" + Math.random();
  }

  activeCallToken[num] = state.token;

  if (!state.firstCallDone) {
    state.firstCallDone = true;
    enqueueFirstEndCall(num, state.token);
  }

  const secondDueAt =
    Number(state.finishedAt) + SECOND_CALL_DELAY_MS;

  if (
    !state.secondCallDone &&
    Date.now() >= secondDueAt
  ) {
    state.secondCallDone = true;
    enqueueSecondEndCall(num, state.token);
  }

  saveTimerStates();

  if (!state.secondCallDone) {
    scheduleSecondCall(num);
  }
}

function generateTimers() {
  const container = document.getElementById("timers");

  Object.keys(intervals).forEach(k => {
    clearInterval(intervals[k]);
  });

  Object.keys(afterIntervals).forEach(k => {
    clearInterval(afterIntervals[k]);
  });

  Object.keys(timeoutHandles).forEach(k => {
    timeoutHandles[k].forEach(id => clearTimeout(id));
  });

  intervals = {};
  afterIntervals = {};
  timeoutHandles = {};
  activeCallToken = {};

  audioQueue = [];

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch(e) {}

    if (currentFinish) {
      currentFinish();
    }
  }

  currentTask = null;
  audioPlaying = false;
  updateCallButtonStates();

  container.innerHTML = "";

  const count =
    parseInt(
      document.getElementById("timerCount").value,
      10
    ) || 0;

  const start =
    parseInt(
      document.getElementById("startNumber").value,
      10
    ) || 1;

  localStorage.setItem("timerCount", String(count));
  localStorage.setItem("startNumber", String(start));

  for (let i = 0; i < count; i++) {
    const num = start + i;
    const div = document.createElement("div");

    div.className = "timer";

    div.innerHTML = `
      <button id="btn${num}" class="timerBtn waiting" data-status="waiting" onclick="handleButton(${num})">${num}</button>

      <button id="callBtn${num}" class="callBtn" onclick="callNumber(${num}, this)">🔊 呼び出し</button>

      <div class="timeRow">
        <label>時間:</label>
        <select id="time${num}">
          <option value="600" selected>10分</option>
          <option value="1200">20分</option>
          <option value="1800">30分</option>
        </select>
      </div>

      <p id="display${num}" class="displayText">未開始</p>
    `;

    container.appendChild(div);
  }

  const refundDiv = document.createElement("div");
  refundDiv.className = "timer";
  refundDiv.innerHTML = `
    <button id="refundBtn" class="timerBtn refundBtn" onclick="refund500()">500円<br>返金</button>
    <p class="displayText">返金</p>
  `;
  container.appendChild(refundDiv);

  const yenDiv = document.createElement("div");
  yenDiv.className = "timer";
  yenDiv.innerHTML = `
    <button id="yen10000Btn" class="timerBtn yenBtn" onclick="notifyYen10000()">一万円札</button>
    <p class="displayText">LINE通知</p>
  `;
  container.appendChild(yenDiv);

  const changeDiv = document.createElement("div");
  changeDiv.className = "timer";
  changeDiv.innerHTML = `
    <button id="changeCallBtn" class="timerBtn changeBtn" onclick="notifyChange()">両替</button>
    <p class="displayText">LINE通知</p>
  `;
  container.appendChild(changeDiv);

  const ownerDiv = document.createElement("div");
  ownerDiv.className = "timer";
  ownerDiv.innerHTML = `
    <button id="ownerCallBtn" class="timerBtn ownerBtn" onclick="notifyOwner()">オーナー<br>呼び出し</button>
    <p class="displayText">LINE通知</p>
  `;
  container.appendChild(ownerDiv);

  restoreVisibleTimers(start, count);
}

function handleButton(num) {
  const button = document.getElementById("btn" + num);
  if (!button) return;

  const status = button.getAttribute("data-status");

  if (status === "waiting") {
    startTimer(num);
  } else if (status === "running") {
    cancelTimer(num);
  } else if (status === "finished") {
    resetTimer(num);
  }
}

function startTimer(num) {
  ensureCurrentDate();

  const timeSelect =
    document.getElementById("time" + num);

  const setTimeSec =
    parseInt(timeSelect.value, 10) || 0;

  const minutes = setTimeSec / 60;
  const price = getPrice(minutes);

  clearTimerHandles(num);
  removeCallsForNumber(num);

  if (minutes === 10) press10++;
  if (minutes === 20) press20++;
  if (minutes === 30) press30++;

  syncTodayToDailyStats();
  updateCountersDisplay();

  sendToSheet({
    type:"sale",
    ts:Date.now(),
    device:DEVICE_NAME,
    key:getItemKey(minutes),
    name:minutes + "分",
    unitPrice:price,
    qty:1,
    subtotal:price
  });

  const startedAt = Date.now();
  const endAt = startedAt + setTimeSec * 1000;

  timerStates[num] = {
    status:"running",
    startedAt,
    endAt,
    selectedValue:String(setTimeSec),
    finishedAt:null,
    token:null,
    firstCallDone:false,
    secondCallDone:false
  };

  saveTimerStates();

  applyRunningState(
    num,
    endAt,
    String(setTimeSec)
  );
}

function applyRunningState(num, endAt, selectedValue) {
  const display =
    document.getElementById("display" + num);

  const button =
    document.getElementById("btn" + num);

  const sel =
    document.getElementById("time" + num);

  if (!display || !button) return;

  if (sel && selectedValue) {
    sel.value = selectedValue;
  }

  button.className = "timerBtn running";
  button.setAttribute("data-status", "running");

  display.style.color = "black";
  display.classList.remove("displayUp");

  if (intervals[num]) {
    clearInterval(intervals[num]);
  }

  const tick = () => {
    const remain =
      Math.ceil((Number(endAt) - Date.now()) / 1000);

    if (remain > 0) {
      display.textContent = formatTime(remain);

      if (remain <= 30) {
        display.classList.add("blink");
      } else {
        display.classList.remove("blink");
      }

      return;
    }

    clearInterval(intervals[num]);
    intervals[num] = null;

    finishTimer(num, {
      finishedAt:Number(endAt),
      processCalls:true
    });
  };

  tick();

  intervals[num] =
    setInterval(tick, 1000);
}

function finishTimer(num, options = {}) {
  const display =
    document.getElementById("display" + num);

  const button =
    document.getElementById("btn" + num);

  if (!display || !button) return;

  const oldState = timerStates[num] || {};

  const finishedAt =
    Number(options.finishedAt) ||
    Number(oldState.endAt) ||
    Date.now();

  clearTimerHandles(num);

  display.textContent = "時間です！";
  display.classList.remove("blink");
  display.style.color = "red";

  button.className = "timerBtn finished";
  button.setAttribute("data-status", "finished");

  const token =
    oldState.token ||
    Date.now() + "_" + num + "_" + Math.random();

  activeCallToken[num] = token;

  timerStates[num] = {
    ...oldState,
    status:"finished",
    finishedAt,
    token,
    firstCallDone:Boolean(oldState.firstCallDone),
    secondCallDone:Boolean(oldState.secondCallDone)
  };

  saveTimerStates();
  startAfterCounter(num, finishedAt);

  if (options.processCalls !== false) {
    processAutomaticCalls(num);
  }
}

function startAfterCounter(num, finishedAt) {
  const display =
    document.getElementById("display" + num);

  if (!display) return;

  if (afterIntervals[num]) {
    clearInterval(afterIntervals[num]);
  }

  const tick = () => {
    const afterSec =
      Math.max(
        0,
        Math.floor(
          (Date.now() - Number(finishedAt)) / 1000
        )
      );

    display.innerHTML =
      `終了後:<br>${formatTime(afterSec)}`;

    display.classList.add("displayUp");
  };

  tick();

  afterIntervals[num] =
    setInterval(tick, 1000);
}

function restoreVisibleTimers(start, count) {
  const validNums = new Set();

  for (let i = 0; i < count; i++) {
    validNums.add(String(start + i));
  }

  Object.keys(timerStates).forEach(numStr => {
    if (!validNums.has(numStr)) return;

    const num = Number(numStr);
    const state = timerStates[numStr];

    if (!state) return;

    if (state.status === "running") {
      if (Number(state.endAt) > Date.now()) {
        applyRunningState(
          num,
          Number(state.endAt),
          state.selectedValue || "600"
        );
      } else {
        finishTimer(num, {
          finishedAt:Number(state.endAt),
          processCalls:true
        });
      }
    } else if (state.status === "finished") {
      const button =
        document.getElementById("btn" + num);

      const display =
        document.getElementById("display" + num);

      if (!button || !display) return;

      button.className = "timerBtn finished";
      button.setAttribute(
        "data-status",
        "finished"
      );

      const token =
        state.token ||
        Date.now() + "_" + num + "_" + Math.random();

      state.token = token;
      activeCallToken[num] = token;
      saveTimerStates();

      startAfterCounter(
        num,
        Number(state.finishedAt || Date.now())
      );

      processAutomaticCalls(num);
    }
  });
}

function reconcileAllTimers() {
  ensureCurrentDate();

  Object.keys(timerStates).forEach(numStr => {
    const num = Number(numStr);
    const state = timerStates[numStr];

    if (!state || !Number.isFinite(num)) return;

    const button =
      document.getElementById("btn" + num);

    if (!button) return;

    if (state.status === "running") {
      if (Number(state.endAt) > Date.now()) {
        applyRunningState(
          num,
          Number(state.endAt),
          state.selectedValue || "600"
        );
      } else {
        finishTimer(num, {
          finishedAt:Number(state.endAt),
          processCalls:true
        });
      }

      return;
    }

    if (state.status === "finished") {
      button.className = "timerBtn finished";
      button.setAttribute(
        "data-status",
        "finished"
      );

      if (!state.token) {
        state.token =
          Date.now() + "_" + num + "_" + Math.random();
      }

      activeCallToken[num] = state.token;
      saveTimerStates();

      startAfterCounter(
        num,
        Number(state.finishedAt || Date.now())
      );

      processAutomaticCalls(num);
    }
  });
}

function cancelTimer(num) {
  clearTimerHandles(num);
  removeCallsForNumber(num);

  delete timerStates[num];
  saveTimerStates();

  const button =
    document.getElementById("btn" + num);

  const display =
    document.getElementById("display" + num);

  if (!button || !display) return;

  button.className = "timerBtn waiting";
  button.setAttribute("data-status", "waiting");

  display.textContent = "未開始";
  display.style.color = "black";
  display.classList.remove("blink", "displayUp");

  ensureCurrentDate();
  cancelCount++;

  syncTodayToDailyStats();
  updateCountersDisplay();

  const sel =
    document.getElementById("time" + num);

  if (sel) {
    sel.value = "600";
  }
}

function resetTimer(num) {
  clearTimerHandles(num);
  removeCallsForNumber(num);

  delete timerStates[num];
  saveTimerStates();

  const button =
    document.getElementById("btn" + num);

  const display =
    document.getElementById("display" + num);

  if (!button || !display) return;

  button.className = "timerBtn waiting";
  button.setAttribute("data-status", "waiting");

  display.textContent = "未開始";
  display.style.color = "black";
  display.classList.remove("blink", "displayUp");

  const sel =
    document.getElementById("time" + num);

  if (sel) {
    sel.value = "600";
  }
}

function formatTime(seconds) {
  seconds = Number(seconds) || 0;

  if (seconds < 0) {
    seconds = 0;
  }

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m}分${s}秒`;
}

function changeDeviceName() {
  const name =
    prompt(
      "端末名を入力してください",
      DEVICE_NAME
    );

  if (!name) return;

  DEVICE_NAME = name;

  localStorage.setItem(
    "deviceName",
    DEVICE_NAME
  );

  document.getElementById("deviceLabel").textContent =
    "端末名：" + DEVICE_NAME;

  alert(
    "端末名を変更しました\n\n" +
    DEVICE_NAME
  );
}

function savePlayMode() {
  localStorage.setItem(
    "playMode",
    document.getElementById("playMode").value
  );
}

/* =========================
   起動・復帰
========================= */
window.addEventListener("load", () => {
  currentDateKey = getTodayKey();

  loadDailyStats();
  loadTimerStates();

  const savedCount =
    localStorage.getItem("timerCount");

  const savedStart =
    localStorage.getItem("startNumber");

  if (savedCount) {
    document.getElementById("timerCount").value =
      savedCount;
  }

  if (savedStart) {
    document.getElementById("startNumber").value =
      savedStart;
  }

  loadTodayCountersFromDailyStats();

  document.getElementById("playMode").value =
    localStorage.getItem("playMode") ||
    "fuwafuwa";

  document.getElementById("deviceLabel").textContent =
    "端末名：" + DEVICE_NAME;

  generateTimers();

  const summaryDateInput =
    document.getElementById("summaryDate");

  summaryDateInput.value =
    currentDateKey;

  updateDailySummaryView(currentDateKey);

  summaryDateInput.addEventListener(
    "change",
    () => {
      updateDailySummaryView(
        summaryDateInput.value ||
        currentDateKey
      );
    }
  );

  updateNetworkStatus();
  flushOfflineQueue(false);
  reconcileAllTimers();
});

document.addEventListener(
  "visibilitychange",
  () => {
    if (!document.hidden) {
      reconcileAllTimers();
    }
  }
);

window.addEventListener(
  "focus",
  reconcileAllTimers
);

window.addEventListener(
  "pageshow",
  reconcileAllTimers
);

window.generateTimers = generateTimers;
window.handleButton = handleButton;
window.showSales = showSales;
window.hideSales = hideSales;
window.refund500 = refund500;
window.notifyYen10000 = notifyYen10000;
window.notifyOwner = notifyOwner;
window.notifyChange = notifyChange;
window.changeDeviceName = changeDeviceName;
window.savePlayMode = savePlayMode;
window.callNumber = callNumber;
window.flushOfflineQueue = flushOfflineQueue;
</script>
</body>
</html>
