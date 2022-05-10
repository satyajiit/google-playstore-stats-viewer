#!/usr/bin/env node

const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .option('g', {
        alias: 'projectID',
        type: 'string',
        describe: 'Google cloud project id, where the service account is created'
    })
    .option('p', {
        alias: 'packageName',
        type: 'string',
        describe: 'Target app package name'
    })
    .option('b', {
        alias: 'bucketName',
        type: 'string',
        describe: 'Bucket name, check Google play console -> Download reports -> Statistics -> Cloud storage URI'
    })
    .option('k', {
        alias: 'key',
        type: 'string',
        describe: 'Service account file path',
        demand: true
    }).help('h').argv;


const options = {
    projectID: argv.projectID,
    keyFilePath: argv.key,
    bucketName: argv.bucketName,
    packageName: argv.packageName
};

const Core = require('./index');
new Core.GooglePlayStoreStatsViewer(options).getAppStats().catch(err => {
    console.error(err);
    process.exit(1);
}).then(obj => console.log(obj));