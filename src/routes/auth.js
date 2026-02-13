import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { supabase, getSupabaseUserClient } from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Validation schemas (kept for pre-validation)
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

// --- REGISTRO CON SUPABASE AUTH ---
router.post('/register', authLimiter, async (req, res) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            const firstError = validation.error.issues[0]?.message || 'Datos inválidos';
            return res.status(400).json({ error: firstError });
        }

        const { email, password } = validation.data;

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        // Si autoConfirm está desactivado, el usuario no podrá loguearse hasta verificar email
        res.status(201).json({
            message: 'Usuario registrado. Por favor verifica tu correo electrónico.',
            user: data.user
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- LOGIN CON SUPABASE AUTH ---
router.post('/login', authLimiter, async (req, res) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            const firstError = validation.error.issues[0]?.message || 'Datos inválidos';
            return res.status(400).json({ error: firstError });
        }

        const { email, password } = validation.data;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) return res.status(401).json({ error: 'Credenciales inválidas o email no verificado' });

        // Establecer cookies (Supabase devuelve access_token y refresh_token)
        const cookieOptions = (maxAge) => ({
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge
        });

        res.cookie('auth_token', data.session.access_token, cookieOptions(data.session.expires_in * 1000));
        res.cookie('refresh_token', data.session.refresh_token, cookieOptions(30 * 24 * 60 * 60 * 1000)); // 30 días

        res.json({ user: data.user, session: data.session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGOUT ---
router.post('/logout', async (req, res) => {
    const { error } = await supabase.auth.signOut();

    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Sesión cerrada' });
});

// --- OBTENER USUARIO ACTUAL ---
router.get('/me', authenticateUser, (req, res) => {
    res.json({ user: req.user });
});

// --- REFRESH TOKEN ---
router.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) return res.status(401).json({ error: 'Sesión expirada' });

    const cookieOptions = (maxAge) => ({
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge
    });

    res.cookie('auth_token', data.session.access_token, cookieOptions(data.session.expires_in * 1000));
    res.cookie('refresh_token', data.session.refresh_token, cookieOptions(30 * 24 * 60 * 60 * 1000));

    res.json({ message: 'Token refrescado' });
});

// --- RECUPERAR CONTRASEÑA (Trigger Email desde Supabase) ---
router.post('/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email requerido' });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: resetUrl,
        });

        if (error) {
            // Supabase protege la privacidad, pero si hay error de configuración lo logueamos
            console.error('Supabase Reset Error:', error);
            // No retornamos error al cliente para evitar enumeración de usuarios
        }

        res.json({ message: 'Si el correo existe, se ha enviado un enlace de recuperación' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RESTABLECER CONTRASEÑA (Nuevo endpoint para usar en la página de reset) ---
// Nota: En Supabase, el link del correo loguea al usuario y le da una sesión. 
// El usuario debe llamar a updateUser con la nueva contraseña.
const passwordSchema = z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

router.post('/update-password', authenticateUser, async (req, res) => {
    try {
        const { password, refreshToken } = req.body;

        const validation = passwordSchema.safeParse(password);
        if (!validation.success) {
            const firstError = validation.error.issues[0]?.message || 'Contraseña no cumple requisitos';
            return res.status(400).json({ error: firstError });
        }

        // Obtener el token del header para crear un cliente autenticado
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token requerido' });

        console.log(`🔒 Update Password Request for: ${req.user.email}`);
        console.log(`🔑 Refresh Token Provided: ${!!refreshToken}`);

        const supabaseUser = getSupabaseUserClient(token);
        let sessionError = null;

        // 1. Intentar establecer sesión si hay refresh token
        if (refreshToken) {
            const { error } = await supabaseUser.auth.setSession({
                access_token: token,
                refresh_token: refreshToken
            });
            if (error) {
                console.warn('⚠️ Falló setSession:', error.message);
                sessionError = error;
            } else {
                console.log('✅ Sesión establecida correctamente');
            }
        } else {
            console.warn('⚠️ No refresh_token provided. setSession skipped.');
        }

        // 2. Intentar actualizar usuario estándar
        const { data, error } = await supabaseUser.auth.updateUser({ password });

        if (!error) {
            console.log('✅ Contraseña actualizada vía updateUser');
            return res.json({ message: 'Contraseña actualizada exitosamente' });
        }

        console.error('❌ updateUser falló:', error.message);

        // 3. Fallback: Intentar admin update si updateUser falló (por ejemplo por falta de sesión)
        // Esto solo funcionará si la SUPABASE_KEY en el servidor tiene permisos de service_role.
        try {
            console.log('🔄 Intentando actualización administrativa (fallback)...');
            const { data: adminData, error: adminError } = await supabase.auth.admin.updateUserById(
                req.user.id,
                { password: password }
            );

            if (adminError) throw adminError;

            console.log('✅ Contraseña actualizada vía Admin API');
            return res.json({ message: 'Contraseña actualizada exitosamente (admin)' });

        } catch (adminErr) {
            console.error('❌ Admin update también falló:', adminErr.message);
            // Si ambos fallan, devolvemos el error original o el de admin
            throw new Error(`No se pudo actualizar la contraseña. Usuario: ${error.message}. Admin: ${adminErr.message}`);
        }

    } catch (err) {
        console.error('🔥 Error CRÍTICO en update-password:', err.message);
        res.status(500).json({ error: 'No se pudo actualizar la contraseña. Revisa el log del servidor.' });
    }
});

// --- CAMBIAR CONTRASEÑA (Para usuarios logueados) ---
// Es lo mismo que update-password
router.post('/change-password', authenticateUser, async (req, res) => {
    try {
        const { newPassword } = req.body;

        const validation = passwordSchema.safeParse(newPassword);
        if (!validation.success) {
            const firstError = validation.error.issues[0]?.message || 'Contraseña no cumple requisitos';
            return res.status(400).json({ error: firstError });
        }

        // Obtener el token del header para crear un cliente autenticado
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token requerido' });

        const supabaseUser = getSupabaseUserClient(token);
        const { error } = await supabaseUser.auth.updateUser({ password: newPassword });

        if (error) throw error;

        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
