const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { getLocalTimestamp } = require('../utils/timeUtils');
const { getDb } = require('../utils/db');
const logger = require('../utils/logger');

class SourceConnector {
    constructor(config, channelName) {
        this.channelName = channelName;
        this.config = config;
        if (this.config.type === 'fromFile') {
            if (!fs.existsSync(this.config.folderFullPath)) {
                fs.mkdirSync(this.config.folderFullPath, { recursive: true });
            }
            this.config.backupFolderFullPath = path.join(this.config.folderFullPath, 'backup');
            if (!fs.existsSync(this.config.backupFolderFullPath)) {
                fs.mkdirSync(this.config.backupFolderFullPath, { recursive: true });
            }
        }
    }

    getData() {
        return new Promise((resolve, reject) => {
            if (this.config.type === 'fromFile') {
                const files = fs.readdirSync(this.config.folderFullPath)
                                .filter(name => fs.statSync(path.join(this.config.folderFullPath, name)).isFile());
                if (files.length === 0) {
                    return resolve(null);
                }

                const fileToProcess = files[0];
                const filePath = path.join(this.config.folderFullPath, fileToProcess);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const results = [];
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', () => {
                        const db = getDb();
                        const timestamp = getLocalTimestamp();
                        db.run('INSERT INTO CHANNEL_SOURCE (channelName, data, timestamp) VALUES (?, ?, ?)', [this.channelName, fileContent, timestamp], function(err) {
                            if (err) {
                                logger.error('Error inserting into CHANNEL_SOURCE:', err.message);
                                reject(err);
                            } else {
                                logger.info(`A row has been inserted into CHANNEL_SOURCE with rowid ${this.lastID}`);
                                resolve({ fileName: fileToProcess, data: results, sourceId: this.lastID });
                            }
                        });
                    })
                    .on('error', (error) => reject(error));
            }
        });
    }

    backup(fileName) {
        if (this.config.type === 'fromFile') {
            const timestamp = getLocalTimestamp();
            const parsedFileName = path.parse(fileName);
            const baseFileName = parsedFileName.name;
            const fileExtension = parsedFileName.ext;
            const sourcePath = path.join(this.config.folderFullPath, fileName);
            const backupPath = path.join(this.config.backupFolderFullPath, `${baseFileName}_${timestamp}${fileExtension}`);
            fs.renameSync(sourcePath, backupPath);
        }
    }
}

module.exports = SourceConnector;
