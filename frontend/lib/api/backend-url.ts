const API_PREFIX = "/api";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export function getBackendApiBaseUrl(baseUrl?: string | null) {
  if (!baseUrl) {
    throw new Error("Backend base URL is not configured.");
  }

  const normalizedBaseUrl = trimTrailingSlash(baseUrl);

  if (
    normalizedBaseUrl === API_PREFIX ||
    normalizedBaseUrl.endsWith(`${API_PREFIX}`)
  ) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}${API_PREFIX}`;
}

export function buildBackendApiUrl(baseUrl: string | null | undefined, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendApiBaseUrl(baseUrl)}${normalizedPath}`;
}
