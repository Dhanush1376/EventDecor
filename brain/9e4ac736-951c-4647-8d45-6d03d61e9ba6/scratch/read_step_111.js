const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\Dhanush\\.gemini\\antigravity-ide\\brain\\9e4ac736-951c-4647-8d45-6d03d61e9ba6\\.system_generated\\logs\\transcript.jsonl';
const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.step_index === 111) {
      fs.writeFileSync('C:\\Users\\Dhanush\\.gemini\\antigravity-ide\\brain\\9e4ac736-951c-4647-8d45-6d03d61e9ba6\\scratch\\step_111_full.txt', data.content);
      console.log("Wrote step_111_full.txt");
    }
  } catch (err) {
    console.error(err);
  }
});
