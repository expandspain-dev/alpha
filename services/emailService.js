/**
 * EXPANDSPAIN ALPHA™ - EMAIL SERVICE (v3.1.0 - VERIFICATION ADDED)
 * Integração com SendGrid para envio de emails
 * FIX: Adicionada a função sendVerificationEmail e exportada corretamente.
 */

const sgMail = require('@sendgrid/mail');

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'info@expandspain.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'ExpandSpain Alpha';

// ============================================================================
// FUNÇÃO 1: Enviar Email de Verificação (A que estava faltando)
// ============================================================================
/**
 * Envia email com código de verificação de 6 dígitos
 * @param {string} userEmail - Email do destinatário
 * @param {string} accessCode - O código de 6 dígitos
 * @param {string} language - Idioma ('pt', 'en', 'es')
 * @param {string} [firstName] - Nome do usuário (opcional)
 */
async function sendVerificationEmail(userEmail, accessCode, language = 'pt', firstName = '') {
    try {
        console.log('📧 Preparando email de verificação...');

        const translations = {
            pt: {
                subject: `Seu código de verificação Alpha™ é ${accessCode}`,
                greeting: `Olá ${firstName}`,
                line1: `O seu código de verificação para o Autodiagnóstico Alpha™ é:`,
                line2: `Este código expirará em 15 minutos.`,
                line3: `Se você não solicitou este código, por favor ignore este email.`
            },
            en: {
                subject: `Your Alpha™ verification code is ${accessCode}`,
                greeting: `Hello ${firstName}`,
                line1: `Your verification code for the Alpha™ Self-Diagnosis is:`,
                line2: `This code will expire in 15 minutes.`,
                line3: `If you did not request this code, please ignore this email.`
            },
            es: {
                subject: `Tu código de verificación Alpha™ es ${accessCode}`,
                greeting: `Hola ${firstName}`,
                line1: `Tu código de verificación para el Autodiagnóstico Alpha™ es:`,
                line2: `Este código expirará en 15 minutos.`,
                line3: `Si no solicitaste este código, por favor ignora este correo.`
            }
        };

        const t = translations[language] || translations['pt'];

        const msg = {
            to: userEmail,
            from: {
                email: FROM_EMAIL,
                name: FROM_NAME
            },
            subject: t.subject,
            html: generateVerificationEmailHTML(t, accessCode),
        };

        await sgMail.send(msg);

        console.log('✅ Email de verificação enviado com sucesso');
        console.log(`   Para: ${userEmail}`);

        return true;

    } catch (error) {
        console.error('❌ Erro ao enviar email de verificação:', error.message);
        if (error.response) console.error('   Response body:', error.response.body);
        throw error;
    }
}

/**
 * Gera o HTML para o email de verificação
 */
