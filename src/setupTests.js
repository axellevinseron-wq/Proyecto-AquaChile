import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom no trae matchMedia, que usa App.jsx
window.matchMedia = vi.fn().mockImplementation((consulta) => ({
  matches: true,
  media: consulta,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});