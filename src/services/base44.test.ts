import { describe, expect, it } from "vitest";
import { getSafeReturnPath } from "./base44";

describe("getSafeReturnPath", () => {
  it("rejects login redirect loops and returns the fallback", () => {
    const result = getSafeReturnPath(
      "https://abse.base44.app/login?from_url=https%3A%2F%2Fabse.base44.app%2Flogin%3Ffrom_url%3D%2Fgithub-link",
      "/github-link",
    );

    expect(result).toBe("/github-link");
  });

  it("accepts same-origin internal paths", () => {
    const result = getSafeReturnPath("/github-link?step=2", "/");

    expect(result).toBe("/github-link?step=2");
  });

  it("rejects external URLs", () => {
    const result = getSafeReturnPath("https://evil.example/steal", "/github-link");

    expect(result).toBe("/github-link");
  });
});
