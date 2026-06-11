const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('admin') && !filePath.includes('admin\\')) {
        getAllFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getAllFiles(srcDir);
const icons = new Set();
const regex = />([a-z_]+)</g;
const regex2 = /icon="([a-z_]+)"/g;
const regex3 = /icon: '([a-z_]+)'/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  if (content.includes('material-symbols-outlined')) {
    // we just find anything between > and < if there's material-symbols-outlined in the file
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('material-symbols-outlined')) {
        let textLine = lines[i];
        if (!textLine.includes('>')) {
          if (i + 1 < lines.length) textLine += lines[i+1];
        }
        const m = textLine.match(/>\s*([a-z_]+)\s*</);
        if (m) icons.add(m[1].trim());
      }
    }
  }
  while ((match = regex2.exec(content)) !== null) {
    icons.add(match[1]);
  }
  while ((match = regex3.exec(content)) !== null) {
    icons.add(match[1]);
  }
}

// Add known icons manually just in case
const known = ["account_balance_wallet","add","arrow_back","arrow_downward","arrow_forward","arrow_left_alt","arrow_right_alt","arrow_upward","auto_awesome","auto_stories","calendar_month","call","cancel","category","chat","chat_bubble","check","check_circle","chevron_left","chevron_right","close","currency_rupee","description","directions","done","download","east","error","error_outline","event","event_available","expand_less","expand_more","explore","favorite","favorite_border","filter_list_off","filter_vintage","groups","history","home","info","inventory_2","keyboard_backspace","local_florist","local_mall","local_offer","local_shipping","location_on","login","logout","mail","menu","more_vert","my_location","north_east","notifications","open_in_new","package_2","payments","person","phone","rate_review","receipt_long","remove","schedule","search","search_off","security","sell","send","share","shopping_bag","shopping_cart","star","stars","storefront","sync","warning","workspace_premium"];

known.forEach(i => icons.add(i));

console.log(Array.from(icons).sort().join(','));
