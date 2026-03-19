/**
 * @file index.js
 * @description Entry point for the IgnoreCalls BetterDiscord plugin. Wires together
 *   all subsystems (call interception, ignore list, action detection, UI patches)
 *   and exposes the lifecycle hooks expected by the BD plugin loader.
 * @author mayc
 */

import CallInterceptor from "./core/CallInterceptor.js";
import IgnoreList from "./core/IgnoreList.js";
import ActionTypeDetector from "./core/ActionTypeDetector.js";
import ContextMenuPatch from "./ui/ContextMenuPatch.js";
import SettingsPanel from "./ui/SettingsPanel.js";
import Logger from "./utils/Logger.js";

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
