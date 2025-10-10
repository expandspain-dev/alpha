/**
 * EXPANDSPAIN ALPHA™ – AISERVICE
 * v5.3 – Gemini 2.5 | Prompts integrais (pt/en/es) | Foco exclusivo em Power Oracle™
 *
 * Setup:
 *   npm i @google/generative-ai
 *
 * Env (obrigatório):
 *   GEMINI_API_KEY=AIzaSyDZmpnu6RHTVaNTvY7QdPWCDTm1Wlwsqk4
 *   GEMINI_MODEL=models/gemini-2.5-flash   // opcional; default prioriza 2.5
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

/* ===========================
 *  MODELOS (prioriza 2.5)
 * =========================== */
const MODEL_CANDIDATES = [
  'models/gemini-2.5-flash',
  'models/gemini-2.5-pro',
  'models/gemini-1.5-pro',
  'models/gemini-1.5-flash'
];
const MODEL_ID = process.env.GEMINI_MODEL || MODEL_CANDIDATES[0];

/* ===========================
 *  CLIENTE GEMINI
 * =========================== */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ===========================
 *  CACHE EM MEMÓRIA (7 dias)
 * =========================== */
const analysisCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of analysisCache.entries()) {
    if (now - v.timestamp > CACHE_TTL) analysisCache.delete(k);
  }
}, 60 * 60 * 1000);

/* ===========================
 *  UTILS
 * =========================== */
