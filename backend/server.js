const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const yaml = require('js-yaml');
const fs = require('fs');
const ConvertingChannel = require('./src/services/ConvertingChannel');
const logger = require('./src/utils/logger');

const app = express();
const port = 3001;

app.use(cors());

const db = new sqlite3.Database('../db/hl7.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the hl7.db database.');
});

app.get('/api/channels', (req, res) => {
  db.all('SELECT DISTINCT channelName FROM CHANNEL_SOURCE', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ channels: rows.map(row => row.channelName) });
  });
});

app.get('/api/data', (req, res) => {
  const { channelName, startDate, endDate } = req.query;

  let query = `
    SELECT
      cs.id,
      cs.channelName,
      cs.timestamp as received_at,
      cs.data as source_data,
      co.id as output_id,
      co.timestamp as output_sent_at,
      co.data as output_data
    FROM CHANNEL_SOURCE cs
    LEFT JOIN CHANNEL_OUTPUT co ON cs.id = co.source_id
    WHERE 1=1
  `;

  const params = [];

  if (channelName) {
    query += ' AND cs.channelName = ?';
    params.push(channelName);
  }

  if (startDate) {
    query += ' AND cs.timestamp >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND cs.timestamp <= ?';
    params.push(endDate);
  }

  // Change the ORDER BY to DESC
  query += ' ORDER BY cs.timestamp DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const data = rows.reduce((acc, row) => {
      const existing = acc.find(item => item.id === row.id);
      if (existing) {
        if (row.output_id) {
          existing.outputs.push({
            id: row.output_id,
            sent_at: row.output_sent_at,
            output_data: row.output_data
          });
        }
      } else {
        acc.push({
          id: row.id,
          channelName: row.channelName,
          received_at: row.received_at,
          source_data: row.source_data,
          outputs: row.output_id ? [{
            id: row.output_id,
            sent_at: row.output_sent_at,
            output_data: row.output_data
          }] : []
        });
      }
      return acc;
    }, []);

    res.json({ data });
  });
});

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
