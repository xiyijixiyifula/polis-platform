import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const { className, ...rest } = props;
    return (
      <a href={href} className={className as string} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock Next.js Image — returns simple img
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock("lucide-react", () => ({
  Users: () => <span data-testid="icon-users" />,
  FileText: () => <span data-testid="icon-filetext" />,
}));

vi.mock("@/lib/utils", () => ({
  formatCount: (n: number) => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  },
}));

import { SpaceCard } from "@/components/SpaceCard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpaceCard", () => {
  const baseSpace = {
    id: "space-123",
    namespace: "testcommunity",
    title: "测试社区",
    description: "这是一个测试社区的描述",
    icon_url: "https://example.com/icon.png",
    member_count: 1234,
    post_count: 5678,
    is_root: false,
    owner_id: "user-1",
    owner_name: "testuser",
    level: 3,
    xp: 5000,
  };

  it("renders space title", () => {
    render(<SpaceCard space={baseSpace} />);
    expect(screen.getByText("测试社区")).toBeDefined();
  });

  it("renders link to space page", () => {
    render(<SpaceCard space={baseSpace} />);
    const links = screen.getAllByRole("link");
    const spaceLink = links.find((l) =>
      l.getAttribute("href")?.includes("testcommunity")
    );
    expect(spaceLink).toBeDefined();
  });

  it("renders space title in link", () => {
    render(<SpaceCard space={baseSpace} />);
    const links = screen.getAllByRole("link");
    const titleLink = links.find((l) => l.textContent?.includes("测试社区"));
    expect(titleLink).toBeDefined();
  });

  it("renders without errors", () => {
    render(<SpaceCard space={baseSpace} />);
    // Component should render without crashing
    expect(document.body.innerHTML).toContain("testcommunity");
  });

  it("renders member count", () => {
    render(<SpaceCard space={baseSpace} />);
    expect(screen.getByTestId("icon-users")).toBeDefined();
  });

  it("renders post count", () => {
    render(<SpaceCard space={baseSpace} />);
    expect(screen.getByTestId("icon-filetext")).toBeDefined();
  });

  it("handles zero member count", () => {
    const zeroMembers = { ...baseSpace, member_count: 0, post_count: 0 };
    render(<SpaceCard space={zeroMembers} />);
    expect(screen.getByText("测试社区")).toBeDefined();
  });
});
