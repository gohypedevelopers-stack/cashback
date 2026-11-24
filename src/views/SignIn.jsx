"use client";

import React from "react";
import { useNavigate } from "@/lib/router";
import { storeAuthToken, popPostLoginRedirect, useAuth } from "../lib/auth";
import WalletAuth from "../components/wallet/WalletAuth";

const SignIn = () => {
  const navigate = useNavigate();
  const { authToken: token } = useAuth();

  const handleLoginSuccess = (newToken) => {
    storeAuthToken(newToken);
  };

  React.useEffect(() => {
    if (token) {
      const redirectTarget = popPostLoginRedirect();
      if (redirectTarget) {
        navigate(redirectTarget);
      } else {
        navigate("/");
      }
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-4 flex items-center justify-center transition-colors duration-300">
      <WalletAuth onLoginSuccess={handleLoginSuccess} initialMode="login" />
    </div>
  );
};

export default SignIn;
