const prisma = require('../config/prismaClient');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { parsePagination } = require('../utils/pagination');
const { safeLogVendorActivity } = require('../utils/vendorActivityLogger');
const {
    ensureVendorWallet,
    creditAvailable,
    lock,
    chargeFee,
    getWalletSnapshot,
    unlockRefund
} = require('../services/walletService');
const {
    allocateInventoryQrs,
    importInventorySeries,
    normalizeSeriesCode,
    seedVendorInventory
} = require('../services/qrInventoryService');
const { createInvoice, renderInvoiceToBuffer, withShareToken } = require('../services/invoiceService');

const DEFAULT_VENDOR_QR_INVENTORY = Number(process.env.DEFAULT_VENDOR_QR_INVENTORY || 0);
const AUTO_SEED_VENDOR_QR_INVENTORY =
    String(process.env.AUTO_SEED_VENDOR_QR_INVENTORY || 'false').toLowerCase() === 'true';
const DEFAULT_VENDOR_QR_SERIES_CODES = String(
    process.env.DEFAULT_VENDOR_QR_SERIES_CODES || 'A,B,C,D,E,F,G,H,I,J'
)
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
const DEFAULT_VENDOR_QR_SERIES_SIZE = Number(process.env.DEFAULT_VENDOR_QR_SERIES_SIZE || 100);
const INVOICE_GST_RATE = Number(process.env.INVOICE_GST_RATE || 0.18);
const LEGACY_BILLABLE_CATEGORIES = [
    'campaign_payment',
    'qr_purchase',
    'tech_fee_charge',
    'voucher_fee_charge',
    'lock_funds',
    'unlock_refund',
    'refund',
    'recharge'
];

// Helper to generate unique hash
const generateQRHash = () => {
    return crypto.randomBytes(32).toString('hex');
};

const resolveTechFeePerQr = ({ vendor, brand }) => {
    const vendorTechFee = Number(vendor?.techFeePerQr);
    if (Number.isFinite(vendorTechFee) && vendorTechFee > 0) return vendorTechFee;

    const legacyQrPrice = Number(brand?.qrPricePerUnit);
    if (Number.isFinite(legacyQrPrice) && legacyQrPrice > 0) return legacyQrPrice;

    return 1;
};

const LEGACY_LOCKABLE_QR_STATUSES = ['generated', 'active', 'assigned', 'funded', 'redeemed'];
const LEGACY_OUTSTANDING_QR_STATUSES = new Set(['generated', 'active', 'assigned', 'funded']);

const backfillLegacyLockedBudgets = async (tx, vendorId) => {
    const orphanCount = await tx.qRCode.count({
        where: {
            vendorId,
            campaignId: { not: null },
            campaignBudgetId: null,
            status: { in: LEGACY_LOCKABLE_QR_STATUSES }
        }
    });

    if (!orphanCount) {
        return {
            migrated: false,
            lockedAdded: 0,
            linkedQrs: 0
        };
    }

    const grouped = await tx.qRCode.groupBy({
        by: ['campaignId', 'status'],
        where: {
            vendorId,
            campaignId: { not: null },
            campaignBudgetId: null,
            status: { in: LEGACY_LOCKABLE_QR_STATUSES }
        },
        _sum: { cashbackAmount: true },
        _count: { _all: true }
    });

    const campaignMap = new Map();
    grouped.forEach((row) => {
        const campaignId = row.campaignId;
        if (!campaignId) return;

        const current = campaignMap.get(campaignId) || {
            totalAmount: 0,
            remainingAmount: 0,
            spentAmount: 0,
            count: 0
        };

        const amount = Number(row?._sum?.cashbackAmount || 0);
        current.totalAmount += amount;
        current.count += Number(row?._count?._all || 0);

        if (LEGACY_OUTSTANDING_QR_STATUSES.has(String(row.status))) {
            current.remainingAmount += amount;
        } else {
            current.spentAmount += amount;
        }

        campaignMap.set(campaignId, current);
    });

    let lockedAdded = 0;
    let linkedQrs = 0;
    const campaignRefs = [];

    for (const [campaignId, summary] of campaignMap.entries()) {
        if (summary.totalAmount <= 0) {
            continue;
        }

        let campaignBudget = await tx.campaignBudget.findFirst({
            where: {
                vendorId,
                campaignId,
                status: 'active'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (campaignBudget) {
            campaignBudget = await tx.campaignBudget.update({
                where: { id: campaignBudget.id },
                data: {
                    initialLockedAmount: { increment: summary.totalAmount },
                    lockedAmount: { increment: summary.remainingAmount },
                    spentAmount: { increment: summary.spentAmount },
                    status: summary.remainingAmount > 0 ? 'active' : campaignBudget.status
                }
            });
        } else {
            campaignBudget = await tx.campaignBudget.create({
                data: {
                    campaignId,
                    vendorId,
                    initialLockedAmount: summary.totalAmount,
                    lockedAmount: summary.remainingAmount,
                    spentAmount: summary.spentAmount,
                    refundedAmount: 0,
                    status: summary.remainingAmount > 0 ? 'active' : 'closed'
                }
            });
        }

        const linked = await tx.qRCode.updateMany({
            where: {
                vendorId,
                campaignId,
                campaignBudgetId: null,
                status: { in: LEGACY_LOCKABLE_QR_STATUSES }
            },
            data: {
                campaignBudgetId: campaignBudget.id
            }
        });

        linkedQrs += Number(linked?.count || 0);
        lockedAdded += summary.remainingAmount;
        campaignRefs.push({
            campaignId,
            campaignBudgetId: campaignBudget.id,
            remainingAmount: Number(summary.remainingAmount.toFixed(2))
        });
    }

    if (lockedAdded > 0) {
        const wallet = await ensureVendorWallet(tx, vendorId);
        await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { increment: lockedAdded },
                lockedBalance: { increment: lockedAdded }
            }
        });

        await tx.transaction.create({
            data: {
                walletId: wallet.id,
                type: 'debit',
                amount: Number(lockedAdded.toFixed(2)),
                category: 'lock_funds',
                status: 'success',
                description: 'Legacy QR commitments migrated to locked balance',
                referenceId: `legacy-lock-${vendorId}`,
                metadata: {
                    source: 'legacy_lock_backfill',
                    campaignRefs
                }
            }
        });
    }

    return {
        migrated: true,
        lockedAdded: Number(lockedAdded.toFixed(2)),
        linkedQrs
    };
};

// Helper: Ensure Vendor and Wallet exist
const ensureVendorAndWallet = async (userId, tx = prisma) => {
    let vendor = await tx.vendor.findUnique({ where: { userId } });
    if (!vendor) {
        // Create Vendor Profile
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const businessName = user.name || user.username || 'My Company';

        vendor = await tx.vendor.create({
            data: {
                userId,
                businessName,
                contactEmail: user.email || null,
                status: 'active'
            }
        });
    }

    const wallet = await ensureVendorWallet(tx, vendor.id);

    if (vendor.status === 'active') {
        await backfillLegacyLockedBudgets(tx, vendor.id);
        if (AUTO_SEED_VENDOR_QR_INVENTORY && DEFAULT_VENDOR_QR_INVENTORY > 0) {
            await seedVendorInventory(tx, vendor.id, DEFAULT_VENDOR_QR_INVENTORY, {
                seriesCodes: DEFAULT_VENDOR_QR_SERIES_CODES,
                perSeriesCount: DEFAULT_VENDOR_QR_SERIES_SIZE,
                sourceBatch: 'AUTO_SERIES_SEED'
            });
        }
    }

    const refreshedWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });

    return { vendor, wallet: refreshedWallet || wallet };
};

const toNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Number(numeric.toFixed(2));
};

const toPositiveAmount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return Number(numeric.toFixed(2));
};

const buildDateRange = (query = {}) => {
    const createdAt = {};
    if (query.dateFrom) {
        const start = new Date(query.dateFrom);
        if (!Number.isNaN(start.getTime())) {
            createdAt.gte = start;
        }
    }
    if (query.dateTo) {
        const end = new Date(query.dateTo);
        if (!Number.isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            createdAt.lte = end;
        }
    }
    return Object.keys(createdAt).length ? createdAt : null;
};

const createFinanceInvoice = async (
    tx,
    {
        vendorId,
        brandId,
        campaignBudgetId,
        type,
        subtotal,
        tax = 0,
        label,
        metadata
    }
) => {
    const safeSubtotal = toNumber(subtotal, 0);
    const safeTax = toNumber(tax, 0);
    const total = toNumber(safeSubtotal + safeTax, 0);

    return createInvoice(tx, {
        vendorId,
        brandId: brandId || null,
        campaignBudgetId: campaignBudgetId || null,
        type,
        subtotal: safeSubtotal,
        tax: safeTax,
        total,
        metadata,
        items: [
            {
                label,
                qty: 1,
                unitPrice: safeSubtotal,
                amount: safeSubtotal,
                taxRate: safeSubtotal > 0 && safeTax > 0 ? INVOICE_GST_RATE * 100 : null
            }
        ]
    });
};

const mapLegacyInvoiceType = (transaction) => {
    const category = String(transaction?.category || '').toLowerCase();
    if (category === 'unlock_refund' || category === 'refund') {
        return 'REFUND_RECEIPT';
    }
    if (category === 'lock_funds' || category === 'recharge') {
        return 'DEPOSIT_RECEIPT';
    }
    if (
        category === 'campaign_payment' ||
        category === 'qr_purchase' ||
        category === 'tech_fee_charge' ||
        category === 'voucher_fee_charge'
    ) {
        return 'FEE_TAX_INVOICE';
    }
    return 'MONTHLY_STATEMENT';
};

const mapLegacyInvoiceLabel = (transaction) => {
    const category = String(transaction?.category || '').toLowerCase();
    const shortRef = transaction?.referenceId ? String(transaction.referenceId).slice(-8) : null;
    switch (category) {
        case 'campaign_payment':
            return shortRef ? `Campaign payment (${shortRef})` : 'Campaign payment';
        case 'qr_purchase':
            return shortRef ? `QR purchase (${shortRef})` : 'QR purchase';
        case 'tech_fee_charge':
            return shortRef ? `Technology fee (${shortRef})` : 'Technology fee';
        case 'voucher_fee_charge':
            return shortRef ? `Voucher fee (${shortRef})` : 'Voucher fee';
        case 'lock_funds':
            return shortRef ? `Cashback lock (${shortRef})` : 'Cashback lock';
        case 'unlock_refund':
        case 'refund':
            return shortRef ? `Refund (${shortRef})` : 'Refund';
        case 'recharge':
            return shortRef ? `Wallet recharge (${shortRef})` : 'Wallet recharge';
        default:
            return shortRef ? `Statement (${shortRef})` : 'Statement entry';
    }
};

const backfillLegacyInvoicesForVendor = async (tx, vendorId) => {
    if (!vendorId) return 0;

    const wallet = await tx.wallet.findUnique({
        where: { vendorId },
        select: { id: true }
    });

    if (!wallet?.id) return 0;

    const brand = await tx.brand.findFirst({
        where: { vendorId },
        select: { id: true }
    });

    const transactions = await tx.transaction.findMany({
        where: {
            walletId: wallet.id,
            invoiceId: null,
            status: 'success',
            category: {
                in: LEGACY_BILLABLE_CATEGORIES
            }
        },
        orderBy: { createdAt: 'asc' },
        take: 5000
    });

    if (!transactions.length) return 0;

    let createdCount = 0;
    for (const txn of transactions) {
        const amount = toNumber(txn.amount, 0);
        if (amount <= 0) continue;

        const invoice = await createInvoice(tx, {
            vendorId,
            brandId: brand?.id || null,
            campaignBudgetId: txn.campaignBudgetId || null,
            type: mapLegacyInvoiceType(txn),
            subtotal: amount,
            tax: 0,
            total: amount,
            issuedAt: txn.createdAt,
            metadata: {
                source: 'legacy_transaction_backfill',
                transactionId: txn.id,
                category: txn.category,
                type: txn.type,
                referenceId: txn.referenceId || null
            },
            items: [
                {
                    label: mapLegacyInvoiceLabel(txn),
                    qty: 1,
                    unitPrice: amount,
                    amount
                }
            ]
        });

        await tx.transaction.update({
            where: { id: txn.id },
            data: { invoiceId: invoice.id }
        });
        createdCount += 1;
    }

    return createdCount;
};

const createVendorNotification = async ({ vendorId, title, message, type, metadata }) => {
    if (!vendorId) return null;
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { userId: true } });
    if (!vendor?.userId) return null;
    return prisma.notification.create({
        data: {
            userId: vendor.userId,
            title,
            message,
            type,
            metadata
        }
    });
};

const notifyAdminsAboutPaidOrder = async ({ order, vendor, campaignTitle = 'campaign' }) => {
    if (!order) {
        console.log('[NotifyAdmins] No order provided, skipping notification');
        return;
    }

    try {
        const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true }
        });

        console.log(`[NotifyAdmins] Found ${admins.length} admin(s) in database`);

        if (!admins.length) {
            console.log('[NotifyAdmins] No admins found, skipping notification');
            return;
        }

        const vendorLabel =
            vendor?.businessName ||
            vendor?.contactEmail ||
            vendor?.contactPhone ||
            vendor?.User?.name ||
            'Vendor';
        const shortOrderId = order.id ? order.id.slice(-6) : 'order';
        const title = `QR order paid (${vendorLabel})`;
        const message = `${vendorLabel} paid for QR order #${shortOrderId} (${order.quantity || 0} QRs for ${campaignTitle}). Please prepare the PDF.`;

        const metadata = {
            orderId: order.id,
            vendorId: vendor?.id,
            vendorLabel,
            campaignTitle,
            quantity: order.quantity,
            totalAmount: Number(order.totalAmount) || 0,
            status: order.status,
        };

        const notifications = admins.map((admin) => ({
            userId: admin.id,
            title,
            message,
            type: 'admin-order',
            metadata
        }));

        const result = await prisma.notification.createMany({
            data: notifications,
            skipDuplicates: true
        });
        console.log(`[NotifyAdmins] Created ${result.count} notification(s) for order ${shortOrderId}`);
    } catch (error) {
        console.error('[NotifyAdmins] Failed to notify admins about paid order', error);
    }
};

