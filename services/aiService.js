/**
 * EXPANDSPAIN ALPHA™ - AI SERVICE v8.0 (DIAGNÓSTICO)
 * Código simplificado para testar API Gemini
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('═'.repeat(70));
console.log('🔑 [DIAGNOSTIC] Verificando API Key...');
console.log(`   Key exists: ${!!GEMINI_API_KEY}`);
console.log(`   Key length: ${GEMINI_API_KEY?.length || 0}`);
console.log(`   Key preview: ${GEMINI_API_KEY?.substring(0, 20)}...`);
console.log('═'.repeat(70));

if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada!');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cache simples
const analysisCache = new Map();

// Fallback offline
const FALLBACK = (score, profile) => {
    return `Seu perfil de ${profile} com pontuação ${score}/100 foi analisado. 

Devido a um problema técnico temporário, estamos usando uma análise pré-definida. 

O Power Oracle™ é a solução prática para transformar este diagnóstico em ação concreta. Por €97, você recebe um roadmap personalizado completo. 

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`;
};

async function generateAIAnalysis(scoreData, answers, language = 'pt') {
    console.log('═'.repeat(70));
    console.log('🤖 [IA v8.0] generateAIAnalysis() CHAMADA');
    console.log(`   Score: ${scoreData?.score}`);
    console.log(`   Profile: ${scoreData?.profile}`);
    console.log(`   Language: ${language}`);
    console.log('═'.repeat(70));
    
    const score = scoreData?.score || 0;
    const profile = scoreData?.profile || 'Candidato';
    
    try {
        // Verificar cache
        const cacheKey = `${language}:${score}`;
        if (analysisCache.has(cacheKey)) {
            console.log('✅ [Cache] Retornando do cache');
            return analysisCache.get(cacheKey);
        }
        
        // Prompt SUPER SIMPLES
        const prompt = `Você é um consultor de vistos. Escreva em português 3 parágrafos (máximo 200 palavras) sobre um candidato com score ${score}/100. Mencione "Power Oracle" no último parágrafo como solução.`;
        
        console.log('📝 [Prompt] Preparado');
        console.log(`   Tamanho: ${prompt.length} caracteres`);
        
        // TENTAR MODELO MAIS SIMPLES PRIMEIRO
        const modelsToTry = [
            'gemini-pro',              // Mais antigo e estável
            'gemini-1.5-flash',        // Pode ainda existir
            'gemini-2.0-flash-exp',    // Experimental
        ];
        
        console.log(`\n🔄 [IA] Testando ${modelsToTry.length} modelos...`);
        
        for (let i = 0; i < modelsToTry.length; i++) {
            const modelName = modelsToTry[i];
            
            try {
                console.log(`\n${'─'.repeat(70)}`);
                console.log(`🔄 Tentativa ${i + 1}/${modelsToTry.length}`);
                console.log(`   Modelo: ${modelName}`);
                
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    }
                });
                
                console.log('   Modelo criado, enviando requisição...');
                const startTime = Date.now();
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                
                console.log(`   Resposta recebida em ${Date.now() - startTime}ms`);
                
                const text = response.text();
                
                if (text && text.length > 50) {
                    console.log(`✅ SUCESSO com modelo: ${modelName}`);
                    console.log(`   Tamanho: ${text.length} caracteres`);
                    console.log(`   Preview: ${text.substring(0, 100)}...`);
                    
                    analysisCache.set(cacheKey, text);
                    
                    console.log('═'.repeat(70));
                    console.log('✅ [IA] Análise gerada com SUCESSO!');
                    console.log('═'.repeat(70));
                    
                    return text;
                }
                
                throw new Error('Resposta vazia ou muito curta');
                
            } catch (error) {
                console.error(`❌ Modelo ${modelName} FALHOU`);
                console.error(`   Tipo: ${error.constructor.name}`);
                console.error(`   Mensagem: ${error.message}`);
                
                if (error.response) {
                    console.error(`   Response status: ${error.response.status}`);
                    console.error(`   Response data: ${JSON.stringify(error.response.data)}`);
                }
                
                if (error.stack) {
                    console.error(`   Stack (primeiras 3 linhas):`);
                    console.error(`   ${error.stack.split('\n').slice(0, 3).join('\n   ')}`);
                }
                
                if (i === modelsToTry.length - 1) {
                    console.error(`\n❌ TODOS os modelos falharam!`);
                    throw error;
                }
                
                console.log('   Tentando próximo modelo...');
            }
        }
        
    } catch (err) {
        console.error('═'.repeat(70));
        console.error('❌ [IA] ERRO FINAL - Usando fallback');
        console.error(`   Erro: ${err.message}`);
        console.error('═'.repeat(70));
        
        const fallback = FALLBACK(score, profile);
        console.log(`📝 Fallback gerado: ${fallback.length} caracteres`);
        
        return fallback;
    }
}

module.exports = { generateAIAnalysis };
