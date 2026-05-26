const STORAGE_KEY = "habit-loop-lab-state-v1";
const MAX_HABITS = 3;

const stageCopy = {
  precontemplation: {
    label: "Precontemplación",
    action: "Observa una señal diaria y busca una razón propia para cambiar.",
  },
  contemplation: {
    label: "Contemplación",
    action: "Convierte el deseo en lenguaje de cambio: qué ganarías, qué perderías y qué sería un 1% mejor.",
  },
  preparation: {
    label: "Preparación",
    action: "Define un plan if-then pequeño, visible y unido a una rutina existente.",
  },
  action: {
    label: "Acción",
    action: "Ejecuta el voto mínimo hoy y protege la regla de nunca fallar dos veces.",
  },
};

const reminderPolicies = {
  high: {
    label: "Alto",
    chance: 1,
    short: "señal externa",
    copy: "Recordatorio completo: la conducta todavía depende del control consciente.",
  },
  medium: {
    label: "Medio",
    chance: 0.65,
    short: "desvaneciendo",
    copy: "Recordatorio parcial: la señal externa empieza a cederle control al contexto.",
  },
  low: {
    label: "Bajo",
    chance: 0.25,
    short: "casi automático",
    copy: "Recordatorio ocasional: el objetivo es que el hábito viva en la rutina, no en la alarma.",
  },
};

const ui = {
  showHabitForm: false,
  editingHabitId: null,
  reward: null,
  toast: "",
};

let reminderTimers = [];
let state = loadState();

const app = document.querySelector("#app");

app.addEventListener("click", handleClick);
app.addEventListener("submit", handleSubmit);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);

render();

