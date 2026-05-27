const STORAGE_KEY = "habit-loop-lab-state-v1";
const CLOUD_CONFIG_KEY = "habit-loop-lab-cloud-config-v1";
const CLOUD_TABLE = "habit_states";
const SUPABASE_MODULE_URL = "https://esm.sh/@supabase/supabase-js@2.46.1";
const DEFAULT_CLOUD_CONFIG = {
  url: "https://rzpdqrcfqxpgpjstfxau.supabase.co",
  anonKey: "sb_publishable_4S7QCVJjbtMGd8-RghkzLA_UYfTAPld",
};
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

const onboardingSteps = [
  {
    id: "name",
    eyebrow: "Inicio",
    title: "¿Cómo quieres que te llame?",
    why: "Esto hace que la app se sienta personal sin convertir el proceso en una evaluación pesada.",
    example: "Ejemplo: Yefry",
    optional: true,
  },
  {
    id: "chronotype",
    eyebrow: "Energía",
    title: "¿En qué momento funcionas mejor?",
    why: "El horario importa porque los hábitos difíciles suelen necesitar contextos estables y poca fatiga de decisión.",
    example: "Si no estás seguro, deja Mañana para empezar con menos fricción.",
  },
  {
    id: "readiness",
    eyebrow: "Diagnóstico",
    title: "¿Qué tan listo te sientes para cambiar?",
    why: "Esta escala ayuda a ubicar tu etapa de cambio sin preguntarte demasiado.",
    example: "0 significa nada listo; 10 significa listo para actuar hoy.",
  },
  {
    id: "confidence",
    eyebrow: "Diagnóstico",
    title: "¿Qué tanta confianza tienes esta semana?",
    why: "Si la confianza es baja, el hábito debe hacerse más pequeño, no más ambicioso.",
    example: "Si dudas, pon 5 o menos. Eso le dice a la app que reduzca la fricción.",
  },
  {
    id: "identity",
    eyebrow: "Identidad",
    title: "¿Qué identidad quieres reforzar?",
    why: "La app no busca solo resultados. Cada hábito será un micro-voto por esta identidad.",
    example: "Soy una persona que cuida su cuerpo.",
  },
  {
    id: "changeTalk",
    eyebrow: "Motivo propio",
    title: "¿Por qué este cambio importa para ti?",
    why: "Esto convierte una intención abstracta en lenguaje de cambio propio, sin presión externa.",
    example: "Si esto mejora 1%, voy a sentir más control sobre mi día.",
    optional: true,
  },
  {
    id: "anchor",
    eyebrow: "Señal",
    title: "¿Después de qué rutina existente ocurrirá?",
    why: "Un hábito nuevo se pega mejor a una señal que ya existe en tu día.",
    example: "Después de servirme café.",
  },
  {
    id: "action",
    eyebrow: "Respuesta mínima",
    title: "¿Cuál será la acción de dos minutos?",
    why: "La meta inicial es que la acción sea tan pequeña que la motivación no tenga que decidir.",
    example: "Leer una página, hacer 5 sentadillas, anotar un gasto.",
  },
  {
    id: "desiredState",
    eyebrow: "Craving",
    title: "¿Qué estado quieres anticipar?",
    why: "El deseo de sentir un cambio de estado es la fuerza que empuja la respuesta.",
    example: "Claridad, calma, energía, orgullo tranquilo.",
  },
  {
    id: "schedule",
    eyebrow: "Fricción",
    title: "¿Qué tan difícil se siente y cuándo lo harás?",
    why: "Si se siente difícil, la app sugiere hacerlo temprano para proteger la energía mental.",
    example: "Dificultad 2 y hora 07:30 para empezar simple.",
  },
  {
    id: "celebration",
    eyebrow: "Recompensa",
    title: "¿Cómo cerrarás el ciclo?",
    why: "Una celebración inmediata le da al cerebro una señal positiva sin depender de premios externos.",
    example: "Respirar y decir: esto cuenta.",
    optional: true,
  },
  {
    id: "review",
    eyebrow: "Revisión",
    title: "Tu primer bucle está listo",
    why: "Revisa que el plan sea pequeño, claro y unido a una señal real.",
    example: "Después de café, leeré una página para sentir claridad.",
  },
];

const ui = {
  showHabitForm: false,
  editingHabitId: null,
  onboardingStep: 0,
  sidebarOpen: false,
  showCloudPanel: false,
  reward: null,
  urgeHabitId: null,
  toast: "",
};

const cloud = {
  client: null,
  configured: false,
  user: null,
  busy: false,
  message: "",
  pendingEmail: "",
  confirmationPending: false,
  lastSync: "",
  autoTimer: null,
  suspendAutoSync: false,
};

let reminderTimers = [];
let state = loadState();

const app = document.querySelector("#app");

app.addEventListener("click", handleClick);
app.addEventListener("submit", handleSubmit);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);

