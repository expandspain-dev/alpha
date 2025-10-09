/**
 * EXPANDSPAIN ALPHA™ - MAIN SERVER (OPTIMIZED v2.3.0 - WHATSAPP FIX)
 * Backend principal com segurança, rate limiting e validações
 * FIX: Validação do WhatsApp tornada flexível e opcional para melhorar a experiência do usuário.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4, validate: isValidUUID } = require('uuid');

// Importar módulos
const { pool, testConnection, closePool } = require('./config/database');
const conversation = require('./conversation');
const scoring = require('./scoring');
const { generateAIAnalysis } = require('./services/aiService');
const { sendDiagnosisEmail } = require('./services/emailService');
const { sendResultNotification } = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ SECURITY MIDDLEWARES ============

// Helmet - Security headers
app.use(helmet());

// Lista de domínios permitidos. Adicione aqui futuros domínios (ex: staging, outros TLDs).
const allowedOrigins = [
    'https://expandspain.com',
    'https://www.expandspain.com'
    // Se você usa um ambiente de desenvolvimento local, adicione-o aqui:
    // 'http://localhost:3000',
    // 'http://127.0.0.1:5500' // Exemplo para Live Server do VSCode
];

// Opções de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // A verificação `!origin` permite requisições sem origem (ex: Postman, apps mobile)
    // `allowedOrigins.indexOf(origin) !== -1` verifica se a origem da requisição está na nossa lista.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origem bloqueada -> ${origin}`);
      callback(new Error('This request is not allowed by CORS.'));
    }
  },
  methods: ['GET', 'POST'], // Métodos permitidos
  credentials: true // Permite o envio de cookies/credenciais
};

// CORS configurado com as opções robustas
app.use(cors(corsOptions));

// Body parser com limite de tamanho
app.use(express.json({ limit: '1mb' }));

// ✅ FIX: Trust proxy para Render.com e rate limiting
app.set('trust proxy', 1);

// Rate limiting - CRÍTICO para prevenir abuso
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP
    message: { 
        error: 'Too many requests. Please try again in 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limit mais restritivo para diagnose
const diagnoseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 30, // 30 requests por hora
    message: { 
        error: 'Too many diagnosis requests. Please try again later.',
        code: 'DIAGNOSIS_LIMIT_EXCEEDED'
    },
});

// Aplicar rate limiting
app.use('/api/', apiLimiter);
app.use('/api/diagnose', diagnoseLimiter);

// Request timeout - 30 segundos
app.use((req, res, next) => {
    req.setTimeout(30000, () => {
        res.status(408).json({ 
            error: 'Request timeout',
            code: 'TIMEOUT'
        });
    });
    next();
});

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.3.0' // Versão atualizada
    });
});

// ============ VALIDATION MIDDLEWARE ============

/**
 * Validação para action START
 */
