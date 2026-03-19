/**
 * @file SettingsPanel.js
 * @description React components rendered inside BetterDiscord's plugin settings
 *   modal. Provides two sections: a list of ignored users (with per-user removal)
 *   and a live debug log of every event processed by the interceptor. The debug
 *   log can be toggled between a visual list and a plain-text view for easy copying.
 * @author mayc
 */

import IgnoreList from "../core/IgnoreList.js";
import ModuleFinder from "../core/ModuleFinder.js";
import DebugLog from "../core/DebugLog.js";

const { React } = BdApi;

// Maps each log tag to a distinct colour so events can be distinguished at a
// glance without reading every label.
const TAG_COLOR = {
  DISPATCH: "#7289da",
  CHECK:    "#faa61a",
  BLOCK:    "#43b581",
  ALLOW:    "#747f8d",
  SOUND:    "#b9bbbe",
  SUB:      "#5865f2",
  ERR:      "#ed4245",
};

/**
 * Displays the interceptor debug log with toggle controls.
 * Subscribes to DebugLog.onChange so the list refreshes automatically when
 * new events arrive, without any polling or manual refresh button.
 *
 * @returns {React.ReactElement}
 */
function DebugPanel() {
  const [entries, setEntries] = React.useState(() => DebugLog.getAll());
  // textMode renders a read-only textarea instead of the visual list, making it
  // easy to select all and copy the log for bug reports.
  const [textMode, setTextMode] = React.useState(false);

  React.useEffect(() => {
    // The cleanup function returned by onChange unsubscribes the listener when
    // the component unmounts, preventing memory leaks and stale state updates.
    return DebugLog.onChange(() => setEntries(DebugLog.getAll()));
  }, []);

  const reversed = [...entries].reverse(); // most recent entry at the top

  // Pre-format all entries as a single string so the textarea renders instantly
  // without per-render string concatenation inside the JSX.
  const textValue = [...entries].reverse().map((e) =>
    `[${e.time}] [${e.tag}] ${e.msg}${e.data ? "\n  " + e.data : ""}`
  ).join("\n");

  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { style: { display: "flex", gap: "6px", marginBottom: "8px" } },
      React.createElement("button", { style: styles.btnSmall, onClick: () => setTextMode(!textMode) },
        textMode ? "List view" : "Text view (copy)"
      ),
      React.createElement("button", { style: styles.btnSmall, onClick: () => { DebugLog.clear(); setEntries([]); } },
        "Clear"
      )
    ),

    entries.length === 0
      ? React.createElement("p", { style: styles.muted }, "No events yet. The log fills automatically when a call arrives.")
      : textMode
        ? React.createElement("textarea", { readOnly: true, style: styles.textarea, value: textValue })
        : React.createElement(
            "div",
            { style: styles.logBox },
            reversed.map((e, i) =>
              React.createElement(
                "div",
                { key: i, style: styles.logRow },
                React.createElement("span", { style: styles.logTime }, e.time),
                React.createElement("span", { style: { ...styles.logTag, color: TAG_COLOR[e.tag] ?? "#fff" } }, e.tag),
                React.createElement("span", { style: styles.logMsg }, e.msg),
                // Only render the data row when there is actually a payload,
                // avoiding an empty <pre> that would take up visual space.
                e.data && React.createElement("pre", { style: styles.logData }, e.data)
              )
            )
          )
  );
}

/**
 * Root settings panel component rendered by IgnoreCalls.getSettingsPanel().
 * Accepts ActionTypeDetector as a prop to avoid a circular import between the
 * UI layer and the core detector module.
 *
 * @param {object} props
 * @param {object} props.ActionTypeDetector - The ActionTypeDetector singleton.
 * @returns {React.ReactElement}
 */
