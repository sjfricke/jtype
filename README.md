# jtype

日本語 typing practice. Two drills over a deck of sentences: type what you hear,
or type the reading of what you see.

```
npm start          # http://localhost:8000
PORT=9000 npm start
```

Nothing to install — the server is plain `node:http` and the front end is plain
ES modules. (`npm install` is only needed for the deck conversion scripts.)

## How it works

Pick a mode, pick a deck, type. Cards come in random order and the deck ends
when you have seen all of them.

You always type the **reading**, in romaji, which is converted to kana as you
go. You never type kanji and there is no IME involved — so in typing mode,
getting through a sentence means you knew how to read it.

Nothing is saved between sessions. There are no scores and no settings.

### Dictation

The sentence is hidden and the audio plays. Type what you hear. Characters
appear as you type past them, so you can see how much is left without being
told what it is.

Stuck? Hold `Space` for a hint — it uncovers just the next thing you have to
type, which is one kana, or a whole kanji compound when its reading only makes
sense as a unit. `Tab` replays the audio, `/` gives up and shows everything.

When you finish, the sentence and its meaning appear and the audio replays —
say the line out loud, then press `Enter` for the next one.

### Typing

The sentence is shown and you type its reading. Hold `Space` to peek at the
furigana for the next kanji you have not gotten past yet; let go and it hides
again. `/` reveals the whole card, and again puts it back.

When you finish, the meaning appears and the audio plays, so you can check the
sentence was what you thought it was.

## Keys

| key | dictation | typing |
|---|---|---|
| `Space` | **hold** for a hint: the next character | **hold** to peek at the next furigana |
| `Tab` | replay the audio | play the audio |
| `/` | reveal everything — press again to hide | same |
| `Enter` | next card — works any time, so it doubles as skip | same |
| `Backspace` | delete a character | same |
| `Esc` | back to the deck list | same |

Wrong characters are not blocked. They stay on screen in red, on both the input
line and the character you are stuck on, until you backspace over them.

## Typing Japanese

Romaji becomes kana as you type: `ki` → き, `kya` → きゃ, `matta` → まった.
Half-finished syllables sit on the line as latin until they resolve.

Two things are handled for you, because the answer is known:

- **ん** — press `n` once wherever the answer wants ん and it commits
  immediately, so `konya` is enough for こんや and `hon` for ほん. Typing `nn`
  out of habit also works.
- **katakana** — no shift key. `konbini` gives コンビニ when that is the answer,
  and こんびに when it is not.

Punctuation keys:

| key | kana |
|---|---|
| `-` | ー |
| `[` | 「 |
| `]` | 」 |
| `,` | 、 |
| `.` | 。 |

Digits are typed as-is. Long katakana vowels are the `-` key, not a doubled
vowel: クローム is `kuro-mu`.

### Less obvious combinations

| a | i | u | e | o |
|---|---|---|---|---|
| la ァ ぁ | li ィ ぃ | lu ゥ ぅ | le ェ ぇ | lo ォ ぉ |
| | | du ヅ づ | | |
| | | vu ヴ ゔ | | |
| | | | che チェ ちぇ | |
| | | | she シェ しぇ | |
| | | | je ジェ じぇ | |
| | wi ウィ うぃ | | we ウェ うぇ | who ウォ うぉ |
| kwa クァ くぁ | kwi クィ くぃ | | kwe クェ くぇ | kwo クォ くぉ |
| tsa ツァ つぁ | tsi ツィ つぃ | | tse ツェ つぇ | tso ツォ つぉ |
| | thi ティ てぃ | thu テュ てゅ | | |
| | dhi ディ でぃ | dhu デュ でゅ | | |
| fa ファ ふぁ | fi フィ ふぃ | fyu フュ ふゅ | fe フェ ふぇ | fo フォ ふぉ |
| va ヴァ ゔぁ | vi ヴィ ゔぃ | vyu ヴュ ゔゅ | ve ヴェ ゔぇ | vo ヴォ ゔぉ |

## Decks

41 decks, 5746 cards. Every card has audio except in `demo` and `test`, which are
scratch decks — dictation has nothing to play there.

| deck | cards | what it is |
|---|---|---|
| `iknow_1000_*`, `iknow_2000_*`, `iknow_3000_*` | 4668 | iKnow core vocabulary, ten steps each — short study sentences |
| `onomappu_*` | 476 | Onomappu video transcripts — natural conversational speech |
| `katakana_fast` | 335 | katakana words on their own, for speed |
| `nutshell` | 156 | Japanese in a Nutshell |
| `yuyu_convo_part_2` | 66 | a long-form conversation, longest sentences here |
| `meshclass_mistake` | 33 | a lesson on expressions for when you mess up |
| `demo`, `test` | 12 | a handful of cards for poking at the app |

## Adding content

A deck is one JSON file in `decks/`, with its audio in `decks/audio/<deck name>/`.
The point of the schema is that any source — a video transcript, a textbook, a
vocabulary export — can be turned into training material.

```json
{ "name": "my_deck", "version": 1, "cards": [ ... ] }
```

One card looks like this:

```json
{
    "kanji": "大学でスポーツが盛んです",
    "kana": "だいがくでスポーツがさかんです",
    "translation": "sports are popular at universities",
    "furigana": [0, 4, 10, 2],
    "kanjiLength": [2, 1],
    "sound": "12.mp3"
}
```

`kanji` is what you read and `kana` is what you type. The two are aligned by:

- `furigana` — `[start, length]` pairs into the **kana** string, one pair per
  kanji block, giving that block's reading. Above: `だいがく` at 0, `さか` at 10.
- `kanjiLength` — how many characters of the **kanji** string each of those
  readings covers. Above: `大学` is 2, `盛` is 1.

Everything between the pairs is identical in both strings. Getting this right is
what makes the per-character progress and the furigana peek land in the right
place; `node scripts/validate_decks.js` checks a deck over. `sound` is optional
and names a file in that deck's audio directory; `decks/schema.txt` has the bare
field list.

The other `scripts/` convert sources into this format (iKnow exports, YouTube
SRT, Satori Reader). They need `npm install` first.

## Layout

```
server.js              deck + audio over http, no state
decks/                 *.json, audio/<deck>/*.mp3
front/
  index.html
  style.css
  scripts/app.js       screens, modes, key handling
  scripts/card.js      kanji ↔ kana alignment and rendering
  scripts/kana.js      romaji buffer
scripts/               deck conversion and validation
```
