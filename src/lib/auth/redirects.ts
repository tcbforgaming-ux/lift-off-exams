const localPaths = new Set([
  "/",
  "/dashboard",
  "/practice/setup",
  "/test-id",
  "/teams",
  "/admin",
  "/profile",
]);

export function getAppOrigin() {
  return window.location.origin;
}

export function getAuthRedirectTo(path: string) {
  return new URL(path, getAppOrigin()).toString();
}

export function sanitizeRedirectPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;

  try {
    const parsed = new URL(value, getAppOrigin());
    if (parsed.origin !== getAppOrigin()) return fallback;
    return localPaths.has(parsed.pathname) ? parsed.pathname : fallback;
  } catch {
    return localPaths.has(value) ? value : fallback;
  }
}
