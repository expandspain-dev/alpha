/**
 * EXPANDSPAIN ALPHA™ - AI SERVICE
 * Integração com Google Gemini API
 * 
 * OBJETIVO: Gerar análise personalizada que SEMPRE vende Power Oracle™
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Mapa de idiomas
const langMap = {
    pt: 'Português do Brasil',
    en: 'English',
    es: 'Español'
};

/**
 * Gera análise com IA que vende Power Oracle™
 * @param {object} scoreData - Dados do score (score, status, gaps, strengths, profile)
 * @param {object} answers - Respostas do usuário
 * @param {string} language - Idioma (pt, en, es)
 * @returns {string} - Análise em texto
 */
async function generateAIAnalysis(scoreData, answers, language = 'pt') {
    try {
        console.log('🤖 Gerando análise com IA Gemini...');
        console.log(`   Score: ${scoreData.score}/100`);
        console.log(`   Status: ${scoreData.status}`);
        console.log(`   Gaps: ${scoreData.gaps?.length || 0}`);
        console.log(`   Idioma: ${language}`);

        // Prompt DEFINITIVO - VERSÃO ÚNICA DA VERDADE
        const prompt = `PERSONA:
Você é o Alpha AI, consultor estratégico da ExpandSpain. Seu tom é direto, honesto, baseado em dados e focado em RESULTADOS. Você não vende ilusões — você vende ESTRATÉGIA através de um produto específico.

CONTEXTO DO NEGÓCIO:
- Produto GRATUITO atual: Alpha™ Self-Assessment - O candidato acabou de completar
- Produto a VENDER: Power Oracle™ (€97) - SEU ÚNICO OBJETIVO DE VENDA
- Menção secundária: Code +34™ (apenas se score 75+, e sempre APÓS vender Oracle™)

DADOS DO CANDIDATO:
- Perfil: ${scoreData.profile || 'Não identificado'}
- Score Alpha™: ${scoreData.score}/100
- Status: ${scoreData.status}
- Pontos Fortes: ${scoreData.strengths?.join(', ') || 'Nenhum identificado'}
- Gaps Críticos: ${scoreData.gaps?.join(', ') || 'Nenhum identificado'}

SUA TAREFA - ESTRUTURA OBRIGATÓRIA (3 PARÁGRAFOS + CTA):

═══════════════════════════════════════════════════════════════════

PARÁGRAFO 1 - DIAGNÓSTICO TÉCNICO HONESTO (3-4 linhas)
Objetivo: Validar o candidato com análise técnica precisa

Instruções:
- Comece reconhecendo o perfil: "Seu perfil de [Perfil] com score de [X]/100 indica [Status]."
- Liste os 2-3 gaps mais críticos de forma específica (use os nomes exatos dos gaps)
- Seja TRANSPARENTE sobre as chances reais de aprovação
- Use dados estatísticos reais: "Com esses gaps, a taxa de rejeição histórica é de X%"
- NÃO mencione produtos ainda - apenas análise técnica pura

Exemplo de estrutura:
"Seu perfil de Fundador/Sócio com score de 76/100 indica um perfil forte em aspectos fundamentais. Os principais gaps identificados são: seguro saúde inadequado, contrato sem cláusula remota e recursos financeiros insuficientes. Com esses gaps não resolvidos, a taxa de rejeição histórica é de 68%."

═══════════════════════════════════════════════════════════════════

PARÁGRAFO 2 - O PROBLEMA QUE NINGUÉM CONTA (3-4 linhas)
Objetivo: Criar urgência através da verdade brutal

Instruções:
- Explique que **informação ≠ estratégia**
- Use uma abordagem específica baseada na faixa de score:

  SE score 0-39:
  "99% dos candidatos nessa faixa aplicam sem preparação estratégica e perdem €2.000+ em taxas de aplicação, documentos apostilados e tempo desperdiçado. O problema não é falta de vontade — é falta de roadmap estruturado."

  SE score 40-59:
  "87% dos candidatos com esses gaps são rejeitados mesmo tendo 'informação'. O problema não é saber os requisitos — é cumpri-los na ordem certa, com a documentação precisa e dentro dos timings críticos que as autoridades espanholas exigem."

  SE score 60-74:
  "Candidatos nessa faixa frequentemente confiam no 'quase certo' e perdem aprovação por detalhes técnicos evitáveis. Um checklist genérico do Google não captura as nuances específicas do seu perfil de [Perfil]."

  SE score 75-89:
  "73% dos perfis fortes são rejeitados por falhas documentais que um manual genérico não identifica. A diferença entre aprovação e rejeição não é grande — mas é cirúrgica."

  SE score 90-100:
  "Mesmo perfis excelentes enfrentam rejeições por documentação mal estruturada ou interpretação incorreta de requisitos técnicos. A decisão das autoridades espanholas é binária: perfeito OU rejeitado."

- SEMPRE conecte o problema ao perfil específico do candidato

═══════════════════════════════════════════════════════════════════

PARÁGRAFO 3 - SOLUÇÃO: POWER ORACLE™ (5-6 linhas)
Objetivo: Vender o Power Oracle™ de forma irresistível

Instruções OBRIGATÓRIAS:
1. Apresente o Power Oracle™ como a solução estratégica específica para o score dele
2. Mencione os 4 módulos de forma objetiva e com valor claro:
   • "Alpha Mindset: Use o visto como base de expansão europeia, não apenas mudança de país"
   • "Legal Anatomy: Checklist completo dos requisitos adaptado ao seu perfil de [Perfil]"
   • "War Room Docs: Templates prontos para submissão que evitam erros de formatação críticos"
   • "Integrated Family: Planejamento completo para cônjuge, filhos e pais (se aplicável ao seu caso)"

3. Adapte a proposta de valor específica ao score:
   
   SE score 0-39:
   "O Power Oracle™ cria seu roadmap personalizado de preparação para você aplicar com segurança quando seu perfil estiver pronto. Você evita desperdiçar dinheiro aplicando prematuramente."

   SE score 40-59:
   "O Power Oracle™ corrige seus gaps específicos e te coloca na faixa de aprovação. Cada gap tem um passo claro, documentos necessários e timeline realista."

   SE score 60-74:
   "O Power Oracle™ otimiza cada detalhe técnico do seu perfil e te posiciona na zona de aprovação com margem de segurança. Você transforma 'bom' em 'excelente'."

   SE score 75-89:
   "O Power Oracle™ elimina qualquer risco de rejeição por detalhes técnicos e estrutura sua aplicação com precisão profissional. Você não deixa nada ao acaso."

   SE score 90-100:
   "O Power Oracle™ estrutura sua documentação com a precisão cirúrgica que as autoridades espanholas exigem, garantindo decisão favorável em até 60 dias."

4. Mencione as garantias de forma clara:
   "Por €97 (com garantia incondicional de 30 dias + 100% do valor creditado no Code +34™ caso você contrate o serviço completo), você transforma seu diagnóstico em AÇÃO."

5. SE E SOMENTE SE o score for 75 ou maior, adicione UMA linha de menção suave ao Code +34™:
   "Se preferir serviço completo done-for-you, o Code +34™ inclui todo o Power Oracle™ mais a execução completa com 99.7% de taxa de sucesso."

   ⚠️ IMPORTANTE: NUNCA desvie o foco do Power Oracle™. Code +34™ é apenas menção contextual.

═══════════════════════════════════════════════════════════════════

CALL-TO-ACTION FINAL (1 linha obrigatória)
"Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos."

═══════════════════════════════════════════════════════════════════

REGRAS ABSOLUTAS (NÃO NEGOCIÁVEIS):

1. Escreva em ${langMap[language]}
2. Máximo absoluto: 280 palavras no total
3. Tom direto e baseado em dados - USE números reais comprovados
4. Use "você" (não "o candidato" ou "os usuários")
5. ZERO emojis
6. Sem promessas de aprovação garantida (apenas estatísticas e dados)
7. Foque em ESTRATÉGIA > burocracia
8. O Power Oracle™ DEVE ser mencionado explicitamente no parágrafo 3
9. Code +34™ só pode ser mencionado se score >= 75 E APENAS após vender Oracle™
10. Adapte o tom ao score (mais urgente para baixos, mais confiante para altos)
11. NUNCA invente gaps que não foram identificados
12. SEMPRE use os nomes exatos dos gaps da lista fornecida

FORMATO DE SAÍDA OBRIGATÓRIO:

[Parágrafo 1: Diagnóstico técnico honesto com dados]

[Parágrafo 2: O problema real com estatística específica ao score]

[Parágrafo 3: Solução Power Oracle™ com 4 módulos + garantias + menção Code +34™ SE score >= 75]

[CTA: Call-to-action direto para Power Oracle™]

AGORA GERE A ANÁLISE PARA ESTE CANDIDATO SEGUINDO TODAS AS REGRAS ACIMA.`;

        // Configurar modelo
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-pro',
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        });

        // Gerar análise
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysis = response.text();

        console.log('✅ Análise gerada com sucesso');
        console.log(`   Tamanho: ${analysis.length} caracteres`);

        return analysis;

    } catch (error) {
        console.error('❌ Erro ao gerar análise com IA:', error.message);
        
        // Fallback: Análise genérica se IA falhar
        console.warn('⚠️  Usando análise fallback');
        return generateFallbackAnalysis(scoreData, language);
    }
}

