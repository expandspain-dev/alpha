/**
 * EXPANDSPAIN ALPHA™ - AI SERVICE (v4.3 - FINAL DOSSIER IMPLEMENTATION)
 * Integração com Google Gemini API
 * - CORRIGIDO: Nome do modelo atualizado para o formato oficial da API v1 estável ('models/gemini-1.5-pro').
 * - CORRIGIDO: Importação e uso correto das constantes de segurança.
 * - CORRIGIDO: Método de leitura da resposta para compatibilidade com SDKs recentes.
 * - MANTIDO: Otimizações de prompt, cache e validação.
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Mapa de idiomas
const langMap = {
    pt: 'Português do Brasil',
    en: 'English',
    es: 'Español'
};

// Cache de análises (em memória)
const analysisCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Limpa cache expirado periodicamente
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of analysisCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            analysisCache.delete(key);
        }
    }
}, 60 * 60 * 1000);

/**
 * Gera chave de cache única baseada em características do candidato
 */
function generateCacheKey(scoreData, language) {
    const scoreRange = Math.floor(scoreData.score / 10) * 10;
    const gapsKey = (scoreData.gaps || []).sort().join('|');
    return `${scoreRange}-${gapsKey}-${language}`;
}

/**
 * Sanitiza texto para prevenir prompt injection
 */
function sanitizeForPrompt(text) {
    if (!text) return 'Not specified';
    return String(text)
        .replace(/[^\w\s\-\/,.()]/gi, '')
        .substring(0, 200)
        .trim();
}

/**
 * Valida output da IA
 */
function validateAIOutput(analysis, scoreData) {
    const issues = [];
    if (!analysis || typeof analysis !== 'string') {
        issues.push('Analysis is null or not a string');
        return issues;
    }
    if (!analysis.includes('Power Oracle') && !analysis.includes('Oracle™')) {
        issues.push('Missing Power Oracle™ mention');
    }
    if (scoreData.score < 75 && analysis.includes('Code +34')) {
        issues.push('Incorrectly mentions Code +34™');
    }
    const wordCount = analysis.split(/\s+/).length;
    if (wordCount < 80) {
        issues.push(`Too short (${wordCount} words)`);
    }
    if (wordCount > 400) {
        issues.push(`Too long (${wordCount} words)`);
    }
    const paragraphs = analysis.split('\n\n').filter(p => p.trim().length > 50);
    if (paragraphs.length < 3) {
        issues.push(`Insufficient structure (${paragraphs.length} paragraphs)`);
    }
    return issues;
}

/**
 * Gera análise com IA que vende Power Oracle™
 */
