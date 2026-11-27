/// <reference lib="dom" />
import "@testing-library/jest-dom/vitest";

// jsdom does not implement native dialog top-layer behavior. Real keyboard and
// focus containment must be verified in Chromium, not inferred from this stub.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
}
