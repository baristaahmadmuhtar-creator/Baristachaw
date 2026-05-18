import type { AiBrewMethodFamily } from './types.ts';

export interface AiBrewKnowledgeInput {
  coffeeName?: string;
  dripperName?: string;
  methodFamily?: AiBrewMethodFamily;
  process?: string;
  variety?: string;
}

interface AiBrewKnowledgeSeed {
  category:
    | 'origin'
    | 'hardware'
    | 'process'
    | 'variety'
    | 'species'
    | 'sensory'
    | 'extraction';
  keyword: string;
  aliases: string[];
  content: string;
  priority: number;
}

// Seeded from the operator knowledge workbook.
// Keep this auditable and deterministic until the admin knowledge catalog is wired to Supabase.
const AI_BREW_KNOWLEDGE_SEEDS: AiBrewKnowledgeSeed[] = [
  {
    category: 'origin',
    keyword: 'Gayo',
    aliases: ['gayo', 'sumatra gayo', 'aceh gayo'],
    content:
      'Knowledge v2 - Gayo: body cenderung tebal dengan spice/earthy sweetness; dorong sweetness lewat kontak rapi, bukan suhu/agitation berlebihan agar finish tidak pahit atau keruh.',
    priority: 84,
  },
  {
    category: 'origin',
    keyword: 'Mandheling / Lintong',
    aliases: ['mandheling', 'lintong', 'sumatra mandheling', 'lake toba', 'toba'],
    content:
      'Knowledge v2 - Mandheling/Lintong: struktur dan herbal-spice sering lebih dominan daripada acidity; pakai baseline body yang bersih, jaga drawdown tidak macet, dan hindari late swirl berat.',
    priority: 80,
  },
  {
    category: 'origin',
    keyword: 'Toraja / Sulawesi',
    aliases: ['toraja', 'sulawesi', 'kalosi'],
    content:
      'Knowledge v2 - Toraja/Sulawesi: body, spice, cocoa, dan herbal tone perlu ekstraksi rapi; target dense boleh dipakai tetapi bitter-risk harus dijaga dengan agitasi rendah di akhir.',
    priority: 76,
  },
  {
    category: 'origin',
    keyword: 'Java / Bali / Flores',
    aliases: ['java', 'west java', 'east java', 'ijen', 'bali', 'kintamani', 'flores', 'bajawa'],
    content:
      'Knowledge v2 - Java/Bali/Flores: profil Indonesia bisa bergerak dari cocoa-spice sampai citrus-herbal; mulai balance/soft, jaga flow rapi, lalu arahkan target dari cup feedback.',
    priority: 72,
  },
  {
    category: 'origin',
    keyword: 'Papua / PNG',
    aliases: ['papua', 'papua new guinea', 'png', 'wahgi', 'eastern highlands'],
    content:
      'Knowledge v2 - Papua/PNG: sweetness, herbal fruit, dan body medium sering butuh ekstraksi bersih; jangan terlalu agresif di akhir karena finish bisa cepat dry.',
    priority: 72,
  },
  {
    category: 'origin',
    keyword: 'Ethiopia highland',
    aliases: ['ethiopia', 'ethiopian', 'yirgacheffe', 'guji', 'sidamo', 'harrar'],
    content:
      'Knowledge v2 - Ethiopia/highland: clarity, florals, citrus, dan aromatics mudah hilang kalau agitation kasar; pakai flow tenang, bed rata, dan koreksi kecil dari grind sebelum menaikkan suhu besar.',
    priority: 83,
  },
  {
    category: 'origin',
    keyword: 'Kenya',
    aliases: ['kenya', 'kenyan', 'nyeri', 'kirinyaga', 'kiambu'],
    content:
      'Knowledge v2 - Kenya: acidity dan structure bisa tinggi; ekstraksi perlu cukup dalam untuk sweetness tetapi late agitation berlebih dapat membuat finish dry/astringent.',
    priority: 82,
  },
  {
    category: 'origin',
    keyword: 'Rwanda / Burundi',
    aliases: ['rwanda', 'burundi', 'huye', 'kayanza', 'ngozi'],
    content:
      'Knowledge v2 - Rwanda/Burundi: acidity, tea-like clarity, dan sweetness bisa elegan tetapi mudah dry jika flow tidak rata; prioritaskan bed even dan finishing gentle.',
    priority: 74,
  },
  {
    category: 'origin',
    keyword: 'Colombia',
    aliases: ['colombia', 'huila', 'cauca', 'narino', 'nariño', 'tolima'],
    content:
      'Knowledge v2 - Colombia: baseline biasanya fleksibel antara clean sweetness dan fruit; mulai balance-clean lalu arahkan ke floral/fruit/body sesuai process dan roast, bukan asal menaikkan ekstraksi.',
    priority: 68,
  },
  {
    category: 'origin',
    keyword: 'Costa Rica / Panama / Guatemala',
    aliases: ['costa rica', 'tarrazu', 'panama', 'boquete', 'volcan', 'guatemala', 'antigua', 'huehuetenango'],
    content:
      'Knowledge v2 - Central America highland: clean sweetness, florals, citrus, dan cocoa bisa sangat target-dependent; gunakan target profile sebagai arah utama dan jaga repeatability pour.',
    priority: 74,
  },
  {
    category: 'origin',
    keyword: 'Mexico / Peru / Bolivia',
    aliases: ['mexico', 'chiapas', 'oaxaca', 'peru', 'cajamarca', 'cusco', 'bolivia'],
    content:
      'Knowledge v2 - Mexico/Peru/Bolivia: sweetness lembut, nutty/cocoa, atau highland citrus butuh baseline stabil; jangan push body sampai clarity hilang kecuali target memang dense.',
    priority: 68,
  },
  {
    category: 'origin',
    keyword: 'Brazil',
    aliases: ['brazil', 'brasil', 'cerrado', 'minas', 'mogiana'],
    content:
      'Knowledge v2 - Brazil: nutty, cocoa, caramel, dan soft sweetness lebih penting daripada acidity tajam; pakai agitasi rendah dan hindari over-extraction yang membuat woody/dry.',
    priority: 70,
  },
  {
    category: 'origin',
    keyword: 'Yemen',
    aliases: ['yemen', 'yemeni', 'haraz', 'mocca', 'mocha mattari'],
    content:
      'Knowledge v2 - Yemen: dried fruit, spice, winey tone, dan variability tinggi perlu baseline konservatif; jaga contact rapi dan hindari suhu/agitation ekstrem sebelum cupping feedback.',
    priority: 72,
  },
  {
    category: 'origin',
    keyword: 'India',
    aliases: ['india', 'indian', 'chikmagalur', 'chikkamagaluru', 'nilgiri', 'bababudan', 'monsooned malabar'],
    content:
      'Knowledge v2 - India: spice, cocoa, nuttiness, monsooned softness, atau robusta blend perlu kontrol bitterness; target body boleh, tetapi heat/contact harus rapi.',
    priority: 70,
  },
  {
    category: 'origin',
    keyword: 'Yunnan / Southeast Asia',
    aliases: ['yunnan', 'china yunnan', 'menghai', 'pu er', 'puer', 'thailand', 'doi chang', 'doi tung', 'myanmar', 'vietnam', 'da lat', 'dalat'],
    content:
      'Knowledge v2 - Yunnan/SEA: fruit, tea-like sweetness, spice, dan processing variance bisa besar; gunakan baseline konservatif dan validasi dari cup sebelum mendorong suhu atau kontak.',
    priority: 66,
  },
  {
    category: 'process',
    keyword: 'Washed',
    aliases: ['washed', 'fully washed', 'wet process', 'double washed', 'mechanically demucilaged'],
    content:
      'Knowledge v2 - Washed: prioritaskan clarity, acidity bersih, dan sweetness linear; dry pocket/channeling lebih merusak daripada kekurangan body, jadi bloom harus merata dan flow stabil.',
    priority: 78,
  },
  {
    category: 'process',
    keyword: 'Semi-washed / wet-process hybrid',
    aliases: ['semi washed', 'semi-washed', 'wet process hybrid', 'eco pulped', 'mucilage removed'],
    content:
      'Knowledge v2 - Semi-washed/hybrid process: body dan clarity bisa berada di tengah; jangan treat otomatis seperti washed penuh atau natural penuh, validasi lewat flow dan cup feedback.',
    priority: 72,
  },
  {
    category: 'process',
    keyword: 'Natural',
    aliases: ['natural', 'dry process', 'raised bed natural', 'dry-process'],
    content:
      'Knowledge v2 - Natural: sweetness dan aroma buah mudah naik, tetapi muddiness juga cepat muncul; gunakan agitation lebih rendah, bed rapi, dan hindari late pour yang terlalu agresif.',
    priority: 79,
  },
  {
    category: 'process',
    keyword: 'Honey / Pulped Natural',
    aliases: ['honey', 'yellow honey', 'red honey', 'black honey', 'white honey', 'pulped natural'],
    content:
      'Knowledge v2 - Honey/pulped natural: target soft-round atau more-sweetness sering aman; jaga sweetness lewat middle contact, bukan menambah turbulence di akhir.',
    priority: 73,
  },
  {
    category: 'process',
    keyword: 'Anaerobic / Carbonic',
    aliases: ['anaerobic', 'carbonic', 'carbonic maceration', 'cm', 'lactic', 'yeast fermentation', 'extended fermentation'],
    content:
      'Knowledge v2 - Anaerobic/carbonic: aroma tinggi dan ferment-risk butuh ekstraksi konservatif; turunkan agresivitas pour, jaga suhu tidak berlebihan, dan pakai taste feedback sebelum push extraction.',
    priority: 88,
  },
  {
    category: 'process',
    keyword: 'Co-ferment / infused',
    aliases: ['coferment', 'co-ferment', 'co fermented', 'infused', 'fruit maceration', 'koji', 'enzyme fermentation', 'thermal shock'],
    content:
      'Knowledge v2 - Co-ferment/infused/experimental: jangan mengklaim flavor dari ekstraksi saja; treat as high-variability, protect aroma, dan hindari koreksi besar sebelum cup feedback.',
    priority: 90,
  },
  {
    category: 'process',
    keyword: 'Wet-hulled',
    aliases: ['wet hulled', 'wet-hulled', 'giling basah', 'semi washed indonesia', 'semi-washed indonesia'],
    content:
      'Knowledge v2 - Wet-hulled: body, spice, herbal, dan earthy sweetness bisa kuat; gunakan dense/soft target dengan suhu dan agitation terkendali agar body tidak berubah jadi bitter/muddy.',
    priority: 87,
  },
  {
    category: 'process',
    keyword: 'Monsooned',
    aliases: ['monsooned', 'monsooned malabar', 'malabar'],
    content:
      'Knowledge v2 - Monsooned: acidity rendah, body lembut, spice/woody risk lebih tinggi; cari sweetness dan texture bersih dengan suhu/contact konservatif.',
    priority: 78,
  },
  {
    category: 'process',
    keyword: 'Decaf',
    aliases: ['decaf', 'decaffeinated', 'sugarcane', 'ea decaf', 'ethyl acetate', 'swiss water', 'mountain water', 'co2 decaf'],
    content:
      'Knowledge v2 - Decaf: struktur sel lebih sensitif dan bitterness/astringency bisa cepat muncul; mulai lebih konservatif, koreksi grind kecil, dan hindari suhu tinggi berlebihan.',
    priority: 86,
  },
  {
    category: 'species',
    keyword: 'Robusta / Canephora',
    aliases: ['robusta', 'canephora', 'conilon', 'fine robusta'],
    content:
      'Knowledge v2 - Canephora/robusta: body, crema, bitterness-risk, dan earthy/nutty tone lebih tinggi; turunkan aggression, jaga suhu lebih hati-hati, dan cari sweetness/body bersih bukan acidity tajam.',
    priority: 89,
  },
  {
    category: 'species',
    keyword: 'Liberica / Excelsa',
    aliases: ['liberica', 'excelsa', 'barako'],
    content:
      'Knowledge v2 - Liberica/Excelsa: aroma unik, woody/fruity, dan body bisa ekstrem; gunakan confidence konservatif, hindari over-agitation, dan validasi dengan tasting sebelum mengunci resep.',
    priority: 85,
  },
  {
    category: 'variety',
    keyword: 'Gesha / Geisha',
    aliases: ['gesha', 'geisha'],
    content:
      'Knowledge v2 - Gesha/Geisha: floral transparency lebih penting daripada body besar; gunakan pour rendah, agitation minimal, dan jangan mengejar extraction depth sampai finish menjadi dry.',
    priority: 84,
  },
  {
    category: 'variety',
    keyword: 'SL28 / SL34',
    aliases: ['sl28', 'sl 28', 'sl34', 'sl 34'],
    content:
      'Knowledge v2 - SL28/SL34: acidity-structure dan blackcurrant-like brightness perlu sweetness support; cukupkan ekstraksi, tetapi hindari channeling dan late harshness.',
    priority: 80,
  },
  {
    category: 'variety',
    keyword: 'Bourbon / Typica',
    aliases: ['bourbon', 'typica', 'red bourbon', 'yellow bourbon', 'orange bourbon'],
    content:
      'Knowledge v2 - Bourbon/Typica: sweetness klasik dan balance biasanya kuat; gunakan baseline clean/sweet dan koreksi kecil dari grind serta middle contact.',
    priority: 62,
  },
  {
    category: 'variety',
    keyword: 'Caturra / Catuai / Mundo Novo',
    aliases: ['caturra', 'catuai', 'catuaí', 'mundo novo', 'pacas', 'villa sarchi'],
    content:
      'Knowledge v2 - Caturra/Catuai/Mundo Novo/Pacas: sweetness dan balance sering mudah dibangun; jaga clarity dengan flow rapi dan hindari ekstraksi terlalu panjang pada roast medium-dark.',
    priority: 64,
  },
  {
    category: 'variety',
    keyword: 'Catimor / Timor / S795',
    aliases: ['catimor', 'timor hybrid', 'timtim', 'tim tim', 's795', 'sln9', 'ateng', 'sigararutang', 'sigarar utang'],
    content:
      'Knowledge v2 - Catimor/Timor/S795/Indonesia selections: body dan herbal/cocoa tone bisa dominan; jangan push acidity secara agresif, jaga sweetness dan hindari woody/bitter finish.',
    priority: 75,
  },
  {
    category: 'hardware',
    keyword: 'V60',
    aliases: ['v60', 'hario v60'],
    content:
      'Knowledge v2 - V60: clarity tinggi tetapi sensitif channeling; gunakan center-to-mid/compact spiral konsisten, bloom fully saturated, dan jangan mengejar dinding filter pada fase akhir.',
    priority: 92,
  },
  {
    category: 'hardware',
    keyword: 'Origami',
    aliases: ['origami'],
    content:
      'Knowledge v2 - Origami: cone paper cenderung cepat dan transparent, wave paper lebih flat/sweet; baca filter style sebelum menentukan agitation dan pulse shape.',
    priority: 82,
  },
  {
    category: 'hardware',
    keyword: 'Kalita Wave',
    aliases: ['kalita', 'kalita wave', 'wave 155', 'wave 185', 'kalita_wave'],
    content:
      'Knowledge v2 - Kalita Wave: flat-bed sweetness butuh bed level dan pulse rendah; jika stall/muddy, koreksi grind/agitation daripada menambah swirl.',
    priority: 82,
  },
  {
    category: 'hardware',
    keyword: 'April Brewer',
    aliases: ['april', 'april brewer'],
    content:
      'Knowledge v2 - April/low-agitation flat bottom: jaga pulse pendek, spout rendah, dan bed rata; sweetness datang dari repeatability, bukan agitation besar.',
    priority: 82,
  },
  {
    category: 'hardware',
    keyword: 'Orea / fast flat bottom',
    aliases: ['orea', 'b75', 'timemore b75', 'fast flat bottom'],
    content:
      'Knowledge v2 - Orea/B75/fast flat-bottom: flow cepat dan clarity bisa tinggi; gunakan grind/flow yang menjaga contact cukup tanpa memaksa agitation besar.',
    priority: 82,
  },
  {
    category: 'hardware',
    keyword: 'No-bypass brewer',
    aliases: ['tricolate', 'pulsar', 'nextlevel', 'next level', 'no bypass', 'no-bypass'],
    content:
      'Knowledge v2 - No-bypass brewer: semua air melewati bed sehingga ekstraksi bisa tinggi; full saturation dan grind yang tidak terlalu halus lebih penting daripada swirl agresif.',
    priority: 86,
  },
  {
    category: 'hardware',
    keyword: 'Melitta / Kono',
    aliases: ['melitta', 'kono'],
    content:
      'Knowledge v2 - Melitta/Kono: flow lebih anchored dan forgiving; jaga pour path lebih terukur, bed level, dan jangan treat persis seperti V60 cepat.',
    priority: 78,
  },
  {
    category: 'hardware',
    keyword: 'Chemex',
    aliases: ['chemex'],
    content:
      'Knowledge v2 - Chemex: filter tebal memberi clarity dan body lebih ringan; rinse/preheat serius, vent terbuka, hindari wall-chasing, dan terima drawdown lebih panjang dari V60.',
    priority: 86,
  },
  {
    category: 'hardware',
    keyword: 'Hario Switch',
    aliases: ['hario switch', 'switch', 'hario_switch', 'mugen x switch'],
    content:
      'Knowledge v2 - Hario Switch: closed phase menaikkan sweetness/body, open phase menjaga clarity; validasi chamber load, release timing, dan jangan ubah full immersion menjadi Clever generik.',
    priority: 94,
  },
  {
    category: 'hardware',
    keyword: 'Clever Dripper',
    aliases: ['clever', 'clever dripper', 'clever_dripper'],
    content:
      'Knowledge v2 - Clever: immersion + release; wetting awal harus merata, steep tenang, lalu release bersih tanpa aduk saat drawdown agar cup tidak muddy.',
    priority: 83,
  },
  {
    category: 'hardware',
    keyword: 'AeroPress',
    aliases: ['aeropress', 'aero press'],
    content:
      'Knowledge v2 - AeroPress: kontrol utama adalah steep, stir count, press pressure, stop-before-hiss, dan bypass/no-bypass; jangan pakai bahasa drawdown V60.',
    priority: 88,
  },
  {
    category: 'hardware',
    keyword: 'French Press',
    aliases: ['french press', 'french_press', 'press pot'],
    content:
      'Knowledge v2 - French Press: extraction dikontrol oleh steep, crust break, settle, slow press, dan decant; fines management lebih penting daripada pour technique.',
    priority: 86,
  },
  {
    category: 'hardware',
    keyword: 'Espresso',
    aliases: ['espresso', 'espresso machine'],
    content:
      'Knowledge v2 - Espresso: rasa harus dibaca dari dose-yield-time-flow-puck prep; sour biasanya kurang ekstrak/channeling, bitter/dry sering over-extract atau puck tidak rapi.',
    priority: 95,
  },
  {
    category: 'hardware',
    keyword: 'Moka Pot',
    aliases: ['moka', 'moka pot', 'moka_pot', 'bialetti', 'stovetop'],
    content:
      'Knowledge v2 - Moka Pot: basket level tanpa tamp, heat stabil, dan stop-before-sputter adalah kunci; bitterness sering dari panas agresif atau memaksa fase akhir.',
    priority: 86,
  },
  {
    category: 'hardware',
    keyword: 'Siphon',
    aliases: ['siphon', 'syphon', 'vacuum pot'],
    content:
      'Knowledge v2 - Siphon: heat stability, draw-up, short stir, upper-chamber contact, dan clean drawdown menentukan clarity; terlalu banyak aduk menumpulkan aroma.',
    priority: 80,
  },
  {
    category: 'hardware',
    keyword: 'Cold Brew',
    aliases: ['cold brew', 'cold_brew', 'toddy'],
    content:
      'Knowledge v2 - Cold Brew: extraction datang dari saturation, grind coarse, time, temperature, filtration, dan dilution setelah filtrasi; jangan memakai logika bloom/pour panas.',
    priority: 84,
  },
  {
    category: 'hardware',
    keyword: 'Batch Brew',
    aliases: ['batch brew', 'batch_brew', 'batch brewer', 'automatic brewer'],
    content:
      'Knowledge v2 - Batch Brew: bed depth, spray pattern, basket geometry, filter fit, drawdown, dan batch mixing menentukan repeatability; jangan memakai koreksi pour manual.',
    priority: 82,
  },
  {
    category: 'sensory',
    keyword: 'Sour / under-extracted',
    aliases: ['sour', 'under extracted', 'under-extracted', 'sharp acid', 'tajam', 'asam tajam'],
    content:
      'Knowledge v2 - Sour/under-extracted: cek dry pocket, channeling, grind terlalu kasar, kontak pendek, atau suhu rendah; koreksi kecil dari grind/contact sebelum mengubah rasio besar.',
    priority: 70,
  },
  {
    category: 'sensory',
    keyword: 'Bitter / over-extracted',
    aliases: ['bitter', 'over extracted', 'over-extracted', 'pahit', 'harsh bitter'],
    content:
      'Knowledge v2 - Bitter/over-extracted: sering datang dari grind terlalu halus, suhu tinggi, contact terlalu lama, atau late agitation; koreksi lebih kasar/lebih tenang sebelum menurunkan kualitas air/rasio.',
    priority: 70,
  },
  {
    category: 'sensory',
    keyword: 'Astringent / dry',
    aliases: ['astringent', 'dry finish', 'dry', 'sepat', 'kering'],
    content:
      'Knowledge v2 - Astringent/dry: sering muncul dari channeling, fines migration, high agitation, atau brew terlalu panjang; jaga bed rata, kurangi late agitation, lalu koreksi grind kecil.',
    priority: 72,
  },
  {
    category: 'sensory',
    keyword: 'Muddy / heavy',
    aliases: ['muddy', 'keruh', 'berat', 'heavy', 'sludgy'],
    content:
      'Knowledge v2 - Muddy/heavy: cek fines, stall, immersion terlalu lama, atau stir/swirl berlebihan; kurangi agitation dan bersihkan release/decant sebelum mengubah recipe besar.',
    priority: 72,
  },
  {
    category: 'sensory',
    keyword: 'Thin / hollow',
    aliases: ['thin', 'hollow', 'watery', 'tipis', 'kosong'],
    content:
      'Knowledge v2 - Thin/hollow: cek ratio terlalu long, low mineral water, grind terlalu kasar, bypass, atau under-extraction; perbaiki contact dan air sebelum menaikkan dose secara acak.',
    priority: 72,
  },
  {
    category: 'sensory',
    keyword: 'Flat / muted',
    aliases: ['flat', 'muted', 'datar', 'tertahan'],
    content:
      'Knowledge v2 - Flat/muted: bisa dari high-buffer water, roast tua, extraction terlalu aman, atau aromatics tertahan; cek air dan freshness sebelum push extraction agresif.',
    priority: 72,
  },
  {
    category: 'sensory',
    keyword: 'Woody / smoky',
    aliases: ['woody', 'smoky', 'smoke', 'gosong', 'roasty', 'burnt'],
    content:
      'Knowledge v2 - Woody/smoky/roasty: sering terkait roast development, age, atau ekstraksi terlalu panas/panjang; gunakan path lebih soft, suhu lebih hati-hati, dan hindari late agitation.',
    priority: 74,
  },
  {
    category: 'extraction',
    keyword: 'Bloom discipline',
    aliases: ['bloom', 'blooming', 'degassing'],
    content:
      'Knowledge v2 - Bloom: tujuan utama adalah full saturation dan gas release terkontrol; fresh/light coffee butuh bloom lebih sabar, dark/fragile coffee butuh bloom lebih lembut dan singkat.',
    priority: 76,
  },
  {
    category: 'extraction',
    keyword: 'Agitation control',
    aliases: ['agitation', 'agitasi', 'swirl', 'stir', 'turbulence'],
    content:
      'Knowledge v2 - Agitation: menaikkan ekstraksi tetapi juga fines migration dan bitterness risk; gunakan satu bentuk agitation yang repeatable, bukan swirl/stir/pour tinggi sekaligus.',
    priority: 75,
  },
  {
    category: 'extraction',
    keyword: 'Water buffer',
    aliases: ['high buffer', 'alkalinity', 'kh', 'buffer tinggi', 'alkaline'],
    content:
      'Knowledge v2 - Water buffer: KH/alkalinity tinggi dapat menahan acidity/floral dan membuat cup flat; jangan salahkan grind dulu sebelum cek mineral air.',
    priority: 74,
  },
  {
    category: 'extraction',
    keyword: 'Low mineral water',
    aliases: ['low mineral', 'zero mineral', 'ro water', 'distilled', 'demineral', 'air ro'],
    content:
      'Knowledge v2 - Low/zero mineral water: cup bisa tipis, hollow, atau tidak stabil; remineralisasi atau pakai air brew-ready sebelum menilai recipe.',
    priority: 76,
  },
];

