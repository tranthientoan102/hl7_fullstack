const fs = require('fs');
const path = require('path');
const net = require('net');
const logger = require('../utils/logger');
const { getLocalTimestamp } = require('../utils/timeUtils');
const { getDb } = require('../utils/db');

class OutputConnector {
    constructor(config) {
        this.config = config;
        if (this.config.type === 'writeFile') {
            if (!fs.existsSync(this.config.folderFullPath)) {
                fs.mkdirSync(this.config.folderFullPath, { recursive: true });
            }
        }
    }

    _insertOutputIntoDb(channelName, sourceId, data) {
        const db = getDb();
        const timestamp = getLocalTimestamp();
        db.run('INSERT INTO CHANNEL_OUTPUT (channelName, source_id, data, timestamp) VALUES (?, ?, ?, ?)', [channelName, sourceId, data, timestamp], function(err) {
            if (err) {
                console.error('Error inserting into CHANNEL_OUTPUT:', err.message);
            } else {
                logger.info(`A row has been inserted into CHANNEL_OUTPUT with rowid ${this.lastID}`);
            }
        });
    }

    _sendHl7Messages(messages, channelName, sourceId) {
        const client = new net.Socket();
        client.on('error', (err) => {
            logger.error('Error sending data to client:', err.message);
        });

        client.connect(this.config.clientPort, this.config.clientIP, () => {
            messages.forEach(message => {
                logger.debug(`Sending message to ${this.config.clientIP}:${this.config.clientPort}:\n${message}`);
                client.write(message);
                this._insertOutputIntoDb(channelName, sourceId, message);
            });
            client.end();
        });
    }

    sendOutput(data, fileName, sourceId, channelName) {
        if (this.config.type === 'writeFile') {
            const timestamp = getLocalTimestamp();
            const parsedFileName = path.parse(fileName);
            const baseFileName = parsedFileName.name;
            const outputPath = path.join(this.config.folderFullPath, `${baseFileName}_${timestamp}.hl7`);  
            fs.writeFileSync(outputPath, data);
            this._insertOutputIntoDb(channelName, sourceId, data);
        } else if (this.config.type === 'sendToClient') {
            const lines = data.split('\n');
            const messages = [];
            let startLine = 0;

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].startsWith('MSH')) {
                    messages.push(lines.slice(startLine, i).join('\n'));
                    startLine = i;
                }
            }
            messages.push(lines.slice(startLine).join('\n'));

            this._sendHl7Messages(messages, channelName, sourceId);
        }
    }
}

module.exports = OutputConnector;
