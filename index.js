const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const rsa = require('rsa');
const bigconv = require('bigint-conversion');
const sha = require('object-sha');
const request = require('request');

const ___dirname = path.resolve();

global.puKey;
global.prKey;
global.TTPPuKey;
global.SKey;

async function claves() {
  const { publicKey, privateKey } = await rsa.generateRandomKeys(3072);

  puKey = publicKey;
  prKey = privateKey;

};

async function getSKey(){
  await request('http://localhost:8500/SKeyType4',{json: true},(err,res,body) => {
    if(err){
      return console.log(err);
    }
    console.log(body.body)
    SKey = body.body;
  });
}



async function decryptSKey(key, mensaje) {
  var iv = SubtleCrypto.getRandomValues(new Uint8Array(16));


  var methodKey = {
    name: 'AES-CBC',
    length: 128
  };

  var keyUsages = [
    'encrypt',
    'decrypt'
  ];

  var algoEncrypt = {
    name: 'AES-CBC',
    iv: iv,
    tagLength: 128
  };

  console.log(key);
  

  const importedKey = await SubtleCrypto.subtle.importKey("jwk", key, methodKey, false, keyUsages);
  return await SubtleCrypto.subtle.decrypt(algoEncrypt, importedKey, mensaje);

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
  request('http://localhost:8500/key',{json: true},(err,res,body) => {
    if(err){
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

  clientePublicKey = new rsa.PublicKey(bigconv.hexToBigint(req.body.mensaje.e), bigconv.hexToBigint(req.body.mensaje.n));
  console.log(clientePublicKey);
  if ( await verifyHash(clientePublicKey) == true) {

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
    getSKey();


    // var message = await decryptSKey(SKey,bigconv.hexToBuf(req.body.mensaje.body.msg))
    // console.log(bigconv.bufToText(message));



  } else {
    res.status(400).send("No se ha podido verificar al cliente A");
  }

  async function digestHash(body){
    const d = await sha.digest(body, 'SHA-256');
    return d;
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



