const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const rsa = require('rsa');
const bigconv = require('bigint-conversion');
const sha = require('object-sha');

const ___dirname = path.resolve();

global.puKey;
global.prKey;

async function claves() {
  const { publicKey, privateKey } = await rsa.generateRandomKeys(3072);

  puKey = publicKey;
  prKey = privateKey;

};


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