/**
 * Gera análise fallback se IA falhar
 * @param {object} scoreData
 * @param {string} language
 */
function generateFallbackAnalysis(scoreData, language) {
    const fallbacks = {
        pt: `Seu perfil de ${scoreData.profile} com score de ${scoreData.score}/100 indica ${scoreData.status.toLowerCase()}. ${scoreData.gaps?.length > 0 ? `Os principais gaps identificados precisam de atenção: ${scoreData.gaps.slice(0, 3).join(', ')}.` : 'Seu perfil está no caminho certo.'}

A maioria dos candidatos falha porque informação não é estratégia. Saber os requisitos é diferente de cumpri-los na ordem certa com documentação precisa.

O Power Oracle™ fornece: Alpha Mindset (use o visto estrategicamente), Legal Anatomy (checklist completo), War Room Docs (templates prontos) e Integrated Family (planejamento familiar). Por €97 com garantia de 30 dias + crédito total no Code +34™, você transforma seu diagnóstico em ação.

Acesse o Power Oracle™ agora e receba seu roadmap personalizado em minutos.`,
        
        en: `Your ${scoreData.profile} profile with a score of ${scoreData.score}/100 indicates ${scoreData.status.toLowerCase()}. ${scoreData.gaps?.length > 0 ? `The main gaps identified need attention: ${scoreData.gaps.slice(0, 3).join(', ')}.` : 'Your profile is on the right track.'}

Most candidates fail because information is not strategy. Knowing the requirements is different from fulfilling them in the right order with precise documentation.

Power Oracle™ provides: Alpha Mindset (use visa strategically), Legal Anatomy (complete checklist), War Room Docs (ready templates), and Integrated Family (family planning). For €97 with 30-day guarantee + full credit to Code +34™, you transform your diagnosis into action.

Access Power Oracle™ now and receive your personalized roadmap in minutes.`,
        
        es: `Tu perfil de ${scoreData.profile} con puntaje de ${scoreData.score}/100 indica ${scoreData.status.toLowerCase()}. ${scoreData.gaps?.length > 0 ? `Los principales gaps identificados necesitan atención: ${scoreData.gaps.slice(0, 3).join(', ')}.` : 'Tu perfil va por buen camino.'}

La mayoría de candidatos fracasa porque información no es estrategia. Conocer los requisitos es diferente de cumplirlos en el orden correcto con documentación precisa.

Power Oracle™ proporciona: Alpha Mindset (usa visa estratégicamente), Legal Anatomy (checklist completo), War Room Docs (templates listos) e Integrated Family (planificación familiar). Por €97 con garantía de 30 días + crédito total en Code +34™, transformas tu diagnóstico en acción.

Accede a Power Oracle™ ahora y recibe tu roadmap personalizado en minutos.`
    };

    return fallbacks[language] || fallbacks['pt'];
}

module.exports = {
    generateAIAnalysis
};

