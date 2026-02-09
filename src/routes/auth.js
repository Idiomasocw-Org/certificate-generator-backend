import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });

        const normalizedEmail = email.toLowerCase().trim();
        const hashedPassword = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('users_custom')
            .insert([{ email: normalizedEmail, password: hashedPassword }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
            throw error;
        }
        res.status(201).json({ message: 'Usuario creado', user: { id: data.id, email: data.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const { data: user, error } = await supabase
            .from('users_custom')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        const cookieOptions = (maxAge) => ({
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge
        });

        res.cookie('auth_token', accessToken, cookieOptions(15 * 60 * 1000));
        res.cookie('refresh_token', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

        res.json({ user: { id: user.id, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', (req, res) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    };
    res.clearCookie('auth_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    res.json({ message: 'Sesión cerrada' });
});

router.get('/me', authenticateUser, (req, res) => {
    res.json({ user: req.user });
});

router.post('/refresh', (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        const newAccessToken = jwt.sign({ id: decoded.id, email: decoded.email }, JWT_SECRET, { expiresIn: '15m' });

        res.cookie('auth_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000
        });

        res.json({ message: 'Token refreshed' });
    } catch (err) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

export default router;
