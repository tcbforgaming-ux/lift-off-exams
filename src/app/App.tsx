import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { AuthProvider } from "../lib/auth/AuthProvider";
import { LoadingBoundary } from "./boundaries/LoadingBoundary";
import { RouteGate } from "./RouteGate";
import { routes } from "./routes";

export function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Suspense fallback={<LoadingBoundary label="Loading page" />}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <RouteGate
                    auth={route.auth}
                    component={route.element}
                    requiredRole={route.requiredRole}
                  />
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </AuthProvider>
  );
}
