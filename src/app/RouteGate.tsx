import type { ComponentType } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingBoundary } from "./boundaries/LoadingBoundary";
import { canAccessRole } from "../lib/auth/roles";
import { useAuth } from "../lib/auth/useAuth";
import type { AppRole } from "../lib/supabase/types";

type RouteGateProps = {
  component: ComponentType;
  auth?: "public" | "guest" | "protected";
  requiredRole?: AppRole;
};

export function RouteGate({
  auth = "public",
  component: Component,
  requiredRole,
}: RouteGateProps) {
  const location = useLocation();
  const { role, status } = useAuth();

  if (auth === "public") return <Component />;

  if (status === "loading") {
    return <LoadingBoundary label="Checking session" />;
  }

  if (status === "authenticated" && auth === "guest") {
    return <Navigate to="/dashboard" replace />;
  }

  if (auth === "guest") {
    return <Component />;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessRole(role, requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Component />;
}
