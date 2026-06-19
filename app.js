const STORAGE_KEY = "habit-loop-lab-state-v1";
const CLOUD_CONFIG_KEY = "habit-loop-lab-cloud-config-v1";
const CLOUD_BACKUP_KEY = "habit-loop-lab-cloud-backups-v1";
const CLOUD_TABLE = "habit_states";
const SUPABASE_MODULE_URL = "https://esm.sh/@supabase/supabase-js@2.46.1";
const CLOUD_REFRESH_INTERVAL = 60 * 1000;
const DEFAULT_CLOUD_CONFIG = {
  url: "https://rzpdqrcfqxpgpjstfxau.supabase.co",
  anonKey: "sb_publishable_4S7QCVJjbtMGd8-RghkzLA_UYfTAPld",
};
const MAX_HABITS = 3;
const HABIT_LIFECYCLE = {
  FORMATION: "formation",
  MAINTENANCE: "maintenance",
};

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
    title: "¿Quién quieres ser?",
    why: "No lo que harás, sino en qué tipo de persona te convertirás al hacerlo.",
    example: "Soy alguien que cuida su mente cada mañana.",
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
  activeView: getInitialView(),
  sidebarOpen: false,
  showCloudPanel: false,
  reward: null,
  confirmation: null,
  dailyNoteDrafts: {},
  urgeHabitId: null,
  explicitDailyHabitId: null,
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
  refreshInFlight: false,
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
registerAutomaticCloudRefresh();
render();
initCloud();

function createFallbackState() {
  return {
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
    deletedHabitIds: [],
    deletedLogKeys: [],
    deletedLogTimes: {},
    rewardHistory: [],
    reflections: [],
  };
}

function loadState() {
  const fallback = createFallbackState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    return normalizeState(JSON.parse(saved), fallback);
  } catch (error) {
    console.warn("Could not load saved state", error);
    return fallback;
  }
}

function normalizeState(candidate, fallback = createFallbackState()) {
  const parsed = candidate && typeof candidate === "object" ? candidate : {};
  const deletedHabitIds = Array.isArray(parsed.deletedHabitIds)
    ? [...new Set(parsed.deletedHabitIds.filter(Boolean).map(String))]
    : [];
  const deletedLogKeys = Array.isArray(parsed.deletedLogKeys)
    ? [...new Set(parsed.deletedLogKeys.filter(Boolean).map(String))]
    : [];
  const deletedLogTimes = normalizeDeletedLogTimes(parsed.deletedLogTimes);

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
    habits: Array.isArray(parsed.habits)
      ? parsed.habits.map(normalizeHabit).filter(Boolean).map((habit) => pruneDeletedLogs(habit, deletedLogKeys, deletedLogTimes))
      : [],
    selectedHabitId: parsed.selectedHabitId || null,
    deletedHabitIds,
    deletedLogKeys,
    deletedLogTimes,
    rewardHistory: Array.isArray(parsed.rewardHistory) ? parsed.rewardHistory : [],
    reflections: Array.isArray(parsed.reflections) ? parsed.reflections : [],
  };
}

function normalizeDeletedLogTimes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, timestamp]) => key && Number.isFinite(Date.parse(timestamp)))
      .map(([key, timestamp]) => [String(key), String(timestamp)]),
  );
}

function normalizeHabit(habit) {
  if (!habit || typeof habit !== "object") return null;

  const logs = normalizeLogs(habit.logs);
  const logDates = Object.keys(logs).sort();
  const createdAt = isDateKey(habit.createdAt) ? habit.createdAt : logDates[0] || todayKey();
  const lifecycle = Object.values(HABIT_LIFECYCLE).includes(habit.lifecycle)
    ? habit.lifecycle
    : HABIT_LIFECYCLE.FORMATION;
  const id = habit.id || `habit-${stableHash([
    habit.identity,
    habit.anchor,
    habit.action,
    createdAt,
  ].join("|"))}`;

  return {
    ...habit,
    id,
    lifecycle,
    createdAt,
    logs,
  };
}

function normalizeLogs(logs) {
  if (!logs) return {};

  if (Array.isArray(logs)) {
    return logs.reduce((result, item) => {
      if (typeof item === "string" && isDateKey(item)) {
        result[item] = normalizeLogEntry("done");
        return result;
      }

      if (item && typeof item === "object") {
        const dateKey = item.dateKey || item.date || item.day;
        const entry = normalizeLogEntry(item);
        if (isDateKey(dateKey) && entry) result[dateKey] = entry;
      }

      return result;
    }, {});
  }

  if (typeof logs !== "object") return {};

  return Object.entries(logs).reduce((result, [dateKey, value]) => {
    const entry = normalizeLogEntry(value);
    if (isDateKey(dateKey) && entry) result[dateKey] = entry;
    return result;
  }, {});
}

function normalizeLogEntry(value) {
  if (value === true) {
    return {
      status: "done",
      ease: 3,
      minimum: false,
      note: "",
      at: "",
      updatedAt: "",
    };
  }

  if (value === false) {
    return {
      status: "missed",
      ease: 1,
      minimum: false,
      note: "",
      at: "",
      updatedAt: "",
    };
  }

  if (typeof value === "string") {
    const status = normalizeLogStatus(value);
    if (!status) return null;
    return {
      status,
      ease: status === "done" ? 3 : 1,
      minimum: value === "minimum",
      note: "",
      at: "",
      updatedAt: "",
    };
  }

  if (!value || typeof value !== "object") return null;

  const status = normalizeLogStatus(
    value.status || value.result || (value.done ? "done" : "") || (value.missed ? "missed" : ""),
  );
  if (!status) return null;

  return {
    ...value,
    status,
    ease: Number.isFinite(Number(value.ease)) ? Number(value.ease) : status === "done" ? 3 : 1,
    minimum: Boolean(value.minimum),
    note: cleanText(value.note || value.description || value.comment || ""),
    at: typeof value.at === "string" ? value.at : value.updatedAt || value.createdAt || "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.at || value.createdAt || "",
  };
}

function normalizeLogStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["done", "complete", "completed", "success", "minimum"].includes(value)) return "done";
  if (["missed", "miss", "skip", "skipped", "failed"].includes(value)) return "missed";
  return "";
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

function getInitialView() {
  const view = window.location.hash.replace("#", "");
  return ["today", "habits", "progress", "menu"].includes(view) ? view : "today";
}

