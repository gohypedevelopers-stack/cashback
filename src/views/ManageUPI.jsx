"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from "@/lib/router";
import { motion } from 'framer-motion';
import { Plus, Trash2, Check } from 'lucide-react';
import { getPayoutMethods, addUPIMethod, setPrimaryUPI, deleteUPIMethod } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/ToastContext';

const ManageUPI = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [payoutMethods, setPayoutMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUPI, setNewUPI] = useState('');
    const [setAsPrimary, setSetAsPrimary] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadMethods();
    }, []);

    const loadMethods = async () => {
        try {
            const response = await getPayoutMethods();
            setPayoutMethods(response.payoutMethods || []);
        } catch (error) {
            console.error('Failed to load payout methods:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUPI = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await addUPIMethod(newUPI, setAsPrimary);
            showToast('success', 'UPI ID added successfully');
            setNewUPI('');
            setSetAsPrimary(false);
            setShowAddModal(false);
            loadMethods();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Failed to add UPI ID');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSetPrimary = async (methodId) => {
        try {
            await setPrimaryUPI(methodId);
            showToast('success', 'Primary UPI updated');
            loadMethods();
        } catch (error) {
            showToast('error', 'Failed to update primary UPI');
        }
    };

    const handleDelete = async (methodId) => {
        if (!confirm('Are you sure you want to delete this UPI ID?')) return;

        try {
            await deleteUPIMethod(methodId);
            showToast('success', 'UPI ID deleted');
            loadMethods();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Failed to delete UPI ID');
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
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/profile')}
                        className="text-gray-600 mb-4"
                    >
                        ← Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Manage UPI IDs</h1>
                    <p className="text-gray-600 mt-1">Add or remove UPI IDs for payouts</p>
                </div>

                {/* UPI List */}
                <div className="space-y-3 mb-6">
                    {payoutMethods.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-md border">
                            <p className="text-gray-600 mb-4">No UPI IDs saved yet</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold"
                            >
                                Add Your First UPI
                            </button>
                        </div>
                    ) : (
                        payoutMethods.map((method) => (
                            <motion.div
                                key={method.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl p-5 shadow-md border relative"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-lg font-bold text-gray-900">{method.value}</p>
                                        {method.isPrimary && (
                                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                                                <Check className="w-3 h-3" />
                                                Primary
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!method.isPrimary && (
                                            <button
                                                onClick={() => handleSetPrimary(method.id)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-100"
                                            >
                                                Set Primary
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(method.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Add Button */}
                {payoutMethods.length > 0 && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-dashed border-blue-300 text-blue-600 font-semibold rounded-2xl hover:bg-blue-50 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add New UPI
                    </button>
                )}
            </div>

            {/* Add UPI Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
                    >
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add UPI ID</h2>
                        <form onSubmit={handleAddUPI} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    UPI ID
                                </label>
                                <input
                                    type="text"
                                    value={newUPI}
                                    onChange={(e) => setNewUPI(e.target.value)}
                                    placeholder="example@upi"
                                    pattern="[a-zA-Z0-9._-]+@[a-zA-Z]+"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={setAsPrimary}
                                    onChange={(e) => setSetAsPrimary(e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded"
                                />
                                <span className="text-gray-700 font-medium">Set as primary UPI</span>
                            </label>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewUPI('');
                                        setSetAsPrimary(false);
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
                                >
                                    {submitting ? 'Adding...' : 'Add UPI'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ManageUPI;