registerServiceWorker();
render();
initCloud();

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
      onboardingStep: 0,
      draftHabit: {
        anchor: "",
        action: "",
        desiredState: "",
        time: "",
        difficulty: 3,
        celebration: "",
      },
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
      profile: {
        ...fallback.profile,
        ...(parsed.profile || {}),
        draftHabit: {
          ...fallback.profile.draftHabit,
          ...(parsed.profile?.draftHabit || {}),
        },
      },
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
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueCloudAutoSync();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
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
  const draft = getOnboardingDraft();
  const stepIndex = getOnboardingStepIndex();
  const step = onboardingSteps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / onboardingSteps.length) * 100);
  const isFinalStep = step.id === "review";

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

        ${renderCloudAccess("onboarding")}
        ${ui.showCloudPanel ? renderCloudPanel() : ""}

        ${ui.toast ? `<div class="toast onboarding-toast" role="status">${escapeHtml(ui.toast)}</div>` : ""}

        <form id="onboarding-form" class="onboarding-form" data-step="${step.id}">
          <div class="onboarding-progress" aria-label="Progreso del cuestionario">
            <span>Paso ${stepIndex + 1} de ${onboardingSteps.length}</span>
            <div class="progress-shell">
              <div class="progress-bar" style="--value: ${progress}%"></div>
            </div>
          </div>

          <article class="question-card">
            <div class="question-copy">
              <span>${escapeHtml(step.eyebrow)}</span>
              <h2>${escapeHtml(step.title)}</h2>
              <p>${escapeHtml(step.why)}</p>
            </div>

            <div class="example-box">
              <strong>Ejemplo</strong>
              <p>${escapeHtml(step.example)}</p>
            </div>

            ${renderOnboardingField(step, draft)}
          </article>

          ${renderOnboardingPreview(draft)}

          <div class="form-footer">
            <p class="fine-print">
              Autoguardado activo. Puedes recargar la página y seguir donde ibas.
              <span id="schedule-suggestion">${getScheduleSuggestion(state.profile.chronotype, draft.difficulty)}</span>
            </p>
            <div class="wizard-actions">
              <button
                class="button ghost"
                type="button"
                data-action="onboarding-back"
                ${stepIndex === 0 ? "disabled" : ""}
              >
                Atrás
              </button>
              ${isFinalStep
                ? `<button class="button primary" type="submit">Crear mi primer voto</button>`
                : `<button class="button primary" type="button" data-action="onboarding-next">Siguiente</button>`
              }
            </div>
          </div>
        </form>
      </section>
    </main>
  `;
}

function renderOnboardingField(step, draft) {
  if (step.id === "name") {
    return `
      <label class="form-field question-field">
        Tu nombre
        <input name="name" autocomplete="name" placeholder="Yefry" value="${escapeAttr(state.profile.name)}" />
      </label>
    `;
  }

  if (step.id === "chronotype") {
    return `
      <label class="form-field question-field">
        Cronotipo
        <select name="chronotype" id="chronotype-select">
          ${option("morning", "Mañana", state.profile.chronotype)}
          ${option("balanced", "Flexible", state.profile.chronotype)}
          ${option("evening", "Noche", state.profile.chronotype)}
        </select>
      </label>
    `;
  }

  if (step.id === "readiness") {
    return `
      <label class="form-field question-field">
        Preparación para cambiar
        <span class="range-line">
          <input id="readiness" name="readiness" type="range" min="0" max="10" value="${state.profile.readiness}" />
          <span class="range-value" id="readiness-value">${state.profile.readiness}</span>
        </span>
      </label>
    `;
  }

  if (step.id === "confidence") {
    return `
      <label class="form-field question-field">
        Confianza para hacerlo esta semana
        <span class="range-line">
          <input id="confidence" name="confidence" type="range" min="0" max="10" value="${state.profile.confidence}" />
          <span class="range-value" id="confidence-value">${state.profile.confidence}</span>
        </span>
      </label>
    `;
  }

  if (step.id === "identity") {
    return `
      <label class="form-field question-field">
        Identidad deseada
        <input
          name="identity"
          maxlength="96"
          value="${escapeAttr(state.profile.identity)}"
          placeholder="Soy una persona que lee antes de dormir"
        />
      </label>
    `;
  }

  if (step.id === "changeTalk") {
    return `
      <label class="form-field question-field">
        Lenguaje de cambio
        <textarea
          name="changeTalk"
          maxlength="240"
          placeholder="Si esto mejora 1%, notaré..."
        >${escapeHtml(state.profile.changeTalk)}</textarea>
      </label>
      <div class="stage-guidance" id="stage-guidance">
        ${renderStageGuidance(diagnoseStage(state.profile.readiness, state.profile.confidence))}
      </div>
    `;
  }

  if (step.id === "anchor") {
    return `
      <label class="form-field question-field">
        Después de esta rutina
        <input name="anchor" maxlength="80" value="${escapeAttr(draft.anchor)}" placeholder="servir el café" />
      </label>
    `;
  }

  if (step.id === "action") {
    return `
      <label class="form-field question-field">
        Haré esta acción de dos minutos
        <input name="action" maxlength="80" value="${escapeAttr(draft.action)}" placeholder="leer una página" />
      </label>
    `;
  }

  if (step.id === "desiredState") {
    return `
      <label class="form-field question-field">
        Estado que espero sentir
        <input name="desiredState" maxlength="72" value="${escapeAttr(draft.desiredState)}" placeholder="claridad, calma, energía" />
      </label>
    `;
  }

  if (step.id === "schedule") {
    return `
      <div class="schedule-fields">
        <label class="form-field question-field">
          Dificultad percibida
          <span class="range-line">
            <input id="difficulty" name="difficulty" type="range" min="1" max="5" value="${draft.difficulty}" />
            <span class="range-value" id="difficulty-value">${draft.difficulty}</span>
          </span>
        </label>
        <label class="form-field question-field">
          Hora sugerida
          <input name="time" id="habit-time" type="time" value="${escapeAttr(draft.time || getSuggestedTime(state.profile.chronotype, draft.difficulty))}" />
        </label>
      </div>
    `;
  }

  if (step.id === "celebration") {
    return `
      <label class="form-field question-field">
        Celebración inmediata
        <input name="celebration" maxlength="72" value="${escapeAttr(draft.celebration)}" placeholder="respirar y decir: esto cuenta" />
      </label>
    `;
  }

  return `
    <div class="review-card">
      <div><span>Identidad</span><strong>${escapeHtml(state.profile.identity)}</strong></div>
      <div><span>Si ocurre</span><strong>${escapeHtml(draft.anchor || "tu rutina ancla")}</strong></div>
      <div><span>Entonces</span><strong>${escapeHtml(draft.action || "tu acción mínima")}</strong></div>
      <div><span>Para sentir</span><strong>${escapeHtml(draft.desiredState || "el estado deseado")}</strong></div>
      <div><span>Cierro con</span><strong>${escapeHtml(draft.celebration || "una celebración breve")}</strong></div>
    </div>
  `;
}

function renderOnboardingPreview(draft) {
  return `
    <aside class="onboarding-preview" aria-label="Vista previa del primer hábito">
      <span>Vista previa</span>
      <p>
        Después de <strong>${escapeHtml(draft.anchor || "tu rutina actual")}</strong>,
        haré <strong>${escapeHtml(draft.action || "una acción de dos minutos")}</strong>
        para sentir <strong>${escapeHtml(draft.desiredState || "un cambio de estado")}</strong>.
      </p>
    </aside>
  `;
}

function renderCloudAccess(context = "dashboard") {
  const status = getCloudStatus();
  const title = context === "onboarding" ? "¿Ya tienes datos en otro dispositivo?" : "Nube opcional";
  const body = context === "onboarding"
    ? "Inicia sesión para descargar tus hábitos del computador o del celular."
    : "Sincroniza manualmente o deja que la app guarde cambios cuando haya sesión activa.";

  return `
    <section class="cloud-access ${context === "onboarding" ? "cloud-access-onboarding" : ""}">
      <div>
        <span class="status-pill ${status.className}">${status.label}</span>
        <h2>${title}</h2>
        <p>${body}</p>
        ${cloud.message ? `<p class="fine-print">${escapeHtml(cloud.message)}</p>` : ""}
      </div>
      <button class="button secondary" type="button" data-action="open-cloud">Sincronizar</button>
    </section>
  `;
}

function renderCloudPanel() {
  const config = getCloudConfig();
  const status = getCloudStatus();

  if (!cloud.configured) {
    return `
      <section class="panel cloud-panel" aria-labelledby="cloud-title">
        <div class="section-title">
          <div>
            <h2 id="cloud-title">Conectar Supabase</h2>
            <p>Pega los datos públicos de tu proyecto. Se guardan solo en este navegador.</p>
          </div>
          <button class="icon-button" type="button" data-action="close-cloud" aria-label="Cerrar sincronización">×</button>
        </div>

        <form id="cloud-config-form">
          <div class="form-grid">
            <label class="form-field full">
              Project URL
              <input name="url" type="url" required placeholder="https://xxxx.supabase.co" value="${escapeAttr(config.url)}" />
            </label>
            <label class="form-field full">
              Anon public key
              <textarea name="anonKey" required placeholder="eyJhbGciOiJIUzI1NiIs...">${escapeHtml(config.anonKey)}</textarea>
            </label>
          </div>
          <div class="form-footer">
            <p class="fine-print">La anon key es pública. Las reglas RLS de Supabase protegen los datos por usuario.</p>
            <button class="button primary" type="submit" ${cloud.busy ? "disabled" : ""}>Guardar configuración</button>
          </div>
        </form>
      </section>
    `;
  }

  if (!cloud.user) {
    return `
      <section class="panel cloud-panel" aria-labelledby="cloud-title">
        <div class="section-title">
          <div>
            <h2 id="cloud-title">Iniciar sesión</h2>
            <p>Supabase ya está configurado. Usa el mismo correo y contraseña en computador y celular.</p>
          </div>
          <button class="icon-button" type="button" data-action="close-cloud" aria-label="Cerrar sincronización">×</button>
        </div>

        <form id="cloud-auth-form">
          <div class="form-grid">
            <label class="form-field">
              Email
              <input name="email" type="email" autocomplete="email" required placeholder="tu@email.com" value="${escapeHtml(cloud.pendingEmail)}" />
            </label>
            <label class="form-field">
              Contraseña
              <input name="password" type="password" autocomplete="current-password" required minlength="6" placeholder="mínimo 6 caracteres" />
            </label>
          </div>
          <div class="form-footer">
            <p class="fine-print">${escapeHtml(cloud.message || "La cuenta es opcional. Sin sesión, tus datos siguen locales.")}</p>
            <div class="wizard-actions">
              <button class="button ghost" type="button" data-action="cloud-clear-config" ${cloud.busy ? "disabled" : ""}>Restaurar Supabase</button>
              ${cloud.confirmationPending && cloud.pendingEmail ? `<button class="button ghost" type="button" data-action="cloud-resend-confirmation" ${cloud.busy ? "disabled" : ""}>Reenviar confirmación</button>` : ""}
              <button class="button secondary" type="submit" data-auth-mode="signup" ${cloud.busy ? "disabled" : ""}>Crear cuenta</button>
              <button class="button primary" type="submit" data-auth-mode="login" ${cloud.busy ? "disabled" : ""}>Entrar</button>
            </div>
          </div>
        </form>
      </section>
    `;
  }

  return `
    <section class="panel cloud-panel" aria-labelledby="cloud-title">
      <div class="section-title">
        <div>
          <h2 id="cloud-title">Sincronización activa</h2>
          <p>${escapeHtml(cloud.user.email || "Sesión iniciada")}</p>
        </div>
        <button class="icon-button" type="button" data-action="close-cloud" aria-label="Cerrar sincronización">×</button>
      </div>

      <div class="cloud-status-card">
        <span class="status-pill ${status.className}">${status.label}</span>
        <p>${escapeHtml(cloud.message || "Tus cambios locales se guardan automáticamente en la nube.")}</p>
        ${cloud.lastSync ? `<p class="fine-print">Última sincronización: ${escapeHtml(formatDateTime(cloud.lastSync))}</p>` : ""}
      </div>

      <div class="button-row">
        <button class="button primary" type="button" data-action="cloud-push" ${cloud.busy ? "disabled" : ""}>Subir este dispositivo</button>
        <button class="button secondary" type="button" data-action="cloud-pull" ${cloud.busy ? "disabled" : ""}>Descargar nube</button>
        <button class="button ghost" type="button" data-action="cloud-logout" ${cloud.busy ? "disabled" : ""}>Cerrar sesión</button>
      </div>
    </section>
  `;
}

function renderDashboard() {
  const dailyHabit = getDailyPriorityHabit();
  const selectedHabit = getSelectedHabit();
  const dashboardHabit = selectedHabit || dailyHabit;
  const urgeHabit = state.habits.find((habit) => habit.id === ui.urgeHabitId) || dailyHabit || selectedHabit;
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
        ${ui.showCloudPanel ? renderCloudPanel() : ""}
        ${ui.showHabitForm ? renderHabitForm() : ""}

        ${dailyHabit ? renderDailyFocus(dailyHabit, riskyHabits) : !state.habits.length ? renderEmptyState() : ""}
        ${ui.urgeHabitId && urgeHabit ? renderUrgeSurfingPanel(urgeHabit) : ""}

        ${state.habits.length ? `
          <section class="dashboard-heading" aria-labelledby="dashboard-title">
            <div>
              <span>Después del voto</span>
              <h2 id="dashboard-title">Dashboard de automaticidad</h2>
              <p>Primero acción mínima; luego señales de progreso, facilidad y transición neural.</p>
            </div>
          </section>

          <div class="main-grid">
            <div class="main-column">
              ${renderHabitSection()}
              ${renderStackMap()}
            </div>
            <aside class="side-column">
              ${renderMetrics(completedToday, averageAutomaticity)}
              ${riskyHabits.length ? renderRelapsePanel(riskyHabits) : renderStablePanel()}
              ${renderTransitionPanel(dashboardHabit)}
            </aside>
          </div>
        ` : ""}
      </main>
    </div>
  `;
}

