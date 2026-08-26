import type { AppRole } from "../supabase/types";

export const roleLabels = {
  student: "Standard user",
  admin: "Administrator",
  owner: "Owner",
} satisfies Record<AppRole, string>;

const elevatedRoles = new Set<AppRole>(["admin", "owner"]);

export function isKnownAppRole(role: string | null | undefined): role is AppRole {
  return role === "student" || role === "admin" || role === "owner";
}

export function canAccessRole(userRole: AppRole | null, requiredRole?: AppRole) {
  if (!requiredRole) return true;
  if (!userRole) return false;
  if (requiredRole === "student") return true;
  if (requiredRole === "admin") return elevatedRoles.has(userRole);
  return userRole === "owner";
}

export function displayRole(role: AppRole | null) {
  return role ? roleLabels[role] : "Unknown role";
}
