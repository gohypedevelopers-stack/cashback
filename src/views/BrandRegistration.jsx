"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@/lib/router";
import {
  ChevronLeft,
  Check,
  Building2,
  Globe,
  MapPin,
  Upload,
  FileText,
  Briefcase,
  LayoutGrid,
  Loader2,
  ShoppingBag,
  Utensils,
  Laptop,
  Shirt,
  Plane,
  Heart,
  Music,
  Camera,
  Coffee,
  Zap,
  User, // Added
  Mail, // Added
  Phone, // Added
  MessageCircle,
  Lock,
  X,
  Eye,
  EyeOff,
  CreditCard, // Added
  Banknote, // Added
  ShieldCheck, // Added
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "../lib/apiClient";
import { uploadImage } from "../lib/api";
import { cn } from "../lib/utils";
import { useToast } from "../components/ui";

// ============================================================================
// CONSTANTS & OPTIONS
// ============================================================================

const INDUSTRY_OPTIONS = [
  {
    value: "retail",
    label: "Retail & E-commerce",
    icon: ShoppingBag,
    description: "Online and offline stores",
  },
  {
    value: "food_beverage",
    label: "Food & Beverage",
    icon: Utensils,
    description: "Restaurants, cafes, packaged food",
  },
  {
    value: "technology",
    label: "Technology & SaaS",
    icon: Laptop,
    description: "Software, hardware, IT services",
  },
  {
    value: "fashion_lifestyle",
    label: "Fashion & Lifestyle",
    icon: Shirt,
    description: "Apparel, accessories, beauty",
  },
  {
    value: "travel_hospitality",
    label: "Travel & Hospitality",
    icon: Plane,
    description: "Hotels, tours, agencies",
  },
  {
    value: "health_wellness",
    label: "Health & Wellness",
    icon: Heart,
    description: "Fitness, medical, personal care",
  },
  {
    value: "entertainment",
    label: "Entertainment & Media",
    icon: Music,
    description: "Music, film, content creation",
  },
  {
    value: "creative_arts",
    label: "Creative Arts",
    icon: Camera,
    description: "Design, photography, art",
  },
  {
    value: "services",
    label: "Professional Services",
    icon: Briefcase,
    description: "Consulting, legal, financial",
  },
  {
    value: "other",
    label: "Other",
    icon: LayoutGrid,
    description: "Various other industries",
  },
];

const STEPS = [
  { id: 0, key: "plan", label: "Choose Plan" },
  { id: 1, key: "account", label: "Account" },
  { id: 2, key: "identity", label: "Brand Identity" },
  { id: 3, key: "industry", label: "Industry" },
  { id: 4, key: "details", label: "Brand Details" },
  { id: 5, key: "review", label: "Review & Submit" },
];

// ============================================================================
// UI COMPONENTS (Inline for portability)
// ============================================================================

const Button = ({
  className,
  variant = "primary",
  size = "default",
  ...props
}) => {
  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-strong shadow-lg shadow-primary/20",
    outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-900",
    ghost: "hover:bg-gray-50 text-gray-500 hover:text-gray-900",
  };
  const sizes = {
    default: "h-11 px-6 py-2",
    sm: "h-9 px-3",
    lg: "h-14 px-8 text-lg",
    icon: "h-10 w-10 p-0 flex items-center justify-center",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
};

const Input = ({ className, ...props }) => (
  <input
    className={cn(
      "flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
      className,
    )}
    {...props}
  />
);

const Label = ({ className, ...props }) => (
  <label
    className={cn(
      "text-sm font-medium leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
);

const Textarea = ({ className, ...props }) => (
  <textarea
    className={cn(
      "flex min-h-[120px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-all duration-200",
      className,
    )}
    {...props}
  />
);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StepHeader = ({ title, subtitle }) => (
  <div className="mb-8 text-center px-4">
    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight tracking-tight">
      {title}
    </h1>
    {subtitle && (
      <p className="text-gray-500 text-base md:text-lg max-w-lg mx-auto font-light">
        {subtitle}
      </p>
    )}
  </div>
);

const OptionCard = ({ selected, onClick, label, description, icon: Icon }) => (
  <motion.button
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    type="button"
    onClick={onClick}
    className={cn(
      "group relative w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 overflow-hidden text-left",
      selected
        ? "border-primary/50 bg-primary/5 shadow-sm"
        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300",
    )}
  >
    {selected && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
    )}

    <div className="flex items-center gap-4 md:gap-5">
      {Icon && (
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
            selected
              ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110"
              : "bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600",
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div>
        <h3
          className={cn(
            "text-base md:text-lg font-semibold transition-colors",
            selected ? "text-primary" : "text-gray-900",
          )}
        >
          {label}
        </h3>
        {description && (
          <p className="text-gray-500 text-xs md:text-sm mt-1 group-hover:text-gray-600 transition-colors line-clamp-1">
            {description}
          </p>
        )}
      </div>
    </div>

    <div
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-4 transition-all duration-300 border",
        selected
          ? "bg-primary border-primary text-white scale-110"
          : "bg-transparent border-gray-200 text-transparent group-hover:border-gray-300",
      )}
    >
      <Check className="w-3.5 h-3.5 stroke-3" />
    </div>
  </motion.button>
);

const ActionButton = ({ onClick, disabled, loading, children }) => (
  <Button
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full h-14 text-base font-bold rounded-full bg-primary text-white hover:bg-primary-strong transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(5,150,105,0.2)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
  >
    {loading ? (
      <span className="flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Processing...
      </span>
    ) : (
      children
    )}
  </Button>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const isValidIndianMobile = (value) =>
  /^[6-9]\d{9}$/.test(String(value || ""));
const BrandRegistration = () => {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Always start at Step 0 (Account)
  const [currentStep, setCurrentStep] = useState(0);
  const isLoggedIn = Boolean(token);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // WhatsApp phone verification state
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [showPhoneOtpInput, setShowPhoneOtpInput] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpModalCode, setOtpModalCode] = useState("");
  const [otpModalLoading, setOtpModalLoading] = useState(false);
  const [otpModalSending, setOtpModalSending] = useState(false);
  const [otpModalError, setOtpModalError] = useState("");
  const [otpModalSent, setOtpModalSent] = useState(false);

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // 'available' or 'taken'

  // Form State
  const [formData, setFormData] = useState({
    // Plan Field
    planType: "prepaid",

    // Account Fields
    contactName: "",
    companyName: "",
    designation: "",
    email: "",
    phoneNumber: "",
    alternatePhone: "",
    username: "",
    password: "",
    confirmPassword: "",

    // Brand Fields
    name: "",
    website: "",
    industry: "",
    logoUrl: "",
    logoFile: null, // Store actual file
    logoPreview: null, // Store local preview URL
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
  });

  const totalSteps = STEPS.length - 1; // 0 to 5

  // Handlers
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
    if (field === "username") {
      setUsernameStatus(null);
    }
    if (field === "email") {
      setIsEmailVerified(false);
      setShowOtpInput(false);
      setEmailOtp("");
    }
    if (field === "phoneNumber") {
      setIsPhoneVerified(false);
      setShowPhoneOtpInput(false);
      setPhoneOtp("");
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) return;
    setIsCheckingUsername(true);
    try {
      const res = await apiRequest("/api/auth/check-username", {
        method: "POST",
        body: { username: username.trim() },
      });
      setUsernameStatus(res.available ? "available" : "taken");
    } catch (err) {
      console.error("Username check failed", err);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const sendEmailVerification = async () => {
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address first.");
      return;
    }
    setIsSendingOtp(true);
    setError("");
    try {
      await apiRequest("/api/auth/send-email-verification-otp", {
        method: "POST",
        body: { email: formData.email, name: formData.contactName },
      });
      setShowOtpInput(true);
      toastSuccess("OTP Sent", "Please check your email for the verification code.");
    } catch (err) {
      console.error("Failed to send OTP", err);
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setIsVerifyingOtp(true);
    setError("");
    try {
      await apiRequest("/api/auth/verify-email-verification-otp", {
        method: "POST",
        body: { email: formData.email, otp: emailOtp },
      });
      setIsEmailVerified(true);
      setShowOtpInput(false);
      toastSuccess("Email Verified", "Your email has been successfully verified.");
    } catch (err) {
      console.error("Failed to verify OTP", err);
      const errorMsg = err.message || "Invalid or expired OTP.";
      setError(errorMsg);
      toastError("Verification Failed", errorMsg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const sendPhoneVerification = async () => {
    const phoneNumber = formData.phoneNumber.trim();

    if (!isValidIndianMobile(phoneNumber)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSendingPhoneOtp(true);
    setError("");
    try {
      await apiRequest("/api/auth/send-vendor-phone-otp", {
        method: "POST",
        body: { phoneNumber },
      });
      setShowPhoneOtpInput(true);
      toastSuccess(
        "WhatsApp OTP sent",
        "A 6-digit code was sent to your WhatsApp number.",
      );
    } catch (err) {
      console.error("Failed to send WhatsApp OTP", err);
      const errorMsg = err.message || "Unable to send the WhatsApp OTP.";
      setError(errorMsg);
      toastError("OTP not sent", errorMsg);
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const verifyPhoneOtp = async () => {
    const phoneNumber = formData.phoneNumber.trim();
    const otp = phoneOtp.trim();

    if (!isValidIndianMobile(phoneNumber)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code sent on WhatsApp.");
      return;
    }

    setIsVerifyingPhoneOtp(true);
    setError("");
    try {
      await apiRequest("/api/auth/verify-vendor-phone-otp", {
        method: "POST",
        body: { phoneNumber, otp },
      });
      setIsPhoneVerified(true);
      setShowPhoneOtpInput(false);
      setPhoneOtp("");
      toastSuccess("Phone verified", "Your WhatsApp number is verified.");
    } catch (err) {
      console.error("Failed to verify WhatsApp OTP", err);
      const errorMsg = err.message || "Invalid or expired WhatsApp OTP.";
      setError(errorMsg);
      toastError("Verification failed", errorMsg);
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const sendBothOtps = async () => {
    const phoneNumber = formData.phoneNumber.trim();
    const email = formData.email.trim();
    setOtpModalSending(true);
    setOtpModalError("");
    let phoneSent = false;
    let emailSent = false;

    // Send WhatsApp OTP
    if (isValidIndianMobile(phoneNumber)) {
      try {
        await apiRequest("/api/auth/send-vendor-phone-otp", {
          method: "POST",
          body: { phoneNumber },
        });
        phoneSent = true;
      } catch (err) {
        console.error("WhatsApp OTP failed", err);
      }
    }

    // Send Email OTP
    if (email && email.includes("@")) {
      try {
        await apiRequest("/api/auth/send-email-verification-otp", {
          method: "POST",
          body: { email, name: formData.contactName },
        });
        emailSent = true;
      } catch (err) {
        console.error("Email OTP failed", err);
      }
    }

    setOtpModalSending(false);
    if (!phoneSent && !emailSent) {
      setOtpModalError("Failed to send OTP. Please check your details.");
      return false;
    }
    setOtpModalSent(true);
    return true;
  };

  const verifyOtpModal = async () => {
    const otp = otpModalCode.trim();
    if (!/^\d{6}$/.test(otp)) {
      setOtpModalError("Enter a valid 6-digit OTP.");
      return;
    }
    setOtpModalLoading(true);
    setOtpModalError("");

    // Try phone verification first
    const phoneNumber = formData.phoneNumber.trim();
    if (isValidIndianMobile(phoneNumber)) {
      try {
        await apiRequest("/api/auth/verify-vendor-phone-otp", {
          method: "POST",
          body: { phoneNumber, otp },
        });
        setIsPhoneVerified(true);
        setShowOtpModal(false);
        setOtpModalCode("");
        setOtpModalLoading(false);
        toastSuccess("Verified!", "Your identity has been verified.");
        // Move to next step
        setCurrentStep((curr) => curr + 1);
        setError("");
        return;
      } catch (err) {
        console.error("Phone OTP verify failed", err);
      }
    }

    // Try email verification as fallback
    const email = formData.email.trim();
    if (email && email.includes("@")) {
      try {
        await apiRequest("/api/auth/verify-email-verification-otp", {
          method: "POST",
          body: { email, otp },
        });
        setIsEmailVerified(true);
        setShowOtpModal(false);
        setOtpModalCode("");
        setOtpModalLoading(false);
        toastSuccess("Verified!", "Your identity has been verified.");
        // Move to next step
        setCurrentStep((curr) => curr + 1);
        setError("");
        return;
      } catch (err) {
        console.error("Email OTP verify failed", err);
      }
    }

    setOtpModalLoading(false);
    setOtpModalError("Invalid or expired OTP. Please try again.");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size/type if needed
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Image size too large (max 5MB)");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logoFile: file,
          logoPreview: reader.result,
          logoUrl: "", // Clear manual URL if file selected
        }));
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 0: // Plan
        if (!formData.planType) return "Please select a plan type.";
        return "";
      case 1: // Account
        if (!formData.contactName.trim()) return "Contact name is required.";
        if (!formData.designation.trim()) return "Designation is required.";
        if (!isValidIndianMobile(formData.phoneNumber))
          return "Enter a valid 10-digit Indian mobile number.";
        if (formData.alternatePhone && !isValidIndianMobile(formData.alternatePhone))
          return "Enter a valid 10-digit alternate mobile number.";
        if (!formData.email.trim() || !formData.email.includes("@"))
          return "Valid email is required.";
        // Verification is handled by the OTP modal in handleNext
        if (!formData.username.trim()) return "Username is required.";
        if (usernameStatus === "taken") return "Username is already taken.";
        // Password is only required for new users (not logged in)
        if (!isLoggedIn) {
          if (formData.password.length < 6)
            return "Password must be at least 6 characters.";
          if (formData.password !== formData.confirmPassword)
            return "Passwords do not match.";
        } else {
          // For logged-in users, password is optional but must be valid if provided
          if (formData.password && formData.password.length < 6)
            return "Password must be at least 6 characters.";
          if (
            formData.password &&
            formData.password !== formData.confirmPassword
          )
            return "Passwords do not match.";
        }
        return "";
      case 2: // Identity
        if (!formData.companyName.trim()) return "Company name is required.";
        if (!formData.name.trim()) return "Brand name is required.";
        if (formData.website && !formData.website.includes("."))
          return "Please enter a valid website URL.";
        return "";
      case 3: // Industry
        if (!formData.industry) return "Please select an industry.";
        return "";
      case 4: // Details
        if (!formData.description.trim())
          return "Brand description is required.";
        if (!formData.address.trim()) return "Street address is required.";
        if (!formData.city.trim()) return "City is required.";
        if (!formData.state.trim()) return "State is required.";
        if (!formData.pincode.trim()) return "Pincode is required.";
        // GST number is now optional
        return "";
      default:
        return "";
    }
  };

  const handleNext = async () => {
    // Custom validation for account step that doesn't check verification status
    if (currentStep === 1) {
      if (!formData.contactName.trim()) { setError("Contact name is required."); toastError("Validation Error", "Contact name is required."); return; }
      if (!formData.designation.trim()) { setError("Designation is required."); toastError("Validation Error", "Designation is required."); return; }
      if (!isValidIndianMobile(formData.phoneNumber)) { setError("Enter a valid 10-digit Indian mobile number."); toastError("Validation Error", "Enter a valid 10-digit Indian mobile number."); return; }
      if (formData.alternatePhone && !isValidIndianMobile(formData.alternatePhone)) { setError("Enter a valid 10-digit alternate mobile number."); toastError("Validation Error", "Enter a valid 10-digit alternate mobile number."); return; }
      if (!formData.email.trim() || !formData.email.includes("@")) { setError("Valid email is required."); toastError("Validation Error", "Valid email is required."); return; }
      if (!formData.username.trim()) { setError("Username is required."); toastError("Validation Error", "Username is required."); return; }
      if (usernameStatus === "taken") { setError("Username is already taken."); toastError("Validation Error", "Username is already taken."); return; }
      if (!isLoggedIn) {
        if (formData.password.length < 6) { setError("Password must be at least 6 characters."); toastError("Validation Error", "Password must be at least 6 characters."); return; }
        if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); toastError("Validation Error", "Passwords do not match."); return; }
      } else {
        if (formData.password && formData.password.length < 6) { setError("Password must be at least 6 characters."); toastError("Validation Error", "Password must be at least 6 characters."); return; }
        if (formData.password && formData.password !== formData.confirmPassword) { setError("Passwords do not match."); toastError("Validation Error", "Passwords do not match."); return; }
      }

      // If already verified, skip the modal
      if (isPhoneVerified || isEmailVerified) {
        setCurrentStep((curr) => curr + 1);
        setError("");
        return;
      }

      // Show OTP modal and send OTPs
      setShowOtpModal(true);
      setOtpModalCode("");
      setOtpModalError("");
      setOtpModalSent(false);
      sendBothOtps();
      return;
    }

    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      toastError("Validation Error", validationError);
      return;
    }
    if (currentStep < 5) {
      setCurrentStep((curr) => curr + 1);
      setError("");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((curr) => curr - 1);
      setError("");
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateStep(currentStep);
    if (validationError && currentStep !== 5) {
      setError(validationError);
      toastError("Validation Error", validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let activeToken = token;

      // 1. Register User if not logged in
      if (!activeToken) {
        const registerRes = await apiRequest("/api/auth/register", {
          method: "POST",
          body: {
            name: formData.contactName,
            email: formData.email,
            username: formData.username,
            password: formData.password,
            role: "vendor",
          },
        });

        if (registerRes.token) {
          activeToken = registerRes.token;
          localStorage.setItem("token", activeToken); // Save for session
          setToken(activeToken); // Update state
        } else {
          throw new Error("Registration succeeded but no token returned.");
        }
      } else if (formData.password && formData.password.length >= 6) {
        // 2. For logged-in users: Set/Update Password if provided
        try {
          await apiRequest("/api/auth/set-password", {
            method: "POST",
            body: {
              password: formData.password,
            },
            token: activeToken,
          });
        } catch (pwErr) {
          console.error("Password update failed:", pwErr);
          // Non-blocking: Log but continue with brand creation
        }
      }

      {
        /* 3. Get image URL (Upload or use existing) */
      }
      let finalLogoUrl = formData.logoUrl;

      if (formData.logoFile) {
        try {
          const uploadRes = await uploadImage(activeToken, formData.logoFile);
          // endpoint returns { message, url }
          finalLogoUrl = uploadRes.url;
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          throw new Error(
            "Failed to upload logo. Please try again or use a URL.",
          );
        }
      }

      // 2. Update Vendor Profile with Business Info
      await apiRequest("/api/vendor/profile", {
        method: "PUT",
        body: {
          businessName: formData.companyName,
          contactPhone: formData.phoneNumber,
          alternatePhone: formData.alternatePhone,
          designation: formData.designation,
          gstin: formData.gstNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        token: activeToken,
      });

      // 4. Create Brand
      await apiRequest("/api/vendor/brands", {
        method: "POST",
        body: {
          name: formData.name,
          website: formData.website,
          industry: formData.industry,
          logoUrl: finalLogoUrl,
          description: formData.description,
          defaultPlanType: formData.planType,
        },
        token: activeToken,
      });

      // Success
      // alert("Welcome! Your brand has been registered.");
      navigate("/vendor-dashboard"); // Redirect to Dashboard
    } catch (err) {
      console.error("Submission error:", err);
      const msg = err.message || "Failed to process request. Please try again.";
      setError(msg);
      toastError("Submission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle logout for fresh registration
  const handleStartFresh = () => {
    localStorage.removeItem("token");
    setToken(null);
    setFormData((prev) => ({
      ...prev,
      contactName: "",
      email: "",
      password: "",
      confirmPassword: "",
    }));
  };

  // Render Plan Selection Step
  const renderPlanStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <StepHeader
        title="Choose your billing plan"
        subtitle="Select how you want to fund your cashback campaigns."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Instant Plan */}
        <button
          type="button"
          onClick={() => handleFieldChange("planType", "prepaid")}
          className={cn(
            "relative p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md flex flex-col h-full",
            formData.planType === "prepaid"
              ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
              : "border-gray-100 bg-white hover:border-gray-200",
          )}
        >
          {formData.planType === "prepaid" && (
            <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-sm z-10">
              <Check className="w-5 h-5 text-white stroke-3" />
            </div>
          )}
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
            <Banknote className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Instant Plan</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-400 line-through">₹25,000</span>
            <span className="text-lg font-bold text-emerald-600">FREE</span>
          </div>
          <p className="text-gray-500 text-sm mb-6 grow">
            Pay upfront, get full control. Lock your cashback budget before
            launching campaigns.
          </p>
          <div className="space-y-3 pt-4 border-t border-gray-100/50">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Best for fixed budgets</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>No risk of overspending</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Instant qr activation</span>
            </div>
          </div>
        </button>

        {/* Flow Plan */}
        <button
          type="button"
          onClick={() => handleFieldChange("planType", "postpaid")}
          className={cn(
            "relative p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md flex flex-col h-full",
            formData.planType === "postpaid"
              ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
              : "border-gray-100 bg-white hover:border-gray-200",
          )}
        >
          {formData.planType === "postpaid" && (
            <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-sm z-10">
              <Check className="w-5 h-5 text-white stroke-3" />
            </div>
          )}
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Flow Plan</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-400 line-through">₹50,000</span>
            <span className="text-lg font-bold text-emerald-600">₹20,000</span>
          </div>
          <p className="text-gray-500 text-sm mb-6 grow">
            Pay as you go. No upfront budget lock — pay only when QR codes are
            redeemed.
          </p>
          <div className="space-y-3 pt-4 border-t border-gray-100/50">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Maximum flexibility</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Pay only for results</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Pay according to sheet</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  // Render Account Step
  const renderAccountStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <StepHeader
        title="Create Account"
        subtitle="First, let's create your vendor access."
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base text-gray-900">Username</Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="w-5 h-5" />
            </div>
            <Input
              placeholder="unique_username"
              className={cn(
                "pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all",
                usernameStatus === "available" &&
                  "border-green-500 bg-green-50/30",
                usernameStatus === "taken" && "border-red-500 bg-red-50/30",
              )}
              value={formData.username}
              onChange={(e) => {
                const val = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "");
                handleFieldChange("username", val);
              }}
              onBlur={(e) => checkUsernameAvailability(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
              {isCheckingUsername && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
              {!isCheckingUsername && usernameStatus === "available" && (
                <Check className="w-5 h-5 text-green-500" />
              )}
              {!isCheckingUsername && usernameStatus === "taken" && (
                <X className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          {usernameStatus === "taken" && (
            <p className="text-xs text-red-500 mt-1 ml-1">
              Username already taken.
            </p>
          )}
          {usernameStatus === "available" && (
            <p className="text-xs text-green-600 mt-1 ml-1">
              Username is available!
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-base text-gray-900">Full Name</Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="w-5 h-5" />
            </div>
            <Input
              placeholder="John Doe"
              className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
              value={formData.contactName}
              onChange={(e) => handleFieldChange("contactName", e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base text-gray-900">Phone Number</Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone className="w-5 h-5" />
              </div>
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                placeholder="10-digit mobile"
                className={cn(
                  "pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all",
                  isPhoneVerified && "border-green-500 bg-green-50/30",
                )}
                value={formData.phoneNumber}
                onChange={(e) =>
                  handleFieldChange(
                    "phoneNumber",
                    e.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
              />
              {isPhoneVerified && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base text-gray-900">Work Email</Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <Input
                type="email"
                placeholder="name@company.com"
                className={cn(
                  "pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all",
                  isEmailVerified && "border-green-500 bg-green-50/30",
                )}
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
              />
              {isEmailVerified && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base text-gray-900">Designation</Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <Input
              placeholder="e.g. CEO, Director"
              className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
              value={formData.designation}
              onChange={(e) =>
                handleFieldChange("designation", e.target.value)
              }
            />
          </div>
        </div>

        {(isPhoneVerified || isEmailVerified) && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Identity Verified</p>
              <p className="text-xs text-green-600">
                {isPhoneVerified ? "Phone number" : "Email"} verified successfully.
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base text-gray-900">
              Password
            </Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="******"
                className="pl-12 pr-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
                value={formData.password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex="-1"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base text-gray-900">Confirm Password</Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="******"
                className="pl-12 pr-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleFieldChange("confirmPassword", e.target.value)
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex="-1"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-sm text-center pt-2">
          Already have an account?{" "}
          <a href="/vendor" className="text-primary hover:underline">
            Log in here
          </a>
        </p>
      </div>
    </div>
  );

  // ... (Steps 1, 2, 3 remain same - just update formData references if needed, but we used same object)

  // ... Copy Step 1-3 from existing file but ensure they are included in the render ...

  // Wait, to use replace_file_content effectively I need to be careful not to delete the existing render steps if I don't include them in ReplacementContent.
  // The Tool says: "ReplacementContent must be a complete drop-in replacement of the TargetContent".
  // I should select the block from "const BrandRegistration = () => {" to the end.

  // Since I cannot see the FULL file content in my memory buffer cleanly for a huge One-Shot replacement without risking mistakes,
  // I will use "replace_file_content" on the Specific Block "const BrandRegistration ... " and rewrite the component body.

  // I need to make sure I include renderStep1, renderStep2, renderStep3, renderStep4 definitions inside.
  // I will include them in my ReplacementContent.

  // Let's grab the render functions from the file view I just did (Step 152).
  // I will copy them into my replacement content to ensure they are preserved.

  const renderIdentityStep = () => (
    // Identity
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <StepHeader
        title="What's your brand called?"
        subtitle="Let's start with the basics of your brand identity."
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base text-gray-900">Company Name</Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Building2 className="w-5 h-5" />
            </div>
            <Input
              placeholder="e.g. Acme Corp Pvt Ltd"
              className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
              value={formData.companyName}
              onChange={(e) => handleFieldChange("companyName", e.target.value)}
              autoFocus={currentStep === 1}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base text-gray-900">Brand Name</Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Building2 className="w-5 h-5" />
            </div>
            <Input
              placeholder="e.g. Acme Brand"
              className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base text-gray-900">Website (Optional)</Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Globe className="w-5 h-5" />
            </div>
            <Input
              placeholder="e.g. www.acme.com"
              className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
              value={formData.website}
              onChange={(e) => handleFieldChange("website", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderIndustryStep = () => (
    // Industry
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <StepHeader
        title="Which industry fits best?"
        subtitle="Helping us categorize your brand for better visibility."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {INDUSTRY_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            selected={formData.industry === option.value}
            onClick={() => handleFieldChange("industry", option.value)}
            label={option.label}
            description={option.description}
            icon={option.icon}
          />
        ))}
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    // Details
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <StepHeader
        title="Tell us more"
        subtitle="Add a logo and detailed description to make your brand stand out."
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base text-gray-900">Brand Logo</Label>
          <div className="flex flex-col gap-4">
            {/* Drag & Drop / Click Area */}
            <div className="relative group">
              <input
                type="file"
                id="logo-upload-step"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
              <label
                htmlFor="logo-upload-step"
                className={`w-full h-32 rounded-xl flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer overflow-hidden relative ${
                  formData.logoPreview
                    ? "border-primary bg-white/5"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {formData.logoPreview ? (
                  <>
                    <img
                      src={formData.logoPreview}
                      alt="Logo Preview"
                      className="h-full w-auto object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-gray-900 text-sm font-medium flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Change
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3 border border-gray-100">
                      <Upload
                        size={20}
                        className="text-gray-400 group-hover:text-primary transition-colors"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      SVG, PNG, JPG (max 5MB)
                    </span>
                  </>
                )}
              </label>
              {formData.logoPreview && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      logoFile: null,
                      logoPreview: null,
                    }))
                  }
                  className="absolute -top-2 -right-2 bg-red-500/90 text-white p-1 rounded-full shadow-lg hover:bg-red-500 transition-colors"
                  title="Remove logo"
                >
                  <X size={14} fill="currentColor" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base text-gray-900">Description</Label>
          <div className="relative">
            <div className="absolute left-4 top-4 text-gray-400">
              <FileText className="w-5 h-5" />
            </div>
            <Textarea
              placeholder="Describe your brand's mission, products, or services..."
              className="pl-12 min-h-[160px] bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all leading-relaxed placeholder:text-gray-400"
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base text-gray-900">Street Address</Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <MapPin className="w-5 h-5" />
            </div>
            <Input
              placeholder="e.g. 123 Main St, Suite 100"
              className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
              value={formData.address}
              onChange={(e) => handleFieldChange("address", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base text-gray-900">City</Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <MapPin className="w-5 h-5" />
              </div>
              <Input
                placeholder="City"
                className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
                value={formData.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base text-gray-900">State</Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <MapPin className="w-5 h-5" />
              </div>
              <Input
                placeholder="State"
                className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
                value={formData.state}
                onChange={(e) => handleFieldChange("state", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base text-gray-900">Pincode</Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <MapPin className="w-5 h-5" />
              </div>
              <Input
                placeholder="6-digit pincode"
                className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
                value={formData.pincode}
                onChange={(e) => handleFieldChange("pincode", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base text-gray-900">GST Number</Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <FileText className="w-5 h-5" />
              </div>
              <Input
                placeholder="GSTIN"
                className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg focus:border-primary/50 transition-all"
                value={formData.gstNumber}
                onChange={(e) => handleFieldChange("gstNumber", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    // Review
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <StepHeader
        title="Review & Submit"
        subtitle="Please verify your information before creating the brand."
      />

      <div className="bg-gray-50 rounded-3xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm">
        <div className="p-6 md:p-8 flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shrink-0 overflow-hidden border border-gray-200 shadow-sm">
            {formData.logoPreview || formData.logoUrl ? (
              <img
                src={formData.logoPreview || formData.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <Building2 className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-gray-900">
              {formData.name}
            </h3>
            <div className="flex items-center gap-2 text-primary">
              <Globe className="w-4 h-4" />
              <a
                href={formData.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline hover:no-underline font-medium"
              >
                {formData.website || "No website"}
              </a>
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 shadow-sm mt-2">
              {INDUSTRY_OPTIONS.find((i) => i.value === formData.industry)
                ?.label || formData.industry}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-2">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">
            Description
          </h4>
          <p className="text-gray-700 leading-relaxed text-lg">
            {formData.description || "No description provided."}
          </p>
        </div>

        {/* Account & Company Summary */}
        <div className="p-6 md:p-8 space-y-4 bg-white/50">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">
            Registration Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Contact</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{formData.contactName}</span>
                <span className="text-gray-400 text-sm">
                  ({formData.designation})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>{formData.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Company</p>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-medium">{formData.companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>{formData.phoneNumber}</span>
                {formData.alternatePhone && (
                  <span className="text-gray-400 text-sm">
                    / {formData.alternatePhone}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-xs text-gray-400">Compliance & Location</p>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm">GST: {formData.gstNumber}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-sm line-clamp-2">
                  {formData.address}, {formData.city}, {formData.state} -{" "}
                  {formData.pincode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-gray-400 text-sm">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Ready to take off
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 flex flex-col font-sans selection:bg-primary/30 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <div
          className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div className="absolute top-[40%] -left-[20%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center px-6 md:px-12 w-full max-w-7xl mx-auto">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all text-gray-500 hover:text-gray-900 shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex justify-center">
          {/* Steps Pills */}
          <div className="flex items-center gap-2">
            {/* Only show steps relevant to the user context? Or show all? Show all for completeness or conditionally */}
            {STEPS.map((step) => {
              if (token && step.id === 1) return null; // Skip Account step if logged in
              return (
                <div
                  key={step.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500 ease-out",
                    step.id <= currentStep
                      ? "bg-primary w-8 shadow-[0_0_10px_rgba(5,150,105,0.3)]"
                      : "bg-gray-200 w-2",
                  )}
                />
              );
            })}
          </div>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-6 pt-24 pb-40 relative z-10">
        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && renderPlanStep()}
              {currentStep === 1 && renderAccountStep()}
              {currentStep === 2 && renderIdentityStep()}
              {currentStep === 3 && renderIndustryStep()}
              {currentStep === 4 && renderDetailsStep()}
              {currentStep === 5 && renderReviewStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowOtpModal(false);
                setOtpModalCode("");
                setOtpModalError("");
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-[390px] bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden p-6 sm:p-7 relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpModalCode("");
                  setOtpModalError("");
                }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mt-1 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 shadow-sm text-emerald-600">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Enter Verification Code
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-[260px] leading-relaxed">
                  We've sent a 6-digit OTP code to verify your identity.
                </p>
              </div>

              {/* OTP Input Field */}
              <div className="mb-5">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="------"
                    maxLength={6}
                    value={otpModalCode}
                    onChange={(e) => {
                      setOtpModalCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setOtpModalError("");
                    }}
                    disabled={otpModalLoading}
                    className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50/80 text-center text-2xl font-bold font-mono tracking-[0.55em] text-slate-900 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-50"
                    autoFocus
                  />
                </div>
                {otpModalError && (
                  <p className="text-xs font-semibold text-rose-500 mt-2.5 text-center">
                    {otpModalError}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={verifyOtpModal}
                  disabled={otpModalCode.length !== 6 || otpModalLoading}
                  className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {otpModalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" /> Verify & Continue
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={sendBothOtps}
                  disabled={otpModalSending}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {otpModalSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending new code...
                    </>
                  ) : (
                    "Didn't receive the code? Resend OTP"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-white/90 backdrop-blur-sm z-40 border-t border-gray-100">
        <div className="max-w-md mx-auto">
          <ActionButton
            onClick={currentStep === 5 ? handleSubmit : handleNext}
            loading={isSubmitting}
          >
            {currentStep === 5 ? (
              <span className="flex items-center gap-2 justify-center">
                Launch Brand <Zap className="w-5 h-5 fill-current" />
              </span>
            ) : (
              "Continue"
            )}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default BrandRegistration;