function renderSidebar(averageAutomaticity) {
  const copy = stageCopy[state.profile.stage] || stageCopy.preparation;
  return `
    <aside class="sidebar ${ui.sidebarOpen ? "is-open" : ""}">
      <div class="sidebar-header">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">HL</span>
          <div>
            <h1>Habit Loop Lab</h1>
            <p>Identity-first tracker</p>
          </div>
        </div>
        <button
          class="sidebar-toggle"
          type="button"
          data-action="toggle-sidebar"
          aria-expanded="${ui.sidebarOpen ? "true" : "false"}"
        >
          Menú
        </button>
      </div>

      <div class="sidebar-content">
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

        <section class="sidebar-section">
          <h2>Nube</h2>
          <p class="sidebar-note">${escapeHtml(getCloudStatus().label)}</p>
          <button class="button ghost" type="button" data-action="open-cloud">Sincronizar</button>
        </section>

        <section class="sidebar-section sidebar-menu-actions">
          <h2>Acciones</h2>
          <div class="sidebar-actions">
            <button class="button ghost" type="button" data-action="export">Exportar</button>
            <button class="button secondary" type="button" data-action="notifications">Recordatorios</button>
            <button class="button ghost" type="button" data-action="edit-profile">Ajustar perfil</button>
          </div>
        </section>
      </div>
    </aside>
  `;
}

