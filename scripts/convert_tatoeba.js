// Builds deck(s) from the Tatoeba Project's Japanese sentence corpus:
// https://tatoeba.org — short natural sentences recorded by volunteers.
//
// Usage:
//   node scripts/convert_tatoeba.js <tatoeba_dump_dir> [--decks N] [--seed N]
//
// <tatoeba_dump_dir> must contain these files, decompressed, tab-separated,
// downloaded from https://downloads.tatoeba.org/exports/per_language/<lang>/ :
//   jpn_sentences_with_audio.tsv   (sentence_id, audio_id, username, license, attribution_url)
//   jpn_transcriptions.tsv         (sentence_id, lang, script, username, transcription)
//   jpn_sentences.tsv              (sentence_id, lang, text)
//   jpn-eng_links.tsv              (jpn_sentence_id, eng_sentence_id)
//   eng_sentences.tsv              (sentence_id, lang, text)
//
// Only audio whose license field is non-empty is usable outside Tatoeba (an
// empty license means "Tatoeba-internal only"); this script keeps CC BY and
// CC BY-NC only. CC BY-NC forbids commercial use, which is fine for a
// personal study tool but means these decks should not be redistributed
// commercially. Each deck gets a sibling <deck>.attribution.tsv recording the
// sentence id, contributor username, license and a link back to the sentence,
// as CC BY(-NC) requires.
//
// The transcription format marks kanji spans with their reading:
//   [span|reading] or [span|r1|r2|...] (readings concatenate; segments can be
//   empty, e.g. [10分|じゅっ||ぷん]). Everything outside brackets is literal
// and identical between the kanji and kana strings — which is exactly the
// furigana/kanjiLength alignment jtype's card schema wants, so no morphological
// analyzer (mecab, wanakana tokenizer) is needed for this source.

const fs = require('fs');
const path = require('path');
const https = require('https');

const DECKS_DIR = path.join(__dirname, '..', 'decks');
const USABLE_LICENSES = new Set(['CC BY 4.0', 'CC BY-NC 4.0']);
const TOKEN = /\[([^\]]*)\]/g;

function readTsv(file) {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
}

// Turns one bracket-annotated transcription into a card's kanji/kana/furigana/
// kanjiLength, the same alignment described in decks/schema.txt.
function parseTranscription(transcription) {
    let kanji = '';
    let kana = '';
    const furigana = [];
    const kanjiLength = [];
    let pos = 0;
    let m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(transcription))) {
        const literal = transcription.slice(pos, m.index);
        kanji += literal;
        kana += literal;

        const parts = m[1].split('|');
        const span = parts[0];
        const reading = parts.length > 1 ? parts.slice(1).join('') : span;

        furigana.push(kana.length, reading.length);
        kanjiLength.push(span.length);
        kanji += span;
        kana += reading;
        pos = m.index + m[0].length;
    }
    const tail = transcription.slice(pos);
    kanji += tail;
    kana += tail;
    return { kanji, kana, furigana, kanjiLength };
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'jtype-deck-builder/1.0 (personal language study tool)' } }, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const body = Buffer.concat(chunks);
                if (body.length < 500) return reject(new Error(`suspiciously small response (${body.length}b)`));
                fs.writeFileSync(dest, body);
                resolve();
            });
        }).on('error', reject);
    });
}

