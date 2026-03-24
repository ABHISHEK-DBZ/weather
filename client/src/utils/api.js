const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const trimmedBaseUrl = rawBaseUrl.replace(/\/$/, '');

export const apiUrl = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return trimmedBaseUrl ? `${trimmedBaseUrl}${normalized}` : normalized;
};