exports.getWalletBalance = async (req, res) => {
    try {
        const { wallet } = await ensureVendorAndWallet(req.user.id);
        const snapshot = getWalletSnapshot(wallet);
        res.json({
            ...wallet,
            ...snapshot
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallet', error: error.message });
    }
};

exports.rechargeWallet = async (req, res) => {
    try {
        const safeAmount = toPositiveAmount(req.body?.amount);
        if (!safeAmount) {
            return res.status(400).json({ message: 'Amount must be greater than zero' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const { vendor } = await ensureVendorAndWallet(req.user.id, tx);
            const creditResult = await creditAvailable(tx, vendor.id, safeAmount, {
                category: 'recharge',
                description: 'Wallet recharge'
            });
            return {
                vendorId: vendor.id,
                wallet: creditResult.wallet
            };
        });

        safeLogVendorActivity({
            vendorId: result.vendorId,
            action: 'wallet_recharge',
            entityType: 'wallet',
            metadata: { amount: safeAmount },
            req
        });
        await createVendorNotification({
            vendorId: result.vendorId,
            title: 'Wallet recharged',
            message: `Wallet credited by INR ${safeAmount.toFixed(2)}.`,
            type: 'wallet-recharge',
            metadata: { tab: 'wallet', amount: safeAmount }
        });
        res.json({
            message: 'Wallet recharged successfully',
            wallet: {
                ...result.wallet,
                ...getWalletSnapshot(result.wallet)
            }
        });
    } catch (error) {
        res.status(error.status || 500).json({ message: 'Recharge failed', error: error.message });
    }
};

const fundInventoryQrs = async (req, res) => {
    try {
        const { campaignId, quantity, cashbackAmount, seriesCode } = req.body;

        if (!campaignId) {
            return res.status(400).json({ message: 'Campaign ID is required' });
        }

        const parsedQuantity = parseInt(quantity, 10);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        const qrCashback = toPositiveAmount(cashbackAmount);
        if (!qrCashback) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                Brand: { select: { id: true, qrPricePerUnit: true, vendorId: true } }
            }
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.status !== 'active' || campaign.deletedAt) {
            return res.status(400).json({ message: 'Campaign is not active' });
        }

        const normalizedSeries = normalizeSeriesCode(seriesCode, null);
        const result = await prisma.$transaction(async (tx) => {
            const { vendor } = await ensureVendorAndWallet(req.user.id, tx);

            if (campaign.Brand?.vendorId !== vendor.id) {
                const error = new Error('Campaign not found or unauthorized');
                error.status = 404;
                throw error;
            }

            const printCostPerQr = resolveTechFeePerQr({
                vendor,
                brand: campaign?.Brand
            });

            const cashbackTotal = toNumber(qrCashback * parsedQuantity, 0);
            const techFeeSubtotal = toNumber(printCostPerQr * parsedQuantity, 0);
            const techFeeTax = toNumber(techFeeSubtotal * INVOICE_GST_RATE, 0);
            const techFeeTotal = toNumber(techFeeSubtotal + techFeeTax, 0);

            const campaignBudget = await tx.campaignBudget.create({
                data: {
                    campaignId: campaignId,
                    vendorId: vendor.id,
                    initialLockedAmount: cashbackTotal,
                    lockedAmount: cashbackTotal,
                    spentAmount: 0,
                    refundedAmount: 0,
                    status: 'active'
                }
            });

            const order = await tx.qROrder.create({
                data: {
                    vendorId: vendor.id,
                    campaignId,
                    quantity: parsedQuantity,
                    cashbackAmount: qrCashback,
                    printCost: printCostPerQr,
                    totalAmount: techFeeTotal,
                    status: 'paid'
                }
            });

            const feeInvoice = await createFinanceInvoice(tx, {
                vendorId: vendor.id,
                brandId: campaign.Brand?.id,
                campaignBudgetId: campaignBudget.id,
                type: 'FEE_TAX_INVOICE',
                subtotal: techFeeSubtotal,
                tax: techFeeTax,
                label: `Technology fee for ${parsedQuantity} QRs (${campaign.title})`,
                metadata: {
                    campaignId,
                    quantity: parsedQuantity,
                    feePerQr: printCostPerQr
                }
            });

            const depositInvoice = await createFinanceInvoice(tx, {
                vendorId: vendor.id,
                brandId: campaign.Brand?.id,
                campaignBudgetId: campaignBudget.id,
                type: 'DEPOSIT_RECEIPT',
                subtotal: cashbackTotal,
                tax: 0,
                label: `Cashback locked for ${parsedQuantity} QRs (${campaign.title})`,
                metadata: {
                    campaignId,
                    quantity: parsedQuantity,
                    cashbackAmount: qrCashback
                }
            });

            await chargeFee(tx, vendor.id, techFeeTotal, {
                referenceId: order.id,
                campaignBudgetId: campaignBudget.id,
                invoiceId: feeInvoice.id,
                description: `Technology fee for QR batch (${campaign.title})`,
                metadata: {
                    campaignId,
                    quantity: parsedQuantity
                }
            });

            await lock(tx, vendor.id, cashbackTotal, {
                referenceId: order.id,
                campaignBudgetId: campaignBudget.id,
                invoiceId: depositInvoice.id,
                description: `Cashback locked for campaign ${campaign.title}`,
                metadata: {
                    campaignId,
                    quantity: parsedQuantity
                }
            });

            const fundedQrs = await allocateInventoryQrs(tx, {
                vendorId: vendor.id,
                campaignId,
                campaignBudgetId: campaignBudget.id,
                quantity: parsedQuantity,
                cashbackAmount: qrCashback,
                orderId: order.id,
                seriesCode: normalizedSeries
            });

            const wallet = await tx.wallet.findUnique({ where: { vendorId: vendor.id } });

            return {
                qrs: fundedQrs,
                order,
                vendorId: vendor.id,
                totalCost: toNumber(cashbackTotal + techFeeTotal, 0),
                totalPrintCost: techFeeTotal,
                campaignTitle: campaign.title,
                quantity: parsedQuantity,
                feeInvoice,
                depositInvoice,
                campaignBudget,
                wallet,
                selectedSeries: normalizedSeries
            };
        });

        const orderSummary = result?.order
            ? {
                id: result.order.id,
                campaignId: result.order.campaignId,
                campaignTitle: campaign.title,
                quantity: result.order.quantity,
                cashbackAmount: Number(result.order.cashbackAmount),
                printCost: Number(result.order.printCost),
                totalAmount: Number(result.order.totalAmount),
                status: result.order.status
            }
            : null;

        res.status(201).json({
            message: 'QRs funded successfully',
            count: result.qrs.length,
            qrs: result.qrs,
            order: orderSummary,
            selectedSeries: result.selectedSeries
        });

        safeLogVendorActivity({
            vendorId: result.vendorId,
            action: 'qr_order',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: {
                orderId: result.order?.id,
                quantity: parsedQuantity,
                cashbackAmount: qrCashback,
                totalCost: result.totalCost,
                totalPrintCost: result.totalPrintCost,
                campaignBudgetId: result.campaignBudget?.id
            },
            req
        });

        await createVendorNotification({
            vendorId: result.vendorId,
            title: 'QRs purchased',
            message: `Debited INR ${Number(result.totalCost || 0).toFixed(2)} for ${result.quantity} QRs (${result.campaignTitle}).`,
            type: 'wallet-debit',
            metadata: {
                tab: 'wallet',
                campaignId,
                orderId: result.order?.id,
                amount: Number(result.totalCost || 0),
                quantity: result.quantity
            }
        });

        const vendorProfile = await prisma.vendor.findUnique({
            where: { id: result.vendorId },
            include: {
                User: { select: { id: true, name: true, email: true } }
            }
        });
        await notifyAdminsAboutPaidOrder({
            order: result.order,
            vendor: vendorProfile,
            campaignTitle: campaign.title
        });
    } catch (error) {
        res.status(error.status || 500).json({ message: 'Order failed', error: error.message });
    }
};

exports.getVendorQrInventorySeries = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const requestedSeries = normalizeSeriesCode(req.query?.seriesCode, null);
        const where = {
            vendorId: vendor.id,
            status: 'inventory'
        };
        if (requestedSeries) {
            where.seriesCode = requestedSeries;
        }

        const grouped = await prisma.qRCode.groupBy({
            by: ['seriesCode'],
            where,
            _count: { _all: true },
            _min: { seriesOrder: true, importedAt: true, createdAt: true },
            _max: { seriesOrder: true, importedAt: true, createdAt: true }
        });

        const series = grouped
            .map((row) => ({
                seriesCode: row.seriesCode || 'UNASSIGNED',
                sourceBatch: null,
                availableCount: Number(row?._count?._all || 0),
                fromOrder: row?._min?.seriesOrder ?? null,
                toOrder: row?._max?.seriesOrder ?? null,
                importedAt:
                    row?._max?.importedAt ||
                    row?._max?.createdAt ||
                    row?._min?.importedAt ||
                    row?._min?.createdAt ||
                    null
            }))
            .sort((a, b) => b.availableCount - a.availableCount || a.seriesCode.localeCompare(b.seriesCode));

        const totalInventory = series.reduce((sum, item) => sum + item.availableCount, 0);

        res.json({
            totalInventory,
            series
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch QR inventory series', error: error.message });
    }
};

exports.importVendorQrInventorySeries = async (req, res) => {
    try {
        const parsedSeries = normalizeSeriesCode(req.body?.seriesCode, null);
        if (!parsedSeries) {
            return res.status(400).json({ message: 'seriesCode is required' });
        }

        let hashes = [];
        if (Array.isArray(req.body?.hashes)) {
            hashes = req.body.hashes;
        } else if (typeof req.body?.sheet === 'string') {
            hashes = req.body.sheet.split(/[\r\n,;]+/g);
        }

        const sourceBatch = req.body?.sourceBatch ? String(req.body.sourceBatch).trim() : null;

        const result = await prisma.$transaction(async (tx) => {
            const { vendor } = await ensureVendorAndWallet(req.user.id, tx);
            const importResult = await importInventorySeries(tx, {
                vendorId: vendor.id,
                seriesCode: parsedSeries,
                hashes,
                sourceBatch
            });
            return {
                vendorId: vendor.id,
                ...importResult
            };
        });

        res.status(201).json({
            message: 'QR inventory series imported',
            ...result
        });
    } catch (error) {
        res.status(error.status || 500).json({ message: 'Failed to import QR inventory series', error: error.message });
    }
};

exports.orderQRs = fundInventoryQrs;
exports.rechargeQrInventory = fundInventoryQrs;

exports.getMyQRs = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const { page, limit, skip } = parsePagination(req, { defaultLimit: 80, maxLimit: 200 });

        const [qrs, total, statusGroups] = await Promise.all([
            prisma.qRCode.findMany({
                where: { vendorId: vendor.id },
                include: {
                    Campaign: {
                        select: {
                            id: true,
                            title: true,
                            cashbackAmount: true,
                            endDate: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.qRCode.count({ where: { vendorId: vendor.id } }),
            prisma.qRCode.groupBy({
                by: ['status'],
                where: { vendorId: vendor.id },
                _count: { _all: true }
            })
        ]);

        const statusCounts = statusGroups.reduce((acc, row) => {
            const key = String(row.status || 'unknown').toLowerCase();
            acc[key] = row._count._all;
            return acc;
        }, {});

        const formattedQrs = qrs.map(qr => ({
            ...qr,
            cashbackAmount: qr.cashbackAmount ? Number(qr.cashbackAmount) : 0,
            Campaign: qr.Campaign ? {
                ...qr.Campaign,
                cashbackAmount: qr.Campaign.cashbackAmount ? Number(qr.Campaign.cashbackAmount) : 0
            } : null
        }));

        res.json({
            items: formattedQrs,
            total,
            page,
            pages: total ? Math.ceil(total / limit) : 0,
            statusCounts
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QRs', error: error.message });
    }
};

exports.deleteQrBatch = async (req, res) => {
    try {
        const { campaignId: bodyCampaignId, cashbackAmount: bodyCashbackAmount } = req.body || {};
        const { campaignId: queryCampaignId, cashbackAmount: queryCashbackAmount } = req.query || {};
        const campaignId = bodyCampaignId || queryCampaignId;
        const cashbackAmount = bodyCashbackAmount ?? queryCashbackAmount;

        if (!campaignId) {
            return res.status(400).json({ message: 'Campaign ID is required' });
        }

        const parsedCashback = Number(cashbackAmount);
        if (!Number.isFinite(parsedCashback) || parsedCashback < 0) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { Brand: true }
        });
        const allowNullVendor = campaign?.Brand?.vendorId === vendor.id;

        const normalizedCashback = Number(parsedCashback.toFixed(2));
        const normalizedCashbackString = normalizedCashback.toFixed(2);
        const cashbackAmountFilter =
            normalizedCashback > 0 ? { in: [normalizedCashbackString, '0.00'] } : normalizedCashbackString;
        const baseWhere = {
            campaignId,
            cashbackAmount: cashbackAmountFilter,
            ...(allowNullVendor
                ? { OR: [{ vendorId: vendor.id }, { vendorId: null }] }
                : { vendorId: vendor.id })
        };

        const totalCount = await prisma.qRCode.count({ where: baseWhere });
        if (totalCount === 0) {
            return res.status(404).json({ message: 'No QR batch found for this campaign' });
        }

        const deletableStatuses = ['generated', 'assigned', 'active'];
        const deleteWhere = {
            ...baseWhere,
            status: { in: deletableStatuses }
        };

        const deletableCount = await prisma.qRCode.count({ where: deleteWhere });
        if (deletableCount === 0) {
            return res.status(400).json({
                message: 'No deletable QRs in this batch. Redeemed/expired QRs cannot be removed.',
                total: totalCount,
                deleted: 0,
                skipped: totalCount
            });
        }

        const deleted = await prisma.qRCode.deleteMany({ where: deleteWhere });
        const skipped = totalCount - deleted.count;

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'qr_batch_delete',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: {
                cashbackAmount: normalizedCashback,
                total: totalCount,
                deleted: deleted.count,
                skipped
            },
            req
        });

        res.json({
            message: `Deleted ${deleted.count} QRs from batch`,
            total: totalCount,
            deleted: deleted.count,
            skipped
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete QR batch', error: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { Wallet: true }
        });

        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const [totalQRs, redeemedQRs, totalSpent] = await Promise.all([
            prisma.qRCode.count({ where: { vendorId: vendor.id } }),
            prisma.qRCode.count({ where: { vendorId: vendor.id, status: 'redeemed' } }),
            prisma.transaction.aggregate({
                where: {
                    walletId: vendor.Wallet.id,
                    type: 'debit'
                },
                _sum: { amount: true }
            })
        ]);

        res.json({
            wallet: {
                balance: vendor.Wallet.balance,
                currency: vendor.Wallet.currency
            },
            stats: {
                totalQRsGenerated: totalQRs,
                totalQRsRedeemed: redeemedQRs,
                totalSpent: totalSpent._sum.amount || 0
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

exports.getVendorTransactions = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { Wallet: true }
        });

        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const transactions = await prisma.transaction.findMany({
            where: { walletId: vendor.Wallet.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json(transactions);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

exports.getVendorCampaigns = async (req, res) => {
    try {
        // Find vendor first to get ID
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.json([]);

        const campaigns = await prisma.campaign.findMany({
            where: {
                Brand: {
                    vendorId: vendor.id
                },
                deletedAt: null
            },
            include: { Brand: true, Product: true },
            orderBy: { createdAt: 'desc' }
        });

        // Enhance active postpaid campaigns with sheet info
        const enhancedCampaigns = await Promise.all(campaigns.map(async (camp) => {
            if (camp.planType === 'postpaid' && camp.status === 'active') {
                const qrs = await prisma.qRCode.findMany({
                    where: { 
                        campaignId: camp.id, 
                        status: { in: ['funded', 'generated', 'active', 'assigned'] } 
                    },
                    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                    select: { cashbackAmount: true }
                });

                const sheets = [];
                const QRS_PER_SHEET = 25;
                const toRomanSheet = (n) => { const v=[1000,900,500,400,100,90,50,40,10,9,5,4,1], s=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']; let r='',x=Math.max(1,Math.floor(n)); for(let i=0;i<v.length;i++){while(x>=v[i]){r+=s[i];x-=v[i];}} return r; };

                for (let i = 0; i < qrs.length; i += QRS_PER_SHEET) {
                   const chunk = qrs.slice(i, i + QRS_PER_SHEET);
                   const amount = Number(chunk[0]?.cashbackAmount || 0);
                   const sheetIndex = i / QRS_PER_SHEET;
                   const label = toRomanSheet(sheetIndex + 1);
                   
                   sheets.push({
                        index: sheetIndex,
                        label,
                        count: chunk.length,
                        amount
                   });
                }

                // IMPORTANT: show only PAID sheet amounts in active postpaid view.
                // Assigned cashback on QRs is not considered paid until lock_funds is recorded for that sheet.
                const lockTransactions = await prisma.transaction.findMany({
                    where: {
                        referenceId: camp.id,
                        category: 'lock_funds',
                        status: 'success'
                    },
                    select: {
                        amount: true,
                        metadata: true
                    }
                });

                const paidBySheet = new Map();
                lockTransactions.forEach((tx) => {
                    const sheetIndexRaw = tx?.metadata?.sheetIndex;
                    const sheetIndex = Number.parseInt(sheetIndexRaw, 10);
                    if (!Number.isFinite(sheetIndex) || sheetIndex < 0) return;

                    const prev = toNumber(paidBySheet.get(sheetIndex), 0);
                    const next = toNumber(prev + toNumber(tx?.amount, 0), 0);
                    paidBySheet.set(sheetIndex, next);
                });

                const paidSheets = sheets.map((sheet) => {
                    const paidTotal = toNumber(paidBySheet.get(sheet.index), 0);
                    const paidRate = sheet.count > 0 ? toNumber(paidTotal / sheet.count, 0) : 0;
                    return {
                        ...sheet,
                        amount: paidRate,
                        paidTotal,
                        isPaid: paidTotal > 0
                    };
                });

                const totalBudgetFromSheets = toNumber(
                    paidSheets.reduce((sum, s) => sum + toNumber(s.paidTotal, 0), 0),
                    0
                );
                return { 
                    ...camp, 
                    sheets: paidSheets,
                    subtotal: totalBudgetFromSheets,
                    totalBudget: totalBudgetFromSheets
                };
            }
            return camp;
        }));

        // console.log('Fetched Vendor Campaigns:', JSON.stringify(enhancedCampaigns, null, 2));
        res.json(enhancedCampaigns);
    } catch (error) {
        console.error('getVendorCampaigns Error:', error);
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
};

// Get Vendor Profile
exports.getVendorProfile = async (req, res) => {
    try {
        let vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            // Auto-create vendor profile
            vendor = await prisma.vendor.create({
                data: {
                    userId: req.user.id,
                    businessName: 'My Company',
                    status: 'active'
                }
            });
        }
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendor profile', error: error.message });
    }
};

// Get Vendor's First Brand
exports.getVendorBrand = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { Brand: true }
        });

        if (!vendor || !vendor.Brand) {
            return res.status(404).json({ message: 'Brand not found for this vendor' });
        }

        res.json(vendor.Brand);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brand', error: error.message });
    }
};

exports.getVendorBrands = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const brand = await prisma.brand.findUnique({
            where: { vendorId: vendor.id }
        });
        if (!brand) {
            return res.json([]);
        }
        res.json([brand]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

// Upsert Vendor Brand (Create or Update)
exports.upsertVendorBrand = async (req, res) => {
    try {
        const { name, website, logoUrl, qrPricePerUnit } = req.body || {};
        const { vendor } = await ensureVendorAndWallet(req.user.id);

        const existingBrand = await prisma.brand.findUnique({
            where: { vendorId: vendor.id }
        });

        const payload = {
            name: typeof name === 'string' && name.trim() ? name.trim() : existingBrand?.name || vendor.businessName || 'My Brand',
            website: typeof website === 'string' && website.trim() ? website.trim() : null,
            logoUrl: typeof logoUrl === 'string' && logoUrl.trim() ? logoUrl.trim() : null,
            status: 'active'
        };

        if (qrPricePerUnit !== undefined && qrPricePerUnit !== null && qrPricePerUnit !== '') {
            payload.qrPricePerUnit = qrPricePerUnit;
        }

        const brand = existingBrand
            ? await prisma.brand.update({
                where: { id: existingBrand.id },
                data: payload
            })
            : await prisma.brand.create({
                data: {
                    ...payload,
                    vendorId: vendor.id
                }
            });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: existingBrand ? 'brand_update' : 'brand_create',
            entityType: 'brand',
            entityId: brand.id,
            metadata: {
                name: brand.name,
                website: brand.website,
                logoUrl: brand.logoUrl
            },
            req
        });

        res.json({ message: existingBrand ? 'Brand updated successfully.' : 'Brand created successfully.', brand });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upsert brand', error: error.message });
    }
};

exports.updateVendorProfile = async (req, res) => {
    try {
        const {
            businessName,
            contactPhone,
            alternatePhone,
            designation,
            contactEmail,
            gstin,
            address,
            city,
            state,
            pincode
        } = req.body || {};

        const normalizedAddress = [address, city, state, pincode]
            .map((value) => (value === undefined || value === null ? '' : String(value).trim()))
            .filter(Boolean)
            .join(', ');

        // Ensure Vendor Exists (or Create it)
        let vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        if (!vendor) {
            vendor = await prisma.vendor.create({
                data: {
                    userId: req.user.id,
                    businessName: businessName || 'My Company',
                    contactPhone,
                    contactEmail: contactEmail || null,
                    gstin,
                    address: normalizedAddress || null,
                    status: 'active'
                }
            });
        } else {
            vendor = await prisma.vendor.update({
                where: { userId: req.user.id },
                data: {
                    businessName,
                    contactPhone,
                    contactEmail: contactEmail || null,
                    gstin,
                    address: normalizedAddress || null
                }
            });
        }

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'vendor_profile_update',
            entityType: 'vendor',
            entityId: vendor.id,
            metadata: {
                businessName,
                contactPhone,
                alternatePhone,
                designation,
                contactEmail,
                gstin,
                address,
                city,
                state,
                pincode
            },
            req
        });

        res.json({ message: 'Profile updated successfully', vendor });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.requestCredentialUpdate = async (req, res) => {
    try {
        const { username, password } = req.body || {};
        const trimmedUsername = typeof username === 'string' ? username.trim() : '';
        const hasUsername = trimmedUsername.length > 0;
        const hasPassword = typeof password === 'string' && password.length > 0;

        if (!hasUsername && !hasPassword) {
            return res.status(400).json({ message: 'Provide a username or password to request an update' });
        }

        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { User: true, Brand: true }
        });

        if (!vendor || !vendor.User) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }

        if (hasUsername) {
            const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } });
            if (existing && existing.id !== vendor.User.id) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }

        const updatePayload = {};
        if (hasUsername) updatePayload.requestedUsername = trimmedUsername;
        if (hasPassword) updatePayload.requestedPassword = await bcrypt.hash(password, 10);

        if (!Object.keys(updatePayload).length) {
            return res.status(400).json({ message: 'No credential updates provided' });
        }

        let request = await prisma.credentialRequest.findFirst({
            where: { vendorId: vendor.id, status: 'pending' },
            orderBy: { createdAt: 'desc' }
        });

        if (request) {
            request = await prisma.credentialRequest.update({
                where: { id: request.id },
                data: updatePayload
            });
        } else {
            request = await prisma.credentialRequest.create({
                data: {
                    vendorId: vendor.id,
                    userId: vendor.User.id,
                    ...updatePayload
                }
            });
        }

        const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true }
        });

        if (admins.length) {
            const vendorLabel =
                vendor.businessName ||
                vendor.contactEmail ||
                vendor.User.email ||
                'Vendor';
            const notifications = admins.map((admin) => ({
                userId: admin.id,
                title: `Credential update request (${vendorLabel})`,
                message: `${vendorLabel} requested to update login credentials.`,
                type: 'credential-request',
                metadata: {
                    requestId: request.id,
                    vendorId: vendor.id,
                    brandId: vendor.Brand?.id || null,
                    vendorLabel,
                    requestedUsername: request.requestedUsername || null,
                    status: request.status
                }
            }));

            await prisma.notification.createMany({ data: notifications });
        }

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'credential_update_request',
            entityType: 'user',
            entityId: vendor.User.id,
            metadata: {
                requestedUsername: request.requestedUsername || null,
                hasPassword: Boolean(request.requestedPassword)
            },
            req
        });

        res.status(201).json({ message: 'Credential update request submitted', requestId: request.id });
    } catch (error) {
        res.status(500).json({ message: 'Failed to request credential update', error: error.message });
    }
};

