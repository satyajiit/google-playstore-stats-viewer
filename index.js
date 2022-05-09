const { Storage } = require("@google-cloud/storage");
const fs = require("fs");
const csv = require("@fast-csv/parse");
const util = require("util");
const readFilePromise = util.promisify(fs.readFile);
const workingDir = "tempCsvFiles/";
const path = require("path");

const getAuthenticatedStorage = (key, projectID) =>
  new Storage({
    scopes: "https://www.googleapis.com/auth/devstorage.read_only",
    credentials: {
      client_email: key.client_email,
      private_key: key.private_key
    },
    projectId: projectID
  });

const findSumTotalOfValues = async ({
  cleanedArrayWithRequiredFileNames,
  packageName
}) => {
  let sumPromises = [];

  cleanedArrayWithRequiredFileNames.forEach(path => {
    sumPromises.push(
      getTotals(workingDir + packageName + getLocalFileName(path))
    );
  });

  sumPromises = await Promise.all(sumPromises);

  //Read the last overview file to get the last updated value for active users
  const currentlyActiveDevices = await getTotalActiveUsers(
    workingDir +
      packageName +
      getLocalFileName(
        cleanedArrayWithRequiredFileNames[
          cleanedArrayWithRequiredFileNames.length - 1
        ]
      )
  );

  //clean up temp files
  deleteFolderRecursive(workingDir);

  return {
    currentlyActiveDevices: currentlyActiveDevices,
    ...sumPromises.reduce(
      (accum, element) => {
        accum.totalInstallCountByUser += element.totalInstallCountByUser;
        accum.totalUninstallCountByUser += element.totalUninstallCountByUser;
        accum.totalInstallEventsDetected += element.totalInstallEventsDetected;
        accum.totalUninstallEventsDetected +=
          element.totalUninstallEventsDetected;
        return accum;
      },
      {
        totalInstallCountByUser: 0,
        totalUninstallCountByUser: 0,
        totalInstallEventsDetected: 0,
        totalUninstallEventsDetected: 0
      }
    )
  };
};

const deleteFolderRecursive = function(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file, index) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
};

const downloadOverviewCsvFiles = async ({
  storage,
  bucketName,
  packageName,
  files
}) => {
  const downloadPromise = [];
  const cleanedArrayOfRequiredFileNames = [];

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (file.name.endsWith("_overview.csv")) {
      downloadPromise.push(
        storage
          .bucket(bucketName)
          .file(file.name)
          .download({
            destination: workingDir + packageName + getLocalFileName(file.name)
          })
      );
      cleanedArrayOfRequiredFileNames.push(file.name);
    }
  }

  await Promise.all(downloadPromise);
  return cleanedArrayOfRequiredFileNames;
};

/**
 *
 * @param keyFilePath - Path to service account json file
 * @param packageName - Target app package name
 * @param projectID - The Google Cloud Project ID, where the service account key is created
 * @param bucketName - Bucket name of the Google Play store reporting,
 * Where to find?
 * 1. Go to your play console
 * 2. Download reports
 * 3. Navigate to statistics
 * 4. Look for "copy cloud storage URI"
 * Example: gs://pubsite_prod_xxxxxxx/stats/installs/
 * use the value "pubsite_prod_xxxxxxx"
 *
 */
const getAppStats = async ({
  keyFilePath,
  packageName,
  projectID,
  bucketName
}) => {
  try {
    const keyFile = JSON.parse(await readFilePromise(keyFilePath));
    const authenticatedStorageObj = getAuthenticatedStorage(keyFile, projectID);

    const [files] = await authenticatedStorageObj.bucket(bucketName).getFiles({
      prefix: `stats/installs/installs_${packageName}_`
    });

    //Create working dir, if not exist
    if (!fs.existsSync(workingDir + packageName))
      fs.mkdirSync(workingDir + packageName, { recursive: true });

    //downloads all required csv files - overview files,
    //Other possible files can be https://support.google.com/googleplay/android-developer/?p=stats_export ,
    //check "Commands and file formats for aggregated reports"
    const cleanedArrayOfFileNames = await downloadOverviewCsvFiles({
      storage: authenticatedStorageObj,
      files: files,
      packageName: packageName,
      bucketName: bucketName
    });

    return findSumTotalOfValues({
      cleanedArrayWithRequiredFileNames: cleanedArrayOfFileNames,
      packageName: packageName
    });
  } catch (e) {
    throw e
  }

};

const getLocalFileName = path => path.substring(path.lastIndexOf("/"));

const getParsedInt = data => {
  try {
    data = data.replace(/[^0-9]/g, "");
    data = parseInt(data);
  } catch (e) {
    data = 0;
  }
  return data || 0;
};

const getTotals = fileName => {
  return new Promise((resolve, reject) => {
    let {
      totalInstallCountByUser,
      totalUninstallCountByUser,
      totalInstallEventsDetected,
      totalUninstallEventsDetected
    } = {
      totalInstallCountByUser: 0,
      totalUninstallCountByUser: 0,
      totalInstallEventsDetected: 0,
      totalUninstallEventsDetected: 0
    };
    csv
      .parseFile(fileName)
      .on("error", error => reject(error.message))
      .on("data", row => {
        let n = getParsedInt(row[6]); //TOTAL INSTALLS - USERS
        let n2 = getParsedInt(row[7]); //TOTAL UNINSTALLS - USERS
        let n3 = getParsedInt(row[8]); //INSTALL EVENTS
        let n4 = getParsedInt(row[11]); //UN-INSTALL EVENTS

        totalInstallCountByUser += n;
        totalUninstallCountByUser += n2;
        totalInstallEventsDetected += n3;
        totalUninstallEventsDetected += n4;
      })
      .on("end", () => {
        resolve({
          totalInstallCountByUser,
          totalUninstallCountByUser,
          totalInstallEventsDetected,
          totalUninstallEventsDetected
        });
      });
  });
};

const getTotalActiveUsers = fileName => {
  return new Promise((resolve, reject) => {
    let totalActiveDevices = 0;
    csv
      .parseFile(fileName)
      .on("error", error => reject(error.message))
      .on("data", row => {
        let n = row[8];
        try {
          n = n.replace(/[^0-9]/g, "");
          n = parseInt(n);
        } catch (e) {
          n = 0;
        }

        if (n) totalActiveDevices = n;
      })
      .on("end", () => {
        resolve(totalActiveDevices);
      });
  });
};

exports.appBasicStats = async ({
  keyFilePath,
  packageName,
  projectID,
  bucketName
}) => {
  return await getAppStats({ keyFilePath, packageName, projectID, bucketName });
};
