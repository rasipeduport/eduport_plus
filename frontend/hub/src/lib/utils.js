// Shared formatting helpers and validators used across hub pages.

// Initials from a full name, e.g. "Jane Mary Doe" -> "JM" (max 2 chars).
export function getInitials(fullName, fallback = 'U') {
  if (!fullName) return fallback;
  return (
    fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2) || fallback
  );
}

// Format an ISO/date string as e.g. "Jun 24, 2026".
export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', options);
}

// Validators shared by the invitation / staff forms.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MEET_RE = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
