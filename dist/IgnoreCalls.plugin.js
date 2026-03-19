/**
 * @name IgnoreCalls
 * @version 1.0.0
 * @description Silently block incoming calls from specific Discord users without affecting anyone else.
 * @author conecta6
 * @authorLink https://github.com/conecta6
 * @source https://github.com/conecta6/IgnoreCalls
 * @updateUrl https://raw.githubusercontent.com/conecta6/IgnoreCalls/main/dist/IgnoreCalls.plugin.js
 */

'use strict';

/**
 * @file Logger.js
 * @description Thin wrapper around the browser console that prefixes every
 *   message with the plugin name so log entries are easy to filter in DevTools.
 * @author mayc
 */

// Using a constant keeps the prefix consistent if the plugin is ever renamed —
// only this one string needs to change.
const PLUGIN_NAME$3 = "IgnoreCalls";

/**
 * Namespaced console logger for the IgnoreCalls plugin.
 * Each method mirrors its native console counterpart but prepends the plugin tag.
 */
const Logger = {
  /**
   * Logs an informational message.
   * @param {...*} args - Values forwarded to console.log.
   */
  log: (...args) => console.log(`[${PLUGIN_NAME$3}]`, ...args),

  /**
   * Logs a warning message.
   * @param {...*} args - Values forwarded to console.warn.
   */
  warn: (...args) => console.warn(`[${PLUGIN_NAME$3}]`, ...args),

  /**
   * Logs an error message.
   * @param {...*} args - Values forwarded to console.error.
   */
  error: (...args) => console.error(`[${PLUGIN_NAME$3}]`, ...args),
};

/**
 * @file ModuleFinder.js
 * @description Locates internal Discord webpack modules (FluxDispatcher, UserStore,
 *   ChannelStore) that the plugin needs to intercept calls. Uses a cascade of
 *   known structural signatures and falls back to an exhaustive scan so the plugin
 *   keeps working across Discord updates that rename or restructure these modules.
 * @author mayc
 */


// Multiple signatures per module because Discord's internal API surface changes
// between client updates — the module keeps the same behaviour but may gain or
// lose specific methods on each release.
const DISPATCHER_SIGNATURES = [
  (m) => m?.dispatch && m?.subscribe && m?.register,
  (m) => m?.dispatch && m?.subscribe && m?.unsubscribe,
  (m) => m?.dispatch && m?.waitFor && m?.register,
  (m) => m?.dispatch && m?.isDispatching && m?.subscribe,
  (m) => m?.dispatch && m?.addListener && m?.removeListener,
];

// Known UserStore signatures
const USERSTORE_SIGNATURES = [
  (m) => m?.getUser && m?.getCurrentUser,
  (m) => m?.getUser && m?.getUsers,
  (m) => m?.findByTag && m?.getCurrentUser,
];

/**
 * Iterates over an ordered list of duck-typing signatures and returns the first
 * webpack module that satisfies any of them.
 *
 * @param {Array<function>} signatures - Predicate functions passed to BdApi.Webpack.getModule.
 * @param {string} label - Human-readable module name used in log messages.
 * @returns {object|null} The matched module, or null if none matched.
 */
