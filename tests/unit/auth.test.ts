import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/lib/domain/auth";

describe("isAllowedEmail", () => {
  it("matches the allowed address ignoring case and surrounding whitespace", () => {
    expect(isAllowedEmail("  Owner@Example.com ", "owner@example.com")).toBe(
      true,
    );
  });

  it("rejects any other address", () => {
    expect(isAllowedEmail("someone@example.com", "owner@example.com")).toBe(
      false,
    );
    expect(
      isAllowedEmail("owner@example.com.evil.io", "owner@example.com"),
    ).toBe(false);
  });

  it("rejects blank input even if the allowed address is blank", () => {
    expect(isAllowedEmail("", "")).toBe(false);
  });
});
