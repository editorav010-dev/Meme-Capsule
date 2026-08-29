import { useState, useEffect, useCallback } from "react";
import type { CatUser } from "./catTypes";
import { catGetMe, catLogout } from "./catApi";

const TOKEN_KEY = "cat_token";
const USER_KEY = "cat_user";

export function useCatAuth() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<CatUser | null>(() => {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = useCallback((newToken: string, newUser: CatUser) => {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await catLogout(token).catch(() => {});
    }
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await catGetMe(token);
      setUser(res.user);
      sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      // Session expired or invalid
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  return {
    token,
    user,
    isLoading,
    isSuperAdmin: user?.role === "superadmin",
    login,
    logout,
    refreshMe
  };
}
