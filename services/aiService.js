/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPANDSPAIN ALPHA™ - AI SERVICE v10.1 FINAL (A/B TESTING READY)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * MODELO: gemini-2.0-flash-exp
 * Copy: Conciso (120-220 palavras), honesto, direto
 * Versões: Abertura A/B + CTA A/B/C/D/E testáveis
 * 
 * @author ExpandSpain Team
 * @version 10.1
 * @license Proprietary
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const MODEL_ID = 'gemini-2.0-flash-exp';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY não configurada!');
    throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

console.log('✅ [aiService v10.1] Gemini AI inicializado (A/B Testing)');
console.log(`   Modelo: ${MODEL_ID}`);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE TESTES A/B
// ═══════════════════════════════════════════════════════════════════════════

// Escolha qual versão usar (ou randomize para teste A/B)
const ABERTURA_VERSION = 'A'; // 'A' ou 'B'
const CTA_VERSION = 'A'; // 'A', 'B', 'C', 'D', 'E'

const ABERTURAS = {
    A: {
        pt: "Você já tem os documentos. Falta a sequência vencedora que o governo espanhol aprova.",
        en: "You already have the documents. What's missing is the winning sequence that the Spanish government approves.",
        es: "Ya tienes los documentos. Falta la secuencia ganadora que el gobierno español aprueba."
    },
    B: {
        pt: (profile, score, status) => `Agora você sabe a que distância está de obter o visto. Seu perfil de ${profile} com ${score}/100 indica ${status}.`,
        en: (profile, score, status) => `Now you know your distance to obtaining the visa. Your ${profile} profile with ${score}/100 indicates ${status}.`,
        es: (profile, score, status) => `Ahora sabes a qué distancia estás de obtener el visado. Tu perfil de ${profile} con ${score}/100 indica ${status}.`
    }
};

