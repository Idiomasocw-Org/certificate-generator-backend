import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

// Validation schemas
const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
        .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
});

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Contraseña requerida')
});

router.post('/register', authLimiter, async (req, res) => {
    try {
        // Validate input with Zod
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            const firstError = validation.error.errors[0];
            return res.status(400).json({ error: firstError.message });
        }

        const { email, password } = validation.data;
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

router.post('/login', authLimiter, async (req, res) => {
    try {
        // Validate input with Zod
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            const firstError = validation.error.errors[0];
            return res.status(400).json({ error: firstError.message });
        }

        const { email, password } = validation.data;
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

router.post('/change-password', authenticateUser, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Se requieren ambas contraseñas' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        // 1. Obtener el usuario actual
        const { data: user, error: fetchError } = await supabase
            .from('users_custom')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 2. Verificar contraseña antigua
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }

        // 3. Hashear y actualizar
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await supabase
            .from('users_custom')
            .update({ password: hashedNewPassword })
            .eq('id', req.user.id);

        if (updateError) throw updateError;

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (err) {
        console.error('❌ Error al cambiar contraseña:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email requerido' });

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Buscar usuario
        const { data: user, error } = await supabase
            .from('users_custom')
            .select('id, email')
            .eq('email', normalizedEmail)
            .single();

        if (error || !user) {
            // Por seguridad, no revelamos si el email existe o no
            return res.json({ message: 'Si el correo existe, se ha enviado un enlace de recuperación' });
        }

        // 2. Generar token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hora

        // 3. Guardar token en DB (Requiere que existan las columnas reset_token y reset_expires en users_custom)
        const { error: updateError } = await supabase
            .from('users_custom')
            .update({
                reset_token: token,
                reset_expires: expires.toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Error al guardar token:', updateError);
            return res.status(500).json({ error: 'No se pudo procesar la solicitud. Verifica que la DB tenga las columnas de reset.' });
        }

        // 4. Enviar email real con Resend
        try {
            const { sendPasswordResetEmail } = await import('../lib/email.js');
            await sendPasswordResetEmail(user.email, token);
            console.log(`📧 Email de recuperación enviado a: ${user.email}`);
        } catch (emailError) {
            console.error('❌ Error al enviar email:', emailError);
            // No revelamos el error al usuario por seguridad, pero lo logueamos
        }

        res.json({ message: 'Si el correo existe, se ha enviado un enlace de recuperación' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });

        // 1. Validar token y expiración
        const { data: user, error } = await supabase
            .from('users_custom')
            .select('*')
            .eq('reset_token', token)
            .single();

        if (error || !user) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }

        if (new Date(user.reset_expires) < new Date()) {
            return res.status(400).json({ error: 'El token ha expirado' });
        }

        // 2. Hashear y actualizar contraseña, limpiar token
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await supabase
            .from('users_custom')
            .update({
                password: hashedPassword,
                reset_token: null,
                reset_expires: null
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        res.json({ message: 'Contraseña restablecida con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
