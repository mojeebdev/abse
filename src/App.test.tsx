import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Abse first-release journey", () => {
  it("moves from the threshold to an explainable forge report", () => {
    render(<App />);
    expect(screen.getByText(/Your history/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Enter development forge/i }));
    expect(screen.getByRole("heading", { name: /Forge report/i })).toBeInTheDocument();
    expect(screen.getByText(/CALCULATION TRACE/i)).toBeInTheDocument();
  });
});

