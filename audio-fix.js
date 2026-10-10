/* 2026-10-10: supplied timer HTML compatibility patch.
   Load as a classic script AFTER the original script, BEFORE </body>. */
(() => {
  'use strict';
  const CACHE = 'bb-timer-audio-v20261010';
  let ctx = null;
  const buffers = new Map();
  const loads = new Map();
  let runner = null;
  let generation = 0;
  let stopPlayback = null;
  let playingMessage = false;
  let prepareBusy = false;
  let messageEnabled = localStorage.getItem('bbMessageAudioEnabled') !== 'false';

  function status(text) {
    const el = document.getElementById('audioStatus');
    if (el) el.textContent = text;
  }

  function context() {
    if (!ctx || ctx.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('この端末はWeb Audioに対応していません');
      ctx = new AudioContextClass();
    }
    return ctx;
  }

  // Must be invoked directly from a user gesture, before awaiting file loads.
  function unlock() {
    try {
      const c = context();
      const resumed = c.resume();
      // A silent buffer also starts the audio path during the gesture.
      const source = c.createBufferSource();
      source.buffer = c.createBuffer(1, 1, c.sampleRate);
      source.connect(c.destination);
      source.start(0);
      return Promise.resolve(resumed);
    } catch (error) {
      status(error.message);
      return Promise.reject(error);
    }
  }

  async function loadBuffer(file, requirePersistent = false) {
    const url = new URL(file, document.baseURI).href;
    if (buffers.has(url) && !requirePersistent) return buffers.get(url);
    if (loads.has(url) && !requirePersistent) return loads.get(url);
    const work = (async () => {
      let cache = null;
      if ('caches' in window) {
        try { cache = await caches.open(CACHE); } catch (_) {}
      }
      if (requirePersistent && !cache) {
        throw new Error('端末への保存が利用できません。HTTPSで開いてください');
      }
      let response = cache ? await cache.match(url) : null;
      let fromCache = Boolean(response);
      async function decode(res) {
        if (!res || !res.ok || res.status === 206) throw new Error(file + 'を取得できません');
        return context().decodeAudioData(await res.clone().arrayBuffer());
      }
      let buffer;
      if (response) {
        try { buffer = await decode(response); }
        catch (_) { await cache.delete(url); response = null; fromCache = false; }
      }
      if (!response) {
        if (!navigator.onLine) throw new Error(file + 'が端末に保存されていません');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          response = await fetch(url, { cache:'no-store', signal:controller.signal });
          buffer = await decode(response);
        } finally { clearTimeout(timeout); }
      }
      // Save only a complete, successfully decoded file (never an HTML 404 page).
      if (cache && !fromCache) {
        try { await cache.put(url, response.clone()); }
        catch (error) { if (requirePersistent) throw error; }
      }
      buffers.set(url, buffer);
      return buffer;
    })();
    loads.set(url, work);
    try { return await work; }
    finally { if (loads.get(url) === work) loads.delete(url); }
  }

  async function loadChoice(files, persistent = false) {
    let lastError;
    for (const file of (Array.isArray(files) ? files : [files])) {
      try { return await loadBuffer(file, persistent); }
      catch (error) { lastError = error; }
    }
    throw lastError;
  }

  function valid(task, epoch) {
    return !task.cancelled && epoch === generation && (!task.requireFinished || isStillFinished(task.num, task.token));
  }

  async function playChoice(choice, task, epoch) {
    const buffer = await loadChoice(choice);
    if (!valid(task, epoch)) return false;
    if (playingMessage && !messageEnabled) return false;
    const c = context();
    if (c.state !== 'running') {
      throw new Error('「音声を準備・有効化」を押してください');
    }
    return new Promise((resolve, reject) => {
      const source = c.createBufferSource();
      source.buffer = buffer;
      source.connect(c.destination);
      let done = false;
      let watchdog;
      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        source.onended = null;
        try { source.stop(); } catch (_) {}
        source.disconnect();
        if (stopPlayback === cancel) stopPlayback = null;
        currentAudio = null;
        currentFinish = null;
        resolve(ok);
      };
      const cancel = () => finish(false);
      stopPlayback = cancel;
      currentFinish = cancel;
      currentAudio = { pause:cancel, currentTime:0 };
      source.onended = () => finish(true);
      // Release a stalled playback queue; failed calls remain retryable.
      watchdog = setTimeout(() => finish(false), Math.max(5000, buffer.duration * 1000 + 5000));
      try { source.start(0); }
      catch (error) { cancel(); reject(error); }
    });
  }

  function toggleLabel() {
    const btn = document.getElementById('messageAudioBtn');
    if (!btn) return;
    btn.textContent = '案内音声：' + (messageEnabled ? 'ON' : 'OFF');
    btn.setAttribute('aria-pressed', String(messageEnabled));
    btn.style.background = messageEnabled ? '#087a08' : '#666';
  }

  function toggleMessage() {
    messageEnabled = !messageEnabled;
    localStorage.setItem('bbMessageAudioEnabled', String(messageEnabled));
    toggleLabel();
    // OFF takes effect even if a message is currently playing.
    if (!messageEnabled && playingMessage && stopPlayback) stopPlayback();
  }

  async function prepare() {
    if (prepareBusy) return;
    const ready = unlock();
    prepareBusy = true;
    const btn = document.getElementById('prepareAudioBtn');
    btn.disabled = true;
    const missing = [];
    const count = parseInt(document.getElementById('timerCount').value, 10) || 0;
    const start = parseInt(document.getElementById('startNumber').value, 10) || 1;
    const files = Array.from({length:count}, (_, i) => `${start + i}.wav`);
    const choices = [...files, ['bubble.wav','バブル.wav'], ['fuwafuwa.wav','ふわふわ.wav']];
    try {
      await ready;
      for (let i = 0; i < choices.length; i++) {
        status(`音声を保存・確認中 ${i + 1}/${choices.length}`);
        try { await loadChoice(choices[i], true); }
        catch (_) { missing.push(Array.isArray(choices[i]) ? choices[i][0] : choices[i]); }
      }
      if (missing.length) {
        status('保存・確認できなかった音声：' + missing.join('、') + '。オンラインで再確認してください');
      } else {
        status(`音声準備完了：番号${count}件＋案内2件（オフライン再生用）`);
      }
      reconcileAllTimers();
    } catch (error) { status(error.message); }
    finally { prepareBusy = false; btn.disabled = false; }
  }

  // Hold the single runner lock through the gap as well as the playback.
  runAudioQueue = function () {
    if (runner) return runner;
    audioPlaying = true;
    runner = (async () => {
      while (audioQueue.length) {
        const task = audioQueue.shift();
        const epoch = generation;
        if (!valid(task, epoch)) continue;
        currentTask = task;
        updateCallButtonStates();
        let success = false;
        try {
          const numberOK = await playChoice(`${task.num}.wav`, task, epoch);
          if (!numberOK) {
            if (valid(task, epoch)) status('番号音声を再生できませんでした。「音声を準備・有効化」で再試行してください');
          } else if (valid(task, epoch)) {
            // The announcement counts as completed only after the number ends.
            success = true;
            const state = timerStates[task.num];
            if (task.requireFinished && state && state.token === task.token) {
              if (task.callKind === 'first') state.firstCallDone = true;
              if (task.callKind === 'second') state.secondCallDone = true;
              saveTimerStates();
            }
            if (task.callKind === 'first' && messageEnabled) {
              playingMessage = true;
              try { await playChoice(task.messageFiles, task, epoch); }
              catch (_) { status('番号は再生済みです。案内音声を確認してください'); }
              finally { playingMessage = false; }
            }
          }
        } catch (error) { status('音声エラー：' + error.message); }
        finally {
          playingMessage = false;
          currentTask = null;
          updateCallButtonStates();
        }
        // If 3 minutes elapsed during the first call, enqueue the second now.
        if (success && task.callKind === 'first' && valid(task, epoch)) processAutomaticCalls(task.num);
        await sleep(AUDIO_GAP_MS);
      }
    })().finally(() => {
      runner = null;
      audioPlaying = false;
      updateCallButtonStates();
      if (audioQueue.length) runAudioQueue();
    });
    return runner;
  };

  function pending(num, token, kind) {
    const same = t => t && t.num === num && t.token === token && t.callKind === kind;
    return same(currentTask) || audioQueue.some(same);
  }

  enqueueFirstEndCall = function (num, token) {
    if (pending(num, token, 'first')) return;
    enqueueAudioTask({num, token, manual:false, requireFinished:true,
      callKind:'first', messageFiles:messageFilesForMode()});
  };
  enqueueSecondEndCall = function (num, token) {
    if (pending(num, token, 'second')) return;
    enqueueAudioTask({num, token, manual:false, requireFinished:true, callKind:'second'});
  };

  processAutomaticCalls = function (num) {
    const state = timerStates[num];
    const btn = document.getElementById('btn' + num);
    if (!state || state.status !== 'finished' || !btn || btn.getAttribute('data-status') !== 'finished') return;
    if (!state.token) state.token = Date.now() + '_' + num + '_' + Math.random();
    activeCallToken[num] = state.token;
    saveTimerStates();
    if (!state.firstCallDone) enqueueFirstEndCall(num, state.token);
    const due = Number(state.finishedAt) + SECOND_CALL_DELAY_MS;
    // Do not enqueue a second call ahead of a failed/missing first call.
    if (state.firstCallDone && !state.secondCallDone && Date.now() >= due) {
      enqueueSecondEndCall(num, state.token);
    }
    if (!state.secondCallDone && Date.now() < due) scheduleSecondCall(num);
  };

  const originalGenerateTimers = generateTimers;
  generateTimers = function () {
    generation++;
    if (stopPlayback) stopPlayback();
    originalGenerateTimers();
    audioPlaying = Boolean(runner);
    status('番号を変更したときは、オンラインで「音声を準備・有効化」を押してください');
  };
  window.generateTimers = generateTimers;

  const originalRemoveCalls = removeCallsForNumber;
  removeCallsForNumber = function (num) {
    if (currentTask && currentTask.num === num) {
      currentTask.cancelled = true;
      if (stopPlayback) stopPlayback();
    }
    originalRemoveCalls(num);
  };

  document.addEventListener('click', () => {
    unlock().then(() => {
      if (!document.hidden) reconcileAllTimers();
    }).catch(() => {});
  }, true);

  window.addEventListener('load', () => {
    const panel = document.createElement('div');
    panel.style.cssText = 'margin:10px 4px;padding:12px;background:#eef5ff;border:2px solid #2196f3;border-radius:12px;';
    panel.innerHTML = '<button type="button" id="prepareAudioBtn">音声を準備・有効化</button> '
      + '<button type="button" id="messageAudioBtn" aria-pressed="true"></button>'
      + '<p style="margin:8px 0">案内音声は bubble.wav／fuwafuwa.wav です。OFFでも番号は鳴ります。</p>'
      + '<p id="audioStatus" role="status" aria-live="polite">オンラインで音声を準備してください。</p>';
    document.getElementById('controls').after(panel);
    for (const id of ['prepareAudioBtn','messageAudioBtn']) {
      document.getElementById(id).style.cssText = 'font-size:20px;padding:10px 14px;border-radius:10px;color:white;background:#1565c0;margin:4px;';
    }
    document.getElementById('prepareAudioBtn').addEventListener('click', prepare);
    document.getElementById('messageAudioBtn').addEventListener('click', toggleMessage);
    toggleLabel();
  });
})();
