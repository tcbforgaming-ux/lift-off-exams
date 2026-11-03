import { Button } from "./Button";

export function CursorNavigation({
  page,
  loading,
  hasNext,
  onPrevious,
  onNext,
}: {
  page: number;
  loading: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav aria-label="Results pagination" className="button-row">
      <Button
        type="button"
        variant="secondary"
        disabled={loading || page === 0}
        onClick={onPrevious}
      >
        Previous
      </Button>
      <span role="status">Page {page + 1}</span>
      <Button
        type="button"
        variant="secondary"
        disabled={loading || !hasNext}
        onClick={onNext}
      >
        Next
      </Button>
    </nav>
  );
}