exports.requestBrand = async (req, res) => {
    try {
        const { name, website, logoUrl, defaultPlanType, description, industry } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Brand name is required' });
        }

        // Auto-create Vendor and Wallet if they don't exist
        const { vendor } = await ensureVendorAndWallet(req.user.id);

        // Check if brand already exists for this vendor
        const existingBrand = await prisma.brand.findUnique({
            where: { vendorId: vendor.id }
        });

        if (existingBrand) {
            return res.status(400).json({ message: 'You already have a registered brand.' });
        }

        const brand = await prisma.brand.create({
            data: {
                name,
                website,
                logoUrl,
                // description field removed as it does not exist on Brand model
                vendorId: vendor.id,
                status: 'active',
                defaultPlanType: defaultPlanType || 'prepaid'
            }
        });

        // Log activity
        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'brand_create',
            entityType: 'brand',
            entityId: brand.id,
            metadata: { name, website },
            req
        });
        res.status(201).json({ message: 'Brand created successfully.', brand });

    } catch (error) {
        console.error('Request Brand Error:', error);
        res.status(500).json({ message: 'Failed to register brand', error: error.message });
    }
};

exports.requestCampaign = async (req, res) => {
    try {
        const {
            brandId,
            productId,
            title,
            description,
            planType,
            voucherType,
            cashbackAmount,
            startDate,
            endDate,
            totalBudget,
            subtotal,
            allocations
        } = req.body;
        console.log('Requesting Campaign Creation:', JSON.stringify(req.body, null, 2));

        // Verify ownership/status of brand
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        if (brand.status !== 'active') {
            return res.status(400).json({ message: 'Brand is not active' });
        }

        // Validate productId if provided
        let validProductId = null;
        if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            if (product.brandId !== brandId) {
                return res.status(400).json({ message: 'Product does not belong to this brand' });
            }
            validProductId = productId;
        }

        const normalizedPlanType = String(planType || 'prepaid').toLowerCase() === 'postpaid'
            ? 'postpaid'
            : 'prepaid';
        const normalizedVoucherType = ['digital_voucher', 'printed_qr', 'none'].includes(String(voucherType || 'none'))
            ? String(voucherType || 'none')
            : 'none';

        const allocationRows = Array.isArray(allocations) ? allocations : [];

        const derivedSubtotal = allocationRows.reduce((sum, alloc) => {
            const quantity = parseInt(alloc?.quantity, 10) || 0;
            const cashback = parseFloat(alloc?.cashbackAmount);
            const rowTotal = parseFloat(alloc?.totalBudget);
            if (Number.isFinite(rowTotal) && rowTotal >= 0) {
                return sum + rowTotal;
            }
            if (quantity <= 0) return sum;
            if (normalizedPlanType === 'postpaid') {
                return sum;
            }
            if (Number.isFinite(cashback) && cashback > 0) {
                return sum + cashback * quantity;
            }
            return sum;
        }, 0);
        const normalizedTotalBudget = normalizedPlanType === 'postpaid'
            ? 0
            : Number.isFinite(parseFloat(totalBudget))
                ? parseFloat(totalBudget)
                : derivedSubtotal;
        const normalizedSubtotal = normalizedPlanType === 'postpaid'
            ? 0
            : Number.isFinite(parseFloat(subtotal))
                ? parseFloat(subtotal)
                : derivedSubtotal;
        const parsedCashbackAmount = parseFloat(cashbackAmount);
        const normalizedCashbackAmount = normalizedPlanType === 'postpaid'
            ? null
            : Number.isFinite(parsedCashbackAmount) && parsedCashbackAmount > 0
                ? parsedCashbackAmount
                : null;
        const campaignStatus = 'pending';

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                productId: validProductId,
                title,
                description,
                planType: normalizedPlanType,
                voucherType: normalizedVoucherType,
                cashbackAmount: normalizedCashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget: normalizedTotalBudget,
                subtotal: normalizedSubtotal,
                allocations,
                status: campaignStatus
            }
        });
        safeLogVendorActivity({
            vendorId: brand.vendorId,
            action: 'campaign_create',
            entityType: 'campaign',
            entityId: campaign.id,
            metadata: {
                brandId,
                productId: validProductId,
                title,
                planType: normalizedPlanType,
                voucherType: normalizedVoucherType,
                totalBudget: normalizedTotalBudget,
                subtotal: normalizedSubtotal,
                allocationsCount: allocationRows.length
            },
            req
        });
        await createVendorNotification({
            vendorId: brand.vendorId,
            title: 'Campaign created',
            message: `Campaign "${title}" created and pending activation.`,
            type: 'campaign-created',
            metadata: { tab: 'campaigns', campaignId: campaign.id, brandId }
        });
        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (error) {
        console.error('Campaign Creation Error:', error);
        res.status(500).json({ message: 'Request failed', error: error.message, stack: error.stack });
    }
};


exports.updateBrand = async (_req, res) => {
    res.status(403).json({
        message: 'Brand metadata is locked to the admin panel; contact the admin for changes'
    });
};

exports.updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        const campaign = await prisma.campaign.findFirst({
            where: { id, deletedAt: null, Brand: { vendorId: vendor.id } }
        });

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found or unauthorized' });
        }

        const updatedCampaign = await prisma.campaign.update({
            where: { id },
            data: {
                title,
                description,
                cashbackAmount,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                totalBudget
            }
        });
        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_update',
            entityType: 'campaign',
            entityId: id,
            metadata: {
                title,
                cashbackAmount,
                startDate,
                endDate,
                totalBudget
            },
            req
        });
        res.json({ message: 'Campaign updated', campaign: updatedCampaign });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// --- Product Management (Vendor) ---

