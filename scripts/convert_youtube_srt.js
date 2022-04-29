// node <script.js> folder_name <transcript.srt> [<audio.mp3>]

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const exec = require('child_process');
const wanakana = require('wanakana');
// const jp_kanji_dict = require('./jp_kanji_dict.js');
const mecab = require('./mecab.js');

const deckName = process.argv[2];
var decksDir = path.join(__dirname, "..", "decks");
var audioDir = path.join(decksDir, "audio", deckName);
if (!fs.existsSync(audioDir)){
    fs.mkdirSync(audioDir);
}

var out = {
    "name" : deckName,
    "version" : 1,
    "cards" : []
};

const sections = fs.readFileSync(process.argv[3], {encoding:'utf8', flag:'r'}).trim().split("\n\n");
for (let i = 0; i < sections.length; i++) {
    let section = sections[i].split("\n");
    let sectionId = section[0];

    if (section.length > 4) {
        console.log("SKIN: Extra line in .srt file for ID " + section[0]);
        continue;
    }

    // audio always "00:00:06,194 --> 00:00:10,840" form
    let audioStart = section[1].substring(0, 12).replace(",", ".");
    let audioEnd = section[1].substring(17, 29).replace(",", ".");
    let audioName = sectionId + ".mp3";
    let audioFile = path.join(audioDir, audioName);
    let kanji = section[2];
    let translation = section[3];

    // santize a bit
    kanji = kanji.replace("?", "");
    kanji = kanji.replace("？", "");
    kanji = kanji.replace(",", "");
    kanji = kanji.replace("、", "");
    kanji = kanji.replace(".", "");
    kanji = kanji.replace("。", "");
    kanji = kanji.replace("〜", "");
    kanji = kanji.replace("~", "");
    kanji = kanji.replace("-", "");
    kanji = kanji.replace("&", "");
    kanji = kanji.replace("!", "");
    kanji = kanji.replace("！", "");

    let exception_type = false;
    let wTokens = wanakana.tokenize(kanji, {detailed : true});
    for (var j = 0; j < wTokens.length; j++) {
        let type = wTokens[j].type;
        if (type == 'englishNumeral' ||
            type == 'englishPunctuation' ||
            type == 'japaneseNumeral') {
            console.log(wTokens[j]);
            exception_type = true;
            break;
        }
    }
    if (exception_type) {
        console.log("SKIP: " + kanji);
        continue;
    }

    let mapping = mecab.getKanjiMapping(kanji);
    if (mapping == undefined) {
        continue;
    }

    var card = {
        "kanji" : kanji,
        "kana" : "",
        "translation" : translation,
        "furigana" : [],
        "kanjiLength" : [],
        "sound" : audioName
    }

    let kana = kanji;
    // // for words like 食べ物 where the furigana is たべもの it is impossible to validate to instead just break it up painfully here
    // for (let j = 0; j < mapping.length; j++) {
    //     wTokens = wanakana.tokenize(mapping[j].kanji, {detailed : true});
    //     if (wTokens.length > 1) {
    //         // assuming it is [kanji, non-kanji, kanji, non-kanji, kanji, ....]
    //         mapping.splice(j, 1);
    //         for (var k = 0; k < wTokens.length; k+=2) {
    //             mapping.splice(j, 0, wTokens[k].value);
    //             j++;
    //         }
    //     }
    // }
    // console.log(mapping);

    for (let j = 0; j < mapping.length; j++) {
        let key = mapping[j].kanji;
        let value = mapping[j].kana;

        card.kanjiLength.push(key.length);
        card.furigana.push(kana.indexOf(key));
        card.furigana.push(value.length);
        kana = kana.replace(key, value);
    }
    card.kana = kana;

    // so can re-run without ffmpeg
    if (process.argv.length > 4) {
        ffmpegString = "ffmpeg -ss " + audioStart + " -to " + audioEnd + " -i " + process.argv[4] + " " + audioFile;
        // console.log(ffmpegString);
        if (!fs.existsSync(audioFile)){
            exec.execSync(ffmpegString);
        }
    }

    out.cards.push(card);
}

fs.writeFileSync(path.join(decksDir, deckName + ".json"), JSON.stringify(out));