function loadState() {
  const fallback = {
    profile: {
      onboarded: false,
      name: "",
      readiness: 5,
      confidence: 5,
      stage: "preparation",
      identity: "Soy una persona que cumple lo pequeño",
      chronotype: "morning",
      changeTalk: "",
      notifications: false,
      createdAt: todayKey(),
    },
    habits: [],
    selectedHabitId: null,
    rewardHistory: [],
    reflections: [],
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return {
      ...fallback,
      ...parsed,
      profile: { ...fallback.profile, ...(parsed.profile || {}) },
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      rewardHistory: Array.isArray(parsed.rewardHistory) ? parsed.rewardHistory : [],
      reflections: Array.isArray(parsed.reflections) ? parsed.reflections : [],
    };
  } catch (error) {
    console.warn("Could not load saved state", error);
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  if (!state.profile.onboarded) {
    app.innerHTML = renderOnboarding();
    updateDiagnosisPreview();
    return;
  }

  ensureSelectedHabit();
  app.innerHTML = renderDashboard();
  scheduleReminders();
}

function renderOnboarding() {
  const stage = diagnoseStage(state.profile.readiness, state.profile.confidence);
  const copy = stageCopy[stage];
  const suggestedTime = getSuggestedTime(state.profile.chronotype, 3);

  return `
    <main class="onboarding-wrap">
      <section class="onboarding-panel" aria-labelledby="onboarding-title">
        <div class="onboarding-hero">
          <div>
            <div class="brand">
              <span class="brand-mark" aria-hidden="true">HL</span>
              <div>
                <h1 id="onboarding-title">Habit Loop Lab</h1>
                <p>Tracker de identidad, ejecución mínima y automaticidad.</p>
              </div>
            </div>
            <p>
              Diseña hábitos como micro-votos por la persona que quieres ser.
              Cada hábito nace con señal, deseo, respuesta mínima y recompensa inmediata.
            </p>
          </div>
          <aside class="diagnosis-card" aria-live="polite">
            <span class="stage-pill" id="diagnosis-label">${copy.label}</span>
            <strong id="diagnosis-title">${copy.action}</strong>
            <p id="diagnosis-body" class="muted">${getStageNudge(stage)}</p>
          </aside>
        </div>

        <form id="onboarding-form">
          <div class="form-grid">
            <label class="form-field">
              Tu nombre
              <input name="name" autocomplete="name" placeholder="Yefry" value="${escapeAttr(state.profile.name)}" />
            </label>

            <label class="form-field">
              Cronotipo
              <select name="chronotype" id="chronotype-select">
                ${option("morning", "Mañana", state.profile.chronotype)}
                ${option("balanced", "Flexible", state.profile.chronotype)}
                ${option("evening", "Noche", state.profile.chronotype)}
              </select>
            </label>

            <label class="form-field">
              Preparación para cambiar
              <span class="range-line">
                <input id="readiness" name="readiness" type="range" min="0" max="10" value="${state.profile.readiness}" />
                <span class="range-value" id="readiness-value">${state.profile.readiness}</span>
              </span>
            </label>

            <label class="form-field">
              Confianza para hacerlo esta semana
              <span class="range-line">
                <input id="confidence" name="confidence" type="range" min="0" max="10" value="${state.profile.confidence}" />
                <span class="range-value" id="confidence-value">${state.profile.confidence}</span>
              </span>
            </label>

            <label class="form-field full">
              Identidad deseada
              <input
                name="identity"
                required
                maxlength="96"
                value="${escapeAttr(state.profile.identity)}"
                placeholder="Soy una persona que lee antes de dormir"
              />
            </label>

            <label class="form-field full">
              Lenguaje de cambio
              <textarea
                name="changeTalk"
                maxlength="240"
                placeholder="Si esto mejora 1%, notaré..."
              >${escapeHtml(state.profile.changeTalk)}</textarea>
            </label>

            <div class="stage-guidance full" id="stage-guidance">
              ${renderStageGuidance(stage)}
            </div>

            <label class="form-field">
              Después de esta rutina
              <input name="anchor" required maxlength="80" placeholder="servir el café" />
            </label>

            <label class="form-field">
              Haré esta acción de dos minutos
              <input name="action" required maxlength="80" placeholder="leer una página" />
            </label>

            <label class="form-field">
              Estado que espero sentir
              <input name="desiredState" required maxlength="72" placeholder="claridad, calma, energía" />
            </label>

            <label class="form-field">
              Hora sugerida
              <input name="time" id="habit-time" type="time" value="${suggestedTime}" />
            </label>

            <label class="form-field">
              Dificultad percibida
              <span class="range-line">
                <input id="difficulty" name="difficulty" type="range" min="1" max="5" value="3" />
                <span class="range-value" id="difficulty-value">3</span>
              </span>
            </label>

            <label class="form-field">
              Celebración inmediata
              <input name="celebration" maxlength="72" placeholder="respirar y decir: esto cuenta" />
            </label>
          </div>

          <div class="form-footer">
            <p class="fine-print">
              Estandariza antes de optimizar: 1 voto ahora, máximo ${MAX_HABITS} hábitos activos.
              <span id="schedule-suggestion">${getScheduleSuggestion(state.profile.chronotype, 3)}</span>
            </p>
            <button class="button primary" type="submit">Crear mi primer voto</button>
          </div>
        </form>
      </section>
    </main>
  `;
}

function renderDashboard() {
  const selectedHabit = getSelectedHabit();
  const completedToday = state.habits.filter((habit) => getStatusForDate(habit, todayKey()) === "done").length;
  const averageAutomaticity = state.habits.length
    ? Math.round(state.habits.reduce((sum, habit) => sum + getHabitStats(habit).automaticity, 0) / state.habits.length)
    : 0;
  const riskyHabits = state.habits.filter((habit) => getMissStreak(habit) > 0 && getStatusForDate(habit, todayKey()) !== "done");

  return `
    <div class="app-shell">
      ${renderSidebar(averageAutomaticity)}
      <main class="workspace">
        <header class="topbar">
          <div>
            <p class="date-kicker">${formatDate(todayKey())}</p>
            <h2>${getGreeting()}${state.profile.name ? `, ${escapeHtml(state.profile.name)}` : ""}</h2>
          </div>
          <div class="topbar-actions">
            <button class="button ghost" type="button" data-action="export">Exportar</button>
            <button class="button secondary" type="button" data-action="notifications">Recordatorios</button>
            <button
              class="button primary"
              type="button"
              data-action="open-form"
              ${state.habits.length >= MAX_HABITS ? "disabled" : ""}
            >
              Añadir hábito
            </button>
          </div>
        </header>

        ${ui.toast ? `<div class="toast" role="status">${escapeHtml(ui.toast)}</div>` : ""}
        ${ui.reward ? renderReward(ui.reward) : ""}
        ${ui.showHabitForm ? renderHabitForm() : ""}

        <div class="main-grid">
          <div class="main-column">
            ${selectedHabit ? renderDailyFocus(selectedHabit) : renderEmptyState()}
            ${renderHabitSection()}
            ${renderStackMap()}
          </div>
          <aside class="side-column">
            ${renderMetrics(completedToday, averageAutomaticity)}
            ${riskyHabits.length ? renderRelapsePanel(riskyHabits) : renderStablePanel()}
            ${renderTransitionPanel(selectedHabit)}
          </aside>
        </div>
      </main>
    </div>
  `;
}

function renderSidebar(averageAutomaticity) {
  const copy = stageCopy[state.profile.stage] || stageCopy.preparation;
  return `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">HL</span>
        <div>
          <h1>Habit Loop Lab</h1>
          <p>Identity-first tracker</p>
        </div>
      </div>

      <section class="sidebar-section">
        <h2>Identidad</h2>
        <p class="identity-statement">${escapeHtml(state.profile.identity)}</p>
        <span class="stage-pill">${copy.label}</span>
        <p class="sidebar-note">${escapeHtml(copy.action)}</p>
      </section>

      <section class="sidebar-section">
        <h2>Capacidad</h2>
        <p class="identity-statement">${state.habits.length}/${MAX_HABITS} hábitos activos</p>
        <p class="sidebar-note">Automaticidad promedio: ${averageAutomaticity}%</p>
      </section>

      <section class="sidebar-section">
        <h2>Regla clínica</h2>
        <p class="sidebar-note">Una falla es información. Dos fallas seguidas activan el plan mínimo.</p>
      </section>

      <div class="sidebar-actions">
        <button class="button ghost" type="button" data-action="edit-profile">Ajustar perfil</button>
      </div>
    </aside>
  `;
}

function renderDailyFocus(habit) {
  const todayStatus = getStatusForDate(habit, todayKey());
  const statusClass = todayStatus === "done" ? "done" : todayStatus === "missed" ? "missed" : "open";
  const stats = getHabitStats(habit);
  const log = habit.logs?.[todayKey()];
  const canAdjustEase = todayStatus === "done";

  return `
    <section class="panel" aria-labelledby="focus-title">
      <div class="section-title">
        <div>
          <h2 id="focus-title">Bucle de hoy</h2>
          <p>${escapeHtml(habit.identity)}</p>
        </div>
        <span class="status-pill ${statusClass}">${getStatusLabel(todayStatus)}</span>
      </div>

      <div class="craving-spotlight">
        <span>Craving / estado anticipado</span>
        <strong>Quiero sentir ${escapeHtml(habit.desiredState)}</strong>
        <p>Cuando aparezca la señal, imagina por 10 segundos ese cambio de estado y ejecuta solo la versión mínima.</p>
      </div>

      <p class="implementation-line">
        Si ocurre <strong>${escapeHtml(habit.anchor)}</strong>, entonces <strong>${escapeHtml(habit.action)}</strong>.
      </p>

      <div class="focus-grid">
        <div class="loop-step">
          <b>Cue / Señal</b>
          <p>Después de ${escapeHtml(habit.anchor)}</p>
        </div>
        <div class="loop-step">
          <b>Craving</b>
          <p>${escapeHtml(habit.desiredState)}</p>
        </div>
        <div class="loop-step">
          <b>Respuesta</b>
          <p>${escapeHtml(habit.action)}</p>
        </div>
        <div class="loop-step">
          <b>Recompensa</b>
          <p>${escapeHtml(habit.celebration)}</p>
        </div>
      </div>

      <div class="button-row" style="margin-top: 16px;">
        <button
          class="button primary"
          type="button"
          data-action="log-done"
          data-id="${habit.id}"
          ${todayStatus === "done" ? "disabled" : ""}
        >
          Emitir micro-voto
        </button>
        <button
          class="button warning"
          type="button"
          data-action="log-missed"
          data-id="${habit.id}"
          ${todayStatus === "done" ? "disabled" : ""}
        >
          Registrar lapso sin culpa
        </button>
        ${todayStatus !== "open" ? `<button class="button ghost" type="button" data-action="undo-log" data-id="${habit.id}">Deshacer</button>` : ""}
      </div>

      ${canAdjustEase ? `
        <label class="form-field" style="margin-top: 16px;">
          Facilidad de ejecución
          <span class="range-line">
            <input data-ease-for="${habit.id}" type="range" min="1" max="5" value="${log?.ease || 3}" />
            <span class="range-value" id="ease-${habit.id}">${log?.ease || 3}</span>
          </span>
        </label>
      ` : ""}

      <div class="stats-row" style="margin-top: 14px;">
        <div class="stat"><b>${stats.automaticity}%</b><span>Automaticidad</span></div>
        <div class="stat"><b>${stats.ageDays}</b><span>Días</span></div>
        <div class="stat"><b>${stats.reminderPolicy.label}</b><span>Recordatorio</span></div>
      </div>
    </section>
  `;
}

function renderHabitSection() {
  if (!state.habits.length) return renderEmptyState();

  return `
    <section class="section-block" aria-labelledby="habits-title">
      <div class="section-title">
        <div>
          <h2 id="habits-title">Hábitos activos</h2>
          <p>Máximo ${MAX_HABITS}. Pocos hábitos, más ejecución.</p>
        </div>
        <span class="tag">${state.habits.length}/${MAX_HABITS}</span>
      </div>
      <div class="habit-grid">
        ${state.habits.map(renderHabitCard).join("")}
      </div>
    </section>
  `;
}

function renderHabitCard(habit) {
  const stats = getHabitStats(habit);
  const todayStatus = getStatusForDate(habit, todayKey());
  const selected = habit.id === state.selectedHabitId ? "selected" : "";
  const statusClass = todayStatus === "done" ? "done" : todayStatus === "missed" ? "missed" : "open";
  const recentDays = getRecentDays(14);

  return `
    <article class="habit-card ${selected}">
      <div class="habit-head">
        <div>
          <h3>${escapeHtml(habit.action)}</h3>
          <p class="muted" style="margin: 4px 0 0;">${escapeHtml(habit.identity)}</p>
        </div>
        <span class="status-pill ${statusClass}">${getStatusLabel(todayStatus)}</span>
      </div>

      <div class="ifthen">
        <div>
          <span>Después de</span>
          <strong>${escapeHtml(habit.anchor)}</strong>
        </div>
        <div>
          <span>Haré</span>
          <strong>${escapeHtml(habit.action)}</strong>
        </div>
      </div>

      <div>
        <div class="progress-shell" aria-label="Automaticidad ${stats.automaticity}%">
          <div class="progress-bar" style="--value: ${stats.automaticity}%"></div>
        </div>
        <p class="fine-print">${stats.phaseLabel} · ${stats.automaticity}% automático · ${stats.reminderPolicy.short}</p>
      </div>

      <div class="day-rail" aria-label="Últimos 14 días">
        ${recentDays.map((day) => `<span class="day-dot ${getStatusForDate(habit, day)} ${day === todayKey() ? "today" : ""}" title="${formatDate(day)}"></span>`).join("")}
      </div>

      <div class="habit-actions">
        <button class="button secondary" type="button" data-action="select-habit" data-id="${habit.id}">Enfocar</button>
        <button class="icon-button" type="button" data-action="edit-habit" data-id="${habit.id}" aria-label="Editar ${escapeAttr(habit.action)}">✎</button>
        <button class="icon-button" type="button" data-action="delete-habit" data-id="${habit.id}" aria-label="Eliminar ${escapeAttr(habit.action)}">×</button>
      </div>
    </article>
  `;
}

function renderHabitForm() {
  const habit = ui.editingHabitId ? state.habits.find((item) => item.id === ui.editingHabitId) : null;
  const isEditing = Boolean(habit);
  const chronotype = state.profile.chronotype || "morning";
  const suggestedTime = getSuggestedTime(chronotype, habit?.difficulty || 3);
  const title = isEditing ? "Editar plan if-then" : "Nuevo hábito";

  return `
    <section class="panel" aria-labelledby="habit-form-title">
      <div class="section-title">
        <div>
          <h2 id="habit-form-title">${title}</h2>
          <p>El voto debe caber en dos minutos y tener una señal concreta.</p>
        </div>
        <button class="icon-button" type="button" data-action="close-form" aria-label="Cerrar formulario">×</button>
      </div>

      <form id="habit-form" data-editing="${isEditing ? habit.id : ""}">
        <div class="form-grid">
          <label class="form-field full">
            Micro-voto de identidad
            <input name="identity" required maxlength="96" value="${escapeAttr(habit?.identity || state.profile.identity)}" />
          </label>

          <label class="form-field">
            Después de
            <input name="anchor" required maxlength="80" value="${escapeAttr(habit?.anchor || "")}" placeholder="cepillarme los dientes" />
          </label>

          <label class="form-field">
            Haré
            <input name="action" required maxlength="80" value="${escapeAttr(habit?.action || "")}" placeholder="preparar la ropa del gimnasio" />
          </label>

          <label class="form-field">
            Estado anticipado
            <input name="desiredState" required maxlength="72" value="${escapeAttr(habit?.desiredState || "")}" placeholder="ligereza, enfoque, orgullo tranquilo" />
          </label>

          <label class="form-field">
            Hora
            <input name="time" id="habit-time" type="time" value="${escapeAttr(habit?.time || suggestedTime)}" />
          </label>

          <label class="form-field">
            Dificultad
            <span class="range-line">
              <input id="difficulty" name="difficulty" type="range" min="1" max="5" value="${habit?.difficulty || 3}" />
              <span class="range-value" id="difficulty-value">${habit?.difficulty || 3}</span>
            </span>
          </label>

          <label class="form-field full">
            Celebración inmediata
            <input name="celebration" maxlength="72" value="${escapeAttr(habit?.celebration || "respirar y decir: esto cuenta")}" />
          </label>
        </div>
        <div class="form-footer">
          <p class="fine-print" id="schedule-suggestion">${getScheduleSuggestion(chronotype, habit?.difficulty || 3)}</p>
          <button class="button primary" type="submit">${isEditing ? "Guardar cambios" : "Crear hábito"}</button>
        </div>
      </form>
    </section>
  `;
}

function renderReward(reward) {
  return `
    <section class="panel reward-panel" role="status" aria-live="polite">
      <div class="section-title">
        <div>
          <h2>${escapeHtml(reward.title)}</h2>
          <p>${escapeHtml(reward.body)}</p>
        </div>
        <button class="icon-button" type="button" data-action="dismiss-reward" aria-label="Cerrar recompensa">×</button>
      </div>
      <div class="inline-actions">
        <span class="tag">${escapeHtml(reward.type)}</span>
        <span class="tag">${escapeHtml(reward.prompt)}</span>
      </div>
    </section>
  `;
}

function renderMetrics(completedToday, averageAutomaticity) {
  const total = state.habits.length || 1;
  const neverMissTwice = state.habits.filter((habit) => getMissStreak(habit) < 2).length;
  return `
    <section class="panel" aria-labelledby="metrics-title">
      <div class="section-title">
        <div>
          <h2 id="metrics-title">Señales</h2>
          <p>Seguimiento de ejecución y facilidad.</p>
        </div>
      </div>
      <div class="metrics-grid">
        <div class="metric"><span>Hoy</span><b>${completedToday}/${state.habits.length}</b></div>
        <div class="metric"><span>Automático</span><b>${averageAutomaticity}%</b></div>
        <div class="metric"><span>Sin doble falla</span><b>${neverMissTwice}/${total}</b></div>
      </div>
    </section>
  `;
}

function renderRelapsePanel(riskyHabits) {
  const habit = riskyHabits[0];
  const streak = getMissStreak(habit);
  const title = streak >= 2 ? "Activa el plan mínimo" : "Nunca falles dos veces";
  const body = streak >= 2
    ? "Esto no es identidad, es un dato de aprendizaje. Haz solo la versión de dos minutos y cierra el ciclo."
    : "Ayer no salió. Hoy basta una respuesta pequeña para evitar que el patrón se consolide.";

  return `
    <section class="panel relapse-panel" aria-labelledby="relapse-title">
      <h2 id="relapse-title">${title}</h2>
      <p>${body}</p>
      <div class="ifthen">
        <div>
          <span>Ola de impulso</span>
          <strong>Observa 90 segundos sin pelearla</strong>
        </div>
        <div>
          <span>Siguiente voto</span>
          <strong>${escapeHtml(habit.action)}</strong>
        </div>
      </div>
      <div class="button-row" style="margin-top: 14px;">
        <button class="button primary" type="button" data-action="log-done" data-id="${habit.id}">Hacer versión mínima</button>
        <button class="button ghost" type="button" data-action="select-habit" data-id="${habit.id}">Ver hábito</button>
      </div>
    </section>
  `;
}

function renderStablePanel() {
  return `
    <section class="panel">
      <h2>Estabilidad</h2>
      <p>Hoy no hay doble falla activa. Mantén el voto pequeño y fácil de repetir.</p>
    </section>
  `;
}

function renderStackMap() {
  if (!state.habits.length) return "";

  return `
    <section class="panel" aria-labelledby="stack-title">
      <div class="section-title">
        <div>
          <h2 id="stack-title">Mapa de habit stacking</h2>
          <p>Rutinas existentes como anclas para nuevos votos.</p>
        </div>
      </div>
      <div class="stack-map">
        ${state.habits.map((habit) => `
          <div class="stack-row">
            <div class="stack-node">${escapeHtml(habit.anchor)}</div>
            <div class="stack-arrow" aria-hidden="true">→</div>
            <div class="stack-node">${escapeHtml(habit.action)}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTransitionPanel(habit) {
  if (!habit) {
    return `
      <section class="panel">
        <h2>Transición</h2>
        <p>Crea un hábito para ver su etapa de automaticidad.</p>
      </section>
    `;
  }

  const stats = getHabitStats(habit);
  const age = stats.ageDays;
  const conscious = clamp((Math.min(age, 21) / 21) * 100, 0, 100);
  const myelin = clamp(((Math.min(Math.max(age - 21, 0), 45)) / 45) * 100, 0, 100);
  const defaultPolicy = clamp(((Math.min(Math.max(age - 66, 0), 269)) / 269) * 100, 0, 100);

  return `
    <section class="panel" aria-labelledby="transition-title">
      <div class="section-title">
        <div>
          <h2 id="transition-title">Transición subcortical</h2>
          <p>${escapeHtml(habit.action)}</p>
        </div>
        <span class="phase-pill">${stats.phaseLabel}</span>
      </div>
      <div class="timeline">
        <div class="timeline-item">
          <strong>0-21 días</strong>
          <div class="timeline-track"><span style="--value:${conscious}%"></span></div>
        </div>
        <div class="timeline-item">
          <strong>21-66</strong>
          <div class="timeline-track"><span style="--value:${myelin}%"></span></div>
        </div>
        <div class="timeline-item">
          <strong>66-335</strong>
          <div class="timeline-track"><span style="--value:${defaultPolicy}%"></span></div>
        </div>
      </div>
      <p class="policy-note">${getPhaseCopy(stats.ageDays)}</p>
      <p class="policy-note">${stats.reminderPolicy.copy}</p>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="empty-state">
      <h2>Empieza con un voto de dos minutos</h2>
      <p class="muted">El sistema limita la carga para que la acción gane sobre la planificación.</p>
      <button class="button primary" type="button" data-action="open-form">Crear hábito</button>
    </section>
  `;
}

function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "open-form") {
    if (state.habits.length >= MAX_HABITS) {
      showToast("Ya tienes tres hábitos activos. Termina o elimina uno antes de añadir otro.");
      return;
    }
    ui.showHabitForm = true;
    ui.editingHabitId = null;
    render();
  }

  if (action === "close-form") {
    ui.showHabitForm = false;
    ui.editingHabitId = null;
    render();
  }

  if (action === "select-habit") {
    state.selectedHabitId = id;
    saveState();
    render();
  }

  if (action === "edit-habit") {
    ui.showHabitForm = true;
    ui.editingHabitId = id;
    state.selectedHabitId = id;
    saveState();
    render();
  }

  if (action === "delete-habit") {
    deleteHabit(id);
  }

  if (action === "log-done") {
    logHabit(id, "done");
  }

  if (action === "log-missed") {
    logHabit(id, "missed");
  }

  if (action === "undo-log") {
    undoToday(id);
  }

  if (action === "dismiss-reward") {
    ui.reward = null;
    render();
  }

  if (action === "notifications") {
    requestNotifications();
  }

  if (action === "export") {
    exportData();
  }

  if (action === "edit-profile") {
    state.profile.onboarded = false;
    saveState();
    render();
  }
}

