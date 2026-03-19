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

export default DebugLog;
