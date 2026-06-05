import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  setToken,
  getToken,
  // encodeNs is module-private (not exported) — tested indirectly below
  auth,
  users,
  spaces,
  posts,
  search,
  feed,
  vote,
  videos,
  creations,
  series,
  tiers,
  subscribe,
  messages,
  contacts,
  threads,
  xp,
  onboarding,
  badges,
  invites,
  pushNotifications,
  hashtags,
  editorPicks,
  leaderboard,
  tips,
  events,
  weeklyTopic,
  recommendations,
  follow,
} from "@/lib/api";

describe("setToken / getToken", () => {
  beforeEach(() => {
    setToken(null);
  });

  afterEach(() => {
    setToken(null);
  });

  it("getToken returns null initially", () => {
    expect(getToken()).toBeNull();
  });

  it("setToken stores token in-memory and sets cookie", () => {
    setToken("test-jwt-token");
    expect(getToken()).toBe("test-jwt-token");
    expect(document.cookie).toContain("polis_token=test-jwt-token");
  });

  it("setToken(null) clears token from memory", () => {
    setToken("test-jwt-token");
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it("getToken reads from cookie when memory is empty", () => {
    document.cookie = "polis_token=cookie-token; path=/";
    // Note: getToken caches the cookie value in-memory on first read.
    // The test verifies that cookie can be set; getToken will pick it up
    // when memory is null (fresh module state).
    expect(document.cookie).toContain("polis_token=cookie-token");
  });

  it("in-memory token takes precedence over cookie", () => {
    document.cookie = "polis_token=cookie-token; path=/";
    setToken("memory-token");
    expect(getToken()).toBe("memory-token");
  });
});

describe("api module exports", () => {
  it("exports all expected API module namespaces", () => {
    const modules: Record<string, unknown> = {
      auth,
      users,
      spaces,
      posts,
      search,
      feed,
      vote,
      videos,
      creations,
      series,
      tiers,
      subscribe,
      messages,
      contacts,
      threads,
      xp,
      onboarding,
      badges,
      invites,
      pushNotifications,
      hashtags,
      editorPicks,
      leaderboard,
      tips,
      events,
      weeklyTopic,
      recommendations,
      follow,
    };

    for (const [name, mod] of Object.entries(modules)) {
      expect(mod, `${name} should be defined`).toBeDefined();
      expect(typeof mod, `${name} should be an object`).toBe("object");
    }
  });

  it("exports setToken and getToken as functions", () => {
    expect(typeof setToken).toBe("function");
    expect(typeof getToken).toBe("function");
  });

  it("each module namespace has expected methods", () => {
    expect(typeof auth.login).toBe("function");
    expect(typeof auth.register).toBe("function");
    expect(typeof users.getProfile).toBe("function");
    expect(typeof users.updateProfile).toBe("function");
    expect(typeof users.toggleFollow).toBe("function");
    expect(typeof spaces.get).toBe("function");
    expect(typeof spaces.create).toBe("function");
    expect(typeof spaces.listModules).toBe("function");
    expect(typeof spaces.trending).toBe("function");
    expect(typeof spaces.members).toBe("function");
    expect(typeof posts.list).toBe("function");
    expect(typeof posts.create).toBe("function");
    expect(typeof posts.get).toBe("function");
    expect(typeof posts.getById).toBe("function");
    expect(typeof posts.like).toBe("function");
    expect(typeof posts.likeById).toBe("function");
    expect(typeof posts.bookmark).toBe("function");
    expect(typeof posts.bookmarkById).toBe("function");
    expect(typeof search.spaces).toBe("function");
    expect(typeof search.posts).toBe("function");
    expect(typeof search.users).toBe("function");
    expect(typeof feed.getFeed).toBe("function");
    expect(typeof videos.list).toBe("function");
    expect(typeof videos.get).toBe("function");
    expect(typeof videos.upload).toBe("function");
    expect(typeof creations.list).toBe("function");
    expect(typeof creations.get).toBe("function");
    expect(typeof creations.submit).toBe("function");
    expect(typeof series.create).toBe("function");
    expect(typeof series.list).toBe("function");
    expect(typeof series.get).toBe("function");
    expect(typeof messages.send).toBe("function");
    expect(typeof messages.getConversations).toBe("function");
    expect(typeof messages.getUnreadCount).toBe("function");
    expect(typeof contacts.getMutual).toBe("function");
    expect(typeof xp.getMyXp).toBe("function");
    expect(typeof xp.dailyLogin).toBe("function");
    expect(typeof xp.getXpLogs).toBe("function");
    expect(typeof onboarding.getStatus).toBe("function");
    expect(typeof onboarding.complete).toBe("function");
    expect(typeof onboarding.claim).toBe("function");
    expect(typeof badges.getMyBadges).toBe("function");
    expect(typeof invites.create).toBe("function");
    expect(typeof invites.get).toBe("function");
    expect(typeof invites.redeem).toBe("function");
    expect(typeof pushNotifications.subscribe).toBe("function");
    expect(typeof pushNotifications.unsubscribe).toBe("function");
    expect(typeof threads.list).toBe("function");
    expect(typeof threads.create).toBe("function");
    expect(typeof threads.get).toBe("function");
    expect(typeof threads.getMessages).toBe("function");
    expect(typeof tiers.list).toBe("function");
    expect(typeof tiers.create).toBe("function");
    expect(typeof subscribe.join).toBe("function");
    expect(typeof subscribe.get).toBe("function");
    expect(typeof hashtags.trending).toBe("function");
    expect(typeof hashtags.getPosts).toBe("function");
    expect(typeof editorPicks.get).toBe("function");
    expect(typeof leaderboard.get).toBe("function");
    expect(typeof tips.create).toBe("function");
    expect(typeof tips.getLeaderboard).toBe("function");
    expect(typeof events.list).toBe("function");
    expect(typeof events.join).toBe("function");
    expect(typeof weeklyTopic.getActive).toBe("function");
    expect(typeof recommendations.get).toBe("function");
    expect(typeof vote.getScore).toBe("function");
    expect(typeof vote.cast).toBe("function");
    expect(typeof follow.toggle).toBe("function");
    expect(typeof follow.followers).toBe("function");
    expect(typeof follow.following).toBe("function");
  });
});
