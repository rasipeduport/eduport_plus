// Shared date/time formatting for session cards.

/**
 * Format a session's start/end into a relative date label and a time range.
 *
 * @param {string} startIso
 * @param {string} endIso
 * @param {{ relative?: 'future' | 'past' }} options
 *   'future' (default) labels the adjacent day "Tomorrow"; 'past' labels it
 *   "Yesterday". Today is always "Today".
 * @returns {{ dateLabel: string, timeLabel: string }}
 */
export function formatSessionDateTime(startIso, endIso, { relative = 'future' } = {}) {
  if (!startIso || !endIso) return { dateLabel: '', timeLabel: '' };
  const start = new Date(startIso);
  const end = new Date(endIso);
  const now = new Date();

  const isToday = start.toDateString() === now.toDateString();
  const adjacent = new Date(now);
  adjacent.setDate(now.getDate() + (relative === 'past' ? -1 : 1));
  const isAdjacent = start.toDateString() === adjacent.toDateString();

  let dateLabel;
  if (isToday) dateLabel = 'Today';
  else if (isAdjacent) dateLabel = relative === 'past' ? 'Yesterday' : 'Tomorrow';
  else
    dateLabel = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(start);

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const timeLabel = `${timeFmt.format(start)} - ${timeFmt.format(end)}`;

  return { dateLabel, timeLabel };
}

/** Format an ISO date as e.g. "Jun 24, 2026". */
export function formatDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(iso));
}
