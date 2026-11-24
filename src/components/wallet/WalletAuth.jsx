import React, { useState } from "react";
import { useNavigate } from "@/lib/router";
import { ShieldCheck, Phone, Mail } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";
import { sendOtp, verifyOtp, googleLogin, updateUserProfile } from "../../lib/api";
import { storeAuthToken } from "../../lib/auth";

const WalletAuth = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState("phone"); // default to phone
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Flow State
  const [isNewUser, setIsNewUser] = useState(false);
  const [showRegistrationDetails, setShowRegistrationDetails] = useState(false);
  const [tempToken, setTempToken] = useState("");

  // Additional details input states for signup completion
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");

  // Google Authentication State
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setStatus("");
    setIsGoogleSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Could not retrieve email from Google Account.");
      }

      const data = await googleLogin(user.email, user.displayName || "Google User");
      storeAuthToken(data.token);
      setStatus("Successfully authenticated with Google!");
      if (onLoginSuccess) {
        onLoginSuccess(data.token);
      }
    } catch (err) {
      console.error("Firebase Google Auth Error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in window was closed before completion.");
      } else if (err.code === "auth/cancelled-popup-request") {
        setError("Sign-in popup request was cancelled.");
      } else {
        setError(err.message || "Google authentication failed.");
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  React.useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const isValidPhone = (phone) => {
    // Accept 10-digit Indian numbers, optionally prefixed with +91 or 91
    const cleaned = phone.replace(/[\s\-()]/g, "");
    return /^(\+91|91)?[6-9]\d{9}$/.test(cleaned);
  };

  const normalizePhone = (phone) => {
    let cleaned = phone.replace(/[\s\-()]/g, "");
    // Strip +91 or 91 prefix to get raw 10-digit number
    if (cleaned.startsWith("+91")) cleaned = cleaned.slice(3);
    else if (cleaned.startsWith("91") && cleaned.length === 12) cleaned = cleaned.slice(2);
    return cleaned;
  };

  const isValidEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSendOtp = async () => {
    setError("");
    setStatus("");

    let targetPhone = "";
    let targetEmail = "";

    if (authMethod === "phone") {
      if (!phoneNumber.trim()) {
        setError("Enter your phone number to receive an OTP.");
        return;
      }
      if (!isValidPhone(phoneNumber)) {
        setError("Please enter a valid 10-digit phone number.");
        return;
      }
      targetPhone = normalizePhone(phoneNumber);
    } else {
      if (!email.trim()) {
        setError("Enter your email address to receive an OTP.");
        return;
      }
      if (!isValidEmail(email)) {
        setError("Please enter a valid email address.");
        return;
      }
      targetEmail = email.trim().toLowerCase();
    }

    setIsSendingOtp(true);
    try {
      // Step 1: Try sending with "Pending User" as Name to check if it's a signup (new user)
      await sendOtp(
        targetPhone || undefined,
        targetEmail || undefined,
        "Pending User",
        undefined
      );
      setIsNewUser(true);
      setOtpSent(true);
      setStatus(
        authMethod === "phone"
          ? "A verification code has been sent to your phone via WhatsApp."
          : "A verification code has been sent to your email address."
      );
      setResendCooldown(30);
    } catch (err) {
      const errMsg = String(err.message || "").toLowerCase();
      // If backend returns 400 that email/phone is already registered, call sendOtp for login (name=undefined)
      if (errMsg.includes("already registered") || errMsg.includes("please login") || err.status === 400) {
        try {
          await sendOtp(
            targetPhone || undefined,
            targetEmail || undefined,
            undefined,
            undefined
          );
          setIsNewUser(false);
          setOtpSent(true);
          setStatus(
            authMethod === "phone"
              ? "A verification code has been sent to your phone via WhatsApp."
              : "A verification code has been sent to your email address."
          );
          setResendCooldown(30);
        } catch (loginErr) {
          setError(loginErr.message || "Failed to send OTP.");
        }
      } else {
        setError(err.message || "Failed to send OTP.");
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError("Enter the OTP to continue.");
      return;
    }
    setError("");
    setStatus("");
    setIsVerifyingOtp(true);
    try {
      const targetPhone = authMethod === "phone" ? normalizePhone(phoneNumber) : undefined;
      const targetEmail = authMethod === "email" ? email.trim().toLowerCase() : undefined;
      const data = await verifyOtp(targetPhone, otp.trim(), targetEmail);
      
      if (isNewUser) {
        // Hold the JWT token in temporary state and transition to details page
        setTempToken(data.token);
        setShowRegistrationDetails(true);
        setStatus("OTP Verified. Please complete your registration details.");
      } else {
        // Normal login flow
        storeAuthToken(data.token);
        setStatus("Verified. Wallet connected.");
        if (onLoginSuccess) {
          onLoginSuccess(data.token);
        }
      }
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!regName.trim()) {
      setError("Please enter your Full Name.");
      return;
    }

    const updates = { name: regName.trim() };

    if (authMethod === "phone") {
      if (regEmail.trim()) {
        if (!isValidEmail(regEmail)) {
          setError("Please enter a valid Email Address.");
          return;
        }
        updates.email = regEmail.trim().toLowerCase();
      }
    } else {
      if (!regPhone.trim()) {
        setError("Please enter your WhatsApp Number.");
        return;
      }
      if (!isValidPhone(regPhone)) {
        setError("Please enter a valid 10-digit phone number.");
        return;
      }
      updates.phoneNumber = normalizePhone(regPhone);
    }

    setError("");
    setStatus("");
    setIsVerifyingOtp(true);
    try {
      await updateUserProfile(tempToken, updates);
      storeAuthToken(tempToken);
      setStatus("Registration completed! Wallet connected.");
      if (onLoginSuccess) {
        onLoginSuccess(tempToken);
      }
    } catch (err) {
      setError(err.message || "Failed to save registration details.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 py-4 space-y-6">
      {/* Assured Rewards Logo */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2 pb-1">
        <img
          src="/logo.png"
          alt="Assured Rewards"
          className="h-16 w-auto object-contain"
        />
        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Assured Rewards
        </span>
      </div>

      {showRegistrationDetails ? (
        /* Complete Profile Details Step */
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Complete Profile
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Please provide your details to finish signing up.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={(event) => setRegName(event.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400 text-sm"
              />
            </div>

            {authMethod === "phone" ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Email Address (Optional)</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(event) => setRegEmail(event.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400 text-sm"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">WhatsApp Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400 dark:text-zinc-500 pointer-events-none text-sm font-medium">
                    <span>+91</span>
                    <span className="text-gray-300 dark:text-zinc-700 ml-1">|</span>
                  </div>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(event) => setRegPhone(event.target.value)}
                    placeholder="WhatsApp Number"
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-14 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400 text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCompleteRegistration}
              disabled={isVerifyingOtp}
              className="w-full rounded-lg bg-primary hover:bg-primary-strong text-white font-semibold py-3 shadow-md shadow-primary/10 disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
            >
              {isVerifyingOtp ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </div>
      ) : !otpSent ? (
        /* Send OTP Step */
        <div className="space-y-5">
          <div className="space-y-3.5">
            {authMethod === "phone" ? (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400 dark:text-zinc-500 pointer-events-none text-sm font-medium">
                  <span>+91</span>
                  <span className="text-gray-300 dark:text-zinc-700 ml-1">|</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="WhatsApp Number"
                  maxLength={10}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-14 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400 text-sm"
                />
              </div>
            ) : (
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email Address"
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400 text-sm"
                />
              </div>
            )}

            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod(authMethod === "phone" ? "email" : "phone");
                  setError("");
                  setStatus("");
                }}
                className="text-xs font-semibold text-primary hover:text-primary-strong transition-colors"
              >
                {authMethod === "phone" ? "Use Email Verification" : "Use WhatsApp Verification"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSendingOtp}
              className="w-full rounded-lg bg-primary hover:bg-primary-strong text-white font-semibold py-3 shadow-md shadow-primary/10 disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
            >
              {isSendingOtp ? "Sending..." : "Continue"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
            <span className="text-xs text-gray-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">Or</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleSigningIn}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 font-semibold py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48c0,-0.6 -0.05,-1.17 -0.13,-1.7Z" fill="#4285f4" />
              <path d="M12.5,17.38c-1.54,0 -2.84,-1.04 -3.3,-2.45h-3.41v2.64C7.03,20.08 9.54,21.6 12.5,21.6c2.53,0 4.88,-0.9 6.64,-2.58l-3.3,-2.58C14.9,16.96 13.78,17.38 12.5,17.38Z" fill="#34a853" />
              <path d="M9.2,14.93c-0.23,-0.69 -0.36,-1.43 -0.36,-2.2c0,-0.77 0.13,-1.51 0.36,-2.2v7.89h-3.4C5.03,9.52 4.5,11.45 4.5,13.5c0,2.05 0.53,3.98 1.3,5.61l3.4,-2.18Z" fill="#fbbc05" />
              <path d="M12.5,8.13c1.37,0 2.6,0.47 3.57,1.4l2.67,-2.67C17.15,5.32 14.97,4.5 12.5,4.5C9.54,4.5 7.03,6.02 5.8,8.59l3.4,2.64c0.46,-1.41 1.76,-2.45 3.3,-2.45Z" fill="#ea4335" />
            </svg>
            <span>{isGoogleSigningIn ? "Signing in..." : "Continue with Google"}</span>
          </button>
        </div>
      ) : (
        /* OTP Sent Verification Step */
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Verify Code
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              {authMethod === "phone" ? (
                <span>
                  Enter the code sent to your WhatsApp number <strong className="font-bold text-gray-900 dark:text-white">+91 {phoneNumber}</strong>
                </span>
              ) : (
                <span>
                  Enter the code sent to your email <strong className="font-bold text-gray-900 dark:text-white">{email}</strong>
                </span>
              )}
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="0 0 0 0 0 0"
              maxLength={6}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300 tracking-[0.5em] text-center font-semibold text-xl"
            />

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp}
              className="w-full rounded-lg bg-primary hover:bg-primary-strong text-white font-semibold py-3 shadow-md shadow-primary/10 disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
            >
              {isVerifyingOtp ? "Verifying..." : "Verify & Connect Wallet"}
            </button>

            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || resendCooldown > 0}
                className="text-xs font-bold text-primary hover:text-primary-strong disabled:opacity-50 transition-colors"
              >
                {isSendingOtp 
                  ? "Sending..." 
                  : resendCooldown > 0 
                    ? `Resend code in ${resendCooldown}s` 
                    : "Didn't receive the code? Resend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold rounded-lg text-center animate-in fade-in zoom-in-95 duration-200">
          {status}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-lg text-center animate-in shake-in">
          {error}
        </div>
      )}

      {/* Terms of Service Disclaimer */}
      {!otpSent && (
        <p className="text-[11px] text-center text-gray-400 dark:text-zinc-500 leading-relaxed pt-2">
          By continuing, you agree to our{" "}
          <a href="/terms" className="underline hover:text-gray-600 dark:hover:text-zinc-400 transition-colors">
            Terms of service
          </a>
        </p>
      )}
    </div>
  );
};

export default WalletAuth;
