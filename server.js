/**
 * EXPANDSPAIN ALPHA™ - MAIN SERVER v3.1.0 (NUMERIC CODE FIX)
 * 
 * CHANGELOG v3.1.0:
 * ✅ CRÍTICO: Corrigido bug de validação na action VERIFY_CODE.
 * ✅ MELHORADO: Código de verificação agora é numérico (6 dígitos) para melhor UX.
 * ✅ MELHORADO: Atualizada a validação para esperar um código numérico.
 * 
 * @author ExpandSpain Team
 * @version 3.1.0
 * @license Proprietary
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4, validate: isValidUUID } = require('uuid');

// Importar módulos
const { pool, testConnection, closePool } = require('./config/database');
const conversation = require('./conversation');
const scoring = require('./scoring');
const { generateAIAnalysis } = require('./services/aiService');
const { sendDiagnosisEmail, sendVerificationEmail } = require('./services/emailService');
const { sendResultNotification } = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SECURITY MIDDLEWARES
// ============================================================================

app.use(helmet());
const allowedOrigins = ['https://expandspain.com', 'https://www.expandspain.com'];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Origem bloqueada -> ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.set('trust proxy', 1);

// ============================================================================
// RATE LIMITING
// ============================================================================

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, error: 'Too many requests.', code: 'RATE_LIMIT_EXCEEDED' }, standardHeaders: true, legacyHeaders: false, skip: (req) => req.path === '/health' });
const diagnoseLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: { success: false, error: 'Too many diagnosis requests.', code: 'DIAGNOSIS_LIMIT_EXCEEDED' } });
const verificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: 'Too many verification attempts.', code: 'VERIFICATION_LIMIT_EXCEEDED' } });
const resendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { success: false, error: 'Too many code resend requests.', code: 'RESEND_LIMIT_EXCEEDED' } });
app.use('/api/', globalLimiter);
app.use('/api/diagnose', diagnoseLimiter);
app.use((req, res, next) => { req.setTimeout(30000, () => res.status(408).json({ success: false, error: 'Request timeout', code: 'TIMEOUT' })); next(); });
app.use((req, res, next) => { console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`); next(); });

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req, res) => {
    const dbStatus = await testConnection();
    res.json({ status: dbStatus ? 'ok' : 'degraded', version: '3.1.0', services: { database: dbStatus ? 'connected' : 'disconnected', email: !!process.env.SENDGRID_API_KEY, ai: !!process.env.GEMINI_API_KEY } });
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const validateStart = [
    body('action').equals('START'),
    body('language').optional().isIn(['pt', 'en', 'es']),
    body('userData.email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('userData.firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('userData.lastName').optional().trim().isLength({ min: 1, max: 100 }),
    body('userData.whatsapp').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 25 }),
    body('userData.passportCountry').optional().trim().isLength({ min: 2, max: 100 }),
];

// ===================================================================
// INÍCIO DA CORREÇÃO 2
// ===================================================================
const validateVerifyCode = [
    body('action').equals('VERIFY_CODE'),
    body('sessionId').isUUID(4).withMessage('Invalid sessionId format'),
    body('code')
        .trim()
        .matches(/^[0-9]{6}$/) // ✅ CORREÇÃO: Aceita apenas 6 dígitos numéricos.
        .withMessage('Code must be a 6-digit number'),
];
// ===================================================================
// FIM DA CORREÇÃO 2
// ===================================================================

const validateResendCode = [
    body('action').equals('RESEND_CODE'),
    body('sessionId').isUUID(4).withMessage('Invalid sessionId format'),
];

const validateResponse = [
    body('action').equals('RESPONSE'),
    body('sessionId').isUUID(4).withMessage('Invalid sessionId format'),
    body('responseData').isObject(),
];

const validateGenerateReport = [
    body('action').equals('GENERATE_REPORT'),
    body('sessionId').isUUID(4).withMessage('Invalid sessionId format'),
    body('language').optional().isIn(['pt', 'en', 'es']),
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// ===================================================================
// INÍCIO DA CORREÇÃO 1
// ===================================================================
/**
 * Gera um código de acesso numérico de 6 dígitos.
 */
function generateAccessCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
// ===================================================================
// FIM DA CORREÇÃO 1
// ===================================================================

/**
 * Gera código de acesso único (verifica no banco)
 */
async function generateUniqueAccessCode() {
    let code;
    let attempts = 0;
    const maxAttempts = 10;
    do {
        code = generateAccessCode();
        const [existing] = await pool.execute('SELECT id FROM alpha_diagnoses WHERE access_code = ? LIMIT 1', [code]);
        if (existing.length === 0) break;
        attempts++;
        console.warn(`⚠️  Código ${code} já existe. Tentando novamente...`);
    } while (attempts < maxAttempts);
    if (attempts === maxAttempts) throw new Error('Failed to generate unique access code');
    return code;
}

