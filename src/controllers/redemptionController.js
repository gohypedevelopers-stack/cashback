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

            // Find or Create User Wallet
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                wallet = await tx.wallet.create({
                    data: {
                        userId,
                        balance: 0.00
                    }
                });
            }

            // Credit Wallet
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { increment: cashbackAmount }
                }
            });

            // Record Transaction
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

            // Update QR Status
            await tx.qRCode.update({
                where: { id: qr.id },
                data: {
                    status: 'redeemed',
                    redeemedByUserId: userId,
                    redeemedAt: now,
                    payoutTransactionId: `WALLET_${wallet.id}_${Date.now()}`
                }
            });

            return {
                amount: cashbackAmount,
                newBalance: updatedWallet.balance,
                campaign: qr.Campaign
            };
        });

        res.json({
            success: true,
            message: 'Cashback added to wallet successfully',
            amount: result.amount,
            newBalance: result.newBalance
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
