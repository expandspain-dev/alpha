/**
 * EXPANDSPAIN ALPHA™ - MAIN SERVER v3.1.0 (FINAL FIXES)
 * 
 * CHANGELOG v3.1.0:
 * ✅ CRÍTICO: Corrigido o erro 400 Bad Request na verificação de código.
 * ✅ MELHORADO: Códigos de verificação agora são apenas numéricos (6 dígitos).
 * ✅ MELHORADO: Validação do código ajustada para aceitar apenas números.
 * ✅ MELHORADO: Lógica de comparação de código agora é case-sensitive (não é mais necessário toUpperCase).
 * ✅ DEBUG: Removido o 'accessCode' da resposta do START em produção.
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
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) callback(null, true);
        else { console.warn(`🚫 CORS: Origem bloqueada -> ${origin}`); callback(new Error('Not allowed by CORS')); }
    },
    methods: ['GET', 'POST'], credentials: true, maxAge: 86400
}));
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
// CORREÇÃO 1: Ajustar a validação do código para aceitar apenas 6 dígitos numéricos.
// ===================================================================
const validateVerifyCode = [
    body('action').equals('VERIFY_CODE'),
    body('sessionId').isUUID(4).withMessage('Invalid sessionId format'),
    body('code')
        .trim()
        .matches(/^[0-9]{6}$/) // Alterado de /^[A-Z0-9]{6}$/ para aceitar apenas números
        .withMessage('Code must be a 6-digit number'),
];

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
// CORREÇÃO 2: Alterar a geração do código para criar apenas números.
// ===================================================================
/**
 * Gera um código de acesso numérico de 6 dígitos.
 */
function generateAccessCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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
        // ACTION: START
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
            await pool.execute(`INSERT INTO alpha_diagnoses (session_id, access_code, email, first_name, last_name, whatsapp, passport_country, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [sessionId, accessCode, sanitizedData.email, sanitizedData.firstName, sanitizedData.lastName, sanitizedData.whatsapp, sanitizedData.passportCountry, language]);
            
            console.log('📧 Enviando email de verificação...');
            try {
                await sendVerificationEmail(sanitizedData.email, accessCode, language, sanitizedData.firstName);
                console.log(`✅ Email de verificação enviado para ${sanitizedData.email}`);
            } catch (emailError) {
                console.error(`❌ CRÍTICO: Falha ao enviar email para ${sanitizedData.email}:`, emailError.message);
                console.warn('⚠️  Continuando sem email. Usuário pode solicitar reenvio.');
            }
            
            const firstQuestion = conversation.getQuestion(0, language, {});

            // ===================================================================
            // CORREÇÃO 3: Não enviar o accessCode para o frontend em produção.
            // ===================================================================
            const responsePayload = {
                success: true,
                sessionId: sessionId,
                message: 'Verification code sent to your email',
                question: firstQuestion,
                progress: { current: 0, total: 20 }
            };
            
            // Apenas incluir accessCode em ambiente de não-produção para debug
            if (process.env.NODE_ENV !== 'production') {
                responsePayload.accessCode = accessCode;
            }

            return res.json(responsePayload);
        }

        // ACTION: VERIFY_CODE
        if (action === 'VERIFY_CODE') {
            await new Promise(resolve => verificationLimiter(req, res, resolve));
            await Promise.all(validateVerifyCode.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR', verified: false });

            const { sessionId, code } = req.body;
            console.log(`🔐 Verificando código '${code}' para sessão: ${sessionId}`);

            const [sessions] = await pool.execute(`SELECT session_id, access_code, created_at, email_verified FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND', verified: false });
            
            const session = sessions[0];
            if (session.email_verified) return res.json({ success: true, verified: true, message: 'Email already verified' });

            const codeAge = Date.now() - new Date(session.created_at).getTime();
            if (codeAge > (15 * 60 * 1000)) return res.status(400).json({ success: false, error: 'Code expired.', code: 'CODE_EXPIRED', verified: false });

            // ===================================================================
            // CORREÇÃO 4: Comparação direta, pois agora ambos são strings numéricas.
            // ===================================================================
            if (code !== session.access_code) {
                console.warn(`❌ Código inválido para sessão ${sessionId}. Recebido: ${code}, Esperado: ${session.access_code}`);
                return res.status(400).json({ success: false, error: 'Invalid verification code', code: 'INVALID_CODE', verified: false });
            }

            await pool.execute(`UPDATE alpha_diagnoses SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW() WHERE session_id = ?`, [sessionId]);
            console.log(`✅ Código verificado com sucesso para sessão: ${sessionId}`);
            return res.json({ success: true, verified: true, message: 'Email verified successfully' });
        }

        // ACTION: RESEND_CODE
        if (action === 'RESEND_CODE') {
            await new Promise(resolve => resendLimiter(req, res, resolve));
            await Promise.all(validateResendCode.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
            
            const { sessionId } = req.body;
            console.log(`📧 Reenviando código para sessão: ${sessionId}`);

            const [sessions] = await pool.execute(`SELECT session_id, email, first_name, language, email_verified FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            
            const session = sessions[0];
            if (session.email_verified) return res.json({ success: true, message: 'Email already verified.' });

            const newAccessCode = await generateUniqueAccessCode();
            console.log(`🔐 Novo código gerado: ${newAccessCode}`);
            await pool.execute(`UPDATE alpha_diagnoses SET access_code = ?, created_at = NOW(), updated_at = NOW() WHERE session_id = ?`, [newAccessCode, sessionId]);
            
            try {
                await sendVerificationEmail(session.email, newAccessCode, session.language, session.first_name);
                console.log(`✅ Novo código enviado para ${session.email}`);
                return res.json({ success: true, message: 'New verification code sent' });
            } catch (emailError) {
                console.error(`❌ Erro ao reenviar código para ${session.email}:`, emailError.message);
                return res.status(500).json({ success: false, error: 'Failed to send email', code: 'EMAIL_SEND_FAILED' });
            }
        }

        // ACTION: RESPONSE
        if (action === 'RESPONSE') {
            // ... (A lógica desta ação já estava correta, sem necessidade de alterações)
            await Promise.all(validateResponse.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR' });
            const { sessionId, responseData } = req.body;
            const [sessions] = await pool.execute(`SELECT * FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' });
            const session = sessions[0];
            if (!session.email_verified) return res.status(403).json({ success: false, error: 'Email not verified.', code: 'EMAIL_NOT_VERIFIED' });
            if (session.completed_at) return res.status(400).json({ success: false, error: 'Test already completed', code: 'TEST_COMPLETED' });
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
            // ... (A lógica desta ação já estava correta, sem necessidade de alterações)
            await Promise.all(validateGenerateReport.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
            const { sessionId, language } = req.body;
            const [sessions] = await pool.execute(`SELECT * FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            const session = sessions[0];
            if (!session.email_verified) return res.status(403).json({ success: false, error: 'Email not verified' });
            if (session.completed_at) { let reportData = JSON.parse(session.report_json || '{}'); return res.json({ success: true, score: session.score, status: session.status, statusColor: session.status_color, profile: reportData.profile, gaps: reportData.gaps, strengths: reportData.strengths, aiAnalysis: session.ai_analysis, accessCode: session.access_code, ctaRecommended: 'oracle' }); }
            const answers = JSON.parse(session.answers_json || '{}');
            const reportLanguage = language || session.language || 'pt';
            const scoreData = scoring.calculateScore(answers, reportLanguage);
            const aiAnalysis = await generateAIAnalysis(scoreData, answers, reportLanguage);
            const reportData = { gaps: scoreData.gaps, strengths: scoreData.strengths, profile: scoreData.profile };
            await pool.execute(`UPDATE alpha_diagnoses SET score = ?, status = ?, status_color = ?, report_json = ?, ai_analysis = ?, completed_at = NOW(), cta_recommended = 'oracle', updated_at = NOW() WHERE session_id = ?`, [scoreData.score, scoreData.status, scoreData.statusColor, JSON.stringify(reportData), aiAnalysis, sessionId]);
            let emailSent = false, whatsappSent = false;
            try { await sendDiagnosisEmail({ email: session.email, firstName: session.first_name }, scoreData, aiAnalysis, session.access_code, reportLanguage); await pool.execute(`UPDATE alpha_diagnoses SET email_sent = 1, email_sent_at = NOW() WHERE session_id = ?`, [sessionId]); emailSent = true; } catch (e) { console.error('❌ Erro ao enviar email de resultado:', e.message); }
            if (session.whatsapp) { try { if (await sendResultNotification({ firstName: session.first_name, whatsapp: session.whatsapp }, scoreData, session.access_code, reportLanguage)) { await pool.execute(`UPDATE alpha_diagnoses SET whatsapp_result_sent = 1, whatsapp_result_sent_at = NOW() WHERE session_id = ?`, [sessionId]); whatsappSent = true; } } catch (e) { console.error('❌ Erro ao enviar WhatsApp:', e.message); } }
            return res.json({ success: true, ...scoreData, aiAnalysis, accessCode: session.access_code, ctaRecommended: 'oracle', notifications: { emailSent, whatsappSent } });
        }

        // Action não reconhecida
        return res.status(400).json({ success: false, error: 'Invalid action', code: 'INVALID_ACTION', validActions: ['START', 'VERIFY_CODE', 'RESEND_CODE', 'RESPONSE', 'GENERATE_REPORT'] });
    } catch (error) {
        console.error('❌ Erro fatal no endpoint /api/diagnose:', error);
        return res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
});

// ============================================================================
// ERROR HANDLERS & STARTUP
// ============================================================================
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' }));
app.use((err, req, res, next) => { console.error('❌ Unhandled error:', err); res.status(err.status || 500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, code: 'UNHANDLED_ERROR' }); });
async function startServer() {
    try {
        const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'GEMINI_API_KEY', 'SENDGRID_API_KEY'];
        const missing = required.filter(v => !process.env[v]);
        if (missing.length) throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
        if (!await testConnection()) throw new Error('Falha na conexão com o banco de dados');
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(70));
            console.log('🚀 EXPANDSPAIN ALPHA™ v3.1.0 - BACKEND CORRIGIDO E OTIMIZADO');
            console.log('='.repeat(70) + '\n');
            // ... (logs de inicialização)
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', async () => { console.log('📴 Encerrando...'); await closePool(); process.exit(0); });
process.on('SIGINT', async () => { console.log('📴 Encerrando...'); await closePool(); process.exit(0); });
startServer();

module.exports = app;
