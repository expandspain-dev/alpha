const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAIAnalysis(scoreData, language = 'pt') {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const langMap = { 
            'pt': 'Português do Brasil', 
            'en': 'English', 
            'es': 'Español' 
        };
        
        const prompt = `PERSONA: Você é o Alpha AI, consultor de imigração especializado no Visto de Nômade Digital da Espanha. Tom direto e estratégico.

TAREFA: Gerar análise em ${langMap[language]} sobre elegibilidade do candidato.

DADOS:
- Perfil: ${scoreData.profile}
- Score: ${scoreData.score}/100
- Status: ${scoreData.status}
- Pontos Fortes: ${scoreData.strengths.join(', ') || 'Nenhum'}
- Gaps: ${scoreData.gaps.join(', ') || 'Nenhum'}

REGRAS:
1. Escreva em ${langMap[language]}
2. Use 2-3 parágrafos (máx 200 palavras)
3. Seja direto sobre chances reais
4. Mencione 2-3 gaps mais críticos
5. Finalize com recomendação: DIY, DFY ou não elegível
6. Tom profissional mas acessível
7. Sem emojis

FORMATO:
[Análise em 2-3 parágrafos]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
        
    } catch (error) {
        console.error('Erro ao gerar análise IA:', error);
        const fallback = {
            'pt': 'Análise indisponível no momento. Revise pontos fortes e gaps acima.',
            'en': 'Analysis unavailable. Review strengths and gaps above.',
            'es': 'Análisis no disponible. Revise puntos fuertes y gaps.'
        };
        return fallback[language] || fallback['pt'];
    }
}

module.exports = { generateAIAnalysis };
