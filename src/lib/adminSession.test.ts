import { renderHook } from "@testing-library/react";
import {
  isAdminUnlocked,
  markAdminUnlocked,
  markSuperAdmin,
  clearSuperAdmin,
  useIsSuperAdmin,
  clearAdminSession,
} from "./adminSession";

const ADMIN_SESSION_KEY = "friezura_admin_unlocked";
const SUPER_ADMIN_SESSION_KEY = "friezura_super_admin";

describe("adminSession", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  describe("isAdminUnlocked", () => {
    it("returns false initially", () => {
      expect(isAdminUnlocked()).toBe(false);
    });

    it("returns true after markAdminUnlocked is called", () => {
      markAdminUnlocked();
      expect(isAdminUnlocked()).toBe(true);
    });

    it("reads directly from sessionStorage", () => {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      expect(isAdminUnlocked()).toBe(true);
    });
  });

  describe("markAdminUnlocked", () => {
    it("sets the admin session key in sessionStorage", () => {
      markAdminUnlocked();
      expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("true");
    });
  });

  describe("markSuperAdmin", () => {
    it("sets the super admin session key in sessionStorage", () => {
      markSuperAdmin();
      expect(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY)).toBe("true");
    });
  });

  describe("clearSuperAdmin", () => {
    it("removes the super admin session key from sessionStorage", () => {
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, "true");
      clearSuperAdmin();
      expect(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY)).toBeNull();
    });

    it("does not affect the admin session key", () => {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, "true");
      clearSuperAdmin();
      expect(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY)).toBeNull();
      expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("true");
    });
  });

  describe("clearAdminSession", () => {
    it("removes both session keys from sessionStorage", () => {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, "true");
      clearAdminSession();
      expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
      expect(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY)).toBeNull();
    });
  });

  describe("useIsSuperAdmin", () => {
    it("returns false when super admin key is not set", () => {
      const { result } = renderHook(() => useIsSuperAdmin());
      expect(result.current).toBe(false);
    });

    it("returns true when super admin key is set", () => {
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, "true");
      const { result } = renderHook(() => useIsSuperAdmin());
      expect(result.current).toBe(true);
    });
  });
});
