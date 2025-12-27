const prisma = require('../config/prismaClient');

// --- Payout Methods (UPI) ---

exports.addPayoutMethod = async (req, res) => {
    try {
        const { type, value } = req.body;
        const userId = req.user.id; // User or Vendor (via User ID)

        if (type !== 'upi') {
            return res.status(400).json({ message: 'Only UPI is supported currently' });
        }

        // Check if primary exists
        const existingPrimary = await prisma.payoutMethod.findFirst({
            where: { userId, isPrimary: true }
        });

        const method = await prisma.payoutMethod.create({
            data: {
                userId,
                type,
                value,
                isPrimary: !existingPrimary // Auto-set primary if first one
            }
        });

        res.status(201).json({ message: 'Payout method added', method });
    } catch (error) {
        res.status(500).json({ message: 'Error adding payout method', error: error.message });
    }
};

exports.getPayoutMethods = async (req, res) => {
    try {
        const methods = await prisma.payoutMethod.findMany({
            where: { userId: req.user.id }
        });
        res.json(methods);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching methods', error: error.message });
    }
};

// --- Withdrawals ---

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, payoutMethodId } = req.body;
        const userId = req.user.id;

        // 1. Get Wallet
        // Try finding wallet as Vendor first, then User (customer cashback)
        let wallet = await prisma.wallet.findUnique({ where: { vendorId: undefined, userId } });

        // If not found directly by userId (Customer), check if they are a Vendor
        if (!wallet) {
            const vendor = await prisma.vendor.findUnique({ where: { userId } });
            if (vendor) {
                wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor.id } });
            }
        }

        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        // 2. Validate Amount
        if (parseFloat(amount) <= 0) return res.status(400).json({ message: 'Invalid amount' });
        if (parseFloat(wallet.balance) < parseFloat(amount)) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // 3. Handle Payout Method (Method ID or Direct UPI)
        let methodId = null;
        const { upiId } = req.body;

        if (upiId) {
            // "Easy and Simple" flow: User types UPI ID directly.
            // Check if exists or create new
            let method = await prisma.payoutMethod.findFirst({
                where: { userId, type: 'upi', value: upiId }
            });

            if (!method) {
                // Auto-save for future? Or just one-time?
                // Saving it makes sense for history.
                method = await prisma.payoutMethod.create({
                    data: {
                        userId,
                        type: 'upi',
                        value: upiId,
                        isPrimary: true // Make this primary as it's the latest
                    }
                });
            }
            methodId = method.id;
        } else if (payoutMethodId) {
            // Traditional flow: Select saved method
            const method = await prisma.payoutMethod.findUnique({ where: { id: payoutMethodId } });
            if (!method || method.userId !== userId) {
                return res.status(400).json({ message: 'Invalid payout method' });
            }
            methodId = method.id;
        } else {
            return res.status(400).json({ message: 'Please provide upiId or payoutMethodId' });
        }

        // Fetch method details for description
        const methodObj = await prisma.payoutMethod.findUnique({ where: { id: methodId } });

        // 4. Create Withdrawal Request Transactionally
        const withdrawal = await prisma.$transaction(async (tx) => {
            // Deduct Balance & Move to Locked? 
            // Or just deduct and log?
            // Usually, we deduct immediately to prevent double spend.

            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: parseFloat(amount) } }
            });

            // Create Transaction Log
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount: parseFloat(amount),
                    category: 'withdrawal',
                    status: 'pending', // Pending Admin Approval
                    description: `Withdrawal request to ${methodObj.value}`
                }
            });

            // Create Withdrawal Record
            return await tx.withdrawal.create({
                data: {
                    walletId: wallet.id,
                    amount: parseFloat(amount),
                    status: 'pending',
                    payoutMethodId: methodId
                }
            });
        });

        res.status(201).json({ message: 'Withdrawal requested successfully', withdrawal });

    } catch (error) {
        res.status(500).json({ message: 'Withdrawal request failed', error: error.message });
    }
};

exports.getWithdrawalHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find Wallet (same logic as above)
        let wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            const vendor = await prisma.vendor.findUnique({ where: { userId } });
            if (vendor) {
                wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor.id } });
            }
        }

        if (!wallet) return res.json([]); // No wallet, no history

        const history = await prisma.withdrawal.findMany({
            where: { walletId: wallet.id },
            include: { PayoutMethod: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history', error: error.message });
    }
};
