// Shared P (paste) behaviour for pods that compose SCORE TXT lines.
// Replaces the cursor line when it is blank or a pod-generated directive, else inserts above it.
export const PASTEABLE = /^\s*(arp|pedal|cell|laser|chord|impro)\b/;
export function pasteAtCursor(editor, lineText) {
  if (!editor) throw new Error('Open SCORE TXT first');
  const text = editor.value, caret = editor.selectionStart ?? text.length;
  const start = text.lastIndexOf('\n', caret - 1) + 1, endIndex = text.indexOf('\n', caret), end = endIndex < 0 ? text.length : endIndex;
  const current = text.slice(start, end), indent = current.match(/^\s*/)[0];
  const replace = !current.trim() || PASTEABLE.test(current);
  editor.value = replace ? text.slice(0, start) + indent + lineText + text.slice(end) : text.slice(0, start) + indent + lineText + '\n' + text.slice(start);
  const pos = start + indent.length + lineText.length;
  editor.focus(); editor.setSelectionRange(pos, pos); editor.dispatchEvent(new Event('input', { bubbles: true }));
  return { replaced: replace, line: text.slice(0, start).split('\n').length };
}
export function cursorLine(editor) {
  if (!editor) return { text: '', line: 0 };
  const text = editor.value, caret = editor.selectionStart ?? 0, start = text.lastIndexOf('\n', caret - 1) + 1, endIndex = text.indexOf('\n', caret);
  return { text: text.slice(start, endIndex < 0 ? text.length : endIndex), line: text.slice(0, start).split('\n').length };
}