function handleSubmit(event) {
  event.preventDefault();

  if (event.target.id === "onboarding-form") {
    const form = new FormData(event.target);
    const readiness = Number(form.get("readiness"));
    const confidence = Number(form.get("confidence"));
    const stage = diagnoseStage(readiness, confidence);
    const identity = cleanText(form.get("identity")) || "Soy una persona que cumple lo pequeño";

    state.profile = {
      ...state.profile,
      onboarded: true,
      name: cleanText(form.get("name")),
      readiness,
      confidence,
      stage,
      identity,
      chronotype: form.get("chronotype") || "morning",
      changeTalk: cleanText(form.get("changeTalk")),
      createdAt: state.profile.createdAt || todayKey(),
    };

    const firstHabit = buildHabitFromForm(form, identity);
    state.habits = [firstHabit];
    state.selectedHabitId = firstHabit.id;
    saveState();
    showToast("Primer micro-voto creado. Hoy solo necesitas la versión mínima.");
    render();
  }

  if (event.target.id === "habit-form") {
    const form = new FormData(event.target);
    const editingId = event.target.dataset.editing;

    if (!editingId && state.habits.length >= MAX_HABITS) {
      showToast("Límite de tres hábitos activos alcanzado.");
      return;
    }

    if (editingId) {
      const index = state.habits.findIndex((habit) => habit.id === editingId);
      if (index >= 0) {
        state.habits[index] = {
          ...state.habits[index],
          ...buildHabitPayload(form),
          updatedAt: new Date().toISOString(),
        };
        state.selectedHabitId = editingId;
        showToast("Plan actualizado.");
      }
    } else {
      const habit = buildHabitFromForm(form, state.profile.identity);
      state.habits.push(habit);
      state.selectedHabitId = habit.id;
      showToast("Hábito añadido. La ejecución mínima manda.");
    }

    ui.showHabitForm = false;
    ui.editingHabitId = null;
    saveState();
    render();
  }
}

