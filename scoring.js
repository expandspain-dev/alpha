function calculateScore(answers) {
    let score = 100;
    const gaps = [];
    const strengths = [];

    const profileMap = { 0: 'Fundador/Sócio', 1: 'Consultor/Freelancer', 2: 'Empregado/Executivo' };
    const profile = profileMap[answers['q_V1']] || 'Não identificado';
    
    const rules = {
        'q_V2': { 1: { penalty: -1000, gap: "Cidadania europeia" } },
        'q_V3': { 1: { penalty: -1000, gap: "Menor de idade" } },
        'q_V11': { 1: { penalty: -1000, gap: "Empresa sediada na Espanha" } },
        'q_V12': { 1: { penalty: -1000, gap: "Empresa com menos de 1 ano" } },
        'q_V20': { 2: { penalty: -1000, gap: "Antecedentes criminais com anotações" } },
        'q_V4': { 1: { penalty: -25, gap: "Passaporte com validade curta (< 12 meses)" } },
        'q_V6': { 1: { penalty: -30, gap: "Situação irregular na Espanha (se aplicando de lá)" } },
        'q_V7_A': { 1: { penalty: -20, gap: "Contrato social sem cláusula remota" } },
        'q_V7A_2': { 1: { penalty: -15, gap: "Contrato social registrado há menos de 3 meses" } },
        'q_V8_A': { 1: { penalty: -30, gap: "Pró-labore insuficiente (< €2.800)" } },
        'q_V9_A': { 1: { penalty: -25, gap: "Falta de extratos para comprovar pró-labore" }, 2: { penalty: -30, gap: "Extratos com valores insuficientes" } },
        'q_V7_B': { 1: { penalty: -20, gap: "Falta de contratos de serviço formais" } },
        'q_V8_B': { 1: { penalty: -30, gap: "Renda média insuficiente (< €2.800)" } },
        'q_V9_B': { 1: { penalty: -25, gap: "Falta de comprovação de renda (faturas/extratos)" } },
        'q_V7_C': { 1: { penalty: -20, gap: "Contrato de trabalho sem cláusula remota explícita" } },
        'q_V8_C': { 1: { penalty: -30, gap: "Salário insuficiente (< €2.800)" } },
        'q_V9_C': { 1: { penalty: -25, gap: "Falta de holerites para comprovação" } },
        'q_V13': { 1: { penalty: -25, gap: "Empresa não fornece carta de autorização" } },
        'q_V14': { 1: { penalty: -15, gap: "Falta de comprovação de qualificação (diploma ou 3+ anos exp.)" } },
        'q_V15': { 1: { penalty: -10, gap: "CV não reflete experiência remota de 3+ meses" } },
        'q_V16': { 1: { penalty: -25, gap: "Recursos financeiros insuficientes (< €33.600)" } },
        'q_V18': { 1: { penalty: -20, gap: "Recursos financeiros insuficientes para a família" } },
        'q_V19': { 1: { penalty: -15, gap: "Seguro de saúde inadequado" } },
        'q_V20': { 1: { penalty: -10, gap: "Certificado de antecedentes criminais pendente" } },
    };

    for (const qId in answers) {
        if (rules[qId] && rules[qId][answers[qId]]) {
            const rule = rules[qId][answers[qId]];
            score += rule.penalty;
            if (rule.gap) gaps.push(rule.gap);
        }
    }

    const addStrength = (condition, text) => { if (condition) strengths.push(text); };
    addStrength(answers['q_V2'] === 0, "Cidadania elegível");
    addStrength(answers['q_V3'] === 0, "Maioridade confirmada");
    addStrength(answers['q_V4'] === 0, "Passaporte com validade adequada");
    if(profile === 'Fundador/Sócio') addStrength(answers['q_V8_A'] === 0, "Renda compatível");
    if(profile === 'Consultor/Freelancer') addStrength(answers['q_V8_B'] === 0, "Renda compatível");
    if(profile === 'Empregado/Executivo') addStrength(answers['q_V8_C'] === 0, "Renda compatível");
    
    score = Math.max(0, Math.min(100, score));

    let status, statusColor, recommendation;
    if (score < 1) { 
        status = "NÃO ELEGÍVEL"; 
        statusColor = "#cc0000"; 
        recommendation = "Um requisito crítico impede a aplicação no momento."; 
    }
    else if (score < 50) { 
        status = "PREPARAÇÃO NECESSÁRIA"; 
        statusColor = "#ff4444"; 
        recommendation = "Seu perfil precisa de ajustes significativos em pontos críticos."; 
    }
    else if (score < 75) { 
        status = "BOM POTENCIAL"; 
        statusColor = "#ffaa00"; 
        recommendation = "Você está no caminho certo. Resolvendo alguns gaps, suas chances aumentam."; 
    }
    else if (score < 90) { 
        status = "PERFIL FORTE"; 
        statusColor = "#88ff00"; 
        recommendation = "Seu perfil é forte. Com pequenos ajustes, estará pronto para aplicar."; 
    }
    else { 
        status = "PERFIL EXCELENTE"; 
        statusColor = "#00ff88"; 
        recommendation = "Seu perfil é extremamente sólido e alinhado aos requisitos."; 
    }

    return { score: Math.round(score), status, statusColor, recommendation, gaps, strengths, profile };
}

module.exports = { calculateScore };
