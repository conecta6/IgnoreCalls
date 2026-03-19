/**
 * @file IgnoreList.js
 * @description Manages the persistent set of user IDs whose incoming calls should
 *   be suppressed. Reads from and writes to BetterDiscord's data store so the
 *   list survives Discord restarts.
 * @author mayc
 */

import Logger from "../utils/Logger.js";

const PLUGIN_NAME = "IgnoreCalls";
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
    const saved = BdApi.Data.load(PLUGIN_NAME, STORE_KEY);
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
    BdApi.Data.save(PLUGIN_NAME, STORE_KEY, [...ignoredUsers]);
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

export default IgnoreList;
