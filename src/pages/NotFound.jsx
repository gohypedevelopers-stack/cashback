import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const navigate = useNavigate();

  // The server answers every unknown URL with 200 (SPA fallback), so tell crawlers not to index it.
  useEffect(() => {
    document.title = "Page Not Found | Assured Rewards";
    const robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    robots.setAttribute("content", "noindex, follow");
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px] opacity-60 dark:opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] opacity-60 dark:opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 max-w-md w-full text-center space-y-8"
      >
        <div className="space-y-4">
          <motion.h1 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            className="text-[120px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 select-none"
          >
            404
          </motion.h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Page Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            Oops! The page you're looking for seems to have vanished into thin air.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Home size={18} />
            Home Page
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
