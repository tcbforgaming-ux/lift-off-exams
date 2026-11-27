import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY } from "../../lib/theme";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("switches themes and restores the preference after remounting", () => {
    const view = render(<ThemeToggle />);
    const toggle = screen.getByRole("switch", { name: "Dark mode" });
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    view.unmount();
    render(<ThemeToggle />);
    expect(screen.getByRole("switch", { name: "Dark mode" })).toBeChecked();
    fireEvent.click(screen.getByRole("switch"));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("synchronizes saved changes from another tab", () => {
    render(<ThemeToggle />);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    fireEvent(
      window,
      new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }),
    );
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("continues switching when storage is blocked", () => {
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      render(<ThemeToggle />);
      fireEvent.click(screen.getByRole("switch"));
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    } finally {
      read.mockRestore();
      write.mockRestore();
    }
  });
});
