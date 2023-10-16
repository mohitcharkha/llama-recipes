class TransactionLogsConstants {
  get pendingDecodeStatus() {
    return "PENDING";
  }

  get successDecodeStatus() {
    return "SUCCESS";
  }

  get errorDecodeStatus() {
    return "ERROR";
  }

  get abiNotFoundDecodeStatus() {
    return "ABI_NOT_FOUND";
  }

  get pendingStatus() {
    return "PENDING";
  }

  get failedStatus() {
    return "FAILED";
  }

  get successStatus() {
    return "SUCCESS";
  }

  get ignoreStatus() {
    return "IGNORE";
  }
}

module.exports = new TransactionLogsConstants();
