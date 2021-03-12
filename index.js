require('dotenv').config();
const http = require('http');
const express = require('express');
const app = new express();
app.use(express.urlencoded({ extended: false }));

const mongo = require('./mongo');

const { HTTP_PORT, MONGO_USER, MONGO_PASS } = process.env;

app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

app.get('/create', (req, res) => {
    res.render('create');
});

app.post('/create', async (req, res) => {
    const data = await mongo.shorten(req.body.url, req.body.iframe, req.body.custom);
    if(data.err) res.send(data.err);
    else res.redirect(`/info/${data.short}`)
});

app.get('/info/:short', async (req, res) => {
    const info = await mongo.lengthen(req.params.short);
    console.log(info);
    res.render('info', {
        url: info.url,
        iframe: info.iframe,
        short: info.short,
    });
});

app.use('/', (req, res) => {
    res.render('index');
});

async function startup() {
    app.listen(HTTP_PORT, err => {
        console.log(`[HTTP] Web server started on port ${HTTP_PORT}.`);
    });
}

startup();
