// node <script.js> <audio.mp3>
//
// breaks up audio into fragments

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const exec = require('child_process');

assert(process.argv.length > 2);

const audioFile = process.argv[2];
const deckName = "nutshell";
const audioPrefix = audioFile.substring((audioFile.indexOf("nutshell-grammar-") + "nutshell-grammar-".length), audioFile.indexOf(".mp3"));
var decksDir = path.join(__dirname, "..", "decks");
var downloadDir = path.join(decksDir, "audio", deckName);

// articlePresenter.sentenceAudioPositions
var audioMap = {
    "onaji-edition-m" :  [ 0.5, 3.349207, 8.018345, 11.5226269, 15.796567, 20.6352749, 26.5969715, 33.33352, 40.4570923, 47.51469, 50.6778374, 54.1018372, 58.1891, 64.6352539, 70.50473, 76.6529, 86.3368454, 93.3910446, 98.8287048, 104.136, 110.949875, 117.362991, 122.725357, 129.362 ],
    "chigau-edition-m" : [ 0.5, 3.764452, 7.683587, 13.469408, 17.5147038, 23.4018555, 29.4108543, 33.39142, 37.41425, 41.2274971, 45.3263741, 49.07481, 53.4426651, 58.10552, 64.11549, 69.09464, 72.41528, 77.3532257, 81.28751, 87.2756958, 91.99424, 103.358383, 109.837051, 119.633385 ],
    "similar-you-part-1-edition-m" : [ 0.5, 4.708656, 9.680633, 14.373065, 19.2936287, 24.6504955, 29.9880829, 33.16974, 36.70918, 40.3685, 43.9737434, 47.27392, 53.50329, 59.3100929, 65.97002, 71.67543, 80.47912, 87.84929, 94.15927, 99.90668, 110.908279, 120.992508, 127.734619, 136.647415, 143.43866, 149.874115 ],
    "similar-you-part-2-edition-m" : [ 0.5, 4.670798, 9.345779, 13.0550871, 16.8353119, 20.74598, 24.2914276, 28.0796986, 31.738678, 36.85856, 42.4870834, 51.29127, 58.5578, 63.55963, 69.27081, 76.38997, 81.1037445, 86.5107651 ],
    "while-nagara-edition-m" : [ 0.5, 3.873699, 6.608301, 9.859076, 14.7823048, 20.5610466, 26.35906, 31.7562847, 37.33127, 42.5628433, 48.72228, 55.0567436, 62.23795, 70.72648, 76.15413 ],
    "kinds-you-part-1-edition-m" : [ 0.5, 3.699338, 6.723281, 9.859564, 12.8916225, 16.6154785, 20.2466927, 23.8999138, 27.2487717, 31.1345768, 34.9213333, 38.93709, 42.6065636, 46.2658653, 49.82125, 53.31075, 56.9960976, 60.885437, 64.7537, 68.58854, 73.967186, 79.36075, 84.24775, 90.55389, 96.54746, 100.60659, 107.790688, 114.003571, 118.9281, 124.470879, 130.162033, 135.438049, 141.716873 ],
    "kinds-you-part-2-edition-m" : [ 0.5, 5.974533, 10.3316212, 16.0180836, 21.2080517, 26.2816315, 31.2626019, 35.3507347, 40.5560837, 45.0638237, 50.1552925, 54.6998558, 60.1748123, 66.26775, 72.6943054, 79.6691055 ],
    "spontaneous-sensations-suru-edition-m" : [ 0.5, 3.914542, 7.607371, 10.9942379, 15.8887606, 19.08367, 22.2314682, 25.5015259, 29.0982361, 33.932663, 37.9197, 43.6378136, 47.3708038, 56.3124466, 59.95519, 64.79158, 68.58481, 72.30676, 75.74462, 80.10431, 85.6520157, 92.37452, 96.63041, 101.080284, 105.8589, 110.830109, 116.135094 ],
    "adverbial-phrases-you-edition-m" : [ 0.5, 5.05336, 9.097687, 14.1695461, 18.8792553, 22.7458611, 26.8524971, 31.5869217, 39.2061348, 45.0636, 50.53733, 55.86213, 61.4146042, 67.0629, 72.71263, 78.40387, 87.086235, 92.0682449, 97.80799, 103.367058, 109.768242, 116.147316, 122.753807, 131.218414, 139.504883, 148.945847, 156.447052, 162.21228 ],
    "pronoun-no-part-1-edition-m" : [ 0.5, 5.272771, 8.288738, 15.9655914, 21.4134, 28.9073715, 33.3001022, 41.6564636, 47.4489059, 52.2914734, 58.8705521, 65.60514, 73.22487, 80.85963, 87.9059143, 94.6051559, 104.422844, 114.5358, 118.310593, 122.816, 126.92794, 131.703766, 136.569687, 141.670425, 147.204712, 153.35907, 159.841492 ],
    "pronoun-no-part-2-edition-m" : [ 0.9, 5.72202, 10.5422688, 15.6940813, 20.93978, 25.91306, 30.8730068, 35.4462929, 39.3595848, 43.6662064, 47.86616, 52.5194473, 56.41274, 61.3726845, 65.67264, 71.5859146, 76.49919, 82.0591354, 87.30575, 94.13901, 99.15229, 105.045555, 110.7855, 117.445427, 121.498718 ],
    "pronoun-no-part-3-edition-m" : [ 0.5, 4.182586, 8.732689, 12.7665081, 17.3341236, 20.7851658, 25.0595284, 28.5278339, 33.0102577, 36.5292435, 41.07787, 44.8283119, 49.7154236, 53.5274925, 57.6895638, 62.0045471, 67.25279, 73.18435, 80.07242, 84.61472, 88.15531, 92.5053253, 97.0353241, 101.609734, 105.7925, 110.075409, 115.447105, 121.203972, 127.202255, 133.696823, 141.52417 ],
    "reliable-information-you-part-1-edition-m" : [ 0.5, 4.709352, 9.608317, 14.5337667, 19.5982475, 25.4666271, 29.7766972, 34.3297, 38.8247032, 43.4636345, 48.38944, 53.0909081, 58.2610741, 63.29903, 68.8311539, 74.31419, 80.51608, 86.8485641, 93.83761, 100.665672 ],
    "reliable-information-you-part-2-edition-m" : [ 0.5, 4.618556, 12.3039093, 17.4034634, 21.9667568, 26.6489067, 31.5639324, 36.57222, 42.0211, 47.9332, 52.8558121, 61.05485, 69.79267, 75.49683, 84.1594238, 92.63142, 101.622971 ],
    "hearsay-sou-edition-m" : [ 0.5, 5.126516, 9.87971, 12.9129553, 16.7995071, 21.6926975, 26.8525467, 32.412384, 36.97225, 42.3054276, 48.87857, 55.22505, 63.131485, 69.6246262, 75.21113, 82.56425 ],
    "potential-part-1-edition-m" : [ 0.5, 3.759944, 7.279892, 11.2531662, 15.5931025, 19.9463711, 25.5196228, 31.9395275, 39.41942, 43.9860153, 48.9992752, 55.5525131, 61.47909, 65.82569, 70.1123, 74.718895, 79.3188248, 83.37877, 88.35203, 93.27196, 97.40523, 101.2985, 105.038445, 108.851723, 112.725, 116.911606, 120.858215, 125.458145, 129.484756, 133.864685, 137.924622, 142.06456, 146.151169, 150.424438, 157.197678, 163.744247, 171.4308 ],
    "potential-part-2-edition-m" : [ 0.5, 2.893269, 5.226552, 8.299818, 12.1797333, 15.7996531, 18.8195877, 21.7928543, 25.3194447, 28.3727112, 31.0926514, 34.33925, 38.5524864, 42.3390732, 48.83893, 51.4188728, 54.17881, 57.4254074, 59.96535, 62.88529, 67.93851, 71.29844, 75.58501, 78.53161, 83.58483, 87.46475, 92.95796, 96.1312256, 99.55115, 103.024406, 108.390961, 112.310867, 116.477448, 122.230652, 127.450539, 134.830383, 140.430252, 144.836823, 151.996674, 157.9232, 165.029709, 175.302826]
}

if (!fs.existsSync(downloadDir)){
    fs.mkdirSync(downloadDir);
}

var sentenceAudioPositions = audioMap[audioPrefix];

for (var i = 0; i < sentenceAudioPositions.length; i++) {
    // turns in HH:MM::SS.mmm timestamp
    var startPos = " -ss " + new Date(sentenceAudioPositions[i] * 1000).toISOString().substr(11, 12);
    if (i == sentenceAudioPositions.length - 1) {
        var endPos = " "; // last clip plays to end of file
    } else {
        // Nutshell seems to always have at least a trailing second at end, help reduces it
        var endPos = " -to " + new Date((sentenceAudioPositions[i + 1] - 1) * 1000).toISOString().substr(11, 12);
    }

    ffmpegString = "ffmpeg " + startPos + endPos + " -i " + audioFile + " " + downloadDir + "/" + audioPrefix + "_" + i + ".mp3"
    // console.log(ffmpegString);
    exec.execSync(ffmpegString);
}