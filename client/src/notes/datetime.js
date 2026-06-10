// Format a note's ISO-8601 timestamp the way Google Keep does on a card:
//   - today        -> just the time   ("3:42 PM")
//   - this year    -> month + day      ("Jun 5")
//   - older        -> month, day, year ("Jun 5, 2024")
// Uses the platform's Intl-backed Date formatting — no date library needed.
export function formatNoteTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
