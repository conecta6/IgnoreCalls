/**
 * @file CallInterceptor.js
 * @description Core interception layer that suppresses incoming call notifications
 *   from ignored users. Operates on two fronts: (A) strips ignored ringers from
 *   CALL_CREATE/CALL_UPDATE Flux actions before Discord processes them, and (C)
 *   blocks the corresponding ring sound from playing. Both patches are applied via
 *   BdApi.Patcher so they are automatically reversible on plugin stop.
 * @author mayc
 */

import Logger from "../utils/Logger.js";
import ModuleFinder from "./ModuleFinder.js";
import IgnoreList from "./IgnoreList.js";
import DebugLog from "./DebugLog.js";

const PLUGIN_NAME = "IgnoreCalls";

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

/**
 * Returns true if at least one of the supplied caller IDs is on the ignore list.
 * Short-circuits on the first match via Array#some.
 *
 * @param {string[]} callerIds - User IDs extracted from the call action.
 * @returns {boolean}
 */
function hasIgnoredCaller(callerIds) {
  return callerIds.some((id) => IgnoreList.has(id));
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
    BdApi.Patcher.instead(PLUGIN_NAME, dispatcher, "dispatch", (ctx, args, original) => {
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
      BdApi.Patcher.instead(PLUGIN_NAME + "_sound", soundModule, fn, (ctx, args, original) => {
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
    BdApi.Patcher.unpatchAll(PLUGIN_NAME);
    BdApi.Patcher.unpatchAll(PLUGIN_NAME + "_sound");
    suppressedChannels.clear();
    DebugLog.add("CHECK", "Todos los patches eliminados");
  },
};

export default CallInterceptor;