function generateVerificationEmailHTML(t, accessCode) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: #050209; color: #EAEAEA; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: auto; background-color: #0a0512; border: 1px solid #333; border-radius: 8px; padding: 40px; }
            .header { text-align: center; color: #FF1493; font-size: 24px; font-weight: bold; margin-bottom: 30px; }
            .code-box { background: linear-gradient(135deg, #0077ff, #00BFFF); color: white; text-align: center; padding: 25px; font-size: 36px; font-weight: bold; letter-spacing: 10px; border-radius: 8px; margin: 30px 0; }
            p { line-height: 1.7; font-size: 16px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">Alpha™ Self-Diagnosis</div>
            <p>${t.greeting},</p>
            <p>${t.line1}</p>
            <div class="code-box">${accessCode}</div>
            <p>${t.line2}</p>
            <p>${t.line3}</p>
            <div class="footer">ExpandSpain - Alpha™ System</div>
        </div>
    </body>
    </html>
    `;
}

// ============================================================================
// FUNÇÃO 2: Enviar Email de Diagnóstico (A que já existia)
// ============================================================================
/**
 * Envia email com resultado do diagnóstico
 */
async function sendDiagnosisEmail(userData, scoreData, aiAnalysis, accessCode, language = 'pt') {
    // ... todo o código da sua função sendDiagnosisEmail original ...
    // ... (não precisa mudar nada aqui) ...
    try {
        console.log('📧 Preparando email de diagnóstico...');
        const resultUrl = `${process.env.SITE_URL || 'https://expandspain.com'}/teste/resultado?code=${accessCode}`;
        const oracleUrl = `${process.env.SITE_URL || 'https://expandspain.com'}/oracle?code=${accessCode}&score=${scoreData.score}`;
        const subjects = { pt: `Seu Alpha™ Diagnosis: ${scoreData.score}/100 - ${scoreData.status}`, en: `Your Alpha™ Diagnosis: ${scoreData.score}/100 - ${scoreData.status}`, es: `Tu Alpha™ Diagnosis: ${scoreData.score}/100 - ${scoreData.status}` };
        const htmlContent = generateEmailHTML(userData, scoreData, aiAnalysis, accessCode, resultUrl, oracleUrl, language);
        const msg = { to: userData.email, from: { email: FROM_EMAIL, name: FROM_NAME }, subject: subjects[language] || subjects['pt'], html: htmlContent, trackingSettings: { clickTracking: { enable: true }, openTracking: { enable: true } } };
        await sgMail.send(msg);
        console.log('✅ Email enviado com sucesso');
        console.log(`   Para: ${userData.email}`);
        console.log(`   Assunto: ${msg.subject}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error.message);
        if (error.response) console.error('   Response body:', error.response.body);
        throw error;
    }
}

/**
 * Gera HTML do email
 */
function generateEmailHTML(userData, scoreData, aiAnalysis, accessCode, resultUrl, oracleUrl, language) {
    // ... todo o código da sua função generateEmailHTML original ...
    // ... (não precisa mudar nada aqui) ...
    const translations = { pt: { greeting: 'Olá', title: 'Seu Alpha™ Diagnosis Está Pronto', score: 'Score', status: 'Status', aiAnalysis: 'Análise Estratégica da IA', gaps: 'Gaps Críticos Identificados', strengths: 'Seus Pontos Fortes', cta: 'ACESSAR POWER ORACLE™ AGORA', viewFullReport: 'Ver Relatório Completo', accessCode: 'Seu código de acesso', footer: 'ExpandSpain - Alpha™ Self-Diagnosis System' }, en: { greeting: 'Hello', title: 'Your Alpha™ Diagnosis is Ready', score: 'Score', status: 'Status', aiAnalysis: 'AI Strategic Analysis', gaps: 'Critical Gaps Identified', strengths: 'Your Strengths', cta: 'ACCESS POWER ORACLE™ NOW', viewFullReport: 'View Full Report', accessCode: 'Your access code', footer: 'ExpandSpain - Alpha™ Self-Diagnosis System' }, es: { greeting: 'Hola', title: 'Tu Alpha™ Diagnosis Está Listo', score: 'Puntaje', status: 'Estado', aiAnalysis: 'Análisis Estratégico de IA', gaps: 'Gaps Críticos Identificados', strengths: 'Tus Fortalezas', cta: 'ACCEDER A POWER ORACLE™ AHORA', viewFullReport: 'Ver Informe Completo', accessCode: 'Tu código de acceso', footer: 'ExpandSpain - Alpha™ Self-Diagnosis System' } };
    const t = translations[language] || translations['pt'];
    return `<!DOCTYPE html><html lang="${language}"><head><meta charset="UTF-8"><title>${t.title}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#050209;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050209;"><tr><td align="center" style="padding:40px 20px;"><table width="600" cellpadding="0" cellspacing="0" style="background-color:#0a0512;border-radius:8px;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#A020A0,#FF1493);padding:50px 30px;text-align:center;"><h1 style="color:white;margin:0 0 10px 0;font-size:28px;font-weight:bold;">${t.title}</h1><div style="background:rgba(0,0,0,0.3);padding:25px;border-radius:10px;margin-top:25px;"><div style="font-size:56px;font-weight:bold;color:white;margin:0;line-height:1;">${scoreData.score}/100</div><div style="font-size:20px;color:white;margin-top:10px;">${scoreData.status}</div></div></td></tr><tr><td style="padding:40px 30px;background:#0a0512;"><h2 style="color:#FF1493;margin:0 0 20px 0;font-size:22px;">🤖 ${t.aiAnalysis}</h2><div style="background:rgba(255,255,255,0.03);padding:25px;border-left:4px solid #FF1493;border-radius:4px;line-height:1.7;color:#EAEAEA;white-space:pre-wrap;">${aiAnalysis}</div></td></tr>${scoreData.gaps&&scoreData.gaps.length>0?`<tr><td style="padding:30px;background:#1a0d0d;border-top:2px solid #FF1493;"><h3 style="color:#FF6B6B;margin:0 0 15px 0;font-size:18px;">⚠️ ${t.gaps}</h3><ul style="margin:0;padding-left:20px;color:#EAEAEA;line-height:1.8;">${scoreData.gaps.map(gap=>`<li style="margin-bottom:10px;">${gap}</li>`).join('')}</ul></td></tr>`:''}${scoreData.strengths&&scoreData.strengths.length>0?`<tr><td style="padding:30px;background:#0a0512;"><h3 style="color:#00BFFF;margin:0 0 15px 0;font-size:18px;">✅ ${t.strengths}</h3><ul style="margin:0;padding-left:20px;color:#EAEAEA;line-height:1.8;">${scoreData.strengths.map(strength=>`<li style="margin-bottom:10px;">${strength}</li>`).join('')}</ul></td></tr>`:''}<tr><td style="padding:50px 30px;background:linear-gradient(135deg,#A020A0,#FF1493);text-align:center;"><h2 style="color:white;margin:0 0 15px 0;font-size:28px;text-transform:uppercase;letter-spacing:2px;">🎯 Power Oracle™</h2><p style="color:white;font-size:18px;margin:0 0 10px 0;">Transform your diagnosis into ACTION</p><div style="text-align:left;margin:30px 0;background:rgba(0,0,0,0.2);padding:20px;border-radius:8px;"><div style="color:white;margin-bottom:10px;">✓ <strong>Alpha Mindset</strong> - Strategic visa usage</div><div style="color:white;margin-bottom:10px;">✓ <strong>Legal Anatomy</strong> - Complete requirements</div><div style="color:white;margin-bottom:10px;">✓ <strong>War Room Docs</strong> - Ready templates</div><div style="color:white;margin-bottom:10px;">✓ <strong>Integrated Family</strong> - Family planning</div></div><div style="margin:30px 0;"><p style="color:white;font-size:16px;margin:0;text-decoration:line-through;opacity:0.7;">€497</p><p style="color:white;font-size:48px;font-weight:bold;margin:10px 0;text-shadow:0 0 20px rgba(255,255,255,0.5);">€97</p><p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">100% credited to Code +34™ • 30-Day Guarantee</p></div><a href="${oracleUrl}" style="display:inline-block;background:white;color:#A020A0;padding:20px 50px;text-decoration:none;border-radius:5px;font-weight:bold;font-size:18px;text-transform:uppercase;letter-spacing:1px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">${t.cta} →</a><p style="color:white;margin-top:25px;font-size:13px;opacity:0.9;">⚡ Instant Access &nbsp; 🛡️ 30-Day Guarantee &nbsp; 🔄 Lifetime Updates</p></td></tr><tr><td style="padding:40px 30px;background:#0a0512;text-align:center;"><p style="color:#EAEAEA;margin:0 0 15px 0;">${t.accessCode}:</p><div style="background:linear-gradient(135deg,#0077ff,#00BFFF);padding:25px;font-size:36px;font-weight:bold;letter-spacing:10px;color:white;border-radius:8px;box-shadow:0 0 30px rgba(0,119,255,0.5);">${accessCode}</div><p style="color:rgba(234,234,234,0.7);margin:20px 0 0 0;font-size:13px;">Use this code to access your complete report anytime</p><p style="margin-top:20px;"><a href="${resultUrl}" style="color:#00BFFF;text-decoration:none;">${t.viewFullReport} →</a></p></td></tr><tr><td style="padding:30px;background:#000000;text-align:center;border-top:1px solid rgba(255,255,255,0.1);"><p style="color:#666;font-size:12px;margin:0 0 5px 0;">${t.footer}</p><p style="color:#666;font-size:11px;margin:0;">Transforming geography into competitive advantage</p></td></tr></table></td></tr></table></body></html>`;
}

// ============================================================================
// CORREÇÃO FINAL: Exportar ambas as funções
// ============================================================================
module.exports = {
    sendDiagnosisEmail,
    sendVerificationEmail // A linha que faltava
};
