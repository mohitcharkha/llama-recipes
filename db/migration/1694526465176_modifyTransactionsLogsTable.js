const rootPrefix = "../..",
  database = require(rootPrefix + "/lib/globalConstant/database");
const dbName = database.mainDbName;

const upQueries = [
  "ALTER TABLE transaction_logs ADD COLUMN info_data JSON NULL;",
];

const downQueries = ["ALTER TABLE transaction_logs DROP COLUMN info_data;"];

const modifyTransactionLogsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ["transaction_logs"],
};

module.exports = modifyTransactionLogsTable;