exports.addProduct = async (req, res) => {
    try {
        const { brandId, name, sku, mrp, variant, description, category, packSize, warranty, imageUrl } = req.body;

        // Check ownership
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });

        if (!brand || brand.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized brand access' });
        }

        const product = await prisma.product.create({
            data: {
                brandId,
                name,
                sku: sku || null,
                mrp: mrp === undefined || mrp === null || mrp === '' ? null : mrp,
                variant,
                description,
                category,
                packSize: typeof packSize === 'string' ? packSize.trim() || null : null,
                warranty: typeof warranty === 'string' ? warranty.trim() || null : null,
                imageUrl,
                status: 'active'
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_create',
            entityType: 'product',
            entityId: product.id,
            metadata: { brandId, name, category },
            req
        });
        res.status(201).json({ message: 'Product added', product });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product', error: error.message });
    }
};

exports.importProducts = async (req, res) => {
    try {
        const { brandId, products } = req.body;

        if (!brandId) {
            return res.status(400).json({ message: 'Brand ID is required' });
        }
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Provide at least one product to import' });
        }

        const { vendor } = await ensureVendorAndWallet(req.user.id);

        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand || brand.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized brand access' });
        }

        const validProducts = products
            .map((item) => {
                const statusCandidate = typeof item.status === 'string' ? item.status.toLowerCase() : '';
                const status =
                    statusCandidate === 'inactive' || statusCandidate === 'blocked' ? statusCandidate : 'active';
                return {
                    brandId,
                    name: item.name?.trim(),
                    sku: item.sku?.trim() || null,
                    mrp:
                        item.mrp === undefined || item.mrp === null || item.mrp === ''
                            ? null
                            : item.mrp,
                    variant: item.variant?.trim() || null,
                    category: item.category?.trim() || null,
                    description: item.description?.trim() || null,
                    packSize: item.packSize?.trim() || null,
                    warranty: item.warranty?.trim() || null,
                    imageUrl: item.imageUrl?.trim() || null,
                    bannerUrl: item.bannerUrl?.trim() || null,
                    status,
                };
            })
            .filter((item) => item.name);

        if (validProducts.length === 0) {
            return res.status(400).json({ message: 'No valid products found to import' });
        }

        const result = await prisma.product.createMany({
            data: validProducts,
            skipDuplicates: true
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_import',
            entityType: 'brand',
            entityId: brandId,
            metadata: {
                requested: products.length,
                imported: result.count
            },
            req
        });
        res.status(201).json({
            message: `${result.count} products imported`,
            count: result.count
        });
    } catch (error) {
        res.status(500).json({ message: 'Error importing products', error: error.message });
    }
};

exports.getVendorProducts = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            return res.json([]);
        }

        const products = await prisma.product.findMany({
            where: {
                Brand: { vendorId: vendor.id },
                deletedAt: null
            },
            select: {
                id: true,
                brandId: true,
                name: true,
                sku: true,
                mrp: true,
                variant: true,
                category: true,
                description: true,
                packSize: true,
                warranty: true,
                imageUrl: true,
                bannerUrl: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                Brand: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Keep pricing consistently numeric for the frontend table.
        res.json(
            products.map((product) => ({
                ...product,
                mrp: product.mrp !== null && product.mrp !== undefined ? Number(product.mrp) : null
            }))
        );
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, mrp, variant, description, category, packSize, warranty, imageUrl, status } = req.body;
        const hasSku = Object.prototype.hasOwnProperty.call(req.body || {}, 'sku');
        const hasMrp = Object.prototype.hasOwnProperty.call(req.body || {}, 'mrp');
        const hasPackSize = Object.prototype.hasOwnProperty.call(req.body || {}, 'packSize');
        const hasWarranty = Object.prototype.hasOwnProperty.call(req.body || {}, 'warranty');

        // Verify ownership
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        const product = await prisma.product.findFirst({
            where: { id, deletedAt: null, Brand: { vendorId: vendor.id } }
        });

        if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });

        const data = {
            name,
            variant,
            description,
            category,
            imageUrl,
            status
        };

        if (hasSku) {
            data.sku = typeof sku === 'string' ? sku.trim() || null : null;
        }
        if (hasMrp) {
            if (mrp === undefined || mrp === null || mrp === '') {
                data.mrp = null;
            } else {
                const parsedMrp = Number(mrp);
                data.mrp = Number.isFinite(parsedMrp) ? parsedMrp : null;
            }
        }
        if (hasPackSize) {
            data.packSize = typeof packSize === 'string' ? packSize.trim() || null : null;
        }
        if (hasWarranty) {
            data.warranty = typeof warranty === 'string' ? warranty.trim() || null : null;
        }

        const updated = await prisma.product.update({
            where: { id },
            data
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_update',
            entityType: 'product',
            entityId: id,
            metadata: { name, category, status },
            req
        });
        res.json({ message: 'Product updated', product: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error updating product', error: error.message });
    }
};

const cancelCampaignWithRefund = async (tx, { campaignId, vendorId, reason = 'Campaign cancelled by vendor' }) => {
    const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        include: {
            Brand: { select: { id: true, vendorId: true } }
        }
    });

    if (!campaign || campaign.Brand?.vendorId !== vendorId) {
        const error = new Error('Campaign not found or unauthorized');
        error.status = 404;
        throw error;
    }

    const activeBudgets = await tx.campaignBudget.findMany({
        where: {
            campaignId,
            vendorId,
            status: 'active'
        },
        orderBy: { createdAt: 'asc' }
    });

    const refundableAmount = toNumber(
        activeBudgets.reduce((sum, budget) => sum + Number(budget.lockedAmount || 0), 0),
        0
    );

    let refundInvoice = null;
    if (refundableAmount > 0) {
        refundInvoice = await createFinanceInvoice(tx, {
            vendorId,
            brandId: campaign.Brand?.id,
            campaignBudgetId: activeBudgets[0]?.id || null,
            type: 'REFUND_RECEIPT',
            subtotal: refundableAmount,
            tax: 0,
            label: `Locked cashback refund for ${campaign.title}`,
            metadata: {
                campaignId,
                reason,
                budgetIds: activeBudgets.map((budget) => budget.id)
            }
        });

        await unlockRefund(tx, vendorId, refundableAmount, {
            referenceId: campaignId,
            campaignBudgetId: activeBudgets[0]?.id || null,
            invoiceId: refundInvoice.id,
            description: `Refund unlocked for cancelled campaign "${campaign.title}"`,
            metadata: {
                campaignId,
                reason
            }
        });
    }

    for (const budget of activeBudgets) {
        const lockedAmount = Number(budget.lockedAmount || 0);
        await tx.campaignBudget.update({
            where: { id: budget.id },
            data: {
                refundedAmount: {
                    increment: lockedAmount
                },
                lockedAmount: 0,
                status: 'refunded'
            }
        });
    }

    const voidedResult = await tx.qRCode.updateMany({
        where: {
            campaignId,
            status: {
                in: ['funded', 'generated', 'assigned', 'active']
            }
        },
        data: {
            status: 'void',
            campaignId: null,
            campaignBudgetId: null
        }
    });

    const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
            status: 'completed',
            deletedAt: new Date(),
            rejectionReason: reason
        }
    });

    return {
        campaign: updatedCampaign,
        refundedAmount: refundableAmount,
        refundInvoice,
        voidedCount: voidedResult.count
    };
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        const product = await prisma.product.findFirst({
            where: { id, deletedAt: null, Brand: { vendorId: vendor.id } }
        });

        if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });

        const campaigns = await prisma.campaign.findMany({
            where: {
                productId: id,
                deletedAt: null
            },
            select: { id: true, title: true }
        });
        const campaignIds = campaigns.map((campaign) => campaign.id);

        const cancellationResult = await prisma.$transaction(async (tx) => {
            let totalRefunded = 0;
            let totalVoided = 0;
            const cancelledCampaigns = [];

            for (const campaign of campaigns) {
                const cancelled = await cancelCampaignWithRefund(tx, {
                    campaignId: campaign.id,
                    vendorId: vendor.id,
                    reason: `Product ${product.name} deleted by vendor`
                });
                totalRefunded += Number(cancelled.refundedAmount || 0);
                totalVoided += Number(cancelled.voidedCount || 0);
                cancelledCampaigns.push({
                    id: campaign.id,
                    title: campaign.title,
                    refundedAmount: Number(cancelled.refundedAmount || 0),
                    voidedQrs: Number(cancelled.voidedCount || 0)
                });
            }

            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    status: 'inactive',
                    deletedAt: new Date()
                }
            });

            return {
                totalRefunded: toNumber(totalRefunded, 0),
                totalVoided,
                cancelledCampaigns,
                product: updatedProduct
            };
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_delete',
            entityType: 'product',
            entityId: id,
            metadata: {
                name: product.name,
                deletedCampaigns: campaignIds.length,
                refundedAmount: cancellationResult.totalRefunded,
                voidedQrs: cancellationResult.totalVoided
            },
            req
        });
        res.json({
            message: 'Product deleted and campaign funds refunded',
            productId: id,
            refundedAmount: cancellationResult.totalRefunded,
            voidedQrs: cancellationResult.totalVoided,
            cancelledCampaigns: cancellationResult.cancelledCampaigns
        });
    } catch (error) {
        res.status(error.status || 500).json({ message: 'Error deleting product', error: error.message });
    }
};

// --- Analytics ---

exports.getCampaignStats = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        const stats = await prisma.campaign.findMany({
            where: {
                Brand: { vendorId: vendor.id },
                deletedAt: null
            }, // All campaigns for this vendor
            select: {
                id: true,
                title: true,
                status: true,
                totalBudget: true,
                _count: {
                    select: { QRCodes: true } // Total QRs generated
                },
                QRCodes: {
                    where: { status: 'redeemed' }, // Only count redeemed for engagement
                    select: { id: true }
                }
            }
        });

        // Format
        const formatted = stats.map(c => ({
            id: c.id,
            campaign: c.title,
            status: c.status,
            budget: c.totalBudget,
            totalQRsOrdered: c._count.QRCodes,
            totalUsersJoined: c.QRCodes.length,
            budgetSpent: c.QRCodes.length * 0 // Access cashback amount if needed, simplifying
        }));

        res.json(formatted);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// --- Campaign Control & Cleanup ---

exports.updateCampaignStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'paused'
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        if (!['active', 'paused'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Use active or paused.' });
        }

        const campaign = await prisma.campaign.findFirst({
            where: { id, Brand: { vendorId: vendor.id } }
        });

        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        // Prevent resuming if rejected/completed?
        // For now, allow toggling active/paused.

        const updated = await prisma.campaign.update({
            where: { id },
            data: { status }
        });
        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_status_update',
            entityType: 'campaign',
            entityId: id,
            metadata: { status },
            req
        });
        res.json({ message: `Campaign ${status}`, campaign: updated });

    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.deleteBrand = async (_req, res) => {
    res.status(403).json({
        message: 'Brand deletion is restricted to administrators'
    });
};

exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const result = await prisma.$transaction(async (tx) => {
            return cancelCampaignWithRefund(tx, {
                campaignId: id,
                vendorId: vendor.id,
                reason: 'Campaign deleted by vendor'
            });
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_delete',
            entityType: 'campaign',
            entityId: id,
            metadata: {
                title: result.campaign?.title,
                refundedAmount: Number(result.refundedAmount || 0),
                voidedQrs: Number(result.voidedCount || 0)
            },
            req
        });

        res.json({
            message: 'Campaign deleted and locked funds refunded',
            campaignId: id,
            refundedAmount: Number(result.refundedAmount || 0),
            voidedQrs: Number(result.voidedCount || 0)
        });
    } catch (error) {
        res.status(error.status || 500).json({ message: 'Delete failed', error: error.message });
    }
};

// --- QR Order Management ---

