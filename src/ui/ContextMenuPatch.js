/**
 * @file ContextMenuPatch.js
 * @description Injects an "Ignore calls" toggle item into Discord's user context
 *   menu (right-click on a user). Toggling the item adds or removes that user
 *   from the persistent ignore list without requiring the settings panel.
 * @author mayc
 */

import IgnoreList from "../core/IgnoreList.js";
import Logger from "../utils/Logger.js";

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

export default ContextMenuPatch;
