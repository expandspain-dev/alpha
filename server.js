/**
 * EXPANDSPAIN ALPHA™ - MAIN SERVER v3.0.0 (COMPLETE REWRITE)
 * 
 * CHANGELOG v3.0.0:
 * ✅ CRÍTICO: Envio de email de verificação no START implementado
 * ✅ NOVO: Action VERIFY_CODE implementada
 * ✅ NOVO: Action RESEND_CODE implementada
 * ✅ NOVO: Rate limiting específico para verificação
 * ✅ NOVO: Sistema de retry para emails
 * ✅ NOVO: Templates HTML profissionais para emails
 * ✅ NOVO: Logs estruturados e detalhados
 * ✅ MELHORADO: Error handling com códigos específicos
 * ✅ MELHORADO: Validações mais robustas
 * 
 * @author ExpandSpain Team
 * @version 3.0.0
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

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
const allowedOrigins = [
    'https://expandspain.com',
    'https://www.expandspain.com',
    // Desenvolvimento (comentar em produção)
    // 'http://localhost:3000',
    // 'http://127.0.0.1:5500'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permite requests sem origin (mobile apps, Postman)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Origem bloqueada -> ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// Body parser com limite
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Trust proxy (Render.com)
app.set('trust proxy', 1);

// ============================================================================
// RATE LIMITING
// ============================================================================

// Rate limiter global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: { 
        success: false,
        error: 'Too many requests. Please try again in 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health'
});

// Rate limiter para diagnose (mais restritivo)
const diagnoseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 30,
    message: { 
        success: false,
        error: 'Too many diagnosis requests. Please try again later.',
        code: 'DIAGNOSIS_LIMIT_EXCEEDED'
    }
});

// Rate limiter para verificação de email (anti-spam)
const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 tentativas de verificação
    message: {
        success: false,
        error: 'Too many verification attempts. Please wait 15 minutes.',
        code: 'VERIFICATION_LIMIT_EXCEEDED'
    }
});

// Rate limiter para reenvio de código (anti-abuse)
const resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // 5 reenvios por hora
    message: {
        success: false,
        error: 'Too many code resend requests. Please wait 1 hour.',
        code: 'RESEND_LIMIT_EXCEEDED'
    }
});

// Aplicar rate limiters
app.use('/api/', globalLimiter);
app.use('/api/diagnose', diagnoseLimiter);

// Request timeout
app.use((req, res, next) => {
    req.setTimeout(30000, () => {
        res.status(408).json({ 
            success: false,
            error: 'Request timeout',
            code: 'TIMEOUT'
        });
    });
    next();
});

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${ip}`);
    next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req, res) => {
    const dbStatus = await testConnection();
    
    res.json({ 
        status: dbStatus ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '3.0.0',
        services: {
            database: dbStatus ? 'connected' : 'disconnected',
            email: !!process.env.SENDGRID_API_KEY,
            ai: !!process.env.GEMINI_API_KEY
        }
    });
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const validateStart = [
    body('action').equals('START'),
    body('language').optional().isIn(['pt', 'en', 'es']),
    body('userData.email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email address'),
    body('userData.firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1-100 characters'),
    body('userData.lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be between 1-100 characters'),
    body('userData.whatsapp')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 7, max: 25 })
        .withMessage('Invalid WhatsApp number format'),
    body('userData.passportCountry')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Invalid passport country'),
];

const validateVerifyCode = [
    body('action').equals('VERIFY_CODE'),
    body('sessionId')
        .custom((value) => {
            if (!isValidUUID(value)) {
                throw new Error('Invalid sessionId format');
            }
            return true;
        }),
    body('code')
        .trim()
        .matches(/^[A-Z0-9]{6}$/)
        .withMessage('Code must be 6 alphanumeric characters'),
];

const validateResendCode = [
    body('action').equals('RESEND_CODE'),
    body('sessionId')
        .custom((value) => {
            if (!isValidUUID(value)) {
                throw new Error('Invalid sessionId format');
            }
            return true;
        }),
];

const validateResponse = [
    body('action').equals('RESPONSE'),
    body('sessionId')
        .custom((value) => {
            if (!isValidUUID(value)) {
                throw new Error('Invalid sessionId format');
            }
            return true;
        }),
    body('responseData').isObject(),
];

const validateGenerateReport = [
    body('action').equals('GENERATE_REPORT'),
    body('sessionId')
        .custom((value) => {
            if (!isValidUUID(value)) {
                throw new Error('Invalid sessionId format');
            }
            return true;
        }),
    body('language').optional().isIn(['pt', 'en', 'es']),
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gera código de acesso seguro (6 caracteres)
 * Remove caracteres confusos: I, O, 0, 1
 */
function generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Gera código de acesso único (verifica no banco)
 */
async function generateUniqueAccessCode() {
    let code;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        code = generateAccessCode();
        
        const [existing] = await pool.execute(
            'SELECT id FROM alpha_diagnoses WHERE access_code = ? LIMIT 1',
            [code]
        );
        
        if (existing.length === 0) {
            break;
        }
        
        attempts++;
        console.warn(`⚠️  Código ${code} já existe. Tentando novamente (${attempts}/${maxAttempts})...`);
        
    } while (attempts < maxAttempts);
    
    if (attempts === maxAttempts) {
        throw new Error('Failed to generate unique access code');
    }
    
    return code;
}

/**
 * Sanitiza dados do usuário
 */
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
            // Validar entrada
            await Promise.all(validateStart.map(v => v.run(req)));
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                console.log('❌ Validação falhou:', errors.array());
                return res.status(400).json({ 
                    success: false,
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR'
                });
            }

            const { language = 'pt', userData } = req.body;
            
            console.log('📝 Iniciando novo diagnóstico...');
            console.log('   Email:', userData.email);
            console.log('   Idioma:', language);

            // Gerar IDs únicos
            const sessionId = uuidv4();
            const accessCode = await generateUniqueAccessCode();
            
            console.log('🔐 Código de verificação gerado:', accessCode);
            console.log('💾 Sessão criada:', sessionId);

            // Sanitizar dados
            const sanitizedData = sanitizeUserData(userData);

            // Salvar no banco
            await pool.execute(
                `INSERT INTO alpha_diagnoses 
                (session_id, access_code, email, first_name, last_name, whatsapp, 
                 passport_country, language, current_question_index, email_verified, 
                 created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    sessionId,
                    accessCode,
                    sanitizedData.email,
                    sanitizedData.firstName,
                    sanitizedData.lastName,
                    sanitizedData.whatsapp,
                    sanitizedData.passportCountry,
                    language,
                    0,
                    false // email_verified
                ]
            );

            console.log('✅ Dados salvos no banco de dados');

            // ✅ CRÍTICO: ENVIAR EMAIL DE VERIFICAÇÃO
            console.log('📧 Enviando email de verificação...');
            
            try {
                await sendVerificationEmail(
                    sanitizedData.email,
                    accessCode,
                    language,
                    sanitizedData.firstName
                );
                
                console.log('✅ Email de verificação enviado com sucesso');
                console.log('   Para:', sanitizedData.email);
                console.log('   Código:', accessCode);
                
            } catch (emailError) {
                console.error('❌ CRÍTICO: Falha ao enviar email de verificação:', emailError.message);
                
                // ⚠️ IMPORTANTE: Mesmo se email falhar, permitir continuar
                // Usuário pode usar RESEND_CODE depois
                console.warn('⚠️  Continuando sem email. Usuário pode solicitar reenvio.');
            }

            // Buscar primeira pergunta (apenas para preview)
            const firstQuestion = conversation.getQuestion(0, language, {});

            return res.json({
                success: true,
                sessionId: sessionId,
                accessCode: accessCode, // ⚠️ Remover em produção (apenas debug)
                message: 'Verification code sent to your email',
                question: firstQuestion, // Preview da primeira pergunta
                progress: {
                    current: 0,
                    total: 20
                }
            });
        }

        // ========================================================================
        // ACTION: VERIFY_CODE (NOVO)
        // ========================================================================
        if (action === 'VERIFY_CODE') {
            // Aplicar rate limiter específico
            await new Promise((resolve, reject) => {
                verificationLimiter(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Validar entrada
            await Promise.all(validateVerifyCode.map(v => v.run(req)));
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR',
                    verified: false
                });
            }

            const { sessionId, code } = req.body;
            
            console.log(`🔐 Verificando código da sessão: ${sessionId}`);
            console.log('   Código fornecido:', code);

            // Buscar sessão
            const [sessions] = await pool.execute(
                `SELECT session_id, access_code, email, created_at, email_verified 
                 FROM alpha_diagnoses 
                 WHERE session_id = ? 
                 LIMIT 1`,
                [sessionId]
            );

            if (sessions.length === 0) {
                console.log('❌ Sessão não encontrada:', sessionId);
                return res.status(404).json({
                    success: false,
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND',
                    verified: false
                });
            }

            const session = sessions[0];

            // Verificar se já foi verificado
            if (session.email_verified) {
                console.log('✅ Email já foi verificado anteriormente');
                return res.json({
                    success: true,
                    verified: true,
                    message: 'Email already verified'
                });
            }

            // Verificar expiração (15 minutos)
            const codeAge = Date.now() - new Date(session.created_at).getTime();
            const EXPIRATION = 15 * 60 * 1000; // 15 minutos

            if (codeAge > EXPIRATION) {
                console.log('❌ Código expirado:', {
                    sessionId,
                    ageMinutes: Math.floor(codeAge / 60000)
                });
                return res.status(400).json({
                    success: false,
                    error: 'Code expired. Please request a new one.',
                    code: 'CODE_EXPIRED',
                    verified: false
                });
            }

            // Comparar códigos (case-insensitive)
            const isValid = code.toUpperCase() === session.access_code.toUpperCase();

            if (!isValid) {
                console.log('❌ Código inválido:', {
                    sessionId,
                    providedCode: code,
                    expectedCode: session.access_code
                });
                return res.status(400).json({
                    success: false,
                    error: 'Invalid verification code',
                    code: 'INVALID_CODE',
                    verified: false
                });
            }

            // ✅ Código válido - Marcar como verificado
            await pool.execute(
                `UPDATE alpha_diagnoses 
                 SET email_verified = TRUE, 
                     email_verified_at = NOW(),
                     updated_at = NOW() 
                 WHERE session_id = ?`,
                [sessionId]
            );

            console.log('✅ Código verificado com sucesso:', sessionId);

            return res.json({
                success: true,
                verified: true,
                message: 'Email verified successfully'
            });
        }

        // ========================================================================
        // ACTION: RESEND_CODE (NOVO)
        // ========================================================================
        if (action === 'RESEND_CODE') {
            // Aplicar rate limiter específico
            await new Promise((resolve, reject) => {
                resendLimiter(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Validar entrada
            await Promise.all(validateResendCode.map(v => v.run(req)));
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR'
                });
            }

            const { sessionId } = req.body;
            
            console.log(`📧 Reenviando código para sessão: ${sessionId}`);

            // Buscar sessão
            const [sessions] = await pool.execute(
                `SELECT session_id, access_code, email, first_name, language, 
                        email_verified, created_at 
                 FROM alpha_diagnoses 
                 WHERE session_id = ? 
                 LIMIT 1`,
                [sessionId]
            );

            if (sessions.length === 0) {
                console.log('❌ Sessão não encontrada:', sessionId);
                return res.status(404).json({
                    success: false,
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                });
            }

            const session = sessions[0];

            // Verificar se já foi verificado
            if (session.email_verified) {
                console.log('✅ Email já verificado. Reenvio desnecessário.');
                return res.json({
                    success: true,
                    message: 'Email already verified. No need to resend code.'
                });
            }

            // Gerar novo código
            const newAccessCode = await generateUniqueAccessCode();
            
            console.log('🔐 Novo código gerado:', newAccessCode);

            // Atualizar no banco
            await pool.execute(
                `UPDATE alpha_diagnoses 
                 SET access_code = ?,
                     created_at = NOW(),
                     updated_at = NOW() 
                 WHERE session_id = ?`,
                [newAccessCode, sessionId]
            );

            // Enviar novo email
            try {
                await sendVerificationEmail(
                    session.email,
                    newAccessCode,
                    session.language,
                    session.first_name
                );
                
                console.log('✅ Novo código enviado com sucesso');
                console.log('   Para:', session.email);
                console.log('   Código:', newAccessCode);
                
                return res.json({
                    success: true,
                    message: 'New verification code sent to your email'
                });
                
            } catch (emailError) {
                console.error('❌ Erro ao reenviar código:', emailError.message);
                
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send verification email',
                    code: 'EMAIL_SEND_FAILED'
                });
            }
        }

        // ========================================================================
        // ACTION: RESPONSE
        // ========================================================================
        if (action === 'RESPONSE') {
            // Validar entrada
            await Promise.all(validateResponse.map(v => v.run(req)));
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR'
                });
            }

            const { sessionId, responseData } = req.body;
            
            console.log(`📥 Processando resposta da sessão: ${sessionId}`);

            // Buscar sessão
            const [sessions] = await pool.execute(
                `SELECT session_id, email, first_name, last_name, whatsapp, 
                        current_question_index, answers_json, completed_at, 
                        language, email_verified
                 FROM alpha_diagnoses 
                 WHERE session_id = ? 
                 LIMIT 1`,
                [sessionId]
            );

            if (sessions.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                });
            }

            const session = sessions[0];

            // ✅ VERIFICAR SE EMAIL FOI VERIFICADO
            if (!session.email_verified) {
                console.log('⚠️  Email não verificado. Bloqueando respostas.');
                return res.status(403).json({
                    success: false,
                    error: 'Email not verified. Please verify your email first.',
                    code: 'EMAIL_NOT_VERIFIED'
                });
            }

            // Verificar se já completou
            if (session.completed_at) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Test already completed',
                    code: 'TEST_COMPLETED'
                });
            }

            // Parsear respostas existentes
            let answers = {};
            if (session.answers_json) {
                try {
                    answers = JSON.parse(session.answers_json);
                } catch (e) {
                    console.error('❌ Erro ao parsear answers_json:', e);
                    return res.status(500).json({ 
                        success: false,
                        error: 'Failed to parse session data',
                        code: 'PARSE_ERROR'
                    });
                }
            }

            // Adicionar nova resposta
            const currentIndex = session.current_question_index;
            answers[currentIndex] = responseData;

            // Próxima pergunta
            const nextIndex = currentIndex + 1;
            const nextQuestion = conversation.getQuestion(nextIndex, session.language, answers);

            // Atualizar banco
            await pool.execute(
                `UPDATE alpha_diagnoses 
                 SET answers_json = ?, 
                     current_question_index = ?,
                     updated_at = NOW()
                 WHERE session_id = ?`,
                [
                    JSON.stringify(answers),
                    nextIndex,
                    sessionId
                ]
            );

            console.log(`✅ Resposta ${currentIndex} salva`);

            // Se completou todas as perguntas
            if (!nextQuestion) {
                console.log('✅ Teste completo! Gerando relatório...');
                
                return res.json({
                    success: true,
                    completed: true,
                    message: 'Test completed. Ready to generate report.'
                });
            }

            // Retornar próxima pergunta
            return res.json({
                success: true,
                completed: false,
                question: nextQuestion,
                progress: {
                    current: nextIndex,
                    total: 20
                }
            });
        }

        // ========================================================================
        // ACTION: GENERATE_REPORT
        // ========================================================================
        if (action === 'GENERATE_REPORT') {
            // Validar entrada
            await Promise.all(validateGenerateReport.map(v => v.run(req)));
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR'
                });
            }

            const { sessionId, language } = req.body;
            
            console.log(`📊 Gerando relatório para sessão: ${sessionId}`);

            // Buscar sessão
            const [sessions] = await pool.execute(
                `SELECT * FROM alpha_diagnoses 
                 WHERE session_id = ? 
                 LIMIT 1`,
                [sessionId]
            );

            if (sessions.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                });
            }

            const session = sessions[0];

            // Verificar se email foi verificado
            if (!session.email_verified) {
                return res.status(403).json({
                    success: false,
                    error: 'Email not verified',
                    code: 'EMAIL_NOT_VERIFIED'
                });
            }

            // Se já gerou relatório, retornar existente
            if (session.completed_at) {
                console.log('⚠️  Relatório já existe. Retornando...');
                
                let reportData = {};
                try {
                    reportData = JSON.parse(session.report_json || '{}');
                } catch (e) {
                    console.error('Erro ao parsear report_json:', e);
                }
                
                return res.json({
                    success: true,
                    score: session.score,
                    status: session.status,
                    statusColor: session.status_color,
                    profile: reportData.profile || 'Not specified',
                    gaps: reportData.gaps || [],
                    strengths: reportData.strengths || [],
                    aiAnalysis: session.ai_analysis,
                    accessCode: session.access_code,
                    ctaRecommended: 'oracle',
                    message: 'Report already generated'
                });
            }

            // Parsear respostas
            let answers = {};
            try {
                answers = JSON.parse(session.answers_json || '{}');
            } catch (e) {
                console.error('❌ Erro ao parsear answers:', e);
                return res.status(500).json({ 
                    success: false,
                    error: 'Failed to process answers',
                    code: 'PARSE_ERROR'
                });
            }

            // Calcular score
            console.log('🧮 Calculando score...');
            const reportLanguage = language || session.language || 'pt';
            const scoreData = scoring.calculateScore(answers, reportLanguage);
            
            console.log(`   Score: ${scoreData.score}/100`);
            console.log(`   Status: ${scoreData.status}`);

            // Gerar análise com IA
            console.log('🤖 Gerando análise com IA...');
            const aiAnalysis = await generateAIAnalysis(
                scoreData, 
                answers, 
                reportLanguage
            );

            // Preparar report data
            const reportData = {
                gaps: scoreData.gaps || [],
                strengths: scoreData.strengths || [],
                profile: scoreData.profile || 'Not specified'
            };

            // Salvar no banco
            await pool.execute(
                `UPDATE alpha_diagnoses 
                 SET score = ?,
                     status = ?,
                     status_color = ?,
                     report_json = ?,
                     ai_analysis = ?,
                     completed_at = NOW(),
                     cta_recommended = 'oracle',
                     updated_at = NOW()
                 WHERE session_id = ?`,
                [
                    scoreData.score,
                    scoreData.status,
                    scoreData.statusColor,
                    JSON.stringify(reportData),
                    aiAnalysis,
                    sessionId
                ]
            );

            console.log('✅ Relatório salvo no banco');

            // Enviar notificações
            let emailSent = false;
            let whatsappSent = false;

            // Email
            console.log('📧 Enviando email com resultado...');
            try {
                await sendDiagnosisEmail(
                    {
                        email: session.email,
                        firstName: session.first_name,
                        lastName: session.last_name
                    },
                    scoreData,
                    aiAnalysis,
                    session.access_code,
                    reportLanguage
                );
                
                await pool.execute(
                    `UPDATE alpha_diagnoses 
                     SET email_sent = 1, email_sent_at = NOW() 
                     WHERE session_id = ?`,
                    [sessionId]
                );
                
                emailSent = true;
                console.log('✅ Email de resultado enviado');
                
            } catch (emailError) {
                console.error('❌ Erro ao enviar email:', emailError.message);
            }

            // WhatsApp (opcional)
            if (session.whatsapp) {
                console.log('📱 Enviando WhatsApp...');
                try {
                    const whatsappResult = await sendResultNotification(
                        {
                            firstName: session.first_name || 'Candidate',
                            whatsapp: session.whatsapp
                        },
                        scoreData,
                        session.access_code,
                        reportLanguage
                    );
                    
                    if (whatsappResult) {
                        await pool.execute(
                            `UPDATE alpha_diagnoses 
                             SET whatsapp_result_sent = 1, whatsapp_result_sent_at = NOW() 
                             WHERE session_id = ?`,
                            [sessionId]
                        );
                        
                        whatsappSent = true;
                        console.log('✅ WhatsApp enviado');
                    }
                } catch (whatsappError) {
                    console.error('❌ Erro ao enviar WhatsApp:', whatsappError.message);
                }
            }

            // Alerta se nenhuma notificação foi enviada
            if (!emailSent && !whatsappSent) {
                console.error('🚨 CRÍTICO: Nenhuma notificação enviada!');
            }

            // Retornar resultado
            return res.json({
                success: true,
                score: scoreData.score,
                status: scoreData.status,
                statusColor: scoreData.statusColor,
                profile: scoreData.profile,
                gaps: scoreData.gaps,
                strengths: scoreData.strengths,
                aiAnalysis: aiAnalysis,
                accessCode: session.access_code,
                ctaRecommended: 'oracle',
                notifications: {
                    emailSent,
                    whatsappSent
                }
            });
        }

        // Action não reconhecida
        return res.status(400).json({ 
            success: false,
            error: 'Invalid action',
            code: 'INVALID_ACTION',
            validActions: ['START', 'VERIFY_CODE', 'RESEND_CODE', 'RESPONSE', 'GENERATE_REPORT']
        });

    } catch (error) {
        console.error('❌ Erro no diagnose:', error);
        
        const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Internal server error'
            : error.message;
        
        return res.status(500).json({ 
            success: false,
            error: errorMessage,
            code: 'INTERNAL_ERROR'
        });
    }
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    
    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS policy violation',
            code: 'CORS_ERROR'
        });
    }
    
    // Rate limit error
    if (err.status === 429) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED'
        });
    }
    
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        code: 'UNHANDLED_ERROR'
    });
});

// ============================================================================
// STARTUP & SHUTDOWN
// ============================================================================

async function startServer() {
    try {
        // Validar variáveis de ambiente
        const requiredEnvVars = [
            'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
            'GEMINI_API_KEY',
            'SENDGRID_API_KEY'
        ];
        
        const missingVars = requiredEnvVars.filter(v => !process.env[v]);
        if (missingVars.length > 0) {
            console.error('❌ Variáveis de ambiente faltando:', missingVars.join(', '));
            process.exit(1);
        }

        // Testar conexão
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Falha na conexão com o banco de dados');
            process.exit(1);
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('');
            console.log('='.repeat(70));
            console.log('🚀 EXPANDSPAIN ALPHA™ v3.0.0 - BACKEND COMPLETO');
            console.log('='.repeat(70));
            console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   Porta: ${PORT}`);
            console.log(`   URL: http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log('');
            console.log('✅ NOVIDADES v3.0.0:');
            console.log('   • Email de verificação implementado');
            console.log('   • Action VERIFY_CODE adicionada');
            console.log('   • Action RESEND_CODE adicionada');
            console.log('   • Rate limiting melhorado');
            console.log('   • Validação de email obrigatória');
            console.log('='.repeat(70));
            console.log('');
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📴 SIGTERM recebido. Encerrando...');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📴 SIGINT recebido. Encerrando...');
    await closePool();
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection:', reason);
});

// Iniciar
startServer();

module.exports = app;
