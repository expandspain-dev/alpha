/**
 * EXPANDSPAIN ALPHA™ - CONVERSATION FLOW
 * Sistema de perguntas com fluxo condicional
 * Versão compatível com server.js otimizado v2.1
 */

const questions = {
    q_V1: {
        pt: "Para realizar o teste, escolha o seu Perfil:",
        en: "To take the test, choose your Profile:",
        es: "Para realizar la prueba, elija su Perfil:",
        options: {
            pt: ["Fundador/Sócio de empresa", "Consultor/Prestador de Serviços/Freelancer", "Empregado Registrado/Executivo"],
            en: ["Founder/Business Partner", "Consultant/Service Provider/Freelancer", "Registered Employee/Executive"],
            es: ["Fundador/Socio de empresa", "Consultor/Prestador de Servicios/Freelancer", "Empleado Registrado/Ejecutivo"]
        }
    },
    q_V2: {
        pt: "Sua cidadania NÃO é da União Europeia/EEE/Suíça, correto?",
        en: "Your citizenship is NOT from EU/EEA/Switzerland, correct?",
        es: "Su ciudadanía NO es de la UE/EEE/Suiza, ¿correcto?",
        options: {
            pt: ["CORRETO - Não possuo essas cidadanias", "Possuo cidadania EU/EEE/Suíça"],
            en: ["CORRECT - I don't have these citizenships", "I have EU/EEA/Swiss citizenship"],
            es: ["CORRECTO - No poseo esas ciudadanías", "Poseo ciudadanía UE/EEE/Suiza"]
        }
    },
    q_V3: {
        pt: "Tem 18 anos ou mais?",
        en: "Are you 18 years old or older?",
        es: "¿Tiene 18 años o más?",
        options: {
            pt: ["SIM - 18 anos ou mais", "NÃO - Menor de 18"],
            en: ["YES - 18 or older", "NO - Under 18"],
            es: ["SÍ - 18 años o más", "NO - Menor de 18"]
        }
    },
    q_V4: {
        pt: "Passaporte válido por mais de 6 meses?",
        en: "Passport valid for more than 6 months?",
        es: "¿Pasaporte válido por más de 6 meses?",
        options: {
            pt: ["SIM - Válido por 6+ meses", "NÃO - Vencido ou próximo"],
            en: ["YES - Valid for 6+ months", "NO - Expired or close"],
            es: ["SÍ - Válido por 6+ meses", "NO - Vencido o próximo"]
        }
    },
    q_V5: {
        pt: "Onde pretende solicitar o visto?",
        en: "Where do you intend to apply?",
        es: "¿Dónde pretende solicitar?",
        options: {
            pt: ["Na Espanha (decisão rápida, 3 anos)", "No Consulado (mais lento, 1 ano)"],
            en: ["In Spain (fast decision, 3 years)", "At Consulate (slower, 1 year)"],
            es: ["En España (decisión rápida, 3 años)", "En el Consulado (más lento, 1 año)"]
        }
    },
    q_V6: {
        pt: "Se já está na Espanha, sua situação é regular?",
        en: "If in Spain, is your status regular?",
        es: "Si está en España, ¿su situación es regular?",
        options: {
            pt: ["SIM - Regular na Espanha", "Irregular na Espanha", "NÃO ESTOU NA ESPANHA"],
            en: ["YES - Regular in Spain", "Irregular in Spain", "NOT IN SPAIN"],
            es: ["SÍ - Regular en España", "Irregular en España", "NO ESTOY EN ESPAÑA"]
        }
    },
    q_V7_A: {
        pt: "Contrato societário permite atuação 100% remota?",
        en: "Partnership agreement allows 100% remote work?",
        es: "¿Contrato societario permite actuación 100% remota?",
        options: {
            pt: ["SIM - Contrato com cláusula remota", "NÃO - Sem essa cláusula"],
            en: ["YES - Contract with remote clause", "NO - Without clause"],
            es: ["SÍ - Contrato con cláusula remota", "NO - Sin esa cláusula"]
        }
    },
    q_V7A_2: {
        pt: "Contrato registrado há mais de 3 meses?",
        en: "Contract registered for more than 3 months?",
        es: "¿Contrato registrado hace más de 3 meses?",
        options: {
            pt: ["SIM - Mais de 3 meses", "NÃO - Menos de 3 meses"],
            en: ["YES - More than 3 months", "NO - Less than 3 months"],
            es: ["SÍ - Más de 3 meses", "NO - Menos de 3 meses"]
        }
    },
    q_V8_A: {
        pt: "Pró-labore igual ou superior a €2.800/mês?",
        en: "Pro-labore equal to or greater than €2,800/month?",
        es: "¿Pro-labore igual o superior a €2.800/mes?",
        options: {
            pt: ["SIM - €2.800 ou mais", "NÃO - Menos de €2.800"],
            en: ["YES - €2,800 or more", "NO - Less than €2,800"],
            es: ["SÍ - €2.800 o más", "NO - Menos de €2.800"]
        }
    },
    q_V9_A: {
        pt: "Extratos bancários (3 meses) comprovam pró-labore?",
        en: "Bank statements (3 months) prove pro-labore?",
        es: "¿Extractos bancarios (3 meses) comprueban pro-labore?",
        options: {
            pt: ["SIM - Tenho os extratos", "NÃO - Não tenho", "Tenho mas valores são menores"],
            en: ["YES - I have statements", "NO - I don't have", "I have but amounts are less"],
            es: ["SÍ - Tengo los extractos", "NO - No tengo", "Tengo pero valores son menores"]
        }
    },
    q_V7_B: {
        pt: "Possui contratos formais com clientes?",
        en: "Do you have formal contracts with clients?",
        es: "¿Posee contratos formales con clientes?",
        options: {
            pt: ["SIM - Contratos formais", "NÃO - Sem contratos"],
            en: ["YES - Formal contracts", "NO - No contracts"],
            es: ["SÍ - Contratos formales", "NO - Sin contratos"]
        }
    },
    q_V8_B: {
        pt: "Renda mensal média igual ou superior a €2.800?",
        en: "Average monthly income equal to or greater than €2,800?",
        es: "¿Renta mensual promedio igual o superior a €2.800?",
        options: {
            pt: ["SIM - €2.800 ou mais", "NÃO - Menos de €2.800"],
            en: ["YES - €2,800 or more", "NO - Less than €2,800"],
            es: ["SÍ - €2.800 o más", "NO - Menos de €2.800"]
        }
    },
    q_V9_B: {
        pt: "Comprova renda com extratos/faturas (3 meses)?",
        en: "Can prove income with statements/invoices (3 months)?",
        es: "¿Comprueba renta con extractos/facturas (3 meses)?",
        options: {
            pt: ["SIM - Tenho comprovantes", "NÃO - Não consigo comprovar"],
            en: ["YES - I have proof", "NO - Can't prove"],
            es: ["SÍ - Tengo comprobantes", "NO - No consigo comprobar"]
        }
    },
    q_V7_C: {
        pt: "Possui contrato de trabalho formal?",
        en: "Do you have formal employment contract?",
        es: "¿Posee contrato de trabajo formal?",
        options: {
            pt: ["SIM - Contrato formal", "NÃO - Informal"],
            en: ["YES - Formal contract", "NO - Informal"],
            es: ["SÍ - Contrato formal", "NO - Informal"]
        }
    },
    q_V8_C: {
        pt: "Salário igual ou superior a €2.800/mês?",
        en: "Salary equal to or greater than €2,800/month?",
        es: "¿Salario igual o superior a €2.800/mes?",
        options: {
            pt: ["SIM - €2.800 ou mais", "NÃO - Menos de €2.800"],
            en: ["YES - €2,800 or more", "NO - Less than €2,800"],
            es: ["SÍ - €2.800 o más", "NO - Menos de €2.800"]
        }
    },
    q_V9_C: {
        pt: "Possui holerites dos últimos 3 meses?",
        en: "Do you have pay stubs from last 3 months?",
        es: "¿Posee recibos de sueldo de los últimos 3 meses?",
        options: {
            pt: ["SIM - Tenho holerites", "NÃO - Não tenho"],
            en: ["YES - I have pay stubs", "NO - I don't have"],
            es: ["SÍ - Tengo recibos", "NO - No tengo"]
        }
    },
    q_V10: {
        pt: "Como comprovará cobertura de Segurança Social?",
        en: "How will you prove Social Security coverage?",
        es: "¿Cómo comprobará cobertura de Seguridad Social?",
        options: {
            pt: ["Filiarei à SS espanhola após aprovação", "Certificado do meu país"],
            en: ["Join Spanish SS after approval", "Certificate from my country"],
            es: ["Me afiliaré a la SS española tras aprobación", "Certificado de mi país"]
        }
    },
    q_V11: {
        pt: "Empresa está sediada FORA da Espanha?",
        en: "Is company based OUTSIDE Spain?",
        es: "¿Empresa está ubicada FUERA de España?",
        options: {
            pt: ["SIM - Fora da Espanha", "NÃO - Na Espanha"],
            en: ["YES - Outside Spain", "NO - In Spain"],
            es: ["SÍ - Fuera de España", "NO - En España"]
        }
    },
    q_V12: {
        pt: "Empresa ativa há pelo menos 1 ano?",
        en: "Company active for at least 1 year?",
        es: "¿Empresa activa hace al menos 1 año?",
        options: {
            pt: ["SIM - Mais de 1 ano", "NÃO - Menos de 1 ano"],
            en: ["YES - More than 1 year", "NO - Less than 1 year"],
            es: ["SÍ - Más de 1 año", "NO - Menos de 1 año"]
        }
    },
    q_V13: {
        pt: "Empresa pode fornecer carta de autorização?",
        en: "Can company provide authorization letter?",
        es: "¿Empresa puede proporcionar carta de autorización?",
        options: {
            pt: ["SIM - Pode fornecer", "NÃO - Não pode ou quer"],
            en: ["YES - Can provide", "NO - Can't or won't"],
            es: ["SÍ - Puede proporcionar", "NO - No puede o quiere"]
        }
    },
    q_V14: {
        pt: "Possui diploma superior ou 3+ anos experiência?",
        en: "Do you have degree or 3+ years experience?",
        es: "¿Posee diploma superior o 3+ años experiencia?",
        options: {
            pt: ["SIM - Tenho", "NÃO - Não tenho"],
            en: ["YES - I have", "NO - I don't have"],
            es: ["SÍ - Tengo", "NO - No tengo"]
        }
    },
    q_V15: {
        pt: "CV indica 3+ meses de trabalho remoto?",
        en: "Does CV show 3+ months remote work?",
        es: "¿CV indica 3+ meses de trabajo remoto?",
        options: {
            pt: ["SIM - Demonstra 3+ meses", "NÃO - Menos ou não consta"],
            en: ["YES - Shows 3+ months", "NO - Less or not listed"],
            es: ["SÍ - Demuestra 3+ meses", "NO - Menos o no consta"]
        }
    },
    q_V16: {
        pt: "Comprova €33.600 em recursos financeiros?",
        en: "Can prove €33,600 in financial resources?",
        es: "¿Comprueba €33.600 en recursos financieros?",
        options: {
            pt: ["SIM - Possuo €33.600+", "NÃO - Menos de €33.600"],
            en: ["YES - I have €33,600+", "NO - Less than €33,600"],
            es: ["SÍ - Poseo €33.600+", "NO - Menos de €33.600"]
        }
    },
    q_V17: {
        pt: "Pretende levar familiares?",
        en: "Do you plan to bring family?",
        es: "¿Pretende llevar familiares?",
        options: {
            pt: ["NÃO - Sozinho(a)", "SIM - Com família"],
            en: ["NO - Alone", "YES - With family"],
            es: ["NO - Solo(a)", "SÍ - Con familia"]
        }
    },
    q_V18: {
        pt: "Recursos adicionais para família? (1º: €12.600, demais: €4.200)",
        en: "Additional resources for family? (1st: €12,600, others: €4,200)",
        es: "¿Recursos adicionales para familia? (1º: €12.600, demás: €4.200)",
        options: {
            pt: ["SIM - Possuo recursos", "NÃO - Não possuo"],
            en: ["YES - I have resources", "NO - I don't have"],
            es: ["SÍ - Poseo recursos", "NO - No poseo"]
        }
    },
    q_V19: {
        pt: "Seguro saúde sem carência e cobertura integral na Espanha?",
        en: "Health insurance without waiting period and full coverage in Spain?",
        es: "¿Seguro de salud sin carencia y cobertura integral en España?",
        options: {
            pt: ["SIM - Tenho seguro adequado", "NÃO - Não tenho ou inadequado"],
            en: ["YES - I have adequate insurance", "NO - I don't have or inadequate"],
            es: ["SÍ - Tengo seguro adecuado", "NO - No tengo o inadecuado"]
        }
    },
    q_V20: {
        pt: "Certificado de antecedentes penais (5 anos) sem apontamentos?",
        en: "Criminal record certificate (5 years) with no issues?",
        es: "¿Certificado de antecedentes penales (5 años) sin anotaciones?",
        options: {
            pt: ["SIM - Certificado limpo", "NÃO - Não tenho", "Tenho mas com apontamentos"],
            en: ["YES - Clean certificate", "NO - I don't have", "I have but with issues"],
            es: ["SÍ - Certificado limpio", "NO - No tengo", "Tengo pero con anotaciones"]
        }
    }
};

