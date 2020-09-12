require('./config/config');

const express = require('express');
const app = express();

const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

app.get('/', function(req, res) {
    res.send('Hola')
})

app.listen(process.env.PORT, () => {
    console.log('Escuchando puerto: ', 3000);
})