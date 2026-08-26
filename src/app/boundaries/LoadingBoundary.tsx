type LoadingBoundaryProps = {
  label?: string;
};

export function LoadingBoundary({ label = "Loading" }: LoadingBoundaryProps) {
  return (
    <div className="loading-boundary" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
