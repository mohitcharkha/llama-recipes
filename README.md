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