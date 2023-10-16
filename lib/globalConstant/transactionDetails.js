class TransactionDetailsConstants {

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

  get pendingHighlightedEventStatus(){
    return "PENDING";
  }

  get successHighlightedEventStatus(){
    return "SUCCESS";
  }
  
}

module.exports = new TransactionDetailsConstants();
