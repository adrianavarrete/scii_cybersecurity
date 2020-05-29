const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const rsa = require('rsa');
const bigconv = require('bigint-conversion');
const sha = require('object-sha');
const request = require('request');
const crypto = require('crypto');
const paillierBigint = require('paillier-bigint');
const sss = require('shamirs-secret-sharing')

const ___dirname = path.resolve();

global.puKey;
global.prKey;
global.paillierPuKey;
global.paillierPrKey;
global.TTPPuKey;
global.SKey = null;
global.c;
global.sharesServer;

async function claves() {
  const { publicKey, privateKey } = await rsa.generateRandomKeys(3072);
  //const { paillierPublicKey, paillierPrivateKey } = await paillierBigint.generateRandomKeys(3072);
  const paillierKeyPair = await paillierBigint.generateRandomKeysSync(3072);

  puKey = publicKey;
  prKey = privateKey;
  paillierPuKey = paillierKeyPair.publicKey;
  paillierPrKey = paillierKeyPair.privateKey;
  console.log(paillierPuKey)

};


function decryptSKey(key, c) {

  var mykey = crypto.createDecipher('aes-128-cbc', key);
  mystr = mykey.update(c, 'hex', 'utf8');
  console.log(mystr);
  return mystr += mykey.final('utf8');


}


// settings
app.set('port', process.env.PORT || 8000);
app.set('json spaces', 2);

// middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// routes

// starting the server
app.listen(app.get('port'), () => {
  claves();
  console.log(`Server on port ${app.get('port')}`);
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(___dirname + '/test.json'));
});

app.get('/key', (req, res) => {

  class PublicKey {
    constructor(e, n) {
      this.e = bigconv.bigintToHex(e);
      this.n = bigconv.bigintToHex(n);
    }
  }

  publicKey = new PublicKey(
    puKey.e,
    puKey.n
  )

  res.status(200).send(publicKey);

});

app.get('/paillierKey', (req, res) => {

  class PublicKey {
    constructor(n, g) {
      this.n = bigconv.bigintToHex(n);
      this.g = bigconv.bigintToHex(g);
    }
  }

  publicKey = new PublicKey(
    paillierPuKey.n,
    paillierPuKey.g
  )

  res.status(200).send(publicKey);

});

function getTTPPublicKey() {
  request('http://localhost:8500/key', { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    TTPPuKey = new rsa.PublicKey(bigconv.hexToBigint(body.e), bigconv.hexToBigint(body.n))
  });
}

app.post("/hola", (req, res) => {

  clientePublicKey = new rsa.PublicKey(bigconv.hexToBigint(req.body.mensaje.e), bigconv.hexToBigint(req.body.mensaje.n));

  mensajeRecibido = bigconv.bigintToText(prKey.decrypt(bigconv.hexToBigint(req.body.mensaje.c)));
  respuesta = "Hola, gracias por tu mensaje. Te confirmo que he recibido el siguiente texto --> " + mensajeRecibido
  respuestaEncriptada = bigconv.bigintToHex(clientePublicKey.encrypt(bigconv.textToBigint(respuesta)));

  const cosas = {
    respuestaServidor: respuestaEncriptada
  }
  res.status(200).send(cosas);
});

app.post("/suma", (req, res) => {

  console.log(bigconv.bigintToHex(paillierPrKey.decrypt(paillierPuKey.multiply(bigconv.hexToBigint(req.body.c1), bigconv.hexToBigint(req.body.c2)))))
  sumaCifrada = bigconv.bigintToHex(paillierPrKey.decrypt(paillierPuKey.addition(bigconv.hexToBigint(req.body.c1), bigconv.hexToBigint(req.body.c2))));

  const cosas = {
    suma: sumaCifrada
  }
  res.status(200).send(cosas);
});

