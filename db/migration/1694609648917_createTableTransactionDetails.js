const rootPrefix = '../..',
  database = require(rootPrefix + '/lib/globalConstant/database');
const dbName = database.mainDbName;

const upQueries = [
  'CREATE TABLE `transactions_details` ( \n' +
    '  `id` bigint(20) NOT NULL AUTO_INCREMENT, \n' +
    '  `transaction_hash` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `block_number` bigint(20) NOT NULL, \n' +
    '  `status` varchar(40) NOT NULL, \n' +
    '  `data` JSON  NULL,\n' +
    '  `logs_data` JSON  NULL,\n' +
    '  `highlighted_event_status` varchar(40) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `highlighted_event_html` LONGTEXT  CHARACTER SET utf8 COLLATE utf8_unicode_ci  NULL,\n' +
    '  `highlighted_event_texts` JSON  NULL,\n' +
    '  `highlighted_event_contract_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `highlighted_event_method_name` varchar(255)  NULL,\n' +
    '  `highlighted_event_extra_data` JSON  NULL,\n' +
    '  `created_at` int(11) NOT NULL, \n' +
    '  `updated_at` int(11) NOT NULL, \n' +
    '  PRIMARY KEY (`id`), \n' +
    '  UNIQUE KEY `uk_tx_hash` (`transaction_hash`), \n' +
    '  KEY `idx_1` (`status`), \n' +
    '  KEY `idx_2` (`highlighted_event_status`) \n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;',

    'ALTER TABLE transactions_details CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
    'ALTER TABLE transactions_details CHANGE highlighted_event_html highlighted_event_html LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
];

const downQueries = ['DROP TABLE if exists `transactions_details`;'];

const createTransactionDetailsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ['transactions_details']
};

module.exports = createTransactionDetailsTable;
