// API base URL can be overridden via VITE_API_BASE_URL.
// In dev, default to relative paths so Vite proxy handles /api.
const DEV_DEFAULT_API = "";

const normalizeBaseUrl = (raw) => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  if (!withoutTrailingSlash) return "";

  // Allow explicit relative prefixes (e.g. "/backend-api") only.
  if (withoutTrailingSlash.startsWith("/")) {
    return withoutTrailingSlash;
  }

  try {
    const parsed = new URL(withoutTrailingSlash);

    // Guard against accidental host values like `assuredrewards.in.`
    if (parsed.hostname.endsWith(".")) {
      parsed.hostname = parsed.hostname.replace(/\.+$/, "");
    }

    const normalizedPath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "";
    return `${parsed.origin}${normalizedPath}`;
  } catch {
    // Ignore malformed values like ":5000" or "http://:5000"
    if (
      /^:?\d+$/.test(withoutTrailingSlash) ||
      withoutTrailingSlash.startsWith(":") ||
      /^https?:\/\/:/.test(withoutTrailingSlash)
    ) {
      return "";
    }
    // Reject malformed values (example: "localhost:5000" without protocol).
    return "";
  }
};

const ENV_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "");
const BASE_URL = ENV_BASE_URL || ((process.env.NODE_ENV !== "production") ? DEV_DEFAULT_API : "");

export const getApiBaseUrl = () => BASE_URL;

export const buildApiUrl = (path, baseOverride = BASE_URL) => {
  if (!path.startsWith("/")) {
    throw new Error("API path must start with /");
  }
  return `${baseOverride}${path}`;
};

export const resolvePublicAssetUrl = (path) => {
  if (!path) return "";
  const source = String(path).trim();
  if (!source) return "";

  // Absolute URLs are returned as-is
  if (
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("data:") ||
    source.startsWith("blob:")
  ) {
    return source;
  }

  const normalized = source.replace(/\\/g, "/");
  
  // Decide whether to prefix with API URL or keep as local path
  // We prefix if it matches common upload path patterns
  const isUploadPath = /^\/?(api\/)?uploads\//i.test(normalized);
  
  const cleanPath = normalized.startsWith("/") ? normalized : `/${normalized}`;

  if (isUploadPath) {
    return buildApiUrl(cleanPath);
  }

  // Otherwise treat as a local public asset
  return cleanPath;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

export const apiRequest = async (path, { method = "GET", body, token, headers } = {}) => {
  const requestHeaders = {
    ...(headers || {}),
  };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const primaryUrl = buildApiUrl(path);
  const response = await fetch(primaryUrl, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    const baseMessage = data?.message || data?.error || `Request failed (${response.status})`;
    const detail =
      data?.details ? `: ${data.details}` : data?.error && data.error !== baseMessage ? `: ${data.error}` : "";
    const message = `${baseMessage}${detail}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
