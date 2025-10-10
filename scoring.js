/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPANDSPAIN ALPHA™ - SCORING SYSTEM v2.2.1
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de pontuação e análise de gaps
 * FIX CRÍTICO: Detecta formato { "0": { "V1": 0 } }
 * 
 * @version 2.2.1
 * @date 2025-10-10
 * @author ExpandSpain Team
 * @license Proprietary
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// TRADUÇÕES - PERFIS
// ═══════════════════════════════════════════════════════════════════════════

const profileTranslations = {
    pt: {
        0: 'Fundador/Sócio',
        1: 'Consultor/Freelancer',
        2: 'Empregado/Executivo',
        default: 'Não identificado'
    },
    en: {
        0: 'Founder/Partner',
        1: 'Consultant/Freelancer',
        2: 'Employee/Executive',
        default: 'Not identified'
    },
    es: {
        0: 'Fundador/Socio',
        1: 'Consultor/Freelancer',
        2: 'Empleado/Ejecutivo',
        default: 'No identificado'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRADUÇÕES - GAPS
// ═══════════════════════════════════════════════════════════════════════════

const gapTranslations = {
    pt: {
        'eu_citizen': 'Cidadania europeia (requisito eliminatório)',
        'minor': 'Menor de idade (requisito eliminatório)',
        'spain_company': 'Empresa sediada na Espanha (requisito eliminatório)',
        'new_company': 'Empresa com menos de 1 ano (requisito eliminatório)',
        'criminal_record_issues': 'Antecedentes criminais com anotações (requisito eliminatório)',
        'passport_validity': 'Passaporte com validade curta (< 12 meses)',
        'irregular_spain': 'Situação irregular na Espanha',
        'no_remote_clause_partner': 'Contrato social sem cláusula remota',
        'contract_under_3_months': 'Contrato registrado há menos de 3 meses',
        'insufficient_prolabore': 'Pró-labore insuficiente (< €2.800/mês)',
        'no_bank_statements_prolabore': 'Falta extratos para comprovar pró-labore',
        'insufficient_bank_statements': 'Extratos com valores insuficientes',
        'no_formal_contracts': 'Falta de contratos de serviço formais',
        'insufficient_income': 'Renda média insuficiente (< €2.800/mês)',
        'no_income_proof': 'Falta de comprovação de renda (faturas/extratos)',
        'no_remote_clause_employee': 'Contrato de trabalho sem cláusula remota',
        'insufficient_salary': 'Salário insuficiente (< €2.800/mês)',
        'no_payslips': 'Falta de holerites para comprovação',
        'no_authorization_letter': 'Empresa não fornece carta de autorização',
        'no_qualification_proof': 'Falta comprovação de qualificação (diploma ou 3+ anos exp.)',
        'no_remote_experience': 'CV não reflete experiência remota de 3+ meses',
        'insufficient_financial_resources': 'Recursos financeiros insuficientes (< €33.600)',
        'insufficient_family_resources': 'Recursos financeiros insuficientes para família',
        'inadequate_health_insurance': 'Seguro de saúde inadequado',
        'pending_criminal_certificate': 'Certificado de antecedentes criminais pendente'
    },
    en: {
        'eu_citizen': 'European citizenship (knock-out requirement)',
        'minor': 'Under 18 years old (knock-out requirement)',
        'spain_company': 'Company based in Spain (knock-out requirement)',
        'new_company': 'Company less than 1 year old (knock-out requirement)',
        'criminal_record_issues': 'Criminal record with issues (knock-out requirement)',
        'passport_validity': 'Passport with short validity (< 12 months)',
        'irregular_spain': 'Irregular status in Spain',
        'no_remote_clause_partner': 'Partnership agreement without remote clause',
        'contract_under_3_months': 'Contract registered less than 3 months ago',
        'insufficient_prolabore': 'Insufficient pro-labore (< €2,800/month)',
        'no_bank_statements_prolabore': 'Missing bank statements to prove pro-labore',
        'insufficient_bank_statements': 'Bank statements with insufficient amounts',
        'no_formal_contracts': 'Missing formal service contracts',
        'insufficient_income': 'Insufficient average income (< €2,800/month)',
        'no_income_proof': 'Missing income proof (invoices/statements)',
        'no_remote_clause_employee': 'Employment contract without remote clause',
        'insufficient_salary': 'Insufficient salary (< €2,800/month)',
        'no_payslips': 'Missing pay stubs for verification',
        'no_authorization_letter': 'Company does not provide authorization letter',
        'no_qualification_proof': 'Missing qualification proof (degree or 3+ years exp.)',
        'no_remote_experience': 'CV does not reflect 3+ months remote experience',
        'insufficient_financial_resources': 'Insufficient financial resources (< €33,600)',
        'insufficient_family_resources': 'Insufficient financial resources for family',
        'inadequate_health_insurance': 'Inadequate health insurance',
        'pending_criminal_certificate': 'Pending criminal record certificate'
    },
    es: {
        'eu_citizen': 'Ciudadanía europea (requisito eliminatorio)',
        'minor': 'Menor de edad (requisito eliminatorio)',
        'spain_company': 'Empresa ubicada en España (requisito eliminatorio)',
        'new_company': 'Empresa con menos de 1 año (requisito eliminatorio)',
        'criminal_record_issues': 'Antecedentes penales con anotaciones (requisito eliminatorio)',
        'passport_validity': 'Pasaporte con validez corta (< 12 meses)',
        'irregular_spain': 'Situación irregular en España',
        'no_remote_clause_partner': 'Contrato social sin cláusula remota',
        'contract_under_3_months': 'Contrato registrado hace menos de 3 meses',
        'insufficient_prolabore': 'Pro-labore insuficiente (< €2.800/mes)',
        'no_bank_statements_prolabore': 'Faltan extractos para comprobar pro-labore',
        'insufficient_bank_statements': 'Extractos con valores insuficientes',
        'no_formal_contracts': 'Falta de contratos de servicio formales',
        'insufficient_income': 'Renta promedio insuficiente (< €2.800/mes)',
        'no_income_proof': 'Falta de comprobación de renta (facturas/extractos)',
        'no_remote_clause_employee': 'Contrato de trabajo sin cláusula remota',
        'insufficient_salary': 'Salario insuficiente (< €2.800/mes)',
        'no_payslips': 'Falta de recibos de sueldo para comprobación',
        'no_authorization_letter': 'Empresa no proporciona carta de autorización',
        'no_qualification_proof': 'Falta comprobación de calificación (diploma o 3+ años exp.)',
        'no_remote_experience': 'CV no refleja experiencia remota de 3+ meses',
        'insufficient_financial_resources': 'Recursos financieros insuficientes (< €33.600)',
        'insufficient_family_resources': 'Recursos financieros insuficientes para familia',
        'inadequate_health_insurance': 'Seguro de salud inadecuado',
        'pending_criminal_certificate': 'Certificado de antecedentes penales pendiente'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRADUÇÕES - STRENGTHS
// ═══════════════════════════════════════════════════════════════════════════

const strengthTranslations = {
    pt: {
        'eligible_citizenship': 'Cidadania elegível',
        'adult': 'Maioridade confirmada',
        'valid_passport': 'Passaporte com validade adequada',
        'compatible_income_partner': 'Renda compatível com requisitos',
        'compatible_income_freelancer': 'Renda compatível com requisitos',
        'compatible_income_employee': 'Renda compatível com requisitos',
        'company_outside_spain': 'Empresa sediada fora da Espanha',
        'mature_company': 'Empresa ativa há mais de 1 ano',
        'qualification_proven': 'Qualificação profissional comprovada',
        'adequate_resources': 'Recursos financeiros adequados',
        'clean_record': 'Antecedentes criminais limpos'
    },
    en: {
        'eligible_citizenship': 'Eligible citizenship',
        'adult': 'Legal age confirmed',
        'valid_passport': 'Passport with adequate validity',
        'compatible_income_partner': 'Income compatible with requirements',
        'compatible_income_freelancer': 'Income compatible with requirements',
        'compatible_income_employee': 'Income compatible with requirements',
        'company_outside_spain': 'Company based outside Spain',
        'mature_company': 'Company active for more than 1 year',
        'qualification_proven': 'Professional qualification proven',
        'adequate_resources': 'Adequate financial resources',
        'clean_record': 'Clean criminal record'
    },
    es: {
        'eligible_citizenship': 'Ciudadanía elegible',
        'adult': 'Mayoría de edad confirmada',
        'valid_passport': 'Pasaporte con validez adecuada',
        'compatible_income_partner': 'Renta compatible con requisitos',
        'compatible_income_freelancer': 'Renta compatible con requisitos',
        'compatible_income_employee': 'Renta compatible con requisitos',
        'company_outside_spain': 'Empresa ubicada fuera de España',
        'mature_company': 'Empresa activa hace más de 1 año',
        'qualification_proven': 'Calificación profesional comprobada',
        'adequate_resources': 'Recursos financieros adecuados',
        'clean_record': 'Antecedentes penales limpios'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRADUÇÕES - STATUS
// ═══════════════════════════════════════════════════════════════════════════

const statusTranslations = {
    pt: {
        'not_eligible': 'NÃO ELEGÍVEL',
        'needs_preparation': 'PREPARAÇÃO NECESSÁRIA',
        'good_potential': 'BOM POTENCIAL',
        'strong_profile': 'PERFIL FORTE',
        'excellent_profile': 'PERFIL EXCELENTE'
    },
    en: {
        'not_eligible': 'NOT ELIGIBLE',
        'needs_preparation': 'NEEDS PREPARATION',
        'good_potential': 'GOOD POTENTIAL',
        'strong_profile': 'STRONG PROFILE',
        'excellent_profile': 'EXCELLENT PROFILE'
    },
    es: {
        'not_eligible': 'NO ELEGIBLE',
        'needs_preparation': 'PREPARACIÓN NECESARIA',
        'good_potential': 'BUEN POTENCIAL',
        'strong_profile': 'PERFIL FUERTE',
        'excellent_profile': 'PERFIL EXCELENTE'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// REGRAS DE PENALIDADES
// ═══════════════════════════════════════════════════════════════════════════

const PENALTY_RULES = {
    'q_V2': { 1: { penalty: -1000, gapKey: 'eu_citizen' } },
    'q_V3': { 1: { penalty: -1000, gapKey: 'minor' } },
    'q_V11': { 1: { penalty: -1000, gapKey: 'spain_company' } },
    'q_V12': { 1: { penalty: -1000, gapKey: 'new_company' } },
    'q_V20': { 2: { penalty: -1000, gapKey: 'criminal_record_issues' } },
    'q_V4': { 1: { penalty: -25, gapKey: 'passport_validity' } },
    'q_V6': { 1: { penalty: -30, gapKey: 'irregular_spain' } },
    'q_V7_A': { 1: { penalty: -20, gapKey: 'no_remote_clause_partner' } },
    'q_V7A_2': { 1: { penalty: -15, gapKey: 'contract_under_3_months' } },
    'q_V8_A': { 1: { penalty: -30, gapKey: 'insufficient_prolabore' } },
    'q_V9_A': { 
        1: { penalty: -25, gapKey: 'no_bank_statements_prolabore' }, 
        2: { penalty: -30, gapKey: 'insufficient_bank_statements' } 
    },
    'q_V7_B': { 1: { penalty: -20, gapKey: 'no_formal_contracts' } },
    'q_V8_B': { 1: { penalty: -30, gapKey: 'insufficient_income' } },
    'q_V9_B': { 1: { penalty: -25, gapKey: 'no_income_proof' } },
    'q_V7_C': { 1: { penalty: -20, gapKey: 'no_remote_clause_employee' } },
    'q_V8_C': { 1: { penalty: -30, gapKey: 'insufficient_salary' } },
    'q_V9_C': { 1: { penalty: -25, gapKey: 'no_payslips' } },
    'q_V13': { 1: { penalty: -25, gapKey: 'no_authorization_letter' } },
    'q_V14': { 1: { penalty: -15, gapKey: 'no_qualification_proof' } },
    'q_V15': { 1: { penalty: -10, gapKey: 'no_remote_experience' } },
    'q_V16': { 1: { penalty: -25, gapKey: 'insufficient_financial_resources' } },
    'q_V18': { 1: { penalty: -20, gapKey: 'insufficient_family_resources' } },
    'q_V19': { 1: { penalty: -15, gapKey: 'inadequate_health_insurance' } }
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: NORMALIZAR ESTRUTURA DE ANSWERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normaliza diferentes formatos de answers para o formato esperado
 * 
 * Entrada aceita:
 * 1. { "q_V1": 0, "q_V2": 1 } (direto)
 * 2. { "0": { "V1": 0 }, "1": { "V2": 1 } } (formato real do sistema)
 * 3. { "0": { questionId: "q_V1", optionIndex: 0 } } (com objeto)
 * 4. { "0": { questionId: "q_V1", responseData: { optionIndex: 0 } } } (aninhado)
 * 
 * Saída padronizada:
 * { "q_V1": 0, "q_V2": 1 }
 */
function normalizeAnswers(rawAnswers) {
    console.log('🔧 [Scoring] Normalizando answers...');
    console.log('   Tipo:', typeof rawAnswers);
    console.log('   Keys:', Object.keys(rawAnswers || {}).length);
    
    if (!rawAnswers || typeof rawAnswers !== 'object') {
        console.error('❌ [Scoring] rawAnswers inválido:', rawAnswers);
        return {};
    }
    
    const normalized = {};
    
    for (const key in rawAnswers) {
        const value = rawAnswers[key];
        
        // Caso 1: Valor já é número direto (formato esperado)
        // { "q_V1": 0 }
        if (typeof value === 'number' && key.startsWith('q_')) {
            normalized[key] = value;
            continue;
        }
        
        // Caso 2: Valor é objeto com propriedades tipo V1, V2, V3...
        // { "0": { "V1": 0 }, "1": { "V2": 1 } } ← FORMATO REAL DO SISTEMA
        if (value && typeof value === 'object') {
            // Procurar por propriedades que começam com V
            for (const prop in value) {
                if (prop.match(/^V\d+/) || prop.match(/^V\d+[A-Z_]*$/)) {
                    const questionId = `q_${prop}`;
                    const optionValue = value[prop];
                    
                    if (typeof optionValue === 'number') {
                        normalized[questionId] = optionValue;
                        console.log(`   ✅ Convertido: "${key}" → "${questionId}" = ${optionValue}`);
                        continue;
                    }
                }
            }
            
            // Caso 3: Valor é objeto com questionId e optionIndex
            // { "0": { questionId: "q_V1", optionIndex: 0 } }
            if (value.questionId && value.optionIndex !== undefined) {
                normalized[value.questionId] = value.optionIndex;
                console.log(`   ✅ Formato questionId/optionIndex: ${value.questionId} = ${value.optionIndex}`);
                continue;
            }
            
            // Caso 4: Valor aninhado com responseData
            // { "0": { questionId: "q_V1", responseData: { optionIndex: 0 } } }
            if (value.questionId && value.responseData && value.responseData.optionIndex !== undefined) {
                normalized[value.questionId] = value.responseData.optionIndex;
                console.log(`   ✅ Formato aninhado: ${value.questionId} = ${value.responseData.optionIndex}`);
                continue;
            }
            
            // Caso 5: Objeto com optionIndex direto mas sem questionId
            // { "q_V1": { optionIndex: 0 } }
            if (value.optionIndex !== undefined && key.startsWith('q_')) {
                normalized[key] = value.optionIndex;
                console.log(`   ✅ Formato optionIndex direto: ${key} = ${value.optionIndex}`);
                continue;
            }
        }
    }
    
    console.log(`✅ [Scoring] Normalizado: ${Object.keys(normalized).length} respostas`);
    if (Object.keys(normalized).length > 0) {
        console.log('   Sample:', JSON.stringify(Object.entries(normalized).slice(0, 3)));
    }
    
    return normalized;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: CALCULAR SCORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula score e analisa gaps/strengths
 * @param {object} rawAnswers - Respostas brutas (qualquer formato)
 * @param {string} language - Idioma (pt, en, es)
 * @returns {object} - {score, status, statusColor, gaps, strengths, profile}
 */
function calculateScore(rawAnswers, language = 'pt') {
    console.log('═'.repeat(70));
    console.log('🎯 [Scoring v2.2.1] calculateScore() INICIADO');
    console.log(`   Language: ${language}`);
    console.log('═'.repeat(70));
    
    // Normalizar estrutura de dados
    const answers = normalizeAnswers(rawAnswers);
    
    if (Object.keys(answers).length === 0) {
        console.error('❌ [Scoring] Nenhuma resposta normalizada!');
        return {
            score: 0,
            status: 'NÃO ELEGÍVEL',
            statusColor: '#cc0000',
            gaps: ['Erro ao processar respostas'],
            strengths: [],
            profile: 'Não identificado'
        };
    }
    
    let score = 100;
    const gapKeys = [];
    const strengthKeys = [];

    // Determinar perfil
    const profileMap = profileTranslations[language] || profileTranslations['pt'];
    const profileValue = answers['q_V1'];
    const profile = profileMap[profileValue] || profileMap['default'];
    
    console.log(`\n👤 [Perfil] ${profile} (q_V1 = ${profileValue})`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // APLICAR REGRAS DE PENALIDADE
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log(`\n⚖️  [Penalties] Avaliando ${Object.keys(PENALTY_RULES).length} regras...`);
    let penaltiesApplied = 0;
    
    for (const qId in PENALTY_RULES) {
        const answerValue = answers[qId];
        
        if (answerValue === undefined) {
            continue; // Pergunta não respondida
        }
        
        const ruleForAnswer = PENALTY_RULES[qId][answerValue];
        
        if (ruleForAnswer) {
            score += ruleForAnswer.penalty;
            penaltiesApplied++;
            
            if (ruleForAnswer.gapKey) {
                gapKeys.push(ruleForAnswer.gapKey);
            }
            
            console.log(`   ⚠️  ${qId} = ${answerValue} → ${ruleForAnswer.penalty} pontos (Gap: ${ruleForAnswer.gapKey || 'N/A'})`);
        }
    }
    
    console.log(`\n📊 [Result] ${penaltiesApplied} penalidade(s) aplicada(s)`);
    console.log(`   Score após penalidades: ${score}`);

    // ═══════════════════════════════════════════════════════════════════════
    // COLETAR STRENGTHS (PONTOS FORTES)
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log(`\n💪 [Strengths] Avaliando pontos fortes...`);
    
    const addStrength = (condition, key) => { 
        if (condition) {
            strengthKeys.push(key);
            console.log(`   ✅ ${key}`);
        }
    };
    
    addStrength(answers['q_V2'] === 0, 'eligible_citizenship');
    addStrength(answers['q_V3'] === 0, 'adult');
    addStrength(answers['q_V4'] === 0, 'valid_passport');
    addStrength(answers['q_V11'] === 0, 'company_outside_spain');
    addStrength(answers['q_V12'] === 0, 'mature_company');
    addStrength(answers['q_V14'] === 0, 'qualification_proven');
    addStrength(answers['q_V16'] === 0, 'adequate_resources');
    addStrength(answers['q_V20'] === 0, 'clean_record');
    
    // Strengths específicos por perfil
    if (profile.includes('Fundador') || profile.includes('Founder') || profile.includes('Socio')) {
        addStrength(answers['q_V8_A'] === 0, 'compatible_income_partner');
    }
    if (profile.includes('Consultor') || profile.includes('Consultant') || profile.includes('Freelancer')) {
        addStrength(answers['q_V8_B'] === 0, 'compatible_income_freelancer');
    }
    if (profile.includes('Empregado') || profile.includes('Employee') || profile.includes('Ejecutivo') || profile.includes('Executive')) {
        addStrength(answers['q_V8_C'] === 0, 'compatible_income_employee');
    }
    
    console.log(`   Total: ${strengthKeys.length} ponto(s) forte(s)`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // LIMITAR SCORE E DETERMINAR STATUS
    // ═══════════════════════════════════════════════════════════════════════
    
    score = Math.max(0, Math.min(100, score));
    
    let statusKey, statusColor;
    if (score < 1) { 
        statusKey = 'not_eligible';
        statusColor = '#cc0000';
    }
    else if (score < 50) { 
        statusKey = 'needs_preparation';
        statusColor = '#ff4444';
    }
    else if (score < 75) { 
        statusKey = 'good_potential';
        statusColor = '#ffaa00';
    }
    else if (score < 90) { 
        statusKey = 'strong_profile';
        statusColor = '#88ff00';
    }
    else { 
        statusKey = 'excellent_profile';
        statusColor = '#00ff88';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRADUZIR GAPS, STRENGTHS E STATUS
    // ═══════════════════════════════════════════════════════════════════════
    
    const gapTranslationMap = gapTranslations[language] || gapTranslations['pt'];
    const strengthTranslationMap = strengthTranslations[language] || strengthTranslations['pt'];
    const statusTranslationMap = statusTranslations[language] || statusTranslations['pt'];

    const gaps = gapKeys.map(key => gapTranslationMap[key] || key);
    const strengths = strengthKeys.map(key => strengthTranslationMap[key] || key);
    const status = statusTranslationMap[statusKey] || statusKey;

    const result = { 
        score: Math.round(score), 
        status, 
        statusColor, 
        gaps, 
        strengths, 
        profile 
    };
    
    console.log('\n═'.repeat(70));
    console.log('✅ [Scoring] RESULTADO FINAL:');
    console.log(`   Score: ${result.score}/100`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Profile: ${result.profile}`);
    console.log(`   Gaps: ${result.gaps.length}`);
    console.log(`   Strengths: ${result.strengths.length}`);
    console.log('═'.repeat(70));

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = { 
    calculateScore 
};