exports.getVendorOrders = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });

        const [orders, total, statusGroups] = await Promise.all([
            prisma.qROrder.findMany({
                where: { vendorId: vendor.id },
                include: {
                    _count: { select: { QRCodes: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.qROrder.count({ where: { vendorId: vendor.id } }),
            prisma.qROrder.groupBy({
                by: ['status'],
                where: { vendorId: vendor.id },
                _count: { _all: true }
            })
        ]);

        const statusCounts = statusGroups.reduce((acc, row) => {
            const key = String(row.status || 'unknown').toLowerCase();
            acc[key] = row._count._all;
            return acc;
        }, {});

        const campaignIds = [...new Set(orders.map(o => o.campaignId))];
        const campaigns = await prisma.campaign.findMany({
            where: { id: { in: campaignIds } },
            select: { id: true, title: true }
        });
        const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.title]));

        const formattedOrders = orders.map(order => ({
            id: order.id,
            campaignId: order.campaignId,
            campaignTitle: campaignMap[order.campaignId] || 'Unknown Campaign',
            quantity: order.quantity,
            cashbackAmount: Number(order.cashbackAmount),
            printCost: Number(order.printCost),
            totalAmount: Number(order.totalAmount),
            status: order.status,
            createdAt: order.createdAt,
            qrCount: order._count?.QRCodes || 0
        }));

        res.json({
            items: formattedOrders,
            total,
            page,
            pages: total ? Math.ceil(total / limit) : 0,
            statusCounts
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { campaignId, quantity, cashbackAmount } = req.body;

        if (!campaignId) {
            return res.status(400).json({ message: 'Campaign ID is required' });
        }

        const parsedQuantity = parseInt(quantity, 10);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                Brand: { select: { qrPricePerUnit: true } }
            }
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.status !== 'active') {
            return res.status(400).json({ message: 'Campaign is not active' });
        }

        const rawCashback = cashbackAmount ?? campaign.cashbackAmount;
        const qrCashback = parseFloat(rawCashback);
        if (isNaN(qrCashback) || qrCashback <= 0) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const printCostPerQr = resolveTechFeePerQr({
            vendor,
            brand: campaign?.Brand
        });
        const totalPrintCost = printCostPerQr * parsedQuantity;

        // Create order (status: pending)
        const order = await prisma.qROrder.create({
            data: {
                vendorId: vendor.id,
                campaignId,
                quantity: parsedQuantity,
                cashbackAmount: qrCashback,
                printCost: printCostPerQr,
                totalAmount: totalPrintCost,
                status: 'pending'
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'qr_order_create',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: {
                orderId: order.id,
                quantity: parsedQuantity,
                cashbackAmount: qrCashback,
                totalAmount: totalPrintCost
            },
            req
        });
        res.status(201).json({
            message: 'Order created. Please pay to confirm.',
            order: {
                id: order.id,
                campaignTitle: campaign.title,
                quantity: order.quantity,
                cashbackAmount: Number(order.cashbackAmount),
                printCost: Number(order.printCost),
                totalAmount: Number(order.totalAmount),
                status: order.status
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Order creation failed', error: error.message });
    }
};

exports.payOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const requestedSeries = normalizeSeriesCode(req.body?.seriesCode, null);

        const order = await prisma.qROrder.findUnique({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ message: `Order already ${order.status}` });
        }

        const result = await prisma.$transaction(async (tx) => {
            const { vendor } = await ensureVendorAndWallet(req.user.id, tx);
            if (order.vendorId !== vendor.id) {
                const error = new Error('Unauthorized');
                error.status = 403;
                throw error;
            }

            const campaign = await tx.campaign.findUnique({
                where: { id: order.campaignId },
                include: {
                    Brand: { select: { id: true, vendorId: true, qrPricePerUnit: true } }
                }
            });
            if (!campaign || campaign.Brand?.vendorId !== vendor.id || campaign.deletedAt) {
                const error = new Error('Campaign not found or unauthorized');
                error.status = 404;
                throw error;
            }
            if (campaign.status !== 'active') {
                const error = new Error('Campaign must be active before paying order');
                error.status = 400;
                throw error;
            }

            const quantity = Number.parseInt(order.quantity, 10);
            const qrCashback = toPositiveAmount(order.cashbackAmount);
            if (!Number.isFinite(quantity) || quantity <= 0 || !qrCashback) {
                const error = new Error('Order contains invalid quantity or cashback');
                error.status = 400;
                throw error;
            }

            const printCostPerQr = Number(order.printCost || resolveTechFeePerQr({ vendor, brand: campaign.Brand }));
            const techFeeSubtotal = toNumber(printCostPerQr * quantity, 0);
            const techFeeTax = toNumber(techFeeSubtotal * INVOICE_GST_RATE, 0);
            const techFeeTotal = toNumber(techFeeSubtotal + techFeeTax, 0);
            const cashbackTotal = toNumber(qrCashback * quantity, 0);

            const campaignBudget = await tx.campaignBudget.create({
                data: {
                    campaignId: campaign.id,
                    vendorId: vendor.id,
                    initialLockedAmount: cashbackTotal,
                    lockedAmount: cashbackTotal,
                    spentAmount: 0,
                    refundedAmount: 0,
                    status: 'active'
                }
            });

            const feeInvoice = await createFinanceInvoice(tx, {
                vendorId: vendor.id,
                brandId: campaign.Brand?.id,
                campaignBudgetId: campaignBudget.id,
                type: 'FEE_TAX_INVOICE',
                subtotal: techFeeSubtotal,
                tax: techFeeTax,
                label: `Technology fee for order #${order.id.slice(-6)}`,
                metadata: {
                    campaignId: campaign.id,
                    orderId: order.id,
                    quantity,
                    feePerQr: printCostPerQr
                }
            });

            const depositInvoice = await createFinanceInvoice(tx, {
                vendorId: vendor.id,
                brandId: campaign.Brand?.id,
                campaignBudgetId: campaignBudget.id,
                type: 'DEPOSIT_RECEIPT',
                subtotal: cashbackTotal,
                tax: 0,
                label: `Cashback locked for order #${order.id.slice(-6)}`,
                metadata: {
                    campaignId: campaign.id,
                    orderId: order.id,
                    quantity,
                    cashbackAmount: qrCashback
                }
            });

            await chargeFee(tx, vendor.id, techFeeTotal, {
                referenceId: order.id,
                campaignBudgetId: campaignBudget.id,
                invoiceId: feeInvoice.id,
                description: `Technology fee for QR order #${order.id.slice(-6)}`,
                metadata: {
                    campaignId: campaign.id,
                    quantity
                }
            });

            await lock(tx, vendor.id, cashbackTotal, {
                referenceId: order.id,
                campaignBudgetId: campaignBudget.id,
                invoiceId: depositInvoice.id,
                description: `Cashback locked for QR order #${order.id.slice(-6)}`,
                metadata: {
                    campaignId: campaign.id,
                    quantity
                }
            });

            const fundedQrs = await allocateInventoryQrs(tx, {
                vendorId: vendor.id,
                campaignId: campaign.id,
                campaignBudgetId: campaignBudget.id,
                quantity,
                cashbackAmount: qrCashback,
                orderId: order.id,
                seriesCode: requestedSeries
            });

            const updatedOrder = await tx.qROrder.update({
                where: { id: order.id },
                data: {
                    status: 'paid',
                    printCost: printCostPerQr,
                    totalAmount: techFeeTotal
                }
            });

            return {
                vendorId: vendor.id,
                campaignTitle: campaign.title,
                order: updatedOrder,
                totalPaid: toNumber(techFeeTotal + cashbackTotal, 0),
                selectedSeries: requestedSeries,
                fundedCount: fundedQrs.length
            };
        });

        await notifyAdminsAboutPaidOrder({
            order: result.order,
            vendor: { id: result.vendorId },
            campaignTitle: result.campaignTitle
        });

        await createVendorNotification({
            vendorId: result.vendorId,
            title: 'QR order paid',
            message: `Debited INR ${Number(result.totalPaid).toFixed(2)} for QR order #${result.order.id.slice(-6)} (${result.campaignTitle}).`,
            type: 'wallet-debit',
            metadata: {
                tab: 'wallet',
                orderId: result.order.id,
                campaignId: result.order.campaignId,
                amount: Number(result.totalPaid)
            }
        });

        res.json({
            message: 'Payment successful. QRs funded from inventory.',
            order: {
                id: result.order.id,
                status: result.order.status,
                quantity: result.order.quantity,
                fundedCount: result.fundedCount,
                totalPaid: result.totalPaid,
                selectedSeries: result.selectedSeries
            }
        });

        safeLogVendorActivity({
            vendorId: result.vendorId,
            action: 'qr_order_pay',
            entityType: 'order',
            entityId: result.order.id,
            metadata: {
                campaignId: result.order.campaignId,
                quantity: result.order.quantity,
                totalPaid: result.totalPaid,
                selectedSeries: result.selectedSeries
            },
            req
        });
    } catch (error) {
        res.status(error.status || 500).json({ message: 'Payment failed', error: error.message });
    }
};



exports.payCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const requestedSeries = normalizeSeriesCode(req.body?.seriesCode, null);

        const result = await prisma.$transaction(async (tx) => {
            const { vendor } = await ensureVendorAndWallet(req.user.id, tx);

            const campaign = await tx.campaign.findUnique({
                where: { id },
                include: {
                    Brand: { select: { id: true, qrPricePerUnit: true, vendorId: true } }
                }
            });
            if (!campaign || campaign.Brand?.vendorId !== vendor.id) {
                const error = new Error('Campaign not found');
                error.status = 404;
                throw error;
            }

            if (campaign.deletedAt) {
                const error = new Error('Campaign has been deleted');
                error.status = 400;
                throw error;
            }

            if (campaign.status === 'active') {
                const error = new Error('Campaign is already active');
                error.status = 400;
                throw error;
            }

            const allocArray = Array.isArray(campaign.allocations)
                ? campaign.allocations
                : [];
            const hasAnyQtyRow = allocArray.some((alloc) => (Number.parseInt(alloc?.quantity, 10) || 0) > 0);
            const hasPositiveCashbackRow = allocArray.some((alloc) => {
                const quantity = Number.parseInt(alloc?.quantity, 10) || 0;
                const cashback = toPositiveAmount(alloc?.cashbackAmount) || 0;
                return quantity > 0 && cashback > 0;
            });
            const inferredPostpaidCampaign =
                campaign.planType !== 'postpaid' &&
                hasAnyQtyRow &&
                !hasPositiveCashbackRow &&
                toNumber(campaign.subtotal, 0) <= 0 &&
                toNumber(campaign.totalBudget, 0) <= 0 &&
                !toPositiveAmount(campaign.cashbackAmount);
            const isPostpaidCampaign = campaign.planType === 'postpaid' || inferredPostpaidCampaign;

            if (inferredPostpaidCampaign) {
                await tx.campaign.update({
                    where: { id: campaign.id },
                    data: { planType: 'postpaid' }
                });
            }

            const normalizedRows = allocArray
                .map((alloc) => ({
                    quantity: Number.parseInt(alloc?.quantity, 10) || 0,
                    cashbackAmount: toPositiveAmount(alloc?.cashbackAmount) || 0
                }))
                .filter((row) => row.quantity > 0 && (isPostpaidCampaign || row.cashbackAmount > 0));

            if (!normalizedRows.length) {
                const error = new Error('Campaign has no valid allocations to fund');
                error.status = 400;
                throw error;
            }

            const totalQty = normalizedRows.reduce((sum, row) => sum + row.quantity, 0);
            const cashbackTotal = toNumber(
                normalizedRows.reduce((sum, row) => sum + row.quantity * row.cashbackAmount, 0),
                0
            );
            const printCostPerQr = resolveTechFeePerQr({
                vendor,
                brand: campaign?.Brand
            });
            const techFeeSubtotal = toNumber(totalQty * printCostPerQr, 0);
            const techFeeTax = toNumber(techFeeSubtotal * INVOICE_GST_RATE, 0);
            const techFeeTotal = toNumber(techFeeSubtotal + techFeeTax, 0);

            // Voucher type fee per QR
            const VOUCHER_FEE_MAP = { digital_voucher: 0.20, printed_qr: 0.50, none: 0 };
            const voucherFeePerQr = toNumber(VOUCHER_FEE_MAP[campaign.voucherType] || 0, 0);
            const voucherFeeSubtotal = toNumber(totalQty * voucherFeePerQr, 0);
            const voucherFeeTax = toNumber(voucherFeeSubtotal * INVOICE_GST_RATE, 0);
            const voucherFeeTotal = toNumber(voucherFeeSubtotal + voucherFeeTax, 0);

            const totalCost = toNumber(cashbackTotal + techFeeTotal + voucherFeeTotal, 0);

            const campaignBudget = await tx.campaignBudget.create({
                data: {
                    campaignId: campaign.id,
                    vendorId: vendor.id,
                    initialLockedAmount: cashbackTotal,
                    lockedAmount: cashbackTotal,
                    spentAmount: 0,
                    refundedAmount: 0,
                    status: 'active'
                }
            });

            const feeInvoice = await createFinanceInvoice(tx, {
                vendorId: vendor.id,
                brandId: campaign.Brand?.id,
                campaignBudgetId: campaignBudget.id,
                type: 'FEE_TAX_INVOICE',
                subtotal: techFeeSubtotal,
                tax: techFeeTax,
                label: `Technology fee for campaign ${campaign.title}`,
                metadata: {
                    campaignId: campaign.id,
                    quantity: totalQty,
                    feePerQr: printCostPerQr
                }
            });

            // Charge tech fee if applicable
            if (techFeeTotal > 0) {
                await chargeFee(tx, vendor.id, techFeeTotal, {
                    referenceId: campaign.id,
                    campaignBudgetId: campaignBudget.id,
                    invoiceId: feeInvoice.id,
                    description: `Technology fee for campaign ${campaign.title}`,
                    metadata: {
                        campaignId: campaign.id,
                        quantity: totalQty
                    }
                });
            }

            // Only create deposit invoice and lock funds if there's cashback to lock (skip for postpaid)
            if (cashbackTotal > 0) {
                const depositInvoice = await createFinanceInvoice(tx, {
                    vendorId: vendor.id,
                    brandId: campaign.Brand?.id,
                    campaignBudgetId: campaignBudget.id,
                    type: 'DEPOSIT_RECEIPT',
                    subtotal: cashbackTotal,
                    tax: 0,
                    label: `Cashback locked for campaign ${campaign.title}`,
                    metadata: {
                        campaignId: campaign.id,
                        quantity: totalQty
                    }
                });

                await lock(tx, vendor.id, cashbackTotal, {
                    referenceId: campaign.id,
                    campaignBudgetId: campaignBudget.id,
                    invoiceId: depositInvoice.id,
                    description: `Cashback locked for campaign ${campaign.title}`,
                    metadata: {
                        campaignId: campaign.id,
                        quantity: totalQty
                    }
                });
            }

            // Charge voucher fee if applicable
            if (voucherFeeTotal > 0) {
                const voucherInvoice = await createFinanceInvoice(tx, {
                    vendorId: vendor.id,
                    brandId: campaign.Brand?.id,
                    campaignBudgetId: campaignBudget.id,
                    type: 'FEE_TAX_INVOICE',
                    subtotal: voucherFeeSubtotal,
                    tax: voucherFeeTax,
                    label: `Voucher fee (${campaign.voucherType}) for campaign ${campaign.title}`,
                    metadata: {
                        campaignId: campaign.id,
                        quantity: totalQty,
                        feePerQr: voucherFeePerQr,
                        voucherType: campaign.voucherType
                    }
                });

                await chargeFee(tx, vendor.id, voucherFeeTotal, {
                    referenceId: campaign.id,
                    campaignBudgetId: campaignBudget.id,
                    invoiceId: voucherInvoice.id,
                    category: 'tech_fee_charge',
                    description: `Voucher fee (${campaign.voucherType}) for campaign ${campaign.title}`,
                    metadata: {
                        campaignId: campaign.id,
                        quantity: totalQty,
                        voucherType: campaign.voucherType
                    }
                });
            }

            let fundedCount = 0;
            for (const row of normalizedRows) {
                const fundedQrs = await allocateInventoryQrs(tx, {
                    vendorId: vendor.id,
                    campaignId: campaign.id,
                    campaignBudgetId: campaignBudget.id,
                    quantity: row.quantity,
                    cashbackAmount: row.cashbackAmount,
                    orderId: null,
                    seriesCode: requestedSeries
                });
                fundedCount += fundedQrs.length;
            }

            await tx.campaign.update({
                where: { id: campaign.id },
                data: { status: 'active' }
            });

            return {
                vendorId: vendor.id,
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                totalCost,
                totalQty,
                printCost: techFeeTotal,
                voucherCost: voucherFeeTotal,
                baseBudget: cashbackTotal,
                fundedCount,
                selectedSeries: requestedSeries
            };
        }, { timeout: 30000 });

        safeLogVendorActivity({
            vendorId: result.vendorId,
            action: 'campaign_pay',
            entityType: 'campaign',
            entityId: id,
            metadata: {
                totalCost: result.totalCost,
                totalQty: result.totalQty,
                printCost: result.printCost,
                baseBudget: result.baseBudget,
                fundedCount: result.fundedCount,
                selectedSeries: result.selectedSeries
            },
            req
        });
        await createVendorNotification({
            vendorId: result.vendorId,
            title: 'Campaign activated',
            message: `Debited INR ${Number(result.totalCost).toFixed(2)} to activate campaign "${result.campaignTitle}".`,
            type: 'wallet-debit',
            metadata: {
                tab: 'campaigns',
                campaignId: result.campaignId,
                amount: Number(result.totalCost),
                fundedCount: result.fundedCount,
                selectedSeries: result.selectedSeries
            }
        });
        res.json({
            message: 'Campaign payment successful. Campaign is now active.',
            fundedCount: result.fundedCount,
            selectedSeries: result.selectedSeries
        });

    } catch (error) {
        console.error('Campaign Payment Error:', error);
        res.status(error.status || 500).json({ message: 'Payment failed', error: error.message });
    }
};

