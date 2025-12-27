const prisma = require('../config/prismaClient');

exports.scanAndRedeem = async (req, res) => {
    try {
        const { hash } = req.params;
        const userId = req.user.id; // From Auth Middleware

        // Start Transaction
        const result = await prisma.$transaction(async (tx) => {
            const qr = await tx.qRCode.findUnique({
                where: { uniqueHash: hash },
                include: {
                    Campaign: {
                        include: { Brand: true }
                    }
                }
            });

            if (!qr) throw new Error('Invalid QR Code');
            if (qr.status === 'redeemed') throw new Error('QR Code already redeemed');
            if (qr.status !== 'generated' && qr.status !== 'assigned') throw new Error('QR Code not active');

            // Check Campaign Validity
            const now = new Date();
            if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
                throw new Error('Campaign expired or not started');
            }

            const cashbackAmount = parseFloat(qr.Campaign.cashbackAmount);

            // 1. Find User Wallet
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                wallet = await tx.wallet.create({ data: { userId, balance: 0.00 } });
            }

            // 2. Check for Linked UPI (Payout Method)
            const upiMethod = await tx.payoutMethod.findFirst({
                where: { userId, type: 'upi', isPrimary: true }
            });

            if (!upiMethod) {
                throw new Error('Please link your UPI ID first to receive instant cashback');
            }

            // 3. Credit Wallet (Ledger Entry)
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: cashbackAmount } }
            });
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'credit',
                    amount: cashbackAmount,
                    category: 'cashback_payout',
                    status: 'success',
                    description: `Cashback for Campaign: ${qr.Campaign.title}`,
                    referenceId: hash
                }
            });

            // 4. Auto-Debit (Instant Payout)
            // In a real system, we would call Razorpay X / Cashfree here.
            // If API fails, we would revert or leave balance in wallet.
            // Here we assume "Real Time" success.

            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: cashbackAmount } }
            });

            const payoutTx = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount: cashbackAmount,
                    category: 'withdrawal',
                    status: 'success', // Instantly Successful
                    description: `Instant Payout to UPI: ${upiMethod.value}`,
                    referenceId: `BANK_REF_${Date.now()}` // Mock Bank Ref
                }
            });

            // Update QR Status
            await tx.qRCode.update({
                where: { id: qr.id },
                data: {
                    status: 'redeemed',
                    redeemedByUserId: userId,
                    redeemedAt: now,
                    payoutTransactionId: payoutTx.id
                }
            });

            return {
                amount: cashbackAmount,
                payoutTo: upiMethod.value,
                campaign: qr.Campaign
            };
        });

        res.json({
            success: true,
            message: `Cashback of ₹${result.amount} sent instantly to ${result.payoutTo}`,
            amount: result.amount
        });

    } catch (error) {
        res.status(500).json({ message: 'Redemption failed', error: error.message });
    }
};

exports.verifyQR = async (req, res) => {
    try {
        const { hash } = req.params;
        const qr = await prisma.qRCode.findUnique({
            where: { uniqueHash: hash },
            include: {
                Campaign: {
                    include: { Brand: true }
                }
            }
        });

        if (!qr) return res.status(404).json({ message: 'Invalid QR Code' });

        if (qr.status === 'redeemed') {
            return res.status(400).json({ message: 'QR Code already redeemed', qr });
        }

        if (qr.status !== 'generated' && qr.status !== 'assigned') {
            return res.status(400).json({ message: 'QR Code not active', status: qr.status });
        }

        // Check Campaign Validity
        const now = new Date();
        if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
            return res.status(400).json({ message: 'Campaign expired or not started' });
        }

        res.json({
            valid: true,
            amount: qr.Campaign.cashbackAmount,
            brand: qr.Campaign.Brand.name,
            campaign: qr.Campaign.title
        });

    } catch (error) {
        res.status(500).json({ message: 'Error verifying QR', error: error.message });
    }
};
