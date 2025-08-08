
const logger = require('../utils/logger');

class HL7Converter {
    constructor(options = {}) {
        this.CSVHeaderDelimeter = options.CSVHeaderDelimeter || '_';
        this.HL7fieldDelimeter = options.HL7fieldDelimeter || '|';
        this.HL7componentDelimeter = options.HL7componentDelimeter || '^';
        this.compressedSegmentDelimeter = options.compressedSegmentDelimeter || '[ENDOFSEGMENT]';
        this.compressedFieldDelimeter = options.compressedFieldDelimeter || '[ENDOFFIELD]';
    }

    _isCompletelyEmpty(obj) {
        // Handle null or undefined
        if (!obj) return true;
        
        // Handle non-objects
        if (typeof obj !== 'object') {
            return obj === '';
        }
    
        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.length === 0 || obj.every(item => this._isCompletelyEmpty(item));
        }
    
        // Handle objects
        return Object.keys(obj).length === 0 || 
               Object.values(obj).every(value => this._isCompletelyEmpty(value));
    }

    convert(csvLine) {
        const headers = Object.keys(csvLine);
        const hl7Object = {};
        let obxSegmentCount = 0;

        for (const header of headers) {
            const parts = header.split(this.CSVHeaderDelimeter);
            const segment = parts[0];
            const field = parts[1];
            const component = parts[2];

            if (segment !== 'OBX') {
                if (!hl7Object[segment]) {
                    hl7Object[segment] = {};
                }
                const fieldKey = `${segment}.${field}`;
                if (component) {
                    if (!hl7Object[segment][fieldKey]) {
                        hl7Object[segment][fieldKey] = {};
                    }
                    hl7Object[segment][fieldKey][`${segment}.${field}.${component}`] = csvLine[header];
                } else {
                    hl7Object[segment][fieldKey] = csvLine[header];
                }
            } else {
                if (!hl7Object.OBX) {
                    hl7Object.OBX = [];
                }
                const obxSegments = csvLine[header].split(this.compressedSegmentDelimeter).filter(segment => segment);
                for (const obxSegment of obxSegments) {
                    const obxFields = obxSegment.split(this.compressedFieldDelimeter);
                    if (obxFields.length !== 5) {
                        console.warn(`Skipping OBX segment due to incorrect number of fields. Expected 5, got ${obxFields.length}`);
                        continue;
                    }
                    if (!obxFields[4]) {
                        console.warn('Skipping OBX segment due to empty 5th data field.');
                        continue;
                    }
                    obxSegmentCount++;
                    const obxObject = {
                        'OBX.1': obxSegmentCount.toString(),
                        'OBX.2': obxFields[0],
                        'OBX.3': {
                            'OBX.3.1': obxFields[1],
                            'OBX.3.2': obxFields[2],
                            'OBX.3.3': obxFields[3],
                        },
                        'OBX.5': obxFields[4],
                    };
                    hl7Object.OBX.push(obxObject);
                }
            }
        }
        return hl7Object;
    }

    toHL7(hl7Object) {
        let hl7Message = '';
        try {
            for (const segmentName in hl7Object) {
                var tmpObj = {segmentName: hl7Object[segmentName]};
                if (this._isCompletelyEmpty(tmpObj)) {
                    logger.debug(`Skipping segment ${segmentName} because it is completely empty.`);
                    continue;
                }

                if (segmentName !== 'OBX') {
                    hl7Message += this.toHL7Normal(segmentName, hl7Object[segmentName]) + '\n';
                } else {
                    for (const obx of hl7Object.OBX) {
                        hl7Message += this.toHL7Normal('OBX', obx) + '\n';
                    }
                }
            }
            return hl7Message;
        } catch (error) {
            logger.error('Error converting HL7 object to HL7 message:', error);
            // throw new Error('HL7 conversion failed');
        }
    }

    toHL7Normal(segmentName, segmentData) {
        let segment = segmentName + this.HL7fieldDelimeter;
        const fields = {};
        let maxFieldIndex = 0;

        for (const key in segmentData) {
            const parts = key.split('.');
            const fieldIndex = parseInt(parts[1], 10);
            maxFieldIndex = Math.max(maxFieldIndex, fieldIndex);

            if (typeof segmentData[key] === 'object') {
                // Skip fields where all components are empty
                if (this._isCompletelyEmpty(segmentData[key])) {
                    continue;
                }
                
                if (!fields[fieldIndex]) {
                    fields[fieldIndex] = {};
                }
                let maxComponentIndex = 0;
                for (const subKey in segmentData[key]) {
                    const subParts = subKey.split('.');
                    const componentIndex = parseInt(subParts[2], 10);
                    maxComponentIndex = Math.max(maxComponentIndex, componentIndex);
                    fields[fieldIndex][componentIndex] = segmentData[key][subKey];
                }
                fields[fieldIndex].maxComponent = maxComponentIndex;
            } else {
                fields[fieldIndex] = segmentData[key];
            }
        }

        for (let i = 1; i <= maxFieldIndex; i++) {
            if (fields[i]) {
                if (typeof fields[i] === 'object') {
                    // Skip if all components are empty
                    let allComponentsEmpty = true;
                    for (let j = 1; j <= fields[i].maxComponent; j++) {
                        if (fields[i][j] && fields[i][j] !== '') {
                            allComponentsEmpty = false;
                            break;
                        }
                    }
                    if (allComponentsEmpty) {
                        segment += '';
                    } else {
                        let componentString = '';
                        for (let j = 1; j <= fields[i].maxComponent; j++) {
                            componentString += fields[i][j] || '';
                            if (j < fields[i].maxComponent) {
                                componentString += this.HL7componentDelimeter;
                            }
                        }
                        segment += componentString;
                    }
                } else {
                    segment += fields[i] || '';
                }
            }

            if (i < maxFieldIndex) {
                segment += this.HL7fieldDelimeter;
            }
        }
        return segment;
    }


}

module.exports = HL7Converter;
