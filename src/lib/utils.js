export const getCookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: true, // Siempre true para Tunnels y HTTPS
    sameSite: 'none', // Requerido para cookies entre diferentes subdominios de Cloudflare
    maxAge
});

export const SESSION_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const AUTH_TOKEN_EXISTS_COOKIE = 'auth_token_exists';
