// node <script.js> <input.json> [download]
//
// ht tp$:/\/\iknow<dot>jp/content/japanese
// /courses/566921
// /api/v2/goals/566921?

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const wanakana = require('wanakana');
var request = require('sync-request');

assert(process.argv.length > 2);

const deckName = process.argv[2].substring(0, process.argv[2].indexOf(".json"));
var decksDir = path.join(__dirname, "..", "decks");
var downloadDir = path.join(decksDir, "audio", deckName);

var downloadSound = false;
if (process.argv.length > 3) {
    if (process.argv[3] == "download") {
        downloadSound = true;
        if (!fs.existsSync(downloadDir)){
            fs.mkdirSync(downloadDir);
        }
        console.log("Downloading audio files to " + downloadDir);
    }
}

var out = {
    "name" : deckName,
    "version" : 1,
    "cards" : []
};

// Sometimes things are found that are better suited for manual edits
// The idea is to get the card 95% done and have a manual pass after
manualCards = [];

// for download progression
var estimateTotal = 0; // should be about 200 for each section
var downloadedTotal = 0;

const data = JSON.parse(fs.readFileSync(process.argv[2], {encoding:'utf8', flag:'r'}));
estimateTotal = data.goal_items.length * 2;
for (var itemIndex = 0; itemIndex < data.goal_items.length; itemIndex++) {
    const goalItem = data.goal_items[itemIndex];
    for (var sentenceIndex = 0; sentenceIndex < goalItem.sentences.length; sentenceIndex++) {

        var card = {
            "kanji" : "",
            "kana" : "",
            "translation" : "",
            "furigana" : [],
            "kanjiLength" : []
        }

        const sentence = goalItem.sentences[sentenceIndex];

        // clean up input
        // <b> tags want to replace with nothing for cases like 'お<b>酒</<b>' to not seperate
        // punctuation want as space in case of `あ、い｀ will still want to be seperated
        var kanjiTokens = sentence.cue.transliterations.Jpan.replace(/<b>|<\/b>/g, "").replace(/\。|\、|\！|\？/g, " ").trim();
        var kanaTokens = sentence.cue.transliterations.Hrkt.replace(/<b>|<\/b>/g, "").replace(/\。|\、|\！|\？/g, " ").trim();
        // buffer space between punctuation
        kanjiTokens = kanjiTokens.replace(/「/g, "「 ").replace(/」/g, " 」");
        kanaTokens = kanaTokens.replace(/「/g, "「 ").replace(/」/g, " 」");
        // double/triple spaces are left as an artifact of removing commas
        kanjiTokens = kanjiTokens.replace(/\s\s+/g, " ").split(" ");
        kanaTokens = kanaTokens.replace(/\s\s+/g, " ").split(" ");

        if (kanaTokens.length != kanjiTokens.length) {
            console.log("kanaTokens.length " + kanaTokens.length + " != kanjiTokens.length " + kanjiTokens.length);
            console.log(kanjiTokens);
            console.log(kanaTokens);
            console.log(sentence.cue.transliterations);
            assert(false);
        }

        // Walk 2 split array to find kanji and mark furigana/kanjiLength
        var covered = 0; // of the kana sentence
        for (var tokenIndex = 0; tokenIndex < kanjiTokens.length; tokenIndex++) {
            var token = kanjiTokens[tokenIndex];
            if (wanakana.isKanji(kanjiTokens[tokenIndex])) {
                // easy case where token is just a kanji token
                card.kanjiLength.push(token.length);
                card.furigana.push(covered);
                card.furigana.push(kanaTokens[tokenIndex].length);
            } else {
                wTokens = wanakana.tokenize(token, {detailed : true});
                var foundKanji = 0;
                for (var i = 0; i < wTokens.length; i++) {
                    if (wTokens[i].type == "kanji") {
                        foundKanji++;
                    } else if (wTokens[i].type == "englishNumeral") {
                        // can handle some cases easily of get numbers to kana
                        const nextKanjiTokens = kanjiTokens[tokenIndex + 1];
                        const kanaNumber = Number(kanaTokens[tokenIndex]);
                        if (wanakana.isKatakana(nextKanjiTokens) ||
                            nextKanjiTokens.startsWith("足") ||
                            nextKanjiTokens.startsWith("世紀") ||
                            nextKanjiTokens.startsWith("万") ||
                            nextKanjiTokens.startsWith("週間") ||
                            nextKanjiTokens.startsWith("円")) {
                            // Case were number is not modified by following item
                            switch (kanaNumber) {
                                case 1:
                                    kanaTokens[tokenIndex] = "いち";
                                    break;
                                case 2:
                                    kanaTokens[tokenIndex] = "に";
                                    break;
                                case 3:
                                    kanaTokens[tokenIndex] = "さん";
                                    break;
                                case 5:
                                    kanaTokens[tokenIndex] = "ご";
                                    break;
                                case 6:
                                    kanaTokens[tokenIndex] = "ろく";
                                    break;
                                case 7:
                                    kanaTokens[tokenIndex] = "なな";
                                    break;
                                case 10:
                                    kanaTokens[tokenIndex] = "じゅう";
                                    break;
                                case 12:
                                    kanaTokens[tokenIndex] = "じゅうに";
                                    break;
                                case 17:
                                    kanaTokens[tokenIndex] = "ななじゅう";
                                    break;
                                case 20:
                                    kanaTokens[tokenIndex] = "にじゅう";
                                    break;
                                case 30:
                                    kanaTokens[tokenIndex] = "さんじゅう";
                                    break;
                                case 36:
                                    kanaTokens[tokenIndex] = "さんじゅうろく";
                                    break;
                                case 80:
                                    kanaTokens[tokenIndex] = "はちじゅう";
                                    break;
                                case 200:
                                    kanaTokens[tokenIndex] = "にひゃく";
                                    break;
                                case 300:
                                    kanaTokens[tokenIndex] = "さんびゃく";
                                    break;
                                case 400:
                                    kanaTokens[tokenIndex] = "よんひゃく";
                                    break;
                                case 500:
                                    kanaTokens[tokenIndex] = "ごひゃく";
                                    break;
                                case 600:
                                    kanaTokens[tokenIndex] = "ろっぴゃく";
                                    break;
                                case 700:
                                    kanaTokens[tokenIndex] = "ななひゃく";
                                    break;
                                case 800:
                                    kanaTokens[tokenIndex] = "はっぴゃく";
                                    break;
                                case 900:
                                    kanaTokens[tokenIndex] = "きゅうひゃく";
                                    break;
                                case 1000:
                                    kanaTokens[tokenIndex] = "せん";
                                    break;
                                case 2500:
                                    kanaTokens[tokenIndex] = "にせんごひゃく";
                                    break;
                                case 3000:
                                    kanaTokens[tokenIndex] = "さんぜん";
                                    break;
                                case 4000:
                                    kanaTokens[tokenIndex] = "よんせん";
                                    break;
                                default:
                                    console.log("Add number to case");
                                    console.log(kanjiTokens[tokenIndex] + " - " + nextKanjiTokens);
                                    card.reason = "#";
                                    // assert(false);
                            }
                        } else if (nextKanjiTokens.startsWith("時")) {
                            switch (kanaNumber) {
                                case 1:
                                    kanaTokens[tokenIndex] = "いち";
                                    break;
                                case 2:
                                    kanaTokens[tokenIndex] = "に";
                                    break;
                                case 3:
                                    kanaTokens[tokenIndex] = "さん";
                                    break;
                                case 4:
                                    kanaTokens[tokenIndex] = "よ";
                                    break;
                                case 5:
                                    kanaTokens[tokenIndex] = "ご";
                                    break;
                                case 6:
                                    kanaTokens[tokenIndex] = "ろく";
                                    break;
                                case 7:
                                    kanaTokens[tokenIndex] = "しち";
                                    break;
                                case 8:
                                    kanaTokens[tokenIndex] = "はち";
                                    break;
                                case 9:
                                    kanaTokens[tokenIndex] = "く";
                                    break;
                                case 10:
                                    kanaTokens[tokenIndex] = "じゅう";
                                    break;
                                case 11:
                                    kanaTokens[tokenIndex] = "じゅういち";
                                    break;
                                case 12:
                                    kanaTokens[tokenIndex] = "じゅうに";
                                    break;
                                default:
                                    console.log("Add number to case");
                                    console.log(kanjiTokens[tokenIndex] + " - " + nextKanjiTokens);
                                    assert(false);
                            }
                        } else if (nextKanjiTokens.startsWith("日")) {
                            switch (kanaNumber) {
                                case 1:
                                    kanaTokens[tokenIndex] = "いち";
                                    break;
                                case 10:
                                    kanaTokens[tokenIndex] = "とお";
                                    break;
                                case 15:
                                    kanaTokens[tokenIndex] = "じゅうご";
                                    break;
                                case 16:
                                    kanaTokens[tokenIndex] = "じゅうろく";
                                    break;
                                case 25:
                                    kanaTokens[tokenIndex] = "にじゅうご";
                                    break;
                                default:
                                    console.log("Add number to case");
                                    console.log(kanjiTokens[tokenIndex] + " - " + nextKanjiTokens);
                                    assert(false);
                            }
                        } else if (nextKanjiTokens.startsWith("月")) {
                            switch (kanaNumber) {
                                case 1:
                                    kanaTokens[tokenIndex] = "いち";
                                    break;
                                case 2:
                                    kanaTokens[tokenIndex] = "に";
                                    break;
                                case 3:
                                    kanaTokens[tokenIndex] = "さん";
                                    break;
                                case 4:
                                    kanaTokens[tokenIndex] = "し";
                                    break;
                                case 5:
                                    kanaTokens[tokenIndex] = "ご";
                                    break;
                                case 6:
                                    kanaTokens[tokenIndex] = "ろく";
                                    break;
                                case 7:
                                    kanaTokens[tokenIndex] = "しち";
                                    break;
                                case 8:
                                    kanaTokens[tokenIndex] = "はち";
                                    break;
                                case 9:
                                    kanaTokens[tokenIndex] = "く";
                                    break;
                                case 10:
                                    kanaTokens[tokenIndex] = "じゅう";
                                    break;
                                case 11:
                                    kanaTokens[tokenIndex] = "じゅういち";
                                    break;
                                case 12:
                                    kanaTokens[tokenIndex] = "じゅうに";
                                    break;
                                default:
                                    console.log("Add number to case");
                                    console.log(kanjiTokens[tokenIndex] + " - " + nextKanjiTokens);
                                    assert(false);
                            }
                        } else if (nextKanjiTokens.startsWith("年")) {
                            switch (kanaNumber) {
                                case 1:
                                    kanaTokens[tokenIndex] = "いち";
                                    break;
                                case 2:
                                    kanaTokens[tokenIndex] = "に";
                                    break;
                                case 3:
                                    kanaTokens[tokenIndex] = "さん";
                                    break;
                                case 4:
                                    kanaTokens[tokenIndex] = "よ";
                                    break;
                                case 5:
                                    kanaTokens[tokenIndex] = "ご";
                                    break;
                                case 6:
                                    kanaTokens[tokenIndex] = "ろく";
                                    break;
                                case 7:
                                    kanaTokens[tokenIndex] = "なな";
                                    break;
                                case 8:
                                    kanaTokens[tokenIndex] = "はち";
                                    break;
                                case 9:
                                    kanaTokens[tokenIndex] = "きゅう";
                                    break;
                                case 10:
                                    kanaTokens[tokenIndex] = "じゅう";
                                    break;
                                case 11:
                                    kanaTokens[tokenIndex] = "じゅういち";
                                    break;
                                case 12:
                                    kanaTokens[tokenIndex] = "じゅうに";
                                    break;
                                case 14:
                                    kanaTokens[tokenIndex] = "じゅうよん";
                                    break;
                                case 15:
                                    kanaTokens[tokenIndex] = "じゅうご";
                                    break;
                                case 30:
                                    kanaTokens[tokenIndex] = "さんじゅう";
                                    break;
                                case 50:
                                    kanaTokens[tokenIndex] = "ごじゅう";
                                    break;
                                case 80:
                                    kanaTokens[tokenIndex] = "はちじゅう";
                                    break;
                                default:
                                    console.log("Add number to case");
                                    console.log(kanjiTokens[tokenIndex] + " - " + nextKanjiTokens);
                                    assert(false);
                            }
                        } else {
                            card.reason = "English Number found";
                        }

                        if (!card.reason) {
                            // act as if found normal kanji
                            foundKanji++;
                        }
                    } else if (wTokens[i].type == "japaneseNumeral") {
                        card.reason = "Japanese Number found";
                    } else if (wTokens[i].type == "en") {
                        card.reason = "English letters found";
                    }
                }

                if (foundKanji == 0) {
                    // nothing for now
                } else if (foundKanji == 1) {
                    // loop again and push for things like 'ご飯' or '夏休み'
                    var fStarted = 0;
                    var fSize = kanaTokens[tokenIndex].length;
                    var tempCoverd = covered;
                    for (var i = 0; i < wTokens.length; i++) {
                        wTokenLength = wTokens[i].value.length;
                        if (wTokens[i].type == "kanji") {
                            fStarted = tempCoverd;

                            // edge case cause wanakana doesn't count "々" as a kanji
                            if (((i + 1) < wTokens.length) && (wTokens[i + 1].type == "japanesePunctuation") && (wTokens[i + 1].value == "々")) {
                                i++;
                                card.kanjiLength.push(wTokenLength + 1);
                            } else {
                                card.kanjiLength.push(wTokenLength);
                            }
                        } else if ((wTokens[i].type == "englishNumeral") && (!card.reason)) {
                            fStarted = tempCoverd;
                            card.kanjiLength.push(wTokenLength);
                        } else {
                            fSize -= wTokenLength;
                        }
                        tempCoverd += wTokenLength;
                    }
                    card.furigana.push(fStarted);
                    card.furigana.push(fSize);
                } else if (foundKanji > 1) {
                    // get things like '男の子'
                    card.reason = "Marked as single kanji: " + token;
                } else {
                    assert(false);
                }
            }

            covered += kanaTokens[tokenIndex].length;
        }

        // done at end in case tokens are modified
        card.kanji = kanjiTokens.join("");
        card.kana = kanaTokens.join("");

        card.translation = sentence.response.text;
        const soundUrl = sentence.sound;
        const soundFile = path.basename(soundUrl);

        if (downloadSound == true) {
            var res = request('GET', soundUrl, {});
            if (res.statusCode < 300) {
                fs.writeFileSync(path.join(downloadDir, soundFile), res.body);
                downloadedTotal++;
                if (downloadedTotal % 10 == 0) {
                    console.log("Downloaded " + downloadedTotal + " / ~" + estimateTotal);
                }
            } else {
                console.log("Didn't grab " + soundUrl + " due to error " + res.statusCode);
            }
        }

        if (soundUrl) {
            card.sound = soundFile;
        }

        if (card.reason) {
            manualCards.push(card);
        } else {
            out.cards.push(card);
        }
    }
}

fs.writeFileSync(path.join(decksDir, process.argv[2]), JSON.stringify(out));
fs.writeFileSync(path.join(decksDir, "FIX_" + process.argv[2]), JSON.stringify(manualCards));
console.log(manualCards.length + " manual cards to fix");