function updateViewHash(view) {
  if (window.location.hash === `#${view}`) return;
  window.history.replaceState(null, "", `#${view}`);
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
  const draft = getOnboardingDraft();
  const stepIndex = getOnboardingStepIndex();
  const step = onboardingSteps[stepIndex];
  const isFinalStep = step.id === "review";

  return `
    <main class="onboarding-wrap">
      <section class="onboarding-panel onboarding-${step.id}" aria-labelledby="onboarding-title">
        <header class="onboarding-brand">
          <img class="brand-mark" src="assets/icons/app-icon.svg?v=20260618-mockup-frame4" alt="" />
          <span id="onboarding-title">Habit Loop Lab</span>
          <button class="onboarding-cloud-link" type="button" data-action="open-cloud">Ya tengo datos</button>
        </header>
        ${ui.showCloudPanel ? renderCloudPanel() : ""}

        ${ui.toast ? `<div class="toast onboarding-toast" role="status">${escapeHtml(ui.toast)}</div>` : ""}

        <form id="onboarding-form" class="onboarding-form" data-step="${step.id}">
          <div class="onboarding-progress" aria-label="Progreso del cuestionario">
            <span>Paso ${stepIndex + 1} de ${onboardingSteps.length}</span>
            <div class="onboarding-dots">
              ${onboardingSteps.map((_, index) => `<i class="${index === stepIndex ? "active" : ""}"></i>`).join("")}
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

          ${step.id === "identity" ? "" : renderOnboardingPreview(draft)}

          <div class="form-footer">
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
                : `<button class="button primary" type="button" data-action="onboarding-next">Continuar <span aria-hidden="true">→</span></button>`
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
          placeholder="Soy alguien que…"
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
    ? "Inicia sesión y la app mantendrá tus hábitos actualizados automáticamente."
    : "Inicia sesión una vez. La app se encarga de mantener los dispositivos actualizados.";

  return `
    <section class="cloud-access ${context === "onboarding" ? "cloud-access-onboarding" : ""}">
      <div>
        <span class="status-pill ${status.className}">${status.label}</span>
        <h2>${title}</h2>
        <p>${body}</p>
        ${cloud.message ? `<p class="fine-print">${escapeHtml(cloud.message)}</p>` : ""}
      </div>
      <button class="button secondary" type="button" data-action="open-cloud">Iniciar sesión</button>
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
              ${cloud.confirmationPending && cloud.pendingEmail ? `<button class="button ghost" type="button" data-action="cloud-resend-confirmation" ${cloud.busy ? "disabled" : ""}>Reenviar confirmación</button>` : ""}
              <button class="button secondary" type="submit" data-auth-mode="signup" ${cloud.busy ? "disabled" : ""}>Crear cuenta</button>
              <button class="button primary" type="submit" data-auth-mode="login" ${cloud.busy ? "disabled" : ""}>Iniciar sesión</button>
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
          <h2 id="cloud-title">Sesión iniciada</h2>
          <p>${escapeHtml(cloud.user.email || "Sesión iniciada")}</p>
        </div>
        <button class="icon-button" type="button" data-action="close-cloud" aria-label="Cerrar sincronización">×</button>
      </div>

      <div class="cloud-status-card">
        <span class="status-pill ${status.className}">${status.label}</span>
        <p>Tus cambios se sincronizan automáticamente entre dispositivos.</p>
        ${cloud.lastSync ? `<p class="fine-print">Última sincronización: ${escapeHtml(formatDateTime(cloud.lastSync))}</p>` : ""}
      </div>

      <div class="button-row">
        <button class="button ghost" type="button" data-action="cloud-logout" ${cloud.busy ? "disabled" : ""}>Cerrar sesión</button>
      </div>
    </section>
  `;
}

function renderDashboard() {
  const trackedHabits = getTrackedHabits();
  const formationHabits = getFormationHabits();
  const selectedHabit = getSelectedHabit();
  const requestedDailyHabit = trackedHabits.find((habit) => habit.id === ui.explicitDailyHabitId);
  const dailyHabit = requestedDailyHabit || getDailyPriorityHabit() || selectedHabit;
  const dashboardHabit = requestedDailyHabit || selectedHabit || dailyHabit;
  const urgeHabit = state.habits.find((habit) => habit.id === ui.urgeHabitId) || dailyHabit || selectedHabit;
  const completedToday = trackedHabits.filter((habit) => getStatusForDate(habit, todayKey()) === "done").length;
  const averageAutomaticity = trackedHabits.length
    ? Math.round(trackedHabits.reduce((sum, habit) => sum + getHabitStats(habit).automaticity, 0) / trackedHabits.length)
    : 0;
  const riskyHabits = formationHabits.filter((habit) => getMissStreak(habit) > 0 && getStatusForDate(habit, todayKey()) !== "done");
  const canAddHabit = canAddFormationHabit();

  return `
    <div class="app-shell">
      ${renderAppNavigation()}
      <main class="workspace">
        ${ui.toast ? `<div class="toast" role="status">${escapeHtml(ui.toast)}</div>` : ""}
        ${ui.reward ? renderReward(ui.reward) : ""}
        ${ui.showCloudPanel ? renderCloudPanel() : ""}
        ${ui.showHabitForm ? renderHabitForm() : ""}

        ${renderActiveView({
          trackedHabits,
          formationHabits,
          selectedHabit: dashboardHabit,
          dailyHabit,
          urgeHabit,
          completedToday,
          averageAutomaticity,
          riskyHabits,
          canAddHabit,
        })}
      </main>
    </div>
  `;
}

function renderAppNavigation() {
  const views = [
    { id: "today", label: "Hoy" },
    { id: "habits", label: "Hábitos" },
    { id: "progress", label: "Progreso" },
    { id: "menu", label: "Menú" },
  ];

  return `
    <nav class="app-nav" aria-label="Navegación principal">
      <div class="nav-items">
        ${views.map((view) => `
          <button
            class="nav-item ${ui.activeView === view.id ? "active" : ""}"
            type="button"
            data-action="switch-view"
            data-view="${view.id}"
            aria-current="${ui.activeView === view.id ? "page" : "false"}"
          >
            <span class="nav-icon" aria-hidden="true">${renderNavIcon(view.id)}</span>
            <span>${view.label}</span>
          </button>
        `).join("")}
      </div>
    </nav>
  `;
}

function renderNavIcon(view) {
  const icons = {
    today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>',
    habits: '<svg viewBox="0 0 24 24"><path d="M6.7 7.5A7 7 0 0 1 18.9 9"/><path d="M18.9 9V4.8M18.9 9h-4.2M17.3 16.5A7 7 0 0 1 5.1 15"/><path d="M5.1 15v4.2M5.1 15h4.2"/></svg>',
    progress: '<svg viewBox="0 0 24 24"><path d="M4 18.5V13l4-3.5 4 2.5 7-7"/><path d="M15.5 5H19v3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
  };
  return icons[view] || icons.menu;
}

function renderActiveView(context) {
  if (ui.confirmation) return renderConfirmation(ui.confirmation);
  if (ui.activeView === "habits") return renderHabitsView(context);
  if (ui.activeView === "progress") return renderProgressView(context.selectedHabit, context.riskyHabits);
  if (ui.activeView === "menu") return renderMenuView(context.averageAutomaticity);
  return renderTodayView(context);
}

function renderTodayView({ trackedHabits, dailyHabit, urgeHabit, completedToday }) {
  const allCompleted = trackedHabits.length > 0
    && trackedHabits.every((habit) => getStatusForDate(habit, todayKey()) === "done");

  return `
    <section class="view-shell today-view" aria-labelledby="today-title">
      ${allCompleted ? "" : `<header class="mockup-day-header">
        <span class="section-chip">Hoy</span>
        <span id="today-title">${formatDayLabel(todayKey())} · ${completedToday} de ${trackedHabits.length}</span>
      </header>`}

      ${allCompleted ? renderAllCompleted(trackedHabits) : dailyHabit ? renderDailyFocus(dailyHabit) : renderEmptyState()}
      ${ui.urgeHabitId && urgeHabit ? renderUrgeSurfingPanel(urgeHabit) : ""}
      ${!allCompleted ? renderTodayDots(trackedHabits) : ""}
      <span class="sr-only">${completedToday}/${trackedHabits.length || 0} micro-votos emitidos hoy.</span>
    </section>
  `;
}

function renderTodayDots(habits) {
  return `
    <div class="today-dots" aria-label="Estado de hábitos de hoy">
      ${habits.map((habit) => `
        <button
          class="${getStatusForDate(habit, todayKey())} ${habit.id === ui.explicitDailyHabitId ? "active" : ""}"
          type="button"
          data-action="select-today-habit"
          data-id="${habit.id}"
          aria-label="Abrir ${escapeAttr(habit.action)}"
          title="${escapeAttr(habit.action)}"
        ></button>
      `).join("")}
    </div>
  `;
}

function renderConfirmation(confirmation) {
  const nextHabit = confirmation.nextHabitId
    ? state.habits.find((habit) => habit.id === confirmation.nextHabitId)
    : null;

  return `
    <section class="confirmation-view" aria-live="polite">
      <div class="confirmation-icon" aria-hidden="true">✓</div>
      <h1>${confirmation.minimum ? "Mínimo protegido." : "Listo. Ciclo cerrado."}</h1>
      <p>${confirmation.minimum ? "La constancia también cuenta en pequeño." : "Cada vez un poco más fácil que ayer."}</p>
      <button class="confirmation-next" type="button" data-action="continue-after-confirmation">
        <span>${nextHabit ? "Siguiente" : "Por hoy"}</span>
        <strong>${nextHabit ? escapeHtml(nextHabit.action) : "Todo hecho"}</strong>
      </button>
    </section>
  `;
}

function renderAllCompleted(habits) {
  const completion = Math.round(
    habits.reduce((total, habit) => total + getCompletionRateForDays(habit, 28), 0) / habits.length * 100,
  );
  const averageEase = Math.round(
    habits.reduce((total, habit) => total + getHabitStats(habit).averageEase, 0) / habits.length / 5 * 100,
  );
  const historyDays = Math.max(...habits.map((habit) => getHabitStats(habit).ageDays));

  return `
    <section class="all-completed">
      <span>${formatDayLabel(todayKey())}</span>
      <h1 id="today-title">Todo hecho.</h1>
      <p>${habits.length} ciclos cerrados hoy. Eso es suficiente.</p>
      <div class="all-completed-stats">
        <div><strong>${completion}%</strong><span>4 semanas</span></div>
        <div><strong>${historyDays}</strong><span>días</span></div>
        <div><strong>${averageEase}%</strong><span>facilidad</span></div>
      </div>
    </section>
  `;
}

function renderHabitsView({ canAddHabit }) {
  const formationHabits = getFormationHabits();
  const maintenanceHabits = getMaintenanceHabits();
  const freeSlots = Math.max(0, MAX_HABITS - formationHabits.length);

  return `
    <section class="view-shell habits-view" aria-labelledby="habits-view-title">
      <header class="mockup-view-header">
        <span class="section-chip" id="habits-view-title">Hábitos</span>
        <p>${formationHabits.length} / ${MAX_HABITS} espacios</p>
      </header>

      ${renderCompactHabitGroup("En formación", formationHabits)}

      <button
        class="capacity-note ${freeSlots ? "" : "full"}"
        type="button"
        data-action="open-form"
        title="${canAddHabit ? "Crear un nuevo hábito en formación" : "Pasa un hábito listo a mantenimiento para abrir espacio"}"
        ${canAddHabit ? "" : "disabled"}
      >
        <strong>${freeSlots ? "+ Añadir hábito" : "Capacidad de formación completa"}</strong>
        <span>${freeSlots
          ? `Puedes añadir ${freeSlots} ${freeSlots === 1 ? "hábito" : "hábitos"} más.`
          : "Pasa un hábito listo a mantenimiento para abrir espacio."
        }</span>
      </button>

      ${renderCompactHabitGroup("Mantenimiento", maintenanceHabits)}
    </section>
  `;
}

function renderCompactHabitGroup(title, habits) {
  return `
    <section class="habit-list-section" aria-label="${escapeAttr(title)}">
      <div class="list-section-title">
        <h2>${escapeHtml(title)}</h2>
      </div>
      ${habits.length
        ? `<div class="compact-habit-list">${habits.map(renderCompactHabitItem).join("")}</div>`
        : `<p class="empty-note">No hay hábitos en ${title.toLowerCase()}.</p>`
      }
    </section>
  `;
}

function renderCompactHabitItem(habit, index) {
  const stats = getHabitStats(habit);
  const lifecycle = getHabitLifecycle(habit);

  return `
    <article class="compact-habit-item ${lifecycle}">
      <button class="habit-list-main" type="button" data-action="view-progress" data-id="${habit.id}">
        <span class="habit-list-number">${lifecycle === HABIT_LIFECYCLE.MAINTENANCE ? "—" : String(index + 1).padStart(2, "0")}</span>
        <span class="habit-list-copy">
          <strong>${escapeHtml(habit.action)}</strong>
          <small>Después de ${escapeHtml(habit.anchor)} · ${stats.ageDays} días</small>
        </span>
        <span class="habit-list-badge ${lifecycle}">
          ${lifecycle === HABIT_LIFECYCLE.MAINTENANCE ? "Auto" : `${Math.round((stats.averageEase / 5) * 100)}%`}
        </span>
      </button>
    </article>
  `;
}

function renderProgressView(habit, riskyHabits = []) {
  if (!habit) return renderEmptyState();

  const stats = getHabitStats(habit);
  const lifecycle = getHabitLifecycle(habit);
  const completion = Math.round(getCompletionRateForDays(habit, 28) * 100);
  const ease = Math.round((stats.averageEase / 5) * 100);
  const missStreak = getMissStreak(habit);
  const isRisky = riskyHabits.some((item) => item.id === habit.id) || missStreak > 0;
  const phase = lifecycle === HABIT_LIFECYCLE.MAINTENANCE ? "maintenance" : stats.ageDays <= 21 ? "effort" : "consolidation";
  const todayLog = habit.logs?.[todayKey()];
  const readiness = getMaintenanceReadiness(habit, stats);
  const historyDays = getHabitHistoryDays(habit);

  return `
    <section class="view-shell progress-view" aria-labelledby="progress-view-title">
      <header class="mockup-view-header progress-heading">
        <span class="section-chip">Progreso</span>
      </header>
      <div class="progress-title">
        <h1 id="progress-view-title">${escapeHtml(habit.action)}</h1>
        <p>${stats.ageDays} días de historia</p>
      </div>

      <div class="progress-mini-stats">
        <div><strong>${completion}%</strong><span>Últimas 4 sem.</span></div>
        <div><strong>${ease}%</strong><span>Facilidad</span></div>
        <div><strong>${stats.reminderPolicy.label}</strong><span>Recordat.</span></div>
      </div>

      <section class="progress-section">
        <div class="list-section-title"><h2>Etapa de automaticidad</h2></div>
        <div class="automaticity-stages" aria-label="Etapa de automaticidad">
          <span class="${phase === "effort" ? "active" : ""}">Esfuerzo consciente</span>
          <span class="${phase === "consolidation" ? "active" : ""}">Consolidación</span>
          <span class="${phase === "maintenance" ? "active maintenance" : ""}">Mantenimiento</span>
        </div>
      </section>

      <section class="progress-section">
        <div class="list-section-title"><h2>Historial diario</h2><span>${historyDays.length} días</span></div>
        ${renderHistoryHeatmap(habit, historyDays)}
      </section>

      ${renderHabitNotes(habit)}
      ${isRisky ? renderProgressRelapse(habit, missStreak) : ""}

      <details class="progress-details">
        <summary>Ver más detalles</summary>
        <div class="progress-details-body">
          ${todayLog?.status === "done" ? `
            <label class="form-field">
              ¿Qué tan fácil se sintió hoy?
              <span class="range-line">
                <input data-ease-for="${habit.id}" type="range" min="1" max="5" value="${todayLog.ease || 3}" />
                <span class="range-value" id="ease-${habit.id}">${todayLog.ease || 3}</span>
              </span>
            </label>
          ` : ""}
          ${renderTransitionPanel(habit)}
          ${renderStackMapForHabit(habit)}
          <section class="panel progress-management">
            <div class="section-title">
              <div>
                <h2>Gestionar hábito</h2>
                <p>Editar el plan o cambiar su estado.</p>
              </div>
            </div>
            <div class="button-row">
              <button class="button ghost" type="button" data-action="select-today-habit" data-id="${habit.id}">
                ${todayLog?.status ? "Ver hoy" : "Registrar hoy"}
              </button>
              ${renderLifecycleAction(habit, readiness)}
              ${todayLog?.status ? `<button class="button ghost" type="button" data-action="undo-log" data-id="${habit.id}">Reabrir hoy</button>` : ""}
              <button class="button ghost" type="button" data-action="edit-habit" data-id="${habit.id}">Editar</button>
              <button class="button warning" type="button" data-action="delete-habit" data-id="${habit.id}">Eliminar</button>
            </div>
          </section>
        </div>
      </details>
    </section>
  `;
}

function renderHistoryHeatmap(habit, days = getHabitHistoryDays(habit)) {
  return `
    <div class="history-heatmap" aria-label="Historial de ${days.length} días">
      ${days.map((day) => `
        <span class="${getStatusForDate(habit, day)}" title="${formatDate(day)}"></span>
      `).join("")}
    </div>
  `;
}

function renderHabitNotes(habit) {
  const notes = Object.entries(habit.logs || {})
    .filter(([, log]) => cleanText(log?.note))
    .sort(([firstDay], [secondDay]) => secondDay.localeCompare(firstDay))
    .slice(0, 6);

  if (!notes.length) return "";

  return `
    <section class="progress-section habit-notes" aria-labelledby="habit-notes-title">
      <div class="list-section-title"><h2 id="habit-notes-title">Notas de seguimiento</h2></div>
      <div class="habit-note-list">
        ${notes.map(([day, log]) => `
          <article class="habit-note-item">
            <span>${escapeHtml(formatDate(day))}${log.minimum ? " · Versión mínima" : ""}</span>
            <p>${escapeHtml(log.note)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderProgressRelapse(habit, missStreak) {
  return `
    <section class="progress-relapse">
      <strong>${missStreak >= 2 ? "Protege el mínimo hoy" : "Ayer fue información"}</strong>
      <p>No una sentencia. Haz la versión mínima para evitar que una falla se convierta en patrón.</p>
      <button class="button rescue" type="button" data-action="go-today" data-id="${habit.id}">
        Registrar ahora →
      </button>
    </section>
  `;
}

function renderStackMapForHabit(habit) {
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h2>Plan si-entonces</h2>
          <p>La señal ambiental que delega la decisión.</p>
        </div>
      </div>
      <div class="stack-row">
        <div class="stack-node">${escapeHtml(habit.anchor)}</div>
        <div class="stack-arrow" aria-hidden="true">→</div>
        <div class="stack-node">${escapeHtml(habit.action)}</div>
      </div>
    </section>
  `;
}

function renderMenuView(averageAutomaticity) {
  const copy = stageCopy[state.profile.stage] || stageCopy.preparation;
  const formationCount = getFormationHabits().length;
  const maintenanceCount = getMaintenanceHabits().length;

  return `
    <section class="view-shell menu-view" aria-labelledby="menu-view-title">
      <header class="view-header">
        <span class="section-chip">Menú</span>
        <h1 id="menu-view-title">Habit Loop Lab</h1>
      </header>

      <div class="menu-grid">
        <section class="menu-section">
          <h2>Identidad</h2>
          <p class="identity-statement">${escapeHtml(state.profile.identity)}</p>
          <span class="stage-pill">${copy.label}</span>
          <p class="sidebar-note">${escapeHtml(copy.action)}</p>
        </section>

        <section class="menu-section">
          <h2>Capacidad</h2>
          <p class="identity-statement">${formationCount}/${MAX_HABITS} en formación</p>
          <p class="sidebar-note">${maintenanceCount} en mantenimiento · Automaticidad promedio: ${averageAutomaticity}%</p>
        </section>

        <section class="menu-section">
          <h2>Regla clínica</h2>
          <p class="sidebar-note">Una falla es información. Dos fallas seguidas activan el plan mínimo.</p>
        </section>

        <section class="menu-section">
          <h2>Cuenta</h2>
          <p class="sidebar-note">
            ${cloud.user
              ? `${escapeHtml(cloud.user.email || "Sesión iniciada")} · Sincronización automática activa.`
              : "Inicia sesión para mantener tus datos actualizados en todos tus dispositivos."
            }
          </p>
          <button
            class="button ${cloud.user ? "ghost" : "primary"}"
            type="button"
            data-action="${cloud.user ? "cloud-logout" : "open-cloud"}"
            ${cloud.busy ? "disabled" : ""}
          >
            ${cloud.user ? "Cerrar sesión" : "Iniciar sesión"}
          </button>
        </section>
      </div>
    </section>
  `;
}

function renderDailyFocus(habit) {
  const todayStatus = getStatusForDate(habit, todayKey());
  const stats = getHabitStats(habit);
  const ease = Math.round((stats.averageEase / 5) * 100);
  const actionDisabled = todayStatus === "done";
  const dailyNote = ui.dailyNoteDrafts[habit.id] ?? habit.logs?.[todayKey()]?.note ?? "";

  return `
    <section class="daily-focus" aria-labelledby="daily-action-title">
      <article class="identity-card">
        <span>Soy</span>
        <p>${escapeHtml(stripIdentityPrefix(habit.identity))}</p>
      </article>

      <article class="today-habit-card">
        <span class="today-anchor"><i></i>Después de ${escapeHtml(habit.anchor)}</span>
        <h2 id="daily-action-title">${escapeHtml(habit.action)}</h2>
        <div class="today-desired-state">
          <i></i>
          <p>para sentir ${escapeHtml(habit.desiredState)}</p>
        </div>
      </article>

      <div class="today-ease" aria-label="Facilidad estimada ${ease}%">
        <span>Facilidad</span>
        <div><i style="--value:${ease}%"></i></div>
        <strong>${ease}%</strong>
      </div>

      ${!actionDisabled ? `
        <label class="daily-note-field">
          <span>Nota — opcional</span>
          <textarea
            data-daily-note-for="${escapeAttr(habit.id)}"
            maxlength="240"
            placeholder="¿Cómo fue hoy?"
          >${escapeHtml(dailyNote)}</textarea>
        </label>
      ` : ""}

      <div class="today-actions" aria-label="Registro diario">
        <button class="today-action-primary" type="button" data-action="log-done" data-id="${habit.id}" ${actionDisabled ? "disabled" : ""}>
          <span aria-hidden="true">✓</span>
          <strong>${todayStatus === "done" ? "Registrado" : "Lo hice"}</strong>
        </button>
        <div class="today-action-row">
          <button class="today-action-secondary rescue" type="button" data-action="log-minimum" data-id="${habit.id}" ${actionDisabled ? "disabled" : ""}>
            <span aria-hidden="true">−</span>
            <strong>Versión mínima</strong>
          </button>
          <button class="today-action-secondary missed" type="button" data-action="log-missed" data-id="${habit.id}" ${actionDisabled ? "disabled" : ""}>
            <span aria-hidden="true">○</span>
            <strong>Hoy no pude</strong>
          </button>
        </div>
        <button class="today-action-secondary urge" type="button" data-action="open-urge" data-id="${habit.id}">
          <span aria-hidden="true">∿</span>
          <strong>Impulso fuerte</strong>
        </button>
        ${todayStatus !== "open" ? `<button class="button ghost reopen-button" type="button" data-action="undo-log" data-id="${habit.id}">Reabrir registro de hoy</button>` : ""}
      </div>
    </section>
  `;
}

function stripIdentityPrefix(identity) {
  return cleanText(identity).replace(/^soy\s+/i, "");
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

function renderHabitSection(activeDailyHabitId = null) {
  if (!state.habits.length) return renderEmptyState();
  const formationHabits = getFormationHabits();
  const maintenanceHabits = getMaintenanceHabits();

  return `
    ${renderHabitGroup({
      title: "En formación",
      description: `Máximo ${MAX_HABITS}. Estos hábitos todavía consumen esfuerzo consciente.`,
      habits: formationHabits,
      tag: `${formationHabits.length}/${MAX_HABITS}`,
      activeDailyHabitId,
      empty: "No hay hábitos en formación. Puedes añadir uno nuevo.",
    })}
    ${maintenanceHabits.length ? renderHabitGroup({
      title: "Mantenimiento",
      description: "No cuentan contra el límite porque ya muestran señales de automaticidad.",
      habits: maintenanceHabits,
      tag: `${maintenanceHabits.length}`,
      activeDailyHabitId,
    }) : ""}
  `;
}

function renderHabitGroup({ title, description, habits, tag, activeDailyHabitId, empty = "" }) {
  const titleId = `habits-${cleanText(title).toLowerCase().replace(/\s+/g, "-")}`;

  return `
    <section class="section-block" aria-labelledby="${titleId}">
      <div class="section-title">
        <div>
          <h2 id="${titleId}">${title}</h2>
          <p>${description}</p>
        </div>
        <span class="tag">${tag}</span>
      </div>
      ${habits.length ? `
        <div class="habit-grid">
          ${habits.map((habit) => renderHabitCard(habit, activeDailyHabitId)).join("")}
        </div>
      ` : `<p class="empty-note">${empty}</p>`}
    </section>
  `;
}

function renderHabitCard(habit, activeDailyHabitId = null) {
  const stats = getHabitStats(habit);
  const todayStatus = getStatusForDate(habit, todayKey());
  const lifecycle = getHabitLifecycle(habit);
  const readiness = getMaintenanceReadiness(habit, stats);
  const hasActiveDailyHabit = Boolean(activeDailyHabitId);
  const isActiveDailyHabit = habit.id === activeDailyHabitId;
  const isSelected = isActiveDailyHabit || (!hasActiveDailyHabit && habit.id === state.selectedHabitId);
  const selected = isSelected ? "selected" : "";
  const statusClass = todayStatus === "done" ? "done" : todayStatus === "missed" ? "missed" : "open";
  const recentDays = getRecentDays(14);
  const focusLabel = todayStatus === "open" ? "Registrar / progreso" : "Ver progreso";
  const selectedLabel = todayStatus === "open" ? "Hábito abierto" : "Progreso abierto";
  const focusHint = `Abrir registro y progreso de ${habit.action}`;

  return `
    <article class="habit-card ${selected}">
      <div class="habit-head">
        <div>
          <h3>${escapeHtml(habit.action)}</h3>
          <p class="muted" style="margin: 4px 0 0;">${escapeHtml(habit.identity)}</p>
        </div>
        <div class="habit-pills">
          <span class="phase-pill">${lifecycle === HABIT_LIFECYCLE.MAINTENANCE ? "Mantenimiento" : "En formación"}</span>
          <span class="status-pill ${statusClass}">${getStatusLabel(todayStatus)}</span>
        </div>
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
        ${lifecycle === HABIT_LIFECYCLE.FORMATION ? `<p class="fine-print">Mantenimiento: ${readiness.passed}/${readiness.total} señales listas.</p>` : `<p class="fine-print">No cuenta contra el límite de ${MAX_HABITS} hábitos en formación.</p>`}
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
          ${isSelected ? "disabled" : ""}
        >${isSelected ? selectedLabel : focusLabel}</button>
        ${renderLifecycleAction(habit, readiness)}
        ${todayStatus !== "open" ? `<button class="button ghost" type="button" data-action="undo-log" data-id="${habit.id}">Reabrir hoy</button>` : ""}
        <button class="icon-button" type="button" data-action="edit-habit" data-id="${habit.id}" aria-label="Editar ${escapeAttr(habit.action)}">✎</button>
        <button class="icon-button" type="button" data-action="delete-habit" data-id="${habit.id}" aria-label="Eliminar ${escapeAttr(habit.action)}">×</button>
      </div>
    </article>
  `;
}

function renderLifecycleAction(habit, readiness) {
  const lifecycle = getHabitLifecycle(habit);

  if (lifecycle === HABIT_LIFECYCLE.MAINTENANCE) {
    const canReturn = canAddFormationHabit();
    return `
      <button
        class="button ghost"
        type="button"
        data-action="move-formation"
        data-id="${habit.id}"
        title="${canReturn ? "Volver a trabajarlo como hábito en formación" : "Ya hay tres hábitos en formación"}"
        ${canReturn ? "" : "disabled"}
      >Volver a formación</button>
    `;
  }

  if (readiness.ready) {
    return `<button class="button secondary" type="button" data-action="move-maintenance" data-id="${habit.id}">Pasar a mantenimiento</button>`;
  }

  return `
    <button
      class="button ghost"
      type="button"
      disabled
      title="${escapeAttr(readiness.missing.join(" · "))}"
    >Mantenimiento ${readiness.passed}/${readiness.total}</button>
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

function renderMetrics(completedToday, averageAutomaticity, trackedHabits = getTrackedHabits()) {
  const total = trackedHabits.length || 1;
  const formationCount = getFormationHabits().length;
  const maintenanceCount = getMaintenanceHabits().length;
  const neverMissTwice = trackedHabits.filter((habit) => getMissStreak(habit) < 2).length;
  return `
    <section class="panel" aria-labelledby="metrics-title">
      <div class="section-title">
        <div>
          <h2 id="metrics-title">Señales</h2>
          <p>Seguimiento de ejecución y facilidad.</p>
        </div>
      </div>
      <div class="metrics-grid">
        <div class="metric"><span>Hoy</span><b>${completedToday}/${trackedHabits.length}</b></div>
        <div class="metric"><span>Automático</span><b>${averageAutomaticity}%</b></div>
        <div class="metric"><span>Sin doble falla</span><b>${neverMissTwice}/${total}</b></div>
        <div class="metric"><span>Formación</span><b>${formationCount}/${MAX_HABITS}</b></div>
        <div class="metric"><span>Mantenimiento</span><b>${maintenanceCount}</b></div>
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
  const readiness = getMaintenanceReadiness(habit, stats);
  const lifecycle = getHabitLifecycle(habit);

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
      <div class="readiness-list" aria-label="Criterios de mantenimiento">
        ${readiness.checks.map((check) => `
          <div class="${check.pass ? "ready" : ""}">
            <span>${check.pass ? "✓" : "·"}</span>
            <p>${escapeHtml(check.label)}</p>
          </div>
        `).join("")}
      </div>
      ${lifecycle === HABIT_LIFECYCLE.FORMATION && readiness.ready
        ? `<button class="button secondary" type="button" data-action="move-maintenance" data-id="${habit.id}">Pasar a mantenimiento</button>`
        : ""}
      ${lifecycle === HABIT_LIFECYCLE.MAINTENANCE
        ? `<p class="policy-note">Este hábito ya no cuenta contra el límite de ${MAX_HABITS} hábitos en formación.</p>`
        : ""}
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

  if (action === "switch-view") {
    ui.confirmation = null;
    ui.activeView = button.dataset.view || "today";
    updateViewHash(ui.activeView);
    render();
  }

  if (action === "select-today-habit" || action === "go-today") {
    ui.confirmation = null;
    state.selectedHabitId = id;
    ui.explicitDailyHabitId = id;
    ui.activeView = "today";
    updateViewHash("today");
    saveState();
    render();
  }

  if (action === "view-progress") {
    ui.confirmation = null;
    state.selectedHabitId = id;
    ui.explicitDailyHabitId = id;
    ui.activeView = "progress";
    updateViewHash("progress");
    saveState();
    render();
  }

  if (action === "onboarding-next") {
    const form = button.closest("form");
    persistOnboardingDraft(form);
    if (!validateCurrentOnboardingStep()) {
      render();
      return;
    }
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
    if (!canAddFormationHabit()) {
      showToast("Ya tienes tres hábitos en formación. Pasa uno listo a mantenimiento para añadir otro.");
      return;
    }
    ui.showHabitForm = true;
    ui.editingHabitId = null;
    ui.activeView = "habits";
    updateViewHash("habits");
    render();
  }

  if (action === "close-form") {
    ui.showHabitForm = false;
    ui.editingHabitId = null;
    render();
  }

  if (action === "select-habit") {
    state.selectedHabitId = id;
    ui.explicitDailyHabitId = id;
    ui.activeView = "progress";
    updateViewHash("progress");
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

  if (action === "move-maintenance") {
    moveHabitToMaintenance(id);
  }

  if (action === "move-formation") {
    moveHabitToFormation(id);
  }

  if (action === "log-done") {
    logHabit(id, "done", { note: getDailyNoteDraft(id) });
  }

  if (action === "log-minimum") {
    logHabit(id, "done", { minimum: true, ease: 2, note: getDailyNoteDraft(id) });
  }

  if (action === "log-missed") {
    logHabit(id, "missed", { note: getDailyNoteDraft(id) });
  }

  if (action === "undo-log") {
    undoToday(id);
  }

  if (action === "dismiss-reward") {
    ui.reward = null;
    render();
  }

  if (action === "continue-after-confirmation") {
    ui.confirmation = null;
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

    if (!editingId && !canAddFormationHabit()) {
      showToast("Límite de tres hábitos en formación alcanzado.");
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
  if (event.target.matches("[data-daily-note-for]")) {
    ui.dailyNoteDrafts[event.target.dataset.dailyNoteFor] = event.target.value;
  }

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
  if (event.target.matches('[data-action="progress-select"]')) {
    state.selectedHabitId = event.target.value;
    ui.explicitDailyHabitId = event.target.value;
    saveState();
    render();
    return;
  }

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
    habit.logs[todayKey()].updatedAt = new Date().toISOString();
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
    lifecycle: HABIT_LIFECYCLE.FORMATION,
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
    lifecycle: HABIT_LIFECYCLE.FORMATION,
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
  const loggedAt = new Date().toISOString();

  habit.logs = habit.logs || {};
  habit.logs[todayKey()] = {
    status,
    ease: status === "done" ? options.ease || 3 : 1,
    minimum: Boolean(options.minimum),
    note: cleanText(options.note || ""),
    at: loggedAt,
    updatedAt: loggedAt,
  };
  const logKey = getDeletedLogKey(id, todayKey());
  state.deletedLogKeys = removeDeletedLogKey(state.deletedLogKeys, id, todayKey());
  delete state.deletedLogTimes?.[logKey];
  delete ui.dailyNoteDrafts[id];

  ui.urgeHabitId = null;
  ui.explicitDailyHabitId = null;
  const nextDailyHabit = getDailyPriorityHabit() || getTrackedHabits().find((item) => !hasTodayLog(item));
  state.selectedHabitId = nextDailyHabit?.id || id;

  if (status === "done") {
    const reward = createVariableReward(habit, previousMissStreak);
    if (options.minimum) {
      reward.title = "Versión mínima protegida";
      reward.body = `${habit.identity} recibió evidencia real sin esperar motivación perfecta.`;
      reward.prompt = "Siente el alivio de haber mantenido el ciclo.";
    }
    ui.reward = null;
    ui.confirmation = {
      habitId: habit.id,
      minimum: Boolean(options.minimum),
      nextHabitId: nextDailyHabit?.id || null,
    };
    state.rewardHistory.unshift({ ...reward, habitId: habit.id, at: new Date().toISOString() });
    state.rewardHistory = state.rewardHistory.slice(0, 20);
    ui.toast = "";
  } else {
    ui.reward = null;
    ui.confirmation = null;
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

function getDailyNoteDraft(habitId) {
  const field = document.querySelector(`[data-daily-note-for="${CSS.escape(habitId)}"]`);
  return cleanText(field?.value ?? ui.dailyNoteDrafts[habitId] ?? "");
}

function undoToday(id) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit?.logs) return;
  if (habit.logs[todayKey()]?.note) ui.dailyNoteDrafts[id] = habit.logs[todayKey()].note;
  delete habit.logs[todayKey()];
  const deletedLogKey = getDeletedLogKey(id, todayKey());
  state.deletedLogKeys = [...new Set([...(state.deletedLogKeys || []), deletedLogKey])];
  state.deletedLogTimes = {
    ...(state.deletedLogTimes || {}),
    [deletedLogKey]: new Date().toISOString(),
  };
  ui.reward = null;
  ui.confirmation = null;
  ui.explicitDailyHabitId = id;
  state.selectedHabitId = id;
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
  state.deletedHabitIds = [...new Set([...(state.deletedHabitIds || []), id])];
  if (state.selectedHabitId === id) state.selectedHabitId = getFormationHabits()[0]?.id || state.habits[0]?.id || null;
  ui.showHabitForm = false;
  ui.editingHabitId = null;
  if (ui.urgeHabitId === id) ui.urgeHabitId = null;
  showToast("Hábito eliminado.");
  saveState();
  render();
}

function moveHabitToMaintenance(id) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;

  const readiness = getMaintenanceReadiness(habit);
  if (!readiness.ready) {
    showToast(`Todavía no está listo: ${readiness.missing[0] || "faltan señales de automaticidad"}.`);
    return;
  }

  habit.lifecycle = HABIT_LIFECYCLE.MAINTENANCE;
  habit.maintenanceAt = new Date().toISOString();
  ui.explicitDailyHabitId = null;
  state.selectedHabitId = getDailyPriorityHabit()?.id || habit.id;
  showToast("Hábito movido a mantenimiento. Ya no cuenta contra el límite de formación.");
  saveState();
  render();
}

function moveHabitToFormation(id) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;

  if (!canAddFormationHabit()) {
    showToast("Ya hay tres hábitos en formación. Pasa otro a mantenimiento primero.");
    return;
  }

  habit.lifecycle = HABIT_LIFECYCLE.FORMATION;
  habit.maintenanceAt = "";
  state.selectedHabitId = habit.id;
  ui.explicitDailyHabitId = habit.id;
  showToast("Hábito devuelto a formación.");
  saveState();
  render();
}

function ensureSelectedHabit() {
  if (!state.habits.length) {
    state.selectedHabitId = null;
    return;
  }
  if (!state.habits.some((habit) => habit.id === state.selectedHabitId)) {
    state.selectedHabitId = getFormationHabits()[0]?.id || state.habits[0].id;
  }
}

function getDailyPriorityHabit() {
  const formationHabits = getFormationHabits();
  if (!formationHabits.length) return null;

  const pendingHabits = formationHabits.filter((habit) => !hasTodayLog(habit));
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
  return state.habits.find((habit) => habit.id === state.selectedHabitId) || getFormationHabits()[0] || state.habits[0] || null;
}

function getTrackedHabits() {
  return state.habits.filter((habit) => getHabitLifecycle(habit) !== "archived");
}

function getFormationHabits() {
  return getTrackedHabits().filter((habit) => getHabitLifecycle(habit) === HABIT_LIFECYCLE.FORMATION);
}

function getMaintenanceHabits() {
  return getTrackedHabits().filter((habit) => getHabitLifecycle(habit) === HABIT_LIFECYCLE.MAINTENANCE);
}

function getHabitLifecycle(habit) {
  return habit?.lifecycle || HABIT_LIFECYCLE.FORMATION;
}

function canAddFormationHabit() {
  return getFormationHabits().length < MAX_HABITS;
}

function hasTodayLog(habit) {
  return Boolean(habit.logs?.[todayKey()]?.status);
}

function getDeletedLogKey(habitId, dateKey) {
  return `${habitId}:${dateKey}`;
}

function removeDeletedLogKey(keys = [], habitId, dateKey) {
  const deletedKey = getDeletedLogKey(habitId, dateKey);
  return (keys || []).filter((key) => key !== deletedKey);
}

function getMaintenanceReadiness(habit, stats = getHabitStats(habit)) {
  const difficulty = Number(habit.difficulty || 3);
  const ageReady = stats.ageDays >= 66 || (stats.ageDays >= 30 && difficulty <= 2 && stats.averageEase >= 4);
  const automaticityReady = stats.automaticity >= 75;
  const easeReady = stats.averageEase >= 4;
  const consistencyReady = stats.completionRate >= 0.8;
  const noDoubleMissReady = !hasDoubleMissInRecentDays(habit, 21);
  const reminderReady = stats.reminderPolicy === reminderPolicies.low || stats.reminderPolicy.label === reminderPolicies.low.label;
  const checks = [
    {
      pass: ageReady,
      label: "Edad suficiente: 66+ días, o 30+ si es pequeño y fácil.",
    },
    {
      pass: automaticityReady,
      label: `Automaticidad alta: ${stats.automaticity}% / 75%.`,
    },
    {
      pass: easeReady,
      label: `Facilidad percibida alta: ${stats.averageEase.toFixed(1)} / 5.`,
    },
    {
      pass: consistencyReady,
      label: `Consistencia reciente: ${Math.round(stats.completionRate * 100)}% / 80%.`,
    },
    {
      pass: noDoubleMissReady,
      label: "Sin doble falla reciente en los últimos 21 días.",
    },
    {
      pass: reminderReady,
      label: `Recordatorio bajo: ${stats.reminderPolicy.label}.`,
    },
  ];
  const passed = checks.filter((check) => check.pass).length;

  return {
    checks,
    passed,
    total: checks.length,
    ready: passed === checks.length,
    missing: checks.filter((check) => !check.pass).map((check) => check.label),
  };
}

function hasDoubleMissInRecentDays(habit, days = 21) {
  let previousWasMiss = false;

  for (const day of getRecentDays(days)) {
    if (!isActiveOn(habit, day)) continue;
    const status = getStatusForDate(habit, day);
    if (status === "missed" && previousWasMiss) return true;
    previousWasMiss = status === "missed";
    if (status === "done") previousWasMiss = false;
  }

  return false;
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

function getCompletionRateForDays(habit, days) {
  const activeDays = getRecentDays(days).filter((day) => isActiveOn(habit, day));
  if (!activeDays.length) return 0;
  return activeDays.filter((day) => getStatusForDate(habit, day) === "done").length / activeDays.length;
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
      const hadLocalData = !isLocalStateEmpty();
      applyCloudState(remote.state, remote.updated_at, { merge: hadLocalData });

      if (hadLocalData) {
        await pushStateToCloud({ silent: true, skipRemoteMerge: true });
        cloud.message = "Datos locales y nube mezclados sin borrar hábitos ni registros.";
      } else {
        cloud.message = "Datos descargados automáticamente desde la nube.";
      }
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

  window.clearTimeout(cloud.autoTimer);
  await pushStateToCloud({ silent: true });
  cloud.busy = true;

  const { error } = await cloud.client.auth.signOut({ scope: "local" });
  if (error) {
    cloud.message = error.message;
  } else {
    clearLocalUserDataAfterLogout();
  }

  cloud.busy = false;
  render();
}

function clearLocalUserDataAfterLogout() {
  window.clearTimeout(cloud.autoTimer);
  reminderTimers.forEach((timer) => window.clearTimeout(timer));
  reminderTimers = [];

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CLOUD_BACKUP_KEY);
  state = createFallbackState();

  ui.showHabitForm = false;
  ui.editingHabitId = null;
  ui.activeView = "today";
  ui.sidebarOpen = false;
  ui.showCloudPanel = false;
  ui.reward = null;
  ui.confirmation = null;
  ui.dailyNoteDrafts = {};
  ui.urgeHabitId = null;
  ui.explicitDailyHabitId = null;
  ui.toast = "";
  updateViewHash("today");

  cloud.user = null;
  cloud.pendingEmail = "";
  cloud.confirmationPending = false;
  cloud.lastSync = "";
  cloud.message = "Sesión cerrada. Los datos de este dispositivo fueron eliminados.";
}

function queueCloudAutoSync() {
  if (cloud.suspendAutoSync || !cloud.client || !cloud.user) return;
  window.clearTimeout(cloud.autoTimer);
  cloud.autoTimer = window.setTimeout(() => {
    pushStateToCloud({ silent: true });
  }, 1400);
}

function registerAutomaticCloudRefresh() {
  window.addEventListener("online", refreshCloudStateSilently);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshCloudStateSilently();
  });
  window.setInterval(refreshCloudStateSilently, CLOUD_REFRESH_INTERVAL);
}

async function refreshCloudStateSilently() {
  if (
    cloud.refreshInFlight ||
    cloud.busy ||
    !cloud.client ||
    !cloud.user ||
    document.visibilityState !== "visible" ||
    !navigator.onLine
  ) return;

  cloud.refreshInFlight = true;

  try {
    const remote = await fetchCloudRow();
    if (!remote?.state) return;

    const remoteTime = Date.parse(remote.updated_at || remote.state.updatedAt || "");
    const localTime = Date.parse(state.updatedAt || "");
    if (Number.isFinite(localTime) && Number.isFinite(remoteTime) && remoteTime <= localTime) return;

    const hadLocalData = !isLocalStateEmpty();
    applyCloudState(remote.state, remote.updated_at, {
      merge: hadLocalData,
      backupReason: "before-automatic-cloud-refresh",
    });

    if (hadLocalData) {
      await pushStateToCloud({ silent: true, skipRemoteMerge: true });
    }

    cloud.message = "Datos actualizados automáticamente.";
    render();
  } catch (error) {
    console.error(error);
  } finally {
    cloud.refreshInFlight = false;
  }
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
    if (!options.skipRemoteMerge) {
      const remote = await fetchCloudRow();
      if (remote?.state) {
        applyCloudState(remote.state, remote.updated_at, { merge: true, backupReason: "before-cloud-push-merge" });
      }
    }

    const updatedAt = new Date().toISOString();
    state.updatedAt = updatedAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

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

    const hadLocalData = !isLocalStateEmpty();
    applyCloudState(remote.state, remote.updated_at, { merge: hadLocalData });

    if (hadLocalData) {
      await pushStateToCloud({ silent: true, skipRemoteMerge: true });
      cloud.message = "Nube mezclada con este dispositivo sin borrar registros locales.";
    } else {
      cloud.message = "Datos descargados desde la nube.";
    }
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

function applyCloudState(remoteState, updatedAt, options = {}) {
  cloud.suspendAutoSync = true;
  backupLocalState(options.backupReason || "before-cloud-apply");
  state = options.merge
    ? mergeStateSnapshots(state, remoteState, updatedAt)
    : normalizeState(remoteState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  cloud.lastSync = updatedAt || "";
  cloud.suspendAutoSync = false;
}

function mergeStateSnapshots(localSnapshot, remoteSnapshot, remoteUpdatedAt = "") {
  const local = normalizeState(localSnapshot);
  const remote = normalizeState(remoteSnapshot);
  const localTime = getSnapshotTime(local);
  const remoteTime = getSnapshotTime(remote, remoteUpdatedAt);
  const remoteIsNewer = remoteTime > localTime;
  const preferred = remoteIsNewer ? remote : local;
  const secondary = remoteIsNewer ? local : remote;
  const deletedHabitIds = [...new Set([
    ...(local.deletedHabitIds || []),
    ...(remote.deletedHabitIds || []),
  ].map(String))];
  const deletedLogKeys = [...new Set([
    ...(local.deletedLogKeys || []),
    ...(remote.deletedLogKeys || []),
  ].map(String))];
  const deletedLogTimes = mergeDeletedLogTimes(local.deletedLogTimes, remote.deletedLogTimes);
  const habits = mergeHabitLists(local.habits, remote.habits, deletedHabitIds, deletedLogKeys, deletedLogTimes);
  const activeLogTombstones = resolveDeletedLogTombstones(habits, deletedLogKeys, deletedLogTimes);
  const selectedHabitId = habits.some((habit) => habit.id === preferred.selectedHabitId)
    ? preferred.selectedHabitId
    : habits.some((habit) => habit.id === secondary.selectedHabitId)
      ? secondary.selectedHabitId
      : habits[0]?.id || null;

  return {
    ...secondary,
    ...preferred,
    profile: {
      ...secondary.profile,
      ...preferred.profile,
      draftHabit: {
        ...secondary.profile?.draftHabit,
        ...preferred.profile?.draftHabit,
      },
    },
    habits,
    selectedHabitId,
    deletedHabitIds,
    deletedLogKeys: activeLogTombstones.keys,
    deletedLogTimes: activeLogTombstones.times,
    rewardHistory: mergeTimeline(local.rewardHistory, remote.rewardHistory, 20),
    reflections: mergeTimeline(local.reflections, remote.reflections, 20),
    updatedAt: new Date().toISOString(),
  };
}

function mergeHabitLists(
  localHabits = [],
  remoteHabits = [],
  deletedHabitIds = [],
  deletedLogKeys = [],
  deletedLogTimes = {},
) {
  const deleted = new Set(deletedHabitIds);
  const merged = new Map();

  for (const habit of [...localHabits, ...remoteHabits]) {
    if (!habit || deleted.has(String(habit.id))) continue;
    const existing = merged.get(habit.id);
    merged.set(
      habit.id,
      existing
        ? mergeHabit(existing, habit, deletedLogKeys, deletedLogTimes)
        : pruneDeletedLogs(normalizeHabit(habit), deletedLogKeys, deletedLogTimes),
    );
  }

  return [...merged.values()].sort((a, b) => {
    const aTime = Date.parse(a.createdAt || "") || 0;
    const bTime = Date.parse(b.createdAt || "") || 0;
    return aTime - bTime;
  });
}

function mergeHabit(firstHabit, secondHabit, deletedLogKeys = [], deletedLogTimes = {}) {
  const first = normalizeHabit(firstHabit);
  const second = normalizeHabit(secondHabit);
  const firstTime = getHabitChangeTime(first);
  const secondTime = getHabitChangeTime(second);
  const preferred = secondTime > firstTime ? second : first;
  const secondary = secondTime > firstTime ? first : second;

  return {
    ...secondary,
    ...preferred,
    lifecycle: preferred.lifecycle || secondary.lifecycle || HABIT_LIFECYCLE.FORMATION,
    logs: mergeLogs(secondary.logs, preferred.logs, preferred.id, deletedLogKeys, deletedLogTimes),
  };
}

function pruneDeletedLogs(habit, deletedLogKeys = [], deletedLogTimes = {}) {
  if (!habit) return null;
  const deleted = new Set(deletedLogKeys);
  return {
    ...habit,
    logs: Object.fromEntries(
      Object.entries(habit.logs || {}).filter(([dateKey, log]) => (
        !shouldDeleteLog(habit.id, dateKey, log, deleted, deletedLogTimes)
      )),
    ),
  };
}

function mergeLogs(firstLogs = {}, secondLogs = {}, habitId = "", deletedLogKeys = [], deletedLogTimes = {}) {
  const first = normalizeLogs(firstLogs);
  const second = normalizeLogs(secondLogs);
  const deleted = new Set(deletedLogKeys);
  const dates = [...new Set([...Object.keys(first), ...Object.keys(second)])];

  return dates.reduce((result, dateKey) => {
    const mergedLog = mergeLogEntries(first[dateKey], second[dateKey]);
    if (habitId && shouldDeleteLog(habitId, dateKey, mergedLog, deleted, deletedLogTimes)) return result;
    result[dateKey] = mergedLog;
    return result;
  }, {});
}

function mergeDeletedLogTimes(firstTimes = {}, secondTimes = {}) {
  const first = normalizeDeletedLogTimes(firstTimes);
  const second = normalizeDeletedLogTimes(secondTimes);
  const keys = [...new Set([...Object.keys(first), ...Object.keys(second)])];

  return Object.fromEntries(keys.map((key) => {
    const firstTime = Date.parse(first[key] || "") || 0;
    const secondTime = Date.parse(second[key] || "") || 0;
    return [key, firstTime >= secondTime ? first[key] : second[key]];
  }).filter(([, timestamp]) => timestamp));
}

function resolveDeletedLogTombstones(habits, deletedLogKeys = [], deletedLogTimes = {}) {
  const times = normalizeDeletedLogTimes(deletedLogTimes);
  const keys = [...new Set(deletedLogKeys.map(String))].filter((key) => {
    const separator = key.lastIndexOf(":");
    if (separator < 0) return true;
    const habitId = key.slice(0, separator);
    const dateKey = key.slice(separator + 1);
    const log = habits.find((habit) => habit.id === habitId)?.logs?.[dateKey];
    return !log || shouldDeleteLog(habitId, dateKey, log, new Set([key]), times);
  });

  return {
    keys,
    times: Object.fromEntries(keys.filter((key) => times[key]).map((key) => [key, times[key]])),
  };
}

function shouldDeleteLog(habitId, dateKey, log, deletedKeys, deletedLogTimes = {}) {
  const key = getDeletedLogKey(habitId, dateKey);
  if (!deletedKeys.has(key)) return false;
  const deletedAt = Date.parse(deletedLogTimes[key] || "") || 0;
  const loggedAt = Date.parse(log?.updatedAt || log?.at || "") || 0;
  return deletedAt >= loggedAt;
}

function mergeLogEntries(firstEntry, secondEntry) {
  const first = normalizeLogEntry(firstEntry);
  const second = normalizeLogEntry(secondEntry);
  if (!first) return second;
  if (!second) return first;

  const firstTime = Date.parse(first.updatedAt || first.at || "");
  const secondTime = Date.parse(second.updatedAt || second.at || "");
  if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) {
    return firstTime > secondTime ? { ...second, ...first } : { ...first, ...second };
  }

  if (first.status !== second.status) {
    const done = first.status === "done" ? first : second.status === "done" ? second : null;
    if (done) return { ...first, ...second, ...done, status: "done" };
  }

  return { ...first, ...second };
}

function mergeTimeline(firstItems = [], secondItems = [], limit = 20) {
  const items = [...firstItems, ...secondItems].filter((item) => item && typeof item === "object");
  const byKey = new Map();

  for (const item of items) {
    const key = [item.at, item.habitId, item.title, item.text, item.type].filter(Boolean).join("|") || JSON.stringify(item);
    byKey.set(key, item);
  }

  return [...byKey.values()]
    .sort((a, b) => (Date.parse(b.at || "") || 0) - (Date.parse(a.at || "") || 0))
    .slice(0, limit);
}

function getSnapshotTime(snapshot, fallback = "") {
  const time = Date.parse(snapshot?.updatedAt || fallback || "");
  return Number.isFinite(time) ? time : 0;
}

function getHabitChangeTime(habit) {
  const logTimes = Object.values(habit?.logs || {})
    .map((log) => Date.parse(log?.updatedAt || log?.at || ""))
    .filter(Number.isFinite);
  return Math.max(
    Date.parse(habit?.updatedAt || "") || 0,
    Date.parse(habit?.maintenanceAt || "") || 0,
    Date.parse(habit?.createdAt || "") || 0,
    ...logTimes,
  );
}

function backupLocalState(reason) {
  try {
    if (isLocalStateEmpty()) return;
    const backups = JSON.parse(localStorage.getItem(CLOUD_BACKUP_KEY) || "[]");
    backups.unshift({
      reason,
      at: new Date().toISOString(),
      state,
    });
    localStorage.setItem(CLOUD_BACKUP_KEY, JSON.stringify(backups.slice(0, 5)));
  } catch (error) {
    console.warn("Could not create local backup", error);
  }
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

function getHabitHistoryDays(habit) {
  const today = todayKey();
  const createdAt = isDateKey(habit?.createdAt) && habit.createdAt <= today ? habit.createdAt : today;
  const count = Math.max(1, daysBetween(createdAt, today) + 1);
  return Array.from({ length: count }, (_, index) => addDays(createdAt, index));
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

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
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

function formatDayLabel(dateKey) {
  const label = new Intl.DateTimeFormat("es-CO", { weekday: "long" }).format(parseDateKey(dateKey));
  return label.charAt(0).toUpperCase() + label.slice(1);
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
