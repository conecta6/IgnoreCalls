/**
 * @file ModuleFinder.js
 * @description Locates internal Discord webpack modules (FluxDispatcher, UserStore,
 *   ChannelStore) that the plugin needs to intercept calls. Uses a cascade of
 *   known structural signatures and falls back to an exhaustive scan so the plugin
 *   keeps working across Discord updates that rename or restructure these modules.
 * @author mayc
 */

import Logger from "../utils/Logger.js";

const PLUGIN_NAME = "IgnoreCalls";
const CACHE_KEY = "moduleSignatureCache";

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

export default ModuleFinder;
