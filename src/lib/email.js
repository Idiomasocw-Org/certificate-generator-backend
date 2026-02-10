import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

    try {
        const { data, error } = await resend.emails.send({
            from: 'Idiomas OCW <onboarding@resend.dev>', // Cambiarás esto cuando tengas dominio verificado
            to: [email],
            subject: 'Recuperación de Contraseña - Idiomas OCW',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background: linear-gradient(135deg, #002e5b 0%, #004080 100%);
                            border-radius: 24px;
                            padding: 40px;
                            text-align: center;
                            color: white;
                        }
                        .logo {
                            width: 80px;
                            height: 80px;
                            background: #00bcd4;
                            border-radius: 20px;
                            margin: 0 auto 20px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 40px;
                        }
                        h1 {
                            margin: 0 0 10px;
                            font-size: 28px;
                            font-weight: 800;
                        }
                        .subtitle {
                            color: rgba(255, 255, 255, 0.7);
                            font-size: 12px;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                            margin-bottom: 30px;
                        }
                        .content {
                            background: white;
                            color: #333;
                            border-radius: 16px;
                            padding: 30px;
                            margin: 20px 0;
                            text-align: left;
                        }
                        .button {
                            display: inline-block;
                            background: #00bcd4;
                            color: white;
                            text-decoration: none;
                            padding: 16px 40px;
                            border-radius: 12px;
                            font-weight: bold;
                            margin: 20px 0;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            font-size: 14px;
                        }
                        .footer {
                            color: rgba(255, 255, 255, 0.5);
                            font-size: 12px;
                            margin-top: 30px;
                        }
                        .warning {
                            background: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 12px;
                            margin: 20px 0;
                            border-radius: 4px;
                            color: #856404;
                            font-size: 14px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="logo">🔐</div>
                        <h1>Recuperación de Contraseña</h1>
                        <p class="subtitle">Idiomas OCW Security</p>
                        
                        <div class="content">
                            <p>Hola,</p>
                            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>Idiomas OCW</strong>.</p>
                            
                            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                            
                            <center>
                                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
                            </center>
                            
                            <div class="warning">
                                ⏱️ <strong>Este enlace expirará en 1 hora</strong> por seguridad.
                            </div>
                            
                            <p style="font-size: 14px; color: #666; margin-top: 20px;">
                                <strong>¿No solicitaste este cambio?</strong><br>
                                Si no fuiste tú quien solicitó restablecer la contraseña, puedes ignorar este correo. Tu contraseña actual seguirá siendo válida.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                            <p>© 2026 Idiomas OCW - Sistema de Certificados</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('❌ Error al enviar email:', error);
            throw new Error('No se pudo enviar el correo de recuperación');
        }

        console.log('✅ Email enviado exitosamente:', data);
        return data;
    } catch (error) {
        console.error('❌ Error en sendPasswordResetEmail:', error);
        throw error;
    }
}
