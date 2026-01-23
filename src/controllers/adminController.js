const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { calculateSubscriptionWindow, normalizeSubscriptionType } = require('../utils/subscriptionUtils');

const slugifyBrandName = (value = 'brand') => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'brand';
};

const generatePassword = () =>
    String(crypto.randomInt(0, 10 ** 8)).padStart(8, '0');

const generateUniqueUsername = async (tx, name) => {
    const base = slugifyBrandName(name);
    let candidate = base;
    let counter = 0;
    while (await tx.user.findUnique({ where: { username: candidate } })) {
        counter += 1;
        candidate = `${base}${counter}`;
    }
    return candidate;
};

const createVendorAccount = async (tx, { brandName, email, phone }) => {
    const username = await generateUniqueUsername(tx, brandName);
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : null;
    const existingEmailUser = normalizedEmail
        ? await tx.user.findUnique({ where: { email: normalizedEmail } })
        : null;
    const userEmail = existingEmailUser || !normalizedEmail ? null : normalizedEmail;

    const user = await tx.user.create({
        data: {
            name: brandName,
            email: userEmail,
            username,
            password: hashedPassword,
            role: 'vendor',
            status: 'active'
        }
    });

    const vendor = await tx.vendor.create({
        data: {
            userId: user.id,
            businessName: brandName,
            contactEmail: normalizedEmail || null,
            contactPhone: normalizedPhone || null,
            status: 'active'
        }
    });

    return { user, vendor, credentials: { username, password } };
};

// --- Brand Management ---

exports.createBrand = async (req, res) => {
    try {
        const { name, logoUrl, website, subscriptionType, vendorEmail, vendorPhone } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Brand name is required' });
        }

        const subscriptionWindow = calculateSubscriptionWindow(subscriptionType);

        const result = await prisma.$transaction(async (tx) => {
            const { vendor, credentials } = await createVendorAccount(tx, {
                brandName: name,
                email: vendorEmail,
                phone: vendorPhone
            });

            const brand = await tx.brand.create({
                data: {
                    name,
                    logoUrl,
                    website,
                    status: 'active',
                    vendorId: vendor.id
                }
            });

            const subscription = await tx.subscription.create({
                data: {
                    brandId: brand.id,
                    subscriptionType: subscriptionWindow.subscriptionType,
                    startDate: subscriptionWindow.startDate,
                    endDate: subscriptionWindow.endDate,
                    status: 'ACTIVE'
                }
            });

            return { brand, vendor, subscription, credentials };
        });

        res.status(201).json({
            message: 'Brand and vendor created successfully',
            ...result
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                message: 'Brand creation failed due to a duplicate value.',
                error: error.message
            });
        }
        res.status(500).json({ message: 'Error creating brand', error: error.message });
    }
};

// --- Campaign Management ---

exports.createCampaign = async (req, res) => {
    try {
        const { brandId, title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;

        // Validation: Check if Brand exists
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                title,
                description,
                cashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget,
                status: 'active' // Admin created campaigns are auto-verified
            }
        });
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error creating campaign', error: error.message });
    }
};

// ... (getAllCampaigns, getAllVendors, createVendorProfile - no change)

