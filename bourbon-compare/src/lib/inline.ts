/**
 * The engine emits `**bold**` markers in its prose. This turns them into markup
 * after escaping, so bottle names can be emphasised without letting data become
 * HTML.
 */
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function renderInline(text: string): string {
  return text
    .replace(/[&<>"]/g, (c) => ESCAPES[c]!)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
