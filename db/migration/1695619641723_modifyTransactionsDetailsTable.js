const rootPrefix = "../..",
  database = require(rootPrefix + "/lib/globalConstant/database");
const dbName = database.mainDbName;

const upQueries = [
  "ALTER TABLE transactions_details ADD COLUMN temp_logs_data JSON;",
];

const downQueries = [
  "ALTER TABLE transactions_details DROP COLUMN temp_logs_data;",
];

const modifyTransactionLogsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ["transactions_details"],
};

module.exports = modifyTransactionLogsTable;
