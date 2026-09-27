const MAC_KEY_REPLACEMENTS: Record<string, string> = {
  Control: "⌃",
  Alt: "⌥",
  Shift: "⇧",
};

function detectUserAgent() {
  if (typeof navigator === "undefined") {
    return "";
  }
  return navigator.userAgent;
}

export function isMacOS(userAgent: string = detectUserAgent()) {
  return /Mac|iPhone|iPad|iPod/i.test(userAgent);
}

export function shortcutLabel(keys: string, userAgent: string = detectUserAgent()) {
  if (!isMacOS(userAgent)) {
    return `Ctrl+${keys}`;
  }

  const keySequence = keys
    .split("+")
    .map((key) => MAC_KEY_REPLACEMENTS[key] ?? key)
    .join("");
  return `⌘${keySequence}`;
}