function handleInput(event) {
  if (event.target.id === "readiness" || event.target.id === "confidence") {
    updateDiagnosisPreview();
  }

  if (event.target.id === "difficulty") {
    const value = Number(event.target.value);
    const chronotype = document.querySelector("#chronotype-select")?.value || state.profile.chronotype;
    const output = document.querySelector("#difficulty-value");
    const suggestion = document.querySelector("#schedule-suggestion");
    const time = document.querySelector("#habit-time");
    if (output) output.textContent = value;
    if (suggestion) suggestion.textContent = getScheduleSuggestion(chronotype, value);
    if (time && !time.dataset.touched) time.value = getSuggestedTime(chronotype, value);
  }

  if (event.target.id === "habit-time") {
    event.target.dataset.touched = "true";
  }

  if (event.target.matches("[data-ease-for]")) {
    const habitId = event.target.dataset.easeFor;
    const output = document.querySelector(`#ease-${CSS.escape(habitId)}`);
    if (output) output.textContent = event.target.value;
  }
}

function handleChange(event) {
  if (event.target.id === "chronotype-select") {
    const difficulty = Number(document.querySelector("#difficulty")?.value || 3);
    const time = document.querySelector("#habit-time");
    if (time && !time.dataset.touched) time.value = getSuggestedTime(event.target.value, difficulty);
  }

  if (event.target.matches("[data-ease-for]")) {
    const habitId = event.target.dataset.easeFor;
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit?.logs?.[todayKey()]) return;
    habit.logs[todayKey()].ease = Number(event.target.value);
    saveState();
    render();
  }
}

