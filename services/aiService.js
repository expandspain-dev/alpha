/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPANDSPAIN ALPHA™ - AI SERVICE v12.2 FINAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * MODELO: gemini-2.0-flash-exp
 * CORES: Roxo geral + Azul para Power Oracle™
 * PROMOÇÃO: €97
 * 
 * @author ExpandSpain Team
 * @version 12.2
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

console.log('✅ [aiService v12.2] Gemini AI inicializado (Power Oracle Azul)');
console.log(`   Modelo: ${MODEL_ID}`);

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

function generateCacheKey(scoreData, language) {
    const scoreRange = Math.floor((scoreData?.score || 0) / 10) * 10;
    const strengthsKey = (scoreData?.strengths || []).map(String).sort().join('|');
    const profileKey = String(scoreData?.profile || '').toLowerCase().replace(/\s+/g, '-');
    return `${language}:${scoreRange}:${profileKey}:${strengthsKey}`;
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
// TEXTOS FIXOS v12.2 - POWER ORACLE EM AZUL
// ═══════════════════════════════════════════════════════════════════════════

const FIXED_TEXTS = {
    // TÍTULO DA ANÁLISE
    analysisTitle: {
        pt: `<div class="ai-analysis-header">
            <span class="ai-badge">ANÁLISE DE IA</span>
            <h2 class="analysis-title">Seu Roadmap Estratégico Para Aprovação</h2>
        </div>`,
        
        en: `<div class="ai-analysis-header">
            <span class="ai-badge">AI ANALYSIS</span>
            <h2 class="analysis-title">Your Strategic Roadmap to Approval</h2>
        </div>`,
        
        es: `<div class="ai-analysis-header">
            <span class="ai-badge">ANÁLISIS DE IA</span>
            <h2 class="analysis-title">Tu Hoja de Ruta Estratégica Para la Aprobación</h2>
        </div>`
    },
    
    // PARÁGRAFO 1: Distância e Gap Crítico
    paragraph1: {
        pt: `<div class="analysis-section section-diagnosis">
            <h3 class="section-label">📊 Diagnóstico</h3>
            <p><strong>Agora você sabe a que distância está de obter o visto.</strong> O próximo passo é estabelecer a estratégia que o governo espanhol aprova.</p>
            
            <p>O teste mostrou <strong>quais documentos</strong> são necessários para preencher os requisitos. Mas conhecer os documentos não é suficiente, pois a aprovação também depende da <strong>forma como são apresentados</strong>.</p>
            
            <div class="example-box">
                <span class="example-label">⚠️ Exemplo crítico:</span>
                <p>Não basta possuir os extratos dos últimos três meses de recebimentos. É preciso apresentar um <strong>relatório formatado</strong> com:</p>
                <ul>
                    <li>Indicação das linhas onde os depósitos foram feitos</li>
                    <li>Identificação clara do depositante</li>
                    <li>Conversão do valor depositado em euros</li>
                    <li>Outras especificações técnicas exigidas</li>
                </ul>
                <p><strong>E isso vale para a maioria dos documentos</strong>, incluindo normas específicas de tradução e legalização.</p>
            </div>
        </div>`,
        
        en: `<div class="analysis-section section-diagnosis">
            <h3 class="section-label">📊 Diagnosis</h3>
            <p><strong>Now you know your distance to obtaining the visa.</strong> The next step is to establish the strategy that the Spanish government approves.</p>
            
            <p>The test showed <strong>which documents</strong> are necessary to meet the requirements. But knowing the documents is not enough, as approval also depends on <strong>how they are presented</strong>.</p>
            
            <div class="example-box">
                <span class="example-label">⚠️ Critical example:</span>
                <p>It's not enough to have bank statements from the last three months. You must present a <strong>formatted report</strong> with:</p>
                <ul>
                    <li>Indication of lines where deposits were made</li>
                    <li>Clear identification of the depositor</li>
                    <li>Conversion of deposited amount to euros</li>
                    <li>Other required technical specifications</li>
                </ul>
                <p><strong>And this applies to most documents</strong>, including specific translation and legalization standards.</p>
            </div>
        </div>`,
        
        es: `<div class="analysis-section section-diagnosis">
            <h3 class="section-label">📊 Diagnóstico</h3>
            <p><strong>Ahora sabes a qué distancia estás de obtener el visado.</strong> El siguiente paso es establecer la estrategia que el gobierno español aprueba.</p>
            
            <p>El test mostró <strong>qué documentos</strong> son necesarios para cumplir los requisitos. Pero conocer los documentos no es suficiente, ya que la aprobación también depende de <strong>cómo se presentan</strong>.</p>
            
            <div class="example-box">
                <span class="example-label">⚠️ Ejemplo crítico:</span>
                <p>No basta con tener los extractos de los últimos tres meses de ingresos. Es necesario presentar un <strong>informe formateado</strong> con:</p>
                <ul>
                    <li>Indicación de las líneas donde se realizaron los depósitos</li>
                    <li>Identificación clara del depositante</li>
                    <li>Conversión del valor depositado a euros</li>
                    <li>Otras especificaciones técnicas exigidas</li>
                </ul>
                <p><strong>Y esto aplica para la mayoría de los documentos</strong>, incluyendo normas específicas de traducción y legalización.</p>
            </div>
        </div>`
    },
    
    // PARÁGRAFO 2: Método Power Oracle™ (AZUL)
    paragraph2: {
        pt: `<div class="analysis-section section-solution">
            <h3 class="section-label section-label-oracle">⚡ A Solução</h3>
            <p>Para garantir o êxito da sua aplicação, desenvolvemos o método <strong class="highlight-oracle">Power Oracle™</strong>.</p>
            
            <p>Ele é um <strong>plano de ação</strong> que transforma o resultado do teste em uma <strong>"aplicação aprovada"</strong> através de 4 módulos essenciais:</p>
            
            <div class="modules-list">
                <div class="module-item">
                    <span class="module-number">01</span>
                    <div class="module-content">
                        <strong>Alpha Mindset</strong> – Usando o visto para sua expansão. Os procedimentos desde o primeiro momento em que você começa a se informar até a obtenção do visto.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">02</span>
                    <div class="module-content">
                        <strong>Legal Anatomy</strong> – Checklist técnico sob medida para o seu perfil, com prazos e a ordem exata a seguir para obter e apresentar todos os documentos exigidos.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">03</span>
                    <div class="module-content">
                        <strong>War Room Docs</strong> – Templates pré-formatados que seguem os padrões, já foram exaustivamente testados e aprovados pelos consulados.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">04</span>
                    <div class="module-content">
                        <strong>Integrated Family</strong> – Roadmap para integração da família, incluindo cônjuge, filhos e pais.
                    </div>
                </div>
            </div>
        </div>`,
        
        en: `<div class="analysis-section section-solution">
            <h3 class="section-label section-label-oracle">⚡ The Solution</h3>
            <p>To ensure the success of your application, we developed the <strong class="highlight-oracle">Power Oracle™</strong> method.</p>
            
            <p>It is an <strong>action plan</strong> that transforms the test result into an <strong>"approved application"</strong> through 4 essential modules:</p>
            
            <div class="modules-list">
                <div class="module-item">
                    <span class="module-number">01</span>
                    <div class="module-content">
                        <strong>Alpha Mindset</strong> – Using the visa for your expansion. The procedures from the first moment you start gathering information until obtaining the visa.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">02</span>
                    <div class="module-content">
                        <strong>Legal Anatomy</strong> – Technical checklist tailored to your profile, with deadlines and exact order to follow for obtaining and presenting all required documents.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">03</span>
                    <div class="module-content">
                        <strong>War Room Docs</strong> – Pre-formatted templates that follow standards, already exhaustively tested and approved by consulates.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">04</span>
                    <div class="module-content">
                        <strong>Integrated Family</strong> – Roadmap for family integration, including spouse, children, and parents.
                    </div>
                </div>
            </div>
        </div>`,
        
        es: `<div class="analysis-section section-solution">
            <h3 class="section-label section-label-oracle">⚡ La Solución</h3>
            <p>Para garantizar el éxito de tu solicitud, desarrollamos el método <strong class="highlight-oracle">Power Oracle™</strong>.</p>
            
            <p>Es un <strong>plan de acción</strong> que transforma el resultado del test en una <strong>"solicitud aprobada"</strong> a través de 4 módulos esenciales:</p>
            
            <div class="modules-list">
                <div class="module-item">
                    <span class="module-number">01</span>
                    <div class="module-content">
                        <strong>Alpha Mindset</strong> – Usando el visado para tu expansión. Los procedimientos desde el primer momento en que comienzas a informarte hasta la obtención del visado.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">02</span>
                    <div class="module-content">
                        <strong>Legal Anatomy</strong> – Checklist técnico a medida para tu perfil, con plazos y el orden exacto a seguir para obtener y presentar todos los documentos exigidos.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">03</span>
                    <div class="module-content">
                        <strong>War Room Docs</strong> – Plantillas pre-formateadas que siguen los estándares, ya exhaustivamente probadas y aprobadas por los consulados.
                    </div>
                </div>
                
                <div class="module-item">
                    <span class="module-number">04</span>
                    <div class="module-content">
                        <strong>Integrated Family</strong> – Hoja de ruta para integración familiar, incluyendo cónyuge, hijos y padres.
                    </div>
                </div>
            </div>
        </div>`
    },
    
    // PARÁGRAFO 4: Oferta Final (AZUL para Power Oracle)
    paragraph4: {
        pt: `<div class="analysis-section section-offer">
            <h3 class="section-label section-label-oracle">💎 Investimento</h3>
            
            <div class="price-highlight">
                <span class="price-label">Power Oracle™</span>
                <div class="promo-pricing">
                    <span class="price-old">€200</span>
                    <span class="price-arrow">→</span>
                    <span class="price-value">€97</span>
                </div>
                <span class="price-note">Oferta por tempo limitado • Acesso vitalício</span>
            </div>
            
            <div class="includes-box">
                <h4>✓ O que está incluído:</h4>
                <ul>
                    <li><strong>Acesso imediato</strong> aos 4 módulos completos (Alpha Mindset, Legal Anatomy, War Room Docs, Integrated Family)</li>
                    <li><strong>Templates e checklists personalizados</strong> para seu perfil específico</li>
                    <li><strong>Suporte técnico</strong> para dúvidas sobre documentação</li>
                    <li><strong>Atualizações vitalícias</strong> conforme mudanças na legislação espanhola</li>
                </ul>
            </div>
            
            <div class="value-proposition">
                <p class="final-statement">Este investimento pode ser <strong>a diferença entre aprovação e rejeição</strong> do seu visto — ou entre 60 dias e 18 meses de espera.</p>
            </div>
        </div>`,
        
        en: `<div class="analysis-section section-offer">
            <h3 class="section-label section-label-oracle">💎 Investment</h3>
            
            <div class="price-highlight">
                <span class="price-label">Power Oracle™</span>
                <div class="promo-pricing">
                    <span class="price-old">€200</span>
                    <span class="price-arrow">→</span>
                    <span class="price-value">€97</span>
                </div>
                <span class="price-note">Limited time offer • Lifetime access</span>
            </div>
            
            <div class="includes-box">
                <h4>✓ What's included:</h4>
                <ul>
                    <li><strong>Immediate access</strong> to all 4 complete modules (Alpha Mindset, Legal Anatomy, War Room Docs, Integrated Family)</li>
                    <li><strong>Templates and checklists customized</strong> to your specific profile</li>
                    <li><strong>Technical support</strong> for documentation questions</li>
                    <li><strong>Lifetime updates</strong> according to changes in Spanish legislation</li>
                </ul>
            </div>
            
            <div class="value-proposition">
                <p class="final-statement">This investment can be <strong>the difference between approval and rejection</strong> of your visa — or between 60 days and 18 months of waiting.</p>
            </div>
        </div>`,
        
        es: `<div class="analysis-section section-offer">
            <h3 class="section-label section-label-oracle">💎 Inversión</h3>
            
            <div class="price-highlight">
                <span class="price-label">Power Oracle™</span>
                <div class="promo-pricing">
                    <span class="price-old">€200</span>
                    <span class="price-arrow">→</span>
                    <span class="price-value">€97</span>
                </div>
                <span class="price-note">Oferta por tiempo limitado • Acceso de por vida</span>
            </div>
            
            <div class="includes-box">
                <h4>✓ Lo que incluye:</h4>
                <ul>
                    <li><strong>Acceso inmediato</strong> a los 4 módulos completos (Alpha Mindset, Legal Anatomy, War Room Docs, Integrated Family)</li>
                    <li><strong>Plantillas y checklists personalizados</strong> para tu perfil específico</li>
                    <li><strong>Soporte técnico</strong> para dudas sobre documentación</li>
                    <li><strong>Actualizaciones de por vida</strong> según cambios en la legislación española</li>
                </ul>
            </div>
            
            <div class="value-proposition">
                <p class="final-statement">Esta inversión puede ser <strong>la diferencia entre aprobación y rechazo</strong> de tu visado — o entre 60 días y 18 meses de espera.</p>
            </div>
        </div>`
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS v12.2 - BLINDADOS
// ═══════════════════════════════════════════════════════════════════════════

const STRENGTHS_PROMPTS = {
    pt: ({ profile, score, strengths }) => {
        const strengthsList = Array.isArray(strengths) && strengths.length > 0
            ? strengths.map(sanitizeForPrompt).join(', ')
            : 'perfil em desenvolvimento';
        
        return `
Você é a Alpha AI, consultora estratégica da ExpandSpain. Escreva em Português do Brasil.

CONTEXTO IMPORTANTE:
Este texto será inserido entre outros parágrafos FIXOS que você NÃO DEVE mencionar, substituir ou referenciar. 
Você está escrevendo APENAS o parágrafo 3, que analisa os pontos fortes do candidato.

DADOS DO CANDIDATO:
- Perfil: ${profile}
- Pontuação: ${score}/100
- Pontos Fortes Identificados: ${strengthsList}

TAREFA: Escreva UM ÚNICO PARÁGRAFO HTML (50-80 palavras) analisando os pontos fortes deste candidato de forma estratégica e persuasiva.

REGRAS ABSOLUTAS:
✓ Extensão: 50-80 palavras
✓ Formato: HTML simples com <strong> para destaques
✓ Tom: estratégico, confiante, motivador
✓ Usar "você" ou "seu/sua"
✓ Começar com: "Seu perfil apresenta..." ou "Seus pontos fortes incluem..."
✓ Conectar pontos fortes com requisitos consulares
✓ NÃO mencionar "Power Oracle™" ou "módulos"
✓ NÃO mencionar "parágrafo anterior" ou "como vimos"
✓ NÃO usar emojis
✓ Ser específico sobre OS PONTOS FORTES fornecidos

ESTRUTURA HTML OBRIGATÓRIA:
<div class="analysis-section section-strengths">
    <h3 class="section-label">✅ Seus Pontos Fortes</h3>
    <p>[SEU TEXTO AQUI com <strong> nos destaques principais]</p>
    <p class="next-step">[Frase de transição para ação - 10-15 palavras]</p>
</div>

EXEMPLO DE OUTPUT ESPERADO:
<div class="analysis-section section-strengths">
    <h3 class="section-label">✅ Seus Pontos Fortes</h3>
    <p>Seu perfil apresenta <strong>renda estável acima do mínimo exigido</strong>, documentação profissional consistente, e <strong>histórico comprovado de trabalho remoto</strong>. Esses elementos formam uma base sólida que, estruturados segundo os padrões técnicos do consulado espanhol, atendem aos critérios decisivos de aprovação.</p>
    <p class="next-step">O próximo passo é transformar esses pontos fortes em uma aplicação vencedora.</p>
</div>

IMPORTANTE: Seja direto e específico. Use os dados fornecidos. Não invente estatísticas.
`.trim();
    },
    
    en: ({ profile, score, strengths }) => {
        const strengthsList = Array.isArray(strengths) && strengths.length > 0
            ? strengths.map(sanitizeForPrompt).join(', ')
            : 'developing profile';
        
        return `
You are Alpha AI, ExpandSpain's strategic consultant. Write in English.

IMPORTANT CONTEXT:
This text will be inserted between other FIXED paragraphs that you MUST NOT mention, replace, or reference.
You are writing ONLY paragraph 3, which analyzes the candidate's strengths.

CANDIDATE DATA:
- Profile: ${profile}
- Score: ${score}/100
- Identified Strengths: ${strengthsList}

TASK: Write ONE SINGLE HTML PARAGRAPH (50-80 words) analyzing this candidate's strengths strategically and persuasively.

ABSOLUTE RULES:
✓ Length: 50-80 words
✓ Format: Simple HTML with <strong> for highlights
✓ Tone: strategic, confident, motivating
✓ Use "you" or "your"
✓ Start with: "Your profile presents..." or "Your strengths include..."
✓ Connect strengths with consular requirements
✓ DO NOT mention "Power Oracle™" or "modules"
✓ DO NOT mention "previous paragraph" or "as we saw"
✓ NO emojis
✓ Be specific about THE PROVIDED STRENGTHS

MANDATORY HTML STRUCTURE:
<div class="analysis-section section-strengths">
    <h3 class="section-label">✅ Your Strengths</h3>
    <p>[YOUR TEXT HERE with <strong> on main highlights]</p>
    <p class="next-step">[Transition sentence to action - 10-15 words]</p>
</div>

EXPECTED OUTPUT EXAMPLE:
<div class="analysis-section section-strengths">
    <h3 class="section-label">✅ Your Strengths</h3>
    <p>Your profile presents <strong>stable income above the minimum required</strong>, consistent professional documentation, and <strong>proven remote work history</strong>. These elements form a solid foundation that, when structured according to Spanish consulate technical standards, meet the decisive approval criteria.</p>
    <p class="next-step">The next step is to transform these strengths into a winning application.</p>
</div>

IMPORTANT: Be direct and specific. Use the provided data. Don't invent statistics.
`.trim();
    },
    
    es: ({ profile, score, strengths }) => {
        const strengthsList = Array.isArray(strengths) && strengths.length > 0
            ? strengths.map(sanitizeForPrompt).join(', ')
            : 'perfil en desarrollo';
        
        return `
Eres Alpha AI, consultora estratégica de ExpandSpain. Escribe en Español.

CONTEXTO IMPORTANTE:
Este texto se insertará entre otros párrafos FIJOS que NO DEBES mencionar, reemplazar o referenciar.
Estás escribiendo SOLO el párrafo 3, que analiza los puntos fuertes del candidato.

DATOS DEL CANDIDATO:
- Perfil: ${profile}
- Puntuación: ${score}/100
- Puntos Fuertes Identificados: ${strengthsList}

TAREA: Escribe UN ÚNICO PÁRRAFO HTML (50-80 palabras) analizando los puntos fuertes de este candidato de forma estratégica y persuasiva.

REGLAS ABSOLUTAS:
✓ Extensión: 50-80 palabras
✓ Formato: HTML simple con <strong> para destacados
✓ Tono: estratégico, confiado, motivador
✓ Usar "tú" o "tu/tus"
✓ Comenzar con: "Tu perfil presenta..." o "Tus puntos fuertes incluyen..."
✓ Conectar puntos fuertes con requisitos consulares
✓ NO mencionar "Power Oracle™" ni "módulos"
✓ NO mencionar "párrafo anterior" o "como vimos"
✓ SIN emojis
✓ Ser específico sobre LOS PUNTOS FUERTES proporcionados

ESTRUCTURA HTML OBLIGATORIA:
<div class="analysis-section section-strengths">
    <h3 class="section-label">✅ Tus Puntos Fuertes</h3>
    <p>[TU TEXTO AQUÍ con <strong> en los destacados principales]</p>
    <p class="next-step">[Frase de transición a la acción - 10-15 palabras]</p>
</div>

EJEMPLO DE OUTPUT ESPERADO:
<div class="analysis-section section-strengths">
    <h3 class="section-label">✅ Tus Puntos Fuertes</h3>
    <p>Tu perfil presenta <strong>renta estable por encima del mínimo exigido</strong>, documentación profesional consistente, y <strong>historial comprobado de trabajo remoto</strong>. Estos elementos forman una base sólida que, estructurados según los estándares técnicos del consulado español, cumplen con los criterios decisivos de aprobación.</p>
    <p class="next-step">El siguiente paso es transformar estos puntos fuertes en una solicitud ganadora.</p>
</div>

IMPORTANTE: Sé directo y específico. Usa los datos proporcionados. No inventes estadísticas.
`.trim();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACKS PARA PARÁGRAFO 3
// ═══════════════════════════════════════════════════════════════════════════

const STRENGTHS_FALLBACKS = {
    pt: (score) => {
        if (score >= 75) {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Seus Pontos Fortes</h3>
                <p>Seu perfil apresenta <strong>documentação profissional consistente</strong>, histórico de trabalho remoto estabelecido, e <strong>renda que atende ou supera os requisitos mínimos</strong>. Esses elementos formam uma base sólida que, estruturados segundo os padrões técnicos do consulado, atendem aos critérios decisivos de aprovação.</p>
                <p class="next-step">O próximo passo é transformar esses pontos fortes em uma aplicação vencedora.</p>
            </div>`;
        } else if (score >= 50) {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Seus Pontos Fortes</h3>
                <p>Seu perfil demonstra <strong>capacidade de trabalho remoto comprovável</strong>, fontes de renda identificáveis, e disposição para seguir os procedimentos legais corretos. Com a estruturação adequada dos documentos segundo padrões consulares, você pode construir um dossiê aprovável.</p>
                <p class="next-step">O próximo passo é fortalecer seu perfil seguindo o roadmap técnico específico.</p>
            </div>`;
        } else {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Seus Pontos Fortes Iniciais</h3>
                <p>Seu perfil demonstra <strong>interesse genuíno na mobilidade europeia</strong> e tempo disponível para preparar a documentação corretamente. Candidatos com scores similares que seguiram o roadmap estruturado conseguiram elevar significativamente suas chances de aprovação.</p>
                <p class="next-step">O próximo passo é fortalecer seu perfil através do plano de ação técnico.</p>
            </div>`;
        }
    },
    
    en: (score) => {
        if (score >= 75) {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Your Strengths</h3>
                <p>Your profile presents <strong>consistent professional documentation</strong>, established remote work history, and <strong>income that meets or exceeds minimum requirements</strong>. These elements form a solid foundation that, when structured according to consulate technical standards, meet the decisive approval criteria.</p>
                <p class="next-step">The next step is to transform these strengths into a winning application.</p>
            </div>`;
        } else if (score >= 50) {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Your Strengths</h3>
                <p>Your profile demonstrates <strong>provable remote work capability</strong>, identifiable income sources, and willingness to follow correct legal procedures. With proper document structuring according to consular standards, you can build an approvable dossier.</p>
                <p class="next-step">The next step is to strengthen your profile following the specific technical roadmap.</p>
            </div>`;
        } else {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Your Initial Strengths</h3>
                <p>Your profile demonstrates <strong>genuine interest in European mobility</strong> and available time to prepare documentation correctly. Candidates with similar scores who followed the structured roadmap significantly elevated their approval chances.</p>
                <p class="next-step">The next step is to strengthen your profile through the technical action plan.</p>
            </div>`;
        }
    },
    
    es: (score) => {
        if (score >= 75) {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Tus Puntos Fuertes</h3>
                <p>Tu perfil presenta <strong>documentación profesional consistente</strong>, historial de trabajo remoto establecido, y <strong>renta que cumple o supera los requisitos mínimos</strong>. Estos elementos forman una base sólida que, estructurados según los estándares técnicos del consulado, cumplen con los criterios decisivos de aprobación.</p>
                <p class="next-step">El siguiente paso es transformar estos puntos fuertes en una solicitud ganadora.</p>
            </div>`;
        } else if (score >= 50) {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Tus Puntos Fuertes</h3>
                <p>Tu perfil demuestra <strong>capacidad de trabajo remoto comprobable</strong>, fuentes de renta identificables, y disposición para seguir los procedimientos legales correctos. Con la estructuración adecuada de los documentos según estándares consulares, puedes construir un dosier aprobable.</p>
                <p class="next-step">El siguiente paso es fortalecer tu perfil siguiendo la hoja de ruta técnica específica.</p>
            </div>`;
        } else {
            return `<div class="analysis-section section-strengths">
                <h3 class="section-label">✅ Tus Puntos Fuertes Iniciales</h3>
                <p>Tu perfil demuestra <strong>interés genuino en la movilidad europea</strong> y tiempo disponible para preparar la documentación correctamente. Candidatos con puntuaciones similares que siguieron la hoja de ruta estructurada elevaron significativamente sus posibilidades de aprobación.</p>
                <p class="next-step">El siguiente paso es fortalecer tu perfil a través del plan de acción técnico.</p>
            </div>`;
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

async function generateAIAnalysis(scoreData, answers, language = 'pt') {
    console.log('═'.repeat(70));
    console.log('🤖 [IA v12.2] generateAIAnalysis() CHAMADA');
    console.log(`   Score: ${scoreData?.score}/100`);
    console.log(`   Profile: ${scoreData?.profile}`);
    console.log(`   Language: ${language}`);
    console.log('═'.repeat(70));
    
    const lang = ['pt', 'en', 'es'].includes(language) ? language : 'pt';
    
    try {
        const cacheKey = generateCacheKey(scoreData, lang);
        console.log(`📦 [Cache] Verificando...`);
        
        const cached = analysisCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            const ageMinutes = Math.floor((Date.now() - cached.timestamp) / 60000);
            console.log(`✅ [Cache] Encontrado (idade: ${ageMinutes} min)`);
            console.log('═'.repeat(70));
            return cached.analysis;
        }
        
        console.log(`❌ [Cache] Não encontrado, gerando nova análise...`);
        
        const title = FIXED_TEXTS.analysisTitle[lang];
        const p1 = FIXED_TEXTS.paragraph1[lang];
        const p2 = FIXED_TEXTS.paragraph2[lang];
        const p4 = FIXED_TEXTS.paragraph4[lang];
        
        let p3;
        
        try {
            const safeProfile = sanitizeForPrompt(scoreData?.profile || 'Candidato');
            const score = Number(scoreData?.score || 0);
            const strengths = scoreData?.strengths || [];
            
            const prompt = STRENGTHS_PROMPTS[lang]({
                profile: safeProfile,
                score,
                strengths
            });
            
            console.log(`\n🔄 [IA] Gerando parágrafo 3 (pontos fortes)...`);
            
            const model = genAI.getGenerativeModel({
                model: MODEL_ID,
                generationConfig: {
                    temperature: 0.65,
                    topK: 40,
                    topP: 0.9,
                    maxOutputTokens: 200,
                }
            });
            
            const startTime = Date.now();
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const elapsed = Date.now() - startTime;
            
            p3 = response.text().trim();
            
            console.log(`✅ [IA] Parágrafo 3 gerado em ${elapsed}ms`);
            
            if (!p3.includes('class="analysis-section section-strengths"')) {
                console.warn(`⚠️  [Validação] Estrutura HTML incorreta, usando fallback`);
                throw new Error('Validação de estrutura falhou');
            }
            
        } catch (err) {
            console.error(`❌ [IA] Erro ao gerar parágrafo 3: ${err.message}`);
            console.log(`📝 [Fallback] Usando texto pré-definido...`);
            
            const score = Number(scoreData?.score || 0);
            p3 = STRENGTHS_FALLBACKS[lang](score);
        }
        
        const fullAnalysisHTML = `${title}\n\n${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
        
        console.log(`\n✅ [Resultado] Análise HTML completa montada`);
        console.log(`   Total de caracteres: ${fullAnalysisHTML.length}`);
        
        analysisCache.set(cacheKey, {
            analysis: fullAnalysisHTML,
            timestamp: Date.now()
        });
        
        console.log(`📦 [Cache] Salvo (total: ${analysisCache.size} entradas)`);
        console.log('═'.repeat(70));
        
        return fullAnalysisHTML;
        
    } catch (err) {
        console.error('═'.repeat(70));
        console.error('❌ [IA] ERRO CRÍTICO - Usando fallback completo');
        console.error(`   Erro: ${err.message}`);
        console.error('═'.repeat(70));
        
        const score = Number(scoreData?.score || 0);
        
        const title = FIXED_TEXTS.analysisTitle[lang];
        const p1 = FIXED_TEXTS.paragraph1[lang];
        const p2 = FIXED_TEXTS.paragraph2[lang];
        const p3 = STRENGTHS_FALLBACKS[lang](score);
        const p4 = FIXED_TEXTS.paragraph4[lang];
        
        return `${title}\n\n${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
    }
}

module.exports = {
    generateAIAnalysis
};
