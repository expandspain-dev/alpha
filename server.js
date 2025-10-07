/**
 * EXPANDSPAIN ALPHA™ - MAIN SERVER
 * Backend principal com sessões persistentes em MySQL
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Importar módulos
const { pool, testConnection, closePool } = require('./config/database');
const conversation = require('./conversation');
const scoring = require('./scoring');
const { generateAIAnalysis } = require('./services/aiService');
const { sendDiagnosisEmail } = require('./services/emailService');
const { sendResultNotification } = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARES ============
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============ ENDPOINT PRINCIPAL ============
app.post('/api/diagnose', async (req, res) => {
    const { action, sessionId, language = 'pt', userData, responseData } = req.body;

    try {
        // ========== ACTION: START ==========
        if (action === 'START') {
            console.log('📝 Iniciando novo diagnóstico...');
            
            // Validar dados do usuário
            if (!userData || !userData.email) {
                return res.status(400).json({ 
                    error: 'Email é obrigatório' 
                });
            }

            // Gerar IDs únicos
            const newSessionId = uuidv4();
            const accessCode = generateAccessCode();

            // Salvar no banco de dados
            await pool.execute(
                `INSERT INTO alpha_diagnoses 
                (session_id, access_code, email, first_name, last_name, whatsapp, passport_country, language, current_question_index) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    newSessionId,
                    accessCode,
                    userData.email,
                    userData.firstName || null,
                    userData.lastName || null,
                    userData.whatsapp || null,
                    userData.passportCountry || null,
                    language,
                    0 // Começar na pergunta 0
                ]
            );

            console.log(`✅ Sessão criada: ${newSessionId}`);
            console.log(`   Email: ${userData.email}`);
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
            console.log(`📥 Processando resposta da sessão: ${sessionId}`);

            // Validar sessionId
            if (!sessionId) {
                return res.status(400).json({ 
                    error: 'sessionId é obrigatório' 
                });
            }

            // Buscar sessão no banco
            const [sessions] = await pool.execute(
                'SELECT * FROM alpha_diagnoses WHERE session_id = ?',
                [sessionId]
            );

            if (sessions.length === 0) {
                return res.status(404).json({ 
                    error: 'Sessão não encontrada' 
                });
            }

            const session = sessions[0];

            // Verificar se já completou
            if (session.completed_at) {
                return res.status(400).json({ 
                    error: 'Teste já foi completado' 
                });
            }

            // Reconstruir answers do JSON salvo
            let answers = {};
            if (session.answers_json) {
                try {
                    answers = JSON.parse(session.answers_json);
                } catch (e) {
                    console.error('Erro ao parsear answers_json:', e);
                    answers = {};
                }
            }

            // Adicionar nova resposta
            const currentIndex = session.current_question_index;
            answers[currentIndex] = responseData;

            // Determinar próxima pergunta
            const nextIndex = currentIndex + 1;
            const nextQuestion = conversation.getQuestion(nextIndex, language, answers);

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
                    message: 'Teste completo. Gerando análise...'
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
            console.log(`📊 Gerando relatório para sessão: ${sessionId}`);

            // Validar sessionId
            if (!sessionId) {
                return res.status(400).json({ 
                    error: 'sessionId é obrigatório' 
                });
            }

            // Buscar sessão
            const [sessions] = await pool.execute(
                'SELECT * FROM alpha_diagnoses WHERE session_id = ?',
                [sessionId]
            );

            if (sessions.length === 0) {
                return res.status(404).json({ 
                    error: 'Sessão não encontrada' 
                });
            }

            const session = sessions[0];

            // Parsear respostas
            let answers = {};
            try {
                answers = JSON.parse(session.answers_json || '{}');
            } catch (e) {
                console.error('Erro ao parsear answers:', e);
                return res.status(500).json({ 
                    error: 'Erro ao processar respostas' 
                });
            }

            // Calcular score
            console.log('🧮 Calculando score...');
            const scoreData = scoring.calculateScore(answers, language);

            // Gerar análise com IA
            console.log('🤖 Gerando análise com IA Gemini...');
            const aiAnalysis = await generateAIAnalysis(
                scoreData, 
                answers, 
                language
            );

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
                    JSON.stringify({
                        gaps: scoreData.gaps,
                        strengths: scoreData.strengths,
                        profile: scoreData.profile
                    }),
                    aiAnalysis,
                    sessionId
                ]
            );

            console.log('✅ Relatório salvo no banco de dados');

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
                    language
                );
                
                await pool.execute(
                    `UPDATE alpha_diagnoses 
                    SET email_sent = 1, email_sent_at = NOW() 
                    WHERE session_id = ?`,
                    [sessionId]
                );
                
                console.log('✅ Email enviado com sucesso');
            } catch (emailError) {
                console.error('❌ Erro ao enviar email:', emailError);
                // NÃO bloquear o fluxo
            }

            // Enviar WhatsApp (se houver número)
            if (session.whatsapp) {
                console.log('📱 Enviando WhatsApp...');
                try {
                    await sendResultNotification(
                        {
                            firstName: session.first_name,
                            whatsapp: session.whatsapp
                        },
                        scoreData,
                        session.access_code,
                        language
                    );
                    
                    await pool.execute(
                        `UPDATE alpha_diagnoses 
                        SET whatsapp_result_sent = 1, whatsapp_result_sent_at = NOW() 
                        WHERE session_id = ?`,
                        [sessionId]
                    );
                    
                    console.log('✅ WhatsApp enviado com sucesso');
                } catch (whatsappError) {
                    console.error('❌ Erro ao enviar WhatsApp:', whatsappError);
                    // NÃO bloquear o fluxo
                }
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
                ctaRecommended: 'oracle' // SEMPRE Oracle™
            });
        }

        // Action não reconhecida
        return res.status(400).json({ 
            error: 'Action inválida' 
        });

    } catch (error) {
        console.error('❌ Erro no diagnose:', error);
        return res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message 
        });
    }
});

// ============ FUNÇÕES AUXILIARES ============

/**
 * Gera código de acesso de 6 caracteres (letras maiúsculas + números)
 */
function generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove confusos: I, O, 0, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============ STARTUP ============
async function startServer() {
    try {
        // Testar conexão com banco
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Não foi possível conectar ao banco de dados');
            console.error('   Verifique as variáveis de ambiente e tente novamente');
            process.exit(1);
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('');
            console.log('='.repeat(60));
            console.log('🚀 EXPANDSPAIN ALPHA™ - BACKEND INICIADO');
            console.log('='.repeat(60));
            console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   Porta: ${PORT}`);
            console.log(`   URL: http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
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

// Iniciar
startServer();

module.exports = app;