exports.verifyBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Allow passing 'active' or 'rejected'

        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const brand = await prisma.brand.update({
            where: { id },
            data: { status: newStatus }
        });
        res.json({ message: `Brand ${newStatus}`, brand });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.verifyCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Allow passing 'active' or 'rejected'

        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const campaign = await prisma.campaign.update({
            where: { id },
            data: { status: newStatus }
        });
        res.json({ message: `Campaign ${newStatus}`, campaign });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.getAllBrands = async (req, res) => {
    try {
        const { status } = req.query;
        const where = status ? { status } : {};

        const brands = await prisma.brand.findMany({
            where,
            include: {
                Vendor: {
                    select: { businessName: true, contactPhone: true, status: true }
                },
                Subscription: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

exports.getSubscriptions = async (req, res) => {
    try {
        const { status } = req.query;
        const normalizedStatus = status ? status.toUpperCase() : undefined;
        const whereCondition = normalizedStatus && ['ACTIVE', 'PAUSED', 'EXPIRED'].includes(normalizedStatus)
            ? { status: normalizedStatus }
            : {};

        const subscriptions = await prisma.subscription.findMany({
            where: whereCondition,
            include: {
                Brand: {
                    include: {
                        Vendor: {
                            include: {
                                User: { select: { id: true, email: true, username: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscriptions', error: error.message });
    }
};

exports.updateVendorSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, extendMonths, subscriptionType, startDate } = req.body;

        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                Brand: {
                    include: {
                        Subscription: true
                    }
                }
            }
        });

        if (!vendor || !vendor.Brand || !vendor.Brand.Subscription) {
            return res.status(404).json({ message: 'Vendor subscription not found' });
        }

        const subscription = vendor.Brand.Subscription;
        const updatePayload = {};

        if (subscriptionType) {
            const normalizedType = normalizeSubscriptionType(subscriptionType);
            const window = calculateSubscriptionWindow(normalizedType, startDate || new Date());
            updatePayload.subscriptionType = normalizedType;
            updatePayload.startDate = window.startDate;
            updatePayload.endDate = window.endDate;
            updatePayload.status = 'ACTIVE';
        }

        if (extendMonths) {
            const months = Number(extendMonths);
            if (!Number.isFinite(months) || months <= 0) {
                return res.status(400).json({ message: 'extendMonths must be a positive number' });
            }

            const referenceDate = subscription.endDate && new Date(subscription.endDate) > new Date()
                ? new Date(subscription.endDate)
                : new Date();
            const newEnd = new Date(referenceDate);
            newEnd.setMonth(newEnd.getMonth() + months);

            updatePayload.endDate = newEnd;
            updatePayload.status = updatePayload.status || 'ACTIVE';
            if (!updatePayload.startDate) {
                updatePayload.startDate = subscription.startDate || new Date();
            }
        }

        if (status) {
            const upperStatus = status.toUpperCase();
            if (!['ACTIVE', 'PAUSED', 'EXPIRED'].includes(upperStatus)) {
                return res.status(400).json({ message: 'Invalid subscription status' });
            }
            updatePayload.status = upperStatus;
        }

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: 'No updates provided for subscription' });
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: updatePayload
        });

        const vendorStatusUpdate = {};
        if (updatePayload.status === 'ACTIVE') vendorStatusUpdate.status = 'active';
        if (updatePayload.status === 'PAUSED') vendorStatusUpdate.status = 'paused';
        if (updatePayload.status === 'EXPIRED') vendorStatusUpdate.status = 'expired';

        if (Object.keys(vendorStatusUpdate).length) {
            await prisma.vendor.update({
                where: { id: vendor.id },
                data: vendorStatusUpdate
            });
        }

        res.json({ message: 'Subscription updated', subscription: updatedSubscription });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update subscription', error: error.message });
    }
};

// --- Campaign Management ---

exports.createCampaign = async (req, res) => {
    try {
        const { brandId, title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;

        // Validation: Check if Brand exists
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                title,
                description,
                cashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget
            }
        });
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error creating campaign', error: error.message });
    }
};

exports.getAllCampaigns = async (req, res) => {
    try {
        const { type } = req.query; // 'admin' or 'vendor'
        const where = {};

        if (type === 'admin') {
            where.Brand = { vendorId: null };
        } else if (type === 'vendor') {
            where.Brand = { vendorId: { not: null } };
        }

        const campaigns = await prisma.campaign.findMany({
            where,
            include: { Brand: { include: { Vendor: { select: { businessName: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
};

// --- Vendor Management (Admin View) ---

// --- Vendor Management (Admin View) ---

exports.getAllVendors = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                include: {
                    User: true,
                    Wallet: true,
                    Brand: {
                        include: {
                            Subscription: true
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.vendor.count()
        ]);

        res.json({
            vendors,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendors', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Admin force delete (no ownership check needed really, just existence)
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product forcibly deleted by Admin' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
};

exports.createVendorProfile = async (req, res) => {
    const { name, email, password, businessName, contactPhone, gstin } = req.body;

    if (!email || !password || !businessName) {
        return res.status(400).json({ message: 'Email, password, and business name are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            user = await prisma.user.update({
                where: { email },
                data: {
                    name,
                    password: hashedPassword,
                    role: 'vendor',
                    status: 'active'
                }
            });
        } else {
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'vendor',
                    status: 'active'
                }
            });
        }

        const vendor = await prisma.vendor.upsert({
            where: { userId: user.id },
            update: {
                businessName,
                contactPhone,
                gstin,
                status: 'active'
            },
            create: {
                userId: user.id,
                businessName,
                contactPhone,
                gstin,
                status: 'active'
            }
        });

        await prisma.wallet.upsert({
            where: { vendorId: vendor.id },
            update: {
                userId: user.id
            },
            create: {
                vendorId: vendor.id,
                userId: user.id,
                balance: 0,
                lockedBalance: 0,
                currency: 'INR'
            }
        });

        res.status(201).json({
            vendor,
            credentials: {
                email: user.email,
                password
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating vendor', error: error.message });
    }
};

exports.verifyBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body; // Allow passing 'active' or 'rejected'

        const newStatus = status === 'rejected' ? 'rejected' : 'active';
        // Auto-approve logic: if status not provided, assume active? Or require explicit?

        const brand = await prisma.brand.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Brand ${newStatus}`, brand });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.verifyCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const campaign = await prisma.campaign.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Campaign ${newStatus}`, campaign });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.verifyVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const vendor = await prisma.vendor.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Vendor ${newStatus}`, vendor });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.processWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, referenceId, adminNote, reason } = req.body; // status: 'processed' or 'rejected'

        if (!['processed', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
            if (!withdrawal) throw new Error('Withdrawal request not found');
            if (withdrawal.status !== 'pending') throw new Error('Request already handled');

            // Update Withdrawal
            const updatedWithdrawal = await tx.withdrawal.update({
                where: { id },
                data: {
                    status,
                    referenceId,
                    adminNote,
                    rejectionReason: status === 'rejected' ? reason : null
                }
            });

            if (status === 'rejected') {
                // Refund Balance
                await tx.wallet.update({
                    where: { id: withdrawal.walletId },
                    data: { balance: { increment: withdrawal.amount } }
                });

                // Log Refund Transaction
                await tx.transaction.create({
                    data: {
                        walletId: withdrawal.walletId,
                        type: 'credit',
                        amount: withdrawal.amount,
                        category: 'refund',
                        status: 'success',
                        description: `Refund: Withdrawal Rejected. Reason: ${reason || adminNote || ''}`
                    }
                });
            }

            return updatedWithdrawal;
        });

        res.json({ message: `Withdrawal ${status}`, result });

    } catch (error) {
        res.status(500).json({ message: 'Processing failed', error: error.message });
    }
};

// --- System Analytics ---

exports.getSystemStats = async (req, res) => {
    try {
        const [userCount, vendorCount, activeCampaigns, totalTransactions] = await Promise.all([
            prisma.user.count({ where: { role: 'customer' } }),
            prisma.vendor.count(),
            prisma.campaign.count({ where: { status: 'active' } }),
            prisma.transaction.count()
        ]);

        res.json({
            users: userCount,
            vendors: vendorCount,
            activeCampaigns,
            totalTransactions
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// --- User Management ---

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: { role: 'customer' },
                select: { id: true, name: true, email: true, phoneNumber: true, status: true, createdAt: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where: { role: 'customer' } })
        ]);

        res.json({
            users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active' or 'blocked'

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { status }
        });
        res.json({ message: `User ${status}`, user });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// --- Global Audit ---

exports.getAllTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                include: {
                    Wallet: {
                        include: {
                            User: { select: { name: true, email: true } },
                            Vendor: {
                                include: {
                                    User: { select: { name: true, email: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.transaction.count()
        ]);

        res.json({
            transactions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

exports.getAllQRs = async (req, res) => {
    try {
        const qrs = await prisma.qRCode.findMany({
            include: { Campaign: { select: { title: true, Brand: { select: { name: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(qrs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QRs', error: error.message });
    }
};

// --- Advanced Admin Controls ---

exports.verifyVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const vendor = await prisma.vendor.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Vendor ${newStatus}`, vendor });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.creditWallet = async (req, res) => {
    try {
        const { vendorId, amount, description } = req.body;

        // Transactional update
        const result = await prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.update({
                where: { vendorId },
                data: { balance: { increment: parseFloat(amount) } }
            });

            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'credit',
                    amount: parseFloat(amount),
                    category: 'recharge', // Admin manual recharge
                    status: 'success',
                    description: description || 'Admin manual credit'
                }
            });
            return { wallet, transaction };
        });

        res.json({ message: 'Wallet credited successfully', data: result });
    } catch (error) {
        res.status(500).json({ message: 'Credit failed', error: error.message });
    }
};

exports.updateCampaignStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'paused', 'rejected', 'completed'

        if (!['active', 'paused', 'rejected', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const campaign = await prisma.campaign.update({
            where: { id },
            data: { status }
        });
        res.json({ message: `Campaign status updated to ${status}`, campaign });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.getVendorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                User: { select: { name: true, email: true, phoneNumber: true } },
                Wallet: true,
                Brands: { include: { Campaigns: true } }
            }
        });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching details', error: error.message });
    }
};

