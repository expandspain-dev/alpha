const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendDiagnosisEmail(userData, scoreData, aiAnalysis, accessCode) {
    const msg = {
        to: userData.email,
        from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: process.env.SENDGRID_FROM_NAME
        },
        subject: `Your Alpha™ Diagnosis Results - Code: ${accessCode}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #FF1493; text-align: center;">Alpha™ Self-Diagnosis Results</h1>
                
                <p>Hi ${userData.firstName},</p>
                
                <p>Your eligibility analysis for Spain's Digital Nomad Visa is complete!</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                    <h2 style="color: ${scoreData.statusColor}; margin: 0;">Score: ${scoreData.score}/100</h2>
                    <h3 style="color: ${scoreData.statusColor}; margin: 10px 0;">${scoreData.status}</h3>
                </div>
                
                <div style="margin: 30px 0;">
                    <h3>AI Analysis:</h3>
                    <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #FF1493; border-radius: 4px;">
                        ${aiAnalysis}
                    </p>
                </div>
                
                <h3>Your Access Code:</h3>
                <div style="background: #0077ff; color: white; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; border-radius: 8px; letter-spacing: 4px; margin: 20px 0;">
                    ${accessCode}
                </div>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.SITE_URL}/dashboard?code=${accessCode}" 
                       style="background: #FF1493; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        View Full Report →
                    </a>
                </p>
                
                <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This is an automated message from ExpandSpain.com - Alpha™ Self-Diagnosis System
                </p>
            </div>
        `
    };
    
    await sgMail.send(msg);
    
    // Atualizar registro que email foi enviado
    const pool = require('../config/database');
    await pool.execute(
        'UPDATE alpha_diagnoses SET email_sent_at = NOW() WHERE access_code = ?',
        [accessCode]
    );
}

module.exports = { sendDiagnosisEmail };
