// Unit test do helper getSiteUrl() — garante que o site nunca vai pra URL errada.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_SITE_URL;

function makeReq(headers: Record<string, string>): Request {
  return new Request("http://example.com", { headers });
}

describe("getSiteUrl()", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (ORIGINAL_ENV) {
      process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
  });

  it("returns env var when set, without trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://atbtartot.com";
    expect(getSiteUrl()).toBe("https://atbtartot.com");
  });

  it("strips trailing slashes from env var", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://atbtartot.com///";
    expect(getSiteUrl()).toBe("https://atbtartot.com");
  });

  it("trims whitespace in env var", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "  https://atbtartot.com  ";
    expect(getSiteUrl()).toBe("https://atbtartot.com");
  });

  it("prefers env var over request headers", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://prod.example.com";
    const req = makeReq({ host: "preview.vercel.app", "x-forwarded-proto": "https" });
    expect(getSiteUrl(req)).toBe("https://prod.example.com");
  });

  it("uses request host when env var is missing (https)", () => {
    const req = makeReq({ host: "preview-xyz.vercel.app", "x-forwarded-proto": "https" });
    expect(getSiteUrl(req)).toBe("https://preview-xyz.vercel.app");
  });

  it("uses http for localhost", () => {
    const req = makeReq({ host: "localhost:3000" });
    expect(getSiteUrl(req)).toBe("http://localhost:3000");
  });

  it("uses http for 127.0.0.1", () => {
    const req = makeReq({ host: "127.0.0.1:3000" });
    expect(getSiteUrl(req)).toBe("http://127.0.0.1:3000");
  });

  it("falls back to canonical https://atbtartot.com when env+req missing", () => {
    expect(getSiteUrl()).toBe("https://atbtartot.com");
  });

  it("falls back when request has no host header", () => {
    const req = makeReq({});
    expect(getSiteUrl(req)).toBe("https://atbtartot.com");
  });

  it("respects x-forwarded-proto over host-based protocol detection", () => {
    // Edge case: behind a proxy that sets the proto explicitly
    const req = makeReq({ host: "atbtartot.com", "x-forwarded-proto": "http" });
    expect(getSiteUrl(req)).toBe("http://atbtartot.com");
  });
});