function trySignatures(signatures, label) {
  for (const sig of signatures) {
    try {
      const mod = BdApi.Webpack.getModule(sig);
      if (mod) {
        Logger.log(`${label} encontrado con firma #${signatures.indexOf(sig) + 1}`);
        return mod;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Escanea TODOS los modulos webpack buscando el que mas se parezca
 * a un FluxDispatcher por estructura y cantidad de metodos.
 *
 * Last-resort fallback used when none of the known signatures match — for
 * example after a major Discord rewrite. Scores every module by how many
 * canonical dispatcher methods it exposes and picks the highest scorer.
 *
 * @returns {object|null} Best-matching dispatcher candidate, or null if the
 *   score threshold (3 methods) was not reached.
 */
function deepScanDispatcher() {
  Logger.warn("Iniciando deep scan de FluxDispatcher...");

  let bestCandidate = null;
  let bestScore = 0;

  const DISPATCHER_METHODS = ["dispatch", "subscribe", "unsubscribe", "register", "waitFor", "isDispatching"];

  BdApi.Webpack.getModule((m) => {
    if (typeof m !== "object" || m === null) return false;
    const score = DISPATCHER_METHODS.filter((key) => typeof m[key] === "function").length;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = m;
    }
    return false; // never return true — we want to scan every module
  }, { searchExports: true });

  if (bestCandidate && bestScore >= 3) {
    Logger.log(`Deep scan encontro candidato con score ${bestScore}/${DISPATCHER_METHODS.length}`);
    return bestCandidate;
  }

  Logger.error("Deep scan no encontro ningun candidato viable para FluxDispatcher");
  return null;
}

const ModuleFinder = {
  // In-memory caches avoid repeated webpack scans on every patch() call.
  _dispatcherCache: null,
  _userStoreCache: null,

  /**
   * Returns the FluxDispatcher module, using a cached reference when available.
   * Falls through known signatures first, then performs a full webpack deep scan
   * as a last resort so the plugin degrades gracefully after Discord updates.
   *
   * @returns {object|null} The FluxDispatcher module, or null if not found.
   */
  getFluxDispatcher() {
    if (this._dispatcherCache) return this._dispatcherCache;

    // 1. Try known signatures first
    let mod = trySignatures(DISPATCHER_SIGNATURES, "FluxDispatcher");

    // 2. Fallback: deep scan
    if (!mod) mod = deepScanDispatcher();

    if (mod) this._dispatcherCache = mod;
    return mod;
  },

  /**
   * Returns the UserStore module, using a cached reference when available.
   * The plugin stays functional without UserStore — the settings panel will
   * just show raw user IDs instead of usernames.
   *
   * @returns {object|null} The UserStore module, or null if not found.
   */
  getUserStore() {
    if (this._userStoreCache) return this._userStoreCache;

    const mod = trySignatures(USERSTORE_SIGNATURES, "UserStore");
    if (!mod) Logger.warn("UserStore no encontrado (el panel de ajustes mostrara IDs en lugar de nombres)");
    else this._userStoreCache = mod;
    return mod;
  },

  /**
   * Returns the ChannelStore module. Not cached because it is accessed less
   * frequently and two fallback signatures are tried inline.
   *
   * @returns {object|null} The ChannelStore module, or null if not found.
   */
  getChannelStore() {
    const mod =
      BdApi.Webpack.getModule((m) => m?.getChannel && m?.getDMFromUserId) ??
      BdApi.Webpack.getModule((m) => m?.getChannel && m?.getChannels);
    if (!mod) Logger.warn("ChannelStore no encontrado");
    return mod;
  },

  /** Invalida la cache para forzar re-busqueda en el proximo acceso */
  invalidateCache() {
    this._dispatcherCache = null;
    this._userStoreCache = null;
    Logger.log("Cache de modulos invalidada");
  },
};

/**
 * @file IgnoreList.js
 * @description Manages the persistent set of user IDs whose incoming calls should
 *   be suppressed. Reads from and writes to BetterDiscord's data store so the
 *   list survives Discord restarts.
 * @author mayc
 */


const PLUGIN_NAME$2 = "IgnoreCalls";
// Separate store key from the plugin name so other data keys don't collide.
const STORE_KEY = "ignoredUsers";

// Module-level Set keeps lookups O(1) — important because hasIgnoredCaller is
// called on every incoming CALL_UPDATE/CALL_CREATE dispatch.
let ignoredUsers = new Set();

const IgnoreList = {
  /**
   * Hydrates the in-memory Set from BetterDiscord's persistent data store.
   * Must be called once during plugin start before any dispatch can arrive.
   */
  load() {
    const saved = BdApi.Data.load(PLUGIN_NAME$2, STORE_KEY);
    // Guard against corrupt data: if the saved value is not an array fall back
    // to an empty set rather than crashing.
    ignoredUsers = new Set(Array.isArray(saved) ? saved : []);
    Logger.log(`Lista cargada: ${ignoredUsers.size} usuarios ignorados`);
  },

  /**
   * Persists the current in-memory Set to BetterDiscord's data store.
   * Spreads into an array because BdApi.Data.save does not handle Set natively.
   */
  save() {
    BdApi.Data.save(PLUGIN_NAME$2, STORE_KEY, [...ignoredUsers]);
  },

  /**
   * Adds a user to the ignore list and immediately persists the change.
   * @param {string} userId - The Discord user ID to ignore.
   */
  add(userId) {
    ignoredUsers.add(userId);
    this.save();
    Logger.log(`Usuario añadido a ignorados: ${userId}`);
  },

  /**
   * Removes a user from the ignore list and immediately persists the change.
   * @param {string} userId - The Discord user ID to un-ignore.
   */
  remove(userId) {
    ignoredUsers.delete(userId);
    this.save();
    Logger.log(`Usuario eliminado de ignorados: ${userId}`);
  },

  /**
   * Checks whether a given user ID is currently on the ignore list.
   * @param {string} userId - The Discord user ID to check.
   * @returns {boolean} True if the user's calls should be suppressed.
   */
  has(userId) {
    return ignoredUsers.has(userId);
  },

  /**
   * Returns a snapshot of all currently ignored user IDs.
   * Returns a new array each time so callers cannot mutate the internal Set.
   * @returns {string[]}
   */
  getAll() {
    return [...ignoredUsers];
  },
};

/**
 * @file DebugLog.js
 * @description In-memory event log that records every significant action taken by
 *   the interceptor (dispatches seen, blocks applied, sounds suppressed, errors).
 *   Kept in memory rather than persisted to avoid growing the data store
 *   indefinitely; the settings panel subscribes to live updates via onChange.
 * @author mayc
 */

// In-memory log of everything the interceptor does.
// Displayed in the settings panel.

// Hard cap on stored entries so memory usage stays bounded regardless of how
// long Discord runs with the plugin active.
const MAX = 60;
let entries = [];
// Listener functions registered by UI components that need live updates.
let listeners = [];

const DebugLog = {
  /**
   * Appends a new entry to the log and notifies all registered listeners.
   * Evicts the oldest entry when the cap is reached (sliding window).
   *
   * @param {string} tag - Category label: "DISPATCH" | "CHECK" | "BLOCK" | "ALLOW" | "SOUND" | "SUB" | "ERR"
   * @param {string} msg - Human-readable description of the event.
   * @param {*} [data] - Optional structured payload; serialised to a JSON string for display.
   */
  add(tag, msg, data) {
    const entry = {
      time: new Date().toLocaleTimeString("es", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      ms: Date.now(),
      tag,   // "DISPATCH" | "CHECK" | "BLOCK" | "ALLOW" | "SOUND" | "SUB" | "ERR"
      msg,
      // Serialise eagerly so the stored string is a stable snapshot and mutations
      // to the original object after logging don't silently alter the log.
      data: data !== undefined ? JSON.stringify(data) : null,
    };
    entries.push(entry);
    if (entries.length > MAX) entries.shift();
    // Notify every subscribed UI component so they can re-render without polling.
    listeners.forEach((fn) => fn());
  },

  /**
   * Returns a shallow copy of all current log entries.
   * @returns {Array<object>}
   */
  getAll() { return [...entries]; },

  /**
   * Clears all log entries and notifies listeners so the UI updates immediately.
   */
  clear() { entries = []; listeners.forEach((fn) => fn()); },

  /**
   * Registers a callback to be invoked whenever the log changes (add or clear).
   * Returns an unsubscribe function that removes the listener when called.
   *
   * @param {function} fn - Zero-argument callback.
   * @returns {function} Unsubscribe function.
   */
  onChange(fn) { listeners.push(fn); return () => { listeners = listeners.filter((l) => l !== fn); }; },
};

/**
 * @file CallInterceptor.js
 * @description Core interception layer that suppresses incoming call notifications
 *   from ignored users. Operates on two fronts: (A) strips ignored ringers from
 *   CALL_CREATE/CALL_UPDATE Flux actions before Discord processes them, and (C)
 *   blocks the corresponding ring sound from playing. Both patches are applied via
 *   BdApi.Patcher so they are automatically reversible on plugin stop.
 * @author mayc
 */


const PLUGIN_NAME$1 = "IgnoreCalls";

// Tracks channel IDs whose ring was suppressed so the sound patch can confirm
// it should silence the corresponding audio without an extra ignore-list lookup.
const suppressedChannels = new Set();

/**
 * Extracts caller user IDs from the `ongoingRings` field of a call action.
 * Discord has shipped this field in at least two shapes across versions:
 *   - An array of strings or objects with a userId/id property.
 *   - A plain object mapping an opaque key to a user ID string.
 * Both are normalised here so the rest of the interceptor is format-agnostic.
 *
 * @param {Array|object|undefined} ongoingRings - The raw ongoingRings value from the action.
 * @returns {string[]} Flat list of user ID strings found in the payload.
 */
function getCallerIds(ongoingRings) {
  if (!ongoingRings) return [];
  if (Array.isArray(ongoingRings)) return ongoingRings.map((e) => (typeof e === "string" ? e : e?.userId ?? e?.id)).filter(Boolean);
  if (typeof ongoingRings === "object") {
    // Discord format: { someId: userId } — caller IDs are the VALUES, not the keys
    const vals = Object.values(ongoingRings).filter((v) => typeof v === "string");
    if (vals.length > 0) return vals;
    // Fallback: try keys as well, just in case the format is inverted
    return Object.keys(ongoingRings);
  }
  return [];
}

// Substrings that identify ring-related sound names in Discord's sound module.
// Checked against the sound name argument at call time rather than hardcoding
// a single string, because Discord uses several variants across versions.
const RING_SOUNDS = ["call_ringing", "call_ringing_beat", "incoming_ring", "ring", "call_incoming"];

const CallInterceptor = {
  _unsubscribe: null,

  /**
   * Applies all interception patches. Must be called after ModuleFinder modules
   * are available (i.e., after plugin start). Safe to call multiple times only
   * if unpatch() was called between invocations.
   */
  patch() {
    const dispatcher = ModuleFinder.getFluxDispatcher();
    if (!dispatcher) {
      DebugLog.add("ERR", "FluxDispatcher no encontrado");
      Logger.error("FluxDispatcher no disponible");
      return;
    }

    DebugLog.add("CHECK", "FluxDispatcher encontrado", { methods: Object.keys(dispatcher).filter((k) => typeof dispatcher[k] === "function") });

    // ── PATCH A: Patcher.instead on dispatch ─────────────────────────────────
    // Using `instead` (rather than `before`) lets us return a modified action
    // copy without blocking the entire dispatch pipeline — Discord still processes
    // the event (channel update, message, etc.) but without the ring payload.
    BdApi.Patcher.instead(PLUGIN_NAME$1, dispatcher, "dispatch", (ctx, args, original) => {
      const action = args[0];
      if (!action?.type) return original.apply(ctx, args);

      const type = action.type;

      // Log ALL call-related actions for the debug panel
      if (/call|ring|voice/i.test(type)) {
        DebugLog.add("DISPATCH", `[instead] ${type}`, action);
      }

      if (type === "CALL_UPDATE" || type === "CALL_CREATE") {
        const callerIds = getCallerIds(action.ongoingRings);
        const ignored = callerIds.filter((id) => IgnoreList.has(id));
        const ignoreList = IgnoreList.getAll();

        DebugLog.add("CHECK", `${type} recibido en instead`, {
          callerIds,
          ignoreList,
          ignored,
          ongoingRings: action.ongoingRings,
        });

        if (ignored.length > 0) {
          suppressedChannels.add(action.channelId);
          DebugLog.add("BLOCK", `${type} — ongoingRings vaciado (action pasa sin ring)`, { ignored, channelId: action.channelId });
          // Do not block the action entirely — only strip the ignored ringers
          // so Discord updates the channel/messages normally without triggering the ring UI
          const patchedAction = Object.assign({}, action, { ongoingRings: {} });
          return original.apply(ctx, [patchedAction]);
        }

        DebugLog.add("ALLOW", `${type} permitido`, { callerIds, ignoreList });
      }

      return original.apply(ctx, args);
    });

    DebugLog.add("CHECK", "Patch A (instead en dispatch) aplicado");

    // Patch B (subscribe-based approach) was evaluated and dropped: the `instead`
    // patch on dispatch already intercepts the action before any subscriber sees
    // it, so a separate subscribe patch would be redundant.
    DebugLog.add("CHECK", "Patch B (subscribe) omitido — instead suficiente");

    // ── PATCH C: sound module ────────────────────────────────────────────────
    // The dispatcher patch alone stops the visual ring, but Discord may trigger
    // the audio through a separate sound module. This patch silences ring sounds
    // whenever there is at least one suppressed channel outstanding.
    const soundModule =
      BdApi.Webpack.getModule((m) => typeof m?.playSound === "function" && typeof m?.stopSound === "function") ??
      BdApi.Webpack.getModule((m) => typeof m?.play === "function" && m?.sounds != null);

    if (soundModule) {
      // Determine the actual method name since different Discord versions use
      // either `playSound` or `play` for the same functionality.
      const fn = soundModule.playSound ? "playSound" : "play";
      BdApi.Patcher.instead(PLUGIN_NAME$1 + "_sound", soundModule, fn, (ctx, args, original) => {
        const name = typeof args[0] === "string" ? args[0] : String(args[0]);
        const isRing = RING_SOUNDS.some((s) => name.toLowerCase().includes(s));

        DebugLog.add("SOUND", `playSound("${name}") isRing=${isRing} suppressed=${suppressedChannels.size > 0}`);

        // Only block ring sounds when a suppressed channel is active — other
        // notification sounds (message pings, etc.) should pass through normally.
        if (isRing && suppressedChannels.size > 0) {
          DebugLog.add("BLOCK", `Sonido "${name}" bloqueado`);
          return;
        }
        return original.apply(ctx, args);
      });
      DebugLog.add("CHECK", "Patch C (SoundModule) aplicado", { fn });
    } else {
      DebugLog.add("ERR", "SoundModule no encontrado — Patch C inactivo");
    }

    Logger.log("CallInterceptor activo");
  },

  /**
   * Removes all patches applied by this interceptor and clears the suppressed
   * channel set so no stale state leaks into a subsequent patch() call.
   */
  unpatch() {
    BdApi.Patcher.unpatchAll(PLUGIN_NAME$1);
    BdApi.Patcher.unpatchAll(PLUGIN_NAME$1 + "_sound");
    suppressedChannels.clear();
    DebugLog.add("CHECK", "Todos los patches eliminados");
  },
};

/**
 * @file ActionTypeDetector.js
 * @description Detects and caches the Flux action type strings that Discord uses
 *   for incoming call notifications. Because these strings can differ across Discord
 *   versions, the module ships a hardcoded list of known values and augments it
 *   at runtime by passively observing live dispatches that match call-related keywords.
 * @author mayc
 */


const PLUGIN_NAME = "IgnoreCalls";
const CACHE_KEY = "detectedActionTypes";
const LOG_KEY = "actionLog";

// Substring keywords used to quickly filter out irrelevant actions before doing
// any heavier processing — avoids polluting the detection log with noise.
const CALL_KEYWORDS = ["ring", "call", "incoming", "voice", "ringing"];

// Action types conocidos en distintas versiones de Discord
// Kept as a fallback so the interceptor works out-of-the-box even before a
// real call has been observed to populate the learned set.
const KNOWN_CALL_ACTIONS = [
  "CALL_RINGING", "CALL_RING", "RING_CALL",
  "INCOMING_CALL", "CALL_INCOMING", "VOICE_CALL_INCOMING",
  "CALL_CREATE", "CALL_UPDATE", "CALL_DELETE",
];

let detectedActionTypes = new Set();
let isLearning = false;
let learningTimeout = null;
let onLearnedCallback = null;

// Only call-related actions are stored — keeps the log free of noise
// Kept small deliberately so the settings panel stays readable.
let detectionLog = [];
const MAX_LOG = 8;

/**
 * Serialises an arbitrary action payload to a plain JSON-compatible object.
 * The try/catch guards against circular references or non-serialisable values
 * that would otherwise crash JSON.stringify.
 *
 * @param {*} obj - The value to serialise.
 * @returns {*} A plain JSON-safe copy, or the string representation on failure.
 */
function safeSerialize(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return String(obj);
  }
}

/**
 * Appends an action to the capped in-memory detection log and persists it.
 * Uses a sliding window (shift on overflow) so the log never grows unbounded.
 *
 * @param {object} action - The Flux action that was observed.
 */
function addToLog(action) {
  const entry = {
    type: action.type,
    payload: safeSerialize(action),
    time: new Date().toLocaleTimeString(),
  };
  // Push to the end — the first event to fire always stays at the top of the list
  detectionLog.push(entry);
  if (detectionLog.length > MAX_LOG) detectionLog.shift();

  BdApi.Data.save(PLUGIN_NAME, LOG_KEY, detectionLog);
}

const ActionTypeDetector = {
  /**
   * Returns the set of action type strings the interceptor should react to.
   * Falls back to the hardcoded known list when no types have been learned yet,
   * so the plugin works correctly on a fresh install.
   *
   * @returns {Set<string>}
   */
  getActiveActionTypes() {
    if (detectedActionTypes.size > 0) return detectedActionTypes;
    return new Set(KNOWN_CALL_ACTIONS);
  },

  /**
   * Returns a snapshot of the detection log entries recorded so far.
   * @returns {Array<object>}
   */
  getLog() {
    return [...detectionLog];
  },

  /**
   * Hydrates both the detected action types and the detection log from
   * BetterDiscord's persistent store. Must be called during plugin start.
   */
  load() {
    const savedTypes = BdApi.Data.load(PLUGIN_NAME, CACHE_KEY);
    if (Array.isArray(savedTypes) && savedTypes.length > 0) {
      detectedActionTypes = new Set(savedTypes);
      Logger.log(`ActionTypeDetector: tipos cargados: ${[...detectedActionTypes].join(", ")}`);
    }

    // Restaurar log de sesion anterior
    const savedLog = BdApi.Data.load(PLUGIN_NAME, LOG_KEY);
    if (Array.isArray(savedLog)) {
      detectionLog = savedLog;
    }
  },

  // Tracks whether the passive dispatcher listener is currently active so we
  // don't accidentally register it twice.
  _listenerActive: false,

  /**
   * Attaches a before-patch on FluxDispatcher.dispatch that silently records
   * any action whose type contains a call-related keyword. This lets the plugin
   * learn new action type strings from live traffic without blocking dispatches.
   * The listener is optional and off by default to avoid unnecessary overhead.
   */
  startPassiveListener() {
    if (this._listenerActive) return;
    const dispatcher = ModuleFinder.getFluxDispatcher();
    if (!dispatcher) return;

    BdApi.Patcher.before(PLUGIN_NAME + "_passive", dispatcher, "dispatch", (_, args) => {
      const action = args[0];
      if (!action?.type) return;
      const typeLower = action.type.toLowerCase();
      // Only process actions that look call-related — avoids flooding the log
      // with every single Flux action Discord dispatches.
      if (!CALL_KEYWORDS.some((kw) => typeLower.includes(kw))) return;

      addToLog(action);
      Logger.log(`[Detector] ${action.type} | ${JSON.stringify(safeSerialize(action))}`);
      // Persist newly discovered action types so they survive restarts.
      if (!detectedActionTypes.has(action.type)) {
        detectedActionTypes.add(action.type);
        BdApi.Data.save(PLUGIN_NAME, CACHE_KEY, [...detectedActionTypes]);
      }
    });

    this._listenerActive = true;
    Logger.log("Listener de diagnostico activado");
  },

  /**
   * Removes the passive dispatcher listener and marks it as inactive.
   */
  stopPassiveListener() {
    BdApi.Patcher.unpatchAll(PLUGIN_NAME + "_passive");
    this._listenerActive = false;
    Logger.log("Listener de diagnostico desactivado");
  },

  /**
   * Starts a timed learning session. During this window the passive listener
   * collects new action types; when the timer expires the callback receives the
   * accumulated set. Useful for a one-shot "learn from next call" UI flow.
   *
   * @param {number} [durationMs=20000] - How long to listen before finishing.
   * @param {function} callback - Called with the Set of detected types on completion.
   */
  learn(durationMs = 20000, callback) {
    if (isLearning) return;
    isLearning = true;
    onLearnedCallback = callback;
    Logger.log(`Modo aprendizaje activo por ${durationMs / 1000}s`);
    learningTimeout = setTimeout(() => this._finishLearning(), durationMs);
  },

  /**
   * Finalises a learning session: clears the running flag and fires the stored
   * callback with the accumulated action type set.
   */
  _finishLearning() {
    isLearning = false;
    if (onLearnedCallback) {
      onLearnedCallback(detectedActionTypes);
      onLearnedCallback = null;
    }
  },

  /**
   * Cancels an active learning session early, immediately invoking the callback
   * with whatever types were collected up to that point.
   */
  stopLearning() {
    if (!isLearning) return;
    if (learningTimeout) clearTimeout(learningTimeout);
    this._finishLearning();
  },

  /**
   * Wipes the persisted and in-memory caches of detected action types and the
   * detection log. Useful when types appear stale after a Discord update.
   */
  clearCache() {
    detectedActionTypes = new Set();
    detectionLog = [];
    BdApi.Data.save(PLUGIN_NAME, CACHE_KEY, []);
    BdApi.Data.save(PLUGIN_NAME, LOG_KEY, []);
    Logger.log("Cache borrada");
  },
};

/**
 * @file ContextMenuPatch.js
 * @description Injects an "Ignore calls" toggle item into Discord's user context
 *   menu (right-click on a user). Toggling the item adds or removes that user
 *   from the persistent ignore list without requiring the settings panel.
 * @author mayc
 */


// Stored so it can be called during unpatch() to cleanly remove the menu item.
let unpatchFn = null;

const ContextMenuPatch = {
  /**
   * Registers a context menu patch on the "user-context" menu type.
   * The patch closure runs each time the menu is opened, so the label and
   * active state always reflect the current ignore-list membership.
   */
  patch() {
    unpatchFn = BdApi.ContextMenu.patch("user-context", (returnValue, props) => {
      const user = props?.user;
      // Guard: the user object may be absent in certain context menu variants
      // (e.g., bots, system messages) — bail out to avoid a runtime error.
      if (!user?.id) return;

      const isIgnored = IgnoreList.has(user.id);
      // Dynamic label gives immediate visual feedback about the current state
      // without the user having to open the settings panel.
      const label = isIgnored
        ? `Stop ignoring calls from ${user.username}`
        : `Ignore calls from ${user.username}`;

      const item = BdApi.ContextMenu.buildItem({
        type: "toggle",
        label,
        active: isIgnored,
        action: () => {
          if (isIgnored) {
            IgnoreList.remove(user.id);
            Logger.log(`Dejando de ignorar a ${user.username} (${user.id})`);
          } else {
            IgnoreList.add(user.id);
            Logger.log(`Ignorando llamadas de ${user.username} (${user.id})`);
          }
        },
      });

      // Append at the end of the menu — keeps the item out of the way of Discord's own actions
      // while still making it discoverable at the bottom of the menu.
      returnValue.props.children.push(item);
    });

    Logger.log("ContextMenuPatch activado");
  },

  /**
   * Removes the context menu patch, restoring the user menu to its default state.
   * The stored unpatch function is nulled out so repeated calls are safe.
   */
  unpatch() {
    if (unpatchFn) {
      unpatchFn();
      unpatchFn = null;
    }
    Logger.log("ContextMenuPatch desactivado");
  },
};

/**
 * @file SettingsPanel.js
 * @description React components rendered inside BetterDiscord's plugin settings
 *   modal. Provides two sections: a list of ignored users (with per-user removal)
 *   and a live debug log of every event processed by the interceptor. The debug
 *   log can be toggled between a visual list and a plain-text view for easy copying.
 * @author mayc
 */


const { React: React$1 } = BdApi;

// Maps each log tag to a distinct colour so events can be distinguished at a
// glance without reading every label.
const TAG_COLOR = {
  DISPATCH: "#7289da",
  CHECK:    "#faa61a",
  BLOCK:    "#43b581",
  ALLOW:    "#747f8d",
  SOUND:    "#b9bbbe",
  SUB:      "#5865f2",
  ERR:      "#ed4245",
};

/**
 * Displays the interceptor debug log with toggle controls.
 * Subscribes to DebugLog.onChange so the list refreshes automatically when
 * new events arrive, without any polling or manual refresh button.
 *
 * @returns {React.ReactElement}
 */
function DebugPanel() {
  const [entries, setEntries] = React$1.useState(() => DebugLog.getAll());
  // textMode renders a read-only textarea instead of the visual list, making it
  // easy to select all and copy the log for bug reports.
  const [textMode, setTextMode] = React$1.useState(false);

  React$1.useEffect(() => {
    // The cleanup function returned by onChange unsubscribes the listener when
    // the component unmounts, preventing memory leaks and stale state updates.
    return DebugLog.onChange(() => setEntries(DebugLog.getAll()));
  }, []);

  const reversed = [...entries].reverse(); // most recent entry at the top

  // Pre-format all entries as a single string so the textarea renders instantly
  // without per-render string concatenation inside the JSX.
  const textValue = [...entries].reverse().map((e) =>
    `[${e.time}] [${e.tag}] ${e.msg}${e.data ? "\n  " + e.data : ""}`
  ).join("\n");

  return React$1.createElement(
    "div",
    null,
    React$1.createElement(
      "div",
      { style: { display: "flex", gap: "6px", marginBottom: "8px" } },
      React$1.createElement("button", { style: styles.btnSmall, onClick: () => setTextMode(!textMode) },
        textMode ? "List view" : "Text view (copy)"
      ),
      React$1.createElement("button", { style: styles.btnSmall, onClick: () => { DebugLog.clear(); setEntries([]); } },
        "Clear"
      )
    ),

    entries.length === 0
      ? React$1.createElement("p", { style: styles.muted }, "No events yet. The log fills automatically when a call arrives.")
      : textMode
        ? React$1.createElement("textarea", { readOnly: true, style: styles.textarea, value: textValue })
        : React$1.createElement(
            "div",
            { style: styles.logBox },
            reversed.map((e, i) =>
              React$1.createElement(
                "div",
                { key: i, style: styles.logRow },
                React$1.createElement("span", { style: styles.logTime }, e.time),
                React$1.createElement("span", { style: { ...styles.logTag, color: TAG_COLOR[e.tag] ?? "#fff" } }, e.tag),
                React$1.createElement("span", { style: styles.logMsg }, e.msg),
                // Only render the data row when there is actually a payload,
                // avoiding an empty <pre> that would take up visual space.
                e.data && React$1.createElement("pre", { style: styles.logData }, e.data)
              )
            )
          )
  );
}

/**
 * Root settings panel component rendered by IgnoreCalls.getSettingsPanel().
 * Accepts ActionTypeDetector as a prop to avoid a circular import between the
 * UI layer and the core detector module.
 *
 * @param {object} props
 * @param {object} props.ActionTypeDetector - The ActionTypeDetector singleton.
 * @returns {React.ReactElement}
 */
function SettingsPanel({ ActionTypeDetector }) {
  const [ignoredIds, setIgnoredIds] = React$1.useState(() => IgnoreList.getAll());
  // Mirror the listener's live state so the checkbox reflects reality even if
  // it was toggled from another code path.
  const [diagActive, setDiagActive] = React$1.useState(() => ActionTypeDetector._listenerActive);
  // Resolved once at render time; null-safe getUsername handles the missing case.
  const UserStore = ModuleFinder.getUserStore();

  /**
   * Removes a user from the ignore list and refreshes the displayed list.
   * @param {string} userId - The user ID to remove.
   */
  function remove(userId) {
    IgnoreList.remove(userId);
    setIgnoredIds(IgnoreList.getAll());
  }

  /**
   * Resolves a user ID to a display name using the cached UserStore reference.
   * Falls back to the raw ID if UserStore is unavailable (module not found).
   *
   * @param {string} userId
   * @returns {string} Username or raw ID.
   */
  function getUsername(userId) {
    const user = UserStore?.getUser(userId);
    return user ? user.username : userId;
  }

  /**
   * Toggles the passive diagnostic listener on or off and syncs the checkbox state.
   */
  function toggleDiag() {
    if (diagActive) ActionTypeDetector.stopPassiveListener();
    else ActionTypeDetector.startPassiveListener();
    setDiagActive(!diagActive);
  }

  return React$1.createElement(
    "div",
    { style: styles.container },

    React$1.createElement("h3", { style: styles.title }, "Ignored users"),
    ignoredIds.length === 0
      ? React$1.createElement("p", { style: styles.muted }, 'Right-click any user → "Ignore calls from [name]"')
      : ignoredIds.map((userId) =>
          React$1.createElement(
            "div",
            { key: userId, style: styles.row },
            React$1.createElement("span", { style: styles.text }, getUsername(userId)),
            React$1.createElement("button", { style: styles.btnDanger, onClick: () => remove(userId) }, "Remove")
          )
        ),

    React$1.createElement("hr", { style: styles.hr }),

    React$1.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
      React$1.createElement("h3", { style: { ...styles.title, marginBottom: 0 } }, "Interceptor log"),
      React$1.createElement(
        "label",
        { style: { display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" } },
        React$1.createElement("input", { type: "checkbox", checked: diagActive, onChange: toggleDiag }),
        // Colour feedback (green vs muted) reinforces the on/off state without
        // relying solely on the checkbox, which can be hard to spot in dark theme.
        React$1.createElement("span", { style: { color: diagActive ? "#43b581" : "var(--text-muted)", fontSize: "13px" } },
          diagActive ? "Action detector ON" : "Action detector OFF"
        )
      )
    ),
    React$1.createElement("p", { style: styles.muted },
      "Updates automatically. Switch to 'Text view' to copy the full log."
    ),
    React$1.createElement(DebugPanel)
  );
}

// Centralised style object keeps layout values out of the JSX tree and makes
// it easy to adjust the look without hunting through nested createElement calls.
const styles = {
  container: { padding: "10px" },
  title: { marginBottom: "6px", color: "var(--header-primary)", fontSize: "16px" },
  muted: { color: "var(--text-muted)", fontSize: "13px", marginBottom: "8px" },
  text: { color: "var(--text-normal)" },
  hr: { margin: "14px 0", borderColor: "var(--background-modifier-accent)", borderStyle: "solid" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--background-modifier-accent)" },
  logBox: { maxHeight: "400px", overflowY: "auto", background: "var(--background-secondary)", borderRadius: "4px", padding: "6px" },
  logRow: { marginBottom: "4px", borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: "4px" },
  logTime: { color: "var(--text-muted)", fontFamily: "monospace", fontSize: "11px", marginRight: "6px" },
  logTag: { fontFamily: "monospace", fontSize: "11px", fontWeight: "bold", marginRight: "8px", minWidth: "60px", display: "inline-block" },
  logMsg: { color: "var(--text-normal)", fontSize: "12px" },
  logData: { margin: "2px 0 0 66px", fontSize: "10px", color: "#b9bbbe", whiteSpace: "pre-wrap", wordBreak: "break-all" },
  textarea: { width: "100%", minHeight: "350px", background: "var(--background-secondary)", color: "#b9bbbe", border: "1px solid var(--background-modifier-accent)", borderRadius: "4px", padding: "8px", fontFamily: "monospace", fontSize: "11px", resize: "vertical", boxSizing: "border-box" },
  btnSmall: { padding: "2px 8px", background: "var(--background-secondary)", color: "var(--text-muted)", border: "1px solid var(--background-modifier-accent)", borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
  btnDanger: { padding: "3px 10px", background: "var(--button-danger-background)", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
};

/**
 * @file index.js
 * @description Entry point for the IgnoreCalls BetterDiscord plugin. Wires together
 *   all subsystems (call interception, ignore list, action detection, UI patches)
 *   and exposes the lifecycle hooks expected by the BD plugin loader.
 * @author mayc
 */


const { React } = BdApi;

class IgnoreCalls {
  /**
   * Called by BetterDiscord when the plugin is enabled. Initialises persistent
   * data first so that every subsequent subsystem has a valid state to read from.
   */
  start() {
    Logger.log("Iniciando plugin...");
    // Load persisted ignored-user list before patching so the interceptor
    // already knows which callers to suppress on the very first incoming call.
    IgnoreList.load();
    // Restore any previously detected action types so we don't need to
    // re-learn them on every Discord restart.
    ActionTypeDetector.load();
    // The diagnostic listener starts disabled intentionally — enabling it by
    // default would add overhead to every dispatched action even when not debugging.
    CallInterceptor.patch();
    ContextMenuPatch.patch();
    Logger.log("Plugin activo");
  }

  /**
   * Called by BetterDiscord when the plugin is disabled. Cleans up all patches
   * and stops background processes to leave Discord in its original state.
   */
  stop() {
    Logger.log("Deteniendo plugin...");
    // Stop the learning timer if it is still running to avoid firing a stale
    // callback after the plugin has been torn down.
    ActionTypeDetector.stopLearning();
    ActionTypeDetector.stopPassiveListener();
    CallInterceptor.unpatch();
    ContextMenuPatch.unpatch();
    Logger.log("Plugin detenido");
  }

  /**
   * Returns the React element rendered inside the BD settings modal.
   * ActionTypeDetector is passed as a prop so the panel can toggle the
   * diagnostic listener without needing a direct import cycle.
   *
   * @returns {React.ReactElement}
   */
  getSettingsPanel() {
    return React.createElement(SettingsPanel, { ActionTypeDetector });
  }
}

module.exports = IgnoreCalls;
