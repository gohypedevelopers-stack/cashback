"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from "@/lib/router";
import { scanQR } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getAuthToken, storePostLoginRedirect } from '../lib/auth';
import { captureClientLocation } from '../lib/location';

const QRScanPage = () => {
    const { hash } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('checking'); // checking, validating, error
    const normalizedHash = (() => {
        try {
            return decodeURIComponent(String(hash || '')).trim();
        } catch {
            return String(hash || '').trim();
        }
    })();

    useEffect(() => {
        const handleQRScan = async () => {
            if (!normalizedHash) {
                navigate('/scan/result', {
                    state: {
                        success: false,
                        error: 'Invalid QR code format'
                    }
                });
                return;
            }

            // Check if user is logged in
            const token = getAuthToken();
            if (!token) {
                // Redirect to wallet login with return URL
                const returnUrl = `/scan/${encodeURIComponent(normalizedHash)}`;
                storePostLoginRedirect(returnUrl);
                navigate(`/wallet`);
                return;
            }

            setStatus('validating');

            try {
                // Call backend to scan and redeem
                const locationPayload = await captureClientLocation();
                const response = await scanQR(normalizedHash, token, locationPayload);

                // Navigate to result page with success data
                navigate('/scan/result', {
                    state: {
                        success: true,
                        amount: response.amount,
                        campaign: response.campaign,
                        brand: response.brand,
                        walletBalance: response.walletBalance,
                        payoutTo: response.payoutTo
                    }
                });

            } catch (error) {
                if (error?.status === 401) {
                    const returnUrl = `/scan/${encodeURIComponent(normalizedHash)}`;
                    storePostLoginRedirect(returnUrl);
                    navigate(`/wallet`);
                    return;
                }
                // Navigate to result page with error
                navigate('/scan/result', {
                    state: {
                        success: false,
                        error: error.response?.data?.message || error.message || 'QR scan failed'
                    }
                });
            }
        };

        handleQRScan();
    }, [normalizedHash, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="text-center">
                <LoadingSpinner size="xl" />
                <p className="mt-4 text-lg font-medium text-gray-900">
                    {status === 'checking' ? 'Checking authentication...' : 'Validating QR code...'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                    Please wait while we process your scan
                </p>
            </div>
        </div>
    );
};

export default QRScanPage;
