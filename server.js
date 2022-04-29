const debug = process.argv.includes("debug");
const http = require('http');
const express = require('express');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

var app = express();

if (debug) {
    console.log("** Debug mode **");
    const logger = require('morgan'); // logs in console
    app.use(logger('dev'));
}

app.use(express.static(path.join(__dirname, 'front')));

//
// Deck management
//
var decks = [];
var currentDeck = "";
var currentCards = [];
// large array to store all index into currentCards not used yet
var unusedCards = [];

// Load all decks;
fs.readdirSync('decks').forEach(file => {
    if (file.endsWith('.json') && !file.startsWith("FIX_")) {
        const data = JSON.parse(fs.readFileSync('decks/' + file,  {encoding:'utf8', flag:'r'}));
        assert(data.version == 1);
        decks.push(data);
    }
});

//
// Routes
//

// returns all decks with preview information
app.get('/decks', function(req, res, next) {
    preview = {"decks" : []};
    for (var i = 0; i < decks.length; i++) {
        preview.decks.push({
            "name" : decks[i].name,
            "cardCount" : decks[i].cards.length,
        })
    }
    res.json(preview);
});

// picks a deck to use with lazy simple GET call
app.get('/decks/:name', function(req, res, next) {
    for (var i = 0; i < decks.length; i++) {
        if (decks[i].name == req.params.name) {
            currentDeck = req.params.name;
            currentCards = decks[i].cards;
            // lazy fill array
            unusedCards = [];
            for (var j = 0; j < currentCards.length; j++) {
                unusedCards.push(j);
            }
        }
    }
    res.status(200).end();
});

// returns 1-N cards back from current deck
app.get('/cards/:count', function(req, res, next) {
    assert(currentCards.length > 0); // didn't select deck

    if (unusedCards.length < req.params.count) {
        res.json([]); // out of cards, but success for easy front end logic
    } else {
        var cards = [];
        for (var i = 0; i < req.params.count; i++) {
            var randomValue = Math.floor(Math.random() * unusedCards.length); // 0 - lengh
            var index = unusedCards[randomValue];
            unusedCards.splice(randomValue, 1); // remove
            cards.push(currentCards[index]);
        }
        res.json(cards);
    }
});

// Get audio
// not in static front end to make life easier adding deck content
// speed to load locally should not be an issue
app.get('/sound/:file', function(req, res) {
    var options = {
        root: path.join(__dirname, 'decks', 'audio', currentDeck),
        dotfiles: 'deny',
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true
        }
    }

    var fileName = req.params.file
    res.sendFile(fileName, options, function (err) {
        if (err) {
            // no data sent, mainly happens if card has no audio
        } else {
            // data send
        }
    });
});

// HTML page
app.get('/', function(req, res, next) {
    res.render('index');
});

//
// Server config set
//
var port = normalizePort(process.env.PORT || '8000');
app.set('port', port);

var server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Normalize a port into a number, string, or false.
function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
    return val; // named pipe
    }

    if (port >= 0) {
        return port; // port number
    }

    return false;
}

// Event listener for HTTP server "error" event.
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
    case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
    case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
    default:
        throw error;
    }
}

// Event listener for HTTP server "listening" event.
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}