function SettingsPanel({ ActionTypeDetector }) {
  const [ignoredIds, setIgnoredIds] = React.useState(() => IgnoreList.getAll());
  // Mirror the listener's live state so the checkbox reflects reality even if
  // it was toggled from another code path.
  const [diagActive, setDiagActive] = React.useState(() => ActionTypeDetector._listenerActive);
  // Resolved once at render time; null-safe getUsername handles the missing case.
  const UserStore = ModuleFinder.getUserStore();

  /**
   * Removes a user from the ignore list and refreshes the displayed list.
   * @param {string} userId - The user ID to remove.
   */
  function remove(userId) {
    IgnoreList.remove(userId);
    setIgnoredIds(IgnoreList.getAll());
  }

  /**
   * Resolves a user ID to a display name using the cached UserStore reference.
   * Falls back to the raw ID if UserStore is unavailable (module not found).
   *
   * @param {string} userId
   * @returns {string} Username or raw ID.
   */
  function getUsername(userId) {
    const user = UserStore?.getUser(userId);
    return user ? user.username : userId;
  }

  /**
   * Toggles the passive diagnostic listener on or off and syncs the checkbox state.
   */
  function toggleDiag() {
    if (diagActive) ActionTypeDetector.stopPassiveListener();
    else ActionTypeDetector.startPassiveListener();
    setDiagActive(!diagActive);
  }

  return React.createElement(
    "div",
    { style: styles.container },

    React.createElement("h3", { style: styles.title }, "Ignored users"),
    ignoredIds.length === 0
      ? React.createElement("p", { style: styles.muted }, 'Right-click any user → "Ignore calls from [name]"')
      : ignoredIds.map((userId) =>
          React.createElement(
            "div",
            { key: userId, style: styles.row },
            React.createElement("span", { style: styles.text }, getUsername(userId)),
            React.createElement("button", { style: styles.btnDanger, onClick: () => remove(userId) }, "Remove")
          )
        ),

    React.createElement("hr", { style: styles.hr }),

    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
      React.createElement("h3", { style: { ...styles.title, marginBottom: 0 } }, "Interceptor log"),
      React.createElement(
        "label",
        { style: { display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" } },
        React.createElement("input", { type: "checkbox", checked: diagActive, onChange: toggleDiag }),
        // Colour feedback (green vs muted) reinforces the on/off state without
        // relying solely on the checkbox, which can be hard to spot in dark theme.
        React.createElement("span", { style: { color: diagActive ? "#43b581" : "var(--text-muted)", fontSize: "13px" } },
          diagActive ? "Action detector ON" : "Action detector OFF"
        )
      )
    ),
    React.createElement("p", { style: styles.muted },
      "Updates automatically. Switch to 'Text view' to copy the full log."
    ),
    React.createElement(DebugPanel)
  );
}

// Centralised style object keeps layout values out of the JSX tree and makes
// it easy to adjust the look without hunting through nested createElement calls.
const styles = {
  container: { padding: "10px" },
  title: { marginBottom: "6px", color: "var(--header-primary)", fontSize: "16px" },
  muted: { color: "var(--text-muted)", fontSize: "13px", marginBottom: "8px" },
  text: { color: "var(--text-normal)" },
  hr: { margin: "14px 0", borderColor: "var(--background-modifier-accent)", borderStyle: "solid" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--background-modifier-accent)" },
  logBox: { maxHeight: "400px", overflowY: "auto", background: "var(--background-secondary)", borderRadius: "4px", padding: "6px" },
  logRow: { marginBottom: "4px", borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: "4px" },
  logTime: { color: "var(--text-muted)", fontFamily: "monospace", fontSize: "11px", marginRight: "6px" },
  logTag: { fontFamily: "monospace", fontSize: "11px", fontWeight: "bold", marginRight: "8px", minWidth: "60px", display: "inline-block" },
  logMsg: { color: "var(--text-normal)", fontSize: "12px" },
  logData: { margin: "2px 0 0 66px", fontSize: "10px", color: "#b9bbbe", whiteSpace: "pre-wrap", wordBreak: "break-all" },
  textarea: { width: "100%", minHeight: "350px", background: "var(--background-secondary)", color: "#b9bbbe", border: "1px solid var(--background-modifier-accent)", borderRadius: "4px", padding: "8px", fontFamily: "monospace", fontSize: "11px", resize: "vertical", boxSizing: "border-box" },
  btnSmall: { padding: "2px 8px", background: "var(--background-secondary)", color: "var(--text-muted)", border: "1px solid var(--background-modifier-accent)", borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
  btnDanger: { padding: "3px 10px", background: "var(--button-danger-background)", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
};

export default SettingsPanel;
