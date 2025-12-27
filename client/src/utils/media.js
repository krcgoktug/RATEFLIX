const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');

export function resolvePosterUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${apiBase}${path}`;
}
