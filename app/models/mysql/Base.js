const rootPrefix = '../../..',
  MysqlQueryBuilders = require(rootPrefix + '/lib/queryBuilders/Mysql'),
  mysqlWrapper = require(rootPrefix + '/lib/mysqlWrapper'),
  basicHelper = require(rootPrefix + '/helpers/basic');

/**
 * Class for models base.
 *
 * @class ModelBase
 */
class ModelBase extends MysqlQueryBuilders {
  /**
   * Constructor for models base.
   *
   * @param {object} params
   * @param {string} params.dbName
   *
   * @augments MysqlQueryBuilders
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.dbName = params.dbName;
  }

  /**
   * Connection pool to use for read query.
   *
   * @return {*}
   */
  onReadConnection() {
    return mysqlWrapper.getPoolFor(this.dbName, 'slave');
  }

  /**
   * Connection pool to use for write query.
   *
   * @return {*}
   */
  onWriteConnection() {
    return mysqlWrapper.getPoolFor(this.dbName, 'master');
  }

  /**
   * Connection pool to use when host is dynamic
   *
   * @return {*}
   */
  onDynamicHostConnection(dynamicMysqlHost) {
    return mysqlWrapper.getPoolForDynamicHost(this.dbName, 'master', undefined, { host: dynamicMysqlHost });
  }

  /**
   * Fire the query.
   *
   * @return {Promise<any>}
   */
  fire() {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      const queryGenerator = oThis.generate();

      return oThis.executeMysqlQuery(onResolve, onReject, queryGenerator, { retryOnDeadlock: true });
    });
  }

  /**
   * Fire the query.
   *
   * @return {Promise<any>}
   */
  fireOnRead() {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      const queryGenerator = oThis.generate();

      return oThis.executeMysqlQuery(onResolve, onReject, queryGenerator, { retryOnDeadlock: true, queryOnRead: true });
    });
  }

  /**
   * Raw query for dynamic host.
   *
   * @param {string} query
   *
   * @return {Promise<any>}
   */
  async queryForDynamicHost(dynamicMysqlHost, query) {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      const connection = oThis.onDynamicHostConnection(dynamicMysqlHost);
      connection.query(query, {}, function(error, result) {
        if (error) {
          onReject(error);
        } else {
          onResolve(result);
        }
      });
    });
  }

  /**
   * Run the query in mysql.
   *
   * @return {Promise<any>}
   */
  async executeMysqlQuery(onResolve, onReject, queryGenerator, options) {
    const oThis = this,
      preQuery = Date.now();

    let qry;

    if (options.queryOnRead) {
      qry = oThis.onReadConnection();
    } else {
      qry = oThis.onWriteConnection();
    }

    qry = qry.query(queryGenerator.data.query, queryGenerator.data.queryData, async function(err, result, fields) {
      console.info('(' + (Date.now() - preQuery) + ' ms)');
      if (err) {
        onReject(err);
      } else {
        result.defaultUpdatedAttributes = queryGenerator.data.defaultUpdatedAttributes;
        onResolve(result);
      }
    });
  }

  /**
   * Convert Bitwise to enum values.
   *
   * @param {string} bitwiseColumnName
   * @param {number} bitwiseColumnValue
   *
   * @returns {array}
   */
  getBitwiseArray(bitwiseColumnName, bitwiseColumnValue) {
    const oThis = this;
    if (!oThis.bitwiseConfig) {
      throw new Error('Bitwise Config not defined');
    }

    const config = oThis.bitwiseConfig[bitwiseColumnName],
      arr = [];

    if (!config) {
      throw new Error(`Bitwise Config for ${bitwiseColumnValue} not defined`);
    }

    Object.keys(config).forEach((key) => {
      const value = config[key];
      if ((bitwiseColumnValue & key) == key) {
        arr.push(value);
      }
    });

    return arr;
  }




  /**
   * List of formatted column names that can be exposed by service.
   *
   * @returns {array}
   */
  safeFormattedColumnNames() {
    return ['id', 'createdAt', 'updatedAt'];
  }

  /**
   * Returns formatted object with columns that can be safely exposed.
   *
   * @param {object} formattedRow
   *
   * @returns {object}
   */
  safeFormattedData(formattedRow) {
    const oThis = this;

    const safeData = {},
      safeFormattedColumnNamesArr = oThis.safeFormattedColumnNames();

    for (let index = 0; index < safeFormattedColumnNamesArr.length; index++) {
      const colName = safeFormattedColumnNamesArr[index];
      safeData[colName] = formattedRow[colName];
    }

    return safeData;
  }



//   /**
//    * Check for duplicate index violation.
//    *
//    * @param {string} indexName
//    * @param {object} mysqlErrorObject
//    *
//    * @returns {boolean}
//    */
//   static isDuplicateIndexViolation(indexName, mysqlErrorObject) {
//     return (
//       mysqlErrorObject.code === mysqlErrorConstants.duplicateError && mysqlErrorObject.sqlMessage.includes(indexName)
//     );
//   }

}

module.exports = ModelBase;