const rootPrefix = '../..',
  database = require(rootPrefix + '/lib/globalConstant/database');
const dbName = database.mainDbName;

const upQueries = [
  'ALTER TABLE transactions ADD COLUMN highlighted_events JSON NULL;',
];

const downQueries = [''];

const createTransactionsTable = {
  dbName: dbName,
  up: upQueries,
  down: downQueries,
  tables: ['transactions']
};

module.exports = createTransactionsTable;