const koMessages = {
    'KO_EU_CITIZEN': {
        pt: "❌ Este visto é exclusivo para cidadãos FORA da União Europeia, EEE e Suíça. Cidadãos dessas regiões já possuem livre circulação.",
        en: "❌ This visa is exclusively for citizens OUTSIDE the EU, EEA and Switzerland. Citizens of these regions already have free movement.",
        es: "❌ Esta visa es exclusiva para ciudadanos FUERA de la UE, EEE y Suiza. Ciudadanos de estas regiones ya poseen libre circulación."
    },
    'KO_MINOR': {
        pt: "❌ Menores de 18 anos não podem ser titulares. Podem ser incluídos como dependentes de um adulto solicitante.",
        en: "❌ Minors under 18 cannot be visa holders. They can be included as dependents of an adult applicant.",
        es: "❌ Menores de 18 años no pueden ser titulares. Pueden ser incluidos como dependientes de un adulto solicitante."
    },
    'KO_SPAIN_COMPANY': {
        pt: "❌ Este visto é para TELETRABALHADORES INTERNACIONAIS. Se a empresa está na Espanha, você precisa de visto de trabalho tradicional.",
        en: "❌ This visa is for INTERNATIONAL TELEWORKERS. If the company is in Spain, you need a traditional work visa.",
        es: "❌ Esta visa es para TELETRABAJADORES INTERNACIONALES. Si la empresa está en España, necesita visa de trabajo tradicional."
    },
    'KO_NEW_COMPANY': {
        pt: "❌ A empresa precisa estar ativa há pelo menos 1 ano. Este requisito garante estabilidade do vínculo empregatício.",
        en: "❌ The company must be active for at least 1 year. This requirement ensures employment stability.",
        es: "❌ La empresa necesita estar activa hace al menos 1 año. Este requisito garantiza estabilidad del vínculo laboral."
    }
};

