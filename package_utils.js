const fs = require("fs");
const path = require("path");
const csv = require("@fast-csv/parse");
const workingDir = "tempCsvFiles/";
const { Storage } = require("@google-cloud/storage");
const util = require("util");
const readFilePromise = util.promisify(fs.readFile);

module.exports = class PackageUtils {

    async createAuthenticatedStorageObject({keyPath, projectID}) {
        if (this.authenticatedStorageObj) return; //Ignore if already initialised.
        const keyFile = JSON.parse(
            await readFilePromise(keyPath)
        );
        return this.authenticatedStorageObj = this.getAuthenticatedStorage({
            key: keyFile,
            projectID: projectID
        });
    }

  getAuthenticatedStorage = ({key, projectID}) =>
    new Storage({
      scopes: "https://www.googleapis.com/auth/devstorage.read_only",
      credentials: {
        client_email: key.client_email,
        private_key: key.private_key
      },
      projectId: projectID
    });

  findSumTotalOfValues = async ({
    cleanedArrayWithRequiredFileNames,
    packageName
  }) => {
    let sumPromises = [];

    cleanedArrayWithRequiredFileNames.forEach(path => {
      sumPromises.push(
        this.getTotals(workingDir + packageName + getLocalFileName(path))
      );
    });

    sumPromises = await Promise.all(sumPromises);

    //Read the last overview file to get the last updated value for active users
    const currentlyActiveDevices = await this.getTotalActiveUsers(
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
          accum.totalInstallEventsDetected +=
            element.totalInstallEventsDetected;
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

  getWorkingDir = () => workingDir;

  getCorrectFiles = ({buketName, packageName, type = "installs"}) => this.authenticatedStorageObj
      .bucket(buketName)
      .getFiles({
          prefix: `stats/${type}/${type}_${
              packageName
          }_`
      });

  downloadCsvFiles = async ({
    bucketName,
    packageName,
    files,
      dimension = "overview",
      targetLocation = workingDir + packageName
  }) => {
    const downloadPromise = [];
    const cleanedArrayOfRequiredFileNames = [];

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      if (file.name && file.name.endsWith(`_${dimension}.csv`)) {
        downloadPromise.push(
          this.authenticatedStorageObj
            .bucket(bucketName)
            .file(file.name)
            .download({
              destination:
                targetLocation + getLocalFileName(file.name)
            })
        );
        cleanedArrayOfRequiredFileNames.push(file.name);
      }
    }

    await Promise.all(downloadPromise);
    return cleanedArrayOfRequiredFileNames;
  };

  getTotals = fileName => {
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

  getTotalActiveUsers = fileName => {
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
};

const deleteFolderRecursive = function(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach(file => {
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
