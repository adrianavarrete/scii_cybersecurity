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

const ___dirname = path.resolve();

global.puKey;
global.prKey;
global.TTPPuKey;
global.SKey = null;
global.c;

async function claves() {
  const { publicKey, privateKey } = await rsa.generateRandomKeys(3072);

  puKey = publicKey;
  prKey = privateKey;

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

app.post("/mensaje1NoRepudio", async (req, res) => {

  c = req.body.mensaje.body.msg;
  SKey = null;
  iv = null;

  clientePublicKey = new rsa.PublicKey(bigconv.hexToBigint(req.body.mensaje.e), bigconv.hexToBigint(req.body.mensaje.n));
  console.log(clientePublicKey);
  if (await verifyHash(clientePublicKey) == true) {

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

    while (SKey.msg == null) {
      SKey = await getSKey();
    }

    // var message = decryptSKey(SKey.msg.k,c)

    console.log(SKey.msg.k, SKey.iv)

    console.log(bigconv.hexToBuf(SKey.iv))
    console.log(c)
    console.log(bigconv.hexToBuf(c))
    console.log(bigconv.hexToBuf(SKey.msg.k))


    message = decrypt(bigconv.hexToBuf(c), bigconv.hexToBuf(SKey.msg.k), bigconv.hexToBuf(SKey.iv))
    console.log(message);


  } else {
    res.status(400).send("No se ha podido verificar al cliente A");
  }

  async function digestHash(body) {
    const d = await sha.digest(body, 'SHA-256');
    return d;
  }

  function decrypt(c, key, iv) {
    var decipher = crypto.createDecipher('aes-128-cbc', key, iv)
    var decrypted = decipher.update(c)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString();
  }

  function getSKey() {
    return new Promise((resolve, reject) => {
      request.get('http://localhost:8500/SKeyType4', { json: true }, (err, res, body) => {
        if (err) reject(err)
        else {
          console.log(res.body.body);
          resolve(res.body.body);
        }
      })
    });
  }

  async function verifyHash(clientePublicKey) {
    const hashBody = await sha.digest(req.body.mensaje.body, 'SHA-256')

    console.log(hashBody);
    console.log(bigconv.bigintToText(clientePublicKey.verify(bigconv.hexToBigint(req.body.mensaje.po))))
    var verify = false;

    if (hashBody == bigconv.bigintToText(clientePublicKey.verify(bigconv.hexToBigint(req.body.mensaje.po)))) {
      verify = true
    }
    console.log(verify);

    return verify
  }






});



