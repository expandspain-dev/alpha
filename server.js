require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getNextStep } = require('./conversation');
const { calculateScore } = require('./scoring');
const { generateAIAnalysis } = require('./services/aiService');
const { saveToDatabase } = require('./services/databaseService');
const { sendDiagnosisEmail } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: ['https://expandspain.com', 'https://www.expandspain.com'],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

const sessions = {};

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.post('/api/diagnose', async (req, res) => {
    try {
        const { sessionId, language = 'pt', action, payload } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId obrigatório' });
        }
        
        if (action === 'START') {
            sessions[sessionId] = {
                answers: {},
                currentStep: 'START',
                language: language,
                createdAt: new Date()
            };
            
            const response = getNextStep('START', {}, language);
            if (response.nextQuestion) {
                sessions[sessionId].currentStep = response.nextQuestion.id;
            }
            return res.json(response);
        }
        
        if (action === 'RESPONSE') {
            const session = sessions[sessionId];
            if (!session) {
                return res.status(400).json({ error: 'Sessão não encontrada' });
            }
            
            session.answers[payload.questionId] = payload.answerId;
            const response = getNextStep(payload.questionId, session.answers, language);
            
            if (response.nextQuestion) {
                session.currentStep = response.nextQuestion.id;
            } else if (response.isFinished) {
                session.completed = true;
            }
            return res.json(response);
        }
        
        if (action === 'GENERATE_REPORT') {
            const session = sessions[sessionId];
            if (!session || !session.completed) {
                return res.status(400).json({ error: 'Questionário não concluído' });
            }
            
            session.userData = payload.userData;
            const scoreData = calculateScore(session.answers);
            const aiAnalysis = await generateAIAnalysis(scoreData, language);
            const accessCode = await saveToDatabase(session, scoreData, aiAnalysis);
            await sendDiagnosisEmail(session.userData, scoreData, aiAnalysis, accessCode);
            
            return res.json({
                finalReport: {
                    ...scoreData,
                    aiGeneratedSummary: aiAnalysis,
                    accessCode: accessCode,
                    reportId: `ALPHA-${sessionId.slice(0, 8).toUpperCase()}`,
                    timestamp: new Date()
                }
            });
        }
        
        return res.status(400).json({ error: 'Ação inválida' });
        
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

setInterval(() => {
    const now = Date.now();
    Object.keys(sessions).forEach(sessionId => {
        const session = sessions[sessionId];
        if (now - new Date(session.createdAt).getTime() > 3600000) {
            delete sessions[sessionId];
        }
    });
}, 3600000);

app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
});
