/**
 * EXPANDSPAIN ALPHA™ - WHATSAPP SERVICE (OPTIMIZED v2.1)
 * Integração com Twilio WhatsApp Business API
 * - Validação de número WhatsApp
 * - Retry automático em falhas
 * - Validação de comprimento de mensagem
 */

const twilio = require('twilio');

// Inicializar cliente Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Sandbox

let client = null;

// Inicializar cliente apenas se credenciais estiverem configuradas
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio WhatsApp client inicializado');
} else {
    console.warn('⚠️  Twilio WhatsApp não configurado (credenciais ausentes)');
    console.warn('   Sistema funcionará sem notificações WhatsApp');
}

/**
 * Valida formato do número WhatsApp
 * Formato esperado: +[código país][número] (10-15 dígitos totais)
 * Exemplo: +5511999999999
 */
function isValidWhatsAppNumber(number) {
    if (!number) return false;
    
    // Regex: + seguido de 10-15 dígitos
    const regex = /^\+\d{10,15}$/;
    return regex.test(number.trim());
}

/**
 * Trunca mensagem se exceder limite do WhatsApp
 * WhatsApp Business API tem limite de 1600 caracteres
 */
function truncateMessage(message, maxLength = 1600) {
    if (message.length <= maxLength) {
        return message;
    }
    
    console.warn(`⚠️  Mensagem muito longa (${message.length} chars). Truncando para ${maxLength}...`);
    
    // Truncar e adicionar indicação
    return message.substring(0, maxLength - 50) + '\n\n[Mensagem truncada. Veja mais detalhes no site]';
}

/**
 * Envia mensagem WhatsApp com retry automático
 * @param {string} to - Número WhatsApp (com código país)
 * @param {string} message - Mensagem a enviar
 * @param {number} retries - Número de tentativas
 * @returns {object|null} - Dados da mensagem ou null
 */
