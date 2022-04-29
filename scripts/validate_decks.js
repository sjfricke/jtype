// node validate_decks.js [demo.json]

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { token } = require('morgan');
const wanakana = require('wanakana');

const rootPath = path.join(__dirname, "..");
const decksPath = path.join(rootPath, 'decks');

var singleFile = undefined;
if (process.argv.length > 2) {
    singleFile = process.argv[2];
    if (singleFile.lastIndexOf("/") != -1) {
        singleFile = singleFile.substring(singleFile.lastIndexOf("/") + 1);
    }
}

// Load all decks;
fs.readdirSync(decksPath).forEach(file => {
    if ((singleFile != undefined && file == singleFile) ||
        (singleFile == undefined && file.endsWith('.json') && !file.startsWith("FIX_"))) {
        console.log("**** Validating " + file + " ****")

        const deckName = file.substring(0, file.indexOf(".json"));

        const data = JSON.parse(fs.readFileSync(path.join(decksPath, file),  {encoding:'utf8', flag:'r'}));
        assert(data.version == 1);

        for (var i = 0; i < data.cards.length; i++) {
            var card = data.cards[i];

            // "kana" should only be kana (or JapanesePunctuation)
            var tokens = wanakana.tokenize(card.kana, {detailed : true});
            for (var j = 0; j < tokens.length; j++) {
                var token = tokens[j];
                if ((token.type != "katakana") &&
                    (token.type != "hiragana") &&
                    (token.type != "japanesePunctuation")) {
                        console.log(card);
                        console.log("card.kana == " + card.kana);
                        assert(false);
                }
            }

            // should be a furigana set matching each kanji
            if ((card.kanjiLength.length * 2) != card.furigana.length) {
                console.log(card);
                console.log("kanjiLength.length == " + card.kanjiLength.length);
                console.log("card.furigana.length == " + card.furigana.length);
                assert(false);
            }

            tokens = wanakana.tokenize(card.kanji, {detailed : true});
            var totalLength = 0;
            for (var j = 0; j < tokens.length; j++) {
                var token = tokens[j];
                if ((token.type == "katakana") ||
                    (token.type == "hiragana") ||
                    (token.type == "japanesePunctuation")) {
                    // exceptions of punctuation considered kanji
                    if (token.value != "々") {
                        totalLength += token.value.length;
                    }
                }
            }
            // Check total length replacing with both parts of card
            var totalLengthFurigana = totalLength;
            var totalLengthKanjiLength = totalLength;

            for (var j = 0; j < card.furigana.length; j += 2) {
                totalLengthFurigana += card.furigana[j + 1];
            }
            for (var j = 0; j < card.kanjiLength.length; j++) {
                totalLengthKanjiLength += card.kanjiLength[j];
            }

            // string length, with furigana replaced for kanji, should be the same
            if (totalLengthFurigana != card.kana.length) {
                console.log(card);
                console.log("totalLength == " + totalLength);
                console.log("totalLengthFurigana == " + totalLengthFurigana);
                console.log("card.kana.length == " + card.kana.length);
                assert(false);
            }
            // string length, with kanjiLength replaced for kanji, should be the same
            if (totalLengthKanjiLength != card.kanji.length) {
                console.log(card);
                console.log("totalLength == " + totalLength);
                console.log("totalLengthKanjiLength == " + totalLengthKanjiLength);
                console.log("card.kanji.length == " + card.kanji.length);
                assert(false);
            }

            // since lengths are validated above, make sure the non-furigana is the same
            // This will catch if the furigana is possibily starting on wrong index
            if (card.furigana.length == 0) {
                if (card.kana != card.kanji) {
                    console.log(card);
                    assert(false);
                }
            } else {
                var fIndex = 0; // furigana index
                var kIndex = 0; // card.kanji index

                for (var j = 0; j < card.kana.length;) {
                    if (j == card.furigana[fIndex * 2]) {
                        // need to forward all indexes
                        kIndex += card.kanjiLength[fIndex];
                        j += card.furigana[(fIndex * 2) + 1];
                        fIndex++;
                    } else if (card.kana[j] != card.kanji[kIndex]) {
                        console.log(card);
                        console.log("card.kana[" + j + "] " + card.kana[j] + " != card.kanji[" + kIndex + "] " + card.kanji[kIndex]);
                        assert(false);
                    } else {
                        // continue to next char as normal
                        kIndex++;
                        j++;
                    }
                }
            }

            // Make sure an audio file is present if listed
            if (card.sound && (deckName != "test")) {
                var soundPath = path.join(decksPath, "audio", deckName, card.sound);
                if (!fs.existsSync(soundPath)) {
                    console.log(card);
                    console.log("sound file not found at: " + soundPath);
                    assert(false);
                }
            }
        }
    }
});
