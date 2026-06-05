import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// ── Mock cherry-markdown engine ──
let mockMakeHtmlResult = "";

vi.mock("cherry-markdown/dist/cherry-markdown.engine.core.esm.js", () => ({
  default: class MockCherryEngine {
    makeHtml(): string {
      return mockMakeHtmlResult;
    }
  },
}));

// DOMPurify is configured in test-setup.ts; vitest pre-bundles it for
// component imports, so integration XSS tests live in the dedicated
// src/__tests__/dompurify.test.ts file which imports DOMPurify directly.

import { CherryRender } from "@/components/CherryRender";

beforeEach(() => {
  vi.clearAllMocks();
  mockMakeHtmlResult = "";
});

describe("CherryRender", () => {
  it("renders markdown content after engine loads", async () => {
    mockMakeHtmlResult = "<p>Hello world</p>";

    const { container } = render(<CherryRender markdown="Hello world" />);

    await waitFor(() => {
      const root = container.querySelector(".cherry-render-root");
      expect(root).not.toBeNull();
      expect(root!.textContent).toContain("Hello world");
    });
  });

  it("uses cherry-markdown engine output (not fallback)", async () => {
    mockMakeHtmlResult = "<h2>Engine-rendered title</h2>";

    const { container } = render(
      <CherryRender markdown="## Engine-rendered title" />
    );

    await waitFor(() => {
      const root = container.querySelector(".cherry-render-root");
      expect(root).not.toBeNull();
    });

    expect(container.innerHTML).toContain("Engine-rendered title");
    expect(container.querySelector("h2")).not.toBeNull();
  });

  it("preserves safe HTML elements from engine output", async () => {
    mockMakeHtmlResult =
      "<h1>Title</h1><p>Text with <strong>bold</strong> and <em>italic</em></p><ul><li>Item 1</li></ul>";

    const { container } = render(<CherryRender markdown="# Title" />);

    await waitFor(() => {
      const root = container.querySelector(".cherry-render-root");
      expect(root).not.toBeNull();
    });

    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("p")).not.toBeNull();
    expect(container.querySelector("strong")).not.toBeNull();
    expect(container.querySelector("em")).not.toBeNull();
    expect(container.querySelector("ul")).not.toBeNull();
    expect(container.querySelector("li")).not.toBeNull();
  });

  it("renders cherry-render-root div with correct classes", async () => {
    mockMakeHtmlResult = "<p>test</p>";

    const { container } = render(
      <CherryRender markdown="test" className="custom-extra" />
    );

    await waitFor(() => {
      const root = container.querySelector(".cherry-render-root");
      expect(root).not.toBeNull();
      expect(root!.className).toContain("cherry");
      expect(root!.className).toContain("cherry-markdown");
      expect(root!.className).toContain("custom-extra");
    });
  });
});
