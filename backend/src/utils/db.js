const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

const DB_PATH = path.resolve(__dirname, '..', '..', '..', 'db', 'hl7.db');

let db;

function initDb() {
    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            logger.error('Error connecting to database:', err.message);
        } else {
            logger.debug('Connected to the SQLite database.');
            // Create tables if they don't exist
            const createTablesSql = `
                CREATE TABLE IF NOT EXISTS CHANNEL_SOURCE (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channelName TEXT,
                    data TEXT,
                    timestamp TEXT
                );

                CREATE TABLE IF NOT EXISTS CHANNEL_OUTPUT (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channelName TEXT,
                    source_id INTEGER,
                    data TEXT,
                    timestamp TEXT,
                    FOREIGN KEY (source_id) REFERENCES CHANNEL_SOURCE(id)
                );
            `;
            db.exec(createTablesSql, (err) => {
                if (err) {
                    logger.error('Error creating tables:', err.message);
                } else {
                    logger.debug('Tables created or already exist.');
                }
            });
        }
    });
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
}

module.exports = { initDb, getDb };
