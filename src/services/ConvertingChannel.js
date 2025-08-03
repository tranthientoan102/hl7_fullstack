const SourceConnector = require('./SourceConnector');
const OutputConnector = require('./OutputConnector');
const HL7Converter = require('./HL7Converter');
const logger = require('../utils/logger');

class ConvertingChannel {
    constructor(config) {
        this.config = config;
        this.status = 'STOPPED';
        this.sourceConnector = null;
        this.outputConnector = null;
        this.hl7Converter = null;
        this.intervalId = null;
    }

    start() {
        this.status = 'RUNNING';
        this.sourceConnector = new SourceConnector(this.config.sourceConfig);
        this.outputConnector = new OutputConnector(this.config.outputConfig);
        this.hl7Converter = new HL7Converter(this.config.HL7Converter);

        this.intervalId = setInterval(async () => {
            const result = await this.sourceConnector.getData();
            if (result) {
                const startTime = process.hrtime.bigint();
                const { fileName, data } = result;
                logger.info(`[${this.config.name}] SourceConnector: Processing file: ${fileName}`);
                if (data.length > 0) {
                    logger.info(`[${this.config.name}] HL7Converter: Converting data...`);
                    const hl7Messages = data.map(row => {
                        const hl7Object = this.hl7Converter.convert(row);
                        return this.hl7Converter.toHL7(hl7Object);
                    });
                    logger.info(`[${this.config.name}] OutputConnector: Sending output for file: ${fileName}`);
                    this.outputConnector.sendOutput(hl7Messages.join(''), fileName);
                    logger.info(`[${this.config.name}] SourceConnector: Backing up file: ${fileName}`);
                    this.sourceConnector.backup(fileName);
                }
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
                logger.info(`[${this.config.name}] File ${fileName} processed in ${duration.toFixed(2)} ms.`);
            }
        }, this.config.sourceConfig.interval_ms);
    }

    stop() {
        this.status = 'STOPPED';
        clearInterval(this.intervalId);
        this.sourceConnector = null;
        this.outputConnector = null;
        this.hl7Converter = null;
    }
}

module.exports = ConvertingChannel;
