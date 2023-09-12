const rootPrefix = "../..",
  database = require(rootPrefix + "/lib/globalConstant/database");
const dbName = database.mainDbName;

const upQueries = [
  "ALTER TABLE transaction_logs ADD COLUMN status varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL;",
];

const downQueries = ["ALTER TABLE transaction_logs DROP COLUMN status;"];

const modifyTransactionLogsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ["transaction_logs"],
};

module.exports = modifyTransactionLogsTable;
