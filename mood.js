// mood.js
const emojies = ['😆','🥰','💖','🌸','🐰','😎','😂','😊'];
const cutePhrases = [
  'อุ๊ย นั่นสนุกนะ!',
  'ฮ่า ๆ 😆',
  'น่ารักจังเลยค่ะ',
  'อิอิ 😜',
  'อุ๊ย อย่าลืมบอกบอทนะ!',
  'ว้าว! เจ๋งไปเลย 🐰'
];

function getRandomMood() {
  const emoji = emojies[Math.floor(Math.random() * emojies.length)];
  const phrase = cutePhrases[Math.floor(Math.random() * cutePhrases.length)];
  return `${emoji} ${phrase}`;
}

module.exports = { getRandomMood };
