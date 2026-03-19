import Logger from "../utils/Logger.js";
import ModuleFinder from "./ModuleFinder.js";
import IgnoreList from "./IgnoreList.js";
import ActionTypeDetector from "./ActionTypeDetector.js";

const PLUGIN_NAME = "IgnoreCalls";
const CALL_KEYWORDS = ["ring", "call", "incoming", "voice"];

/**
 * Modo diagnostico: escucha TODOS los dispatches y los muestra en consola.
 * Uso: en la consola de Discord (Ctrl+Shift+I) escribe:
 *   window.IgnoreCallsDiag.start()  — inicia escucha
 *   window.IgnoreCallsDiag.stop()   — detiene escucha
 *   window.IgnoreCallsDiag.status() — muestra estado actual del plugin
 */
const Diagnostics = {
  _active: false,

  install() {
    window.IgnoreCallsDiag = {
      start: () => this.startListening(),
      stop: () => this.stopListening(),
      status: () => this.printStatus(),
    };
    Logger.log("Diagnosticos disponibles. Abre la consola (Ctrl+Shift+I) y usa window.IgnoreCallsDiag");
  },

  uninstall() {
    this.stopListening();
    delete window.IgnoreCallsDiag;
  },

  startListening() {
    if (this._active) {
      console.log("[IgnoreCalls Diag] Ya activo");
      return;
    }

    const dispatcher = ModuleFinder.getFluxDispatcher();
    if (!dispatcher) {
      console.error("[IgnoreCalls Diag] FluxDispatcher no encontrado — revisa la consola para errores de ModuleFinder");
      return;
    }

    this._active = true;
    console.log("[IgnoreCalls Diag] Escuchando dispatches... realiza una llamada de prueba ahora");
    console.log("[IgnoreCalls Diag] Los actions relacionados con llamadas apareceran aqui:");

    BdApi.Patcher.before(PLUGIN_NAME + "_diag", dispatcher, "dispatch", (_, args) => {
      const action = args[0];
      if (!action?.type) return;

      const typeLower = action.type.toLowerCase();
      const isInteresting = CALL_KEYWORDS.some((kw) => typeLower.includes(kw));

      if (isInteresting) {
        console.group(`[IgnoreCalls Diag] ACTION DETECTADO: ${action.type}`);
        console.log("Payload completo:", JSON.parse(JSON.stringify(action)));
        console.groupEnd();
      }
    });
  },

  stopListening() {
    if (!this._active) return;
    BdApi.Patcher.unpatchAll(PLUGIN_NAME + "_diag");
    this._active = false;
    console.log("[IgnoreCalls Diag] Escucha detenida");
  },

  printStatus() {
    const dispatcher = ModuleFinder.getFluxDispatcher();
    console.group("[IgnoreCalls Diag] Estado del plugin");
    console.log("FluxDispatcher encontrado:", !!dispatcher);
    console.log("Usuarios ignorados:", IgnoreList.getAll());
    console.log("Action types activos:", [...ActionTypeDetector.getActiveActionTypes()]);
    console.log("Diagnostico activo:", this._active);
    console.groupEnd();
  },
};

export default Diagnostics;
