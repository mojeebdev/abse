import { describe, expect, it } from "vitest";
import { getSafeReturnPath, normalizeGitHubUsername, validateGitHubUsername } from "./base44";

describe("normalizeGitHubUsername", () => {
  it("strips whitespace and leading @ symbols", () => {
    expect(normalizeGitHubUsername("  @mojeebdev  ")).toBe("mojeebdev");
  });

  it("rejects invalid GitHub usernames", () => {
    expect(validateGitHubUsername("mojeebdev/test")).toBe(false);
    expect(validateGitHubUsername("-mojeebdev")).toBe(false);
    expect(validateGitHubUsername("mojeebdev_")).toBe(false);
  });

  it("accepts standard GitHub usernames", () => {
    expect(validateGitHubUsername("mojeebdev")).toBe(true);
    expect(validateGitHubUsername("mojeeb-dev")).toBe(true);
  });
});

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
