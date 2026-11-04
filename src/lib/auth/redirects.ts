const localPaths = new Set([
  "/",
  "/dashboard",
  "/practice/setup",
  "/test-id",
  "/teams",
  "/admin",
  "/admin/questions",
  "/admin/reports",
  "/admin/audit",
  "/admin/generation",
  "/admin/governance",
  "/owner-invitation",
  "/owner-access",
  "/account/deletion",
  "/profile",
  "/generate",
  "/quiz",
  "/history",
  "/analytics",
  "/search",
  "/reports",
]);

export function getAppOrigin() {
  return window.location.origin;
}

export function getAuthRedirectTo(path: string) {
  return new URL(path, getAppOrigin()).toString();
}

export function sanitizeRedirectPath(value: unknown, fallback = "/dashboard") {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /%(?![0-9a-f]{2})/i.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\s]/.test(value) ||
    [...value].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return fallback;

  try {
    const parsed = new URL(value, getAppOrigin());
    if (parsed.origin !== getAppOrigin()) return fallback;
    const dynamic =
      /^\/(?:sessions|results|admin\/reports)\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
        parsed.pathname,
      );
    return localPaths.has(parsed.pathname) || dynamic
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
