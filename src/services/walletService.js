const toAmount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }
    return Number(numeric.toFixed(2));
};

const toFixedNumber = (value) => Number(Number(value || 0).toFixed(2));

const createWalletError = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const getAvailableBalance = (wallet) => {
    const total = Number(wallet?.balance || 0);
    const locked = Number(wallet?.lockedBalance || 0);
    return Number((total - locked).toFixed(2));
};

const ensureVendorWallet = async (tx, vendorId) => {
    let wallet = await tx.wallet.findUnique({ where: { vendorId } });
    if (!wallet) {
        wallet = await tx.wallet.create({
            data: {
                vendorId,
                balance: 0.0,
                lockedBalance: 0.0,
                currency: 'INR'
            }
        });
    }
    return wallet;
};

const createTransaction = async (
    tx,
    {
        walletId,
        type,
        amount,
        category,
        status = 'success',
        description,
        referenceId,
        campaignBudgetId,
        invoiceId,
        qrId,
        metadata
    }
) => {
    return tx.transaction.create({
        data: {
            walletId,
            type,
            amount,
            category,
            status,
            description: description || null,
            referenceId: referenceId || null,
            campaignBudgetId: campaignBudgetId || null,
            invoiceId: invoiceId || null,
            qrId: qrId || null,
            metadata: metadata || null
        }
    });
};

const assertSufficientAvailable = (wallet, amount) => {
    const available = getAvailableBalance(wallet);
    if (available < amount) {
        throw createWalletError('Insufficient available wallet balance', 400);
    }
};

const assertSufficientLocked = (wallet, amount) => {
    const locked = Number(wallet?.lockedBalance || 0);
    if (locked < amount) {
        throw createWalletError('Insufficient locked wallet balance', 400);
    }
};

const creditAvailable = async (tx, vendorId, amount, refs = {}) => {
    const normalizedAmount = toAmount(amount);
    if (!normalizedAmount) {
        throw createWalletError('Amount must be greater than zero', 400);
    }

    const wallet = await ensureVendorWallet(tx, vendorId);
    const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
            balance: {
                increment: normalizedAmount
            }
        }
    });

    const transaction = await createTransaction(tx, {
        walletId: wallet.id,
        type: 'credit',
        amount: normalizedAmount,
        category: refs.category || 'recharge',
        description: refs.description || 'Wallet credited',
        referenceId: refs.referenceId,
        campaignBudgetId: refs.campaignBudgetId,
        invoiceId: refs.invoiceId,
        qrId: refs.qrId,
        metadata: refs.metadata
    });

    return { wallet: updatedWallet, transaction, amount: normalizedAmount };
};

const lock = async (tx, vendorId, amount, refs = {}) => {
    const normalizedAmount = toAmount(amount);
    if (!normalizedAmount) {
        throw createWalletError('Lock amount must be greater than zero', 400);
    }

    const wallet = await ensureVendorWallet(tx, vendorId);
    assertSufficientAvailable(wallet, normalizedAmount);

    const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
            lockedBalance: {
                increment: normalizedAmount
            }
        }
    });

    const transaction = await createTransaction(tx, {
        walletId: wallet.id,
        type: 'debit',
        amount: normalizedAmount,
        category: 'lock_funds',
        description: refs.description || 'Funds locked for campaign',
        referenceId: refs.referenceId,
        campaignBudgetId: refs.campaignBudgetId,
        invoiceId: refs.invoiceId,
        qrId: refs.qrId,
        metadata: refs.metadata
    });

    return { wallet: updatedWallet, transaction, amount: normalizedAmount };
};

const spendLocked = async (tx, vendorId, amount, refs = {}) => {
    const normalizedAmount = toAmount(amount);
    if (!normalizedAmount) {
        throw createWalletError('Spend amount must be greater than zero', 400);
    }

    const wallet = await ensureVendorWallet(tx, vendorId);
    assertSufficientLocked(wallet, normalizedAmount);

    if (Number(wallet.balance || 0) < normalizedAmount) {
        throw createWalletError('Wallet balance is lower than spend amount', 400);
    }

    const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
            balance: {
                decrement: normalizedAmount
            },
            lockedBalance: {
                decrement: normalizedAmount
            }
        }
    });

    const transaction = await createTransaction(tx, {
        walletId: wallet.id,
        type: 'debit',
        amount: normalizedAmount,
        category: 'locked_spend',
        description: refs.description || 'Locked funds spent on redemption',
        referenceId: refs.referenceId,
        campaignBudgetId: refs.campaignBudgetId,
        invoiceId: refs.invoiceId,
        qrId: refs.qrId,
        metadata: refs.metadata
    });

    return { wallet: updatedWallet, transaction, amount: normalizedAmount };
};

const unlockRefund = async (tx, vendorId, amount, refs = {}) => {
    const normalizedAmount = toAmount(amount);
    if (!normalizedAmount) {
        throw createWalletError('Refund amount must be greater than zero', 400);
    }

    const wallet = await ensureVendorWallet(tx, vendorId);
    assertSufficientLocked(wallet, normalizedAmount);

    const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
            lockedBalance: {
                decrement: normalizedAmount
            }
        }
    });

    const transaction = await createTransaction(tx, {
        walletId: wallet.id,
        type: 'credit',
        amount: normalizedAmount,
        category: 'unlock_refund',
        description: refs.description || 'Locked funds refunded to available balance',
        referenceId: refs.referenceId,
        campaignBudgetId: refs.campaignBudgetId,
        invoiceId: refs.invoiceId,
        qrId: refs.qrId,
        metadata: refs.metadata
    });

    return { wallet: updatedWallet, transaction, amount: normalizedAmount };
};

const chargeFee = async (tx, vendorId, amount, refs = {}) => {
    const normalizedAmount = toAmount(amount);
    if (!normalizedAmount) {
        throw createWalletError('Fee amount must be greater than zero', 400);
    }

    const wallet = await ensureVendorWallet(tx, vendorId);
    assertSufficientAvailable(wallet, normalizedAmount);

    const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
            balance: {
                decrement: normalizedAmount
            }
        }
    });

    const transaction = await createTransaction(tx, {
        walletId: wallet.id,
        type: 'debit',
        amount: normalizedAmount,
        category: refs.category || 'tech_fee_charge',
        description: refs.description || 'Technology fee charged',
        referenceId: refs.referenceId,
        campaignBudgetId: refs.campaignBudgetId,
        invoiceId: refs.invoiceId,
        qrId: refs.qrId,
        metadata: refs.metadata
    });

    return { wallet: updatedWallet, transaction, amount: normalizedAmount };
};

const getWalletSnapshot = (wallet) => {
    const totalBalance = toFixedNumber(wallet?.balance);
    const lockedBalance = toFixedNumber(wallet?.lockedBalance);
    const availableBalance = toFixedNumber(totalBalance - lockedBalance);

    return {
        totalBalance,
        lockedBalance,
        availableBalance
    };
};

module.exports = {
    toAmount,
    toFixedNumber,
    createWalletError,
    ensureVendorWallet,
    getAvailableBalance,
    getWalletSnapshot,
    creditAvailable,
    lock,
    spendLocked,
    unlockRefund,
    chargeFee
};
