import { User } from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { generateTokenAndSetCookie } from '../utils/generateTokenAndSetCookie.js';
import { sendVerificationEmail } from '../mailtrap/emails.js';

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

export const login = async (req, res) => {
  res.send('login route');
};

export const logout = async (req, res) => {
  res.send('logout route');
};