function sanitizeUserData(userData) {
    return {
        email: userData.email.toLowerCase().trim(),
        firstName: userData.firstName?.trim().substring(0, 100) || null,
        lastName: userData.lastName?.trim().substring(0, 100) || null,
        whatsapp: userData.whatsapp?.trim() ? userData.whatsapp.trim().substring(0, 25) : null,
        passportCountry: userData.passportCountry?.trim().substring(0, 100) || null,
    };
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

app.post('/api/diagnose', async (req, res) => {
    const { action } = req.body;
    try {
        if (action === 'START') {
            await Promise.all(validateStart.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR' });

            const { language = 'pt', userData } = req.body;
            console.log(`📝 Iniciando diagnóstico para: ${userData.email}`);
            const sessionId = uuidv4();
            const accessCode = await generateUniqueAccessCode();
            console.log(`🔐 Código gerado: ${accessCode} para sessão: ${sessionId}`);
            const sanitizedData = sanitizeUserData(userData);
            await pool.execute(`INSERT INTO alpha_diagnoses (session_id, access_code, email, first_name, last_name, whatsapp, passport_country, language, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [sessionId, accessCode, sanitizedData.email, sanitizedData.firstName, sanitizedData.lastName, sanitizedData.whatsapp, sanitizedData.passportCountry, language, false]);
            console.log('✅ Dados salvos no banco');
            try {
                console.log('📧 Enviando email de verificação...');
                await sendVerificationEmail(sanitizedData.email, accessCode, language, sanitizedData.firstName);
                console.log(`✅ Email de verificação enviado para: ${sanitizedData.email}`);
            } catch (emailError) {
                console.error('❌ CRÍTICO: Falha ao enviar email de verificação:', emailError.message);
                console.warn('⚠️  Continuando sem email. Usuário pode solicitar reenvio.');
            }
            const firstQuestion = conversation.getQuestion(0, language, {});
            return res.json({ success: true, sessionId: sessionId, message: 'Verification code sent to your email', question: firstQuestion, progress: { current: 0, total: 20 } });
        }

        if (action === 'VERIFY_CODE') {
            await new Promise(resolve => verificationLimiter(req, res, resolve));
            await Promise.all(validateVerifyCode.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR' });
            
            const { sessionId, code } = req.body;
            console.log(`🔐 Verificando código da sessão: ${sessionId}`);
            const [sessions] = await pool.execute(`SELECT session_id, access_code, created_at, email_verified FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' });
            
            const session = sessions[0];
            if (session.email_verified) return res.json({ success: true, verified: true, message: 'Email already verified' });
            
            const codeAge = Date.now() - new Date(session.created_at).getTime();
            if (codeAge > 15 * 60 * 1000) return res.status(400).json({ success: false, error: 'Code expired.', code: 'CODE_EXPIRED' });
            
            if (code !== session.access_code) return res.status(400).json({ success: false, error: 'Invalid verification code', code: 'INVALID_CODE' });
            
            await pool.execute(`UPDATE alpha_diagnoses SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW() WHERE session_id = ?`, [sessionId]);
            console.log(`✅ Código verificado com sucesso para: ${sessionId}`);
            return res.json({ success: true, verified: true, message: 'Email verified successfully' });
        }

        if (action === 'RESEND_CODE') {
            await new Promise(resolve => resendLimiter(req, res, resolve));
            await Promise.all(validateResendCode.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR' });
            
            const { sessionId } = req.body;
            console.log(`📧 Reenviando código para sessão: ${sessionId}`);
            const [sessions] = await pool.execute(`SELECT session_id, email, first_name, language, email_verified FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' });
            
            const session = sessions[0];
            if (session.email_verified) return res.json({ success: true, message: 'Email already verified.' });
            
            const newAccessCode = await generateUniqueAccessCode();
            console.log(`🔐 Novo código gerado: ${newAccessCode}`);
            await pool.execute(`UPDATE alpha_diagnoses SET access_code = ?, created_at = NOW(), updated_at = NOW() WHERE session_id = ?`, [newAccessCode, sessionId]);
            try {
                await sendVerificationEmail(session.email, newAccessCode, session.language, session.first_name);
                console.log(`✅ Novo código enviado para: ${session.email}`);
                return res.json({ success: true, message: 'New verification code sent' });
            } catch (emailError) {
                console.error('❌ Erro ao reenviar código:', emailError.message);
                return res.status(500).json({ success: false, error: 'Failed to send email', code: 'EMAIL_SEND_FAILED' });
            }
        }
        
        // ... O restante do código para RESPONSE e GENERATE_REPORT permanece o mesmo ...
        // ... (Para manter a resposta concisa, omiti as seções que não foram alteradas) ...

        // ACTION: RESPONSE
        if (action === 'RESPONSE') {
            await Promise.all(validateResponse.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR' });
            const { sessionId, responseData } = req.body;
            const [sessions] = await pool.execute(`SELECT session_id, answers_json, completed_at, language, current_question_index, email_verified FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            const session = sessions[0];
            if (!session.email_verified) return res.status(403).json({ success: false, error: 'Email not verified.', code: 'EMAIL_NOT_VERIFIED' });
            if (session.completed_at) return res.status(400).json({ success: false, error: 'Test already completed' });
            let answers = session.answers_json ? JSON.parse(session.answers_json) : {};
            const currentIndex = session.current_question_index;
            answers[currentIndex] = responseData;
            const nextIndex = currentIndex + 1;
            await pool.execute(`UPDATE alpha_diagnoses SET answers_json = ?, current_question_index = ?, updated_at = NOW() WHERE session_id = ?`, [JSON.stringify(answers), nextIndex, sessionId]);
            const nextQuestion = conversation.getQuestion(nextIndex, session.language, answers);
            if (!nextQuestion) return res.json({ success: true, completed: true, message: 'Test completed.' });
            return res.json({ success: true, completed: false, question: nextQuestion, progress: { current: nextIndex, total: 20 } });
        }

        // ACTION: GENERATE_REPORT
        if (action === 'GENERATE_REPORT') {
            await Promise.all(validateGenerateReport.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR' });
            const { sessionId, language } = req.body;
            const [sessions] = await pool.execute(`SELECT * FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            const session = sessions[0];
            if (!session.email_verified) return res.status(403).json({ success: false, error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
            if (session.completed_at) {
                let reportData = JSON.parse(session.report_json || '{}');
                return res.json({ success: true, score: session.score, status: session.status, statusColor: session.status_color, profile: reportData.profile, gaps: reportData.gaps, strengths: reportData.strengths, aiAnalysis: session.ai_analysis, accessCode: session.access_code, message: 'Report already generated' });
            }
            const answers = JSON.parse(session.answers_json || '{}');
            const reportLanguage = language || session.language || 'pt';
            const scoreData = scoring.calculateScore(answers, reportLanguage);
            const aiAnalysis = await generateAIAnalysis(scoreData, answers, reportLanguage);
            const reportData = { gaps: scoreData.gaps, strengths: scoreData.strengths, profile: scoreData.profile };
            await pool.execute(`UPDATE alpha_diagnoses SET score = ?, status = ?, status_color = ?, report_json = ?, ai_analysis = ?, completed_at = NOW(), updated_at = NOW() WHERE session_id = ?`, [scoreData.score, scoreData.status, scoreData.statusColor, JSON.stringify(reportData), aiAnalysis, sessionId]);
            let emailSent = false, whatsappSent = false;
            try {
                await sendDiagnosisEmail({ email: session.email, firstName: session.first_name }, scoreData, aiAnalysis, session.access_code, reportLanguage);
                emailSent = true;
            } catch (e) { console.error('❌ Erro ao enviar email de resultado:', e.message); }
            if (session.whatsapp) {
                try {
                    if (await sendResultNotification({ firstName: session.first_name, whatsapp: session.whatsapp }, scoreData, session.access_code, reportLanguage)) whatsappSent = true;
                } catch (e) { console.error('❌ Erro ao enviar WhatsApp:', e.message); }
            }
            return res.json({ success: true, ...scoreData, aiAnalysis, accessCode: session.access_code, notifications: { emailSent, whatsappSent } });
        }

        return res.status(400).json({ success: false, error: 'Invalid action', code: 'INVALID_ACTION', validActions: ['START', 'VERIFY_CODE', 'RESEND_CODE', 'RESPONSE', 'GENERATE_REPORT'] });
    } catch (error) {
        console.error('❌ Erro fatal no /api/diagnose:', error);
        return res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
});

// ============================================================================
// ERROR HANDLERS & STARTUP
// ============================================================================

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' }));
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    if (err.message === 'Not allowed by CORS') return res.status(403).json({ success: false, error: 'CORS policy violation', code: 'CORS_ERROR' });
    if (err.status === 429) return res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' });
    res.status(err.status || 500).json({ success: false, error: 'Internal server error', code: 'UNHANDLED_ERROR' });
});
async function startServer() {
    try {
        const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'GEMINI_API_KEY', 'SENDGRID_API_KEY'];
        const missing = required.filter(v => !process.env[v]);
        if (missing.length) throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
        if (!await testConnection()) throw new Error('Falha na conexão com o banco de dados');
        app.listen(PORT, () => {
            console.log('='.repeat(70));
            console.log(`🚀 EXPANDSPAIN ALPHA™ v3.1.0 - BACKEND CORRIGIDO`);
            console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}, Porta: ${PORT}`);
            console.log('='.repeat(70));
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', async () => { console.log('📴 Encerrando...'); await closePool(); process.exit(0); });
process.on('SIGINT', async () => { console.log('📴 Encerrando...'); await closePool(); process.exit(0); });
process.on('unhandledRejection', (reason) => console.error('🚨 Unhandled Rejection:', reason));
startServer();
module.exports = app;
