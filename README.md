# google-playstore-stats-viewer

> View basic stats like installs/downloads, uninstall, active users events

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