async function generateAIAnalysis(scoreData, answers, language = 'pt') {
    try {
        console.log('🤖 Gerando análise com IA Gemini (API v1 Stable)...');
        console.log(`   Modelo: "models/gemini-1.5-pro"`);
        console.log(`   Idioma: ${language}`);

        const cacheKey = generateCacheKey(scoreData, language);
        if (analysisCache.has(cacheKey)) {
            const cached = analysisCache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                console.log('✅ Usando análise em cache');
                return cached.analysis;
            } else {
                analysisCache.delete(cacheKey);
            }
        }

        const safeProfile = sanitizeForPrompt(scoreData.profile);
        const safeGaps = (scoreData.gaps || []).map(sanitizeForPrompt).join(', ');
        const safeStrengths = (scoreData.strengths || []).map(sanitizeForPrompt).join(', ');
        const tone = scoreData.score < 40 ? 'urgent and preventive' :
                     scoreData.score < 60 ? 'direct and data-driven' :
                     scoreData.score < 75 ? 'motivational and strategic' :
                     scoreData.score < 90 ? 'confident and professional' :
                     'validating and precise';

        const prompt = `You are Alpha AI, strategic visa consultant for ExpandSpain.

CANDIDATE DATA:
- Profile: ${safeProfile}
- Score: ${scoreData.score}/100
- Status: ${scoreData.status}
- Critical Gaps: ${safeGaps || 'None identified'}
- Strengths: ${safeStrengths || 'None identified'}

YOUR TASK: Generate a 3-paragraph analysis in ${langMap[language]} that SELLS Power Oracle™ (€97).

MANDATORY STRUCTURE:

PARAGRAPH 1 (3-4 lines) - Honest Technical Diagnosis:
- Start with: "Your [Profile] profile with score [X]/100 indicates [Status]."
- List 2-3 most critical gaps by name
- State realistic rejection rate: "With these gaps unresolved, historical rejection rate is X%"
- Use REAL statistics (adjust based on score range)

PARAGRAPH 2 (3-4 lines) - The Problem Nobody Tells:
- Explain that information ≠ strategy
- Use specific approach based on score:
  * Score 0-39: "99% of candidates in this range apply without strategic preparation and waste €2,000+ on fees, apostilled documents, and time. The problem isn't lack of will—it's lack of structured roadmap."
  * Score 40-59: "87% of candidates with these gaps are rejected even having 'information'. The problem isn't knowing the requirements—it's fulfilling them in the right order, with precise documentation, within the critical timings Spanish authorities demand."
  * Score 60-74: "Candidates in this range often trust the 'almost certain' and lose approval due to avoidable technical details. A generic Google checklist doesn't capture the specific nuances of your [Profile] profile."
  * Score 75-89: "73% of strong profiles are rejected due to documentary failures that a generic manual doesn't identify. The difference between approval and rejection isn't large—but it's surgical."
  * Score 90-100: "Even excellent profiles face rejections due to poorly structured documentation or incorrect interpretation of technical requirements. Spanish authorities' decision is binary: perfect OR rejected."

PARAGRAPH 3 (5-6 lines) - Solution: Power Oracle™:
- Present Power Oracle™ as the strategic solution for their score
- Mention 4 modules objectively:
  • Alpha Mindset: Use visa as European expansion base, not just country change
  • Legal Anatomy: Complete requirements checklist adapted to your [Profile] profile
  • War Room Docs: Ready templates for submission that avoid critical formatting errors
  • Integrated Family: Complete planning for spouse, children, and parents (if applicable)
- Adapt value proposition to score:
  * Score 0-39: "Power Oracle™ creates your personalized preparation roadmap so you can apply safely when your profile is ready. You avoid wasting money applying prematurely."
  * Score 40-59: "Power Oracle™ corrects your specific gaps and puts you in the approval range. Each gap has a clear step, necessary documents, and realistic timeline."
  * Score 60-74: "Power Oracle™ optimizes every technical detail of your profile and positions you in the approval zone with safety margin. You transform 'good' into 'excellent'."
  * Score 75-89: "Power Oracle™ eliminates any risk of rejection due to technical details and structures your application with professional precision. You leave nothing to chance."
  * Score 90-100: "Power Oracle™ structures your documentation with the surgical precision Spanish authorities demand, ensuring favorable decision within 60 days."
- Guarantees: "For €97 (with unconditional 30-day guarantee + 100% value credited to Code +34™ if you hire complete service), you transform your diagnosis into ACTION."
${scoreData.score >= 75 ? '- Add ONE line: "If you prefer complete done-for-you service, Code +34™ includes all Power Oracle™ plus full execution with 99.7% success rate."' : ''}

CTA (mandatory last line):
"Access Power Oracle™ now and receive your personalized roadmap in minutes."

ABSOLUTE RULES:
- Language: ${langMap[language]}
- Maximum: 280 words
- Tone: ${tone}
- Use "you" (not "the candidate")
- ZERO emojis
- No guaranteed approval promises (only statistics)
- Focus on STRATEGY > bureaucracy
- Power Oracle™ MUST be mentioned in paragraph 3
- Code +34™ only if score >= 75 AND only AFTER selling Oracle™
- NEVER invent gaps not provided
- ALWAYS use exact gap names from list

Generate the analysis now following ALL rules above.`;

        // Configuração final e correta do modelo
        const model = genAI.getGenerativeModel({ 
            model: "models/gemini-1.5-pro",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;

        // Leitura da resposta compatível com SDKs recentes
        const analysis =
            response?.text?.() ||
            response?.candidates?.[0]?.content?.parts?.[0]?.text ||
            '';

        if (!analysis || analysis.trim() === '') {
            console.error('❌ A IA retornou uma resposta vazia (verifique API Key e permissões no Google Cloud).');
            throw new Error('AI returned an empty or invalid response.');
        }
        
        console.log('✅ Análise gerada com sucesso pela API v1');
        console.log(`   Tamanho: ${analysis.length} caracteres`);

        const validationIssues = validateAIOutput(analysis, scoreData);
        if (validationIssues.length > 0) {
            console.warn('⚠️  Análise com problemas de validação:', validationIssues);
            if (validationIssues.some(i => i.includes('Missing Power Oracle') || i.includes('Too short') || i.includes('null or not a string'))) {
                console.error('❌ Análise inválida. Usando fallback.');
                return generateFallbackAnalysis(scoreData, language);
            }
        }

        analysisCache.set(cacheKey, { analysis: analysis, timestamp: Date.now() });
        console.log(`📦 Análise salva em cache`);

        return analysis;

    } catch (error) {
        console.error('❌ Erro final ao gerar análise com IA:', error.message);
        
        if (error.response) {
            console.error('   Response:', error.response);
        }
        
        console.warn('⚠️  Usando análise fallback');
        return generateFallbackAnalysis(scoreData, language);
    }
}

/**
 * Gera análise fallback se IA falhar
 */
function generateFallbackAnalysis(scoreData, language) {
    const score = scoreData.score;
    const profile = scoreData.profile || 'Candidate';
    const gapCount = scoreData.gaps?.length || 0;
    const gapsList = scoreData.gaps?.slice(0, 3).join(', ') || 'none';
    
    const scoreRange = score < 40 ? '0-39' :
                       score < 60 ? '40-59' :
                       score < 75 ? '60-74' :
                       score < 90 ? '75-89' : '90-100';
    
    const rejectionRates = {
        '0-39': 94,
        '40-59': 68,
        '60-74': 45,
        '75-89': 27,
        '90-100': 8
    };
    
    const rejectionRate = rejectionRates[scoreRange];
    
    const fallbacks = {
        pt: {
            '0-39': `Seu perfil de ${profile} com score de ${score}/100 indica necessidade de preparação crítica antes da aplicação. ${gapCount > 0 ? `Os principais gaps identificados são: ${gapsList}.` : 'Seu perfil precisa fortalecimento estratégico.'} Com esses gaps não resolvidos, a taxa de rejeição histórica é de ${rejectionRate}%.

99% dos candidatos nessa faixa aplicam sem preparação estratégica e perdem €2.000+ em taxas de aplicação, documentos apostilados e tempo desperdiçado. O problema não é falta de vontade — é falta de roadmap estruturado.

O Power Oracle™ cria seu roadmap personalizado de preparação para você aplicar com segurança quando seu perfil estiver pronto. Os 4 módulos incluem: Alpha Mindset para usar o visto como base de expansão europeia, Legal Anatomy com checklist completo adaptado ao seu perfil de ${profile}, War Room Docs com templates prontos que evitam erros de formatação críticos, e Integrated Family para planejamento familiar completo. Por €97 (com garantia incondicional de 30 dias + 100% do valor creditado no Code +34™), você transforma seu diagnóstico em AÇÃO e evita desperdiçar dinheiro aplicando prematuramente.

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`,
            
            '40-59': `Seu perfil de ${profile} com score de ${score}/100 indica necessidade de otimização em pontos específicos. ${gapCount > 0 ? `Os principais gaps identificados são: ${gapsList}.` : 'Seu perfil tem potencial mas precisa ajustes.'} Com esses gaps não resolvidos, a taxa de rejeição histórica é de ${rejectionRate}%.

87% dos candidatos com esses gaps são rejeitados mesmo tendo 'informação'. O problema não é saber os requisitos — é cumpri-los na ordem certa, com a documentação precisa e dentro dos timings críticos que as autoridades espanholas exigem.

O Power Oracle™ corrige seus gaps específicos e te coloca na faixa de aprovação. Os 4 módulos incluem: Alpha Mindset para usar o visto como base de expansão europeia, Legal Anatomy com checklist completo adaptado ao seu perfil de ${profile}, War Room Docs com templates prontos que evitam erros de formatação críticos, e Integrated Family para planejamento familiar completo. Por €97 (com garantia incondicional de 30 dias + 100% do valor creditado no Code +34™), você transforma seu diagnóstico em AÇÃO e cada gap tem um passo claro, documentos necessários e timeline realista.

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`,
            
            '60-74': `Seu perfil de ${profile} com score de ${score}/100 indica bom potencial com necessidade de otimização em pontos específicos. ${gapCount > 0 ? `Os principais gaps identificados são: ${gapsList}.` : 'Seu perfil está no caminho certo.'} Com esses gaps não resolvidos, a taxa de rejeição histórica é de ${rejectionRate}%.

Candidatos nessa faixa frequentemente confiam no 'quase certo' e perdem aprovação por detalhes técnicos evitáveis. Um checklist genérico do Google não captura as nuances específicas do seu perfil de ${profile}.

O Power Oracle™ otimiza cada detalhe técnico do seu perfil e te posiciona na zona de aprovação com margem de segurança. Os 4 módulos incluem: Alpha Mindset para usar o visto como base de expansão europeia, Legal Anatomy com checklist completo adaptado ao seu perfil de ${profile}, War Room Docs com templates prontos que evitam erros de formatação críticos, e Integrated Family para planejamento familiar completo. Por €97 (com garantia incondicional de 30 dias + 100% do valor creditado no Code +34™), você transforma 'bom' em 'excelente'.

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`,
            
            '75-89': `Seu perfil de ${profile} com score de ${score}/100 indica um perfil forte com alta probabilidade de aprovação. ${gapCount > 0 ? `O principal gap identificado é: ${gapsList}.` : 'Seu perfil está muito bem posicionado.'} Com esse gap não resolvido, a taxa de rejeição histórica é de ${rejectionRate}%.

73% dos perfis fortes são rejeitados por falhas documentais que um manual genérico não identifica. A diferença entre aprovação e rejeição não é grande — mas é cirúrgica.

O Power Oracle™ elimina qualquer risco de rejeição por detalhes técnicos e estrutura sua aplicação com precisão profissional. Os 4 módulos incluem: Alpha Mindset para usar o visto como base de expansão europeia, Legal Anatomy com checklist completo adaptado ao seu perfil de ${profile}, War Room Docs com templates prontos que evitam erros de formatação críticos, e Integrated Family para planejamento familiar completo. Por €97 (com garantia incondicional de 30 dias + 100% do valor creditado no Code +34™), você não deixa nada ao acaso. Se preferir serviço completo done-for-you, o Code +34™ inclui todo o Power Oracle™ mais a execução completa com 99.7% de taxa de sucesso.

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`,
            
            '90-100': `Seu perfil de ${profile} com score de ${score}/100 indica um perfil excelente. ${gapCount > 0 ? `O único ponto de atenção é: ${gapsList}.` : 'Seu perfil está em excelente posição.'} Mesmo com perfis excelentes, a taxa de rejeição por detalhes técnicos é de ${rejectionRate}%.

Mesmo perfis excelentes enfrentam rejeições por documentação mal estruturada ou interpretação incorreta de requisitos técnicos. A decisão das autoridades espanholas é binária: perfeito OU rejeitado.

O Power Oracle™ estrutura sua documentação com a precisão cirúrgica que as autoridades espanholas exigem, garantindo decisão favorável em até 60 dias. Os 4 módulos incluem: Alpha Mindset para usar o visto como base de expansão europeia, Legal Anatomy com checklist completo adaptado ao seu perfil de ${profile}, War Room Docs com templates prontos que evitam erros de formatação críticos, e Integrated Family para planejamento familiar completo. Por €97 (com garantia incondicional de 30 dias + 100% do valor creditado no Code +34™), você maximiza suas chances de aprovação rápida. Se preferir serviço completo done-for-you, o Code +34™ inclui todo o Power Oracle™ mais a execução completa com 99.7% de taxa de sucesso.

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`
        },
        
        en: {
            '0-39': `Your ${profile} profile with a score of ${score}/100 indicates need for critical preparation before application. ${gapCount > 0 ? `The main gaps identified are: ${gapsList}.` : 'Your profile needs strategic strengthening.'} With these gaps unresolved, the historical rejection rate is ${rejectionRate}%.

99% of candidates in this range apply without strategic preparation and waste €2,000+ on application fees, apostilled documents, and wasted time. The problem isn't lack of will—it's lack of structured roadmap.

Power Oracle™ creates your personalized preparation roadmap so you can apply safely when your profile is ready. The 4 modules include: Alpha Mindset to use visa as European expansion base, Legal Anatomy with complete checklist adapted to your ${profile} profile, War Room Docs with ready templates that avoid critical formatting errors, and Integrated Family for complete family planning. For €97 (with unconditional 30-day guarantee + 100% value credited to Code +34™), you transform your diagnosis into ACTION and avoid wasting money applying prematurely.

Access Power Oracle™ now and receive your personalized roadmap in minutes.`,
            
            '40-59': `Your ${profile} profile with a score of ${score}/100 indicates need for optimization in specific points. ${gapCount > 0 ? `The main gaps identified are: ${gapsList}.` : 'Your profile has potential but needs adjustments.'} With these gaps unresolved, the historical rejection rate is ${rejectionRate}%.

87% of candidates with these gaps are rejected even having 'information'. The problem isn't knowing the requirements—it's fulfilling them in the right order, with precise documentation, within the critical timings Spanish authorities demand.

Power Oracle™ corrects your specific gaps and puts you in the approval range. The 4 modules include: Alpha Mindset to use visa as European expansion base, Legal Anatomy with complete checklist adapted to your ${profile} profile, War Room Docs with ready templates that avoid critical formatting errors, and Integrated Family for complete family planning. For €97 (with unconditional 30-day guarantee + 100% value credited to Code +34™), you transform your diagnosis into ACTION and each gap has a clear step, necessary documents, and realistic timeline.

Access Power Oracle™ now and receive your personalized roadmap in minutes.`,
            
            '60-74': `Your ${profile} profile with a score of ${score}/100 indicates good potential with need for optimization in specific points. ${gapCount > 0 ? `The main gaps identified are: ${gapsList}.` : 'Your profile is on the right track.'} With these gaps unresolved, the historical rejection rate is ${rejectionRate}%.

Candidates in this range often trust the 'almost certain' and lose approval due to avoidable technical details. A generic Google checklist doesn't capture the specific nuances of your ${profile} profile.

Power Oracle™ optimizes every technical detail of your profile and positions you in the approval zone with safety margin. The 4 modules include: Alpha Mindset to use visa as European expansion base, Legal Anatomy with complete checklist adapted to your ${profile} profile, War Room Docs with ready templates that avoid critical formatting errors, and Integrated Family for complete family planning. For €97 (with unconditional 30-day guarantee + 100% value credited to Code +34™), you transform 'good' into 'excellent'.

Access Power Oracle™ now and receive your personalized roadmap in minutes.`,
            
            '75-89': `Your ${profile} profile with a score of ${score}/100 indicates a strong profile with high probability of approval. ${gapCount > 0 ? `The main gap identified is: ${gapsList}.` : 'Your profile is very well positioned.'} With this gap unresolved, the historical rejection rate is ${rejectionRate}%.

73% of strong profiles are rejected due to documentary failures that a generic manual doesn't identify. The difference between approval and rejection isn't large—but it's surgical.

Power Oracle™ eliminates any risk of rejection due to technical details and structures your application with professional precision. The 4 modules include: Alpha Mindset to use visa as European expansion base, Legal Anatomy with complete checklist adapted to your ${profile} profile, War Room Docs with ready templates that avoid critical formatting errors, and Integrated Family for complete family planning. For €97 (with unconditional 30-day guarantee + 100% value credited to Code +34™), you leave nothing to chance. If you prefer complete done-for-you service, Code +34™ includes all Power Oracle™ plus full execution with 99.7% success rate.

Access Power Oracle™ now and receive your personalized roadmap in minutes.`,
            
            '90-100': `Your ${profile} profile with a score of ${score}/100 indicates an excellent profile. ${gapCount > 0 ? `The only point of attention is: ${gapsList}.` : 'Your profile is in excellent position.'} Even with excellent profiles, the rejection rate due to technical details is ${rejectionRate}%.

Even excellent profiles face rejections due to poorly structured documentation or incorrect interpretation of technical requirements. Spanish authorities' decision is binary: perfect OR rejected.

Power Oracle™ structures your documentation with the surgical precision Spanish authorities demand, ensuring favorable decision within 60 days. The 4 modules include: Alpha Mindset to use visa as European expansion base, Legal Anatomy with complete checklist adapted to your ${profile} profile, War Room Docs with ready templates that avoid critical formatting errors, and Integrated Family for complete family planning. For €97 (with unconditional 30-day guarantee + 100% value credited to Code +34™), you maximize your chances of fast approval. If you prefer complete done-for-you service, Code +34™ includes all Power Oracle™ plus full execution with 99.7% success rate.

Access Power Oracle™ now and receive your personalized roadmap in minutes.`
        },
        
        es: {
            '0-39': `Tu perfil de ${profile} con puntaje de ${score}/100 indica necesidad de preparación crítica antes de la aplicación. ${gapCount > 0 ? `Los principales gaps identificados son: ${gapsList}.` : 'Tu perfil necesita fortalecimiento estratégico.'} Con estos gaps sin resolver, la tasa de rechazo histórica es del ${rejectionRate}%.

99% de los candidatos en este rango aplican sin preparación estratégica y pierden €2.000+ en tasas de aplicación, documentos apostillados y tiempo desperdiciado. El problema no es falta de voluntad—es falta de roadmap estructurado.

Power Oracle™ crea tu roadmap personalizado de preparación para que puedas aplicar con seguridad cuando tu perfil esté listo. Los 4 módulos incluyen: Alpha Mindset para usar visa como base de expansión europea, Legal Anatomy con checklist completo adaptado a tu perfil de ${profile}, War Room Docs con templates listos que evitan errores de formateo críticos, e Integrated Family para planificación familiar completa. Por €97 (con garantía incondicional de 30 días + 100% del valor acreditado en Code +34™), transformas tu diagnóstico en ACCIÓN y evitas desperdiciar dinero aplicando prematuramente.

Accede a Power Oracle™ ahora y recibe tu roadmap personalizado en minutos.`,
            
            '40-59': `Tu perfil de ${profile} con puntaje de ${score}/100 indica necesidad de optimización en puntos específicos. ${gapCount > 0 ? `Los principales gaps identificados son: ${gapsList}.` : 'Tu perfil tiene potencial pero necesita ajustes.'} Con estos gaps sin resolver, la tasa de rechazo histórica es del ${rejectionRate}%.

87% de los candidatos con estos gaps son rechazados aun teniendo 'información'. El problema no es saber los requisitos—es cumplirlos en el orden correcto, con la documentación precisa, dentro de los timings críticos que las autoridades españolas exigen.

Power Oracle™ corrige tus gaps específicos y te coloca en el rango de aprobación. Los 4 módulos incluyen: Alpha Mindset para usar visa como base de expansión europea, Legal Anatomy con checklist completo adaptado a tu perfil de ${profile}, War Room Docs con templates listos que evitan errores de formateo críticos, e Integrated Family para planificación familiar completa. Por €97 (con garantía incondicional de 30 días + 100% del valor acreditado en Code +34™), transformas tu diagnóstico en ACCIÓN y cada gap tiene un paso claro, documentos necesarios y timeline realista.

Accede a Power Oracle™ ahora y recibe tu roadmap personalizado en minutos.`,
            
            '60-74': `Tu perfil de ${profile} con puntaje de ${score}/100 indica buen potencial con necesidad de optimización en puntos específicos. ${gapCount > 0 ? `Los principales gaps identificados son: ${gapsList}.` : 'Tu perfil va por buen camino.'} Con estos gaps sin resolver, la tasa de rechazo histórica es del ${rejectionRate}%.

Candidatos en este rango frecuentemente confían en el 'casi seguro' y pierden aprobación por detalles técnicos evitables. Un checklist genérico de Google no captura las nuances específicas de tu perfil de ${profile}.

Power Oracle™ optimiza cada detalle técnico de tu perfil y te posiciona en la zona de aprobación con margen de seguridad. Los 4 módulos incluyen: Alpha Mindset para usar visa como base de expansión europea, Legal Anatomy con checklist completo adaptado a tu perfil de ${profile}, War Room Docs con templates listos que evitan errores de formateo críticos, e Integrated Family para planificación familiar completa. Por €97 (con garantía incondicional de 30 días + 100% del valor acreditado en Code +34™), transformas 'bueno' en 'excelente'.

Accede a Power Oracle™ ahora y recibe tu roadmap personalizado en minutos.`,
            
            '75-89': `Tu perfil de ${profile} con puntaje de ${score}/100 indica un perfil fuerte con alta probabilidad de aprobación. ${gapCount > 0 ? `El principal gap identificado es: ${gapsList}.` : 'Tu perfil está muy bien posicionado.'} Con este gap sin resolver, la tasa de rechazo histórica es del ${rejectionRate}%.

73% de los perfiles fuertes son rechazados por fallas documentales que un manual genérico no identifica. La diferencia entre aprobación y rechazo no es grande—pero es quirúrgica.

Power Oracle™ elimina cualquier riesgo de rechazo por detalles técnicos y estructura tu aplicación con precisión profesional. Los 4 módulos incluyen: Alpha Mindset para usar visa como base de expansión europea, Legal Anatomy con checklist completo adaptado a tu perfil de ${profile}, War Room Docs con templates listos que evitan errores de formateo críticos, e Integrated Family para planificación familiar completa. Por €97 (con garantía incondicional de 30 días + 100% del valor acreditado en Code +34™), no dejas nada al azar. Si preferir servicio completo done-for-you, Code +34™ incluye todo Power Oracle™ más la ejecución completa con 99.7% de tasa de éxito.

Accede a Power Oracle™ ahora y recibe tu roadmap personalizado en minutos.`,
            
            '90-100': `Tu perfil de ${profile} con puntaje de ${score}/100 indica un perfil excelente. ${gapCount > 0 ? `El único ponto de atención es: ${gapsList}.` : 'Tu perfil está en excelente posición.'} Aun con perfiles excelentes, la tasa de rechazo por detalles técnicos es del ${rejectionRate}%.

Aun perfiles excelentes enfrentan rechazos por documentación mal estructurada o interpretación incorrecta de requisitos técnicos. La decisión de las autoridades españolas es binaria: perfecto O rechazado.

Power Oracle™ estructura tu documentación con la precisión quirúrgica que las autoridades españolas exigen, garantizando decisión favorable en hasta 60 días. Los 4 módulos incluyen: Alpha Mindset para usar o visto como base de expansão europeia, Legal Anatomy com checklist completo adaptado ao seu perfil de ${profile}, War Room Docs com templates prontos que evitam erros de formatação críticos, e Integrated Family para planejamento familiar completo. Por €97 (com garantia incondicional de 30 dias + 100% do valor creditado no Code +34™), você maximiza suas chances de aprovação rápida. Se preferir serviço completo done-for-you, o Code +34™ inclui todo o Power Oracle™ mais a execução completa com 99.7% de taxa de sucesso.

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`
        }
    };
    
    return fallbacks[language]?.[scoreRange] || fallbacks['pt']?.[scoreRange] || fallbacks['pt']['40-59'];
}

module.exports = {
    generateAIAnalysis
};
