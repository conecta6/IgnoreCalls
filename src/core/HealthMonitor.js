/**
 * @file HealthMonitor.js
 * @description Periodically verifies that the FluxDispatcher patch applied by
 *   CallInterceptor is still alive. Discord occasionally hot-reloads modules
 *   during an update, which silently removes BdApi patches. When the monitor
 *   detects a dead patch it attempts to re-apply it automatically, giving up
 *   after a configurable number of consecutive failures.
 * @author mayc
 */

import Logger from "../utils/Logger.js";
import ModuleFinder from "./ModuleFinder.js";

const CHECK_INTERVAL_MS = 30_000; // every 30 seconds
// Prevents an infinite repair loop if the dispatcher is persistently unavailable.
const MAX_REPAIR_ATTEMPTS = 5;

let intervalId = null;
let repairAttempts = 0;
let repatchCallback = null;
let patchedDispatcher = null;
let patchedMethodName = null;

const HealthMonitor = {
  /**
   * Inicia el monitor.
   * Starts the periodic health check. Any previously running interval is stopped
   * first to prevent duplicate timers if start() is called more than once.
   *
   * @param {object} dispatcher - El dispatcher que fue patcheado
   * @param {string} methodName - El metodo que fue patcheado ("dispatch")
   * @param {function} onUnhealthy - Callback que reparchea el sistema. Receives
   *   the fresh dispatcher reference so it can re-apply all patches to the correct object.
   */
  start(dispatcher, methodName, onUnhealthy) {
    if (intervalId) this.stop();

    patchedDispatcher = dispatcher;
    patchedMethodName = methodName;
    repatchCallback = onUnhealthy;
    repairAttempts = 0;

    intervalId = setInterval(() => this._check(), CHECK_INTERVAL_MS);
    Logger.log("HealthMonitor activo");
  },

  /**
   * Stops the health check interval and resets all stored references so the
   * monitor can be safely re-started later without stale state.
   */
  stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    patchedDispatcher = null;
    patchedMethodName = null;
    repatchCallback = null;
    Logger.log("HealthMonitor detenido");
  },

  /**
   * Invoked on each interval tick. Resets the repair counter on a healthy check,
   * or triggers a repair attempt and stops the monitor after too many failures.
   */
  _check() {
    if (!patchedDispatcher || !patchedMethodName) return;

    const healthy = this._isPatchAlive();

    if (healthy) {
      // Reset counter on success so transient failures don't accumulate toward
      // the hard limit.
      repairAttempts = 0;
      return;
    }

    repairAttempts++;
    Logger.warn(`HealthMonitor: patch no activo (intento ${repairAttempts}/${MAX_REPAIR_ATTEMPTS})`);

    if (repairAttempts > MAX_REPAIR_ATTEMPTS) {
      Logger.error("HealthMonitor: demasiados intentos fallidos, deteniendo monitor");
      this.stop();
      return;
    }

    this._repair();
  },

  /**
   * Determines whether the patched method is still the BdApi-wrapped version.
   * A changed dispatcher reference indicates a module hot-reload, which invalidates
   * the previously patched object even if the method itself still exists.
   *
   * @returns {boolean} True if the patch appears to be intact.
   */
  _isPatchAlive() {
    if (!patchedDispatcher) return false;

    // BdApi.Patcher wraps the original method — if the method is no longer
    // a BD-wrapped function, the patch was removed
    const fn = patchedDispatcher[patchedMethodName];
    if (typeof fn !== "function") return false;

    // BdApi.Patcher marks its wrappers with __isBdPatch or similar.
    // Como eso es interno, verificamos de otra forma: intentamos obtener
    // the dispatcher again and compare references
    const freshDispatcher = ModuleFinder.getFluxDispatcher();
    if (freshDispatcher && freshDispatcher !== patchedDispatcher) {
      Logger.warn("HealthMonitor: el dispatcher cambio de referencia");
      return false;
    }

    return true;
  },

  /**
   * Attempts to recover from a dead patch by invalidating the module cache,
   * fetching a fresh dispatcher reference, and invoking the repatch callback.
   * Updates the stored dispatcher reference so subsequent checks use the new object.
   */
  _repair() {
    Logger.log("HealthMonitor: intentando reparacion...");

    // Invalidate cache in case modules changed during the update
    ModuleFinder.invalidateCache();

    const newDispatcher = ModuleFinder.getFluxDispatcher();
    if (!newDispatcher) {
      Logger.error("HealthMonitor: no se pudo obtener el dispatcher para reparar");
      return;
    }

    // Update stored reference before calling repatchCallback so any health check
    // that fires during the callback already sees the new dispatcher.
    patchedDispatcher = newDispatcher;

    if (repatchCallback) {
      try {
        repatchCallback(newDispatcher);
        Logger.log("HealthMonitor: reparacion exitosa");
      } catch (err) {
        Logger.error("HealthMonitor: error durante la reparacion:", err);
      }
    }
  },
};

export default HealthMonitor;
