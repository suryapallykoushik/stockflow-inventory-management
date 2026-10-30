
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Load SSL certificate when configured
let ssl;

if (process.env.DB_SSL_CA) {
  ssl = {
    ca: process.env.DB_SSL_CA,
    rejectUnauthorized: true
  };
} else if (process.env.DB_SSL_CA_PATH) {
  const certificatePath = path.resolve(process.env.DB_SSL_CA_PATH);

  ssl = {
    ca: fs.readFileSync(certificatePath, "utf8"),
    rejectUnauthorized: true
  };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
