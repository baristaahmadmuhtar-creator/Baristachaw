const fs = require('fs');
const file = 'apps/web/src/features/ai-brew/workflowTutorials.ts';
let code = fs.readFileSync(file, 'utf8');

const replacements = [
  // Length fixes
  ['Tuang air panas dalam pulsa pendek dan pekat. Alas datar mencegah channeling, memaksa setiap tetes membasuh kuat bubuk kopi.', 'Tuang air panas dalam pulsa pendek. Alas datar cegah channeling, memaksa air membasuh rata bubuk kopi.'],
  ['Lanjutkan tuangan perlahan dan stabil dengan aliran lurus ke bagian tengah. Filter tebal menahan air, menguatkan profil tubuh tanpa rasa getir.', 'Lanjutkan tuang perlahan ke tengah. Filter tebal menahan air, menguatkan bodi kopi tanpa rasa getir.'],
  ['Isi air panas hingga bawah katup tekanan untuk mencegah pre-ekstraksi dan memastikan proses ekstraksi berlangsung cepat.', 'Isi air panas hingga bawah katup untuk cegah pre-ekstraksi dan memastikan proses ekstraksi cepat.'],
  ['Tuang air perlahan dengan pola sirkular halus yang menutupi rata area kopi. Permukaan bergelombang mendukung kecepatan aliran konsentrat.', 'Tuang air perlahan dengan pola sirkular. Permukaan bergelombang mendukung kecepatan aliran konsentrat.'],
  ['Bagi sisa air ke dalam tuangan stabil, menjaga ketinggian air tetap konstan. Jaga sirkulasi terpusat untuk ekstraksi pekat di dasar datar.', 'Bagi sisa air ke tuangan stabil, jaga ketinggian air. Jaga sirkulasi terpusat untuk ekstraksi pekat.'],

  // Title fixes
  ["'Kalita Wave Iced Profile'", "'Flat Bottom Iced Profile'"],
  ["'Chemex Iced Setup'", "'Thick Filter Iced Setup'"],
  ["'Clever Iced Immersion'", "'Steep-Release Iced'"],
  ["'Moka Pot Over Ice'", "'Stovetop Over Ice'"],
  ["'Cold Brew Setup'", "'Slow Steeping Setup'"],
  ["'Batch Brewer Iced'", "'Auto Drip Iced'"],
  ["'Siphon Iced Method'", "'Vacuum Iced Method'"],
  ["'Origami Iced Profile'", "'Folded Dripper Iced'"],
  ["'April Brewer Iced'", "'Flat Bottom Iced'" ]
];

let changed = 0;
for (const [oldStr, newStr] of replacements) {
  if (code.includes(oldStr)) {
    code = code.split(oldStr).join(newStr);
    changed++;
    console.log('Replaced:', oldStr.substring(0, 30) + '...');
  } else {
    console.log('NOT FOUND:', oldStr.substring(0, 30) + '...');
  }
}

if (changed > 0) {
  fs.writeFileSync(file, code);
  console.log('File updated successfully.');
} else {
  console.log('No changes made.');
}
