const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const sslConfig = (process.env.DB_HOST && 
                   process.env.DB_HOST !== 'localhost' && 
                   process.env.DB_HOST !== '127.0.0.1' && 
                   process.env.DB_HOST !== 'db')
  ? { rejectUnauthorized: false }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'health_tracking',
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
