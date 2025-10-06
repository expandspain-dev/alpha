const pool = require('../config/database');

async function saveToDatabase(session, scoreData, aiAnalysis) {
    const connection = await pool.getConnection();
    
    try {
        const accessCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const sessionId = Math.random().toString(36).substr(2, 15);
        
        const query = `INSERT INTO alpha_diagnoses 
            (session_id, access_code, email, first_name, last_name, whatsapp, 
             passport_country, language, score, status, status_color, 
             answers_json, report_json, ai_analysis, completed_at, pdf_generated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`;
        
        await connection.execute(query, [
            sessionId,
            accessCode,
            session.userData.email,
            session.userData.firstName || '',
            session.userData.lastName || '',
            session.userData.whatsapp || '',
            session.userData.passport || '',
            session.language,
            scoreData.score,
            scoreData.status,
            scoreData.statusColor,
            JSON.stringify(session.answers),
            JSON.stringify(scoreData),
            aiAnalysis
        ]);
        
        return accessCode;
        
    } finally {
        connection.release();
    }
}

module.exports = { saveToDatabase };
