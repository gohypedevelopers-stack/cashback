"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from "@/lib/router";
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, RefreshCw, Wallet, Home as HomeIcon } from 'lucide-react';
import { getPayoutStatus } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const PayoutStatus = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [payout, setPayout] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayout();
        // Poll status every 5 seconds if pending/processing
        const interval = setInterval(() => {
            if (payout?.status === 'pending' || payout?.status === 'processing') {
                loadPayout();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [id, payout?.status]);

    const loadPayout = async () => {
        try {
            const response = await getPayoutStatus(id);
            setPayout(response.payout);
        } catch (error) {
            console.error('Failed to load payout:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner size="xl" />
            </div>
        );
    }

    if (!payout) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Payout not found</p>
                    <button
                        onClick={() => navigate('/wallet')}
                        className="px-6 py-2 bg-primary text-white rounded-lg"
                    >
                        Back to Wallet
                    </button>
                </div>
            </div>
        );
    }

    const getStatusConfig = () => {
        switch (payout.status) {
            case 'pending':
                return {
                    icon: Clock,
                    color: 'amber',
                    bg: 'from-amber-500 to-orange-600',
                    title: 'Request Pending',
                    message: 'Your payout request is being processed'
                };
            case 'processing':
                return {
                    icon: RefreshCw,
                    color: 'blue',
                    bg: 'from-blue-500 to-blue-600',
                    title: 'Processing Payment',
                    message: 'Transferring funds to your UPI'
                };
            case 'completed':
                return {
                    icon: CheckCircle2,
                    color: 'emerald',
                    bg: 'from-emerald-500 to-teal-600',
                    title: 'Payment Successful',
                    message: `₹${parseFloat(payout.amount).toFixed(2)} sent to your UPI`
                };
            case 'failed':
                return {
                    icon: XCircle,
                    color: 'red',
                    bg: 'from-red-500 to-orange-600',
                    title: 'Payment Failed',
                    message: payout.rejectionReason || 'Transfer failed. Balance refunded.'
                };
            default:
                return {
                    icon: Clock,
                    color: 'gray',
                    bg: 'from-gray-500 to-gray-600',
                    title: 'Unknown Status',
                    message: 'Please contact support'
                };
        }
    };

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Status Header */}
                <div className={`bg-gradient-to-br ${statusConfig.bg} p-8 text-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' }}
                        className={`inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 relative z-10 ${payout.status === 'processing' ? 'animate-spin-slow' : ''
                            }`}
                    >
                        <StatusIcon className={`w-12 h-12 text-${statusConfig.color}-500`} />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white mb-2 relative z-10">{statusConfig.title}</h1>
                    <p className="text-white/90 relative z-10">{statusConfig.message}</p>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Amount</span>
                            <span className="font-bold text-gray-900">₹{parseFloat(payout.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">UPI ID</span>
                            <span className="font-semibold text-gray-900">{payout.payoutMethod}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Request Date</span>
                            <span className="text-gray-900">
                                {new Date(payout.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                        {payout.referenceId && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Reference ID</span>
                                <span className="text-xs text-gray-900 font-mono">{payout.referenceId}</span>
                            </div>
                        )}
                        {payout.adminNote && (
                            <div className="pt-2 border-t">
                                <p className="text-sm text-gray-600 mb-1">Admin Note</p>
                                <p className="text-sm text-gray-900">{payout.adminNote}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => navigate('/wallet')}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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

                    {payout.status === 'failed' && (
                        <button
                            onClick={() => navigate('/wallet/redeem')}
                            className="w-full mt-2 py-3 bg-amber-100 text-amber-900 rounded-xl font-semibold border border-amber-300"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default PayoutStatus;
