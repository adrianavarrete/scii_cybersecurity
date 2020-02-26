const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

const ___dirname = path.resolve();

// settings
app.set('port', process.env.PORT || 9000);
app.set('json spaces',2);

// middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors());

// routes



// starting the server
app.listen(app.get('port'), () => {
    console.log(`Server on port ${app.get('port')}`);
});



app.get('/test', (req, res) => {
    res.sendFile(path.join(___dirname + '/test.json'));
});



