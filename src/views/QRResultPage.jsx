"use client";

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from "@/lib/router";
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Wallet, Home as HomeIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

const QRResultPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const resultData = location.state;

    // Handle missing state (direct navigation)
    if (!resultData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-gray-600">No scan data found</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 px-6 py-2 bg-primary text-white rounded-lg"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const { success, amount, campaign, brand, walletBalance, payoutTo, error } = resultData;

    // Trigger confetti on success
    useEffect(() => {
        if (success) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }, [success]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                {success ? (
                    <>
                        {/* Success Header */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring' }}
                                className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 relative z-10"
                            >
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-white mb-2 relative z-10">Success!</h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl font-extrabold text-white relative z-10"
                            >
                                ₹{parseFloat(amount).toFixed(2)}
                            </motion.p>
                            <p className="text-white/90 mt-2 relative z-10">credited to your wallet</p>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-4">
                            {/* Brand */}
                            {brand && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Brand</span>
                                    <span className="font-semibold text-gray-900">{brand}</span>
                                </div>
                            )}

                            {/* Campaign */}
                            {campaign && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Campaign</span>
                                    <span className="font-semibold text-gray-900 text-right">{campaign}</span>
                                </div>
                            )}

                            {/* Payout Method */}
                            {payoutTo && (
                                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <span className="text-sm text-emerald-700">Paid to</span>
                                    <span className="font-semibold text-emerald-900">{payoutTo}</span>
                                </div>
                            )}

                            {/* Wallet Balance */}
                            {walletBalance !== undefined && (
                                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm text-blue-700">Wallet Balance</span>
                                    </div>
                                    <span className="font-bold text-blue-900">₹{parseFloat(walletBalance).toFixed(2)}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button
                                    onClick={() => navigate('/wallet')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                >
                                    <Wallet className="w-4 h-4" />
                                    View Wallet
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                                >
                                    <HomeIcon className="w-4 h-4" />
                                    Home
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Failure Header */}
                        <div className="bg-gradient-to-br from-red-500 to-orange-600 p-8 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring' }}
                                className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 relative z-10"
                            >
                                <XCircle className="w-12 h-12 text-red-500" />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-white mb-2 relative z-10">Oops!</h1>
                            <p className="text-white/90 text-lg relative z-10">Something went wrong</p>
                        </div>

                        {/* Error Message */}
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-800 font-medium text-center">{error}</p>
                            </div>

                            <p className="text-sm text-gray-600 text-center">
                                Common issues: QR already redeemed, campaign expired, or QR invalid.
                            </p>

                            <button
                                onClick={() => navigate('/')}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                <HomeIcon className="w-5 h-5" />
                                Back to Home
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default QRResultPage;
