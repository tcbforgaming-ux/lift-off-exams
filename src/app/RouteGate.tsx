import type { ComponentType } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingBoundary } from "./boundaries/LoadingBoundary";
import { Button } from "../components/ui/Button";
import { canAccessRole } from "../lib/auth/roles";
import { useAuth } from "../lib/auth/useAuth";
import { sanitizeRedirectPath } from "../lib/auth/redirects";
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
  const { role, status, error, retrySession } = useAuth();

  if (auth === "public") return <Component />;

  if (status === "loading") {
    return <LoadingBoundary label="Checking session" />;
  }

  if (status === "error") {
    return (
      <section className="page-stack">
        <h1>Could not verify your session</h1>
        <p role="alert">{error ?? "Please try again."}</p>
        <div>
          <Button type="button" onClick={retrySession}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (status === "recovering") {
    return location.pathname === "/account/deletion" ? (
      <Component />
    ) : (
      <Navigate to="/account/deletion" replace />
    );
  }

  if (status === "authenticated" && auth === "guest") {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={sanitizeRedirectPath(from)} replace />;
  }

  if (auth === "guest") {
    return <Component />;
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: sanitizeRedirectPath(
            `${location.pathname}${location.search}${location.hash}`,
          ),
        }}
      />
    );
  }

  if (!canAccessRole(role, requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Component />;
}
