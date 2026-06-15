import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  auth,
  users,
  setToken,
  getToken,
} from "@/lib/api";

describe("auth API methods", () => {
  it("provides login method", () => {
    expect(typeof auth.login).toBe("function");
  });

  it("provides register method", () => {
    expect(typeof auth.register).toBe("function");
  });
});

describe("users API methods", () => {
  it("provides getProfile method", () => {
    expect(typeof users.getProfile).toBe("function");
  });

  it("provides updateProfile method", () => {
    expect(typeof users.updateProfile).toBe("function");
  });

  it("provides toggleFollow method", () => {
    expect(typeof users.toggleFollow).toBe("function");
  });

  it("provides getFollowers method", () => {
    expect(typeof users.getFollowers).toBe("function");
  });

  it("provides getFollowing method", () => {
    expect(typeof users.getFollowing).toBe("function");
  });
});

describe("token management", () => {
  afterEach(() => {
    setToken(null);
  });

  it("setToken stores and getToken retrieves token in-memory", () => {
    setToken("test-token-abc123");
    expect(getToken()).toBe("test-token-abc123");
  });

  it("setToken(null) clears token", () => {
    setToken("test-token-abc123");
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it("getToken returns null when no token is set", () => {
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it("token is stored in memory not localStorage", () => {
    setToken("test-token-memory");
    expect(localStorage.getItem("polis_token")).toBeNull();
    expect(getToken()).toBe("test-token-memory");
  });

  it("cookie is set when token is stored", () => {
    setToken("cookie-test-token");
    expect(document.cookie).toContain("polis_token=cookie-test-token");
  });
});
