/* eslint-disable no-process-env */

/**
 * Class for core constants.
 *
 * @class CoreConstants
 */
class CoreConstants {

  get etherscanApiKey() {
    return process.env.ETHERSCAN_API_KEY;
  }

  get dbSuffix() {
    return process.env.A_DB_SUFFIX;
  }

  get environmentShort() {
    return process.env.A_ENVIRONMENT.substring(0, 2);
  }

  get DEFAULT_LOG_LEVEL() {
    return process.env.A_DEFAULT_LOG_LEVEL;
  }


  // MySql constants.
  get MYSQL_CONNECTION_POOL_SIZE() {
    return process.env.A_MYSQL_CONNECTION_POOL_SIZE;
  }

  // Main db
  get MAIN_DB_MYSQL_HOST() {
    return process.env.A_MAIN_DB_MYSQL_HOST;
  }

  get MAIN_DB_MYSQL_USER() {
    return process.env.A_MAIN_DB_MYSQL_USER;
  }

  get MAIN_DB_MYSQL_PASSWORD() {
    return process.env.A_MAIN_DB_MYSQL_PASSWORD;
  }
}

module.exports = new CoreConstants();
