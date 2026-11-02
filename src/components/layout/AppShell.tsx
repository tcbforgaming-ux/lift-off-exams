import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { primaryNavigationRoutes } from "../../app/routes";
import { paths } from "../../app/urlPaths";
import { displayRole } from "../../lib/auth/roles";
import { useAuth } from "../../lib/auth/useAuth";
import { ButtonLink } from "../ui/ButtonLink";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../ui/ThemeToggle";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { profile, role, signOut, status } = useAuth();
  const authenticated = status === "authenticated";
  const staff = authenticated && (role === "admin" || role === "owner");
  const { pathname } = useLocation();
  const visibleRoutes = primaryNavigationRoutes.filter(
    (route) => route.navigation !== "admin",
  );

  if (staff && (pathname === paths.admin || pathname.startsWith(`${paths.admin}/`))) {
    return (
      <div className="app-shell admin-shell">
        <aside className="admin-sidebar" aria-label="Administration sidebar">
          <NavLink
            to={paths.admin}
            className="brand"
            aria-label="Lift Off Exams administration"
          >
            <img src="/logo.svg" alt="" className="brand-mark" />
            <span>Lift Off Exams</span>
          </NavLink>
          <p className="sidebar-label">Administration</p>
          <nav className="admin-nav" aria-label="Admin navigation">
            {primaryNavigationRoutes
              .filter((route) => route.navigation === "admin")
              .map((route) => (
                <NavLink
                  key={route.path}
                  to={route.path}
                  end={route.path === paths.admin}
                >
                  {route.label}
                </NavLink>
              ))}
          </nav>
          <div className="admin-account">
            <strong>{profile?.display_name?.trim() || displayRole(role)}</strong>
            <span className="muted">{displayRole(role)}</span>
            <ButtonLink to={paths.dashboard} variant="secondary">
              User Dashboard
            </ButtonLink>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                void signOut();
              }}
            >
              Log Out
            </Button>
          </div>
        </aside>
        <div className="admin-content">
          <header className="admin-topbar">
            <span>Admin Workspace</span>
            <ThemeToggle />
          </header>
          <main className="app-main admin-main">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink
          to={authenticated ? paths.dashboard : paths.home}
          className="brand"
          aria-label="Lift Off Exams"
        >
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
          <NavLink to={paths.testId}>Test ID</NavLink>
          {!authenticated && <NavLink to={paths.home}>Home</NavLink>}
        </nav>
        <div className="topbar-actions">
          <ThemeToggle />
          {(staff || !authenticated) && (
            <ButtonLink to={paths.admin} variant="secondary">
              Admin Dashboard
            </ButtonLink>
          )}
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
