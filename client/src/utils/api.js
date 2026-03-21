const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const trimmedBaseUrl = rawBaseUrl.replace(/\/$/, '');

export const apiUrl = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return trimmedBaseUrl ? `${trimmedBaseUrl}${normalized}` : normalized;
};
