const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  database = require(rootPrefix + '/lib/globalConstant/database');

const mysqlConfig = {
  commonNodeConfig: {
    connectionLimit: coreConstants.MYSQL_CONNECTION_POOL_SIZE,
    charset: 'utf8mb4',
    bigNumberStrings: true,
    supportBigNumbers: true,
    dateStrings: true,
    debug: false
  },
  commonClusterConfig: {
    canRetry: true,
    removeNodeErrorCount: 5,
    restoreNodeTimeout: 10000,
    defaultSelector: 'RR'
  },
  clusters: {
    mainDbCluster: {
      master: {
        host: coreConstants.MAIN_DB_MYSQL_HOST,
        user: coreConstants.MAIN_DB_MYSQL_USER,
        password: coreConstants.MAIN_DB_MYSQL_PASSWORD
      }
    }
  },
  databases: {}
};

mysqlConfig.databases[database.mainDbName] = ['mainDbCluster'];

module.exports = mysqlConfig;
