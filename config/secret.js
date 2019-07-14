import fs from 'fs'
import {bigInt} from 'snarkjs'
import eddsa from '../circomlib/src/eddsa.js'
import {stringifyBigInts, unstringifyBigInts} from '../src/snark_utils/stringifybigint.js'
import configFile from './config.json'
import Account from '../src/models/account.js'

const length = 64

const user = "root"

console.log('user:', user)

const password = "123"

console.log('password:', password)

const prvkeyInt = bigInt(
    Math.floor(Math.pow(10, length-1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length-1) - 1))
)

const prvkey = Buffer.from(
    stringifyBigInts(prvkeyInt),
    'hex'
)

const prvkeyString = stringifyBigInts(prvkeyInt)

console.log('prvkey:', prvkeyString)

const pubkey = eddsa.prv2pub(prvkey)
const pubkeyString = stringifyBigInts(pubkey)

console.log('pubkey:', pubkeyString)

configFile.development.user = user;
configFile.development.password = password;
configFile.development.pubkey = pubkeyString;
configFile.development.prvkey = prvkeyString;

const config = JSON.stringify(configFile, null, 4)

fs.writeFileSync('./config/config.json', config)

const zeroLeaf = new Account(0,"0","0",0,0,0);
const coordinatorLeaf = new Account(
    1,
    pubkeyString[0],
    pubkeyString[1],
    0,
    0,
    0
)

const genesisObj = {
    "accounts": [
        zeroLeaf,
        coordinatorLeaf
    ]
}

const genesis = JSON.stringify(genesisObj, null, 4)
fs.writeFileSync('./config/genesis.json', genesis)

