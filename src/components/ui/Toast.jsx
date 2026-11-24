"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from './ToastContext';

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colors = {
    success: {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        border: 'border-emerald-500/30',
        icon: 'text-emerald-500',
        progress: 'bg-emerald-500',
    },
    error: {
        bg: 'bg-red-500/10 dark:bg-red-500/20',
        border: 'border-red-500/30',
        icon: 'text-red-500',
        progress: 'bg-red-500',
    },
    warning: {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        border: 'border-amber-500/30',
        icon: 'text-amber-500',
        progress: 'bg-amber-500',
    },
    info: {
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        border: 'border-blue-500/30',
        icon: 'text-blue-500',
        progress: 'bg-blue-500',
    },
};

function ToastItem({ toast, onDismiss }) {
    const [progress, setProgress] = useState(100);
    const Icon = icons[toast.type] || Info;
    const colorSet = colors[toast.type] || colors.info;

    useEffect(() => {
        if (toast.duration <= 0) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 50);

        return () => clearInterval(interval);
    }, [toast.duration]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`relative overflow-hidden rounded-xl border ${colorSet.border} ${colorSet.bg} backdrop-blur-xl shadow-lg min-w-[320px] max-w-[420px]`}
        >
            <div className="flex items-start gap-3 p-4">
                <div className={`flex-shrink-0 ${colorSet.icon}`}>
                    <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    {toast.title && (
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {toast.title}
                        </p>
                    )}
                    {toast.message && (
                        <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">
                            {toast.message}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => onDismiss(toast.id)}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-900/10 dark:hover:bg-white/10 transition-colors"
                >
                    <X size={16} className="text-slate-500" />
                </button>
            </div>

            {/* Progress bar */}
            {toast.duration > 0 && (
                <div className="h-1 w-full bg-slate-200/30 dark:bg-slate-700/30">
                    <motion.div
                        className={`h-full ${colorSet.progress}`}
                        initial={{ width: '100%' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                    />
                </div>
            )}
        </motion.div>
    );
}

export function ToastContainer() {
    const { toasts, dismissToast } = useToast();

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onDismiss={dismissToast} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}

export default ToastContainer;
