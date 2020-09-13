require('./config/config');

const express = require('express');
const mongoose = require('mongoose');
const app = express();

const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

app.use(require('./routes/usuario'))

console.log(process.env.URLDB)
mongoose.connect(process.env.URLDB, { useNewUrlParser: true, useCreateIndex: true });

app.listen(process.env.PORT, () => {
    console.log('Escuchando puerto: ', 3000);
})