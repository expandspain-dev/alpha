/**
 * EXPANDSPAIN ALPHA™ - DATABASE CONNECTION
 * Configuração de conexão MySQL com pool de conexões
 * 
 * IMPORTANTE: Este arquivo substitui COMPLETAMENTE o anterior
 * que tinha código de IA incorretamente misturado.
 */

const mysql = require('mysql2/promise');

// Configuração do pool de conexões
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
    // Configurações de pool
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // Configurações de timeout
    connectTimeout: 10000,
    acquireTimeout: 10000,
    
    // Manter conexão viva
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    
    // Timezone
    timezone: 'Z',
    
    // Charset
    charset: 'utf8mb4'
});

/**
 * Testa a conexão com o banco de dados
 * Executa ao iniciar a aplicação
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL conectado com sucesso!');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar ao MySQL:', error.message);
        console.error('   Verifique as variáveis de ambiente:');
        console.error('   - DB_HOST');
        console.error('   - DB_USER');
        console.error('   - DB_PASSWORD');
        console.error('   - DB_NAME');
        return false;
    }
}

/**
 * Função auxiliar para executar queries com retry
 * @param {string} sql - Query SQL
 * @param {array} params - Parâmetros da query
 * @param {number} retries - Número de tentativas
 */
async function executeQuery(sql, params = [], retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            lastError = error;
            console.error(`Tentativa ${i + 1}/${retries} falhou:`, error.message);
            
            // Aguardar antes de tentar novamente
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
    
    throw lastError;
}

/**
 * Graceful shutdown
 */
async function closePool() {
    try {
        await pool.end();
        console.log('✅ Pool de conexões MySQL fechado');
    } catch (error) {
        console.error('❌ Erro ao fechar pool:', error.message);
    }
}

// Event listeners
pool.on('connection', (connection) => {
    console.log('Nova conexão MySQL criada');
});

pool.on('acquire', (connection) => {
    console.log('Conexão adquirida do pool');
});

pool.on('release', (connection) => {
    console.log('Conexão devolvida ao pool');
});

// Exportar pool e funções
module.exports = {
    pool,
    testConnection,
    executeQuery,
    closePool
};