const MAX_KNOWLEDGE_NOTES = 8;
const MAX_SPECIFIC_KNOWLEDGE_NOTES = 6;

function normalizeKnowledgeText(value?: string) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildKnowledgeHaystack(input: AiBrewKnowledgeInput) {
  return [
    input.coffeeName,
    input.dripperName,
    input.methodFamily,
    input.process,
    input.variety,
  ]
    .map(normalizeKnowledgeText)
    .join(' ')
    .trim();
}

function hasBeanSpecificInput(input: AiBrewKnowledgeInput) {
  return Boolean(
    normalizeKnowledgeText(input.coffeeName)
      || normalizeKnowledgeText(input.process)
      || normalizeKnowledgeText(input.variety),
  );
}

function buildUniversalMethodSafetyNote(methodFamily?: AiBrewMethodFamily) {
  switch (methodFamily) {
    case 'espresso':
      return 'Knowledge v2 - Universal method safety: untuk espresso, kunci dose/yield/time/puck prep dulu; koreksi rasa dari flow dan grind, bukan menambah air seperti filter.';
    case 'moka_pot':
      return 'Knowledge v2 - Universal method safety: untuk Moka Pot, jaga heat dan stop-before-sputter; rasa pahit sering dari fase akhir yang dipaksa, bukan selalu dari grind.';
    case 'aeropress':
      return 'Knowledge v2 - Universal method safety: untuk AeroPress, steep, stir count, press duration, dan bypass/no-bypass adalah variabel utama; ubah satu saja tiap ronde.';
    case 'french_press':
      return 'Knowledge v2 - Universal method safety: untuk French Press, kontrol steep, crust break, settle, slow press, dan decant; jangan mengejar clarity dengan logika pour-over.';
    case 'cold_brew':
      return 'Knowledge v2 - Universal method safety: untuk Cold Brew, saturation, grind, steep time, filtration, dan dilution setelah filter lebih penting daripada bloom atau suhu panas.';
    case 'batch_brew':
      return 'Knowledge v2 - Universal method safety: untuk Batch Brew, validasi bed depth, spray pattern, basket, filter fit, drawdown, dan batch mixing sebelum mengubah recipe besar.';
    case 'siphon':
      return 'Knowledge v2 - Universal method safety: untuk Siphon, heat stability, short stir, upper chamber contact, dan clean drawdown harus konsisten sebelum koreksi rasa besar.';
    case 'hario_switch':
    case 'clever_dripper':
      return 'Knowledge v2 - Universal method safety: untuk immersion-release brewer, bed harus fully wet, steep/release harus bersih, dan jangan aduk agresif saat finishing drain.';
    case 'v60':
    case 'origami':
    case 'kono':
    case 'kalita_wave':
    case 'melitta':
    case 'april':
    case 'chemex':
      return 'Knowledge v2 - Universal method safety: untuk paper filter, prioritasnya full saturation, bed rata, flow repeatable, dan late agitation rendah sebelum mengubah ratio besar.';
    default:
      return 'Knowledge v2 - Universal method safety: hormati workflow alat seduh yang dipilih; jangan memakai bahasa V60 untuk espresso, moka, cold brew, batch, atau immersion penuh.';
  }
}