async function downloadAll(jobs, concurrency) {
    let ok = 0;
    const failures = [];
    let next = 0;
    async function worker() {
        while (next < jobs.length) {
            const job = jobs[next++];
            if (fs.existsSync(job.dest) && fs.statSync(job.dest).size > 0) { ok++; continue; }
            try {
                await download(job.url, job.dest);
                ok++;
            } catch (e) {
                failures.push({ ...job, error: e.message });
            }
        }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    return { ok, failures };
}

function shuffled(arr, seed) {
    // Small deterministic LCG so re-runs with the same --seed reproduce the same split.
    let s = seed >>> 0;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

async function main() {
    const dumpDir = process.argv[2];
    if (!dumpDir) {
        console.error('usage: node scripts/convert_tatoeba.js <tatoeba_dump_dir> [--decks N] [--seed N]');
        process.exit(1);
    }
    const numDecks = Number(argValue('--decks') || 3);
    const seed = Number(argValue('--seed') || 7);

    function argValue(flag) {
        const i = process.argv.indexOf(flag);
        return i >= 0 ? process.argv[i + 1] : undefined;
    }

    const audio = new Map();
    for (const [id, audioId, user, license] of readTsv(path.join(dumpDir, 'jpn_sentences_with_audio.tsv'))) {
        if (USABLE_LICENSES.has(license)) audio.set(id, { audioId, user, license });
    }
    console.log(`usable-license audio: ${audio.size}`);

    const transcriptions = new Map();
    for (const [id, , , , text] of readTsv(path.join(dumpDir, 'jpn_transcriptions.tsv'))) {
        transcriptions.set(id, text);
    }

    const rawJpn = new Map();
    for (const [id, , text] of readTsv(path.join(dumpDir, 'jpn_sentences.tsv'))) rawJpn.set(id, text);

    const links = new Map();
    for (const [jid, eid] of readTsv(path.join(dumpDir, 'jpn-eng_links.tsv'))) {
        if (!links.has(jid)) links.set(jid, []);
        links.get(jid).push(eid);
    }

    const needed = new Set();
    for (const id of audio.keys()) for (const eid of links.get(id) || []) needed.add(eid);
    const eng = new Map();
    for (const [id, , text] of readTsv(path.join(dumpDir, 'eng_sentences.tsv'))) {
        if (needed.has(id)) eng.set(id, text);
    }

    const cards = [];
    for (const [id, a] of audio) {
        const transcription = transcriptions.get(id);
        const eids = (links.get(id) || []).filter((e) => eng.has(e));
        if (!transcription || eids.length === 0) continue;

        const { kanji, kana, furigana, kanjiLength } = parseTranscription(transcription);
        if (rawJpn.get(id) !== kanji) {
            console.warn(`skipping ${id}: parsed kanji does not match source sentence`);
            continue;
        }
        // Prefer the shortest translation link — usually the more literal one.
        const translation = eng.get(eids.sort((x, y) => eng.get(x).length - eng.get(y).length)[0]);
        cards.push({ id, audioId: a.audioId, user: a.user, license: a.license, kanji, kana, translation, furigana, kanjiLength });
    }
    console.log(`parsed cards: ${cards.length}`);

    const chunks = Array.from({ length: numDecks }, () => []);
    shuffled(cards, seed).forEach((c, i) => chunks[i % numDecks].push(c));

    const downloadJobs = [];
    for (let i = 0; i < numDecks; i++) {
        const name = `tatoeba_natural_${String(i + 1).padStart(2, '0')}`;
        const audioDir = path.join(DECKS_DIR, 'audio', name);
        fs.mkdirSync(audioDir, { recursive: true });

        const deck = { name, version: 1, cards: [] };
        const attribution = [];
        for (const c of chunks[i]) {
            deck.cards.push({
                kanji: c.kanji, kana: c.kana, translation: c.translation,
                furigana: c.furigana, kanjiLength: c.kanjiLength, sound: `${c.id}.mp3`,
            });
            attribution.push([c.id, c.user, c.license, `https://tatoeba.org/en/sentences/show/${c.id}`].join('\t'));
            downloadJobs.push({ url: `https://tatoeba.org/audio/download/${c.audioId}`, dest: path.join(audioDir, `${c.id}.mp3`) });
        }
        fs.writeFileSync(path.join(DECKS_DIR, `${name}.json`), JSON.stringify(deck, null, 4));
        fs.writeFileSync(path.join(DECKS_DIR, `${name}.attribution.tsv`), attribution.join('\n') + '\n');
        console.log(`${name}: ${deck.cards.length} cards`);
    }

    console.log(`downloading ${downloadJobs.length} audio files...`);
    const { ok, failures } = await downloadAll(downloadJobs, 8);
    console.log(`audio ok: ${ok}, failed: ${failures.length}`);
    for (const f of failures) console.log('  FAIL', f.dest, f.error);
}

main();
