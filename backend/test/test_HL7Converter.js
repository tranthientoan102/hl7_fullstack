const HL7Converter = require('../src/services/HL7Converter');
const fs = require('fs');
const csv = require('csv-parser');

function runTests() {
    const converter = new HL7Converter();
    const results = [];

    fs.createReadStream('./test/test_1.csv')
        .pipe(csv({
            mapHeaders: ({ header, index }) => header.trim(),
            mapValues: ({ header, index, value }) => value.trim().replace(/^"|"$/g, '')
        }))
        .on('data', (data) => {
            const hl7Object = converter.convert(data);
            const hl7Message = converter.toHL7(hl7Object);
            results.push({ hl7Object, hl7Message });
        })
        .on('end', () => {
            // Test Case 1: Convert
            const expectedHL7Object = {
                MSH: {
                    'MSH.3': 'msh3',
                    'MSH.4': 'msh4'
                },
                PID: {
                    'PID.3': { 'PID.3.1': 'pid3_1', 'PID.3.5': 'pid3_5' }
                },
                OBX: [
                    {
                        'OBX.1': '1',
                        'OBX.2': 'field1',
                        'OBX.3': {
                            'OBX.3.1': 'field2',
                            'OBX.3.2': 'field3',
                            'OBX.3.3': 'field4'
                        },
                        'OBX.5': 'field5'
                    },
                    {
                        'OBX.1': '2',
                        'OBX.2': 'field1',
                        'OBX.3': {
                            'OBX.3.1': 'field2',
                            'OBX.3.2': 'field3',
                            'OBX.3.3': 'field4'
                        },
                        'OBX.5': 'field5'
                    }
                ]
            };

            if (JSON.stringify(expectedHL7Object) === JSON.stringify(results[0].hl7Object)) {
                console.log('Convert Test passed!');
            } else {
                console.error('Convert Test failed!');
                console.error('Expected:', expectedHL7Object);
                console.error('Actual:', results[0].hl7Object);
            }

            // Test Case 2: toHL7
            const expectedHL7 = 'MSH|||msh3|msh4\rPID|||pid3_1^^^^pid3_5\rOBX|1|field1|field2^field3^field4||field5\rOBX|2|field1|field2^field3^field4||field5\r';
            if (expectedHL7 === results[0].hl7Message) {
                console.log('toHL7 Test passed!');
            } else {
                console.error('toHL7 Test failed!');
                console.error('Expected:', expectedHL7);
                console.error('Actual:', results[0].hl7Message);
            }
        });
}

runTests();