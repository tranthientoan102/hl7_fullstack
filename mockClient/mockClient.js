
const net = require('net');
const fs = require('fs');
const path = require('path');
const { getLocalTimestamp } = require('../backend/src/utils/timeUtils');

const PORT = 10000;
const RECEIVED_HL7_MESSAGES_FOLDER = './mockClient/receivedHL7Messages';

const server = net.createServer((socket) => {
    console.log('Client connected');

    socket.on('data', (data) => {
        const hl7Message = data.toString();
        const timestamp = getLocalTimestamp();
        const filename = path.join(RECEIVED_HL7_MESSAGES_FOLDER, `${timestamp}.hl7`);

        fs.writeFile(filename, hl7Message, (err) => {
            if (err) {
                console.error('Error writing HL7 message to file:', err);
            } else {
                console.log(`Received HL7 message saved to ${filename}`);
            }
        });
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

server.listen(PORT, () => {
    console.log(`Mock HL7 client listening on port ${PORT}`);
});
