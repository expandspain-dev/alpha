/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPANDSPAIN ALPHA™ - AI SERVICE v9.0 FINAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * MODELO FUNCIONAL: gemini-2.0-flash-exp
 * Data: 2025-10-10
 * Status: TESTADO E FUNCIONANDO
 * 
 * @author ExpandSpain Team
 * @version 9.0
 * @license Proprietary
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DO MODELO GEMINI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * IMPORTANTE: Baseado em testes de 2025-10-10:
 * - gemini-pro: ❌ 404 Not Found
 * - gemini-1.5-flash: ❌ 404 Not Found
 * - gemini-1.5-pro: ❌ 404 Not Found
 * - gemini-2.5-flash: ❌ 404 Not Found
 * - gemini-2.0-flash-exp: ✅ FUNCIONA (experimental mas estável)
 */
const MODEL_ID = 'gemini-2.0-flash-exp';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY não configurada!');
    throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

console.log('✅ [aiService v9.0] Gemini AI inicializado');
console.log(`   Modelo: ${MODEL_ID}`);

// ═══════════════════════════════════════════════════════════════════════════
// CACHE EM MEMÓRIA (7 dias TTL)
// ═══════════════════════════════════════════════════════════════════════════

const analysisCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of analysisCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            analysisCache.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`🧹 [Cache] Limpou ${cleaned} entrada(s) expirada(s)`);
    }
}, 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateCacheKey(scoreData, language) {
    const scoreRange = Math.floor((scoreData?.score || 0) / 10) * 10;
    const gapsKey = (scoreData?.gaps || []).map(String).sort().join('|');
    const statusKey = String(scoreData?.status || '').toLowerCase().replace(/\s+/g, '-');
    const profileKey = String(scoreData?.profile || '').toLowerCase().replace(/\s+/g, '-');
    return `${language}:${scoreRange}:${statusKey}:${profileKey}:${gapsKey}`;
}

