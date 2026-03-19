/**
 * @file Logger.js
 * @description Thin wrapper around the browser console that prefixes every
 *   message with the plugin name so log entries are easy to filter in DevTools.
 * @author mayc
 */

// Using a constant keeps the prefix consistent if the plugin is ever renamed —
// only this one string needs to change.
const PLUGIN_NAME = "IgnoreCalls";

/**
 * Namespaced console logger for the IgnoreCalls plugin.
 * Each method mirrors its native console counterpart but prepends the plugin tag.
 */
const Logger = {
  /**
   * Logs an informational message.
   * @param {...*} args - Values forwarded to console.log.
   */
  log: (...args) => console.log(`[${PLUGIN_NAME}]`, ...args),

  /**
   * Logs a warning message.
   * @param {...*} args - Values forwarded to console.warn.
   */
  warn: (...args) => console.warn(`[${PLUGIN_NAME}]`, ...args),

  /**
   * Logs an error message.
   * @param {...*} args - Values forwarded to console.error.
   */
  error: (...args) => console.error(`[${PLUGIN_NAME}]`, ...args),
};

export default Logger;