const conversationFlow = {
    'START': 'q_V1',
    'q_V1': 'q_V2',
    'q_V2': (answers) => answers['q_V2'] === 1 ? 'KO_EU_CITIZEN' : 'q_V3',
    'q_V3': (answers) => answers['q_V3'] === 1 ? 'KO_MINOR' : 'q_V4',
    'q_V4': 'q_V5',
    'q_V5': 'q_V6',
    'q_V6': (answers) => {
        const profile = answers['q_V1'];
        if (profile === 0) return 'q_V7_A';
        if (profile === 1) return 'q_V7_B';
        if (profile === 2) return 'q_V7_C';
        return 'q_V10';
    },
    'q_V7_A': 'q_V7A_2',
    'q_V7A_2': 'q_V8_A',
    'q_V8_A': 'q_V9_A',
    'q_V9_A': 'q_V10',
    'q_V7_B': 'q_V8_B',
    'q_V8_B': 'q_V9_B',
    'q_V9_B': 'q_V10',
    'q_V7_C': 'q_V8_C',
    'q_V8_C': 'q_V9_C',
    'q_V9_C': 'q_V10',
    'q_V10': 'q_V11',
    'q_V11': (answers) => answers['q_V11'] === 1 ? 'KO_SPAIN_COMPANY' : 'q_V12',
    'q_V12': (answers) => answers['q_V12'] === 1 ? 'KO_NEW_COMPANY' : 'q_V13',
    'q_V13': 'q_V14',
    'q_V14': 'q_V15',
    'q_V15': 'q_V16',
    'q_V16': 'q_V17',
    'q_V17': (answers) => answers['q_V17'] === 1 ? 'q_V18' : 'q_V19',
    'q_V18': 'q_V19',
    'q_V19': 'q_V20',
    'q_V20': 'END_OF_QUESTIONNAIRE'
};

