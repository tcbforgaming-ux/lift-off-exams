import { useEffect, useRef, type ReactNode } from "react";

export function SessionSubmitDialog({
  children,
  busy,
  onClose,
}: {
  children: ReactNode;
  busy: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef(document.activeElement);
  useEffect(() => {
    const element = dialog.current;
    const original = trigger.current;
    element?.showModal();
    return () => {
      element?.close();
      if (original instanceof HTMLElement && original.isConnected) original.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal-card"
      aria-labelledby="submit-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
