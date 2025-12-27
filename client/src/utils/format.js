export function formatRating(value) {
  if (!value) return 'N/A';
  return `${value}/10`;
}

export function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString();
}

export function clampText(text, maxLength = 120) {
  const cleaned = String(text || '').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength)}...`;
}