// Mapa de índices numéricos para IDs de perguntas
const questionIndexMap = [
    'q_V1',   // 0
    'q_V2',   // 1
    'q_V3',   // 2
    'q_V4',   // 3
    'q_V5',   // 4
    'q_V6',   // 5
    'q_V7_A', // 6
    'q_V7A_2',// 7
    'q_V8_A', // 8
    'q_V9_A', // 9
    'q_V7_B', // 10
    'q_V8_B', // 11
    'q_V9_B', // 12
    'q_V7_C', // 13
    'q_V8_C', // 14
    'q_V9_C', // 15
    'q_V10',  // 16
    'q_V11',  // 17
    'q_V12',  // 18
    'q_V13',  // 19
    'q_V14',  // 20
    'q_V15',  // 21
    'q_V16',  // 22
    'q_V17',  // 23
    'q_V18',  // 24
    'q_V19',  // 25
    'q_V20'   // 26
];

/**
 * Função compatível com server.js otimizado v2.1
 * Recebe índice numérico e retorna pergunta formatada
 */
function getQuestion(index, language = 'pt', answers = {}) {
    // Converter índice para ID de pergunta
    const questionId = questionIndexMap[index];
    
    if (!questionId) {
        // Fim do questionário
        return null;
    }
    
    // Usar getNextStep para obter a pergunta
    const result = getNextStep(questionId, answers, language);
    
    if (result.isFinished || !result.nextQuestion) {
        return null;
    }
    
    return result.nextQuestion;
}