// --- Payout Management ---

exports.getPendingWithdrawals = async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            where: { status: 'pending' },
            include: {
                PayoutMethod: true,
                Wallet: {
                    include: {
                        User: { select: { name: true, email: true } },
                        Vendor: { select: { businessName: true, contactPhone: true } }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching withdrawals', error: error.message });
    }
};

exports.processWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, referenceId, adminNote, reason } = req.body; // status: 'processed' or 'rejected'

        if (!['processed', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
            if (!withdrawal) throw new Error('Withdrawal request not found');
            if (withdrawal.status !== 'pending') throw new Error('Request already handled');

            // Update Withdrawal
            const updatedWithdrawal = await tx.withdrawal.update({
                where: { id },
                data: {
                    status,
                    referenceId,
                    adminNote,
                    rejectionReason: status === 'rejected' ? reason : null
                }
            });

            if (status === 'rejected') {
                // Refund Balance
                await tx.wallet.update({
                    where: { id: withdrawal.walletId },
                    data: { balance: { increment: withdrawal.amount } }
                });

                // Log Refund Transaction
                await tx.transaction.create({
                    data: {
                        walletId: withdrawal.walletId,
                        type: 'credit',
                        amount: withdrawal.amount,
                        category: 'refund',
                        status: 'success',
                        description: `Refund: Withdrawal Rejected. Reason: ${reason || adminNote || ''}`
                    }
                });
            }

            return updatedWithdrawal;
        });

        res.json({ message: `Withdrawal ${status}`, result });

    } catch (error) {
        res.status(500).json({ message: 'Processing failed', error: error.message });
    }
};