const validateStart = [
    body('action').equals('START'),
    body('language').optional().isIn(['pt', 'en', 'es']),
    body('userData.email').isEmail().normalizeEmail(),
    body('userData.firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('userData.lastName').optional().trim().isLength({ min: 1, max: 100 }),
    // ===================================================================
    // INÍCIO DA CORREÇÃO DO WHATSAPP
    // ===================================================================
    body('userData.whatsapp')
        .optional({ checkFalsy: true }) // Permite que o campo seja enviado vazio ou nulo
        .trim()
        .isLength({ min: 7, max: 25 })  // Se for preenchido, verifica um tamanho razoável
        .withMessage('WhatsApp number seems to be invalid.'),
    // ===================================================================
    // FIM DA CORREÇÃO DO WHATSAPP
    // ===================================================================
    body('userData.passportCountry').optional().trim().isLength({ min: 2, max: 100 }),
];

/**
 * Validação para action RESPONSE
 */
const validateResponse = [
    body('action').equals('RESPONSE'),
    body('sessionId').custom((value) => {
        if (!isValidUUID(value)) {
            throw new Error('Invalid sessionId format');
        }
        return true;
    }),
    body('responseData').isObject(),
];

/**
 * Validação para action GENERATE_REPORT
 */
const validateReport = [
    body('action').equals('GENERATE_REPORT'),
    body('sessionId').custom((value) => {
        if (!isValidUUID(value)) {
            throw new Error('Invalid sessionId format');
        }
        return true;
    }),
];

// ============ ENDPOINT PRINCIPAL ============
app.post('/api/diagnose', async (req, res) => {
    const { action, sessionId, language = 'pt', userData, responseData } = req.body;

    try {
        // ========== ACTION: START ==========
        if (action === 'START') {
            // Validar entrada
            await Promise.all(validateStart.map(validation => validation.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR'
                });
            }

            console.log('📝 Iniciando novo diagnóstico...');

            // Gerar IDs únicos
            const newSessionId = uuidv4();
            const accessCode = await generateUniqueAccessCode();

            // ===================================================================
            // INÍCIO DA SANITIZAÇÃO CORRIGIDA
            // ===================================================================
            const sanitizedUserData = {
                email: userData.email.toLowerCase().trim(),
                firstName: userData.firstName?.trim().substring(0, 100) || null,
                lastName: userData.lastName?.trim().substring(0, 100) || null,
                // Garante que o whatsapp seja salvo como null se vazio, ou faz trim se preenchido.
                whatsapp: userData.whatsapp?.trim() ? userData.whatsapp.trim().substring(0, 25) : null,
                passportCountry: userData.passportCountry?.trim().substring(0, 100) || null,
            };
            // ===================================================================
            // FIM DA SANITIZAÇÃO CORRIGIDA
            // ===================================================================

            // Salvar no banco de dados
            await pool.execute(
                `INSERT INTO alpha_diagnoses 
                (session_id, access_code, email, first_name, last_name, whatsapp, passport_country, language, current_question_index) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    newSessionId,
                    accessCode,
                    sanitizedUserData.email,
                    sanitizedUserData.firstName,
                    sanitizedUserData.lastName,
                    sanitizedUserData.whatsapp,
                    sanitizedUserData.passportCountry,
                    language,
                    0
                ]
            );

            console.log(`✅ Sessão criada: ${newSessionId}`);
            console.log(`   Email: ${sanitizedUserData.email}`);
            console.log(`   Código: ${accessCode}`);

            // Buscar primeira pergunta
            const firstQuestion = conversation.getQuestion(0, language, {});

            return res.json({
                success: true,
                sessionId: newSessionId,
                accessCode: accessCode,
                question: firstQuestion,
                progress: {
                    current: 0,
                    total: 20
                }
            });
        }

        // ========== ACTION: RESPONSE ==========
        if (action === 'RESPONSE') {
            // Validar entrada
            await Promise.all(validateResponse.map(validation => validation.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR'
                });
            }

            console.log(`📥 Processando resposta da sessão: ${sessionId}`);

            // Buscar sessão no banco (SELECT específico, não *)
            const [sessions] = await pool.execute(
                `SELECT session_id, email, first_name, last_name, whatsapp, 
                        current_question_index, answers_json, completed_at, language
                 FROM alpha_diagnoses 
                 WHERE session_id = ? 
                 LIMIT 1`,
                [sessionId]
            );

            if (sessions.length === 0) {
                return res.status(404).json({ 
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                });
            }

            const session = sessions[0];

            // Verificar se já completou
            if (session.completed_at) {
                return res.status(400).json({ 
                    error: 'Test already completed',
                    code: 'TEST_COMPLETED'
                });
            }

            // Reconstruir answers do JSON salvo
            let answers = {};
            if (session.answers_json) {
                try {
                    answers = JSON.parse(session.answers_json);
                } catch (e) {
                    console.error('Erro ao parsear answers_json:', e);
                    return res.status(500).json({ 
                        error: 'Failed to parse session data',
                        code: 'PARSE_ERROR'
                    });
                }
            }

            // Adicionar nova resposta
            const currentIndex = session.current_question_index;
            answers[currentIndex] = responseData;

            // Determinar próxima pergunta
            const nextIndex = currentIndex + 1;
            const nextQuestion = conversation.getQuestion(nextIndex, session.language, answers);

            // Atualizar banco de dados
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

            // Se não há próxima pergunta, teste está completo
            if (!nextQuestion) {
                console.log('✅ Teste completo! Gerando relatório...');
                
                return res.json({
                    success: true,
                    completed: true,
                    message: 'Test completed. Generating analysis...'
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

        // ========== ACTION: GENERATE_REPORT ==========
        if (action === 'GENERATE_REPORT') {
            // Validar entrada
            await Promise.all(validateReport.map(validation => validation.run(req)));
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: errors.array(),
                    code: 'VALIDATION_ERROR'
                });
            }

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
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                });
            }

            const session = sessions[0];

            // Verificar se já gerou relatório
            if (session.completed_at) {
                console.log('⚠️  Relatório já foi gerado anteriormente');
                return res.json({
                    success: true,
                    score: session.score,
                    status: session.status,
                    statusColor: session.status_color,
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
                console.error('Erro ao parsear answers:', e);
                return res.status(500).json({ 
                    error: 'Failed to process answers',
                    code: 'PARSE_ERROR'
                });
            }

            // Calcular score
            console.log('🧮 Calculando score...');
            const scoreData = scoring.calculateScore(answers, session.language);

            // Gerar análise com IA
            console.log('🤖 Gerando análise com IA Gemini...');
            const aiAnalysis = await generateAIAnalysis(
                scoreData, 
                answers, 
                session.language
            );

            // Parsear report_json se existir
            let reportData = {
                gaps: scoreData.gaps || [],
                strengths: scoreData.strengths || [],
                profile: scoreData.profile || 'Not specified'
            };

            // Salvar resultado no banco
            await pool.execute(
                `UPDATE alpha_diagnoses 
                SET score = ?,
                    status = ?,
                    status_color = ?,
                    report_json = ?,
                    ai_analysis = ?,
                    completed_at = NOW(),
                    cta_recommended = 'oracle'
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

            console.log('✅ Relatório salvo no banco de dados');

            // Flags de sucesso de notificações
            let emailSent = false;
            let whatsappSent = false;

            // Enviar email
            console.log('📧 Enviando email...');
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
                    session.language
                );
                
                await pool.execute(
                    `UPDATE alpha_diagnoses 
                    SET email_sent = 1, email_sent_at = NOW() 
                    WHERE session_id = ?`,
                    [sessionId]
                );
                
                emailSent = true;
                console.log('✅ Email enviado com sucesso');
            } catch (emailError) {
                console.error('❌ Erro ao enviar email:', emailError.message);
            }

            // Enviar WhatsApp (se houver número)
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
                        session.language
                    );
                    
                    if (whatsappResult) {
                        await pool.execute(
                            `UPDATE alpha_diagnoses 
                            SET whatsapp_result_sent = 1, whatsapp_result_sent_at = NOW() 
                            WHERE session_id = ?`,
                            [sessionId]
                        );
                        
                        whatsappSent = true;
                        console.log('✅ WhatsApp enviado com sucesso');
                    }
                } catch (whatsappError) {
                    console.error('❌ Erro ao enviar WhatsApp:', whatsappError.message);
                }
            }

            // Alerta crítico se NENHUMA notificação foi enviada
            if (!emailSent && !whatsappSent) {
                console.error('🚨 CRÍTICO: Nenhuma notificação enviada para', session.email);
                // TODO: Implementar fallback (queue, retry, admin alert)
            }

            // Retornar resultado completo
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
            error: 'Invalid action',
            code: 'INVALID_ACTION',
            validActions: ['START', 'RESPONSE', 'GENERATE_REPORT']
        });

    } catch (error) {
        console.error('❌ Erro no diagnose:', error);
        
        // Não expor detalhes em produção
        const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Internal server error'
            : error.message;
        
        return res.status(500).json({ 
            error: errorMessage,
            code: 'INTERNAL_ERROR'
        });
    }
});

