const prisma = require('../config/prismaClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { safeLogVendorActivity } = require('../utils/vendorActivityLogger');
const { safeLogActivity } = require('../utils/activityLogger');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

exports.register = async (req, res) => {
    const { name, email, password, role, username } = req.body;

    try {
        const userExists = await prisma.user.findUnique({ where: { email } });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                username,
                password: hashedPassword,
                role: role || 'customer'
            }
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                token: generateToken(user.id, user.role)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password, username, emailOrUsername } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const trimmedLogin = typeof emailOrUsername === 'string' ? emailOrUsername.trim() : '';

    const loginEmail = normalizedEmail || (trimmedLogin.includes('@') ? trimmedLogin.toLowerCase() : '');
    const loginUsername = normalizedUsername || (!trimmedLogin.includes('@') ? trimmedLogin : '');

    if (!loginEmail && !loginUsername) {
        return res.status(400).json({ message: 'Email or username is required' });
    }
    if (typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({ message: 'Password is required' });
    }

    try {
        let user = null;
        if (loginEmail) {
            user = await prisma.user.findUnique({ where: { email: loginEmail } });
        }

        if (!user && loginUsername) {
            user = await prisma.user.findUnique({ where: { username: loginUsername } });
        }

        // Allow vendor login using actual vendor id from onboarding response.
        if (!user && loginUsername) {
            const vendorAccount = await prisma.vendor.findUnique({
                where: { id: loginUsername },
                include: { User: true }
            });
            user = vendorAccount?.User || null;
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordMatched = user.password && (await bcrypt.compare(password, user.password));
        if (!passwordMatched) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        let vendorDetails;
        if (user.role === 'vendor') {
            const vendor = await prisma.vendor.findUnique({
                where: { userId: user.id },
                include: { Brand: true }
            });

            if (!vendor) {
                return res.status(403).json({ message: 'Vendor profile not found' });
            }

            vendorDetails = {
                vendorId: vendor.id,
                brand: vendor.Brand,
                status: vendor.status
            };

            safeLogVendorActivity({
                vendorId: vendor.id,
                action: 'vendor_login',
                entityType: 'vendor',
                entityId: vendor.id,
                metadata: { identifier: loginEmail || loginUsername },
                req
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            token: generateToken(user.id, user.role),
            vendor: vendorDetails
        });

        safeLogActivity({
            actorUserId: user.id,
            actorRole: user.role,
            vendorId: vendorDetails?.vendorId,
            brandId: vendorDetails?.brand?.id,
            action: 'login',
            entityType: 'user',
            entityId: user.id,
            metadata: {
                identifier: loginEmail || loginUsername
            },
            req
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (user) {
            const { password, otp, otpExpires, ...userWithoutSensitive } = user;
            if (user.role === 'vendor') {
                const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
                if (vendor) {
                    safeLogVendorActivity({
                        vendorId: vendor.id,
                        action: 'vendor_session_check',
                        entityType: 'vendor',
                        entityId: vendor.id,
                        req
                    });
                }
            }
            res.json(userWithoutSensitive);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Test-mode OTP configuration (default enabled until SMS integration is live)
const DEFAULT_TEST_OTP = process.env.DEFAULT_TEST_OTP || '123456';
const USE_DEFAULT_TEST_OTP = String(process.env.USE_DEFAULT_TEST_OTP || 'true').toLowerCase() === 'true';
const generateOTP = () => (
    USE_DEFAULT_TEST_OTP
        ? DEFAULT_TEST_OTP
        : Math.floor(100000 + Math.random() * 900000).toString()
);

exports.sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        let user = await prisma.user.findUnique({ where: { phoneNumber } });

        if (!user) {
            // Create new partial user
            user = await prisma.user.create({
                data: {
                    phoneNumber,
                    role: 'customer',
                    otp,
                    otpExpires
                }
            });
        } else {
            // Update existing user OTP
            user = await prisma.user.update({
                where: { phoneNumber },
                data: {
                    otp,
                    otpExpires
                }
            });
        }

        // In a real app, send SMS here.
        console.log(`OTP for ${phoneNumber}: ${otp}`);

        res.json({
            success: true,
            message: USE_DEFAULT_TEST_OTP
                ? 'OTP generated in test mode. Use the shown 6-digit OTP.'
                : 'OTP sent successfully',
            otp,
            otpMode: USE_DEFAULT_TEST_OTP ? 'test' : 'live'
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.verifyOtp = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { phoneNumber } });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > user.otpExpires) {
            return res.status(400).json({ message: 'OTP Expired' });
        }

        // Clear OTP
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: null,
                otpExpires: null
            }
        });

        res.json({
            _id: user.id,
            name: user.name,
            phoneNumber: user.phoneNumber,
            role: user.role,
            token: generateToken(user.id, user.role)
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.sendEmailOtp = async (req, res) => {
    const { email } = req.body || {};

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    try {
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp,
                otpExpires
            }
        });

        // Mock Send Email
        console.log(`[EMAIL DEV] OTP for ${normalizedEmail}: ${otp}`);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            otp
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.resetPasswordWithOtp = async (req, res) => {
    const { email, otp, password } = req.body || {};

    if (!email || !otp || !password) {
        return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }

    if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.otp || user.otp !== String(otp)) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (!user.otpExpires || new Date() > user.otpExpires) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                otp: null,
                otpExpires: null,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash it to store in DB
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set Expiry (10 mins)
        const resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken,
                resetPasswordExpires
            }
        });

        // Mock Send Email
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        console.log(`[EMAIL DEV] Password Reset Link: ${resetUrl}`);

        res.json({ success: true, message: 'Email sent', resetToken }); // Sending token in response for dev

    } catch (error) {
        res.status(500).json({ message: 'Error sending email', error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        // Hash token to compare
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken,
                resetPasswordExpires: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};

exports.setPassword = async (req, res) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ success: true, message: 'Password set successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error setting password', error: error.message });
    }
};