function renderDailyFocus(habit, riskyHabits = []) {
  const todayStatus = getStatusForDate(habit, todayKey());
  const statusClass = todayStatus === "done" ? "done" : todayStatus === "missed" ? "missed" : "open";
  const stats = getHabitStats(habit);
  const log = habit.logs?.[todayKey()];
  const missStreak = getMissStreak(habit);
  const isRepairMode = riskyHabits.some((item) => item.id === habit.id);
  const focusLabel = isRepairMode ? "Reparación primero" : getDailyFocusLabel(habit);
  const actionDisabled = todayStatus === "done";

  return `
    <section class="panel daily-flow-panel compact-daily-panel" aria-labelledby="daily-action-title">
      <div class="compact-daily-top">
        <div class="daily-step-progress">
          <span>${escapeHtml(focusLabel)}</span>
          <h2 id="daily-action-title">${escapeHtml(habit.identity)}</h2>
          <p>${isRepairMode
            ? "Ayer fue información, no una sentencia. Hoy basta una reparación mínima para proteger la regla de nunca fallar dos veces."
            : "Hoy solo necesitas emitir un micro-voto. La explicación queda debajo si quieres revisarla."
          }</p>
        </div>
        <div class="flow-status">
          <span class="status-pill ${statusClass}">${getStatusLabel(todayStatus)}</span>
          <strong>${completedCopy(todayStatus, missStreak)}</strong>
        </div>
      </div>

      <article class="daily-action-card">
        <div class="daily-action-main">
          <span>Plan de hoy</span>
          <p class="daily-ifthen">
            Después de <strong>${escapeHtml(habit.anchor)}</strong>,
            haré <strong>${escapeHtml(habit.action)}</strong>.
          </p>
          <div class="desired-state-box">
            <span>Estado que busco</span>
            <strong>${escapeHtml(habit.desiredState)}</strong>
            <p>Anticípalo 10 segundos y registra. La meta es acción, no análisis.</p>
          </div>
        </div>

        <div class="registration-grid quick-registration" aria-label="Registro diario">
          <button class="registration-choice primary-choice" type="button" data-action="log-done" data-id="${habit.id}" ${actionDisabled ? "disabled" : ""}>
            <strong>Lo hice</strong>
            <span>Completé la acción planeada: ${escapeHtml(habit.action)}.</span>
          </button>
          <button class="registration-choice minimum-choice" type="button" data-action="log-minimum" data-id="${habit.id}" ${actionDisabled ? "disabled" : ""}>
            <strong>Versión mínima</strong>
            <span>Hice una versión de dos minutos y mantuve vivo el ciclo.</span>
          </button>
          <button class="registration-choice miss-choice" type="button" data-action="log-missed" data-id="${habit.id}" ${actionDisabled ? "disabled" : ""}>
            <strong>Hoy no pude</strong>
            <span>No lo hice hoy. Queda como dato de aprendizaje, no como culpa.</span>
          </button>
          <button class="registration-choice" type="button" data-action="open-urge" data-id="${habit.id}">
            <strong>Impulso fuerte</strong>
            <span>Usa urge surfing antes de abandonar, evitar o actuar en automático.</span>
          </button>
          ${todayStatus !== "open" ? `<button class="button ghost" type="button" data-action="undo-log" data-id="${habit.id}">Deshacer</button>` : ""}
        </div>
      </article>

      <div class="daily-detail-stack">
        <details class="daily-detail">
          <summary>Ver por qué esto funciona</summary>
          <div class="daily-detail-body">
            <p>
              La identidad reduce la fricción mental porque la acción se vuelve evidencia de quién estás practicando ser,
              no una tarea aislada. El estado deseado funciona como craving: anticipa el cambio interno que empuja la respuesta.
            </p>
          </div>
        </details>

        <details class="daily-detail">
          <summary>Ver plan completo</summary>
          <div class="daily-detail-body">
            <div class="compact-loop" aria-label="Bucle neurológico de hoy">
              <div><b>Señal</b><p>Después de ${escapeHtml(habit.anchor)}</p></div>
              <div><b>Deseo</b><p>Sentir ${escapeHtml(habit.desiredState)}</p></div>
              <div><b>Respuesta</b><p>${escapeHtml(habit.action)}</p></div>
              <div><b>Recompensa</b><p>${escapeHtml(habit.celebration)}</p></div>
            </div>
          </div>
        </details>

        <details class="daily-detail">
          <summary>Ver señales de automaticidad</summary>
          <div class="daily-detail-body">
            <p>Estimación basada en consistencia, edad del hábito, facilidad percibida y política de recordatorios.</p>
            ${todayStatus === "done" ? `
              <label class="form-field">
                Facilidad de ejecución
                <span class="range-line">
                  <input data-ease-for="${habit.id}" type="range" min="1" max="5" value="${log?.ease || 3}" />
                  <span class="range-value" id="ease-${habit.id}">${log?.ease || 3}</span>
                </span>
              </label>
            ` : ""}
            <div class="stats-row">
              <div class="stat"><b>${stats.automaticity}%</b><span>Automaticidad</span></div>
              <div class="stat"><b>${stats.ageDays}</b><span>Días</span></div>
              <div class="stat"><b>${stats.reminderPolicy.label}</b><span>Recordatorio</span></div>
            </div>
          </div>
        </details>
      </div>
    </section>
  `;
}

