
(() => {
  const PLAN = window.BLS_PLAN;
  const STORAGE_KEY = "blsCutTracker.v1";
  const app = document.getElementById("app");
  const navItems = Array.from(document.querySelectorAll(".navItem"));
  const modal = document.getElementById("modal");
  const toast = document.getElementById("toast");
  let toastTimer = null;

  let state = loadState();
  let currentView = "today";
  let ui = {
    todayDate: fmtDate(new Date()),
    selectedDay: null,
    planWeek: 1,
    planDay: 1
  };

  function defaultState(){
    return {
      settings: {
        startDate: fmtDate(new Date()),
        weightUnit: "lb",
        startBodyWeight: PLAN.meta.ownerProfile.bodyWeightLb,
        goal: PLAN.meta.ownerProfile.goal,
        stepsGoal: 10000,
        proteinGoal: 190
      },
      workoutLogs: {},
      bodyLogs: [],
      cardioLogs: [],
      recoveryLogs: []
    };
  }

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {...defaultState(), ...parsed, settings: {...defaultState().settings, ...(parsed.settings || {})}};
    } catch (err) {
      console.warn(err);
      return defaultState();
    }
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function fmtDate(d){
    const date = new Date(d);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0,10);
  }

  function parseDate(s){
    const [y,m,d] = (s || fmtDate(new Date())).split("-").map(Number);
    return new Date(y, m-1, d);
  }

  function daysBetween(a,b){
    return Math.floor((parseDate(a) - parseDate(b)) / 86400000);
  }

  function scheduleForDate(dateStr){
    const diff = Math.max(0, daysBetween(dateStr, state.settings.startDate));
    const week = Math.min(12, Math.floor(diff / 7) + 1);
    const day = (diff % 7) + 1;
    return {week, day};
  }

  function phaseForWeek(week){
    if (week <= 4) return PLAN.meta.phases[0];
    if (week <= 8) return PLAN.meta.phases[1];
    if (week === 9) return PLAN.meta.phases[2];
    return PLAN.meta.phases[3];
  }

  function dayByNumber(n){ return PLAN.days.find(d => d.day === Number(n)) || PLAN.days[0]; }

  function targetSetsForWeek(ex, week){
    if (week === 9) return Math.max(1, Math.ceil((ex.sets || 1) * 0.5));
    return ex.sets || 1;
  }

  function targetRPEForWeek(ex, week){
    if (week === 9) return Math.min(7, Math.max(6, (ex.targetRPE || 7) - 1.5));
    if (week >= 10 && (ex.targetRPE || 0) >= 8) return Math.min(9, ex.targetRPE + 0.25);
    return ex.targetRPE || 7;
  }

  function topRepTarget(repText){
    const nums = String(repText || "").match(/\d+/g);
    if (!nums || !nums.length) return null;
    return Number(nums[nums.length - 1]);
  }

  function lowRepTarget(repText){
    const nums = String(repText || "").match(/\d+/g);
    if (!nums || !nums.length) return null;
    return Number(nums[0]);
  }

  function logKey(date, dayNum, exIndex){
    return `${date}|d${dayNum}|e${exIndex}`;
  }

  function getExerciseLog(date, dayNum, exIndex, ex, week){
    const key = logKey(date, dayNum, exIndex);
    const setCount = targetSetsForWeek(ex, week);
    if (!state.workoutLogs[key]) {
      state.workoutLogs[key] = {
        date, dayNum, exerciseName: ex.name,
        sets: Array.from({length:setCount}, () => ({weight:"", reps:"", rpe:"", done:false})),
        kneePain: "",
        notes: ""
      };
      saveState();
    }
    while (state.workoutLogs[key].sets.length < setCount) {
      state.workoutLogs[key].sets.push({weight:"", reps:"", rpe:"", done:false});
    }
    return state.workoutLogs[key];
  }

  function calcVolume(log){
    return (log?.sets || []).reduce((sum, s) => {
      const w = Number(s.weight), r = Number(s.reps);
      return sum + ((isFinite(w) && isFinite(r) && w > 0 && r > 0) ? w*r : 0);
    }, 0);
  }

  function calcTopE1RM(log){
    let best = 0;
    (log?.sets || []).forEach(s => {
      const w = Number(s.weight), r = Number(s.reps);
      if (isFinite(w) && isFinite(r) && w > 0 && r > 0) {
        best = Math.max(best, w * (1 + r/30));
      }
    });
    return best;
  }

  function avgRPE(log){
    const vals = (log?.sets || []).map(s => Number(s.rpe)).filter(n => isFinite(n) && n > 0);
    if (!vals.length) return 0;
    return vals.reduce((a,b)=>a+b,0)/vals.length;
  }

  function completedSets(log){
    return (log?.sets || []).filter(s => s.done || (Number(s.weight)>0 && Number(s.reps)>0)).length;
  }

  function progressionAdvice(log, ex, week){
    if (!log || !(log.sets || []).some(s => Number(s.reps) > 0)) return "Log your working sets to get a progression suggestion.";
    const top = topRepTarget(ex.reps);
    const targetRPE = targetRPEForWeek(ex, week);
    const usable = (log.sets || []).filter(s => Number(s.reps) > 0);
    const allTop = top && usable.length >= targetSetsForWeek(ex, week) && usable.every(s => Number(s.reps) >= top);
    const avg = avgRPE(log);
    if (week === 9) return "Deload week: keep this easy. Do not chase PRs.";
    if (allTop && avg > 0 && avg <= targetRPE + 0.5 && ex.progression > 0) return `Progress next time: add about ${ex.progression} ${state.settings.weightUnit}.`;
    if (allTop && ex.progression === 0) return "Progress by adding time, cleaner reps, or slightly harder variation next time.";
    if (avg >= targetRPE + 1) return "Hold or slightly reduce load next time; effort is running high for this phase.";
    return "Hold load until you hit the top of the rep range across all target sets.";
  }

  function allWorkoutLogsArray(){
    return Object.values(state.workoutLogs || {});
  }

  function weeklyWorkoutSummary(){
    const rows = {};
    allWorkoutLogsArray().forEach(log => {
      const sched = scheduleForDate(log.date);
      const key = `Week ${sched.week}`;
      if (!rows[key]) rows[key] = {week:sched.week, sessions:new Set(), volume:0, sets:0, e1rm:0};
      rows[key].sessions.add(log.date);
      rows[key].volume += calcVolume(log);
      rows[key].sets += completedSets(log);
      rows[key].e1rm = Math.max(rows[key].e1rm, calcTopE1RM(log));
    });
    return Object.values(rows).sort((a,b)=>a.week-b.week).map(r => ({...r, sessions:r.sessions.size}));
  }

  function latestBodyLog(){
    return [...state.bodyLogs].sort((a,b)=>a.date.localeCompare(b.date)).at(-1) || null;
  }

  function firstBodyLog(){
    return [...state.bodyLogs].sort((a,b)=>a.date.localeCompare(b.date))[0] || null;
  }

  function escapeHtml(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function showToast(message, tone="good"){
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast ${tone}`;
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
  }

  function dailyWorkoutProgress(date, day, week){
    if (!day.exercises.length) {
      const done = state.recoveryLogs.some(log => log.date === date && log.type === day.name);
      return {done: done ? 1 : 0, total: 1, pct: done ? 100 : 0};
    }
    const total = day.exercises.reduce((sum, ex) => sum + targetSetsForWeek(ex, week), 0);
    const done = day.exercises.reduce((sum, ex, index) => {
      const log = getExerciseLog(date, day.day, index, ex, week);
      return sum + Math.min(completedSets(log), targetSetsForWeek(ex, week));
    }, 0);
    return {done, total, pct: total ? Math.round((done / total) * 100) : 0};
  }

  function setNav(view){
    navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  }

  function render(view=currentView){
    currentView = view;
    setNav(view);
    if (view === "today") renderToday();
    if (view === "plan") renderPlan();
    if (view === "body") renderBody();
    if (view === "cardio") renderCardio();
    if (view === "progress") renderProgress();
    if (view === "settings") renderSettings();
  }

  function renderToday(){
    const scheduled = scheduleForDate(ui.todayDate);
    if (!ui.selectedDay) ui.selectedDay = scheduled.day;
    const week = scheduled.week;
    const day = dayByNumber(ui.selectedDay);
    const phase = phaseForWeek(week);
    const progress = dailyWorkoutProgress(ui.todayDate, day, week);
    const progressLabel = day.exercises.length ? `${progress.done}/${progress.total} sets done` : `${progress.done}/${progress.total} recovery done`;

    let html = `
      <section class="heroCard">
        <div class="heroTop">
          <div>
            <p class="eyebrow">Today</p>
            <h2 class="heroTitle">Week ${week}, day ${day.day}</h2>
            <p class="heroSub">${escapeHtml(day.name)}. ${escapeHtml(phase.name)}: ${escapeHtml(phase.focus)}</p>
          </div>
          <span class="programMark">W${week}</span>
        </div>
        <div class="heroMetrics">
          <div class="metricTile"><strong>${progress.pct}%</strong><span>${progressLabel}</span></div>
          <div class="metricTile"><strong>${day.exercises.length || "0"}</strong><span>${day.type.toLowerCase()} blocks</span></div>
          <div class="metricTile"><strong>${Number(state.settings.stepsGoal).toLocaleString()}</strong><span>step target</span></div>
        </div>
        <div class="controlsStrip">
          <div><label>Date</label><input id="todayDate" type="date" value="${ui.todayDate}"></div>
          <div><label>Workout Day</label><select id="todayDay">${PLAN.days.map(d=>`<option value="${d.day}" ${d.day===day.day?'selected':''}>Day ${d.day}: ${escapeHtml(d.name)}</option>`).join("")}</select></div>
        </div>
      </section>

      <section class="card">
        <div class="between">
          <div>
            <h2>${escapeHtml(day.name)}</h2>
            <p class="sectionLead">${escapeHtml(day.type)}. ${escapeHtml(day.cardio || "")}</p>
          </div>
          <span class="pill ${week===9?'warn':'good'}">${week===9?'Deload':'Training'}</span>
          <span class="badgeDay">D${day.day}</span>
        </div>
        ${day.day===3 ? `<div class="warnBox"><strong>Knee check:</strong> pain should stay at 0-3/10. Use pain-free depth and swap movements if needed.</div>` : ""}
      </section>
    `;

    if (!day.exercises.length) {
      html += `
        <section class="card">
          <h2>${day.type === "Rest" ? "Rest Day" : "Active Recovery"}</h2>
          <p>${escapeHtml(day.cardio)}</p>
          <div class="grid">
            <button class="primaryBtn" data-mark-recovery="${day.day}" type="button">Mark Recovery Done</button>
            <button class="ghostBtn" data-view-jump="cardio" type="button">Log Steps/Cardio</button>
          </div>
        </section>
      `;
    } else {
      day.exercises.forEach((ex, i) => {
        const log = getExerciseLog(ui.todayDate, day.day, i, ex, week);
        const sets = log.sets.slice(0, targetSetsForWeek(ex, week));
        const volume = calcVolume(log);
        const e1rm = calcTopE1RM(log);
        html += `
          <section class="card exerciseCard" data-ex="${i}" data-day="${day.day}">
            <div class="exerciseTitle">
              <div>
                <h3>${i+1}. ${escapeHtml(ex.name)}</h3>
                <div class="target">Target: ${targetSetsForWeek(ex, week)} sets, ${escapeHtml(ex.reps)} reps, RPE ${targetRPEForWeek(ex, week)}</div>
              </div>
              <span class="pill">${escapeHtml(ex.category)}</span>
            </div>
            <p class="tiny">${escapeHtml(ex.notes)}</p>
            ${sets.map((s, setIndex) => `
              <div class="setGrid" data-set="${setIndex}">
                <div class="setNumber">S${setIndex+1}</div>
                <div><label>Weight</label><input data-field="weight" inputmode="decimal" type="number" step="0.5" value="${escapeHtml(s.weight)}" placeholder="${state.settings.weightUnit}"></div>
                <div><label>Reps</label><input data-field="reps" inputmode="numeric" type="number" step="1" value="${escapeHtml(s.reps)}" placeholder="${escapeHtml(ex.reps)}"></div>
                <div class="rpeCell"><label>RPE</label><input data-field="rpe" inputmode="decimal" type="number" min="1" max="10" step="0.5" value="${escapeHtml(s.rpe)}" placeholder="${targetRPEForWeek(ex, week)}"></div>
                <div class="checkCell"><input data-field="done" type="checkbox" ${s.done ? "checked" : ""} title="Done"></div>
              </div>
            `).join("")}
            <div class="grid stack">
              <div><label>Knee pain 0-10</label><input data-field="kneePain" type="number" min="0" max="10" step="1" value="${escapeHtml(log.kneePain)}" placeholder="0"></div>
              <div><label>Notes</label><input data-field="notes" type="text" value="${escapeHtml(log.notes)}" placeholder="Form, pain, energy..."></div>
            </div>
            <div class="metricGrid two">
              <div class="metricTile"><strong>${Math.round(volume).toLocaleString()}</strong><span>volume ${state.settings.weightUnit}</span></div>
              <div class="metricTile"><strong>${e1rm ? Math.round(e1rm) : "-"}</strong><span>estimated 1RM</span></div>
            </div>
            <div class="advice">${escapeHtml(progressionAdvice(log, ex, week))}</div>
          </section>
        `;
      });
    }

    html += `<div class="footerSpace"></div>`;
    app.innerHTML = html;

    document.getElementById("todayDate").addEventListener("change", e => {
      ui.todayDate = e.target.value;
      const s = scheduleForDate(ui.todayDate);
      ui.selectedDay = s.day;
      renderToday();
    });
    document.getElementById("todayDay").addEventListener("change", e => {
      ui.selectedDay = Number(e.target.value);
      renderToday();
    });

    app.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("input", onWorkoutInput);
      input.addEventListener("change", onWorkoutInput);
    });
    app.querySelectorAll("[data-view-jump]").forEach(btn => btn.addEventListener("click", e => render(e.currentTarget.dataset.viewJump)));
    app.querySelectorAll("[data-mark-recovery]").forEach(btn => btn.addEventListener("click", () => {
      state.recoveryLogs = state.recoveryLogs.filter(log => !(log.date === ui.todayDate && log.type === day.name));
      state.recoveryLogs.push({date:ui.todayDate, type:day.name, done:true, notes:day.cardio});
      saveState();
      showToast("Recovery day saved.");
      renderToday();
    }));
  }

  function onWorkoutInput(e){
    const card = e.target.closest(".exerciseCard");
    if (!card) return;
    const exIndex = Number(card.dataset.ex);
    const dayNum = Number(card.dataset.day);
    const week = scheduleForDate(ui.todayDate).week;
    const day = dayByNumber(dayNum);
    const ex = day.exercises[exIndex];
    const log = getExerciseLog(ui.todayDate, dayNum, exIndex, ex, week);
    const field = e.target.dataset.field;
    const setRow = e.target.closest(".setGrid");
    if (setRow) {
      const setIndex = Number(setRow.dataset.set);
      if (!log.sets[setIndex]) log.sets[setIndex] = {weight:"", reps:"", rpe:"", done:false};
      log.sets[setIndex][field] = field === "done" ? e.target.checked : e.target.value;
    } else {
      log[field] = e.target.value;
    }
    const knee = Number(log.kneePain);
    if (field === "kneePain" && knee > 3) {
      e.target.style.borderColor = "rgba(239,145,135,.9)";
    } else if (field === "kneePain") {
      e.target.style.borderColor = "";
    }
    saveState();
  }

  function renderPlan(){
    const phaseList = PLAN.meta.phases.map(p => `<li><strong>Weeks ${escapeHtml(p.weeks)}:</strong> ${escapeHtml(p.name)} - ${escapeHtml(p.focus)}</li>`).join("");
    const days = PLAN.days.map(day => `
      <details ${day.day === ui.planDay ? "open" : ""}>
        <summary>Day ${day.day} - ${escapeHtml(day.name)} <span class="tiny">(${escapeHtml(day.type)})</span></summary>
        <p class="tiny">${escapeHtml(day.cardio || "")}</p>
        ${day.exercises.length ? `
          <div class="tableWrap">
            <table>
              <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>RPE</th><th>Notes</th></tr></thead>
              <tbody>
                ${day.exercises.map(ex => `<tr><td>${escapeHtml(ex.name)}</td><td>${ex.sets}</td><td>${escapeHtml(ex.reps)}</td><td>${escapeHtml(ex.targetRPE)}</td><td>${escapeHtml(ex.notes)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        ` : `<p>${escapeHtml(day.cardio)}</p>`}
      </details>
    `).join("");

    app.innerHTML = `
      <section class="card">
        <p class="eyebrow">Program</p>
        <h2>12-Week BLS-Style Cut Plan</h2>
        <p class="tiny">This is your preloaded 4-5 day/week plan for fat loss, muscle retention/gain, and strength maintenance.</p>
        <ul class="phaseList">${phaseList}</ul>
      </section>
      <section class="card">
        <h2>Progression Rules</h2>
        ${PLAN.meta.rules.map(r => `<p class="notice">${escapeHtml(r)}</p>`).join("")}
      </section>
      <section class="card">
        <h2>Day-by-Day Plan</h2>
        ${days}
      </section>
    `;
  }

  function renderBody(){
    const rows = [...state.bodyLogs].sort((a,b)=>b.date.localeCompare(a.date));
    const latest = latestBodyLog();
    const first = firstBodyLog();
    const lost = latest && first && latest.weight && first.weight ? Number(latest.weight) - Number(first.weight) : 0;
    app.innerHTML = `
      <section class="card">
        <p class="eyebrow">Body Composition</p>
        <h2>Weight, Waist, Calories, Protein</h2>
        <div class="grid3">
          <div class="subcard"><div class="metricLabel">Latest Weight</div><div class="bigMetric">${latest?.weight ? latest.weight + " lb" : "-"}</div></div>
          <div class="subcard"><div class="metricLabel">Change</div><div class="bigMetric">${latest && first ? (lost>0?"+":"") + lost.toFixed(1) + " lb" : "-"}</div></div>
          <div class="subcard"><div class="metricLabel">Protein Goal</div><div class="bigMetric">${state.settings.proteinGoal}g</div></div>
        </div>
      </section>
      <section class="card">
        <h2>Add Body Log</h2>
        <div class="grid">
          <div><label>Date</label><input id="bodyDate" type="date" value="${fmtDate(new Date())}"></div>
          <div><label>Body Weight lb</label><input id="bodyWeight" type="number" inputmode="decimal" step="0.1" placeholder="220.0"></div>
          <div><label>Waist inches</label><input id="bodyWaist" type="number" inputmode="decimal" step="0.1" placeholder="Optional"></div>
          <div><label>Calories</label><input id="bodyCalories" type="number" inputmode="numeric" step="1" placeholder="Optional"></div>
          <div><label>Protein grams</label><input id="bodyProtein" type="number" inputmode="numeric" step="1" placeholder="${state.settings.proteinGoal}"></div>
          <div><label>Sleep hours</label><input id="bodySleep" type="number" inputmode="decimal" step="0.1" placeholder="Optional"></div>
        </div>
        <div class="stack"><label>Notes</label><textarea id="bodyNotes" rows="2" placeholder="Hunger, energy, sodium, travel, alcohol, etc."></textarea></div>
        <button id="saveBody" class="primaryBtn full formActions" type="button">Save Body Log</button>
      </section>
      <section class="card">
        <h2>History</h2>
        ${rows.length ? `<div class="tableWrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Waist</th><th>Calories</th><th>Protein</th><th>Sleep</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.date}</td><td>${r.weight||""}</td><td>${r.waist||""}</td><td>${r.calories||""}</td><td>${r.protein||""}</td><td>${r.sleep||""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="emptyState">No body logs yet. Add a morning weigh-in to start the trend.</p>`}
      </section>
    `;
    document.getElementById("saveBody").addEventListener("click", () => {
      state.bodyLogs.push({
        date: document.getElementById("bodyDate").value,
        weight: document.getElementById("bodyWeight").value,
        waist: document.getElementById("bodyWaist").value,
        calories: document.getElementById("bodyCalories").value,
        protein: document.getElementById("bodyProtein").value,
        sleep: document.getElementById("bodySleep").value,
        notes: document.getElementById("bodyNotes").value
      });
      saveState();
      showToast("Body log saved.");
      renderBody();
    });
  }

  function renderCardio(){
    const rows = [...state.cardioLogs].sort((a,b)=>b.date.localeCompare(a.date));
    const last7Start = new Date(); last7Start.setDate(last7Start.getDate()-6);
    const recent = state.cardioLogs.filter(r => parseDate(r.date) >= last7Start);
    const steps = recent.reduce((s,r)=>s+(Number(r.steps)||0),0);
    const minutes = recent.reduce((s,r)=>s+(Number(r.minutes)||0),0);
    app.innerHTML = `
      <section class="card">
        <p class="eyebrow">Conditioning</p>
        <h2>Cardio + Steps</h2>
        <div class="grid">
          <div class="subcard"><div class="metricLabel">Last 7 Days Steps</div><div class="bigMetric">${steps.toLocaleString()}</div></div>
          <div class="subcard"><div class="metricLabel">Last 7 Days Cardio</div><div class="bigMetric">${minutes} min</div></div>
        </div>
        <p class="tiny">Primary cut target: ${Number(state.settings.stepsGoal).toLocaleString()} steps/day plus 2-4 low-impact cardio sessions/week.</p>
      </section>
      <section class="card">
        <h2>Add Cardio / Steps</h2>
        <div class="grid">
          <div><label>Date</label><input id="cardioDate" type="date" value="${fmtDate(new Date())}"></div>
          <div><label>Type</label><select id="cardioType"><option>Walking</option><option>Incline treadmill</option><option>Bike</option><option>Elliptical</option><option>Other</option></select></div>
          <div><label>Minutes</label><input id="cardioMinutes" type="number" inputmode="numeric" placeholder="30"></div>
          <div><label>RPE</label><input id="cardioRPE" type="number" inputmode="decimal" min="1" max="10" step="0.5" placeholder="5"></div>
          <div><label>Steps</label><input id="cardioSteps" type="number" inputmode="numeric" placeholder="${state.settings.stepsGoal}"></div>
          <div><label>Knee Pain 0-10</label><input id="cardioKnee" type="number" min="0" max="10" step="1" placeholder="0"></div>
        </div>
        <div class="stack"><label>Notes</label><textarea id="cardioNotes" rows="2" placeholder="Pace, incline, machine, knee response..."></textarea></div>
        <button id="saveCardio" class="primaryBtn full formActions" type="button">Save Cardio Log</button>
      </section>
      <section class="card">
        <h2>History</h2>
        ${rows.length ? `<div class="tableWrap"><table><thead><tr><th>Date</th><th>Type</th><th>Min</th><th>RPE</th><th>Steps</th><th>Knee</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.date}</td><td>${escapeHtml(r.type)}</td><td>${r.minutes||""}</td><td>${r.rpe||""}</td><td>${r.steps||""}</td><td>${r.kneePain||""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="emptyState">No cardio logs yet. Record steps or an easy session to build the weekly picture.</p>`}
      </section>
    `;
    document.getElementById("saveCardio").addEventListener("click", () => {
      state.cardioLogs.push({
        date: document.getElementById("cardioDate").value,
        type: document.getElementById("cardioType").value,
        minutes: document.getElementById("cardioMinutes").value,
        rpe: document.getElementById("cardioRPE").value,
        steps: document.getElementById("cardioSteps").value,
        kneePain: document.getElementById("cardioKnee").value,
        notes: document.getElementById("cardioNotes").value
      });
      saveState();
      showToast("Cardio log saved.");
      renderCardio();
    });
  }

  function renderProgress(){
    const summaries = weeklyWorkoutSummary();
    const latest = latestBodyLog();
    const first = firstBodyLog();
    const weightChange = latest && first && latest.weight && first.weight ? Number(latest.weight) - Number(first.weight) : null;
    const sessions = new Set(allWorkoutLogsArray().map(l=>l.date)).size;
    const totalVol = allWorkoutLogsArray().reduce((s,l)=>s+calcVolume(l),0);
    const topE1RM = allWorkoutLogsArray().reduce((m,l)=>Math.max(m, calcTopE1RM(l)),0);

    app.innerHTML = `
      <section class="card">
        <p class="eyebrow">Dashboard</p>
        <h2>Progress Snapshot</h2>
        <div class="grid">
          <div class="subcard"><div class="metricLabel">Workout Days Logged</div><div class="bigMetric">${sessions}</div></div>
          <div class="subcard"><div class="metricLabel">Total Volume</div><div class="bigMetric">${Math.round(totalVol).toLocaleString()}</div></div>
          <div class="subcard"><div class="metricLabel">Weight Change</div><div class="bigMetric">${weightChange === null ? "-" : (weightChange>0?"+":"") + weightChange.toFixed(1) + " lb"}</div></div>
          <div class="subcard"><div class="metricLabel">Best Est. 1RM</div><div class="bigMetric">${topE1RM ? Math.round(topE1RM) + " lb" : "-"}</div></div>
        </div>
      </section>
      <section class="card">
        <h2>Body Weight Trend</h2>
        <canvas id="weightChart" width="700" height="260" aria-label="Body weight chart"></canvas>
      </section>
      <section class="card">
        <h2>Weekly Volume Trend</h2>
        <canvas id="volumeChart" width="700" height="260" aria-label="Weekly volume chart"></canvas>
      </section>
      <section class="card">
        <h2>Weekly Summary</h2>
        ${summaries.length ? `<div class="tableWrap"><table><thead><tr><th>Week</th><th>Sessions</th><th>Sets</th><th>Volume</th><th>Top e1RM</th></tr></thead><tbody>${summaries.map(r=>`<tr><td>${r.week}</td><td>${r.sessions}</td><td>${r.sets}</td><td>${Math.round(r.volume).toLocaleString()}</td><td>${r.e1rm?Math.round(r.e1rm):""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="emptyState">No workout logs yet. Complete sets on Today to unlock weekly volume and strength trends.</p>`}
      </section>
    `;
    drawLineChart("weightChart", [...state.bodyLogs].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({x:r.date, y:Number(r.weight)})).filter(p=>isFinite(p.y)), "lb");
    drawLineChart("volumeChart", summaries.map(r=>({x:`W${r.week}`, y:Math.round(r.volume)})), "vol");
  }

  function drawLineChart(id, points, suffix){
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "rgba(255,255,255,.035)";
    ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "rgba(246,241,232,.14)";
    ctx.lineWidth = 1;
    for(let i=0;i<5;i++){
      const y = 28 + i*(h-56)/4;
      ctx.beginPath(); ctx.moveTo(44,y); ctx.lineTo(w-18,y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(246,241,232,.72)";
    ctx.font = "24px Aptos, Segoe UI, sans-serif";
    if (points.length < 2) {
      ctx.fillText("Add more logs to see a trend", 44, 130);
      return;
    }
    const ys = points.map(p=>p.y);
    let min = Math.min(...ys), max = Math.max(...ys);
    if (min === max) { min -= 1; max += 1; }
    const xScale = i => 44 + i*(w-72)/(points.length-1);
    const yScale = y => h-34 - (y-min)*(h-72)/(max-min);
    ctx.strokeStyle = "rgba(215,244,99,.95)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((p,i) => {
      const x = xScale(i), y = yScale(p.y);
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.fillStyle = "rgba(229,167,95,.95)";
    points.forEach((p,i) => {
      const x = xScale(i), y = yScale(p.y);
      ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = "rgba(246,241,232,.78)";
    ctx.font = "18px Aptos, Segoe UI, sans-serif";
    ctx.fillText(`${max.toFixed(suffix==="lb"?1:0)} ${suffix}`, 44, 24);
    ctx.fillText(`${min.toFixed(suffix==="lb"?1:0)} ${suffix}`, 44, h-10);
  }

  function renderSettings(){
    app.innerHTML = `
      <section class="card">
        <p class="eyebrow">Settings</p>
        <h2>Program Setup</h2>
        <div class="grid">
          <div><label>Program Start Date</label><input id="startDate" type="date" value="${state.settings.startDate}"></div>
          <div><label>Weight Unit</label><select id="weightUnit"><option value="lb" ${state.settings.weightUnit==="lb"?"selected":""}>lb</option><option value="kg" ${state.settings.weightUnit==="kg"?"selected":""}>kg</option></select></div>
          <div><label>Steps Goal</label><input id="stepsGoal" type="number" value="${state.settings.stepsGoal}"></div>
          <div><label>Protein Goal g/day</label><input id="proteinGoal" type="number" value="${state.settings.proteinGoal}"></div>
        </div>
        <button id="saveSettings" class="primaryBtn full formActions" type="button">Save Settings</button>
      </section>
      <section class="card">
        <h2>Backup / Export</h2>
        <p class="tiny">Your data is private to this browser. Export often, especially before clearing Safari data or changing phones.</p>
        <div class="grid">
          <button id="exportJson" class="primaryBtn" type="button">Export JSON Backup</button>
          <button id="exportCsv" class="ghostBtn" type="button">Export Workout CSV</button>
        </div>
        <hr>
        <label>Import JSON Backup</label>
        <input id="importFile" type="file" accept="application/json">
      </section>
      <section class="card">
        <h2>Reset</h2>
        <p class="tiny">This deletes local app data on this device only. Export first if you want a backup.</p>
        <button id="resetData" class="dangerBtn full" type="button">Reset Local Data</button>
      </section>
      <section class="card">
        <h2>Install on iPhone</h2>
        <p>Open this app in Safari, tap the Share icon, then choose <strong>Add to Home Screen</strong>.</p>
        <p class="tiny">For full offline/PWA behavior, serve the folder from an HTTPS static host. Opening the HTML file directly is okay for testing, but service-worker offline caching requires HTTPS or localhost.</p>
      </section>
    `;

    document.getElementById("saveSettings").addEventListener("click", () => {
      state.settings.startDate = document.getElementById("startDate").value;
      state.settings.weightUnit = document.getElementById("weightUnit").value;
      state.settings.stepsGoal = Number(document.getElementById("stepsGoal").value) || 10000;
      state.settings.proteinGoal = Number(document.getElementById("proteinGoal").value) || 190;
      saveState();
      showToast("Settings saved.");
    });

    document.getElementById("exportJson").addEventListener("click", () => downloadJson());
    document.getElementById("exportCsv").addEventListener("click", () => downloadWorkoutCsv());
    document.getElementById("importFile").addEventListener("change", importJson);
    document.getElementById("resetData").addEventListener("click", e => {
      const btn = e.currentTarget;
      if (btn.dataset.confirming === "true") {
        localStorage.removeItem(STORAGE_KEY);
        state = defaultState();
        saveState();
        showToast("Local data reset.");
        renderSettings();
        return;
      }
      btn.dataset.confirming = "true";
      btn.textContent = "Tap again to reset data";
      showToast("Tap reset again to confirm.", "bad");
      setTimeout(() => {
        if (!btn.isConnected) return;
        btn.dataset.confirming = "false";
        btn.textContent = "Reset Local Data";
      }, 3200);
    });
  }

  function download(filename, text, type="text/plain"){
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function downloadJson(){
    const payload = {exportedAt:new Date().toISOString(), planName:PLAN.meta.name, data:state};
    download(`forgelab-backup-${fmtDate(new Date())}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function downloadWorkoutCsv(){
    const rows = [["date","day","exercise","set","weight","reps","rpe","done","volume","est_1rm","knee_pain","notes"]];
    Object.values(state.workoutLogs).forEach(log => {
      (log.sets || []).forEach((s,i) => {
        const w = Number(s.weight), r = Number(s.reps);
        const vol = (isFinite(w)&&isFinite(r)) ? w*r : "";
        const e1 = (isFinite(w)&&isFinite(r)&&w>0&&r>0) ? Math.round(w*(1+r/30)) : "";
        rows.push([log.date, log.dayNum, log.exerciseName, i+1, s.weight, s.reps, s.rpe, s.done, vol, e1, log.kneePain, log.notes]);
      });
    });
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    download(`forgelab-workouts-${fmtDate(new Date())}.csv`, csv, "text/csv");
  }

  function importJson(e){
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        state = imported.data || imported;
        saveState();
        showToast("Backup imported.");
        renderSettings();
      } catch(err) {
        showToast("Could not import that file.", "bad");
      }
    };
    reader.readAsText(file);
  }

  navItems.forEach(btn => btn.addEventListener("click", () => render(btn.dataset.view)));
  document.getElementById("installHelpBtn").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("closeModal").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(err => console.warn("Service worker unavailable", err));
    });
  }

  render("today");
})();
