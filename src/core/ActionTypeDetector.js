/**
 * @file ActionTypeDetector.js
 * @description Detects and caches the Flux action type strings that Discord uses
 *   for incoming call notifications. Because these strings can differ across Discord
 *   versions, the module ships a hardcoded list of known values and augments it
 *   at runtime by passively observing live dispatches that match call-related keywords.
 * @author mayc
 */

import Logger from "../utils/Logger.js";
import ModuleFinder from "./ModuleFinder.js";

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

export default ActionTypeDetector;
