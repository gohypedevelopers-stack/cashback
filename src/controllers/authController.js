const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const userExists = await User.findOne({ where: { email } });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Only admins can create admin/vendor users directly via this API in a real scenario,
        // but for initial setup, we might allow it or restrict it later.
        // For now, let's allow basic registration.

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'customer'
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
        const user = await User.findOne({ where: { email } });

        if (user && (await user.matchPassword(password))) {
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
    // Use middleware to attach user to req
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'otp', 'otpExpires'] }
        });
        res.json(user);
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

        let user = await User.findOne({ where: { phoneNumber } });

        if (!user) {
            // Create new partial user
            user = await User.create({
                phoneNumber,
                role: 'customer',
                otp,
                otpExpires
            });
        } else {
            // Update existing user OTP
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
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
        const user = await User.findOne({ where: { phoneNumber } });

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
        user.otp = null;
        user.otpExpires = null;
        await user.save();

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
