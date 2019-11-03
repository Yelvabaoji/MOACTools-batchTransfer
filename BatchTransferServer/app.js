const BATCH_TRANSFER_SERVER_PORT = 3031
const CHAIN3_URL = "http://localhost:8545"


const express = require('express'),
app = express()
app.use(express.json())

app.use(express.static("./public")) //静态页面

// basic crypto modules
var secp256k1 = require('secp256k1');   //npm install  -g secp256k1
var keccak = require('keccak');         //npm install  -g keccak

// here we need moac chain3 modules
const Chain3 = require('chain3');           //npm i -S chain3
const MoacERC20ABI = require("./moacERC20ABI"); // for interprate ERC 20 bytecode

var chain3 = new Chain3();
chain3.setProvider(new Chain3.providers.HttpProvider(CHAIN3_URL));
if (!chain3.isConnected()){
  console.log("Chain3 RPC is not connected!");
  return;
} else {
  console.log("Chain3 connected")
}
var mc = chain3.mc;
var BigNumber = chain3.BigNumber;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

//**************************************************************
// API to get the balance of moac in the wallet
// and to return ERC20 toekn SYMB and balance if required.
//**************************************************************
app.post('/getWalletInfo', (req, res, next) => {
  var privateKey = req.body.key
  var isERC20 = req.body.isERC20
  var erc20Address = req.body.erc20Address
  // check whether private key is valid
  if (privateKey.length != 64 && privateKey.length != 66) {
    res.send({"result": "private key length is invalid."});  
    return;
  }
  // if key start from 0x, we remove it
  if (privateKey.substr(0,2) == "0x") privateKey = privateKey.substr(2, privateKey.length)

  // check ERC20 token contract address is valid
  if (isERC20) {
    if (erc20Address.length != 42 && erc20Address.length != 40) {
      res.send({"result": "contract address length is invalid."});  
      return;
    }
    // if address is not start from 0x, we add it
    if (erc20Address.substr(0,2) != "0x" && erc20Address.length == 40) erc20Address = "0x"+erc20Address
  }

  // from private key to generate public key and wallet address
  var publicKey = secp256k1.publicKeyCreate(Buffer.from(privateKey, 'hex'), false).slice(1);
  var addrBuffer = keccak('keccak256').update(publicKey).digest().slice(-20);
  var address = '0x'+addrBuffer.toString('hex')

  // get moac balance in the wallet, convert to moac.
  var balBig = new BigNumber(mc.getBalance(address).toString(10));
  var balance = balBig.dividedBy(10**18);

  // get ERC20 token if it required
  if (isERC20) {
    var contract = mc.contract(MoacERC20ABI).at(erc20Address)
    if (contract) {
      // a wrong contract address won't get error, it's just return '' and 0
      // console.log(JSON.stringify(contract.totalSupply()))
      // console.log(JSON.stringify(contract.name()))
      // console.log(JSON.stringify(contract.decimals()))
      // console.log(JSON.stringify(contract.symbol()))

      var ee = parseInt(JSON.stringify(contract.decimals()).replace(/"/g, ""))

      contract.balanceOf.call( address, function(err, result){
        erc20Balance = ee == 0 ? result : result.dividedBy(10**ee)
        res.send({"result": "OK",
          "address": address,
          "balance": balance,
          "erc20Symb": contract.symbol(),
          "erc20Balance": erc20Balance
        })
      });
    }
  } else {
    res.send({"result": "OK",
      "address": address,
      "balance": balance,
      "erc20Symb": '',
      "erc20Balance": ''
    })
  }
})

//**************************************************************
// API to send moac according to address list
// 
//**************************************************************
app.post('/sendMoac', (req, res, next) => {
  var privateKey = req.body.key
  var addrList = req.body.addresslist

 
  // check whether private key is valid
  if (privateKey.length != 64 && privateKey.length != 66) {
    res.send({"result": "private key length is invalid."});  
    return;
  }
  // if key start from 0x, we remove it
  if (privateKey.substr(0,2) == "0x") privateKey = privateKey.substr(2, privateKey.length)

  // from private key to generate public key and wallet address
  var publicKey = secp256k1.publicKeyCreate(Buffer.from(privateKey, 'hex'), false).slice(1);
  var addrBuffer = keccak('keccak256').update(publicKey).digest().slice(-20);
  var fromAddress = '0x'+addrBuffer.toString('hex')

  // get moac balance in the wallet, convert to moac.
  var bal = mc.getBalance(fromAddress);
  var balBig = new BigNumber(bal.toString(10));
  var balance = balBig.dividedBy(1000000000000000000);

  var totalMoacRequired = 0
  for (var i=0; i<addrList.length; i++) 
    totalMoacRequired += addrList[i].amount
  totalMoacRequired += 0.0025 * addrList.length

  // console.log("balance",balance)
  // console.log("total",totalMoacRequired)

  if (balance <= totalMoacRequired) {
    res.send({"result": "Not enough moac in account."});
    return;
  }
  
  var gasPrice = 25000000000;
  var gasLimit = 100000;

  var txcount = mc.getTransactionCount(fromAddress);
  var txList = [];

  iterator(0);
  function iterator(i){
    if (i == addrList.length){
      res.send({
        "result": "OK",
        "txList": txList,
      })
      return;
    }
    var toAddress = addrList[i].addr
    var value = chain3.toSha(addrList[i].amount, 'mc');
  
    var rawTx = {
      "from": fromAddress,
      "to": toAddress,
      "nonce": chain3.intToHex(txcount),
      "gasPrice": chain3.intToHex(gasPrice),
      "gasLimit": chain3.intToHex(gasLimit),
      "value": chain3.intToHex(value),
      "shardingFlag": 0, 
      "chainId": chain3.version.network
    };
    var signedTx = chain3.signTransaction(rawTx, privateKey);
  
    mc.sendRawTransaction(signedTx, function(err, hash) {
      if (!err){
        console.log("OK = ",i+1)
        txList.push({
          "result": "OK",
          "toAddress": toAddress,
          "amount": addrList[i].amount,
          "hash": hash
        })
      }else{
        console.log("FAIL = ",i+1)
        txList.push({
          "result": "FAIL",
          "toAddress": toAddress,
          "error": err,
          "rawTx": rawTx
        })
      }
      txcount++;
      iterator(i+1);
    });
  }
})


//**************************************************************
// API to send ERC-20 according to address list
// 
//**************************************************************
app.post('/sendErc20', async (req, res, next) => {
  var privateKey = req.body.key
  var isERC20 = req.body.isERC20
  var erc20Address = req.body.erc20Address
  var addrList = req.body.addresslist

 
  // check whether private key is valid
  if (privateKey.length != 64 && privateKey.length != 66) {
    res.send({"result": "private key length is invalid."});  
    return;
  }
  // if key start from 0x, we remove it. Only for private
  if (privateKey.substr(0,2) == "0x") privateKey = privateKey.substr(2, privateKey.length)

  // check ERC20 token contract address is valid
  if (erc20Address.length != 42 && erc20Address.length != 40) {
    res.send({"result": "contract address length is invalid."});  
    return;
  }
  // if address is not start from 0x, we add it
  if (erc20Address.substr(0,2) != "0x" && erc20Address.length == 40) erc20Address = "0x"+erc20Address

  // from private key to generate public key and wallet address
  var publicKey = secp256k1.publicKeyCreate(Buffer.from(privateKey, 'hex'), false).slice(1);
  var addrBuffer = keccak('keccak256').update(publicKey).digest().slice(-20);
  var fromAddress = '0x'+addrBuffer.toString('hex')

  // get moac balance in the wallet, convert to moac.
  var balBig = new BigNumber(mc.getBalance(fromAddress).toString(10));
  var balance = balBig.dividedBy(1000000000000000000);

  // console.log("balance",balance)
  // console.log("total",0.0025 * addrList.length)
  if (balance <= (0.0025 * addrList.length)) {
    res.send({"result": "Not enough moac in account."});
    return;
  }

  var txcount = mc.getTransactionCount(fromAddress);
  var txList = [];
  var contract = mc.contract(MoacERC20ABI).at(erc20Address)

  if (!contract) {
    res.send({"result": "ERC20 contract address wrong."});
    return;
  }
  var ee = parseInt(JSON.stringify(contract.decimals()).replace(/\"/g, ""))
  var erc20Balance = 0
  contract.balanceOf.call( fromAddress, function(err, result){
    if(err){
      res.send({"result": err});
      return;
    }
    erc20Balance = ee == 0 ? result : result.dividedBy(10**ee)
    var totalErc20CoinRequired = 0
    for (var i=0; i<addrList.length; i++) totalErc20CoinRequired += addrList[i].amount
    // console.log("erc20balance", erc20Balance)
    // console.log("totalerc20required", totalErc20CoinRequired)
    if (erc20Balance <= totalErc20CoinRequired) {
      res.send({"result": "Not enough erc20 in account."});
      return;
    }
  
    iterator(0);
    function iterator(i){
      if(i==addrList.length){
        // console.log(txList)
        res.send({ "result": "OK", "txList": txList, })
        return;
      }

      var data = contract.transfer.getData(addrList[i].addr, addrList[i].amount * (10**ee))
      var rawTx = {
        "from": fromAddress,
        "nonce": chain3.intToHex(txcount),
        "gasPrice": chain3.intToHex(25000000000),
        "gasLimit": chain3.intToHex(100000),
        "to": erc20Address,
        "value": 0,
        "data": data,
        "shardingFlag": 0, 
        "chainId": chain3.version.network
      };

      var signedTx = chain3.signTransaction(rawTx, privateKey);
    
      mc.sendRawTransaction(signedTx, function(err, hash) {
        if (!err){
          console.log("OK - ", i+1)
          txList.push({
            "result": "OK",
            "toAddress": addrList[i].addr,
            "amount": addrList[i].amount,
            "hash": hash
          })
        }else{
          console.log("FAIL - ", i+1)
          txList.push({
            "result": "FAIL",
            "toAddress": addrList[i].addr,
            "error": err,
            "rawTx": rawTx
          })
        }
        txcount++;
        iterator(i+1);
      });
    }
  });
})

//**************************************************************
// API to reflush transition status according to the tx
// 
//**************************************************************
app.post('/reflush', (req, res, next) => {
  var addrList = req.body.addresslist
  var txResult = [];

  iterator(0);
  function iterator(i){
    if(i==addrList.length){
      // console.log("2222",txResult)
      res.send({
        "result": "OK",
        "txResult": txResult,
      })
      return;
    }
    if (addrList[i].hash != 'FAIL') {
      mc.getTransaction(addrList[i].txHash, function(err, result) {
        if (!err){
          if (result.blockNumber != null) {
            console.log('OK - ', i+1)
            txResult.push({"result": "OK",})
          } else {
            txResult.push({"result": "PENDING",})
            console.log('PENDING - ', i+1)
          }
        }else{
          txResult.push({"result": "ERR"})
          console.log('ERR - ', i+1)
        }
        iterator(i+1);
      });
    } else {
      txResult.push({"result": "FAIL"})
      iterator(i+1);
    }
  }
})



app.listen(BATCH_TRANSFER_SERVER_PORT);
console.log('Listening on port',BATCH_TRANSFER_SERVER_PORT,'...');
