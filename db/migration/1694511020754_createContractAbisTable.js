const rootPrefix = '../..',
  database = require(rootPrefix + '/lib/globalConstant/database');
const dbName = database.mainDbName;

const upQueries = [
  'CREATE TABLE `contract_abis` ( \n' +
    '  `id` bigint(20) NOT NULL AUTO_INCREMENT, \n' +
    '  `signature` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,\n' +
    '  `data` JSON  NULL,\n' +
    '  `created_at` int(11) NOT NULL, \n' +
    '  `updated_at` int(11) NOT NULL, \n' +
    '  PRIMARY KEY (`id`), \n' +
    '  UNIQUE KEY `uk_signature` (`signature`) \n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;'
];

const downQueries = ['DROP TABLE if exists `contract_abis`;'];

const createContractAbisTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ['contract_abis']
};

module.exports = createContractAbisTable;