function updateDiagnosisPreview() {
  const readiness = Number(document.querySelector("#readiness")?.value ?? state.profile.readiness);
  const confidence = Number(document.querySelector("#confidence")?.value ?? state.profile.confidence);
  const readinessValue = document.querySelector("#readiness-value");
  const confidenceValue = document.querySelector("#confidence-value");
  const label = document.querySelector("#diagnosis-label");
  const title = document.querySelector("#diagnosis-title");
  const body = document.querySelector("#diagnosis-body");
  const guidance = document.querySelector("#stage-guidance");
  const stage = diagnoseStage(readiness, confidence);
  const copy = stageCopy[stage];

  if (readinessValue) readinessValue.textContent = readiness;
  if (confidenceValue) confidenceValue.textContent = confidence;
  if (label) label.textContent = copy.label;
  if (title) title.textContent = copy.action;
  if (body) body.textContent = getStageNudge(stage);
  if (guidance) guidance.innerHTML = renderStageGuidance(stage);
}

function buildHabitFromForm(form, fallbackIdentity) {
  return {
    id: createId(),
    ...buildHabitPayload(form, fallbackIdentity),
    createdAt: todayKey(),
    logs: {},
  };
}

function buildHabitPayload(form, fallbackIdentity = state.profile.identity) {
  const difficulty = Number(form.get("difficulty")) || 3;
  return {
    identity: cleanText(form.get("identity")) || fallbackIdentity,
    anchor: cleanText(form.get("anchor")),
    action: cleanText(form.get("action")),
    desiredState: cleanText(form.get("desiredState")),
    time: form.get("time") || getSuggestedTime(state.profile.chronotype, difficulty),
    difficulty,
    celebration: cleanText(form.get("celebration")) || "respirar y decir: esto cuenta",
  };
}

