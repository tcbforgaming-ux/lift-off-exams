import { useLocation } from "react-router-dom";

import { Card } from "../../components/ui/Card";

function titleFromPath(pathname: string) {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replaceAll("-", " "))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
}

export function PlaceholderPage() {
  const location = useLocation();
  const title = titleFromPath(location.pathname) || "Page";

  return (
    <section className="centered-page">
      <Card className="narrow-card">
        <p className="eyebrow">Route Ready</p>
        <h1>{title}</h1>
        <p className="muted">
          This production route is intentionally placeholder-only for Milestone 0. The
          underlying feature will be implemented in its dedicated milestone.
        </p>
      </Card>
    </section>
  );
}