// --- Support & Usage ---

exports.getAllSupportTickets = async (req, res) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            include: { User: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
};

exports.replySupportTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { response, status } = req.body;

        const ticket = await prisma.supportTicket.update({
            where: { id },
            data: {
                response,
                status: status || 'resolved'
            }
        });
        res.json({ message: 'Ticket updated', ticket });
    } catch (error) {
        res.status(500).json({ message: 'Error updating ticket', error: error.message });
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { userId, title, message, type } = req.body;

        // If userId is 'all', send to all users (bulk create)
        if (userId === 'all') {
            const users = await prisma.user.findMany({ select: { id: true } });
            const notifications = users.map(user => ({
                userId: user.id,
                title,
                message,
                type: type || 'system'
            }));
            await prisma.notification.createMany({ data: notifications });
            return res.json({ message: `Notification sent to ${users.length} users` });
        }

        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type: type || 'system'
            }
        });
        res.status(201).json({ message: 'Notification sent', notification });
    } catch (error) {
        res.status(500).json({ message: 'Error sending notification', error: error.message });
    }
};

// --- QR Order Management ---

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await prisma.qROrder.findMany({
            include: {
                QRCodes: {
                    select: { id: true, status: true, uniqueHash: true, cashbackAmount: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get vendor and campaign details
        const vendorIds = [...new Set(orders.map(o => o.vendorId))];
        const campaignIds = [...new Set(orders.map(o => o.campaignId))];

        const [vendors, campaigns] = await Promise.all([
            prisma.vendor.findMany({
                where: { id: { in: vendorIds } },
                include: {
                    User: { select: { email: true } },
                    Brand: { select: { name: true } }
                }
            }),
            prisma.campaign.findMany({
                where: { id: { in: campaignIds } },
                select: { id: true, title: true }
            })
        ]);

        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, {
            businessName: v.businessName,
            brandName: v.Brand?.name,
            email: v.User?.email
        }]));
        const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.title]));

        const formattedOrders = orders.map(order => ({
            id: order.id,
            vendorId: order.vendorId,
            vendor: vendorMap[order.vendorId] || { businessName: 'Unknown' },
            campaignId: order.campaignId,
            campaignTitle: campaignMap[order.campaignId] || 'Unknown',
            quantity: order.quantity,
            cashbackAmount: Number(order.cashbackAmount),
            printCost: Number(order.printCost),
            totalAmount: Number(order.totalAmount),
            status: order.status,
            createdAt: order.createdAt,
            qrCodes: order.QRCodes.map(qr => ({
                id: qr.id,
                uniqueHash: qr.uniqueHash,
                status: qr.status,
                cashbackAmount: Number(qr.cashbackAmount)
            }))
        }));

        res.json(formattedOrders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'paid', 'shipped'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Use: pending, paid, shipped' });
        }

        const order = await prisma.qROrder.findUnique({ where: { id } });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const updatedOrder = await prisma.qROrder.update({
            where: { id },
            data: { status }
        });

        res.json({
            message: `Order status updated to ${status}`,
            order: {
                id: updatedOrder.id,
                status: updatedOrder.status,
                quantity: updatedOrder.quantity
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};