function logHabit(id, status) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;
  const previousMissStreak = getMissStreak(habit);

  habit.logs = habit.logs || {};
  habit.logs[todayKey()] = {
    status,
    ease: status === "done" ? 3 : 1,
    at: new Date().toISOString(),
  };

  state.selectedHabitId = id;

  if (status === "done") {
    const reward = createVariableReward(habit, previousMissStreak);
    ui.reward = reward;
    state.rewardHistory.unshift({ ...reward, habitId: habit.id, at: new Date().toISOString() });
    state.rewardHistory = state.rewardHistory.slice(0, 20);
    showToast(`${habit.action}: micro-voto registrado.`);
  } else {
    ui.reward = null;
    state.reflections.unshift({
      habitId: habit.id,
      text: "Lapse reframed as learning data",
      at: new Date().toISOString(),
    });
    state.reflections = state.reflections.slice(0, 20);
    showToast("Registrado como dato de aprendizaje. Mañana toca versión mínima.");
  }

  saveState();
  render();
}

function undoToday(id) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit?.logs) return;
  delete habit.logs[todayKey()];
  ui.reward = null;
  showToast("Registro de hoy deshecho.");
  saveState();
  render();
}

function deleteHabit(id) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;

  const confirmed = window.confirm(`¿Eliminar "${habit.action}"?`);
  if (!confirmed) return;

  state.habits = state.habits.filter((item) => item.id !== id);
  if (state.selectedHabitId === id) state.selectedHabitId = state.habits[0]?.id || null;
  ui.showHabitForm = false;
  ui.editingHabitId = null;
  showToast("Hábito eliminado.");
  saveState();
  render();
}