function renderUrgeSurfingPanel(habit) {
  return `
    <section class="panel urge-panel" aria-labelledby="urge-title">
      <div class="section-title">
        <div>
          <h2 id="urge-title">Urge surfing</h2>
          <p>Observa el impulso como una ola: sube, alcanza un pico y baja sin que tengas que obedecerlo.</p>
        </div>
        <button class="icon-button" type="button" data-action="close-urge" aria-label="Cerrar urge surfing">×</button>
      </div>

      <div class="urge-steps">
        <div>
          <span>1</span>
          <strong>Nómbralo</strong>
          <p>“Estoy sintiendo ganas de evitar o abandonar.”</p>
        </div>
        <div>
          <span>2</span>
          <strong>Ubícalo</strong>
          <p>Nota dónde se siente en el cuerpo durante 30 segundos.</p>
        </div>
        <div>
          <span>3</span>
          <strong>Déjalo pasar</strong>
          <p>No luches con la ola. Respira y espera el descenso.</p>
        </div>
        <div>
          <span>4</span>
          <strong>Voto mínimo</strong>
          <p>Cuando baje, haz solo: ${escapeHtml(habit.action)}.</p>
        </div>
      </div>

      <div class="button-row" style="margin-top: 14px;">
        <button class="button primary" type="button" data-action="log-minimum" data-id="${habit.id}">Registrar versión mínima</button>
        <button class="button ghost" type="button" data-action="close-urge">El impulso bajó</button>
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
  const isSelected = habit.id === state.selectedHabitId;
  const selected = isSelected ? "selected" : "";
  const statusClass = todayStatus === "done" ? "done" : todayStatus === "missed" ? "missed" : "open";
  const recentDays = getRecentDays(14);
  const focusLabel = todayStatus === "open" ? "Registrar hábito" : "Ver progreso";
  const selectedLabel = todayStatus === "open" ? "Registro abierto" : "Progreso abierto";
  const focusHint = todayStatus === "open"
    ? `Abrir el flujo diario de ${habit.action}`
    : `Ver el progreso de ${habit.action}`;

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
        <button
          class="button ${isSelected ? "ghost" : "secondary"}"
          type="button"
          data-action="select-habit"
          data-id="${habit.id}"
          aria-pressed="${isSelected}"
          aria-label="${escapeAttr(focusHint)}"
          title="${escapeAttr(focusHint)}"
        >${isSelected ? selectedLabel : focusLabel}</button>
        ${todayStatus !== "open" ? `<button class="button ghost" type="button" data-action="undo-log" data-id="${habit.id}">Reabrir hoy</button>` : ""}
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

  if (action === "onboarding-next") {
    const form = button.closest("form");
    persistOnboardingDraft(form);
    if (!validateCurrentOnboardingStep()) return;
    state.profile.onboardingStep = Math.min(getOnboardingStepIndex() + 1, onboardingSteps.length - 1);
    ui.toast = "";
    saveState();
    render();
  }

  if (action === "onboarding-back") {
    persistOnboardingDraft(button.closest("form"));
    state.profile.onboardingStep = Math.max(getOnboardingStepIndex() - 1, 0);
    ui.toast = "";
    saveState();
    render();
  }

  if (action === "toggle-sidebar") {
    ui.sidebarOpen = !ui.sidebarOpen;
    render();
  }

  if (action === "open-cloud") {
    ui.showCloudPanel = true;
    ui.sidebarOpen = false;
    render();
  }

  if (action === "close-cloud") {
    ui.showCloudPanel = false;
    render();
  }

  if (action === "cloud-clear-config") {
    clearCloudConfig();
  }

  if (action === "cloud-resend-confirmation") {
    resendCloudConfirmation();
  }

  if (action === "cloud-logout") {
    signOutCloud();
  }

  if (action === "cloud-push") {
    pushStateToCloud();
  }

  if (action === "cloud-pull") {
    pullStateFromCloud();
  }

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

  if (action === "log-minimum") {
    logHabit(id, "done", { minimum: true, ease: 2 });
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

  if (action === "open-urge") {
    ui.urgeHabitId = id;
    render();
  }

  if (action === "close-urge") {
    ui.urgeHabitId = null;
    render();
  }

  if (action === "notifications") {
    ui.sidebarOpen = false;
    requestNotifications();
  }

  if (action === "export") {
    ui.sidebarOpen = false;
    exportData();
  }

  if (action === "edit-profile") {
    ui.sidebarOpen = false;
    state.profile.onboarded = false;
    saveState();
    render();
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (event.target.id === "onboarding-form") {
    persistOnboardingDraft(event.target);
    const missingStep = getFirstIncompleteOnboardingStep();
    if (missingStep) {
      state.profile.onboardingStep = onboardingSteps.findIndex((step) => step.id === missingStep.id);
      saveState();
      showToast(`Antes de crear el hábito, completa: ${missingStep.title}`);
      render();
      return;
    }

    const draft = getOnboardingDraft();
    const readiness = Number(state.profile.readiness);
    const confidence = Number(state.profile.confidence);
    const stage = diagnoseStage(readiness, confidence);
    const identity = cleanText(state.profile.identity) || "Soy una persona que cumple lo pequeño";

    state.profile = {
      ...state.profile,
      onboarded: true,
      name: cleanText(state.profile.name),
      readiness,
      confidence,
      stage,
      identity,
      chronotype: state.profile.chronotype || "morning",
      changeTalk: cleanText(state.profile.changeTalk),
      onboardingStep: 0,
      createdAt: state.profile.createdAt || todayKey(),
    };

    const firstHabit = buildHabitFromDraft(draft, identity);
    state.habits = [firstHabit];
    state.selectedHabitId = firstHabit.id;
    saveState();
    showToast("Primer micro-voto creado. Hoy solo necesitas la versión mínima.");
    render();
  }

  if (event.target.id === "cloud-config-form") {
    const form = new FormData(event.target);
    await saveCloudConfig({
      url: cleanText(form.get("url")),
      anonKey: cleanText(form.get("anonKey")),
    });
  }

  if (event.target.id === "cloud-auth-form") {
    const submitter = event.submitter;
    const mode = submitter?.dataset.authMode || "login";
    const form = new FormData(event.target);
    await authenticateCloud({
      email: cleanText(form.get("email")),
      password: String(form.get("password") || ""),
      mode,
    });
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

  if (event.target.closest("#onboarding-form")) {
    persistOnboardingDraft(event.target.closest("form"));
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
    const suggestion = document.querySelector("#schedule-suggestion");
    if (time && !time.dataset.touched) time.value = getSuggestedTime(event.target.value, difficulty);
    if (suggestion) suggestion.textContent = getScheduleSuggestion(event.target.value, difficulty);
  }

  if (event.target.closest("#onboarding-form")) {
    persistOnboardingDraft(event.target.closest("form"));
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

function getOnboardingDraft() {
  const draft = state.profile.draftHabit || {};
  const difficulty = Number(draft.difficulty || 3);

  return {
    anchor: draft.anchor || "",
    action: draft.action || "",
    desiredState: draft.desiredState || "",
    time: draft.time || getSuggestedTime(state.profile.chronotype, difficulty),
    difficulty,
    celebration: draft.celebration || "",
  };
}

function getOnboardingStepIndex() {
  return clamp(Number(state.profile.onboardingStep || 0), 0, onboardingSteps.length - 1);
}

function persistOnboardingDraft(form) {
  if (!form) return;

  const formData = new FormData(form);
  const draft = getOnboardingDraft();

  if (formData.has("name")) state.profile.name = cleanText(formData.get("name"));
  if (formData.has("chronotype")) {
    state.profile.chronotype = formData.get("chronotype") || "morning";
    if (!draft.time) draft.time = getSuggestedTime(state.profile.chronotype, draft.difficulty);
  }
  if (formData.has("readiness")) state.profile.readiness = Number(formData.get("readiness"));
  if (formData.has("confidence")) state.profile.confidence = Number(formData.get("confidence"));
  if (formData.has("identity")) state.profile.identity = cleanText(formData.get("identity"));
  if (formData.has("changeTalk")) state.profile.changeTalk = cleanText(formData.get("changeTalk"));

  if (formData.has("anchor")) draft.anchor = cleanText(formData.get("anchor"));
  if (formData.has("action")) draft.action = cleanText(formData.get("action"));
  if (formData.has("desiredState")) draft.desiredState = cleanText(formData.get("desiredState"));
  if (formData.has("difficulty")) draft.difficulty = Number(formData.get("difficulty")) || 3;
  if (formData.has("time")) draft.time = formData.get("time") || getSuggestedTime(state.profile.chronotype, draft.difficulty);
  if (formData.has("celebration")) draft.celebration = cleanText(formData.get("celebration"));

  state.profile.stage = diagnoseStage(state.profile.readiness, state.profile.confidence);
  state.profile.draftHabit = draft;
  saveState();
}

function validateCurrentOnboardingStep() {
  const step = onboardingSteps[getOnboardingStepIndex()];
  if (step.optional || step.id === "schedule") return true;

  if (step.id === "review") {
    const missingStep = getFirstIncompleteOnboardingStep();
    if (!missingStep) return true;
    state.profile.onboardingStep = onboardingSteps.findIndex((item) => item.id === missingStep.id);
    saveState();
    showToast(`Completa este paso antes de crear el hábito.`);
    return false;
  }

  const value = getOnboardingStepValue(step.id);
  if (value) return true;

  showToast("Este campo ayuda a construir un bucle claro. Puedes escribir una versión pequeña.");
  return false;
}

function getFirstIncompleteOnboardingStep() {
  return onboardingSteps.find((step) => {
    if (step.optional || step.id === "schedule" || step.id === "review") return false;
    return !getOnboardingStepValue(step.id);
  });
}

function getOnboardingStepValue(stepId) {
  const draft = getOnboardingDraft();
  const values = {
    name: state.profile.name,
    chronotype: state.profile.chronotype,
    readiness: String(state.profile.readiness),
    confidence: String(state.profile.confidence),
    identity: state.profile.identity,
    changeTalk: state.profile.changeTalk,
    anchor: draft.anchor,
    action: draft.action,
    desiredState: draft.desiredState,
    celebration: draft.celebration,
  };

  return cleanText(values[stepId] || "");
}

function buildHabitFromForm(form, fallbackIdentity) {
  return {
    id: createId(),
    ...buildHabitPayload(form, fallbackIdentity),
    createdAt: todayKey(),
    logs: {},
  };
}

function buildHabitFromDraft(draft, fallbackIdentity) {
  const difficulty = Number(draft.difficulty) || 3;
  return {
    id: createId(),
    identity: fallbackIdentity,
    anchor: cleanText(draft.anchor),
    action: cleanText(draft.action),
    desiredState: cleanText(draft.desiredState),
    time: draft.time || getSuggestedTime(state.profile.chronotype, difficulty),
    difficulty,
    celebration: cleanText(draft.celebration) || "respirar y decir: esto cuenta",
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

function logHabit(id, status, options = {}) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;
  const previousMissStreak = getMissStreak(habit);

  habit.logs = habit.logs || {};
  habit.logs[todayKey()] = {
    status,
    ease: status === "done" ? options.ease || 3 : 1,
    minimum: Boolean(options.minimum),
    at: new Date().toISOString(),
  };

  state.selectedHabitId = id;
  ui.urgeHabitId = null;

  if (status === "done") {
    const reward = createVariableReward(habit, previousMissStreak);
    if (options.minimum) {
      reward.title = "Versión mínima protegida";
      reward.body = `${habit.identity} recibió evidencia real sin esperar motivación perfecta.`;
      reward.prompt = "Siente el alivio de haber mantenido el ciclo.";
    }
    ui.reward = null;
    state.rewardHistory.unshift({ ...reward, habitId: habit.id, at: new Date().toISOString() });
    state.rewardHistory = state.rewardHistory.slice(0, 20);
    showToast(options.minimum ? "Versión mínima registrada con éxito. Dashboard actualizado." : "Registro guardado con éxito. Dashboard actualizado.");
  } else {
    ui.reward = null;
    state.reflections.unshift({
      habitId: habit.id,
      text: "Lapse reframed as learning data",
      at: new Date().toISOString(),
    });
    state.reflections = state.reflections.slice(0, 20);
    showToast("Registro guardado con éxito como dato de aprendizaje.");
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
  if (ui.urgeHabitId === id) ui.urgeHabitId = null;
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

function getDailyPriorityHabit() {
  if (!state.habits.length) return null;

  const pendingHabits = state.habits.filter((habit) => !hasTodayLog(habit));
  const repairHabit = pendingHabits
    .filter((habit) => getMissStreak(habit) > 0)
    .sort((a, b) => getMissStreak(b) - getMissStreak(a))[0];

  if (repairHabit) return repairHabit;

  const hour = new Date().getHours();
  const shouldPrioritizeComplex = hour < 12 || state.profile.chronotype === "morning";
  if (shouldPrioritizeComplex) {
    const complexHabit = pendingHabits
      .filter((habit) => Number(habit.difficulty || 3) >= 4)
      .sort((a, b) => Number(b.difficulty || 3) - Number(a.difficulty || 3))[0];
    if (complexHabit) return complexHabit;
  }

  const selectedHabit = getSelectedHabit();
  if (selectedHabit && pendingHabits.some((habit) => habit.id === selectedHabit.id)) return selectedHabit;

  return pendingHabits[0] || null;
}

function getSelectedHabit() {
  return state.habits.find((habit) => habit.id === state.selectedHabitId) || state.habits[0] || null;
}

function hasTodayLog(habit) {
  return Boolean(habit.logs?.[todayKey()]?.status);
}

function getDailyFocusLabel(habit) {
  const hour = new Date().getHours();
  if (hour < 12 && Number(habit.difficulty || 3) >= 4) return "Ventana estable de la mañana";
  if (hour >= 18) return "Cierre sin fricción";
  return "Recordatorio de identidad";
}

function completedCopy(status, missStreak) {
  if (status === "done") return "Micro-voto emitido";
  if (status === "missed") return "Dato de aprendizaje";
  if (missStreak > 0) return "Hoy protege el mínimo";
  return "Pendiente de acción";
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
  const todayStatus = getStatusForDate(habit, todayKey());
  let cursor = todayStatus === "done" ? "" : todayStatus === "missed" ? todayKey() : addDays(todayKey(), -1);

  while (cursor && isActiveOn(habit, cursor)) {
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

async function initCloud() {
  const config = getCloudConfig();
  cloud.configured = Boolean(config.url && config.anonKey);

  if (!cloud.configured) {
    cloud.client = null;
    cloud.user = null;
    cloud.pendingEmail = "";
    cloud.confirmationPending = false;
    cloud.message = "Datos locales en este dispositivo.";
    render();
    return;
  }

  cloud.busy = true;
  cloud.message = "Conectando con Supabase...";
  render();

  try {
    const { createClient } = await import(SUPABASE_MODULE_URL);
    cloud.client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    const { data, error } = await cloud.client.auth.getSession();
    if (error) throw error;

    cloud.user = data.session?.user || null;
    cloud.client.auth.onAuthStateChange((_event, session) => {
      cloud.user = session?.user || null;
      if (cloud.user) {
        cloud.pendingEmail = "";
        cloud.confirmationPending = false;
      }
      cloud.message = cloud.user ? "Sesión activa. Sincronización disponible." : "Sesión cerrada.";
      render();
    });

    if (cloud.user) {
      cloud.message = "Sesión activa. Sincronizando nube...";
      await syncStateAfterCloudLogin();
    } else {
      cloud.message = "Supabase configurado. Inicia sesión para sincronizar.";
    }
  } catch (error) {
    console.error(error);
    cloud.client = null;
    cloud.user = null;
    cloud.pendingEmail = "";
    cloud.confirmationPending = false;
    cloud.message = "No pude conectar con Supabase. Revisa URL y anon key.";
  } finally {
    cloud.busy = false;
    render();
  }
}

function getCloudConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY) || "{}");
    return {
      ...DEFAULT_CLOUD_CONFIG,
      ...saved,
    };
  } catch {
    return DEFAULT_CLOUD_CONFIG;
  }
}

async function saveCloudConfig(config) {
  if (!config.url || !config.anonKey) {
    showToast("Faltan la URL y la anon key de Supabase.");
    return;
  }

  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
  cloud.message = "Configuración guardada.";
  await initCloud();
}

async function clearCloudConfig() {
  if (cloud.client) await cloud.client.auth.signOut();
  localStorage.removeItem(CLOUD_CONFIG_KEY);
  cloud.client = null;
  cloud.configured = Boolean(DEFAULT_CLOUD_CONFIG.url && DEFAULT_CLOUD_CONFIG.anonKey);
  cloud.user = null;
  cloud.pendingEmail = "";
  cloud.confirmationPending = false;
  cloud.lastSync = "";
  cloud.message = "Configuración restaurada al proyecto Supabase por defecto.";
  await initCloud();
}

async function authenticateCloud({ email, password, mode }) {
  if (!cloud.client) {
    showToast("Primero configura Supabase.");
    return;
  }

  if (!email || password.length < 6) {
    showToast("Usa un email válido y una contraseña de mínimo 6 caracteres.");
    return;
  }

  cloud.busy = true;
  cloud.pendingEmail = email;
  cloud.confirmationPending = false;
  cloud.message = mode === "signup" ? "Creando cuenta..." : "Iniciando sesión...";
  render();

  try {
    const result = mode === "signup"
      ? await cloud.client.auth.signUp({ email, password })
      : await cloud.client.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;

    cloud.user = result.data.session?.user || null;
    cloud.confirmationPending = !cloud.user;
    if (cloud.user) cloud.pendingEmail = "";
    cloud.message = cloud.user
      ? "Sesión activa. Revisando datos en la nube..."
      : "Cuenta creada. Revisa tu correo y confirma el email antes de entrar.";

    if (cloud.user) await syncStateAfterCloudLogin();
  } catch (error) {
    console.error(error);
    cloud.confirmationPending = isCloudEmailNotConfirmed(error);
    cloud.message = formatCloudAuthError(error);
  } finally {
    cloud.busy = false;
    render();
  }
}

async function resendCloudConfirmation() {
  if (!cloud.client || !cloud.pendingEmail) {
    showToast("Escribe el email de la cuenta para reenviar la confirmación.");
    return;
  }

  cloud.busy = true;
  cloud.message = "Reenviando correo de confirmación...";
  render();

  try {
    const { error } = await cloud.client.auth.resend({
      type: "signup",
      email: cloud.pendingEmail,
    });

    if (error) throw error;

    cloud.confirmationPending = true;
    cloud.message = `Correo de confirmación reenviado a ${cloud.pendingEmail}. Revisa entrada y spam.`;
  } catch (error) {
    console.error(error);
    cloud.message = error.message || "No pude reenviar la confirmación.";
  } finally {
    cloud.busy = false;
    render();
  }
}

function formatCloudAuthError(error) {
  if (isCloudEmailNotConfirmed(error)) {
    return "Tu cuenta existe, pero falta confirmar el email. Revisa tu correo o reenvía la confirmación desde aquí.";
  }

  const message = error?.message || "";
  if (/invalid login credentials/i.test(message)) {
    return "No pude entrar con ese email y contraseña. Revisa los datos o crea la cuenta.";
  }

  return message || "No pude iniciar sesión.";
}

function isCloudEmailNotConfirmed(error) {
  return /email not confirmed/i.test(error?.message || "") || error?.code === "email_not_confirmed";
}

async function syncStateAfterCloudLogin() {
  try {
    const remote = await fetchCloudRow();

    if (remote?.state) {
      if (isLocalStateNewerThanRemote(remote) && !isLocalStateEmpty()) {
        if (await pushStateToCloud({ silent: true })) {
          cloud.message = "Sesión activa. Este dispositivo tenía cambios más recientes y ya los subí a la nube.";
        }
        return;
      }

      applyCloudState(remote.state, remote.updated_at);
      cloud.message = "Datos descargados automáticamente desde la nube.";
      return;
    }

    if (!isLocalStateEmpty()) {
      if (await pushStateToCloud({ silent: true })) {
        cloud.message = "Primer respaldo creado en la nube.";
      }
      return;
    }

    cloud.message = "Sesión activa. La nube todavía no tiene datos.";
  } catch (error) {
    console.error(error);
    cloud.message = error.message || "Sesión activa, pero no pude sincronizar la nube.";
  }
}

function isLocalStateNewerThanRemote(remote) {
  const localTime = Date.parse(state.updatedAt || "");
  const remoteTime = Date.parse(remote?.updated_at || remote?.state?.updatedAt || "");

  return Number.isFinite(localTime) && Number.isFinite(remoteTime) && localTime > remoteTime;
}

async function signOutCloud() {
  if (!cloud.client) return;
  cloud.busy = true;
  render();

  const { error } = await cloud.client.auth.signOut();
  if (error) {
    cloud.message = error.message;
  } else {
    cloud.user = null;
    cloud.pendingEmail = "";
    cloud.confirmationPending = false;
    cloud.message = "Sesión cerrada. Los datos siguen guardados localmente.";
  }

  cloud.busy = false;
  render();
}

function queueCloudAutoSync() {
  if (cloud.suspendAutoSync || !cloud.client || !cloud.user) return;
  window.clearTimeout(cloud.autoTimer);
  cloud.autoTimer = window.setTimeout(() => {
    pushStateToCloud({ silent: true });
  }, 1400);
}

async function pushStateToCloud(options = {}) {
  if (!cloud.client || !cloud.user) {
    if (!options.silent) showToast("Inicia sesión para sincronizar.");
    return false;
  }

  if (!options.silent) {
    cloud.busy = true;
    cloud.message = "Subiendo este dispositivo...";
    render();
  }

  try {
    const updatedAt = new Date().toISOString();
    const { error } = await cloud.client
      .from(CLOUD_TABLE)
      .upsert(
        {
          user_id: cloud.user.id,
          state,
          updated_at: updatedAt,
        },
        { onConflict: "user_id" },
      );

    if (error) throw error;
    cloud.lastSync = updatedAt;
    cloud.message = "Datos guardados en la nube.";
    return true;
  } catch (error) {
    console.error(error);
    cloud.message = error.message || "No pude subir los datos.";
    return false;
  } finally {
    cloud.busy = false;
    if (!options.silent) render();
  }
}

async function pullStateFromCloud(options = {}) {
  if (!cloud.client || !cloud.user) {
    if (!options.silent) showToast("Inicia sesión para sincronizar.");
    return;
  }

  cloud.busy = true;
  cloud.message = "Descargando nube...";
  render();

  try {
    const remote = await fetchCloudRow();
    if (!remote?.state) {
      cloud.message = options.silentIfEmpty ? "No hay datos remotos todavía." : "La nube todavía no tiene datos.";
      return;
    }

    applyCloudState(remote.state, remote.updated_at);
    cloud.message = "Datos descargados desde la nube.";
  } catch (error) {
    console.error(error);
    cloud.message = error.message || "No pude descargar la nube.";
  } finally {
    cloud.busy = false;
    render();
  }
}

async function fetchCloudRow() {
  const { data, error } = await cloud.client
    .from(CLOUD_TABLE)
    .select("state, updated_at")
    .eq("user_id", cloud.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function applyCloudState(remoteState, updatedAt) {
  cloud.suspendAutoSync = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
  state = loadState();
  cloud.lastSync = updatedAt || "";
  cloud.suspendAutoSync = false;
}

function isLocalStateEmpty() {
  return !state.profile.onboarded && state.habits.length === 0;
}

function getCloudStatus() {
  if (cloud.busy) return { label: "Sincronizando", className: "open" };
  if (cloud.user) return { label: "Nube conectada", className: "done" };
  if (cloud.configured) return { label: "Nube configurada", className: "open" };
  return { label: "Solo local", className: "missed" };
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

function formatDateTime(value) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