app.post("/blindSign", (req, res) => {

  clientePublicKey = new rsa.PublicKey(bigconv.hexToBigint(req.body.mensaje.e), bigconv.hexToBigint(req.body.mensaje.n));

  mensajeRecibido = bigconv.bigintToText(prKey.decrypt(bigconv.hexToBigint(req.body.mensaje.c)));
  console.log(mensajeRecibido)
  respuestaFirmada = bigconv.bigintToHex(prKey.sign(bigconv.hexToBigint(req.body.mensaje.c)));

  const cosas = {
    respuestaServidor: respuestaFirmada
  }
  res.status(200).send(cosas);
});

app.get("/shamir", (req, res) => {

  const secret = Buffer.from('La vacuna para el COVID-19 es simplemente azucar')
  const shares = sss.split(secret, { shares: 3, threshold: 2 })
  sharesServer = shares;
  console.log(sharesServer)
  const cosas = {
    respuestaServidor: shares
  }
  res.status(200).send(cosas);
});

app.post("/getShamirKey", (req, res) => {
  console.log(req.body[0])
  if (req.body.length == 1) {
    const secret = sss.combine([sharesServer[Number(req.body[0])]]);

    const cosas = {
      respuestaServidor: secret
    }
    res.status(200).send(cosas);

  } else if (req.body.length == 2) {
    const secret = sss.combine([sharesServer[Number(req.body[0])], sharesServer[Number(req.body[1])]]);

    const cosas = {
      respuestaServidor: secret
    }
    res.status(200).send(cosas);

  } else if (req.body.length == 3) {
    const secret = sss.combine([sharesServer[Number(req.body[0])], sharesServer[Number(req.body[1])], sharesServer[Number(req.body[2])]]);

    const cosas = {
      respuestaServidor: secret
    }
    res.status(200).send(cosas);

  } else {
    res.status(400).send("ERRROR");
  }

});

app.post("/mensaje1NoRepudio", async (req, res) => {

  c = req.body.mensaje.body.msg;
  SKey = null;
  iv = null;

  clientePublicKey = new rsa.PublicKey(bigconv.hexToBigint(req.body.mensaje.e), bigconv.hexToBigint(req.body.mensaje.n));
  console.log(clientePublicKey);
  if (await verifyHash(clientePublicKey, req.body.mensaje.body, req.body.mensaje.po) == true) {

    const body = {
      type: '2',
      src: 'B',
      dst: 'A',
      msg: req.body.mensaje.body.msg,
    }

    const digest = await digestHash(body);

    const pr = bigconv.bigintToHex(prKey.sign(bigconv.textToBigint(digest)));

    res.status(200).send({
      body, pr
    });

    getTTPPublicKey();

    SKey = await getSKey();

    while (SKey.body.msg == null) {
      SKey = await getSKey();
    }

    if (await verifyHash(TTPPuKey, SKey.body, SKey.pkp) == true) {
      message = decrypt(bigconv.hexToBuf(c), bigconv.hexToBuf(SKey.body.msg), bigconv.hexToBuf(SKey.body.iv))
      console.log("La clave ha sido descargada de la TTP y he desencriptado el mensaje --> " + message);


    } else {
      console.log("No se ha podido verificar la TTP");
    }

  } else {
    res.status(400).send("No se ha podido verificar al cliente A");
  }
});

async function digestHash(body) {
  const d = await sha.digest(body, 'SHA-256');
  return d;
}

function decrypt(c, key, iv) {
  var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
  var decrypted = decipher.update(c)
  return decrypted += decipher.final('utf8');

}

async function getSKey() {
  return new Promise((resolve, reject) => {
    request.get('http://localhost:8500/SKeyType4', { json: true }, (err, res, body) => {
      if (err) reject(err)
      else {
        resolve(res.body);
      }
    })
  });
}

async function verifyHash(PublicKey, body, signature) {
  const hashBody = await sha.digest(body, 'SHA-256')
  var verify = false;

  if (hashBody == bigconv.bigintToText(PublicKey.verify(bigconv.hexToBigint(signature)))) {
    verify = true
  }
  return verify
}



