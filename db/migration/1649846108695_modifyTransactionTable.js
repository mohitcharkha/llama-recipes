const rootPrefix = '../..',
  database = require(rootPrefix + '/lib/globalConstant/database');
const dbName = database.mainDbName;

const upQueries = [
  'ALTER TABLE transactions ADD COLUMN block_number INT NULL;',
  'CREATE INDEX idx_block_number ON transactions(block_number);'
];

const downQueries = [''];

const createTransactionsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ['transactions']
};

module.exports = createTransactionsTable;
