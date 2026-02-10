import rateLimit from 'express-rate-limit';

// Global Rate Limiter: General protection against DDoS (e.g., 100 requests per 15 minutes per IP)
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Demasiadas solicitudes desde esta IP, por favor intenta nuevamente en 15 minutos.' }
});

// Auth Rate Limiter: Stricter protection for login/register (e.g., 5 attempts like standard banking apps)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts (optional, but safer to count all to prevent spam)
    message: { error: 'Demasiados intentos de inicio de sesión, por favor intenta nuevamente en 15 minutos.' }
});