function generateCacheKey(scoreData, language) {
  const scoreRange = Math.floor((scoreData?.score || 0) / 10) * 10;
  const gapsKey = (scoreData?.gaps || []).map(String).sort().join('|');
  const statusKey = String(scoreData?.status || '').toLowerCase();
  const profileKey = String(scoreData?.profile || '').toLowerCase();
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

/* ================================================================
 *  PROMPTS (sem qualquer menção a Code +34™ | foco Power Oracle™)
 * ================================================================ */
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

REGRAS ABSOLUTAS DE COPY:
- Máximo: 280 palavras. ZERO emojis.
- Tom: claro, estratégico, persuasivo, sem prometer “aprovação garantida”.
- Falar diretamente com “você” (não use “o candidato”).
- Usar exatamente os nomes dos gaps fornecidos (não inventar novos).
- Mencionar “Power Oracle™” somente no 3º parágrafo (solução).

ESTRUTURA OBRIGATÓRIA:

PARÁGRAFO 1 (3–4 linhas) — Diagnóstico Técnico Honesto:
- Iniciar com a frase EXATA:
  "Seu perfil de [Perfil] com pontuação [X]/100 indica [Status]."
- Em seguida, listar 2–3 gaps mais críticos pelo nome.
- Indicar taxa de rejeição histórica coerente com a faixa:
  • 0–39: 90–95%
  • 40–59: 60–75%
  • 60–74: 40–55%
  • 75–89: 20–35%
  • 90–100: 5–15%

PARÁGRAFO 2 (3–4 linhas) — O Problema que Ninguém Conta:
- Explicar por que informação ≠ estratégia, variando a mensagem por faixa:
  • 0–39: “99% aplicam antes de estarem prontos e desperdiçam €2.000+.”
  • 40–59: “87% com esses gaps são rejeitados mesmo ‘sabendo’ os requisitos.”
  • 60–74: “O ‘quase certo’ cai por detalhes técnicos invisíveis em checklists.”
  • 75–89: “Perfis fortes perdem por falhas documentais ‘cirúrgicas’.”
  • 90–100: “Mesmo excelentes falham por estrutura documental deficiente.”

PARÁGRAFO 3 (5–6 linhas) — Solução: Power Oracle™:
- Apresentar o Power Oracle™ como método prático para sair do diagnóstico e ir para a execução.
- Descrever objetivamente os 4 módulos:
  • Alpha Mindset — use o visto como base de expansão europeia
  • Legal Anatomy — checklist completo adaptado ao seu perfil
  • War Room Docs — modelos prontos que evitam erros críticos
  • Integrated Family — planejamento para cônjuge/filhos/pais (se aplicável)
- Adaptar a proposta à faixa de score (roteiro de preparação, correção de gaps, otimização técnica, precisão cirúrgica).
- CTA OBRIGATÓRIO (última linha, exatamente esta promessa de entrega):
  "Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos."
`.trim(),

  en: ({ profile, score, status, gaps, strengths }) => `
You are Alpha AI, ExpandSpain’s strategic visa advisor. Write in English.

CANDIDATE DATA:
- Profile: ${profile}
- Score: ${score}/100
- Status: ${status}
- Critical Gaps: ${gaps || 'None identified'}
- Strengths: ${strengths || 'None listed'}

GOAL: Produce a 3-paragraph analysis that SELLS Power Oracle™ (€97). Do not mention any other product.

NON-NEGOTIABLE COPY RULES:
- Max 280 words. No emojis.
- Tone: clear, strategic, persuasive. No “guaranteed approval” claims.
- Address the reader as “you” (never “the candidate”).
- Use the exact gap names provided; do not invent gaps.
- Mention “Power Oracle™” only in paragraph 3.

MANDATORY STRUCTURE:

PARAGRAPH 1 (3–4 lines) — Honest Technical Diagnosis:
- Start with this EXACT sentence:
  "Your [Profile] profile with a [X]/100 score indicates [Status]."
- Then name 2–3 most critical gaps.
- State a realistic historical rejection rate by score band:
  • 0–39: 90–95%
  • 40–59: 60–75%
  • 60–74: 40–55%
  • 75–89: 20–35%
  • 90–100: 5–15%

PARAGRAPH 2 (3–4 lines) — The Problem Nobody Tells:
- Explain why information ≠ strategy, adapted by band:
  • 0–39: “99% apply too early and waste €2,000+.”
  • 40–59: “87% with these gaps are rejected even ‘knowing’ the rules.”
  • 60–74: “The ‘almost certain’ fails on technical details no checklist captures.”
  • 75–89: “Strong profiles fall on ‘surgical’ documentary failures.”
  • 90–100: “Even excellent profiles fail due to poor document structuring.”

PARAGRAPH 3 (5–6 lines) — Solution: Power Oracle™:
- Present Power Oracle™ as the practical method to go from diagnosis to execution.
- Describe the 4 modules succinctly:
  • Alpha Mindset — use the visa as a European expansion base
  • Legal Anatomy — complete checklist adapted to your profile
  • War Room Docs — ready templates that avoid critical errors
  • Integrated Family — planning for spouse/children/parents (if applicable)
- Tailor the value to the score band (readiness roadmap, gap-fix sequencing, technical optimization, surgical precision).
- MANDATORY CTA (last line):
  "Access the Power Oracle™ now and get your personalized roadmap in minutes."
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

REGLAS DE COPY INNEGOCIABLES:
- Máx. 280 palabras. Sin emojis.
- Tono: claro, estratégico, persuasivo. Sin “aprobación garantizada”.
- Dirígete como “tú” (no “el candidato”).
- Usa los nombres exactos de los gaps provistos; no inventes gaps.
- Menciona “Power Oracle™” solo en el 3º párrafo.

ESTRUCTURA OBLIGATORIA:

PÁRRAFO 1 (3–4 líneas) — Diagnóstico Técnico Honesto:
- Empieza con esta frase EXACTA:
  "Tu perfil de [Perfil] con puntuación [X]/100 indica [Estado]."
- Luego, nombra 2–3 gaps críticos.
- Indica una tasa histórica de rechazo según banda:
  • 0–39: 90–95%
  • 40–59: 60–75%
  • 60–74: 40–55%
  • 75–89: 20–35%
  • 90–100: 5–15%

PÁRRAFO 2 (3–4 líneas) — El Problema Real:
- Explica por qué información ≠ estrategia, según banda:
  • 0–39: “El 99% aplica antes de tiempo y malgasta €2.000+.”
  • 40–59: “El 87% con estos gaps es rechazado incluso ‘sabiendo’ los requisitos.”
  • 60–74: “Lo ‘casi seguro’ falla por detalles técnicos invisibles en checklists.”
  • 75–89: “Perfiles fuertes caen por fallos documentales ‘quirúrgicos’.”
  • 90–100: “Incluso perfiles excelentes fallan por mala estructura documental.”

PÁRRAFO 3 (5–6 líneas) — Solución: Power Oracle™:
- Presenta Power Oracle™ como el método práctico para pasar del diagnóstico a la ejecución.
- Describe los 4 módulos de forma objetiva:
  • Alpha Mindset — base de expansión europea
  • Legal Anatomy — checklist completo adaptado a tu perfil
  • War Room Docs — plantillas listas que evitan errores críticos
  • Integrated Family — planificación para cónyuge/hijos/padres (si aplica)
- Ajusta el valor a la banda de puntuación (hoja de ruta, corrección de gaps, optimización técnica, precisión quirúrgica).
- CTA OBLIGATORIA (última línea):
  "Accede al Power Oracle™ ahora y recibe tu hoja de ruta personalizada en minutos."
`.trim()
};

/* ===========================
 *  VALIDAÇÃO (forma/estrutura)
 *  — sem “censura” de termos —
 * =========================== */
function validateAIOutput(analysis) {
  const issues = [];
  if (!analysis || typeof analysis !== 'string') {
    issues.push('Saída vazia ou não-string');
    return issues;
  }
  const words = analysis.trim().split(/\s+/).length;
  if (words < 90) issues.push(`Muito curto (${words} palavras)`);
  if (words > 320) issues.push(`Muito longo (${words} palavras)`);
  if (!/Power Oracle™/i.test(analysis)) issues.push('Faltou mencionar Power Oracle™ no 3º parágrafo.');
  const paras = analysis.split(/\n\s*\n/).filter(p => p.trim().length > 30);
  if (paras.length < 3) issues.push('Menos de 3 parágrafos úteis.');
  return issues;
}

/* ===========================
 *  FALLBACKS OFFLINE
 * =========================== */
const FALLBACKS = {
  pt: (score, profile, gaps = []) => {
    const band = score < 40 ? '0-39' : score < 60 ? '40-59' : score < 75 ? '60-74' : score < 90 ? '75-89' : '90-100';
    const rate = { '0-39': 93, '40-59': 68, '60-74': 48, '75-89': 28, '90-100': 9 }[band];
    const gapsTxt = gaps.length ? gaps.slice(0, 3).join(', ') : 'sem gaps críticos explicitados';
    return [
      `Seu perfil de ${profile} com pontuação ${score}/100 indica ${band}. Gaps prioritários: ${gapsTxt}. Com esses pontos sem correção, a taxa histórica de rejeição gira em torno de ${rate}%.`,
      `Informação ≠ estratégia. Muitos perfis nesta faixa falham por sequência errada, documentação incompleta e prazos mal geridos — detalhes “cirúrgicos” que não aparecem em checklists genéricos.`,
      `A solução prática é o Power Oracle™: um roadmap acionável que liga diagnóstico à execução. Você recebe: (1) Alpha Mindset, (2) Legal Anatomy adaptado ao seu perfil, (3) War Room Docs com modelos prontos, (4) Integrated Family. Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`
    ].join('\n\n');
  },
  en: (score, profile, gaps = []) => {
    const band = score < 40 ? '0-39' : score < 60 ? '40-59' : score < 75 ? '60-74' : score < 90 ? '75-89' : '90-100';
    const rate = { '0-39': 93, '40-59': 68, '60-74': 48, '75-89': 28, '90-100': 9 }[band];
    const gapsTxt = gaps.length ? gaps.slice(0, 3).join(', ') : 'no explicit critical gaps';
    return [
      `Your ${profile} profile with a ${score}/100 score indicates ${band}. Priority gaps: ${gapsTxt}. With these unresolved, historical rejection is ~${rate}%.`,
      `Information ≠ strategy. Many profiles fail due to wrong sequencing, incomplete documentation, and timing — “surgical” details no generic checklist captures.`,
      `The practical solution is Power Oracle™: an actionable roadmap from diagnosis to execution — (1) Alpha Mindset, (2) Legal Anatomy, (3) War Room Docs, (4) Integrated Family. Access the Power Oracle™ now and get your personalized roadmap in minutes.`
    ].join('\n\n');
  },
  es: (score, profile, gaps = []) => {
    const band = score < 40 ? '0-39' : score < 60 ? '40-59' : score < 75 ? '60-74' : score < 90 ? '75-89' : '90-100';
    const rate = { '0-39': 93, '40-59': 68, '60-74': 48, '75-89': 28, '90-100': 9 }[band];
    const gapsTxt = gaps.length ? gaps.slice(0, 3).join(', ') : 'sin gaps críticos explícitos';
    return [
      `Tu perfil de ${profile} con ${score}/100 indica ${band}. Gaps prioritarios: ${gapsTxt}. Con ellos sin corregir, el rechazo histórico ronda el ${rate}%.`,
      `Información ≠ estrategia. Muchos fallan por secuencia incorrecta, documentación incompleta y tiempos — detalles “quirúrgicos” que no aparecen en checklists genéricos.`,
      `La solución práctica es Power Oracle™: una hoja de ruta accionable de diagnóstico a ejecución — (1) Alpha Mindset, (2) Legal Anatomy, (3) War Room Docs, (4) Integrated Family. Accede al Power Oracle™ ahora y recibe tu hoja de ruta personalizada en minutos.`
    ].join('\n\n');
  }
};

/* ===========================
 *  GERAÇÃO DE ANÁLISE (IA)
 * =========================== */
async function generateAIAnalysis(scoreData, answers, language = 'pt') {
  const lang = ['pt', 'en', 'es'].includes(language) ? language : 'pt';

  try {
    // Cache
    const cacheKey = generateCacheKey(scoreData, lang);
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.analysis;
    }

    // Sanitização
    const safeProfile   = sanitizeForPrompt(scoreData?.profile || 'Candidato');
    const safeGaps      = (scoreData?.gaps || []).map(sanitizeForPrompt).join(', ');
    const safeStrengths = (scoreData?.strengths || []).map(sanitizeForPrompt).join(', ');
    const score         = Number(scoreData?.score || 0);
    const status        = sanitizeForPrompt(scoreData?.status || 'Em avaliação');

    // Prompt localizado
    const prompt = PROMPT_TEMPLATES[lang]({
      profile: safeProfile,
      score,
      status,
      gaps: safeGaps,
      strengths: safeStrengths
    });

    // Chamada ao modelo principal com fallback de modelo (sem safetySettings adicionais)
    let result;
    try {
      const model = genAI.getGenerativeModel({
        model: MODEL_ID,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      });
      result = await model.generateContent(prompt);
    } catch (e) {
      const fallbackId = MODEL_CANDIDATES.find(m => m !== MODEL_ID);
      if (!fallbackId) throw e;
      const fallbackModel = genAI.getGenerativeModel({
        model: fallbackId,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      });
      result = await fallbackModel.generateContent(prompt);
    }

    // Extração do texto
    const response = await result.response;
    const analysis =
      (typeof response.text === 'function' ? response.text() : null) ||
      response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ||
      '';

    if (!analysis || analysis.trim() === '') {
      throw new Error('Resposta vazia da IA.');
    }

    // Validação de forma/estrutura (sem bloquear termos)
    const issues = validateAIOutput(analysis);
    if (issues.length) {
      // Se faltou o essencial, cai para fallback localizado
      const critical = issues.some(i => /Power Oracle™|vazia/i.test(i));
      if (critical) {
        const fb = FALLBACKS[lang](score, safeProfile, scoreData?.gaps || []);
        analysisCache.set(cacheKey, { analysis: fb, timestamp: Date.now() });
        return fb;
      }
      // Se não for crítico, seguimos com o texto da IA (aceitando pequenas variações)
    }

    analysisCache.set(cacheKey, { analysis, timestamp: Date.now() });
    return analysis;

  } catch (err) {
    const langFb = ['pt', 'en', 'es'].includes(language) ? language : 'pt';
    const score = Number(scoreData?.score || 0);
    const fb = FALLBACKS[langFb](score, sanitizeForPrompt(scoreData?.profile || 'Candidato'), scoreData?.gaps || []);
    return fb;
  }
}

module.exports = { generateAIAnalysis };
