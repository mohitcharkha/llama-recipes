const rootPrefix = "../..",
  database = require(rootPrefix + "/lib/globalConstant/database");
const dbName = database.mainDbName;

const upQueries = [
  "CREATE TABLE `transaction_logs` ( \n" +
    "  `id` bigint(20) NOT NULL AUTO_INCREMENT, \n" +
    "  `tx_hash` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n" +
    "  `block_number` bigint(20) NOT NULL, \n" +
    "  `data` JSON  NULL,\n" +
    "  `decode_status` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n" +
    "  `decoded_events` JSON  NULL,\n" +
    "  `decoded_input` JSON  NULL,\n" +
    "  `created_at` int(11) NOT NULL, \n" +
    "  `updated_at` int(11) NOT NULL, \n" +
    "  PRIMARY KEY (`id`), \n" +
    "  UNIQUE KEY `uk_tx_hash` (`tx_hash`) \n" +
    ") ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;",
];

const downQueries = ["DROP TABLE if exists `transaction_logs`;"];

const createTransactionLogsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ["transaction_logs"],
};

module.exports = createTransactionLogsTable;