const CTAS = {
    A: {
        pt: "Entre agora, pegue o Power Oracle™, e submeta seu pedido vencedor.",
        en: "Enter now, get the Power Oracle™, and submit your winning application.",
        es: "Entra ahora, consigue el Power Oracle™, y presenta tu solicitud ganadora."
    },
    B: {
        pt: "Clique, gere o roteiro personalizado em 3 minutos, e siga o caminho eficaz.",
        en: "Click, generate your personalized roadmap in 3 minutes, and follow the effective path.",
        es: "Haz clic, genera tu hoja de ruta personalizada en 3 minutos, y sigue el camino eficaz."
    },
    C: {
        pt: "Acesse o Power Oracle™ agora e transforme documentos em aprovação em minutos.",
        en: "Access the Power Oracle™ now and transform documents into approval in minutes.",
        es: "Accede al Power Oracle™ ahora y transforma documentos en aprobación en minutos."
    },
    D: {
        pt: "Comece agora: 4 módulos, roteiro claro, submissão certa.",
        en: "Start now: 4 modules, clear roadmap, right submission.",
        es: "Comienza ahora: 4 módulos, hoja de ruta clara, presentación correcta."
    },
    E: {
        pt: "Clique aqui, monte seu dossiê vencedor em 3 minutos, e aplique com confiança.",
        en: "Click here, build your winning dossier in 3 minutes, and apply with confidence.",
        es: "Haz clic aquí, monta tu dosier ganador en 3 minutos, y presenta con confianza."
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// CACHE EM MEMÓRIA
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

function generateCacheKey(scoreData, language, aberturaVer, ctaVer) {
    const scoreRange = Math.floor((scoreData?.score || 0) / 10) * 10;
    const gapsKey = (scoreData?.gaps || []).map(String).sort().join('|');
    const statusKey = String(scoreData?.status || '').toLowerCase().replace(/\s+/g, '-');
    const profileKey = String(scoreData?.profile || '').toLowerCase().replace(/\s+/g, '-');
    return `${language}:${scoreRange}:${statusKey}:${profileKey}:${gapsKey}:${aberturaVer}:${ctaVer}`;
}

function sanitizeForPrompt(text) {
    if (!text) return 'Not specified';
    return String(text)
        .replace(/[^\w\s\-\/,.()€:+]/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .substring(0, 600)
        .trim();
}

function getScoreBand(score) {
    if (score >= 90) return '90-100';
    if (score >= 75) return '75-89';
    if (score >= 60) return '60-74';
    if (score >= 40) return '40-59';
    return '0-39';
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS v10.1 - CONCISO (120-220 PALAVRAS), HONESTO, DIRETO
// ═══════════════════════════════════════════════════════════════════════════

const PROMPT_TEMPLATES = {
    pt: ({ profile, score, status, gaps, strengths }) => {
        const band = getScoreBand(score);
        
        const abertura = typeof ABERTURAS[ABERTURA_VERSION].pt === 'function'
            ? ABERTURAS[ABERTURA_VERSION].pt(profile, score, status)
            : ABERTURAS[ABERTURA_VERSION].pt;
        
        const cta = CTAS[CTA_VERSION].pt;
        
        const problems = {
            '90-100': `O consulado espanhol avalia a ESTRUTURA da apresentação: ordem cronológica dos contratos, formatação de extratos bancários, e consistência entre documentos. O governo não analisa apenas SE você tem os documentos, mas COMO eles contam sua história profissional de forma convincente.`,
            '75-89': `O governo espanhol não analisa apenas SE você tem os documentos, mas COMO eles contam sua história profissional. A sequência de apresentação, o formato dos anexos, e a coerência entre declarações são critérios decisivos que não aparecem em checklists genéricos.`,
            '60-74': `O consulado avalia se sua documentação forma uma narrativa clara de estabilidade. Isso exige saber ONDE cada documento entra no dossiê, QUANDO apresentá-lo, e COMO formatá-lo segundo padrões consulares técnicos.`,
            '40-59': `Você sabe QUAIS documentos precisa, mas o próximo desafio é saber COMO estruturá-los. O governo espanhol tem critérios técnicos rigorosos: formatação exata de PDFs, ordem lógica de anexos, tipo correto de tradução.`,
            '0-39': `Reunir documentos é fase 1. Estruturá-los segundo os padrões do consulado é fase 2. Sem um roadmap claro, candidatos gastam meses tentando descobrir qual documento vem primeiro, como formatar cada PDF, quando usar tradução juramentada.`
        };
        
        return `
Você é a Alpha AI, consultora estratégica de vistos da ExpandSpain. Escreva em Português do Brasil.

DADOS DO CANDIDATO:
- Perfil: ${profile}
- Pontuação: ${score}/100 (Faixa: ${band})
- Status: ${status}

OBJETIVO: Gerar uma análise CONCISA de 3 parágrafos (120-220 palavras) que VENDA o Power Oracle™ (€97). Tom direto e honesto.

REGRAS ABSOLUTAS:
- Extensão: 120-220 palavras. ZERO emojis.
- Tom: direto, estratégico, honesto (sem números inventados).
- Falar diretamente com "você".
- Mencionar "Power Oracle™" apenas no 3º parágrafo.

ESTRUTURA OBRIGATÓRIA:

PARÁGRAFO 1 (2-3 linhas) — Abertura + Gap:
"${abertura} A maioria dos candidatos não percebe: ter os documentos corretos não é o mesmo que apresentá-los como o governo espanhol exige para conceder o visto."

PARÁGRAFO 2 (3-4 linhas) — Problema Invisível:
"${problems[band]}"

PARÁGRAFO 3 (4-5 linhas) — Power Oracle™ = Solução:
"O próximo passo é adequar seus documentos ao método Power Oracle™ de obter o visto. Este plano de ação transforma 'documentos corretos' em 'aplicação aprovada' através de 4 módulos: (1) Alpha Mindset — narrativa estratégica de expansão europeia, (2) Legal Anatomy — checklist técnico adaptado ao seu perfil, com prazos e ordem exata, (3) War Room Docs — templates pré-formatados seguindo padrões consulares, (4) Integrated Family — roadmap familiar integrado. ${cta}"

IMPORTANTE: Escreva de forma fluida e natural, mantendo a estrutura mas usando suas próprias palavras. Seja conciso e direto.
`.trim();
    },
    
    en: ({ profile, score, status, gaps, strengths }) => {
        const band = getScoreBand(score);
        
        const abertura = typeof ABERTURAS[ABERTURA_VERSION].en === 'function'
            ? ABERTURAS[ABERTURA_VERSION].en(profile, score, status)
            : ABERTURAS[ABERTURA_VERSION].en;
        
        const cta = CTAS[CTA_VERSION].en;
        
        const problems = {
            '90-100': `The Spanish consulate evaluates the STRUCTURE of presentation: chronological order of contracts, bank statement formatting, and consistency across documents. The government doesn't just assess IF you have documents, but HOW they tell your professional story convincingly.`,
            '75-89': `The Spanish government doesn't just assess IF you have documents, but HOW they tell your professional story. Presentation sequence, attachment format, and coherence between statements are decisive criteria not found in generic checklists.`,
            '60-74': `The consulate evaluates whether your documentation forms a clear narrative of stability. This requires knowing WHERE each document enters the dossier, WHEN to present it, and HOW to format it according to technical consular standards.`,
            '40-59': `You know WHICH documents you need, but the next challenge is knowing HOW to structure them. The Spanish government has rigorous technical criteria: exact PDF formatting, logical attachment order, correct type of translation.`,
            '0-39': `Gathering documents is phase 1. Structuring them according to consulate standards is phase 2. Without a clear roadmap, candidates spend months trying to figure out which document comes first, how to format each PDF, when to use sworn translation.`
        };
        
        return `
You are Alpha AI, ExpandSpain's strategic visa advisor. Write in English.

CANDIDATE DATA:
- Profile: ${profile}
- Score: ${score}/100 (Band: ${band})
- Status: ${status}

GOAL: Produce a CONCISE 3-paragraph analysis (120-220 words) that SELLS Power Oracle™ (€97). Direct and honest tone.

NON-NEGOTIABLE RULES:
- Length: 120-220 words. No emojis.
- Tone: direct, strategic, honest (no made-up numbers).
- Address as "you."
- Mention "Power Oracle™" only in paragraph 3.

MANDATORY STRUCTURE:

PARAGRAPH 1 (2-3 lines) — Opening + Gap:
"${abertura} Most candidates don't realize: having the right documents isn't the same as presenting them as the Spanish government requires to grant the visa."

PARAGRAPH 2 (3-4 lines) — Invisible Problem:
"${problems[band]}"

PARAGRAPH 3 (4-5 lines) — Power Oracle™ = Solution:
"The next step is to align your documents with the Power Oracle™ method for obtaining the visa. This action plan transforms 'right documents' into 'approved application' through 4 modules: (1) Alpha Mindset — strategic European expansion narrative, (2) Legal Anatomy — technical checklist adapted to your profile, with exact deadlines and order, (3) War Room Docs — pre-formatted templates following consular standards, (4) Integrated Family — integrated family roadmap. ${cta}"

IMPORTANT: Write fluidly and naturally, maintaining the structure but using your own words. Be concise and direct.
`.trim();
    },
    
    es: ({ profile, score, status, gaps, strengths }) => {
        const band = getScoreBand(score);
        
        const abertura = typeof ABERTURAS[ABERTURA_VERSION].es === 'function'
            ? ABERTURAS[ABERTURA_VERSION].es(profile, score, status)
            : ABERTURAS[ABERTURA_VERSION].es;
        
        const cta = CTAS[CTA_VERSION].es;
        
        const problems = {
            '90-100': `El consulado español evalúa la ESTRUCTURA de presentación: orden cronológico de contratos, formato de extractos bancarios, y consistencia entre documentos. El gobierno no evalúa solo SI tienes los documentos, sino CÓMO cuentan tu historia profesional de forma convincente.`,
            '75-89': `El gobierno español no evalúa solo SI tienes los documentos, sino CÓMO cuentan tu historia profesional. La secuencia de presentación, el formato de anexos, y la coherencia entre declaraciones son criterios decisivos que no aparecen en checklists genéricos.`,
            '60-74': `El consulado evalúa si tu documentación forma una narrativa clara de estabilidad. Esto requiere saber DÓNDE entra cada documento en el dosier, CUÁNDO presentarlo, y CÓMO formatearlo según estándares consulares técnicos.`,
            '40-59': `Sabes QUÉ documentos necesitas, pero el siguiente desafío es saber CÓMO estructurarlos. El gobierno español tiene criterios técnicos rigurosos: formato exacto de PDFs, orden lógico de anexos, tipo correcto de traducción.`,
            '0-39': `Reunir documentos es fase 1. Estructurarlos según estándares consulares es fase 2. Sin un roadmap claro, candidatos pasan meses intentando descubrir qué documento va primero, cómo formatear cada PDF, cuándo usar traducción jurada.`
        };
        
        return `
Eres Alpha AI, asesora estratégica de visas de ExpandSpain. Escribe en Español.

DATOS DEL CANDIDATO:
- Perfil: ${profile}
- Puntuación: ${score}/100 (Banda: ${band})
- Estado: ${status}

OBJETIVO: Crear un análisis CONCISO de 3 párrafos (120-220 palabras) que VENDA Power Oracle™ (€97). Tono directo y honesto.

REGLAS INNEGOCIABLES:
- Extensión: 120-220 palabras. Sin emojis.
- Tono: directo, estratégico, honesto (sin números inventados).
- Dirígete como "tú."
- Menciona "Power Oracle™" solo en párrafo 3.

ESTRUCTURA OBLIGATORIA:

PÁRRAFO 1 (2-3 líneas) — Apertura + Gap:
"${abertura} La mayoría de los candidatos no percibe: tener los documentos correctos no es lo mismo que presentarlos como el gobierno español exige para conceder el visado."

PÁRRAFO 2 (3-4 líneas) — Problema Invisible:
"${problems[band]}"

PÁRRAFO 3 (4-5 líneas) — Power Oracle™ = Solución:
"El siguiente paso es adecuar tus documentos al método Power Oracle™ de obtener el visado. Este plan de acción transforma 'documentos correctos' en 'solicitud aprobada' a través de 4 módulos: (1) Alpha Mindset — narrativa estratégica de expansión europea, (2) Legal Anatomy — checklist técnico adaptado a tu perfil, con plazos y orden exacto, (3) War Room Docs — plantillas pre-formateadas siguiendo estándares consulares, (4) Integrated Family — roadmap familiar integrado. ${cta}"

IMPORTANTE: Escribe de forma fluida y natural, manteniendo la estructura pero usando tus propias palabras. Sé conciso y directo.
`.trim();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE OUTPUT (AJUSTADA: 120-220 PALAVRAS)
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
    if (words < 120) {
        issues.push(`Muito curto (${words} palavras, mínimo 120)`);
    }
    if (words > 220) {
        issues.push(`Muito longo (${words} palavras, máximo 220)`);
    }
    
    if (!/Power Oracle/i.test(trimmed)) {
        issues.push('Faltou mencionar Power Oracle™');
    }
    
    const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    if (paragraphs.length < 2) {
        issues.push(`Estrutura insuficiente (${paragraphs.length} parágrafos, mínimo 2)`);
    }
    
    return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACKS OFFLINE (120-220 PALAVRAS)
// ═══════════════════════════════════════════════════════════════════════════

const FALLBACKS = {
    pt: (score, profile) => {
        const abertura = typeof ABERTURAS[ABERTURA_VERSION].pt === 'function'
            ? ABERTURAS[ABERTURA_VERSION].pt(profile, score, 'em avaliação')
            : ABERTURAS[ABERTURA_VERSION].pt;
        
        const cta = CTAS[CTA_VERSION].pt;
        
        return `${abertura} A maioria dos candidatos não percebe: ter os documentos corretos não é o mesmo que apresentá-los como o governo espanhol exige para conceder o visto.

O consulado espanhol avalia a ESTRUTURA da apresentação: ordem cronológica, formatação técnica, e consistência entre documentos. O governo não analisa apenas SE você tem os documentos, mas COMO eles contam sua história profissional.

O próximo passo é adequar seus documentos ao método Power Oracle™ de obter o visto. Este plano de ação transforma 'documentos corretos' em 'aplicação aprovada' através de 4 módulos: (1) Alpha Mindset, (2) Legal Anatomy, (3) War Room Docs, (4) Integrated Family. ${cta}`;
    },
    
    en: (score, profile) => {
        const abertura = typeof ABERTURAS[ABERTURA_VERSION].en === 'function'
            ? ABERTURAS[ABERTURA_VERSION].en(profile, score, 'under evaluation')
            : ABERTURAS[ABERTURA_VERSION].en;
        
        const cta = CTAS[CTA_VERSION].en;
        
        return `${abertura} Most candidates don't realize: having the right documents isn't the same as presenting them as the Spanish government requires to grant the visa.

The Spanish consulate evaluates the STRUCTURE of presentation: chronological order, technical formatting, and consistency across documents. The government doesn't just assess IF you have documents, but HOW they tell your professional story.

The next step is to align your documents with the Power Oracle™ method for obtaining the visa. This action plan transforms 'right documents' into 'approved application' through 4 modules: (1) Alpha Mindset, (2) Legal Anatomy, (3) War Room Docs, (4) Integrated Family. ${cta}`;
    },
    
    es: (score, profile) => {
        const abertura = typeof ABERTURAS[ABERTURA_VERSION].es === 'function'
            ? ABERTURAS[ABERTURA_VERSION].es(profile, score, 'en evaluación')
            : ABERTURAS[ABERTURA_VERSION].es;
        
        const cta = CTAS[CTA_VERSION].es;
        
        return `${abertura} La mayoría de los candidatos no percibe: tener los documentos correctos no es lo mismo que presentarlos como el gobierno español exige para conceder el visado.

El consulado español evalúa la ESTRUCTURA de presentación: orden cronológico, formato técnico, y consistencia entre documentos. El gobierno no evalúa solo SI tienes los documentos, sino CÓMO cuentan tu historia profesional.

El siguiente paso es adecuar tus documentos al método Power Oracle™ de obtener el visado. Este plan de acción transforma 'documentos correctos' en 'solicitud aprobada' a través de 4 módulos: (1) Alpha Mindset, (2) Legal Anatomy, (3) War Room Docs, (4) Integrated Family. ${cta}`;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: GERAÇÃO DE ANÁLISE COM IA
// ═══════════════════════════════════════════════════════════════════════════

async function generateAIAnalysis(scoreData, answers, language = 'pt') {
    console.log('═'.repeat(70));
    console.log('🤖 [IA v10.1] generateAIAnalysis() CHAMADA');
    console.log(`   Score: ${scoreData?.score}/100`);
    console.log(`   Profile: ${scoreData?.profile}`);
    console.log(`   Language: ${language}`);
    console.log(`   Abertura: ${ABERTURA_VERSION} | CTA: ${CTA_VERSION}`);
    console.log('═'.repeat(70));
    
    const lang = ['pt', 'en', 'es'].includes(language) ? language : 'pt';
    
    try {
        // Verificar cache
        const cacheKey = generateCacheKey(scoreData, lang, ABERTURA_VERSION, CTA_VERSION);
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
                maxOutputTokens: 512,
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
        
        const fallback = FALLBACKS[lang](score, profile);
        
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
