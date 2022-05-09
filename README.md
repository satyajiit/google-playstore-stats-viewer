# google-playstore-stats-viewer

> View basic stats like installs/downloads, uninstall, active users events

[![Maintenance](https://img.shields.io/badge/Maintained%3F-YES-blueviolet.svg)](#)
[![GPLv3 license](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)
[![Generic badge](https://img.shields.io/badge/Stable-YES-<COLOR>.svg)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](#)

[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](#)
[![forthebadge](https://forthebadge.com/images/badges/makes-people-smile.svg)](#)
[![forthebadge](https://forthebadge.com/images/badges/powered-by-electricity.svg)](#)
[![forthebadge](https://forthebadge.com/images/badges/ages-12.svg)](#)



#### SUPPORT THE WORK & DEV

[![GitHub stars](https://img.shields.io/github/forks/satyajiit/google-playstore-stats-viewer?style=social)](https://github.com/satyajiit/google-playstore-stats-viewer/network) &nbsp;
[![GitHub stars](https://img.shields.io/github/stars/satyajiit/google-playstore-stats-viewer?style=social)](https://github.com/satyajiit/google-playstore-stats-viewer/stargazers)
&nbsp;
[![GitHub followers](https://img.shields.io/github/followers/satyajiit?style=social&label=Follow&maxAge=2592000)](https://github.com/satyajiit?tab=followers)

## Authentication

Steps to get your service account file from Google Cloud Platform

- Go to your GCP Project https://console.cloud.google.com/iam-admin/serviceaccounts (Create gcp project if you don't have one)
- Create service account (In 3rd step you will get option to create the key), store that key, that will be used access your app data statistics
- Go to https://play.google.com/apps/publish
- Go to Users and Permissions -> Invite new user -> Add the email (Service account email)
- Now, Grant permission to service account we created (Choose permission - "View app information and download bulk reports (read-only)") -> click Add user 

> It can take upto 24 hours to grant permission to service account, so don't worry if you get authentication error

## Bucket Name

Steps to find bucket name

- Go to your play console
- Navigate to Download reports -> Statistics 
- Click "Copy cloud storage URI , Example: gs://pubsite_prod_xxxxx/stats/installs/"
- Use only "pubsite_prod_xxxxx" as the bucket name

## Install

```
npm install -g google-playstore-stats-viewer
```

or

```
yarn global add google-playstore-stats-viewer
```

## Usage

Use the CLI

```bash
playstore-stats \
    -p=com.example.app \
    -k=KEY_FILE_LOCATION \
    -g=YOUR_GCP_PROJECT_ID \
    -b=pubsite_prod_xxxx
```

or the JavaScript API

```javascript
const playstore = require('google-playstore-stats-viewer');

try {
    const data = await playstore.appBasicStats({
        keyFilePath: "PATH_TO_KEY_FILE",
        packageName: "com.example.app",
        projectID: "GCP_PROJECT_ID",
        bucketName: "pubsite_prod_xxxx"});
    console.log(data);
} catch (e) {
  console.log(e);
}
```


## Use cases

What are the possible usage of this package?

- Create API based, stats fetch
- When you have multiple apps hosted on playstore
- Integration with custom dashboard


### Do more
Modify the source to support more methods like reviews, crashes and more.
https://support.google.com/googleplay/android-developer/?p=stats_export

This project uses:
- [google-cloud/storage](https://www.npmjs.com/package/@google-cloud/storage)
- [fast-csv/parse](https://www.npmjs.com/package/@fast-csv/parse)
- [yargs](https://www.npmjs.com/package/vargs)