async function sendWhatsAppWithRetry(to, message, retries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const msg = await client.messages.create({
                body: message,
                from: whatsappFrom,
                to: `whatsapp:${to}`
            });
            
            return msg;
            
        } catch (error) {
            lastError = error;
            console.error(`❌ Tentativa ${attempt}/${retries} falhou:`, error.message);
            
            // Não fazer retry em erros permanentes
            if (error.code === 21211 || // Invalid To number
                error.code === 21408 || // Permission denied
                error.code === 21610) { // Unverified number
                console.error('   Erro permanente. Não fará retry.');
                break;
            }
            
            // Aguardar antes de tentar novamente (backoff exponencial)
            if (attempt < retries) {
                const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`   Aguardando ${waitTime}ms antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // Todas as tentativas falharam
    console.error('❌ Todas as tentativas de envio WhatsApp falharam');
    if (lastError.code) {
        console.error(`   Código Twilio: ${lastError.code}`);
    }
    if (lastError.moreInfo) {
        console.error(`   Mais info: ${lastError.moreInfo}`);
    }
    
    return null;
}

/**
 * Envia notificação WhatsApp quando resultado está pronto
 */
async function sendResultNotification(userData, scoreData, accessCode, language = 'pt') {
    // Verificar se cliente está configurado
    if (!client) {
        console.warn('⚠️  WhatsApp não enviado: Twilio não configurado');
        return null;
    }

    // Validar número WhatsApp
    if (!userData.whatsapp || !isValidWhatsAppNumber(userData.whatsapp)) {
        console.warn('⚠️  WhatsApp não enviado: Número inválido ou ausente');
        console.warn(`   Número fornecido: ${userData.whatsapp}`);
        console.warn('   Formato esperado: +5511999999999');
        return null;
    }

    try {
        // Preparar URL do resultado
        const resultUrl = `${process.env.SITE_URL}/teste/resultado?code=${accessCode}`;

        // Mensagens por idioma
        const messages = {
            pt: `Olá ${userData.firstName || 'candidato'}! 👋

Seu Alpha™ Diagnosis está pronto:
- Score: ${scoreData.score}/100 - ${scoreData.status}

🤖 A IA identificou ${scoreData.gaps?.length || 0} gap(s) crítico(s) que podem causar rejeição.

O Power Oracle™ te mostra exatamente como resolver cada um.

🎯 Acesse agora: ${resultUrl}

Garantia 30 dias + €97 creditados no Code +34™

Dúvidas? Responda esta mensagem 💬`,
            
            en: `Hi ${userData.firstName || 'candidate'}! 👋

Your Alpha™ Diagnosis is ready:
- Score: ${scoreData.score}/100 - ${scoreData.status}

🤖 AI identified ${scoreData.gaps?.length || 0} critical gap(s) that may cause rejection.

Power Oracle™ shows you exactly how to fix each one.

🎯 Access now: ${resultUrl}

30-day guarantee + €97 credited to Code +34™

Questions? Reply to this message 💬`,
            
            es: `¡Hola ${userData.firstName || 'candidato'}! 👋

Tu Alpha™ Diagnosis está listo:
- Puntaje: ${scoreData.score}/100 - ${scoreData.status}

🤖 La IA identificó ${scoreData.gaps?.length || 0} gap(s) crítico(s) que pueden causar rechazo.

Power Oracle™ te muestra exactamente cómo resolver cada uno.

🎯 Accede ahora: ${resultUrl}

Garantía 30 días + €97 acreditados en Code +34™

¿Dudas? Responde a este mensaje 💬`
        };

        let messageBody = messages[language] || messages['pt'];
        
        // Validar comprimento e truncar se necessário
        messageBody = truncateMessage(messageBody);

        // Enviar mensagem com retry
        const message = await sendWhatsAppWithRetry(userData.whatsapp, messageBody);

        if (message) {
            console.log(`✅ WhatsApp enviado com sucesso`);
            console.log(`   Para: ${userData.whatsapp}`);
            console.log(`   SID: ${message.sid}`);
            console.log(`   Status: ${message.status}`);
            return message.sid;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error.message);
        return null;
    }
}

/**
 * Envia follow-up após N dias
 */
async function sendFollowUp(userData, scoreData, days, language = 'pt') {
    if (!client) {
        console.warn('⚠️  WhatsApp follow-up não enviado: Twilio não configurado');
        return null;
    }
    
    if (!isValidWhatsAppNumber(userData.whatsapp)) {
        console.warn('⚠️  WhatsApp follow-up não enviado: Número inválido');
        return null;
    }

    const templates = {
        1: {
            pt: `Oi ${userData.firstName}! 

Você viu seu resultado Alpha™?

Ainda com dúvidas sobre como corrigir seus ${scoreData.gaps?.length || 0} gaps?

O Power Oracle™ tem roadmap completo para seu perfil.

Garantia total de 30 dias 🛡️

Acesse: ${process.env.SITE_URL}/oracle`,
            
            en: `Hi ${userData.firstName}!

Did you see your Alpha™ result?

Still have questions about fixing your ${scoreData.gaps?.length || 0} gaps?

Power Oracle™ has complete roadmap for your profile.

Full 30-day guarantee 🛡️

Access: ${process.env.SITE_URL}/oracle`,
            
            es: `¡Hola ${userData.firstName}!

¿Viste tu resultado Alpha™?

¿Aún tienes dudas sobre cómo corregir tus ${scoreData.gaps?.length || 0} gaps?

Power Oracle™ tiene roadmap completo para tu perfil.

Garantía total de 30 días 🛡️

Accede: ${process.env.SITE_URL}/oracle`
        },
        
        3: {
            pt: `${userData.firstName}, oferta especial! ⏰

Desconto de 20% expira em 24h:
Power Oracle™ por €77 (ao invés de €97)

Seus ${scoreData.gaps?.length || 0} gaps não vão se resolver sozinhos.

Use código: ALPHA20

Aproveite: ${process.env.SITE_URL}/oracle?discount=ALPHA20`,
            
            en: `${userData.firstName}, special offer! ⏰

20% discount expires in 24h:
Power Oracle™ for €77 (instead of €97)

Your ${scoreData.gaps?.length || 0} gaps won't fix themselves.

Use code: ALPHA20

Get it: ${process.env.SITE_URL}/oracle?discount=ALPHA20`,
            
            es: `${userData.firstName}, ¡oferta especial! ⏰

20% descuento expira en 24h:
Power Oracle™ por €77 (en vez de €97)

Tus ${scoreData.gaps?.length || 0} gaps no se resolverán solos.

Usa código: ALPHA20

Aprovecha: ${process.env.SITE_URL}/oracle?discount=ALPHA20`
        },
        
        7: {
            pt: `${userData.firstName}, última chance! ⚠️

Esta é sua última oportunidade para o Power Oracle™.

Depois disso, você precisará refazer o diagnóstico.

Seus ${scoreData.gaps?.length || 0} gaps ainda estão esperando solução.

Acesse agora: ${process.env.SITE_URL}/oracle

Dúvidas? Responda esta mensagem 💬`,
            
            en: `${userData.firstName}, last chance! ⚠️

This is your last opportunity for Power Oracle™.

After this, you'll need to redo the diagnosis.

Your ${scoreData.gaps?.length || 0} gaps are still waiting for solution.

Access now: ${process.env.SITE_URL}/oracle

Questions? Reply to this message 💬`,
            
            es: `${userData.firstName}, ¡última oportunidad! ⚠️

Esta es tu última oportunidad para Power Oracle™.

Después de esto, necesitarás rehacer el diagnóstico.

Tus ${scoreData.gaps?.length || 0} gaps todavía esperan solución.

Accede ahora: ${process.env.SITE_URL}/oracle

¿Dudas? Responde a este mensaje 💬`
        }
    };

    try {
        const template = templates[days]?.[language] || templates[days]?.['pt'];
        
        if (!template) {
            console.error(`❌ Template não encontrado para dia ${days} e idioma ${language}`);
            return null;
        }

        // Truncar se necessário
        const message = truncateMessage(template);

        // Enviar com retry
        const result = await sendWhatsAppWithRetry(userData.whatsapp, message);

        if (result) {
            console.log(`✅ WhatsApp follow-up dia ${days} enviado`);
            console.log(`   SID: ${result.sid}`);
            return result.sid;
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ Erro ao enviar follow-up WhatsApp dia ${days}:`, error.message);
        return null;
    }
}