// Download QR PDF for an order
const { generateQrPdf } = require('../utils/qrPdfGenerator');

const resolveCampaignProductName = async (campaign) => {
    if (!campaign) return null;

    if (campaign?.Product?.name) {
        return campaign.Product.name;
    }

    const allocations = Array.isArray(campaign?.allocations) ? campaign.allocations : [];
    const fallbackProductId = allocations.find((alloc) => alloc?.productId)?.productId;
    if (!fallbackProductId) return null;

    const fallbackProduct = await prisma.product.findUnique({
        where: { id: fallbackProductId },
        select: { name: true }
    });
    return fallbackProduct?.name || null;
};

exports.downloadOrderQrPdf = async (req, res) => {
    try {
        const { orderId } = req.params;
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }

        // Get order and verify ownership
        const order = await prisma.qROrder.findUnique({
            where: { id: orderId },
            include: {
                QRCodes: {
                    select: { uniqueHash: true, cashbackAmount: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized access to this order' });
        }

        if (order.status !== 'paid') {
            return res.status(400).json({ message: 'PDF is only available for paid orders' });
        }

        if (!order.QRCodes || order.QRCodes.length === 0) {
            return res.status(400).json({ message: 'No QR codes found for this order' });
        }

        // Get campaign title
        const campaign = await prisma.campaign.findUnique({
            where: { id: order.campaignId },
            select: {
                title: true,
                allocations: true,
                Product: { select: { name: true } },
                Brand: { select: { name: true, logoUrl: true } }
            }
        });
        const productName = await resolveCampaignProductName(campaign);

        // Generate PDF
        const pdfBuffer = await generateQrPdf({
            qrCodes: order.QRCodes,
            campaignTitle: campaign?.title || 'Campaign',
            orderId: order.id,
            brandName: campaign?.Brand?.name,
            brandLogoUrl: campaign?.Brand?.logoUrl,
            productName
        });

        // Send PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="QR_Order_${orderId.slice(-8)}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'qr_pdf_download',
            entityType: 'order',
            entityId: orderId,
            metadata: { qrCount: order.QRCodes.length },
            req
        });

        try {
            await createVendorNotification({
                vendorId: vendor.id,
                title: 'Order PDF downloaded',
                message: `Downloaded QR PDF for order #${order.id.slice(-6)} (${campaign?.title || 'Campaign'}).`,
                type: 'pdf-downloaded',
                metadata: {
                    tab: 'campaigns',
                    orderId: order.id,
                    campaignId: order.campaignId,
                    qrCount: order.QRCodes.length
                }
            });
        } catch (notificationError) {
            console.error('Order PDF notification error:', notificationError.message);
        }

    } catch (error) {
        console.error('PDF Download Error:', error);
        if (res.headersSent) return;
        res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
    }
};

exports.downloadVendorInventoryQrPdf = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }

        const requestedSeries = normalizeSeriesCode(req.query?.seriesCode, null);
        const parsedLimit = Number.parseInt(req.query?.limit, 10);
        const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 5000)
            : 2000;

        const where = {
            vendorId: vendor.id,
            status: 'inventory'
        };
        if (requestedSeries) {
            where.seriesCode = requestedSeries;
        }

        const qrCodes = await prisma.qRCode.findMany({
            where,
            orderBy: [
                { seriesCode: 'asc' },
                { seriesOrder: 'asc' },
                { createdAt: 'asc' }
            ],
            take: safeLimit,
            select: {
                uniqueHash: true,
                cashbackAmount: true
            }
        });

        if (!qrCodes.length) {
            return res.status(404).json({
                message: requestedSeries
                    ? `No inventory QR codes available for series "${requestedSeries}".`
                    : 'No inventory QR codes available for download.'
            });
        }

        const sheetLabel = requestedSeries
            ? `Prebuilt Inventory (${requestedSeries})`
            : 'Prebuilt Inventory (All Series)';

        const pdfBuffer = await generateQrPdf({
            qrCodes,
            campaignTitle: sheetLabel,
            orderId: `inventory-${vendor.id.slice(-6)}`,
            brandName: vendor.businessName || 'Vendor'
        });

        const fileSuffix = requestedSeries ? requestedSeries.replace(/[^a-z0-9_-]+/gi, '_') : 'all';
        const fileName = `QR_Inventory_${fileSuffix}_${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'inventory_qr_pdf_download',
            entityType: 'qr',
            metadata: {
                seriesCode: requestedSeries,
                qrCount: qrCodes.length
            },
            req
        });
    } catch (error) {
        if (res.headersSent) return;
        res.status(500).json({ message: 'Failed to generate inventory PDF', error: error.message });
    }
};

// Assign cashback amount to QRs by sheet (A=0-24, B=25-49, etc.) for postpaid campaigns
exports.assignSheetCashback = async (req, res) => {
    try {
        const { id: campaignId } = req.params;
        const { sheetIndex, cashbackAmount } = req.body;

        const parsedSheet = Number.parseInt(sheetIndex, 10);
        const parsedAmount = Number.parseFloat(cashbackAmount);

        if (!Number.isFinite(parsedSheet) || parsedSheet < 0) {
            return res.status(400).json({ message: 'Invalid sheet index' });
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const { vendor } = await ensureVendorAndWallet(req.user.id);

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { Brand: { select: { vendorId: true } } }
        });

        if (!campaign || campaign.Brand?.vendorId !== vendor.id) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.planType !== 'postpaid') {
            return res.status(400).json({ message: 'Sheet cashback assignment is only available for postpaid campaigns' });
        }

        // Get all campaign QRs ordered by creation to determine sheet position
        const allQrs = await prisma.qRCode.findMany({
            where: {
                campaignId,
                status: { in: ['funded', 'generated', 'active', 'assigned'] }
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { id: true }
        });

        const QRS_PER_SHEET = 25;
        const start = parsedSheet * QRS_PER_SHEET;
        const end = start + QRS_PER_SHEET;
        const sheetQrIds = allQrs.slice(start, end).map(qr => qr.id);

        if (!sheetQrIds.length) {
            return res.status(400).json({ message: 'No QR codes found for this sheet' });
        }

        const updated = await prisma.qRCode.updateMany({
            where: { id: { in: sheetQrIds } },
            data: { cashbackAmount: parsedAmount }
        });

        // Recalculate campaign total budget based on ALL QRs
        const aggregate = await prisma.qRCode.aggregate({
            where: { campaignId },
            _sum: { cashbackAmount: true }
        });
        const totalCashback = aggregate._sum.cashbackAmount || 0;

        await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                subtotal: totalCashback,
                totalBudget: totalCashback
            }
        });

        const toRomanLabel = (n) => { const v=[1000,900,500,400,100,90,50,40,10,9,5,4,1], s=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']; let r='',x=Math.max(1,Math.floor(n)); for(let i=0;i<v.length;i++){while(x>=v[i]){r+=s[i];x-=v[i];}} return r; };
        const sheetLabel = toRomanLabel(parsedSheet + 1);

        res.json({
            message: `Updated ${updated.count} QR codes on Sheet ${sheetLabel} to Rs. ${parsedAmount}`,
            totalBudget: totalCashback,
            updated: updated.count,
            sheetLabel
        });
    } catch (error) {
        console.error('Assign Sheet Cashback Error:', error);
        res.status(500).json({ message: 'Failed to assign cashback', error: error.message });
    }
};

// Pay for a specific sheet's cashback (Postpaid)
exports.paySheetCashback = async (req, res) => {
    try {
        const { id: campaignId } = req.params;
        const { sheetIndex, cashbackAmount } = req.body;

        const parsedSheet = Number.parseInt(sheetIndex, 10);
        const parsedAmount = Number.parseFloat(cashbackAmount);

        if (!Number.isFinite(parsedSheet) || parsedSheet < 0) {
            return res.status(400).json({ message: 'Invalid sheet index' });
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const { vendor, wallet } = await ensureVendorAndWallet(req.user.id, tx);

            const campaign = await tx.campaign.findUnique({
                where: { id: campaignId },
                include: { Brand: true }
            });

            if (!campaign || campaign.Brand?.vendorId !== vendor.id) {
                throw new Error('Campaign not found');
            }
            if (campaign.planType !== 'postpaid') {
                throw new Error('Sheet payment is only for postpaid campaigns');
            }

            // Calculate total for this sheet
            const QRS_PER_SHEET = 25;
            const allQrsCount = await tx.qRCode.count({
                where: { campaignId, status: { in: ['funded', 'generated', 'active', 'assigned'] } }
            });

            const start = parsedSheet * QRS_PER_SHEET;
            const end = start + QRS_PER_SHEET;
            const sheetQrCount = Math.max(0, Math.min(QRS_PER_SHEET, allQrsCount - start));

            if (sheetQrCount <= 0) {
                throw new Error('No QR codes found for this sheet');
            }

            // 1. Cashback Total (to be locked, no GST)
            const cashbackTotal = toNumber(parsedAmount * sheetQrCount, 0);
            const totalToPay = cashbackTotal;

            if (wallet.balance < totalToPay) {
                throw new Error(`Insufficient wallet balance. Required: Rs. ${totalToPay.toFixed(2)}`);
            }

            // Ensure budget exists
            let campaignBudget = await tx.campaignBudget.findFirst({
                 where: { campaignId, status: 'active' }
            });

            if (!campaignBudget) {
                 campaignBudget = await tx.campaignBudget.create({
                     data: {
                         campaignId,
                         vendorId: vendor.id,
                         initialLockedAmount: 0,
                         lockedAmount: 0,
                         spentAmount: 0,
                         status: 'active'
                     }
                 });
            }

            // --- LOCK CASHBACK (Asset) ---

            if (cashbackTotal > 0) {
                const depositInvoice = await createFinanceInvoice(tx, {
                    vendorId: vendor.id,
                    brandId: campaign.Brand?.id,
                    campaignBudgetId: campaignBudget.id,
                    type: 'DEPOSIT_RECEIPT',
                    subtotal: cashbackTotal,
                    tax: 0,
                    label: `Cashback locked for Sheet ${parsedSheet + 1} (${sheetQrCount} QRs @ Rs. ${parsedAmount})`,
                    metadata: {
                        campaignId,
                        sheetIndex: parsedSheet,
                        count: sheetQrCount,
                        rate: parsedAmount
                    }
                });

                await lock(tx, vendor.id, cashbackTotal, {
                    referenceId: campaign.id,
                    campaignBudgetId: campaignBudget.id,
                    invoiceId: depositInvoice.id,
                    description: `Cashback locked for Sheet ${parsedSheet + 1}`,
                    metadata: {
                        campaignId,
                        sheetIndex: parsedSheet
                    }
                });
                
                // Update budget total
                await tx.campaignBudget.update({
                    where: { id: campaignBudget.id },
                    data: { 
                        lockedAmount: { increment: cashbackTotal },
                        initialLockedAmount: { increment: cashbackTotal }
                    }
                });
            }

            // Ensure Campaign.subtotal/totalBudget are also updated to match current state
            const aggregate = await tx.qRCode.aggregate({
                where: { campaignId },
                _sum: { cashbackAmount: true }
            });
            const totalCashback = aggregate._sum.cashbackAmount || 0;

            await tx.campaign.update({
                where: { id: campaignId },
                data: {
                    subtotal: totalCashback,
                    totalBudget: totalCashback
                }
            });

            return { totalPaid: totalToPay, sheetQrCount, techFeeTotal: 0, voucherFeeTotal: 0, cashbackTotal, campaignTotalBudget: totalCashback };
        });

        res.json({
            message: `Successfully paid Rs. ${result.totalPaid.toFixed(2)} for ${result.sheetQrCount} QRs.`,
            ...result
        });

    } catch (error) {
        console.error('Pay Sheet Cashback Error:', error);
        res.status(500).json({ message: error.message || 'Failed to pay for sheet' });
    }
};

// Download QR PDF for a campaign (already funded/redeemed QRs only)
exports.downloadCampaignQrPdf = async (req, res) => {
    try {
        const requestStartedAt = Date.now();
        const marks = {};
        const mark = (key) => {
            marks[key] = Date.now();
        };
        const { id: campaignId } = req.params;
        const explicitFastModeRequested = ['1', 'true', 'yes'].includes(String(req.query?.fast || '').toLowerCase());
        const skipLogoRequested = ['1', 'true', 'yes'].includes(String(req.query?.skipLogo || '').toLowerCase());
        const parsedSheetIndex = Number.parseInt(req.query?.sheetIndex, 10);
        const hasRequestedSheet =
            Number.isFinite(parsedSheetIndex) && parsedSheetIndex >= 0;
        const sheetLabelFor = (index) => {
            const v=[1000,900,500,400,100,90,50,40,10,9,5,4,1], s=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
            let r='', n=Math.max(1,Math.floor(index+1));
            for(let i=0;i<v.length;i++){while(n>=v[i]){r+=s[i];n-=v[i];}}
            return r;
        };

        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }
        mark('vendorLookup');

        // Get campaign and verify ownership
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                Product: { select: { name: true } },
                Brand: { select: { vendorId: true, name: true, logoUrl: true } }
            }
        });

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.Brand.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized access to this campaign' });
        }

        if (campaign.status !== 'active') {
            return res.status(400).json({ message: 'PDF is only available for active campaigns' });
        }
        mark('campaignLookup');

        const qrWhere = {
            campaignId,
            status: {
                in: ['funded', 'redeemed', 'generated', 'active', 'assigned']
            }
        };

        const isSheetScopedPostpaid =
            campaign.planType === 'postpaid' && hasRequestedSheet;
        const fastModeRequested = explicitFastModeRequested || isSheetScopedPostpaid;
        const QRS_PER_SHEET = 25;
        const needsCampaignQrCount = !(isSheetScopedPostpaid && fastModeRequested);
        const totalCampaignQrCount = needsCampaignQrCount
            ? await prisma.qRCode.count({ where: qrWhere })
            : null;

        if (
            isSheetScopedPostpaid &&
            Number.isFinite(totalCampaignQrCount) &&
            parsedSheetIndex * QRS_PER_SHEET >= totalCampaignQrCount
        ) {
            return res.status(400).json({ message: 'Invalid sheet selected for download' });
        }

        const qrCodes = await prisma.qRCode.findMany({
            where: qrWhere,
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            ...(isSheetScopedPostpaid
                ? {
                    skip: parsedSheetIndex * QRS_PER_SHEET,
                    take: QRS_PER_SHEET
                }
                : {}),
            select: { uniqueHash: true, cashbackAmount: true }
        });
        mark('qrFetch');

        if (!qrCodes.length) {
            return res.status(400).json({
                message: isSheetScopedPostpaid
                    ? `No QR codes found for Sheet ${sheetLabelFor(parsedSheetIndex)}.`
                    : 'No funded QRs found for this campaign. Recharge inventory first, then download.'
            });
        }
        const normalizedQrCodes = Array.isArray(qrCodes) ? qrCodes.map((item) => ({ ...item })) : [];

        // For postpaid campaigns, use paid sheet lock transactions as source-of-truth for PDF display.
        // In fast mode, skip this expensive remap to keep sheet download latency minimal.
        if (campaign.planType === 'postpaid' && !fastModeRequested) {
            const lockTransactions = await prisma.transaction.findMany({
                where: {
                    referenceId: campaignId,
                    category: 'lock_funds',
                    status: 'success'
                },
                select: {
                    amount: true,
                    metadata: true
                }
            });

            const paidBySheet = new Map();
            lockTransactions.forEach((tx) => {
                const sheetIndex = Number.parseInt(tx?.metadata?.sheetIndex, 10);
                if (!Number.isFinite(sheetIndex) || sheetIndex < 0) return;
                const prev = Number(paidBySheet.get(sheetIndex) || 0);
                const next = toNumber(prev + toNumber(tx?.amount, 0), 0);
                paidBySheet.set(sheetIndex, next);
            });

            if (isSheetScopedPostpaid) {
                const sheetCount = normalizedQrCodes.length;
                const paidTotal = toNumber(paidBySheet.get(parsedSheetIndex), 0);
                const perQrCashback =
                    paidTotal > 0 && sheetCount > 0
                        ? toNumber(paidTotal / sheetCount, 0)
                        : 0;

                normalizedQrCodes.forEach((qr) => {
                    qr.cashbackAmount = perQrCashback;
                });
            } else {
                normalizedQrCodes.forEach((qr, index) => {
                    const sheetIndex = Math.floor(index / QRS_PER_SHEET);
                    const sheetStart = sheetIndex * QRS_PER_SHEET;
                    const sheetCount = Math.min(QRS_PER_SHEET, normalizedQrCodes.length - sheetStart);
                    const paidTotal = toNumber(paidBySheet.get(sheetIndex), 0);
                    if (paidTotal > 0 && sheetCount > 0) {
                        qr.cashbackAmount = toNumber(paidTotal / sheetCount, 0);
                    } else {
                        // Unpaid sheets must not display assigned cashback in downloaded PDF.
                        qr.cashbackAmount = 0;
                    }
                });
            }
        }
        const productName = fastModeRequested
            ? campaign?.Product?.name || null
            : await resolveCampaignProductName(campaign);
        const isCompactPostpaidDownload =
            campaign.planType === 'postpaid' &&
            (fastModeRequested || normalizedQrCodes.every((qr) => toNumber(qr?.cashbackAmount, 0) <= 0));
        const totalSheetCountForPdf =
            campaign.planType === 'postpaid'
                ? Number.isFinite(totalCampaignQrCount)
                    ? Math.max(1, Math.ceil(totalCampaignQrCount / QRS_PER_SHEET))
                    : undefined
                : undefined;
        const downloadSheetLabel =
            isSheetScopedPostpaid ? sheetLabelFor(parsedSheetIndex) : null;
        const shouldSkipBrandLogo = skipLogoRequested || (campaign.planType === 'postpaid' && fastModeRequested);

        const pdfBuffer = await generateQrPdf({
            qrCodes: normalizedQrCodes,
            campaignTitle: campaign.title,
            orderId: campaignId,
            brandName: campaign.Brand.name,
            brandLogoUrl: shouldSkipBrandLogo ? null : campaign.Brand.logoUrl,
            planType: campaign.planType,
            productName,
            compactMode: isCompactPostpaidDownload,
            startSheetIndex: isSheetScopedPostpaid ? parsedSheetIndex : 0,
            totalSheetCount: totalSheetCountForPdf
        });
        mark('pdfReady');

        const fileName = isSheetScopedPostpaid
            ? `QR_Campaign_${campaignId.slice(-8)}_Sheet_${downloadSheetLabel}.pdf`
            : `QR_Campaign_${campaignId.slice(-8)}.pdf`;
        const setupMs = Math.max(0, (marks.campaignLookup || Date.now()) - requestStartedAt);
        const dbMs = Math.max(0, (marks.qrFetch || Date.now()) - (marks.campaignLookup || requestStartedAt));
        const pdfMs = Math.max(0, (marks.pdfReady || Date.now()) - (marks.qrFetch || requestStartedAt));
        const totalMs = Date.now() - requestStartedAt;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('X-PDF-Fast-Mode', fastModeRequested ? '1' : '0');
        res.setHeader('X-PDF-Skip-Logo', shouldSkipBrandLogo ? '1' : '0');
        res.setHeader('X-PDF-QR-Count', String(normalizedQrCodes.length));
        res.setHeader('X-PDF-Total-Ms', String(totalMs));
        res.setHeader(
            'Server-Timing',
            `setup;dur=${setupMs},db;dur=${dbMs},pdf;dur=${pdfMs},total;dur=${totalMs}`
        );
        res.send(pdfBuffer);

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_qr_pdf_download',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: {
                qrCount: normalizedQrCodes.length,
                sheetIndex: isSheetScopedPostpaid ? parsedSheetIndex : null
            },
            req
        });

        try {
            await createVendorNotification({
                vendorId: vendor.id,
                title: 'Campaign PDF downloaded',
                message: isSheetScopedPostpaid
                    ? `Downloaded Sheet ${downloadSheetLabel} QR PDF for campaign "${campaign.title}".`
                    : `Downloaded QR PDF for campaign "${campaign.title}".`,
                type: 'pdf-downloaded',
                metadata: {
                    tab: 'campaigns',
                    campaignId,
                    qrCount: normalizedQrCodes.length,
                    sheetIndex: isSheetScopedPostpaid ? parsedSheetIndex : null
                }
            });
        } catch (notificationError) {
            console.error('Campaign PDF notification error:', notificationError.message);
        }

    } catch (error) {
        if (res.headersSent) return;
        res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
    }
};

// Helper: Mask phone number (e.g., 9876543210 -> 98****3210)
const maskPhone = (phone) => {
    if (!phone || phone.length < 6) return '****';
    return phone.slice(0, 2) + '****' + phone.slice(-4);
};

// Helper: Mask name (e.g., John Doe -> J***e)
const maskName = (name) => {
    if (!name || name.length < 2) return '****';
    return name[0] + '***' + name.slice(-1);
};

// B11: Get Vendor Redemptions (Masked Customer Data)
exports.getVendorRedemptions = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const { page, limit, skip } = parsePagination(req);
        const { campaignId, startDate, endDate } = req.query;

        // Build filter: Get all redeemed QRs from vendor's campaigns
        const whereClause = {
            status: 'redeemed',
            Campaign: {
                Brand: { vendorId: vendor.id }
            }
        };

        if (campaignId) {
            whereClause.campaignId = campaignId;
        }

        if (startDate || endDate) {
            whereClause.redeemedAt = {};
            if (startDate) whereClause.redeemedAt.gte = new Date(startDate);
            if (endDate) whereClause.redeemedAt.lte = new Date(endDate);
        }

        const [redemptions, total] = await Promise.all([
            prisma.qRCode.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { redeemedAt: 'desc' },
                include: {
                    Campaign: {
                        select: { id: true, title: true }
                    }
                }
            }),
            prisma.qRCode.count({ where: whereClause })
        ]);

        const userIds = Array.from(
            new Set(
                redemptions
                    .map((qr) => qr.redeemedByUserId)
                    .filter((id) => id)
            )
        );

        const users = userIds.length
            ? await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, phoneNumber: true }
            })
            : [];

        const userMap = new Map(users.map((user) => [user.id, user]));

        // Mask customer data
        const maskedRedemptions = redemptions.map((qr) => {
            const user = qr.redeemedByUserId ? userMap.get(qr.redeemedByUserId) : null;
            return {
                id: qr.id,
                uniqueHash: qr.uniqueHash.slice(-8), // Only show last 8 chars
                cashbackAmount: qr.cashbackAmount,
                redeemedAt: qr.redeemedAt,
                campaign: {
                    id: qr.Campaign?.id,
                    title: qr.Campaign?.title
                },
                customer: {
                    id: user?.id?.slice(-6),
                    name: maskName(user?.name),
                    phone: maskPhone(user?.phoneNumber)
                }
            };
        });

        res.json({
            redemptions: maskedRedemptions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'view_redemptions',
            entityType: 'redemption',
            metadata: { page, limit, total },
            req
        });

    } catch (error) {
        console.error('[VendorRedemptions] Error:', error);
        res.status(500).json({ message: 'Failed to fetch redemptions', error: error.message });
    }
};

// B13: Create Vendor Support Ticket
exports.createVendorSupportTicket = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const { subject, message, priority = 'medium' } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: req.user.id,
                subject,
                message,
                status: 'open'
            }
        });

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true }
        });

        if (admins.length) {
            const notifications = admins.map(admin => ({
                userId: admin.id,
                title: 'New Support Ticket',
                message: `Vendor "${vendor.businessName}" created a support ticket: ${subject}`,
                type: 'support_ticket',
                metadata: {
                    ticketId: ticket.id,
                    vendorId: vendor.id,
                    priority
                }
            }));
            await prisma.notification.createMany({ data: notifications });
        }

        res.status(201).json({
            success: true,
            message: 'Support ticket created',
            ticket
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'create_support_ticket',
            entityType: 'support_ticket',
            entityId: ticket.id,
            metadata: { subject, priority },
            req
        });

    } catch (error) {
        console.error('[VendorSupportTicket] Create Error:', error);
        res.status(500).json({ message: 'Failed to create support ticket', error: error.message });
    }
};

// B13: Get Vendor Support Tickets
exports.getVendorSupportTickets = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req);
        const { status } = req.query;

        const whereClause = { userId: req.user.id };
        if (status) whereClause.status = status;

        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.supportTicket.count({ where: whereClause })
        ]);

        res.json({
            tickets,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('[VendorSupportTicket] Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch support tickets', error: error.message });
    }
};

const escapeCsvValue = (value) => {
    const source = value === undefined || value === null ? '' : String(value);
    const escaped = source.replace(/"/g, '""');
    return `"${escaped}"`;
};

const buildRedemptionEventWhere = (vendor, query = {}) => {
    const where = {
        vendorId: vendor.id
    };

    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    if (query.campaignId) where.campaignId = query.campaignId;
    if (query.type) where.type = query.type;
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.state) where.state = { equals: query.state, mode: 'insensitive' };
    if (query.mobile) {
        where.User = {
            is: {
                phoneNumber: { contains: String(query.mobile).trim() }
            }
        };
    }
    if (query.productId) {
        where.Campaign = {
            is: {
                productId: query.productId
            }
        };
    }
    if (query.batchId) {
        where.QRCode = {
            is: {
                campaignBudgetId: query.batchId
            }
        };
    }
    if (query.ownerScan === 'true') {
        where.userId = vendor.userId;
    }
    if (query.nonOwnerScan === 'true') {
        where.OR = [
            { userId: { not: vendor.userId } },
            { userId: null }
        ];
    }

    return where;
};

const mapRedemptionEvent = (event) => {
    const userName = event?.User?.name || '';
    const maskedName = userName
        ? `${userName.charAt(0)}***${userName.charAt(userName.length - 1)}`
        : '****';
    const phone = event?.User?.phoneNumber || '';
    const maskedPhone = phone.length > 5 ? `${phone.slice(0, 2)}****${phone.slice(-4)}` : '****';

    return {
        id: event.id,
        createdAt: event.createdAt,
        amount: toNumber(event.amount, 0),
        type: event.type,
        city: event.city || null,
        state: event.state || null,
        pincode: event.pincode || null,
        lat: event.lat === null || event.lat === undefined ? null : Number(event.lat),
        lng: event.lng === null || event.lng === undefined ? null : Number(event.lng),
        accuracyMeters:
            event.accuracyMeters === null || event.accuracyMeters === undefined
                ? null
                : Number(event.accuracyMeters),
        qr: event.QRCode
            ? {
                id: event.QRCode.id,
                hash: event.QRCode.uniqueHash,
                campaignBudgetId: event.QRCode.campaignBudgetId || null
            }
            : null,
        campaign: event.Campaign
            ? {
                id: event.Campaign.id,
                title: event.Campaign.title
            }
            : null,
        customer: {
            id: event.userId || null,
            name: maskedName,
            phone: maskedPhone
        }
    };
};

exports.getVendorRedemptions = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const { page, limit, skip } = parsePagination(req, { defaultLimit: 25, maxLimit: 200 });
        const where = buildRedemptionEventWhere(vendor, req.query);
        const firstScanOnly = String(req.query.firstScanOnly || '').toLowerCase() === 'true';

        let firstScanUserIds = null;
        if (firstScanOnly) {
            const allEvents = await prisma.redemptionEvent.findMany({
                where: {
                    ...where,
                    userId: { not: null }
                },
                orderBy: { createdAt: 'asc' },
                select: { id: true, userId: true }
            });
            const seen = new Set();
            const allowedEventIds = [];
            allEvents.forEach((event) => {
                if (!event.userId || seen.has(event.userId)) return;
                seen.add(event.userId);
                allowedEventIds.push(event.id);
            });
            firstScanUserIds = allowedEventIds;
        }

        const whereClause =
            firstScanOnly && Array.isArray(firstScanUserIds)
                ? {
                    ...where,
                    id: {
                        in: firstScanUserIds.length ? firstScanUserIds : ['__none__']
                    }
                }
                : where;

        const [events, total] = await Promise.all([
            prisma.redemptionEvent.findMany({
                where: whereClause,
                include: {
                    Campaign: { select: { id: true, title: true } },
                    QRCode: { select: { id: true, uniqueHash: true, campaignBudgetId: true } },
                    User: { select: { id: true, name: true, phoneNumber: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.redemptionEvent.count({ where: whereClause })
        ]);

        res.json({
            redemptions: events.map(mapRedemptionEvent),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch redemptions', error: error.message });
    }
};

exports.exportVendorRedemptions = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const where = buildRedemptionEventWhere(vendor, req.query);

        const events = await prisma.redemptionEvent.findMany({
            where,
            include: {
                Campaign: { select: { title: true } },
                QRCode: { select: { uniqueHash: true, campaignBudgetId: true } },
                User: { select: { name: true, phoneNumber: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10000
        });

        const header = [
            'Date',
            'Type',
            'Amount',
            'Campaign',
            'QR Hash',
            'Batch ID',
            'City',
            'State',
            'Pincode',
            'Latitude',
            'Longitude',
            'AccuracyMeters',
            'Customer Name',
            'Customer Mobile'
        ];

        const rows = events.map((event) => [
            new Date(event.createdAt).toISOString(),
            event.type,
            toNumber(event.amount, 0).toFixed(2),
            event.Campaign?.title || '',
            event.QRCode?.uniqueHash || '',
            event.QRCode?.campaignBudgetId || '',
            event.city || '',
            event.state || '',
            event.pincode || '',
            event.lat !== null && event.lat !== undefined ? Number(event.lat).toString() : '',
            event.lng !== null && event.lng !== undefined ? Number(event.lng).toString() : '',
            event.accuracyMeters !== null && event.accuracyMeters !== undefined
                ? Number(event.accuracyMeters).toString()
                : '',
            event.User?.name || '',
            event.User?.phoneNumber || ''
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map(escapeCsvValue).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=\"vendor-redemptions-${Date.now()}.csv\"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: 'Failed to export redemptions', error: error.message });
    }
};

exports.getVendorRedemptionsMap = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const where = buildRedemptionEventWhere(vendor, req.query);
        where.type = req.query.type || 'redeem_success';
        where.lat = { not: null };
        where.lng = { not: null };

        const events = await prisma.redemptionEvent.findMany({
            where,
            select: {
                id: true,
                lat: true,
                lng: true,
                city: true,
                state: true,
                amount: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20000
        });

        const pointsMap = new Map();
        events.forEach((event) => {
            const lat = Number(event.lat);
            const lng = Number(event.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const key = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
            const current = pointsMap.get(key) || {
                lat: Number(lat.toFixed(4)),
                lng: Number(lng.toFixed(4)),
                count: 0,
                totalAmount: 0,
                city: event.city || null,
                state: event.state || null,
                latestAt: event.createdAt
            };
            current.count += 1;
            current.totalAmount = toNumber(current.totalAmount + Number(event.amount || 0), 0);
            if (new Date(event.createdAt) > new Date(current.latestAt)) {
                current.latestAt = event.createdAt;
            }
            pointsMap.set(key, current);
        });

        res.json({
            totalPoints: pointsMap.size,
            totalEvents: events.length,
            points: Array.from(pointsMap.values())
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch map data', error: error.message });
    }
};

exports.getVendorSummaryAnalytics = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const where = buildRedemptionEventWhere(vendor, req.query);
        where.type = 'redeem_success';

        const events = await prisma.redemptionEvent.findMany({
            where,
            select: {
                id: true,
                userId: true,
                city: true,
                amount: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' },
            take: 50000
        });

        const totalScans = events.length;
        const userCountMap = new Map();
        const cityCountMap = new Map();
        const trendMap = new Map();

        events.forEach((event) => {
            if (event.userId) {
                userCountMap.set(event.userId, (userCountMap.get(event.userId) || 0) + 1);
            }
            const cityKey = event.city ? event.city.trim() : 'Unknown';
            cityCountMap.set(cityKey, (cityCountMap.get(cityKey) || 0) + 1);

            const bucket = new Date(event.createdAt).toISOString().slice(0, 10);
            trendMap.set(bucket, (trendMap.get(bucket) || 0) + 1);
        });

        const uniqueUsers = userCountMap.size;
        const repeatedUsers = Array.from(userCountMap.values()).filter((count) => count > 1).length;

        let topCity = null;
        let topCityCount = 0;
        cityCountMap.forEach((count, city) => {
            if (count > topCityCount) {
                topCity = city;
                topCityCount = count;
            }
        });

        const trend = Array.from(trendMap.entries())
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .map(([date, count]) => ({ date, count }));

        res.json({
            summary: {
                totalScans,
                uniqueUsers,
                repeatedUsers,
                topCity,
                topCityCount
            },
            trend
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch summary analytics', error: error.message });
    }
};

exports.getVendorCustomers = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const { page, limit } = parsePagination(req, { defaultLimit: 25, maxLimit: 200 });
        const where = buildRedemptionEventWhere(vendor, req.query);
        where.type = 'redeem_success';
        where.userId = { not: null };

        const events = await prisma.redemptionEvent.findMany({
            where,
            include: {
                User: { select: { id: true, name: true, phoneNumber: true } }
            },
            orderBy: { createdAt: 'asc' },
            take: 100000
        });

        const customerMap = new Map();
        events.forEach((event) => {
            const userId = event.userId;
            if (!userId) return;
            const existing = customerMap.get(userId);
            const amount = Number(event.amount || 0);
            if (!existing) {
                customerMap.set(userId, {
                    userId,
                    name: event.User?.name || 'Unknown',
                    mobile: event.User?.phoneNumber || null,
                    codeCount: 1,
                    rewardsEarned: amount,
                    firstScanLocation: [event.city, event.state, event.pincode].filter(Boolean).join(', ') || '-',
                    memberSince: event.createdAt,
                    lastScanned: event.createdAt
                });
                return;
            }
            existing.codeCount += 1;
            existing.rewardsEarned = toNumber(existing.rewardsEarned + amount, 0);
            existing.lastScanned = event.createdAt;
        });

        let customers = Array.from(customerMap.values()).map((entry) => ({
            ...entry,
            rewardsEarned: toNumber(entry.rewardsEarned, 0)
        }));

        if (req.query.mobile) {
            const needle = String(req.query.mobile).trim();
            customers = customers.filter((entry) => String(entry.mobile || '').includes(needle));
        }

        const total = customers.length;
        const skip = (page - 1) * limit;
        const paged = customers
            .sort((a, b) => new Date(b.lastScanned) - new Date(a.lastScanned))
            .slice(skip, skip + limit);

        res.json({
            customers: paged,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
    }
};

exports.exportVendorCustomers = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const where = buildRedemptionEventWhere(vendor, req.query);
        where.type = 'redeem_success';
        where.userId = { not: null };

        const events = await prisma.redemptionEvent.findMany({
            where,
            include: {
                User: { select: { id: true, name: true, phoneNumber: true } }
            },
            orderBy: { createdAt: 'asc' },
            take: 100000
        });

        const customerMap = new Map();
        events.forEach((event) => {
            const userId = event.userId;
            if (!userId) return;
            const existing = customerMap.get(userId);
            if (!existing) {
                customerMap.set(userId, {
                    name: event.User?.name || '',
                    mobile: event.User?.phoneNumber || '',
                    codeCount: 1,
                    rewardsEarned: Number(event.amount || 0),
                    firstScanLocation: [event.city, event.state, event.pincode].filter(Boolean).join(', ') || '',
                    memberSince: event.createdAt,
                    lastScanned: event.createdAt
                });
                return;
            }
            existing.codeCount += 1;
            existing.rewardsEarned += Number(event.amount || 0);
            existing.lastScanned = event.createdAt;
        });

        const header = [
            'Name',
            'Mobile',
            'Code Count',
            'Rewards Earned',
            'First Scan Location',
            'Member Since',
            'Last Scanned'
        ];
        const rows = Array.from(customerMap.values()).map((entry) => [
            entry.name,
            entry.mobile,
            String(entry.codeCount),
            toNumber(entry.rewardsEarned, 0).toFixed(2),
            entry.firstScanLocation,
            new Date(entry.memberSince).toISOString(),
            new Date(entry.lastScanned).toISOString()
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map(escapeCsvValue).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=\"vendor-customers-${Date.now()}.csv\"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: 'Failed to export customers', error: error.message });
    }
};

exports.getVendorWalletTransactionsDetailed = async (req, res) => {
    try {
        const { vendor, wallet } = await ensureVendorAndWallet(req.user.id);
        const { page, limit, skip } = parsePagination(req, { defaultLimit: 30, maxLimit: 200 });

        const where = { walletId: wallet.id };
        if (req.query.type) where.type = req.query.type;
        if (req.query.category) where.category = req.query.category;
        if (req.query.txnId) where.id = req.query.txnId;
        if (req.query.referenceId) where.referenceId = req.query.referenceId;
        const dateRange = buildDateRange(req.query);
        if (dateRange) where.createdAt = dateRange;

        const [transactions, total, totals] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.transaction.count({ where }),
            prisma.transaction.groupBy({
                by: ['type'],
                where,
                _sum: { amount: true }
            })
        ]);

        const summary = totals.reduce(
            (acc, item) => {
                const amount = Number(item._sum.amount || 0);
                if (item.type === 'credit') acc.credit += amount;
                if (item.type === 'debit') acc.debit += amount;
                return acc;
            },
            { credit: 0, debit: 0 }
        );

        res.json({
            availableBalance: toNumber(wallet.balance, 0) - toNumber(wallet.lockedBalance, 0),
            lockedBalance: toNumber(wallet.lockedBalance, 0),
            totalBalance: toNumber(wallet.balance, 0),
            summary: {
                credit: toNumber(summary.credit, 0),
                debit: toNumber(summary.debit, 0),
                closingBalance: toNumber(wallet.balance, 0)
            },
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch wallet transactions', error: error.message });
    }
};

exports.exportVendorWalletTransactions = async (req, res) => {
    try {
        const { wallet } = await ensureVendorAndWallet(req.user.id);
        const where = { walletId: wallet.id };
        if (req.query.type) where.type = req.query.type;
        if (req.query.category) where.category = req.query.category;
        const dateRange = buildDateRange(req.query);
        if (dateRange) where.createdAt = dateRange;

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 20000
        });

        const header = ['Date', 'Txn ID', 'Type', 'Category', 'Amount', 'Status', 'Reference ID', 'Description'];
        const rows = transactions.map((tx) => [
            new Date(tx.createdAt).toISOString(),
            tx.id,
            tx.type,
            tx.category,
            toNumber(tx.amount, 0).toFixed(2),
            tx.status,
            tx.referenceId || '',
            tx.description || ''
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map(escapeCsvValue).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=\"vendor-wallet-transactions-${Date.now()}.csv\"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: 'Failed to export wallet transactions', error: error.message });
    }
};

exports.getVendorInvoices = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        await prisma.$transaction(async (tx) => {
            await backfillLegacyInvoicesForVendor(tx, vendor.id);
        });
        const { page, limit, skip } = parsePagination(req, { defaultLimit: 25, maxLimit: 100 });
        const where = { vendorId: vendor.id };
        if (req.query.invoiceNo) {
            where.number = { contains: String(req.query.invoiceNo).trim(), mode: 'insensitive' };
        }
        const dateRange = buildDateRange(req.query);
        if (dateRange) where.issuedAt = dateRange;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    Items: true
                },
                orderBy: { issuedAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.invoice.count({ where })
        ]);

        res.json({
            invoices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
    }
};

const sendInvoicePdfResponse = async (res, invoice) => {
    const pdfBuffer = await renderInvoiceToBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"${invoice.number}.pdf\"`);
    res.send(pdfBuffer);
};

