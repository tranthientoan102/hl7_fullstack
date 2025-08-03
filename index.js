
const yaml = require('js-yaml');
const fs = require('fs');
const ConvertingChannel = require('./src/services/ConvertingChannel');
const logger = require('./src/utils/logger');

const CONFIG_FILE = './ConvertingChannel.yaml';
let channels = [];

function loadAndStartChannels() {
    // Stop existing channels if any
    channels.forEach(channel => {
        if (channel.status === 'RUNNING') {
            channel.stop();
            logger.info(`[${channel.config.name}] Channel stopped.`);
        }
    });
    channels = []; // Clear the array

    try {
        const config = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf8'));
        channels = config.map(channelConfig => new ConvertingChannel(channelConfig));

        channels.forEach(channel => {
            channel.start();
            logger.info(`[${channel.config.name}] Channel started.`);
        });

        logger.info('All channels loaded and started.');
    } catch (e) {
        logger.error(`Error loading or starting channels: ${e.message}`);
    }
}

// Initial load and start
loadAndStartChannels();

// Watch for changes in the config file
fs.watch(CONFIG_FILE, (eventType, filename) => {
    if (eventType === 'change') {
        logger.info(`Config file ${filename} changed. Reloading channels...`);
        loadAndStartChannels();
    }
});

logger.info(`Watching for changes in ${CONFIG_FILE}`);
