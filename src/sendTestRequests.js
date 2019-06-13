import request from 'request';
import Transaction from './transaction.js';
import Poller from './poller.js';
import {Alice, Bob} from '../test/fixtures';

const url = "http://localhost:3000/submitTx";

function formatSignature(tx) {
    return {
        R8: `${tx.R1},${tx.R2}`,
        S: tx.S.toString(),
    }
}

function submitTx(from, to, amount, tokenType) {
    console.log(`${from.name} send ${to.name} ${amount} of token ${tokenType}`)
    const tx = new Transaction(from.X, from.Y, to.X, to.Y, amount, tokenType, null, null, null)
    tx.sign(from.privkey)
    const json = {
        fromX: tx.fromX,
        fromY: tx.fromY,
        toX: tx.toX,
        toY: tx.toY,
        amount: tx.amount,
        tokenType: tx.tokenType,
        signature: formatSignature(tx),
    }
    request.post({ url, json },
        function (error, response, body) {
            if (error) {
                return console.error('TX failed:', error);
            }
            console.log('Tx successful!  Server responded with:', body);
        }
    )
}


var sender = Alice;
var receiver = Bob;
var tmp;

const poller = new Poller(1000);
poller.poll()
poller.onPoll(() => {
    submitTx(sender, receiver, 500, 0)
    tmp = sender
    sender = receiver
    receiver = tmp;
    poller.poll()
})
