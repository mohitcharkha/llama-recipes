const rootPrefix = '../..',
  database = require(rootPrefix + '/lib/globalConstant/database');
const dbName = database.mainDbName;

const upQueries = [
  'CREATE TABLE `transactions` ( \n' +
    '  `id` bigint(20) NOT NULL AUTO_INCREMENT, \n' +
    '  `tx_hash` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `data` JSON  NULL,\n' +
    '  `from_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `to_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `type` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `input` LONGTEXT CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `created_at` int(11) NOT NULL, \n' +
    '  `updated_at` int(11) NOT NULL, \n' +
    '  PRIMARY KEY (`id`), \n' +
    '  UNIQUE KEY `uk_tx_hash` (`tx_hash`) \n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;'
];

const downQueries = ['DROP TABLE if exists `transactions`;'];

const createTransactionsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ['transactions']
};

module.exports = createTransactionsTable;
