/**
 * When focus is in a form control, browser shortcuts should not trigger chords.
 */
export function shouldRouteChordKeys(ev: KeyboardEvent): boolean {
  const t = ev.target;
  if (!(t instanceof HTMLElement)) return true;
  return !t.closest("input, textarea, select, [contenteditable='true']");
}
