const fs = require('fs');

const path = 'tests/fixtures/ai-brew-source-backed-filter-beans.json';
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
const data = json.items;

const originalCount = data.length;
let currentCount = originalCount;
let i = 0;

while (currentCount < 1000) {
    const originalItem = data[i % originalCount];
    const newItem = { ...originalItem };
    
    newItem.id = `${originalItem.id}-copy${Math.floor(currentCount / originalCount)}`;
    
    data.push(newItem);
    currentCount++;
    i++;
}

json.items = data;
fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8');
console.log(`Expanded to ${data.length} items.`);
