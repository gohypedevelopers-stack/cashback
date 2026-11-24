"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Camera,
  LogOut,
  Mail,
  Phone,
  Save,
  User,
  UserCircle,
  HelpCircle,
  FileText,
  MessageCircle,
  Info,
  ChevronRight,
  CheckCircle2,
  Shield,
  FileQuestion,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import { useNavigate, Link } from "@/lib/router";
import { getMe, updateUserProfile, uploadUserAvatar, deleteUserAccount } from "../lib/api";
import { resolvePublicAssetUrl } from "../lib/apiClient";
import { AUTH_TOKEN_KEY, clearAuthToken, useAuth } from "../lib/auth";
import { useToast } from "../components/ui/ToastContext";
import { lockModalScroll, unlockModalScroll } from "../lib/modalScrollLock";

const Profile = () => {
  const navigate = useNavigate();
  const { info } = useToast();
  const { authToken: token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imgError, setImgError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    avatarUrl: "",
    dob: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/signin"); // Redirect if not authenticated
      return;
    }
    loadProfile();
  }, [token, navigate]);

  useEffect(() => {
    if (!showEditModal) return undefined;
    lockModalScroll();

    return () => {
      unlockModalScroll();
    };
  }, [showEditModal]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getMe(token);
      setProfile({
        name: data.name || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        avatarUrl: data.avatarUrl || "",
        dob: data.dob || "",
      });
      setImgError(false);
    } catch (err) {
      setError(err.message || "Failed to load profile");
      if (err.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      if (!profile.name.trim() || !profile.email.trim()) {
        throw new Error("Name and Email are required");
      }

      await updateUserProfile(token, {
        name: profile.name,
        email: profile.email,
        dob: profile.dob || undefined,
      });

      info(
        "Profile Updated",
        "Your profile details have been saved successfully.",
      );
      setShowEditModal(false);
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      const data = await uploadUserAvatar(token, file);
      setProfile((prev) => ({
        ...prev,
        avatarUrl: data.avatarUrl,
      }));
      setSuccess("Profile picture updated");
      await loadProfile();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError("");
    try {
      await deleteUserAccount(token);
      info("Account Deleted", "Your account has been successfully deactivated.");
      handleLogout();
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  if (!token) return null;

  const handleComingSoon = (feature) => {
    info(
      "Coming Soon",
      `${feature} feature is under development and will be available soon!`,
    );
  };

  const MenuButton = ({
    icon: Icon,
    label,
    onClick,
    to,
    isDestructive = false,
  }) => {
    const content = (
      <>
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isDestructive ? "bg-red-50 dark:bg-red-900/10" : "bg-gray-100 dark:bg-zinc-800"}`}
          >
            <Icon
              size={20}
              className={
                isDestructive
                  ? "text-red-500"
                  : "text-gray-600 dark:text-gray-400"
              }
            />
          </div>
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <ChevronRight size={18} className="text-gray-300 dark:text-zinc-700" />
      </>
    );

    const className = `w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-gray-50 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${isDestructive ? "text-red-500" : "text-gray-900 dark:text-white"}`;

    if (to) {
      return (
        <Link to={to} className={className}>
          {content}
        </Link>
      );
    }

    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300 font-admin-body">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Account
          </h1>
          <button
            type="button"
            onClick={loadProfile}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="space-y-6">
          {/* Profile Summary Card */}
          <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div
              className="relative group cursor-pointer"
              onClick={() => setShowEditModal(true)}
            >
              <div className="w-24 h-24 rounded-full bg-white dark:bg-zinc-900 shadow-xl flex items-center justify-center mb-3 overflow-hidden border-4 border-white dark:border-zinc-800">
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : null}
                {profile.avatarUrl && !imgError ? (
                  <img
                    src={resolvePublicAssetUrl(profile.avatarUrl)}
                    alt={profile.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span className="text-3xl font-medium text-gray-700 dark:text-gray-300">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
                  </span>
                )}
              </div>
              {/* Edit overlay on hover */}
              <div className="absolute inset-0 mb-3 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {profile.name || "User"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {profile.phoneNumber}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {profile.email}
            </p>
          </div>

          {/* Account Settings Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-2 mb-2">
              Settings
            </h3>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800">
              <MenuButton
                icon={User}
                label="Edit Profile"
                onClick={() => setShowEditModal(true)}
              />
              <MenuButton
                icon={ShoppingBag}
                label="My Orders"
                to="/orders"
              />
              {/*
              <MenuButton
                icon={Star}
                label="Level Rewards"
                to="/level-rewards"
              />
              */}
            </div>
          </div>

          {/* Help & Support Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-2 mb-2">
              Help & Support
            </h3>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800">
              <MenuButton
                icon={HelpCircle}
                label="Brand FAQs"
                to="/brand-faqs"
              />
              <MenuButton
                icon={FileQuestion}
                label="How Assured Rewards Works?"
                to="/how-verify-works"
              />
              <MenuButton icon={MessageCircle} label="Help & Support" to="/help" />
              <MenuButton
                icon={Mail}
                label="Contact Us"
                to="/profile/contact"
              />
            </div>
          </div>

          {/* Legal Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-2 mb-2">
              Legal
            </h3>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800">
              <MenuButton
                icon={Shield}
                label="Privacy Policy"
                to="/profile/privacy-policy"
              />
              <MenuButton
                icon={FileText}
                label="Terms & Conditions"
                to="/profile/terms"
              />
              <MenuButton
                icon={Shield}
                label="Return & Refund"
                to="/return-refund"
              />
              <MenuButton icon={Info} label="About Us" to="/about-us" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800">
            <MenuButton
              icon={LogOut}
              label="Logout"
              onClick={handleLogout}
              isDestructive
            />
            <MenuButton
              icon={Trash2}
              label="Delete Account"
              onClick={() => setShowDeleteConfirm(true)}
              isDestructive
            />
          </div>
        </div>

        {/* Edit Profile Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-120 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-safe-4 pt-safe bg-black/50 backdrop-blur-sm overflow-y-auto ios-scroll">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 w-full max-w-md max-h-[calc(100dvh-1.5rem-var(--safe-area-top)-var(--safe-area-bottom))] sm:max-h-[90vh] overflow-y-auto ios-scroll">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Profile
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 pb-2">
                <div className="space-y-4">
                  {/* Avatar Edit Section */}
                  <div className="flex flex-col items-center gap-3 pb-2">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-zinc-800 shadow-inner flex items-center justify-center overflow-hidden border-2 border-gray-100 dark:border-zinc-700">
                        {isUploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] z-10">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : null}
                        {profile.avatarUrl ? (
                          <img
                            src={resolvePublicAssetUrl(profile.avatarUrl)}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle
                            size={40}
                            className="text-gray-300 dark:text-zinc-600"
                          />
                        )}
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Profile Photo
                      </span>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-semibold cursor-pointer hover:bg-primary/20 transition-colors">
                        <Camera size={14} />
                        {isUploading ? "Uploading..." : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) =>
                          setProfile({ ...profile, name: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border-0 focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white transition-all placeholder:text-gray-400"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border-0 focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white transition-all placeholder:text-gray-400"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={profile.dob}
                        onChange={(e) =>
                          setProfile({ ...profile, dob: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border-0 focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={profile.phoneNumber}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-zinc-800/80 rounded-xl border-0 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 ml-1">
                      Phone number cannot be changed
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {success}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-strong text-white font-semibold shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-red-100 dark:border-red-900/20 w-full max-w-sm">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="text-red-500 w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Account?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This action is permanent. You will lose access to your wallet, rewards, and transaction history.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-3 pt-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={18} />
                        <span>Confirm Deletion</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                        setShowDeleteConfirm(false);
                        setIsDeleting(false);
                    }}
                    disabled={isDeleting}
                    className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    Keep My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
