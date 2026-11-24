import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "@/lib/router";

const Button = ({
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline:
      "border border-input hover:bg-emerald-50 hover:text-emerald-700 text-emerald-600",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary",
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-12 px-8 rounded-md text-lg",
    icon: "h-10 w-10",
  };

  const variantStyles = variants[variant] || variants.default;
  const sizeStyles = sizes[size] || sizes.default;

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const VendorNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const logoSrc = "/logo.png";
  const APP_NAME = "Assured Rewards";

  const isLandingPage =
    location.pathname === "/vendor" || location.pathname === "/vendor-landing";

  const scrollToSection = (sectionId) => {
    setIsMobileMenuOpen(false);
    if (isLandingPage) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      // Update hash without jump
      window.history.pushState(null, null, `#${sectionId}`);
    } else {
      navigate(`/vendor#${sectionId}`);
    }
  };

  const handleNavigate = (path) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <nav className="border-b border-gray-100 bg-white/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div
          className="flex min-w-0 items-center cursor-pointer"
          onClick={() => handleNavigate("/vendor")}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img
              src={logoSrc}
              alt={APP_NAME}
              className="h-9 sm:h-10 w-auto object-contain shrink-0"
            />
            <span className="truncate text-[17px] sm:text-xl font-extrabold text-slate-900 tracking-tighter font-admin-heading">
              Assured<span className="text-emerald-600">Rewards</span>
            </span>

          </div>
        </div>

        <div className="hidden md:flex items-center gap-9 text-[14px] font-semibold text-slate-600/90">
          <button
            onClick={() => scrollToSection("solutions")}
            className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            Solutions
          </button>
          <button
            onClick={() => scrollToSection("features")}
            className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection("resources")}
            className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            Resources
          </button>
          <button
            onClick={() => handleNavigate("/brand-registration")}
            className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            Register
          </button>
        </div>



        <div className="hidden sm:flex items-center gap-6">
          <button 
            onClick={() => handleNavigate("/vendor-dashboard")}
            className="text-[15px] font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
          >
            Login
          </button>
          <Button
            className="!bg-slate-900 !text-white !rounded-full !px-6 !py-2 !h-10 !text-sm !font-semibold hover:!bg-black shadow-lg shadow-slate-900/10 transition-all hover:scale-105 active:scale-95"
            onClick={() => handleNavigate("/brand-registration")}
          >
            Get Started
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex sm:hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-4 shadow-lg shadow-slate-900/5">
          <div className="flex flex-col gap-1 text-[15px] font-semibold text-slate-700">
            <button
              onClick={() => scrollToSection("solutions")}
              className="rounded-lg px-3 py-3 text-left hover:bg-emerald-50 hover:text-emerald-700"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="rounded-lg px-3 py-3 text-left hover:bg-emerald-50 hover:text-emerald-700"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("resources")}
              className="rounded-lg px-3 py-3 text-left hover:bg-emerald-50 hover:text-emerald-700"
            >
              Resources
            </button>
            <button
              onClick={() => handleNavigate("/brand-registration")}
              className="rounded-lg px-3 py-3 text-left hover:bg-emerald-50 hover:text-emerald-700"
            >
              Register
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="!h-11 !rounded-full !border-slate-200 !text-slate-700 hover:!bg-slate-50"
              onClick={() => handleNavigate("/vendor-dashboard")}
            >
              Login
            </Button>
            <Button
              className="!h-11 !rounded-full !bg-slate-900 !text-white hover:!bg-black"
              onClick={() => handleNavigate("/brand-registration")}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default VendorNavbar;