function sanitizeForPrompt(text) {
    if (!text) return 'Not specified';
    return String(text)
        .replace(/[^\w\s\-\/,.()€:+]/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .substring(0, 600)
        .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS COMPLETOS (PT/EN/ES) - FOCO EXCLUSIVO EM POWER ORACLE™
// ═══════════════════════════════════════════════════════════════════════════

const PROMPT_TEMPLATES = {
    pt: ({ profile, score, status, gaps, strengths }) => `
Você é a Alpha AI, consultora estratégica de vistos da ExpandSpain. Escreva em Português do Brasil.

DADOS DO CANDIDATO:
- Perfil: ${profile}
- Pontuação: ${score}/100
- Status: ${status}
- Gaps críticos: ${gaps || 'Nenhum identificado'}
- Forças: ${strengths || 'Nenhuma listada'}

OBJETIVO: Gerar uma análise de 3 parágrafos que VENDA o Power Oracle™ (€97). Não mencionar qualquer outro produto.

REGRAS ABSOLUTAS:
- Máximo: 280 palavras. ZERO emojis.
- Tom: claro, estratégico, persuasivo, sem prometer "aprovação garantida".
- Falar diretamente com "você" (não use "o candidato").
- Usar exatamente os nomes dos gaps fornecidos (não inventar novos).
- Mencionar "Power Oracle™" somente no 3º parágrafo.

ESTRUTURA OBRIGATÓRIA:

PARÁGRAFO 1 (3–4 linhas) — Diagnóstico Técnico:
- Iniciar com: "Seu perfil de [Perfil] com pontuação [X]/100 indica [Status]."
- Listar 2–3 gaps críticos pelo nome.
- Indicar taxa de rejeição histórica:
  • 0–39: 90–95%
  • 40–59: 60–75%
  • 60–74: 40–55%
  • 75–89: 20–35%
  • 90–100: 5–15%

PARÁGRAFO 2 (3–4 linhas) — O Problema Real:
- Explicar por que informação ≠ estratégia por faixa:
  • 0–39: "99% aplicam antes de estarem prontos e desperdiçam €2.000+."
  • 40–59: "87% com esses gaps são rejeitados mesmo 'sabendo' os requisitos."
  • 60–74: "O 'quase certo' cai por detalhes técnicos invisíveis."
  • 75–89: "Perfis fortes perdem por falhas documentais cirúrgicas."
  • 90–100: "Mesmo excelentes falham por estrutura documental deficiente."

PARÁGRAFO 3 (5–6 linhas) — Solução: Power Oracle™:
- Apresentar Power Oracle™ como solução prática.
- Descrever 4 módulos:
  • Alpha Mindset — use o visto como base de expansão europeia
  • Legal Anatomy — checklist completo adaptado ao seu perfil
  • War Room Docs — modelos prontos que evitam erros críticos
  • Integrated Family — planejamento familiar completo
- CTA final: "Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos."
`.trim(),

    en: ({ profile, score, status, gaps, strengths }) => `
You are Alpha AI, ExpandSpain's strategic visa advisor. Write in English.

CANDIDATE DATA:
- Profile: ${profile}
- Score: ${score}/100
- Status: ${status}
- Critical Gaps: ${gaps || 'None identified'}
- Strengths: ${strengths || 'None listed'}

GOAL: Produce a 3-paragraph analysis that SELLS Power Oracle™ (€97). Do not mention any other product.

NON-NEGOTIABLE RULES:
- Max 280 words. No emojis.
- Tone: clear, strategic, persuasive. No "guaranteed approval" claims.
- Address as "you" (never "the candidate").
- Use exact gap names provided; do not invent gaps.
- Mention "Power Oracle™" only in paragraph 3.

MANDATORY STRUCTURE:

PARAGRAPH 1 (3–4 lines) — Technical Diagnosis:
- Start with: "Your [Profile] profile with a [X]/100 score indicates [Status]."
- Name 2–3 most critical gaps.
- State realistic historical rejection rate:
  • 0–39: 90–95%
  • 40–59: 60–75%
  • 60–74: 40–55%
  • 75–89: 20–35%
  • 90–100: 5–15%

PARAGRAPH 2 (3–4 lines) — The Real Problem:
- Explain why information ≠ strategy by band:
  • 0–39: "99% apply too early and waste €2,000+."
  • 40–59: "87% with these gaps are rejected even 'knowing' the rules."
  • 60–74: "The 'almost certain' fails on technical details."
  • 75–89: "Strong profiles fall on surgical documentary failures."
  • 90–100: "Even excellent profiles fail due to poor structuring."

PARAGRAPH 3 (5–6 lines) — Solution: Power Oracle™:
- Present Power Oracle™ as practical solution.
- Describe 4 modules:
  • Alpha Mindset — use visa as European expansion base
  • Legal Anatomy — complete checklist adapted to your profile
  • War Room Docs — ready templates avoiding critical errors
  • Integrated Family — complete family planning
- Final CTA: "Access the Power Oracle™ now and get your personalized roadmap in minutes."
`.trim(),

    es: ({ profile, score, status, gaps, strengths }) => `
Eres Alpha AI, asesora estratégica de visas de ExpandSpain. Escribe en Español.

DATOS DEL CANDIDATO:
- Perfil: ${profile}
- Puntuación: ${score}/100
- Estado: ${status}
- Gaps críticos: ${gaps || 'Ninguno identificado'}
- Fortalezas: ${strengths || 'Ninguna listada'}

OBJETIVO: Crear un análisis de 3 párrafos que VENDA Power Oracle™ (€97). No mencionar ningún otro producto.

REGLAS INNEGOCIABLES:
- Máx. 280 palabras. Sin emojis.
- Tono: claro, estratégico, persuasivo. Sin "aprobación garantizada".
- Dirígete como "tú" (no "el candidato").
- Usa nombres exactos de gaps; no inventes.
- Menciona "Power Oracle™" solo en párrafo 3.

ESTRUCTURA OBLIGATORIA:

PÁRRAFO 1 (3–4 líneas) — Diagnóstico Técnico:
- Empieza con: "Tu perfil de [Perfil] con puntuación [X]/100 indica [Estado]."
- Nombra 2–3 gaps críticos.
- Indica tasa histórica de rechazo:
  • 0–39: 90–95%
  • 40–59: 60–75%
  • 60–74: 40–55%
  • 75–89: 20–35%
  • 90–100: 5–15%

PÁRRAFO 2 (3–4 líneas) — El Problema Real:
- Explica por qué información ≠ estrategia por banda:
  • 0–39: "El 99% aplica antes de tiempo y malgasta €2.000+."
  • 40–59: "El 87% con estos gaps es rechazado sabiendo requisitos."
  • 60–74: "Lo casi seguro falla por detalles técnicos invisibles."
  • 75–89: "Perfiles fuertes caen por fallos documentales quirúrgicos."
  • 90–100: "Incluso excelentes fallan por mala estructura."

PÁRRAFO 3 (5–6 líneas) — Solución: Power Oracle™:
- Presenta Power Oracle™ como solución práctica.
- Describe 4 módulos:
  • Alpha Mindset — base de expansión europea
  • Legal Anatomy — checklist completo adaptado
  • War Room Docs — plantillas listas evitando errores
  • Integrated Family — planificación familiar completa
- CTA final: "Accede al Power Oracle™ ahora y recibe tu hoja de ruta personalizada en minutos."
`.trim()
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

function validateAIOutput(analysis) {
    const issues = [];
    
    if (!analysis || typeof analysis !== 'string') {
        issues.push('Output é null ou não é string');
        return issues;
    }
    
    const trimmed = analysis.trim();
    if (trimmed.length === 0) {
        issues.push('Output está vazio');
        return issues;
    }
    
    const words = trimmed.split(/\s+/).length;
    if (words < 90) {
        issues.push(`Muito curto (${words} palavras, mínimo 90)`);
    }
    if (words > 350) {
        issues.push(`Muito longo (${words} palavras, máximo 350)`);
    }
    
    if (!/Power Oracle/i.test(trimmed)) {
        issues.push('Faltou mencionar Power Oracle™');
    }
    
    const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 30);
    if (paragraphs.length < 2) {
        issues.push(`Estrutura insuficiente (${paragraphs.length} parágrafos, mínimo 2)`);
    }
    
    return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACKS OFFLINE (PT/EN/ES)
// ═══════════════════════════════════════════════════════════════════════════

const FALLBACKS = {
    pt: (score, profile, gaps = []) => {
        const band = score < 40 ? '0-39' : score < 60 ? '40-59' : score < 75 ? '60-74' : score < 90 ? '75-89' : '90-100';
        const rate = { '0-39': 93, '40-59': 68, '60-74': 48, '75-89': 28, '90-100': 9 }[band];
        const gapsTxt = gaps.length ? gaps.slice(0, 3).join(', ') : 'sem gaps críticos explicitados';
        
        const statusText = {
            '0-39': 'necessidade de preparação crítica',
            '40-59': 'necessidade de otimização',
            '60-74': 'bom potencial',
            '75-89': 'perfil forte',
            '90-100': 'perfil excelente'
        }[band];
        
        return [
            `Seu perfil de ${profile} com pontuação ${score}/100 indica ${statusText}. Gaps prioritários: ${gapsTxt}. Com esses pontos sem correção, a taxa histórica de rejeição gira em torno de ${rate}%.`,
            
            `Informação ≠ estratégia. Muitos perfis nesta faixa falham por sequência errada, documentação incompleta e prazos mal geridos — detalhes cirúrgicos que não aparecem em checklists genéricos disponíveis online.`,
            
            `A solução prática é o Power Oracle™: um roadmap acionável que liga diagnóstico à execução. Você recebe: (1) Alpha Mindset para usar o visto como base de expansão europeia, (2) Legal Anatomy com checklist completo adaptado ao seu perfil de ${profile}, (3) War Room Docs com modelos prontos que evitam erros críticos de formatação, (4) Integrated Family para planejamento familiar completo. Por €97 com garantia incondicional de 30 dias, você transforma seu diagnóstico em ação. Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`
        ].join('\n\n');
    },
    
    en: (score, profile, gaps = []) => {
        const band = score < 40 ? '0-39' : score < 60 ? '40-59' : score < 75 ? '60-74' : score < 90 ? '75-89' : '90-100';
        const rate = { '0-39': 93, '40-59': 68, '60-74': 48, '75-89': 28, '90-100': 9 }[band];
        const gapsTxt = gaps.length ? gaps.slice(0, 3).join(', ') : 'no explicit critical gaps';
        
        const statusText = {
            '0-39': 'critical preparation needed',
            '40-59': 'optimization required',
            '60-74': 'good potential',
            '75-89': 'strong profile',
            '90-100': 'excellent profile'
        }[band];
        
        return [
            `Your ${profile} profile with a ${score}/100 score indicates ${statusText}. Priority gaps: ${gapsTxt}. With these unresolved, historical rejection rate is approximately ${rate}%.`,
            
            `Information ≠ strategy. Many profiles in this range fail due to wrong sequencing, incomplete documentation, and poor timing management — surgical details no generic online checklist captures.`,
            
            `The practical solution is Power Oracle™: an actionable roadmap from diagnosis to execution. You get: (1) Alpha Mindset to use the visa as European expansion base, (2) Legal Anatomy with complete checklist adapted to your ${profile} profile, (3) War Room Docs with ready templates that avoid critical formatting errors, (4) Integrated Family for complete family planning. For €97 with unconditional 30-day guarantee, you transform your diagnosis into action. Access the Power Oracle™ now and get your personalized roadmap in minutes.`
        ].join('\n\n');
    },
    
    es: (score, profile, gaps = []) => {
        const band = score < 40 ? '0-39' : score < 60 ? '40-59' : score < 75 ? '60-74' : score < 90 ? '75-89' : '90-100';
        const rate = { '0-39': 93, '40-59': 68, '60-74': 48, '75-89': 28, '90-100': 9 }[band];
        const gapsTxt = gaps.length ? gaps.slice(0, 3).join(', ') : 'sin gaps críticos explícitos';
        
        const statusText = {
            '0-39': 'preparación crítica necesaria',
            '40-59': 'optimización requerida',
            '60-74': 'buen potencial',
            '75-89': 'perfil fuerte',
            '90-100': 'perfil excelente'
        }[band];
        
        return [
            `Tu perfil de ${profile} con ${score}/100 indica ${statusText}. Gaps prioritarios: ${gapsTxt}. Con ellos sin corregir, el rechazo histórico ronda el ${rate}%.`,
            
            `Información ≠ estrategia. Muchos perfiles en este rango fallan por secuencia incorrecta, documentación incompleta y mala gestión de plazos — detalles quirúrgicos que no aparecen en checklists genéricos online.`,
            
            `La solución práctica es Power Oracle™: una hoja de ruta accionable de diagnóstico a ejecución. Recibes: (1) Alpha Mindset para usar el visado como base de expansión europea, (2) Legal Anatomy con checklist completo adaptado a tu perfil de ${profile}, (3) War Room Docs con plantillas listas que evitan errores críticos de formato, (4) Integrated Family para planificación familiar completa. Por €97 con garantía incondicional de 30 días, transformas tu diagnóstico en acción. Accede al Power Oracle™ ahora y recibe tu hoja de ruta personalizada en minutos.`
        ].join('\n\n');
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: GERAÇÃO DE ANÁLISE COM IA
// ═══════════════════════════════════════════════════════════════════════════

async function generateAIAnalysis(scoreData, answers, language = 'pt') {
    console.log('═'.repeat(70));
    console.log('🤖 [IA v9.0] generateAIAnalysis() CHAMADA');
    console.log(`   Score: ${scoreData?.score}/100`);
    console.log(`   Profile: ${scoreData?.profile}`);
    console.log(`   Language: ${language}`);
    console.log('═'.repeat(70));
    
    const lang = ['pt', 'en', 'es'].includes(language) ? language : 'pt';
    
    try {
        // Verificar cache
        const cacheKey = generateCacheKey(scoreData, lang);
        console.log(`📦 [Cache] Verificando... Key: ${cacheKey.substring(0, 40)}...`);
        
        const cached = analysisCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            const ageMinutes = Math.floor((Date.now() - cached.timestamp) / 60000);
            console.log(`✅ [Cache] Encontrado (idade: ${ageMinutes} min)`);
            console.log('═'.repeat(70));
            return cached.analysis;
        }
        
        console.log(`❌ [Cache] Não encontrado`);
        
        // Preparar dados
        const safeProfile = sanitizeForPrompt(scoreData?.profile || 'Candidato');
        const safeGaps = (scoreData?.gaps || []).map(sanitizeForPrompt).join(', ');
        const safeStrengths = (scoreData?.strengths || []).map(sanitizeForPrompt).join(', ');
        const score = Number(scoreData?.score || 0);
        const status = sanitizeForPrompt(scoreData?.status || 'Em avaliação');
        
        console.log(`\n📝 [Prompt] Preparando...`);
        
        const prompt = PROMPT_TEMPLATES[lang]({
            profile: safeProfile,
            score,
            status,
            gaps: safeGaps,
            strengths: safeStrengths
        });
        
        console.log(`   Tamanho: ${prompt.length} caracteres`);
        console.log(`   Modelo: ${MODEL_ID}`);
        
        // Chamar Gemini API
        console.log(`\n🔄 [IA] Enviando requisição para Gemini...`);
        
        const model = genAI.getGenerativeModel({
            model: MODEL_ID,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        });
        
        const startTime = Date.now();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const elapsed = Date.now() - startTime;
        
        console.log(`   Resposta recebida em ${elapsed}ms`);
        
        // Extrair texto
        const analysis = response.text();
        
        if (!analysis || analysis.trim() === '') {
            throw new Error('Resposta vazia da IA');
        }
        
        console.log(`✅ [IA] Sucesso!`);
        console.log(`   Tamanho: ${analysis.length} caracteres`);
        console.log(`   Palavras: ${analysis.split(/\s+/).length}`);
        
        // Validar
        const issues = validateAIOutput(analysis);
        if (issues.length > 0) {
            console.warn(`⚠️  [Validação] ${issues.length} problema(s):`);
            issues.forEach(i => console.warn(`   - ${i}`));
            
            const critical = issues.some(i => /Power Oracle|vazio/i.test(i));
            if (critical) {
                console.error(`❌ [Validação] Problemas críticos, usando fallback`);
                throw new Error('Validação crítica falhou');
            }
        }
        
        // Salvar cache
        analysisCache.set(cacheKey, {
            analysis: analysis,
            timestamp: Date.now()
        });
        
        console.log(`📦 [Cache] Salvo (total: ${analysisCache.size} entradas)`);
        console.log('═'.repeat(70));
        console.log('✅ [IA] Análise gerada com SUCESSO!');
        console.log('═'.repeat(70));
        
        return analysis;
        
    } catch (err) {
        console.error('═'.repeat(70));
        console.error('❌ [IA] ERRO - Usando fallback offline');
        console.error(`   Erro: ${err.message}`);
        console.error('═'.repeat(70));
        
        const score = Number(scoreData?.score || 0);
        const profile = sanitizeForPrompt(scoreData?.profile || 'Candidato');
        const gaps = scoreData?.gaps || [];
        
        const fallback = FALLBACKS[lang](score, profile, gaps);
        
        console.log(`📝 [Fallback] Análise offline gerada (${fallback.length} caracteres)`);
        console.log('═'.repeat(70));
        
        return fallback;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
    generateAIAnalysis
};