// Vendor Self-Registration
exports.registerVendor = async (req, res) => {
    const { ownerName, brandName, category, mobile, email, password, city, state, website } = req.body;

    // Validation
    if (!ownerName || !brandName || !email || !password) {
        return res.status(400).json({
            message: 'Owner name, brand name, email, and password are required'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Check if phone already exists (if provided)
        if (mobile) {
            const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: mobile } });
            if (existingPhone) {
                return res.status(400).json({ message: 'Phone number already registered' });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User, Vendor, Wallet, and Brand in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create User with vendor role (status: active, but vendor/brand are pending)
            const user = await tx.user.create({
                data: {
                    name: ownerName,
                    email,
                    phoneNumber: mobile || null,
                    password: hashedPassword,
                    role: 'vendor',
                    status: 'active'
                }
            });

            // 2. Create Vendor Profile (status: pending - needs admin approval)
            const vendor = await tx.vendor.create({
                data: {
                    userId: user.id,
                    businessName: brandName,
                    contactPhone: mobile || null,
                    contactEmail: email,
                    address: city && state ? `${city}, ${state}` : city || state || null,
                    status: 'pending'
                }
            });

            // 3. Create Wallet with 0 balance
            const wallet = await tx.wallet.create({
                data: {
                    vendorId: vendor.id,
                    balance: 0.00,
                    currency: 'INR'
                }
            });

            // 4. Create Brand (status: pending - needs admin approval)
            const brand = await tx.brand.create({
                data: {
                    name: brandName,
                    vendorId: vendor.id,
                    website: website || null,
                    status: 'pending'
                }
            });

            // 5. Notify Admins about new vendor registration
            const admins = await tx.user.findMany({
                where: { role: 'admin' },
                select: { id: true }
            });

            if (admins.length) {
                const notifications = admins.map(admin => ({
                    userId: admin.id,
                    title: 'New Vendor Registration',
                    message: `${ownerName} has registered as a vendor with brand "${brandName}". Please review and activate.`,
                    type: 'vendor_registration',
                    metadata: {
                        vendorId: vendor.id,
                        brandId: brand.id,
                        ownerName,
                        brandName,
                        email,
                        mobile
                    }
                }));
                await tx.notification.createMany({ data: notifications });
            }

            return { user, vendor, wallet, brand };
        });

        safeLogActivity({
            actorUserId: result.user.id,
            actorRole: 'vendor',
            vendorId: result.vendor.id,
            brandId: result.brand.id,
            action: 'vendor_self_register',
            entityType: 'vendor',
            entityId: result.vendor.id,
            metadata: {
                ownerName,
                brandName,
                email,
                city,
                state
            },
            req
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful! Your account is pending admin approval. You will be notified once activated.',
            vendorId: result.vendor.id,
            brandId: result.brand.id
        });

    } catch (error) {
        console.error('Vendor Registration Error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
};
