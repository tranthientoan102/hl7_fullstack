const fs = require('fs');
const path = require('path');
const net = require('net');
const logger = require('../utils/logger');
const { getLocalTimestamp } = require('../utils/timeUtils');

class OutputConnector {
    constructor(config) {
        this.config = config;
        if (this.config.type === 'writeFile') {
            if (!fs.existsSync(this.config.folderFullPath)) {
                fs.mkdirSync(this.config.folderFullPath, { recursive: true });
            }
        }
    }

    sendOutput(data, fileName) {
        if (this.config.type === 'writeFile') {
            const timestamp = getLocalTimestamp();
            const parsedFileName = path.parse(fileName);
            const baseFileName = parsedFileName.name;
            const outputPath = path.join(this.config.folderFullPath, `${baseFileName}_${timestamp}.hl7`);
            fs.writeFileSync(outputPath, data);
        } else if (this.config.type === 'sendToClient') {
            const client = new net.Socket();
            client.on('error', (err) => {
                logger.error('Error sending data to client:', err.message);
                // In a real-world scenario, you would have a more robust backup/retry mechanism here.
            });
            client.connect(this.config.clientPort, this.config.clientIP, () => {
                client.write(data);
                client.end();
            });
        }
    }
}

module.exports = OutputConnector;