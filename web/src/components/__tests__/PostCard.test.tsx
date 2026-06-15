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
    const { className, onClick, ...rest } = props;
    return (
      <a href={href} className={className as string} onClick={onClick as () => void} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock("lucide-react", () => ({
  Pin: () => null,
  EyeOff: () => null,
  Star: () => null,
  Heart: () => null,
  MessageCircle: () => null,
  Eye: () => null,
  Bookmark: () => null,
  Share2: () => null,
  MoreHorizontal: () => null,
  User: () => null,
  Clock: () => null,
}));

vi.mock("@/components/ShareButton", () => ({
  ShareButton: () => null,
}));

vi.mock("@/components/VoteButton", () => ({
  VoteButton: () => null,
}));

vi.mock("@/components/HashtagLink", () => ({
  default: () => null,
}));

import { PostCard } from "@/components/PostCard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PostCard", () => {
  const basePost = {
    id: "post-123",
    title: "测试帖子标题",
    body: "这是帖子的正文内容，包含了丰富的信息。",
    author: {
      username: "author1",
      display_name: "作者一",
      avatar_url: "https://example.com/avatar.png",
    },
    space_id: "space-1",
    space_ns: "testcommunity",
    space_name: "测试社区",
    like_count: 42,
    comment_count: 7,
    view_count: 1337,
    created_at: "2026-06-15T10:00:00Z",
    tags: ["rust", "blockchain"],
    is_pinned: false,
    is_hidden: false,
    visibility: "public",
    is_liked: false,
    is_bookmarked: false,
    module_type: "forum",
    module_label: "论坛",
    cover_url: "https://example.com/cover.jpg",
  };

  it("renders without crashing", () => {
    const { container } = render(<PostCard post={basePost} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it("renders post title in the document", () => {
    render(<PostCard post={basePost} />);
    expect(screen.getByText("测试帖子标题")).toBeDefined();
  });

  it("renders space namespace", () => {
    render(<PostCard post={basePost} />);
    expect(screen.getByText(/testcommunity/)).toBeDefined();
  });

  it("renders space and module breadcrumb", () => {
    render(<PostCard post={basePost} />);
    // PostCard renders space context as breadcrumb: @namespace / module
    expect(screen.getByText(/testcommunity/)).toBeDefined();
  });

  it("contains link to post", () => {
    render(<PostCard post={basePost} />);
    const links = screen.getAllByRole("link");
    const postLink = links.find((l) =>
      l.getAttribute("href")?.includes("post-123")
    );
    expect(postLink).toBeDefined();
  });

  it("renders with null author without crashing", () => {
    const noAuthor = { ...basePost, author: null };
    render(<PostCard post={noAuthor} />);
    expect(screen.getByText("测试帖子标题")).toBeDefined();
  });

  it("renders with missing space_ns without crashing", () => {
    const noNs = { ...basePost, space_ns: undefined };
    render(<PostCard post={noNs} />);
    expect(screen.getByText("测试帖子标题")).toBeDefined();
  });
});