function ensureSelectedHabit() {
  if (!state.habits.length) {
    state.selectedHabitId = null;
    return;
  }
  if (!state.habits.some((habit) => habit.id === state.selectedHabitId)) {
    state.selectedHabitId = state.habits[0].id;
  }
}

function getSelectedHabit() {
  return state.habits.find((habit) => habit.id === state.selectedHabitId) || state.habits[0] || null;
}

function getHabitStats(habit) {
  const ageDays = Math.max(1, daysBetween(habit.createdAt, todayKey()) + 1);
  const activeDays = getRecentDays(14).filter((day) => isActiveOn(habit, day));
  const doneDays = activeDays.filter((day) => getStatusForDate(habit, day) === "done").length;
  const completionRate = activeDays.length ? doneDays / activeDays.length : 0;
  const easeValues = Object.values(habit.logs || {})
    .filter((log) => log.status === "done")
    .slice(-10)
    .map((log) => Number(log.ease || 3));
  const averageEase = easeValues.length
    ? easeValues.reduce((sum, value) => sum + value, 0) / easeValues.length
    : 2.8;
  const ageFactor = clamp(ageDays / 66, 0, 1);
  const missPenalty = Math.min(getMissStreak(habit), 3) * 8;
  const automaticity = clamp(
    Math.round(((averageEase / 5) * 0.45 + completionRate * 0.35 + ageFactor * 0.2) * 100 - missPenalty),
    0,
    100,
  );
  const phaseLabel = getPhaseLabel(ageDays);
  const reminderPolicy = getReminderPolicy(ageDays, automaticity);

  return {
    ageDays,
    completionRate,
    averageEase,
    automaticity,
    phaseLabel,
    reminderPolicy,
  };
}

function getMissStreak(habit) {
  let streak = 0;
  let cursor = todayKey();

  while (isActiveOn(habit, cursor)) {
    const status = getStatusForDate(habit, cursor);
    if (status === "done") break;
    if (status === "missed") {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }

  return streak;
}

function getStatusForDate(habit, dateKey) {
  const saved = habit.logs?.[dateKey]?.status;
  if (saved) return saved;
  if (!isActiveOn(habit, dateKey)) return "future";
  if (dateKey < todayKey()) return "missed";
  return "open";
}

function isActiveOn(habit, dateKey) {
  return dateKey >= habit.createdAt && dateKey <= todayKey();
}

function createVariableReward(habit, repairedMissStreak = 0) {
  if (repairedMissStreak > 0) {
    return {
      type: "Reparación",
      title: repairedMissStreak > 1 ? "La identidad volvió al mando" : "Nunca fallaste dos veces",
      body: `El lapso quedó localizado como aprendizaje. Hoy ${habit.identity} recibió evidencia nueva.`,
      prompt: "Siente el alivio de cerrar el ciclo.",
    };
  }

  const rewards = [
    {
      type: "Shine",
      title: "Esto cuenta ahora",
      body: `${habit.identity} recibió un voto real, no una promesa.`,
      prompt: "Respira lento cinco segundos.",
    },
    {
      type: "Sorpresa",
      title: "Predicción superada",
      body: `Tu cerebro esperaba fricción. Hoy recibió evidencia de facilidad.`,
      prompt: "Nota la sensación física.",
    },
    {
      type: "Identidad",
      title: "Micro-voto guardado",
      body: `No estás persiguiendo una racha; estás acumulando pruebas de identidad.`,
      prompt: "Di en voz baja: soy esa persona.",
    },
    {
      type: "Reencuadre",
      title: "Pequeño, pero biológico",
      body: `La repetición mínima fortalece la ruta que quieres volver automática.`,
      prompt: "Cierra el ciclo con tu celebración.",
    },
  ];

  const rareReward = {
    type: "RPE raro",
    title: "Recompensa inesperada",
    body: `Haz una pausa de 30 segundos para disfrutar el estado de ${habit.desiredState}.`,
    prompt: "Sin puntos. Solo presencia.",
  };

  return Math.random() < 0.18
    ? rareReward
    : rewards[Math.floor(Math.random() * rewards.length)];
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("Este navegador no soporta notificaciones locales.");
    render();
    return;
  }

  const permission = await Notification.requestPermission();
  state.profile.notifications = permission === "granted";
  saveState();
  showToast(permission === "granted" ? "Recordatorios activados mientras la app esté abierta." : "Permiso de notificaciones no concedido.");
  render();
}