function buildUniversalKnowledgeNotes(input: AiBrewKnowledgeInput) {
  const beanSafety = hasBeanSpecificInput(input)
    ? 'Knowledge v2 - Universal bean safety: semua bean berbeda karena roast, umur, density, solubility, process, storage, dan grinder calibration; mulai dari baseline aman lalu validasi dengan taste feedback.'
    : 'Knowledge v2 - Universal bean safety: jika identitas bean belum lengkap, AI Brew harus memakai baseline konservatif dan tidak mengklaim hasil rasa pasti.';

  return [
    beanSafety,
    'Knowledge v2 - Universal dial-in: kunci dose, ratio, water, method, dan timing dulu; ubah satu variabel per ronde agar user dan barista tahu penyebab perubahan rasa.',
    buildUniversalMethodSafetyNote(input.methodFamily),
  ];
}

export function resolveAiBrewKnowledgeNotes(input: AiBrewKnowledgeInput) {
  const haystack = buildKnowledgeHaystack(input);
  if (!haystack.trim()) return [] as string[];

  const specificNotes = AI_BREW_KNOWLEDGE_SEEDS
    .filter((seed) => seed.aliases.some((alias) => haystack.includes(normalizeKnowledgeText(alias))))
    .sort((left, right) => right.priority - left.priority)
    .map((seed) => seed.content);

  return Array.from(new Set([
    ...specificNotes.slice(0, MAX_SPECIFIC_KNOWLEDGE_NOTES),
    ...buildUniversalKnowledgeNotes(input),
  ])).slice(0, MAX_KNOWLEDGE_NOTES);
}

export function formatAiBrewKnowledgeContext(input: AiBrewKnowledgeInput) {
  const notes = resolveAiBrewKnowledgeNotes(input);
  return notes.length > 0 ? notes.join(' | ') : 'none';
}
