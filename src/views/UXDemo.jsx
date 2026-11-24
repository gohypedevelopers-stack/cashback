"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Bell,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    Trash2,
    Save,
    Download,
    RefreshCw,
    Zap
} from 'lucide-react';
import { useToast } from '../components/ui/ToastContext';
import { Button, IconButton } from '../components/ui/Button';
import { LoadingSpinner, LoadingDots, LoadingPulse } from '../components/ui/LoadingSpinner';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonStats } from '../components/ui/Skeleton';
import { ConfirmModal, useConfirmModal } from '../components/ui/ConfirmModal';

export default function UXDemo() {
    const { success, error, warning, info } = useToast();
    const { confirm, ConfirmModal: ConfirmModalComponent } = useConfirmModal();
    const [isLoading, setIsLoading] = useState(false);
    const [showSkeletons, setShowSkeletons] = useState(false);

    const handleAsyncAction = async () => {
        setIsLoading(true);
        await new Promise(r => setTimeout(r, 2000));
        setIsLoading(false);
        success('Action Complete', 'The async operation finished successfully!');
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            type: 'danger',
            title: 'Delete Item?',
            message: 'This action cannot be undone. Are you sure you want to delete this item?',
            confirmText: 'Yes, Delete',
        });

        if (confirmed) {
            success('Deleted', 'Item has been deleted successfully.');
        } else {
            info('Cancelled', 'Delete action was cancelled.');
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        🎨 UX Components Demo
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Test all the UX enhancement components below
                    </p>
                </div>

                {/* Toast Notifications */}
                <section className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Bell size={24} className="text-primary" />
                        Toast Notifications
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Click the buttons below to trigger different toast notifications:
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="success"
                            icon={CheckCircle}
                            onClick={() => success('Success!', 'Your action was completed successfully.')}
                        >
                            Success Toast
                        </Button>
                        <Button
                            variant="danger"
                            icon={XCircle}
                            onClick={() => error('Error!', 'Something went wrong. Please try again.')}
                        >
                            Error Toast
                        </Button>
                        <Button
                            variant="secondary"
                            icon={AlertTriangle}
                            onClick={() => warning('Warning!', 'Please review your input before continuing.')}
                        >
                            Warning Toast
                        </Button>
                        <Button
                            variant="outline"
                            icon={Info}
                            onClick={() => info('Info', 'Here is some helpful information for you.')}
                        >
                            Info Toast
                        </Button>
                    </div>
                </section>

                {/* Buttons */}
                <section className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Zap size={24} className="text-primary" />
                        Enhanced Buttons
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Buttons with hover animations and loading states:
                    </p>

                    <div className="space-y-6">
                        {/* Button Variants */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                Variants
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary">Primary</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="danger">Danger</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="success">Success</Button>
                            </div>
                        </div>

                        {/* Button Sizes */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                Sizes
                            </h3>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button size="sm">Small</Button>
                                <Button size="md">Medium</Button>
                                <Button size="lg">Large</Button>
                                <Button size="xl">Extra Large</Button>
                            </div>
                        </div>

                        {/* With Icons */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                With Icons
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                <Button icon={Save}>Save</Button>
                                <Button icon={Download} iconPosition="right">Download</Button>
                                <IconButton icon={RefreshCw} tooltip="Refresh" />
                                <IconButton icon={Trash2} variant="danger" tooltip="Delete" />
                            </div>
                        </div>

                        {/* Loading State */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                Loading State
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                <Button loading={isLoading} onClick={handleAsyncAction}>
                                    {isLoading ? 'Processing...' : 'Click for Async Action'}
                                </Button>
                                <Button loading={true} variant="secondary">Always Loading</Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Confirmation Modal */}
                <section className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Trash2 size={24} className="text-primary" />
                        Confirmation Modal
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Click to trigger a confirmation dialog:
                    </p>
                    <Button variant="danger" icon={Trash2} onClick={handleDelete}>
                        Delete Something
                    </Button>
                </section>

                {/* Loading Spinners */}
                <section className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <RefreshCw size={24} className="text-primary" />
                        Loading Spinners
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="flex flex-col items-center gap-3">
                            <LoadingSpinner size="lg" color="var(--primary)" />
                            <span className="text-sm text-slate-500">Spinner</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <LoadingDots className="text-primary" />
                            <span className="text-sm text-slate-500">Dots</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <LoadingPulse />
                            <span className="text-sm text-slate-500">Pulse</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <LoadingSpinner size="sm" text="Loading..." />
                            <span className="text-sm text-slate-500">With Text</span>
                        </div>
                    </div>
                </section>

                {/* Skeleton Loaders */}
                <section className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        Skeleton Loaders
                    </h2>
                    <Button
                        variant="secondary"
                        className="mb-6"
                        onClick={() => setShowSkeletons(!showSkeletons)}
                    >
                        {showSkeletons ? 'Hide Skeletons' : 'Show Skeletons'}
                    </Button>

                    {showSkeletons && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                    Stats Skeleton
                                </h3>
                                <SkeletonStats count={4} />
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                    Card Skeletons
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SkeletonCard />
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                                    Table Skeleton
                                </h3>
                                <SkeletonTable rows={3} cols={5} />
                            </div>
                        </motion.div>
                    )}
                </section>

                {/* Instructions */}
                <section className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        📋 How to Use in Your Code
                    </h2>
                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-sm text-slate-100">
                            {`// Import the hook
import { useToast } from './components/ui';

// In your component
const { success, error, warning, info } = useToast();

// After an action
try {
  await saveData();
  success('Saved!', 'Your changes have been saved.');
} catch (err) {
  error('Error', err.message);
}`}
                        </pre>
                    </div>
                </section>
            </div>

            <ConfirmModalComponent />
        </div>
    );
}
