export function hasModifierKey(
  event: Pick<KeyboardEvent, "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
) {
  return event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
}

export function isImeComposing(event: Pick<KeyboardEvent, "isComposing" | "keyCode">) {
  // keyCode 229: legacy IME fallback when isComposing is unreliable (e.g. Safari).
  return event.isComposing || event.keyCode === 229;
}