exports.downloadVendorInvoicePdf = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: req.params.id,
                vendorId: vendor.id
            },
            include: {
                Items: true,
                Vendor: true,
                Brand: true
            }
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        await sendInvoicePdfResponse(res, invoice);
    } catch (error) {
        res.status(500).json({ message: 'Failed to download invoice', error: error.message });
    }
};

exports.shareVendorInvoice = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: req.params.id,
                vendorId: vendor.id
            }
        });
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const result = await prisma.$transaction((tx) => withShareToken(tx, invoice.id, 72));
        const shareUrl = `${req.protocol}://${req.get('host')}/api/public/invoices/shared/${result.token}`;

        res.json({
            shareToken: result.token,
            shareUrl,
            shareExpiresAt: result.expiry
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to share invoice', error: error.message });
    }
};

exports.getSharedInvoice = async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!token) {
            return res.status(400).json({ message: 'Invalid share token' });
        }

        const invoice = await prisma.invoice.findFirst({
            where: {
                shareToken: token,
                shareExpiresAt: { gt: new Date() },
                status: 'issued'
            },
            include: {
                Items: true,
                Vendor: true,
                Brand: true
            }
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Shared invoice not found or expired' });
        }

        if (String(req.query.format || '').toLowerCase() === 'json') {
            return res.json({
                invoice: {
                    id: invoice.id,
                    number: invoice.number,
                    type: invoice.type,
                    subtotal: toNumber(invoice.subtotal, 0),
                    tax: toNumber(invoice.tax, 0),
                    total: toNumber(invoice.total, 0),
                    issuedAt: invoice.issuedAt,
                    vendor: invoice.Vendor
                        ? {
                            businessName: invoice.Vendor.businessName,
                            contactEmail: invoice.Vendor.contactEmail
                        }
                        : null,
                    brand: invoice.Brand
                        ? {
                            id: invoice.Brand.id,
                            name: invoice.Brand.name
                        }
                        : null,
                    items: invoice.Items
                }
            });
        }

        await sendInvoicePdfResponse(res, invoice);
    } catch (error) {
        res.status(500).json({ message: 'Failed to open shared invoice', error: error.message });
    }
};