/**
 * Função original getNextStep (mantida para compatibilidade)
 */
function getNextStep(currentStep, answers, language = 'pt') {
    if (!currentStep) currentStep = 'START';
    
    let nextStepId = conversationFlow[currentStep];
    
    if (typeof nextStepId === 'function') {
        nextStepId = nextStepId(answers);
    }
    
    if (nextStepId && nextStepId.startsWith('KO_')) {
        return {
            nextQuestion: null,
            messages: [koMessages[nextStepId][language]],
            isFinished: true,
            knockOut: true,
            knockOutReason: nextStepId
        };
    }
    
    if (nextStepId === 'END_OF_QUESTIONNAIRE') {
        return {
            nextQuestion: null,
            messages: [language === 'pt' ? "✅ Diagnóstico concluído!" : language === 'es' ? "✅ ¡Diagnóstico concluido!" : "✅ Diagnosis completed!"],
            isFinished: true,
            knockOut: false
        };
    }
    
    const questionData = questions[nextStepId];
    
    if (!questionData) {
        return {
            nextQuestion: null,
            messages: ["Erro no fluxo"],
            isFinished: true,
            knockOut: false
        };
    }
    
    return {
        nextQuestion: {
            id: nextStepId,
            text: questionData[language],
            options: questionData.options[language].map((label, index) => ({
                id: index,
                label: label
            }))
        },
        messages: [questionData[language]],
        isFinished: false
    };
}

// Exportar ambas as funções para compatibilidade
module.exports = { 
    getQuestion,    // ← NOVA: Para server.js v2.1
    getNextStep,    // ← ORIGINAL: Mantida para compatibilidade
    questions 
};
