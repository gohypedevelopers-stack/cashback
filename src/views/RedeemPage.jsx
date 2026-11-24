"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from "@/lib/router";
import { motion } from 'framer-motion';
import { IndianRupee, AlertCircle } from 'lucide-react';
import { requestPayout, getPayoutMethods, getWalletOverview } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/ToastContext';

const RedeemPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [amount, setAmount] = useState('');
    const [payoutMethods, setPayoutMethods] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const MIN_PAYOUT = 10;
    const DAILY_LIMIT = 5000;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [walletData, methodsData] = await Promise.all([
                getWalletOverview(),
                getPayoutMethods()
            ]);
            setWalletBalance(walletData.wallet.availableBalance);
            setPayoutMethods(methodsData.payoutMethods || []);

            // Auto-select primary method
            const primary = methodsData.payoutMethods?.find(m => m.isPrimary);
            if (primary) setSelectedMethod(primary.id);
        } catch (error) {
            console.error('Failed to load data:', error);
            showToast('error', 'Failed to load payout methods');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amountNum = parseFloat(amount);

        // Validations
        if (!selectedMethod) {
            showToast('error', 'Please select a UPI ID');
            return;
        }

        if (isNaN(amountNum) || amountNum < MIN_PAYOUT) {
            showToast('error', `Minimum payout amount is ₹${MIN_PAYOUT}`);
            return;
        }

        if (amountNum > walletBalance) {
            showToast('error', 'Insufficient balance');
            return;
        }

        if (amountNum > DAILY_LIMIT) {
            showToast('error', `Daily limit is ₹${DAILY_LIMIT}`);
            return;
        }

        setSubmitting(true);
        try {
            const response = await requestPayout(amountNum, selectedMethod);
            showToast('success', 'Payout request submitted successfully');
            navigate(`/payout/${response.withdrawal.id}`);
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Payout request failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner size="xl" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto"
            >
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/wallet')}
                        className="text-gray-600 mb-4"
                    >
                        ← Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Redeem to UPI</h1>
                    <p className="text-gray-600 mt-1">Transfer your earnings instantly</p>
                </div>

                {/* Balance Card */}
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                    <p className="text-3xl font-bold text-gray-900">₹{parseFloat(walletBalance).toFixed(2)}</p>
                </div>

                {/* Redeem Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Amount Input */}
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter Amount
                        </label>
                        <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                            <IndianRupee className="w-5 h-5 text-gray-500 mr-2" />
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                className="flex-1 text-2xl font-semibold outline-none"
                                required
                            />
                        </div>
                        <div className="flex items-center justify-between mt-3 text-sm">
                            <span className="text-gray-600">Min: ₹{MIN_PAYOUT}</span>
                            <span className="text-gray-600">Daily limit: ₹{DAILY_LIMIT}</span>
                        </div>
                    </div>

                    {/* UPI Selection */}
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select UPI ID
                        </label>
                        {payoutMethods.length === 0 ? (
                            <div className="text-center py-4">
                                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                                <p className="text-gray-600 mb-3">No UPI ID saved</p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile/upi')}
                                    className="text-blue-600 font-semibold"
                                >
                                    Add UPI ID
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {payoutMethods.map((method) => (
                                    <label
                                        key={method.id}
                                        className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedMethod === method.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="upi"
                                                value={method.id}
                                                checked={selectedMethod === method.id}
                                                onChange={(e) => setSelectedMethod(e.target.value)}
                                                className="w-5 h-5 text-blue-600"
                                            />
                                            <div>
                                                <p className="font-semibold text-gray-900">{method.value}</p>
                                                {method.isPrimary && (
                                                    <span className="text-xs text-blue-600 font-medium">Primary</span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile/upi')}
                                    className="w-full py-3 text-blue-600 font-semibold border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
                                >
                                    + Add New UPI
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || payoutMethods.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {submitting ? 'Processing...' : 'Request Payout'}
                    </button>
                </form>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-900">
                        <strong>Note:</strong> Payouts are processed instantly and will be credited to your UPI within minutes.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default RedeemPage;
