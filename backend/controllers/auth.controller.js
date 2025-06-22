import { User } from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { generateTokenAndSetCookie } from '../utils/generateTokenAndSetCookie.js';
import { generateTokens } from '../utils/generateTokens.js';

import { sendVerificationEmail } from '../mailtrap/emails.js';
import { sendWelcomeEmail } from '../mailtrap/emails.js';
import { sendPasswordResetEmail } from '../mailtrap/emails.js';
import { sendResetSuccessEmail } from '../mailtrap/emails.js';




export const signup = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Validation des champs
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const userAlreadyExists = await User.findOne({ email });
    if (userAlreadyExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Générer le code de vérification
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Créer l'utilisateur
    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verificationExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    // Sauvegarder en base de données
    await user.save();

    // Générer le token JWT + set cookie
    generateTokenAndSetCookie(res, user._id);

    // Envoyer email de vérification
    await sendVerificationEmail(user.email, verificationToken);

    // Réponse au client
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...user._doc,
        password: undefined,
        verificationToken: undefined,
        verificationExpiresAt: undefined,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong',
    });
  }
};

export const verifyEmail = async (req, res) => {
	const code = String(req.body.code).trim();
	console.log("🔍 Code reçu depuis le frontend :", code);

	try {
		const user = await User.findOne({
			verificationToken: code,
			verificationExpiresAt: { $gt: Date.now() },
		});

		console.log("🧠 Utilisateur trouvé :", user);

		if (!user) {
			console.log("❌ Aucun utilisateur trouvé avec ce code ou le code a expiré");
			return res
				.status(400)
				.json({ success: false, message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();

		try {
			await sendWelcomeEmail(user.email, user.name);
		} catch (emailError) {
			console.error("📧 Erreur lors de l'envoi de l'email de bienvenue :", emailError);
		}

		console.log("✅ Vérification réussie pour :", user.email);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		console.log("🔥 Erreur dans verifyEmail :", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};


export const login = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}
		const isPasswordValid = await bcryptjs.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}

		generateTokens(res, user._id);

		user.lastLogin = new Date();
		await user.save();

		res.status(200).json({
			success: true,
			message: "Logged in successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		console.log("Error in login ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};


export const logout = async (req, res) => {
	res.clearCookie('accessToken');
res.clearCookie('refreshToken');
res.status(200).json({ success: true, message: 'Logged out successfully' });
};



export const forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

		// send email
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};



export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
		const hashedPassword = await bcryptjs.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId).select("-password");
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.log("Error in checkAuth ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};



export const refreshAccessToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ success: true, message: 'Access token refreshed' });
  } catch (error) {
    console.error('Error in refreshAccessToken:', error);
    res.status(403).json({ success: false, message: 'Invalid refresh token' });
  }
};
