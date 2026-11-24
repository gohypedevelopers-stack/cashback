"use client";

import React, { useEffect } from "react";
import { Star, ChevronLeft, Gift, Lock, Trophy } from "lucide-react";
import { useNavigate } from "@/lib/router";

const LevelRewards = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const levels = [
    {
      id: 1,
      name: "Bronze",
      points: "0-500",
      color: "from-amber-600 to-amber-400",
      locked: false,
      current: true,
    },
    {
      id: 2,
      name: "Silver",
      points: "501-2000",
      color: "from-slate-400 to-slate-300",
      locked: true,
      current: false,
    },
    {
      id: 3,
      name: "Gold",
      points: "2001-5000",
      color: "from-yellow-500 to-yellow-300",
      locked: true,
      current: false,
    },
    {
      id: 4,
      name: "Platinum",
      points: "5000+",
      color: "from-cyan-500 to-cyan-300",
      locked: true,
      current: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300 font-admin-body">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Level Rewards
          </h1>
        </div>

        {/* Current Level Card */}
        <div className="bg-gradient-to-r from-primary to-primary-strong rounded-3xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">
                Current Level
              </p>
              <h2 className="text-3xl font-bold">Bronze</h2>
              <p className="text-sm text-white/90 mt-2">
                150 / 500 Points to Silver
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Star size={32} className="text-white fill-white" />
            </div>
          </div>
          {/* Progress Bar */}
          <div className="relative z-10 mt-6 h-2 bg-black/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full w-[30%]" />
          </div>
        </div>

        {/* Levels List */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-2">
            All Levels
          </h3>
          {levels.map((level) => (
            <div
              key={level.id}
              className={`bg-white dark:bg-zinc-900 rounded-3xl p-5 border ${level.current ? "border-primary dark:border-primary shadow-md" : "border-gray-100 dark:border-zinc-800 shadow-sm"} flex items-center gap-4 relative overflow-hidden`}
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center shrink-0 shadow-inner`}
              >
                {level.locked ? (
                  <Lock size={24} className="text-white/80" />
                ) : (
                  <Trophy size={24} className="text-white/90" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {level.name}
                  </h4>
                  {level.current && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {level.points} Points
                </p>
              </div>
              <Gift
                size={20}
                className={
                  level.current
                    ? "text-primary"
                    : "text-gray-300 dark:text-zinc-700"
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelRewards;
