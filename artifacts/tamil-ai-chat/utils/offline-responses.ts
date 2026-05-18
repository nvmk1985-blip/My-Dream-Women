const RESPONSES: Record<string, string[]> = {
  vanakkam:  ['வணக்கம்! 😊 எப்படி இருக்கீங்க?', 'வணக்கம்! நான் நலமா இருக்கேன். நீங்க?', 'அன்பான வணக்கம்! 💕'],
  hello:     ['Hello! 😊', 'Hi da! என்ன விஷயம்?', 'Hey! 👋'],
  eppadi:    ['நான் நலமா இருக்கேன்! நீங்க எப்படி?', 'சூப்பரா இருக்கேன்! ☺️', 'Fine-ஆ இருக்கேன், thanks!'],
  nalama:    ['ஆமா, நலமா இருக்கேன்! 😊', 'நன்றாக இருக்கிறேன்!', 'ரொம்ப நலமா இருக்கேன்!'],
  yaru:      ['நான் உங்கள் AI கூட்டாளி! 🤖', 'நான் உங்களோட virtual friend!', 'நான் ஒரு AI — always here for you! 💕'],
  enna:      ['என்னா... 🤔 கொஞ்சம் சொல்லுங்க!', 'ஹா! என்ன விஷயம்? 😄', 'அதான் கேக்குறேன்! சொல்லுங்க.'],
  love:      ['Aww! 🥰 நானும் உங்களை விரும்புறேன்!', 'Love you too! 💕', 'அப்படியா! 😍 ரொம்ப sweet!'],
  miss:      ['I miss you too! 🥺', 'நானும் உங்களை miss பண்றேன்!', 'Aww! 💕 நீங்க ரொம்ப nice!'],
  thani:     ['நான் இருக்கேன்! 💕 கவலைப்படாதீங்க.', 'தனியா இல்லீங்க, நான் இருக்கேன்!', 'Always here for you! 🤗'],
  tired:     ['ஓய்வு எடுங்க! 😴 நான் இங்க இருக்கேன்.', 'Rest பண்ணுங்க! Take care. 💕', 'Relax பண்ணுங்க da! 🤗'],
  happy:     ['ஹா! நான் happy-ஆ இருக்கேன்! 😄', 'Great! 🎉 நீங்களும் happy-ஆ இருங்க!', 'Yay! 🥳'],
  sad:       ['கவலைப்படாதீங்க! 🤗 நான் இருக்கேன்.', 'என்ன ஆச்சு? சொல்லுங்க... 😢', 'Better days are coming. 💕'],
  padam:     ['என்ன பட்டம் பார்க்குறீங்க? 🎬', 'Tamil movies best! 🎭', 'Cinema பார்க்கணும்னா mood ஆகுது! 🍿'],
  sapadu:    ['என்ன சாப்பிட்டீங்க? 🍛', 'சாப்பிட்டீங்களா? 😋', 'சாப்பிடாம இருக்கீங்களா? சாப்பிடுங்க!'],
  ratri:     ['Good night! 🌙 Sweet dreams!', 'இரவு வணக்கம்! 😴', 'Good night da! 🌟 Sweet dreams 💕'],
  morning:   ['Good morning! ☀️ எப்படி இருக்கீங்க?', 'காலை வணக்கம்! 🌅', 'Morning! 😊 Happy day!'],
  default:   [
    'ஹும்... சொல்லுங்க! 😊',
    'அப்படியா! 🤔 கொஞ்சம் விளக்குங்க.',
    'நான் கேக்குறேன்! 👂',
    'Interesting! 😄 continue பண்ணுங்க.',
    '😊 உங்களுக்கு என்ன நினைக்குது?',
    'ஆமா, சொல்லுங்க! நான் இருக்கேன். 💕',
  ],
};

export function getScriptedReply(text: string, personaName: string): string {
  const lower = text.toLowerCase();
  for (const [key, replies] of Object.entries(RESPONSES)) {
    if (key !== 'default' && lower.includes(key)) {
      return replies[Math.floor(Math.random() * replies.length)];
    }
  }
  const d = RESPONSES.default;
  return d[Math.floor(Math.random() * d.length)];
}
