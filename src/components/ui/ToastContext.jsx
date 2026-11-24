"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const toast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
        const id = ++toastId;

        setToasts((prev) => [...prev, { id, type, title, message, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Convenience methods
    const success = useCallback((title, message) => toast({ type: 'success', title, message }), [toast]);
    const error = useCallback((title, message) => toast({ type: 'error', title, message, duration: 6000 }), [toast]);
    const warning = useCallback((title, message) => toast({ type: 'warning', title, message }), [toast]);
    const info = useCallback((title, message) => toast({ type: 'info', title, message }), [toast]);

    const value = {
        toasts,
        toast,
        dismissToast,
        success,
        error,
        warning,
        info,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