/**
 * Envia confirmação de compra via WhatsApp
 */
async function sendPurchaseConfirmation(userData, language = 'pt') {
    if (!client) {
        console.warn('⚠️  WhatsApp confirmação não enviado: Twilio não configurado');
        return null;
    }
    
    if (!isValidWhatsAppNumber(userData.whatsapp)) {
        console.warn('⚠️  WhatsApp confirmação não enviado: Número inválido');
        return null;
    }

    const messages = {
        pt: `🎉 Parabéns ${userData.firstName}!

Seu Power Oracle™ foi ativado com sucesso!

✅ Acesso liberado
✅ PDF personalizado pronto
✅ Templates disponíveis
✅ Suporte VIP ativo

Acesse agora: ${process.env.SITE_URL}/oracle/dashboard

Login: ${userData.email}

Suporte VIP: Responda esta mensagem para qualquer dúvida 💬`,
        
        en: `🎉 Congratulations ${userData.firstName}!

Your Power Oracle™ has been activated successfully!

✅ Access granted
✅ Personalized PDF ready
✅ Templates available
✅ VIP Support active

Access now: ${process.env.SITE_URL}/oracle/dashboard

Login: ${userData.email}

VIP Support: Reply to this message for any questions 💬`,
        
        es: `🎉 ¡Felicitaciones ${userData.firstName}!

¡Tu Power Oracle™ ha sido activado con éxito!

✅ Acceso liberado
✅ PDF personalizado listo
✅ Templates disponibles
✅ Soporte VIP activo

Accede ahora: ${process.env.SITE_URL}/oracle/dashboard

Login: ${userData.email}

Soporte VIP: Responde a este mensaje para cualquier duda 💬`
    };

    try {
        let message = messages[language] || messages['pt'];
        message = truncateMessage(message);

        const result = await sendWhatsAppWithRetry(userData.whatsapp, message);

        if (result) {
            console.log('✅ WhatsApp confirmação de compra enviado');
            console.log(`   SID: ${result.sid}`);
            return result.sid;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erro ao enviar confirmação WhatsApp:', error.message);
        return null;
    }
}

/**
 * Verifica status de uma mensagem WhatsApp
 */
async function checkMessageStatus(messageSid) {
    if (!client) {
        return null;
    }

    try {
        const message = await client.messages(messageSid).fetch();
        
        return {
            sid: message.sid,
            status: message.status, // queued, sent, delivered, read, failed
            to: message.to,
            from: message.from,
            dateSent: message.dateSent,
            errorCode: message.errorCode,
            errorMessage: message.errorMessage
        };
    } catch (error) {
        console.error('❌ Erro ao verificar status WhatsApp:', error.message);
        return null;
    }
}

module.exports = {
    sendResultNotification,
    sendFollowUp,
    sendPurchaseConfirmation,
    checkMessageStatus,
    isValidWhatsAppNumber // Exportar para testes
};
