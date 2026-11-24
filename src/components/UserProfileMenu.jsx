import React, { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, User, Wallet, HelpCircle } from "lucide-react";
import { useNavigate, useLocation } from "@/lib/router";
import StarBorder from "./StarBorder";
import { getMe } from "../lib/api";
import { resolvePublicAssetUrl } from "../lib/apiClient";
import { AUTH_CHANGE_EVENT, clearAuthToken, useAuth } from "../lib/auth";

const UserProfileMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  // useAuth is SSR-safe: "logged out" while hydrating, then the real token.
  const { authToken } = useAuth();
  const token = authToken || null;
  const [profile, setProfile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleAuthChange = () => {
      setImgError(false);
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () =>
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (typeof document === "undefined") return undefined;
    const handleClickOutside = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setError("");
      setIsLoading(false);
      setImgError(false);
      return undefined;
    }

    let isActive = true;
    setIsLoading(true);
    setError("");

    (async () => {
      try {
        const data = await getMe(token);
        if (!isActive) return;
        setProfile({
          name: data.name || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          avatarUrl: data.avatarUrl || "",
        });
        setImgError(false);
      } catch (err) {
        if (!isActive) return;
        if (err.status === 401) {
          clearAuthToken();
        }
        setProfile(null);
        setError(err.message || "Unable to load profile.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleLogout = () => {
    clearAuthToken();
    setIsOpen(false);
    setImgError(false);
  };

  const goToWallet = () => {
    setIsOpen(false);
    navigate("/wallet");
  };

  const goToProfile = () => {
    setIsOpen(false);
    navigate("/profile");
  };

  const goToHelp = () => {
    setIsOpen(false);
    navigate("/help");
  };

  // Get display name initial
  const getInitial = () => {
    if (profile?.name) {
      return profile.name.charAt(0).toUpperCase();
    }
    return isAuthenticated ? "U" : "G";
  };

  return (
    <div ref={containerRef} className="relative z-60 flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative h-11 w-11 rounded-full border-2 border-white/40 dark:border-zinc-800 flex items-center justify-center shadow-md overflow-hidden transition-transform active:scale-95 shrink-0 ${
          profile?.avatarUrl && !imgError 
            ? "bg-white" 
            : "bg-linear-to-br from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600"
        }`}
        aria-label="Open user menu"
      >
        {isLoading ? (
          <div className="h-full w-full bg-gray-200 animate-pulse rounded-full" />
        ) : profile?.avatarUrl && !imgError ? (
          <img
            src={resolvePublicAssetUrl(profile.avatarUrl)}
            alt={profile.name}
            className="h-full w-full object-cover rounded-full bg-white"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-gray-900 border-gray-900 text-[18px] font-bold font-sans leading-none">
            {getInitial()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-2xl shadow-zinc-900/10 backdrop-blur transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-950/90 dark:shadow-zinc-950">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {profile?.name || (isAuthenticated ? "User" : "Guest")}
            </div>
            {profile?.email && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {profile.email}
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {profile?.phoneNumber ||
                (isAuthenticated ? "No phone on file" : "Not signed in")}
            </div>
          </div>

          {isLoading && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Loading profile...
            </div>
          )}
          {error && (
            <div className="text-xs text-red-600 font-semibold mt-2">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-sm font-semibold dark:border-zinc-800">
            {location.pathname === "/wallet" ? (
              <StarBorder
                as="button"
                onClick={goToWallet}
                color="#1AA874"
                speed="4s"
                className="w-full cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-[#059669]" />
                  <span className="font-semibold text-white">Wallet</span>
                </div>
              </StarBorder>
            ) : (
              <button
                type="button"
                onClick={goToWallet}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-zinc-800"
              >
                <Wallet size={16} />
                Wallet
              </button>
            )}

            {location.pathname === "/profile" ? (
              <StarBorder
                as="button"
                onClick={goToProfile}
                color="#1AA874"
                speed="4s"
                className="w-full cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[#059669]" />
                  <span className="font-semibold text-white">Profile</span>
                </div>
              </StarBorder>
            ) : (
              <button
                type="button"
                onClick={goToProfile}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-zinc-800"
              >
                <User size={16} />
                Profile
              </button>
            )}
            <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />
            <button
              type="button"
              onClick={goToHelp}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-zinc-800"
            >
              <HelpCircle size={16} />
              Help & Support
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/60 dark:text-red-500"
              >
                <LogOut size={16} />
                Log out
              </button>
            ) : (
              <button
                type="button"
                onClick={goToWallet}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-zinc-800"
              >
                <LogIn size={16} />
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;