function scheduleReminders() {
  reminderTimers.forEach((timer) => window.clearTimeout(timer));
  reminderTimers = [];

  if (!state.profile.notifications || !("Notification" in window) || Notification.permission !== "granted") return;

  state.habits.forEach((habit) => {
    if (getStatusForDate(habit, todayKey()) === "done") return;
    const stats = getHabitStats(habit);
    if (!shouldSendFadedReminder(habit, stats.reminderPolicy.chance)) return;

    const delay = getDelayUntil(habit.time);
    if (delay < 0 || delay > 24 * 60 * 60 * 1000) return;

    const timer = window.setTimeout(() => {
      new Notification(`Después de ${habit.anchor}`, {
        body: `Anticipa ${habit.desiredState}. Luego: ${habit.action}.`,
      });
    }, delay);
    reminderTimers.push(timer);
  });
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Habit Loop Lab",
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `habit-loop-lab-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Datos exportados.");
  render();
}

function showToast(message) {
  ui.toast = message;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    ui.toast = "";
    render();
  }, 3600);
}

function diagnoseStage(readiness, confidence) {
  if (readiness <= 2) return "precontemplation";
  if (readiness <= 5) return "contemplation";
  if (confidence <= 5) return "preparation";
  return "action";
}

function getStageNudge(stage) {
  if (stage === "precontemplation") return "No empujes todavía. Mira una señal, un costo y una ganancia posible.";
  if (stage === "contemplation") return "Tu tarea es formular deseo propio antes de perseguir una meta externa.";
  if (stage === "preparation") return "La intención se vuelve concreta cuando tiene un cuándo, dónde y después de qué.";
  return "Ya puedes registrar acción. La app protege el tamaño mínimo para que la motivación no decida.";
}

function renderStageGuidance(stage) {
  const content = {
    precontemplation: {
      title: "Modo conciencia",
      body: "Tu primer voto puede ser observacional: después de una señal diaria, nota qué estado quieres cambiar sin forzarte a optimizar.",
    },
    contemplation: {
      title: "Modo lenguaje de cambio",
      body: "Formula una razón propia y concreta. El hábito debe sentirse como una prueba pequeña, no como una obligación externa.",
    },
    preparation: {
      title: "Modo if-then",
      body: "Ahora sí: une una rutina existente con una acción de dos minutos para delegarle el control al contexto.",
    },
    action: {
      title: "Modo ejecución",
      body: "Registra solo el micro-voto de hoy. Si hay un lapso, la prioridad es reparar antes de analizar.",
    },
  }[stage];

  return `
    <strong>${content.title}</strong>
    <p>${content.body}</p>
  `;
}

function getSuggestedTime(chronotype, difficulty) {
  if (difficulty >= 4) return "07:30";
  if (chronotype === "evening") return "19:30";
  if (chronotype === "balanced") return "12:30";
  return "07:30";
}

function getScheduleSuggestion(chronotype, difficulty) {
  if (difficulty >= 4) return "Hábitos difíciles van mejor temprano, cuando hay menos fatiga de decisión.";
  if (chronotype === "evening") return "Horario nocturno elegido; mantén la señal muy estable.";
  if (chronotype === "balanced") return "Elige un bloque con contexto repetible, no solo tiempo libre.";
  return "La mañana suele tener más estabilidad contextual para hábitos nuevos.";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getPhaseLabel(ageDays) {
  if (ageDays <= 21) return "Esfuerzo consciente";
  if (ageDays <= 66) return "Mielinización";
  return "Política por defecto";
}

function getPhaseCopy(ageDays) {
  if (ageDays <= 21) return "0-21 días: se protege la acción mínima porque el control todavía es prefrontal y consciente.";
  if (ageDays <= 66) return "21-66 días: la repetición estable empieza a convertir la rutina en una ruta más automática.";
  return "66-335 días: el sistema prioriza frecuencia y facilidad para acercarse a una política por defecto.";
}

function getReminderPolicy(ageDays, automaticity) {
  if (ageDays <= 21 || automaticity < 45) return reminderPolicies.high;
  if (ageDays <= 66 || automaticity < 75) return reminderPolicies.medium;
  return reminderPolicies.low;
}

function shouldSendFadedReminder(habit, chance) {
  if (chance >= 1) return true;
  const bucket = stableHash(`${habit.id}-${todayKey()}-${habit.time}`) % 100;
  return bucket < Math.round(chance * 100);
}

function stableHash(value) {
  return String(value).split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function getStatusLabel(status) {
  if (status === "done") return "Hecho";
  if (status === "missed") return "Dato";
  return "Abierto";
}

function getRecentDays(count) {
  return Array.from({ length: count }, (_, index) => addDays(todayKey(), index - count + 1));
}

function todayKey() {
  const now = new Date();
  return toDateKey(now);
}

function toDateKey(date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function daysBetween(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / oneDay);
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateKey) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDateKey(dateKey));
}

function getDelayUntil(time) {
  if (!time) return -1;
  const [hours, minutes] = time.split(":").map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  return target.getTime() - Date.now();
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `habit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function option(value, label, selected) {
  return `<option value="${escapeAttr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
