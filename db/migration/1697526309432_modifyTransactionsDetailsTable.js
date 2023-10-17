const rootPrefix = "../..",
  database = require(rootPrefix + "/lib/globalConstant/database");
const dbName = database.mainDbName;

const upQueries = [
  "ALTER TABLE transactions_details ADD COLUMN analysis_details JSON AFTER temp_logs_data;"
];

const downQueries = [
  "ALTER TABLE transactions_details DROP COLUMN analysis_details;"
];

const modifyTransactionLogsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ["transactions_details"]
};

module.exports = modifyTransactionLogsTable;
