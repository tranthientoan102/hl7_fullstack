i want to implement a ConvertingChannel class. 

First let's start with how it will be configured
- i want its config to be save in a yaml file name 'ConvertingChannel.yaml'
- a project can have multiple ConvertingChannel, so they will be stored in a array
- for each config, it would have:
    - name: name of the channel
    - sourceConfig:
        - backupFolderFullPath: path to the backup folder
        - type: there will be 1 options for now: fromFile, but more will come in near future
        - if fromFile, it would have:
            - folderFullPath: path to the folder
            - interval_ms: interval in milliseconds to look for new file
    - HL7Converter's constructor config
    - outputConfig: 
        - type: there will be 2 options for now: writeFile and sendToClient
        - if writeFile, it would have:
            - folderFullPath: path to the folder
        - if sendToClient, it would have:
            - clientIP: IP address of the client
            - clientPort: port of the client

Next, i want to update index.js to 
- load the config and create the ConvertingChannel instances when starting the app

Now let's implement the ConvertingChannel and SourceConnector and OutputConnector classes
- SourceConnector class:
    - constructor: accept the sourceConfig
    - method isNewDataAvailable:
        - if constructor's type is fromFile, it will scan the file from {folderFullPath}
            - if there's new file, return TRUE
            - else return FALSE
    - method getData:
        - if constructor's type is fromFile, it will return the parsed content of the file (using csv-parser)
    - method backup:
        - it will backup the data to {backupFolderFullPath}
        - if constructor's type is fromFile, it will backup the file to {backupFolderFullPath}/{fileName}_{timestamp}.csv
- OutputConnector class:
    - constructor: accept the outputConfig
    - method sendOutput:
        - if constructor's type is writeFile, it will write the data to the file at {folderFullPath}/{fileName}_{timestamp}.hl7
        - if constructor's type is sendToClient, it will send the data to the client at {clientIP}:{clientPort}
- ConvertingChannel class:
    - it will have a constructor that accept the all configs of the sourceConfig, HL7Converter's constructor config and outputConfig
    - it will have a method named start that will start the channel
        - it will initialise the SourceConnector and HL7Converter and OutputConnector instances
    - it will have a method named stop that will stop the channel
        - it will destroy the SourceConnector and HL7Converter and OutputConnector instances
    - process:
        - save channel running status in a variable, default to STOPPED
        - main task:
            - execute SourceConnector.isNewDataAvailable
            - if there's new data, execute 
                - SourceConnector.backup
                - HL7Converter.convert 
                - and HL7Converter.toHL7 
                - and OutputConnector.sendOutput
        - while channel running status is RUNNING:
            - save next scanning time in a variable, default to current time
            - while channel running status is RUNNING:
                - update next scanning time to current time + {SourceConnector.interval_ms}
                - run main task
                - if current time is greater than next scanning time, run main task immediately
                - else, wait until next scanning time

I want to add a mechanism in index.js that:
- it will watch for changes in ConvertingChannel.yaml
- if there's change, it will reload the config and restart the channels