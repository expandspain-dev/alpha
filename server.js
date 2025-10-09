/**
 * EXPANDSPAIN ALPHA™ - MAIN SERVER v3.1.1 (CRITICAL INSERT FIX)
 * 
 * CHANGELOG v3.1.1:
 * ✅ CRÍTICO: Corrigida a query SQL INSERT na ação START, que impedia o envio de emails.
 * ✅ Mantidos códigos de verificação numéricos.
 * ✅ Mantida a validação de código numérico.
 * 
 * @author ExpandSpain Team
 * @version 3.1.1
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
const allowedOrigins = [
    'https://expandspain.com',
    'https://www.expandspain.com',
    // 'http://localhost:3000',
    // 'http://127.0.0.1:5500'
];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Origem bloqueada -> ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'], credentials: true, maxAge: 86400
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.set('trust proxy', 1);

// ============================================================================
// RATE LIMITING
// ============================================================================
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, error: 'Too many requests.' }, standardHeaders: true, legacyHeaders: false });
const diagnoseLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: { success: false, error: 'Too many diagnosis requests.' } });
const verificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: 'Too many verification attempts.' } });
const resendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { success: false, error: 'Too many code resend requests.' } });
app.use('/api/', globalLimiter);
app.use('/api/diagnose', diagnoseLimiter);

// ============================================================================
// GENERAL MIDDLEWARES
// ============================================================================
app.use((req, res, next) => { req.setTimeout(30000, () => res.status(408).json({ success: false, error: 'Request timeout' })); next(); });
app.use((req, res, next) => { console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`); next(); });

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', async (req, res) => {
    const dbStatus = await testConnection();
    res.json({ status: dbStatus ? 'ok' : 'degraded', version: '3.1.1', services: { database: dbStatus ? 'connected' : 'disconnected' } });
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const validateStart = [
    body('language').optional().isIn(['pt', 'en', 'es']),
    body('userData.email').isEmail().normalizeEmail().withMessage('Invalid email address'),
];
const validateVerifyCode = [
    body('sessionId').isUUID(4).withMessage('Invalid sessionId'),
    body('code').trim().matches(/^[0-9]{6}$/).withMessage('Code must be a 6-digit number'),
];
const validateResendCode = [ body('sessionId').isUUID(4).withMessage('Invalid sessionId') ];
const validateResponse = [ body('sessionId').isUUID(4), body('responseData').isObject() ];
const validateGenerateReport = [ body('sessionId').isUUID(4) ];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateAccessCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }
async function generateUniqueAccessCode() {
    let code; let attempts = 0;
    do {
        code = generateAccessCode();
        const [existing] = await pool.execute('SELECT id FROM alpha_diagnoses WHERE access_code = ? LIMIT 1', [code]);
        if (existing.length === 0) return code;
        attempts++;
    } while (attempts < 10);
    throw new Error('Failed to generate unique access code');
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
        // ========================================================================
        // ACTION: START
        // ========================================================================
        if (action === 'START') {
            await Promise.all(validateStart.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

            const { language = 'pt', userData } = req.body;
            console.log(`📝 Iniciando diagnóstico para: ${userData.email}`);

            const sessionId = uuidv4();
            const accessCode = await generateUniqueAccessCode();
            const sanitizedData = sanitizeUserData(userData);

            // ===================================================================
            // CORREÇÃO CRÍTICA: A query INSERT foi restaurada para a versão completa e correta.
            // ===================================================================
            await pool.execute(
                `INSERT INTO alpha_diagnoses 
                (session_id, access_code, email, first_name, last_name, whatsapp, 
                 passport_country, language, current_question_index, email_verified, 
                 created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    sessionId, accessCode, sanitizedData.email,
                    sanitizedData.firstName, sanitizedData.lastName, sanitizedData.whatsapp,
                    sanitizedData.passportCountry, language,
                    0,       // current_question_index
                    false    // email_verified
                ]
            );
            console.log(`✅ Sessão ${sessionId} salva no banco com código ${accessCode}`);

            console.log('📧 Enviando email de verificação...');
            try {
                await sendVerificationEmail(sanitizedData.email, accessCode, language, sanitizedData.firstName);
                console.log(`✅ Email de verificação enviado para ${sanitizedData.email}`);
            } catch (emailError) {
                console.error(`❌ CRÍTICO: Falha ao enviar email para ${sanitizedData.email}:`, emailError.message);
                console.warn('⚠️  Continuando sem email. Usuário pode solicitar reenvio.');
            }

            const responsePayload = { success: true, sessionId: sessionId, message: 'Verification code sent' };
            if (process.env.NODE_ENV !== 'production') responsePayload.accessCode = accessCode;
            return res.json(responsePayload);
        }

        // ========================================================================
        // ACTION: VERIFY_CODE
        // ========================================================================
        if (action === 'VERIFY_CODE') {
            await new Promise(resolve => verificationLimiter(req, res, resolve));
            await Promise.all(validateVerifyCode.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

            const { sessionId, code } = req.body;
            const [sessions] = await pool.execute(`SELECT session_id, access_code, created_at, email_verified FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            
            const session = sessions[0];
            if (session.email_verified) return res.json({ success: true, verified: true, message: 'Email already verified' });

            if ((Date.now() - new Date(session.created_at).getTime()) > (15 * 60 * 1000)) return res.status(400).json({ success: false, error: 'Code expired.' });
            
            if (code !== session.access_code) return res.status(400).json({ success: false, error: 'Invalid verification code' });

            await pool.execute(`UPDATE alpha_diagnoses SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW() WHERE session_id = ?`, [sessionId]);
            console.log(`✅ Código verificado para sessão: ${sessionId}`);
            return res.json({ success: true, verified: true });
        }

        // ========================================================================
        // ACTION: RESEND_CODE
        // ========================================================================
        if (action === 'RESEND_CODE') {
            await new Promise(resolve => resendLimiter(req, res, resolve));
            await Promise.all(validateResendCode.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

            const { sessionId } = req.body;
            const [sessions] = await pool.execute(`SELECT session_id, email, first_name, language, email_verified FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            
            const session = sessions[0];
            if (session.email_verified) return res.json({ success: true, message: 'Email already verified.' });

            const newAccessCode = await generateUniqueAccessCode();
            await pool.execute(`UPDATE alpha_diagnoses SET access_code = ?, created_at = NOW(), updated_at = NOW() WHERE session_id = ?`, [newAccessCode, sessionId]);
            
            try {
                await sendVerificationEmail(session.email, newAccessCode, session.language, session.first_name);
                console.log(`✅ Novo código reenviado para ${session.email}`);
                return res.json({ success: true, message: 'New code sent' });
            } catch (emailError) {
                console.error(`❌ Erro ao reenviar código para ${session.email}:`, emailError.message);
                return res.status(500).json({ success: false, error: 'Failed to resend email' });
            }
        }

        // ========================================================================
        // ACTION: RESPONSE
        // ========================================================================
        if (action === 'RESPONSE') {
            await Promise.all(validateResponse.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

            const { sessionId, responseData } = req.body;
            const [sessions] = await pool.execute(`SELECT * FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            
            const session = sessions[0];
            if (!session.email_verified) return res.status(403).json({ success: false, error: 'Email not verified.' });
            if (session.completed_at) return res.status(400).json({ success: false, error: 'Test already completed' });
            
            let answers = session.answers_json ? JSON.parse(session.answers_json) : {};
            const currentIndex = session.current_question_index;
            answers[currentIndex] = responseData;
            const nextIndex = currentIndex + 1;
            
            await pool.execute(`UPDATE alpha_diagnoses SET answers_json = ?, current_question_index = ?, updated_at = NOW() WHERE session_id = ?`, [JSON.stringify(answers), nextIndex, sessionId]);
            
            const nextQuestion = conversation.getQuestion(nextIndex, session.language, answers);
            if (!nextQuestion) return res.json({ success: true, completed: true });
            
            return res.json({ success: true, completed: false, question: nextQuestion, progress: { current: nextIndex, total: 20 } });
        }

        // ========================================================================
        // ACTION: GENERATE_REPORT
        // ========================================================================
        if (action === 'GENERATE_REPORT') {
            await Promise.all(validateGenerateReport.map(v => v.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

            const { sessionId, language } = req.body;
            const [sessions] = await pool.execute(`SELECT * FROM alpha_diagnoses WHERE session_id = ? LIMIT 1`, [sessionId]);
            if (sessions.length === 0) return res.status(404).json({ success: false, error: 'Session not found' });
            
            const session = sessions[0];
            if (!session.email_verified) return res.status(403).json({ success: false, error: 'Email not verified' });
            
            if (session.completed_at) {
                let reportData = JSON.parse(session.report_json || '{}');
                return res.json({ success: true, score: session.score, status: session.status, statusColor: session.status_color, profile: reportData.profile, gaps: reportData.gaps, strengths: reportData.strengths, aiAnalysis: session.ai_analysis, accessCode: session.access_code });
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
                await pool.execute(`UPDATE alpha_diagnoses SET email_sent = 1, email_sent_at = NOW() WHERE session_id = ?`, [sessionId]);
                emailSent = true;
            } catch (e) { console.error('❌ Erro ao enviar email de resultado:', e.message); }

            if (session.whatsapp) {
                try {
                    if (await sendResultNotification({ firstName: session.first_name, whatsapp: session.whatsapp }, scoreData, session.access_code, reportLanguage)) {
                        await pool.execute(`UPDATE alpha_diagnoses SET whatsapp_result_sent = 1, whatsapp_result_sent_at = NOW() WHERE session_id = ?`, [sessionId]);
                        whatsappSent = true;
                    }
                } catch (e) { console.error('❌ Erro ao enviar WhatsApp:', e.message); }
            }

            return res.json({ success: true, ...scoreData, aiAnalysis, accessCode: session.access_code, notifications: { emailSent, whatsappSent } });
        }

        return res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (error) {
        console.error('❌ Erro fatal no endpoint /api/diagnose:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================================================
// ERROR HANDLERS & STARTUP
// ============================================================================
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use((err, req, res, next) => { console.error('❌ Unhandled error:', err); res.status(err.status || 500).json({ success: false, error: 'Internal server error' }); });

async function startServer() {
    try {
        const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'GEMINI_API_KEY', 'SENDGRID_API_KEY'];
        const missing = required.filter(v => !process.env[v]);
        if (missing.length) throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
        
        if (!await testConnection()) throw new Error('Falha na conexão com o banco de dados');
        
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(70));
            console.log(`🚀 EXPANDSPAIN ALPHA™ v3.1.1 - BACKEND CORRIGIDO rodando na porta ${PORT}`);
            console.log('='.repeat(70) + '\n');
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
