const fs = require('fs');
const path = require('path');

const domainServicesPath = path.join(__dirname, 'src', 'services', 'domainServices.js');
const content = fs.readFileSync(domainServicesPath, 'utf8');

const regex = /^export const (\w+Service) = \{([\s\S]*?)^};/gm;
let match;
const services = [];

while ((match = regex.exec(content)) !== null) {
  services.push(match[1]);
}

console.log('Matches:', services);
