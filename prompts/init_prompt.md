i want to build a full stack NodeJS application
- db: SQLite
- backend: Express
- frontend: React

i want to start first with  Core service: HL7Converter
- goal: convert CSV data to HL7 format
- input format: CSV file with headers as set of {HL7segment}{CSVHeaderDelimeter}{HL7field}{CSVHeaderDelimeter}{HL7component}
- methods:
  - constructor: 
    - accept params for:
      - CSVHeaderDelimeter, default: "_"
      - HL7fieldDelimeter, default: "|"
      - HL7componentDelimeter, default: "^"
      - compressedSegmentDelimeter, default: "[ENDOFSEGMENT]"
      - compressedFieldDelimeter, default: "[ENDOFFIELD]"
    - if no param given, use default 

  - method convert
    - input: CSV line already parsed by csv-parser
    - process:
      - validate headers numbers and columns size
      - convert to JS object
        - for each row
          - if segment is not OBX (data will be in normal format)
            - create HL7 segment
            - example: 
              - input: column PID_3_1 has value "1234567890" and PID_3_5 has value "PID_3_5_value"
              - output: JS object that
                PID: {
                  PID.3: {
                    PID.3.1: "1234567890"
                    PID.3.5: "PID_3_5_value"
                  }
                }
          - if segment is OBX:(data will be in compressed format, meaning multiple OBX segments are compressed into one, using {compressedSegmentDelimeter} and {compressedFieldDelimeter})
            - init empty array
            - separate segments by {compressedSegmentDelimeter}
            - for each segment, separate fields by {compressedFieldDelimeter}
              - each segment will have exactly 5 fields
              - if more or less, skip progessing and log a WARN
              - if 5th field is null or empty, skip progessing
              - current OBX segment count is stored in a variable
              - mapping of fields into a OBX segment:
                {
                    OBX.1: {current OBX segment count}
                    OBX.2: {field 1}
                    OBX.3: {
                        OBX.3.1:{field 2}
                        OBX.3.2:{field 3}
                        OBX.3.3:{field 4}
                    }
                    OBX.5: {field 5}
                }
              - push to array
            - updata JS object using key OBX and value is processed array
    - output: JS object
  - method toHL7
    - input: JS object
    - process:
      - for all keys in JS object
        - if key is not OBX
          - implemtent in separate method named toHL7Normal
          - create HL7 segment
          - for fields / components that dont have value, put empty string 
          - example: 
            - input: key PID has PID.3.1="1234567890" and PID.3.5="PID_3_5_value"
            - output: PID segment equal
              PID|1234567890^^^^PID_3_5_value
        - if key is OBX
          - for each of array in key OBX, reuse method toHL7Normal 
          - example: 
            - input: key OBX has array of objects
                [
                    {
                        OBX.1: "1"
                        OBX.2: "1st_OBX.2.1_value"
                        OBX.3: {
                            OBX.3.1: '1st_OBX.3.1_value'
                            OBX.3.2: '1st_OBX.3.2_value'
                            OBX.3.3: '1st_OBX.3.3_value'
                        }
                        OBX.5: '1st_OBX.5_value'
                    },
                    {
                        OBX.1: "2"
                        OBX.2: "2nd_OBX.2.1_value"
                        OBX.3: {
                            OBX.3.1: '2nd_OBX.3.1_value'
                            OBX.3.2: '2nd_OBX.3.2_value'
                            OBX.3.3: '2nd_OBX.3.3_value'
                        }
                        OBX.5: '2nd_OBX.5_value'
                    }
                ]
            - output: 2 OBX segments equal
              OBX|1|1st_OBX.2.1_value|1st_OBX.3.1_value^1st_OBX.3.2_value^1st_OBX.3.3_value||1st_OBX.5_value
              OBX|2|2nd_OBX.2.1_value|2nd_OBX.3.1_value^2nd_OBX.3.2_value^2nd_OBX.3.3_value||2nd_OBX.5_value
    - output: HL7 message contains all segments