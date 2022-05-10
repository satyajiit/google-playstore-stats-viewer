const fs = require("fs");
const util = require("util");
const readFilePromise = util.promisify(fs.readFile);
const InputParamsModel = require("./models/InputParamsModel");
const PackageUtils = require("./package_utils");

module.exports = class GooglePlayStoreStatsViewer {
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
  constructor({ keyFilePath, packageName, projectID, bucketName }) {
    this.inputParamsModel = new InputParamsModel({
      keyFilePath,
      packageName,
      projectID,
      bucketName
    });
    this.packageUtils = new PackageUtils();
  }

  async createAuthenticatedStorageObject() {
    if (this.authenticatedStorageObj) return; //Ignore if already initialised.
    const keyFile = JSON.parse(
      await readFilePromise(this.inputParamsModel.keyFilePath)
    );
    this.authenticatedStorageObj = this.packageUtils.getAuthenticatedStorage(
      keyFile,
      this.inputParamsModel.projectID
    );
  }

  //change/update package name, subsequent calls will use the new packageID
  setPackageName({ packageName }) {
    this.inputParamsModel.packageName = packageName;
  }

  async getAppStats() {
    await this.createAuthenticatedStorageObject();
    try {
      const [files] = await this.authenticatedStorageObj
        .bucket(this.inputParamsModel.bucketName)
        .getFiles({
          prefix: `stats/installs/installs_${
            this.inputParamsModel.packageName
          }_`
        });

      //Create working dir, if not exist
      if (
        !fs.existsSync(
          this.packageUtils.getWorkingDir() + this.inputParamsModel.packageName
        )
      )
        fs.mkdirSync(
          this.packageUtils.getWorkingDir() + this.inputParamsModel.packageName,
          {
            recursive: true
          }
        );

      //downloads all required csv files - overview files,
      //Other possible files can be https://support.google.com/googleplay/android-developer/?p=stats_export ,
      //check "Commands and file formats for aggregated reports"
      const cleanedArrayOfFileNames = await this.packageUtils.downloadOverviewCsvFiles(
        {
          storage: this.authenticatedStorageObj,
          files: files,
          packageName: this.inputParamsModel.packageName,
          bucketName: this.inputParamsModel.bucketName
        }
      );

      return this.packageUtils.findSumTotalOfValues({
        cleanedArrayWithRequiredFileNames: cleanedArrayOfFileNames,
        packageName: this.inputParamsModel.packageName
      });
    } catch (e) {
      throw e;
    }
  }
};

/**
 * @deprecated Since version 1.0.2 Will be deleted in version 1.0.5 Use class instead.
 *
 * Example code:
 * const gpsv = require("google-playstore-stats-viewer");
 * const statsViewer = gpsv.GooglePlayStoreStatsViewer({
 *         keyFilePath: "PATH_TO_KEY_FILE",
 *         packageName: "com.example.app",
 *         projectID: "GCP_PROJECT_ID",
 *         bucketName: "pubsite_prod_xxxx"
 * })
 *
 * To use:
 * statsViewer.getAppStats();
 *
 */
exports.appBasicStats = async ({
  keyFilePath,
  packageName,
  projectID,
  bucketName
}) => {
  return new GooglePlayStoreStatsViewer({
    keyFilePath,
    packageName,
    projectID,
    bucketName
  }).getAppStats();
};
