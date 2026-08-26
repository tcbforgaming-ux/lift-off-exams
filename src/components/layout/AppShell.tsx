import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { primaryNavigationRoutes } from "../../app/routes";
import { paths } from "../../app/urlPaths";
import { displayRole } from "../../lib/auth/roles";
import { useAuth } from "../../lib/auth/useAuth";
import { ButtonLink } from "../ui/ButtonLink";
import { Button } from "../ui/Button";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { profile, role, signOut, status } = useAuth();
  const authenticated = status === "authenticated";
  const visibleRoutes = primaryNavigationRoutes.filter(
    (route) => route.navigation !== "admin" || role === "admin" || role === "owner",
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to={paths.home} className="brand" aria-label="Lift Off Exams">
          <img src="/logo.svg" alt="" className="brand-mark" />
          <span>Lift Off Exams</span>
        </NavLink>
        <nav className="topbar-nav" aria-label="Primary navigation">
          {authenticated &&
            visibleRoutes.map((route) => (
              <NavLink key={route.path} to={route.path}>
                {route.label}
              </NavLink>
            ))}
          {authenticated && (
            <NavLink to={paths.profile}>
              {profile?.display_name?.trim() || displayRole(role)}
            </NavLink>
          )}
          <NavLink to={paths.testId}>Test ID</NavLink>
          {!authenticated && <NavLink to={paths.home}>Home</NavLink>}
        </nav>
        <div className="topbar-actions">
          {authenticated ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                void signOut();
              }}
            >
              Log Out
            </Button>
          ) : (
            <>
              <ButtonLink to={paths.login} variant="ghost">
                Log In
              </ButtonLink>
              <ButtonLink to={paths.signup}>Sign Up</ButtonLink>
            </>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