exports.getVendorProductReports = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const { page, limit, skip } = parsePagination(req, { defaultLimit: 25, maxLimit: 100 });
        const where = { vendorId: vendor.id };
        if (req.query.productId) where.productId = req.query.productId;
        const dateRange = buildDateRange(req.query);
        if (dateRange) where.createdAt = dateRange;

        const [reports, total] = await Promise.all([
            prisma.productReport.findMany({
                where,
                include: {
                    Product: { select: { id: true, name: true, sku: true } },
                    User: { select: { id: true, name: true, phoneNumber: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.productReport.count({ where })
        ]);

        res.json({
            reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch product reports', error: error.message });
    }
};

exports.downloadVendorProductReport = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const report = await prisma.productReport.findFirst({
            where: {
                id: req.params.id,
                vendorId: vendor.id
            },
            include: {
                Product: { select: { id: true, name: true, sku: true } },
                User: { select: { id: true, name: true, phoneNumber: true } }
            }
        });

        if (!report) {
            return res.status(404).json({ message: 'Product report not found' });
        }

        const fileContent = [
            `Report ID: ${report.id}`,
            `Title: ${report.title}`,
            `Description: ${report.description || ''}`,
            `Product: ${report.Product?.name || ''}`,
            `Product SKU: ${report.Product?.sku || ''}`,
            `Reported By: ${report.User?.name || ''}`,
            `Reporter Mobile: ${report.User?.phoneNumber || ''}`,
            `Created At: ${new Date(report.createdAt).toISOString()}`
        ].join('\n');

        const safeFileName = `product-report-${report.id}.txt`;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=\"${safeFileName}\"`);
        res.send(fileContent);
    } catch (error) {
        res.status(500).json({ message: 'Failed to download product report', error: error.message });
    }
};

