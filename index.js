const fs = require("fs");
const InputParamsModel = require("./models/InputParamsModel");
const PackageUtils = require("./package_utils");
const Dimensions = require("./enums/Dimensions");

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

    //used to query data based on specific dimension parameters like app_version, language etc
    //For more: https://support.google.com/googleplay/android-developer/?p=stats_export , check "supported dimensions"
    //This is just being used as a ENUM , lol
    this.Dimensions = Dimensions;
  }

  //change/update package name, subsequent calls will use the new packageID
  setPackageName({ packageName }) {
    this.inputParamsModel.packageName = packageName;
  }

  async getAppStats() {
    try {
      await this.packageUtils.createAuthenticatedStorageObject({
        keyPath: this.inputParamsModel.keyFilePath,
        projectID: this.inputParamsModel.projectID
      });

      if (!this.files || this.files.length < 1)
        [this.files] = await this.packageUtils.getCorrectFiles({
          buketName: this.inputParamsModel.bucketName,
          packageName: this.inputParamsModel.packageName
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
      const cleanedArrayOfFileNames = await this.packageUtils.downloadCsvFiles({
        bucketName: this.inputParamsModel.bucketName,
        packageName: this.inputParamsModel.packageName,
        files: this.files
      });

      return this.packageUtils.findSumTotalOfValues({
        cleanedArrayWithRequiredFileNames: cleanedArrayOfFileNames,
        packageName: this.inputParamsModel.packageName
      });
    } catch (e) {
      throw e;
    }
  }

  /**
   *
   * @param dimension - can be one of the value from "dimensions"
   * @param targetLocation - Target directory, where the files will be downloaded
   * @returns {Promise<*>} - Array of downloaded file names
   */
  async downloadAppStats({ dimension, targetLocation }) {
    try {
      await this.packageUtils.createAuthenticatedStorageObject({
        keyPath: this.inputParamsModel.keyFilePath,
        projectID: this.inputParamsModel.projectID
      });

      //Get files first
      if (!this.files || this.files.length < 1)
        [this.files] = await this.packageUtils.getCorrectFiles({
          buketName: this.inputParamsModel.bucketName,
          packageName: this.inputParamsModel.packageName
        });

      //Create working dir, if not exist
      if (
        !fs.existsSync(targetLocation + "/" + this.inputParamsModel.packageName)
      )
        fs.mkdirSync(targetLocation + "/" + this.inputParamsModel.packageName, {
          recursive: true
        });

      return await this.packageUtils.downloadCsvFiles({
        files: this.files,
        packageName: this.inputParamsModel.packageName,
        bucketName: this.inputParamsModel.bucketName,
        dimension: dimension,
        targetLocation: targetLocation + "/" + this.inputParamsModel.packageName
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
 * const GooglePlayStoreStatsViewer = require("google-playstore-stats-viewer");
 * const statsViewer = new GooglePlayStoreStatsViewer({
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