// ============ FUNÇÕES AUXILIARES ============

/**
 * Gera código de acesso de 6 caracteres (letras maiúsculas + números)
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
 * Previne colisões (probabilidade baixa, mas possível)
 */
async function generateUniqueAccessCode() {
    let code;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        code = generateAccessCode();
        
        // Verificar se já existe
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
        throw new Error('Failed to generate unique access code after 10 attempts');
    }
    
    return code;
}

// ============ ERROR HANDLERS ============

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        code: 'NOT_FOUND'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        code: 'UNHANDLED_ERROR'
    });
});

// ============ STARTUP ============
async function startServer() {
    try {
        // Validar variáveis de ambiente críticas
        const requiredEnvVars = [
            'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
            'GEMINI_API_KEY',
            'SENDGRID_API_KEY'
            // Removido SITE_URL da lista de obrigatórios, pois temos um fallback no código do CORS
        ];
        
        const missingVars = requiredEnvVars.filter(v => !process.env[v]);
        if (missingVars.length > 0) {
            console.error('❌ Variáveis de ambiente faltando:', missingVars.join(', '));
            process.exit(1);
        }

        // Testar conexão com banco
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Não foi possível conectar ao banco de dados');
            process.exit(1);
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('');
            console.log('='.repeat(60));
            console.log('🚀 EXPANDSPAIN ALPHA™ v2.3.0 - BACKEND OTIMIZADO');
            console.log('='.repeat(60));
            console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   Porta: ${PORT}`);
            console.log(`   URL: http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   Rate Limit: 100 req/15min (global), 30 req/hour (diagnose)`);
            console.log('='.repeat(60));
            console.log('');
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGTERM', async () => {
    console.log('📴 Recebido SIGTERM. Encerrando gracefully...');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📴 Recebido SIGINT. Encerrando gracefully...');
    await closePool();
    process.exit(0);
});

// Capturar unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Iniciar
startServer();

module.exports = app;
