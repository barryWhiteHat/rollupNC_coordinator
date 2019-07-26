import config from "../config/config.js";
import logger from "./helpers/logger";
import txTable from "./db/txTable"
import accountTable from "./db/accountTable"
import Transaction from "./models/transaction";
import TxTree from "./models/txTree";
import AccountTree from "./models/accountTree";
import getCircuitInput from "./helpers/circuitInput"
import fs from 'fs'

// processor is a polling service that will routinely pick transactions
// from rabbitmq queue and process them to provide as input to the ciruit
export default class Processor {

  constructor(){
    this.lock = false;
  }
  
  async start(poller) {
    logger.info("starting transaction processor", {
      pollingInterval: poller.timeout
    });
    poller.poll();
    poller.onPoll(async () => {
      // fetch max number of transactions | transactions available
      var txs = await txTable.getMaxTxs();
      logger.info("fetched transactions from mempool", {
        count: await txs.length
      });
      console.log("padding lock", this.lock)
      if (!this.lock){
        this.processTxs(txs)
      }
      poller.poll(); // Go for the next poll
    })
  }

  // pick max transactions from mempool
  // provide to snark
  // TODO:
  // 1. Sort and select by fee
  // 2. Wait for X interval for max transactions to accumulate,
  //    after X create proof for available txs

  async processTxs(txs) {
    // TODO if number of rows in table > req txs
    if (await txs.length > 0) {
      this.lock = true;
      var paddedTxs = await padTxs(txs)
      console.log('paddedTxs.length', await paddedTxs.length)
      var txTree = new TxTree(paddedTxs)

      var accounts = await accountTable.getAllAccounts()
      var paddedAccounts = await accountTable.padAccounts(accounts)
      
      var accountTree = new AccountTree(paddedAccounts, global.gConfig.balance_depth)
      await accountTree.save()
      
      var stateTransition = await accountTree.processTxArray(txTree)
      var inputs = getCircuitInput(stateTransition)
      fs.writeFileSync(
        "test/inputs/" + Date.now() + ".json",
        JSON.stringify(inputs, null, 4),
        "utf-8"
      );
      this.lock = false
      console.log("padding lock", this.lock)
    }
  }

}

// pads existing tx array with more tx's from and to coordinator account
// in order to fill up the circuit inputs
async function padTxs(txs) {
  console.log("starting to pad txs")
  const maxLen = global.gConfig.txs_per_snark;
  if (txs.length > maxLen) {
    throw new Error(
      `Length of input array ${txs.length} is longer than max_length ${maxLen}`
    );
  }
  const numOfTxsToPad = maxLen - await txs.length;
  var padTxs = await genEmptyTxs(numOfTxsToPad);
  for (const emptyTx of padTxs){
    await emptyTx.save()
  }
  return txs.concat(padTxs);
}


// genEmptyTx generates empty transactions for coordinator
// i.e transaction from and to coordinator
async function genEmptyTxs(count) {
  console.log(
    "genEmptyTxs count", count
  )
  var txs = [];
  var initialNonce = await accountTable.getCoordinatorNonce();
  const pubkey = global.gConfig.pubkey;
  for (var i = 0; i < count; i++) {
    let tx = new Transaction(
      pubkey[0],
      pubkey[1],
      1, //fromIndex,
      pubkey[0],
      pubkey[1],
      1, //toIndex
      initialNonce + i,
      0, //amount
      0 //tokenType
    );
    await tx.sign(global.gConfig.prvkey);
    txs.push(tx);
    // console.log("padding emptyTx", i)
    // await accountTable.incrementCoordinatorNonce();
  }
  return txs
}