// node <script.js> <export.txt>

const assert = require('assert');
const fs = require('fs');
const path = require('path');

assert(process.argv.length > 2);

const deckName = "katakana_fast";
var decksDir = path.join(__dirname, "..", "decks");

var out = {
    "name" : deckName,
    "version" : 1,
    "cards" : []
};

const data = fs.readFileSync(process.argv[2], {encoding:'utf8', flag:'r'}).split("\n");
for (var i = 0; i < data.length; i++) {
    var line = data[i];
    line = line.split(" 	")[0];
    var katakana = line.split("\t")[0];
    var translation = line.split("\t")[1];
    var audioFile = line.split("\t")[2];
    audioFile = audioFile.substring(audioFile.indexOf(":") + 1, audioFile.indexOf("]"));

    var card = {
        "kanji" : katakana,
        "kana" : katakana,
        "translation" : translation,
        "furigana" : [],
        "kanjiLength" : [],
        "sound" : audioFile
    }

    out.cards.push(card);
}

fs.writeFileSync(path.join(decksDir, deckName + ".json"), JSON.stringify(out));