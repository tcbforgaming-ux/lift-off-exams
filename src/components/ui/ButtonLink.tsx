import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type ButtonLinkVariant = "primary" | "secondary" | "ghost";

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
  variant?: ButtonLinkVariant;
};

export function ButtonLink({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`button button-${variant} ${className}`.trim()} {...props}>
      {children}
    </Link>
  );
}
