const fs = require('fs');
const path = require('path');
const exec = require('child_process');
const wanakana = require('wanakana');

const inputFile = "temp.txt";

module.exports.getKanjiMapping = function(sentence) {
    fs.writeFileSync(inputFile, sentence);
    // format is:
    // <original>   <katanana_spelling>
    let execString = "mecab " + inputFile + " --node-format=\"%m\\t%f[7]\\n\"";
    let output = "";
    try {
        output = exec.execSync(execString).toString();
    } catch {
        console.log("FAILED mecab: " + sentence);
        return undefined;
    }
    let scopes = output.split("\n");
    scopes.pop(); // empty line
    scopes.pop(); // EOS

    // Don't use a Map() because can have valid duplicate keys
    var mapping = new Array();
    for (let i = 0; i < scopes.length; i++) {
        let scope = scopes[i];
        let original = scope.split("\t")[0];
        let kana =  wanakana.toHiragana(scope.split("\t")[1]);
        // strip what you can, but things like "食べ物" will still have hirigana
        let kanji = wanakana.stripOkurigana(original);
        // need to strip kana to match
        let diff = original.length - kanji.length;
        kana = kana.slice(0, kana.length - diff);

        if (!wanakana.isKanji(kanji)) {
            original = kanji;
            kanji = wanakana.stripOkurigana(original, { leading: true });
            diff = original.length - kanji.length;
            kana = kana.slice(diff, kana.length);
        }

        if (wanakana.isKanji(kanji[0]) && wanakana.isKanji(kanji[kanji.length - 1])) {
            mapping.push({"kanji" : kanji, "kana" : kana});
        }
    }
    return mapping
};