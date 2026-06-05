/**
 * DOMPurify XSS sanitization tests.
 *
 * Verifies that DOMPurify.sanitize correctly strips XSS vectors
 * in the vitest/jsdom environment. These tests import DOMPurify
 * directly — the CJS build (configured in test-setup.ts via vi.mock)
 * auto-initializes when `window` is available in jsdom.
 *
 * The CherryRender component uses DOMPurify.sanitize() before
 * setting dangerouslySetInnerHTML. These tests verify the sanitizer
 * itself produces correct output for the component's integration.
 */
import { describe, it, expect } from "vitest";
import DOMPurify from "dompurify";

describe("DOMPurify.sanitize", () => {
  it("has a working sanitize method", () => {
    expect(typeof DOMPurify.sanitize).toBe("function");
  });

  it("strips <script> tags entirely", () => {
    const input = '<script>alert("xss")</script><p>Safe content</p>';
    const result = DOMPurify.sanitize(input);
    expect(result).not.toMatch(/<script/i);
    expect(result).toContain("Safe content");
  });

  it("strips onerror event handlers", () => {
    const input = '<img src=x onerror="alert(1)"><p>Safe</p>';
    const result = DOMPurify.sanitize(input);
    expect(result).not.toContain("onerror=");
    expect(result).toContain("Safe");
    // The img tag may be kept without the event handler
    expect(result).toContain("img");
  });

  it("strips onload event handlers", () => {
    const input = '<body onload="alert(1)"><p>Safe</p>';
    const result = DOMPurify.sanitize(input);
    expect(result).not.toContain("onload=");
    expect(result).toContain("Safe");
  });

  it("strips javascript: protocol from links", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = DOMPurify.sanitize(input);
    expect(result).not.toContain("javascript:");
  });

  it("handles multiple XSS vectors in one string", () => {
    const input = [
      '<script>alert("xss")</script>',
      '<img src=x onerror="alert(1)">',
      "<svg/onload=alert(1)>",
      '<a href="javascript:alert(1)">click</a>',
      "<p>Legitimate text</p>",
    ].join("");

    const result = DOMPurify.sanitize(input);

    expect(result).not.toMatch(/<script/i);
    expect(result).not.toContain("onerror=");
    expect(result).not.toContain("onload=");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("Legitimate text");
  });

  it("preserves safe HTML tags", () => {
    const input =
      "<h1>Title</h1><p>Text</p><ul><li>Item</li></ul><strong>Bold</strong><em>Italic</em>";
    const result = DOMPurify.sanitize(input);

    expect(result).toContain("<h1>");
    expect(result).toContain("<p>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>");
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
  });

  it("preserves safe attributes like href and src", () => {
    const input =
      '<a href="https://example.com">link</a><img src="image.png" alt="pic">';
    const result = DOMPurify.sanitize(input);

    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('src="image.png"');
    expect(result).toContain('alt="pic"');
  });
});
