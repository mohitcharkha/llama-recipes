const rootPrefix = "../..",
  database = require(rootPrefix + "/lib/globalConstant/database");
const dbName = database.mainDbName;

const upQueries = [
  "ALTER TABLE transactions_details ADD COLUMN total_events INT DEFAULT 0;",
  "ALTER TABLE transactions_details ADD COLUMN total_decoded_events INT DEFAULT 0;",
  "ALTER TABLE transactions_details ADD COLUMN is_highlighted_event_decoded BOOLEAN DEFAULT false;"
];

const downQueries = [
  "ALTER TABLE transaction_logs DROP COLUMN total_events;",
  "ALTER TABLE transaction_logs DROP COLUMN total_decoded_events;",
  "ALTER TABLE transaction_logs DROP COLUMN is_highlighted_event_decoded;"
];

const modifyTransactionLogsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ["transaction_logs"],
};

module.exports = modifyTransactionLogsTable;
