const prisma = require('../config/prismaClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

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
                password: hashedPassword,
                role: role || 'customer'
            }
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
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
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id, user.role)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
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
            res.json(userWithoutSensitive);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Generate 4 digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

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
            message: 'OTP sent successfully',
            otp // Returning OTP for demo/testing purposes
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


