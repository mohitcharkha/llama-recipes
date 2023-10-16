# node-boilerplate

https://localhost/

## Pre-requisites for setting up environment

* Start [MySQL](https://www.mysql.com/downloads/)
```bash
  mysql.server start
```
  
## Install all the dependency npm packages

```bash
rm -rf node_modules
rm -rf package-lock.json
npm install
```

## Seed DB

* Create the main db and create schema_migrations table.

```bash
source set_env_vars.sh

node db/seed.js

```

## Run DB Migrations

* Run all pending migrations.

```bash
node db/migrate.js
```

## Run Scripts in Following Order
```bash
 node onetimer/populateEtherScanTransactions.js
 node onetimer/populateTransactionsDataFromBlockscout.js
 node onetimer/populateHighlightedEvent.js
 ```

## Connect to Hosted DB instance
SSH TUNNELING
```
ssh -v -i <path to pem file> -N -L 3307:<db host>:3306 -p 22 <ssh username>@<ssh machine ip> -o ConnectTimeout=60
```

UPDATE ENV VARS:
```
export A_MAIN_DB_MYSQL_USER=<DB_USER>
export A_MAIN_DB_MYSQL_PASSWORD=<DB_PASSWORD>
export A_MAIN_DB_MYSQL_PORT=3307
```
