import type { AiBrewFormState } from '../../apps/web/src/features/ai-brew/types.ts';

export type LiveAuditBrewMode = 'hot' | 'iced';

export interface LiveAuditBean {
  roastery: string;
  coffeeName: string;
  origin: string;
  process: string;
  processId: string;
  variety: string;
  varietyId: string;
  roastLevel: AiBrewFormState['roastLevel'];
  altitudeMasl?: string;
  beanDensityGml?: string;
  roastDevelopment?: AiBrewFormState['roastDevelopment'];
  solubility?: AiBrewFormState['solubility'];
}

export interface LiveAuditEquipmentCase {
  id: string;
  name: string;
  query: string;
  methodFamily: string;
  supportsIced: boolean;
  aeropressStyle?: AiBrewFormState['aeropressStyle'];
}

export interface LiveAuditRecipeCase {
  index: number;
  title: string;
  bean: LiveAuditBean;
  equipment: LiveAuditEquipmentCase;
  brewMode: LiveAuditBrewMode;
  targetProfileId: string;
}

export const LIVE_AUDIT_TARGET_PROFILE_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'more_body',
  'floral_transparent',
  'fruit_forward',
  'soft_round',
  'dense_comforting',
] as const;

const b = (
  roastery: string,
  coffeeName: string,
  origin: string,
  processId: string,
  process: string,
  varietyId: string,
  variety: string,
  roastLevel: AiBrewFormState['roastLevel'],
  altitudeMasl?: string,
  beanDensityGml?: string,
  roastDevelopment?: AiBrewFormState['roastDevelopment'],
  solubility?: AiBrewFormState['solubility'],
): LiveAuditBean => ({
  roastery,
  coffeeName,
  origin,
  process,
  processId,
  variety,
  varietyId,
  roastLevel,
  altitudeMasl,
  beanDensityGml,
  roastDevelopment,
  solubility,
});

export const LIVE_AUDIT_BEANS: LiveAuditBean[] = [
  b('Hacienda La Esmeralda', 'Special Geisha Washed', 'Panama Boquete', 'washed', 'washed', 'geisha', 'Geisha', 'light', '1800', '0.74', 'balanced', 'medium'),
  b('Hacienda La Esmeralda', 'Special Geisha Natural', 'Panama Boquete', 'natural', 'natural', 'geisha', 'Geisha', 'light', '1800', '0.73'),
  b('Lamastus Family Estates', 'Elida Estate Geisha Natural', 'Panama Volcan', 'natural', 'natural', 'geisha', 'Geisha', 'light', '1850', '0.74'),
  b('Ninety Plus', 'Nekisse Ethiopia Natural', 'Ethiopia Sidama', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'medium_light', '1950', '0.73'),
  b('Finca Deborah', 'Illumination Geisha Washed', 'Panama Volcan', 'washed', 'washed', 'geisha', 'Geisha', 'light', '1950', '0.75', 'balanced', 'medium'),
  b('Onyx Coffee Lab', 'Ethiopia Worka Chelbesa', 'Ethiopia Gedeb', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.75'),
  b('Onyx Coffee Lab', 'Colombia La Palma y El Tucan Gesha', 'Colombia Cundinamarca', 'washed', 'washed', 'geisha', 'Gesha', 'light', '1800', '0.74'),
  b('Sey Coffee', 'Kenya Gichathaini AA', 'Kenya Nyeri', 'washed', 'washed', 'sl28', 'SL28', 'light', '1850', '0.76', 'balanced', 'low'),
  b('Sey Coffee', 'Colombia Huila Pink Bourbon', 'Colombia Huila', 'washed', 'washed', 'pink_bourbon', 'Pink Bourbon', 'light', '1900', '0.74'),
  b('Tim Wendelboe', 'Kenya Karogoto', 'Kenya Nyeri', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76', 'balanced', 'low'),
  b('Tim Wendelboe', 'Ethiopia Nano Challa', 'Ethiopia Agaro', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian landrace', 'light', '2000', '0.75'),
  b('Coffee Collective', 'Kieni Kenya', 'Kenya Nyeri', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76'),
  b('Coffee Collective', 'Finca Vista Hermosa', 'Guatemala Huehuetenango', 'washed', 'washed', 'bourbon', 'Bourbon Caturra', 'medium_light', '1700', '0.73'),
  b('April Coffee', 'Bolivia Takesi Gesha', 'Bolivia Yanacachi', 'washed', 'washed', 'geisha', 'Gesha', 'light', '2300', '0.76', 'balanced', 'low'),
  b('April Coffee', 'Ethiopia Hamasho Natural', 'Ethiopia Sidama', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian landrace', 'light', '2200', '0.75'),
  b('La Cabra', 'Ethiopia Chelbesa Washed', 'Ethiopia Gedeb', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.75'),
  b('La Cabra', 'Colombia Las Margaritas Sudan Rume', 'Colombia Cauca', 'washed', 'washed', 'rume_sudan', 'Sudan Rume', 'light', '1850', '0.74'),
  b('Manhattan Coffee Roasters', 'Letty Bermudez Thermal Shock', 'Colombia Cauca', 'thermal_shock_washed', 'thermal shock washed', 'geisha', 'Gesha', 'light', '1900', '0.74'),
  b('Manhattan Coffee Roasters', 'Diego Bermudez Pink Bourbon', 'Colombia Cauca', 'thermal_shock_washed', 'thermal shock washed', 'pink_bourbon', 'Pink Bourbon', 'medium_light', '1900', '0.73'),
  b('DAK Coffee Roasters', 'Milky Cake Colombia', 'Colombia Huila', 'thermal_shock', 'thermal shock', 'castillo', 'Castillo', 'medium_light', '1750', '0.72'),
  b('DAK Coffee Roasters', 'Blueberry Boom Ethiopia Natural', 'Ethiopia Guji', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'medium_light', '2000', '0.73'),
  b('Friedhats', 'Ethiopia Ana Sora Natural', 'Ethiopia Guji', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.74'),
  b('Friedhats', 'Colombia El Paraiso Lychee', 'Colombia Cauca', 'thermal_shock', 'thermal shock', 'castillo', 'Castillo', 'medium_light', '1850', '0.72'),
  b('Kawa Coffee', 'Panama Abu Gesha Natural', 'Panama Boquete', 'natural', 'natural', 'geisha', 'Gesha', 'light', '1750', '0.73'),
  b('Kawa Coffee', 'Ethiopia Bombe Washed', 'Ethiopia Sidama', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian landrace', 'light', '2050', '0.75'),
  b('Nomad Coffee', 'Colombia El Diviso Sidra', 'Colombia Huila', 'anaerobic_washed', 'anaerobic washed', 'sidra', 'Sidra', 'medium_light', '1800', '0.73'),
  b('Nomad Coffee', 'Kenya Kiangoi AA', 'Kenya Kirinyaga', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1750', '0.76'),
  b('The Barn', 'Ethiopia Wush Wush Natural', 'Ethiopia Keffa', 'natural', 'natural', 'wush_wush', 'Wush Wush', 'light', '1950', '0.74'),
  b('The Barn', 'Rwanda Huye Mountain', 'Rwanda Huye', 'washed', 'washed', 'red_bourbon', 'Red Bourbon', 'medium_light', '1800', '0.73'),
  b('Five Elephant', 'Kenya Kainamui AA', 'Kenya Kirinyaga', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76'),
  b('Five Elephant', 'Brazil Sitio Cana', 'Brazil Mantiqueira', 'natural', 'natural', 'yellow_bourbon', 'Yellow Bourbon', 'medium', '1200', '0.69'),
  b('Gardelli', 'Ethiopia Mormora Natural', 'Ethiopia Guji', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2000', '0.74'),
  b('Gardelli', 'Colombia Granja Paraiso 92', 'Colombia Cauca', 'thermal_shock_washed', 'thermal shock washed', 'geisha', 'Gesha', 'light', '1900', '0.74'),
  b('Square Mile', 'Ethiopia Bensa Washed', 'Ethiopia Sidama', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian landrace', 'light', '2100', '0.75'),
  b('Square Mile', 'Kenya Muchagara AA', 'Kenya Kirinyaga', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1750', '0.76'),
  b('Colonna Coffee', 'Panama Hartmann Gesha', 'Panama Chiriqui', 'washed', 'washed', 'geisha', 'Gesha', 'light', '1800', '0.74'),
  b('Colonna Coffee', 'Ethiopia Banko Gotiti', 'Ethiopia Gedeb', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2050', '0.75'),
  b('Origin Coffee', 'Rwanda Kinini', 'Rwanda Rulindo', 'washed', 'washed', 'red_bourbon', 'Red Bourbon', 'medium_light', '1800', '0.73'),
  b('Origin Coffee', 'Peru El Diamante', 'Peru Cajamarca', 'washed', 'washed', 'caturra', 'Caturra Bourbon', 'medium_light', '1800', '0.72'),
  b('Workshop Coffee', 'Ethiopia Worka Sakaro', 'Ethiopia Gedeb', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.75'),
  b('Workshop Coffee', 'Colombia La Pradera Honey', 'Colombia Santander', 'honey', 'honey', 'caturra', 'Caturra', 'medium_light', '1700', '0.72'),
  b('Proud Mary', 'Panama Hartmann Gesha Natural', 'Panama Chiriqui', 'natural', 'natural', 'geisha', 'Gesha', 'light', '1800', '0.73'),
  b('Proud Mary', 'Honduras Benjamin Paz Pacas', 'Honduras Santa Barbara', 'washed', 'washed', 'pacas', 'Pacas', 'medium_light', '1700', '0.72'),
  b('Passenger Coffee', 'Ethiopia Agaro', 'Ethiopia Jimma', 'washed', 'washed', 'ethiopian_landrace', 'Ethiopian landrace', 'light', '2000', '0.75'),
  b('Passenger Coffee', 'Mexico Oaxaca Pluma', 'Mexico Oaxaca', 'washed', 'washed', 'typica', 'Typica Bourbon', 'medium_light', '1600', '0.72'),
  b('George Howell Coffee', 'Kenya Mamuto AA', 'Kenya Kirinyaga', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1750', '0.76'),
  b('George Howell Coffee', 'Guatemala La Bendicion', 'Guatemala Antigua', 'washed', 'washed', 'bourbon', 'Bourbon', 'medium_light', '1700', '0.72'),
  b('Intelligentsia', 'Black Cat Classic Espresso', 'Brazil Costa Rica blend', 'washed', 'washed blend', 'bourbon', 'Bourbon Typica blend', 'medium_dark', '1300', '0.70', 'developed', 'high'),
  b('Counter Culture', 'Hologram Blend', 'Latin America Africa blend', 'natural', 'natural washed blend', 'bourbon', 'Bourbon mixed variety', 'medium', '1500', '0.71'),
  b('Stumptown', 'Hair Bender Blend', 'Latin America Africa Indonesia blend', 'washed', 'washed natural blend', 'mixed_variety', 'Mixed variety', 'medium', '1400', '0.70'),
  b('Blue Bottle', 'Bella Donovan Blend', 'Ethiopia Peru blend', 'natural', 'natural washed blend', 'mixed_variety', 'Mixed variety', 'medium', '1500', '0.71'),
  b('Verve Coffee', 'Sermon Blend', 'Colombia Ethiopia blend', 'washed', 'washed natural blend', 'bourbon', 'Bourbon Caturra', 'medium', '1500', '0.71'),
  b('Heart Coffee', 'Ethiopia Chelchele Natural', 'Ethiopia Yirgacheffe', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2000', '0.74'),
  b('Heart Coffee', 'Kenya Gikirima', 'Kenya Embu', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1750', '0.76'),
  b('Coava Coffee', 'Ethiopia Kilenso', 'Ethiopia Sidama', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2050', '0.75'),
  b('Olympia Coffee', 'Burundi Long Miles', 'Burundi Kayanza', 'washed', 'washed', 'red_bourbon', 'Red Bourbon', 'medium_light', '1900', '0.74'),
  b('Camber Coffee', 'Kenya Thunguri AA', 'Kenya Nyeri', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76'),
  b('Black and White Coffee', 'The Future Fruit Snacks', 'Colombia blend', 'coferment', 'fruit coferment', 'castillo', 'Castillo Caturra', 'medium_light', '1750', '0.72'),
  b('Brandywine Coffee', 'Colombia Pink Bourbon', 'Colombia Huila', 'washed', 'washed', 'pink_bourbon', 'Pink Bourbon', 'medium_light', '1800', '0.73'),
  b('Sweet Bloom', 'Ethiopia Ardi Natural', 'Ethiopia Guji', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'medium_light', '2000', '0.73'),
  b('Corvus Coffee', 'Colombia Anaerobic Gesha', 'Colombia Huila', 'anaerobic_washed', 'anaerobic washed', 'geisha', 'Gesha', 'medium_light', '1800', '0.73'),
  b('Methodical Coffee', 'Ethiopia Hambela Natural', 'Ethiopia Guji', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'medium_light', '2000', '0.73'),
  b('Ceremony Coffee', 'Ethiopia Yabitu Koba', 'Ethiopia Guji', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.75'),
  b('Madcap Coffee', 'Rwanda Kanzu', 'Rwanda Nyamasheke', 'washed', 'washed', 'red_bourbon', 'Red Bourbon', 'medium_light', '1900', '0.74'),
  b('Tandem Coffee', 'Colombia San Sebastian', 'Colombia Cauca', 'washed', 'washed', 'caturra', 'Caturra Castillo', 'medium_light', '1800', '0.73'),
  b('Little Wolf Coffee', 'Ethiopia Raro Nansebo', 'Ethiopia West Arsi', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian landrace', 'light', '2100', '0.75'),
  b('Cat and Cloud', 'The Answer Blend', 'Latin America blend', 'washed', 'washed blend', 'bourbon', 'Bourbon Caturra', 'medium', '1500', '0.71'),
  b('Go Get Em Tiger', 'Colombia Finca El Paraiso', 'Colombia Cauca', 'thermal_shock', 'thermal shock', 'castillo', 'Castillo', 'medium_light', '1850', '0.72'),
  b('Sightglass Coffee', 'Ethiopia Guji Natural', 'Ethiopia Guji', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'medium_light', '2000', '0.73'),
  b('Equator Coffees', 'Panama Esmeralda Gesha', 'Panama Boquete', 'washed', 'washed', 'geisha', 'Gesha', 'light', '1800', '0.74'),
  b('Four Barrel Coffee', 'Kenya Gondo', 'Kenya Muranga', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1750', '0.76'),
  b('Ritual Coffee', 'Ethiopia Nano Genji', 'Ethiopia Agaro', 'washed', 'washed', 'ethiopian_landrace', 'Ethiopian landrace', 'light', '2000', '0.75'),
  b('Huckleberry Roasters', 'Kenya Nyeri Peaberry', 'Kenya Nyeri', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76'),
  b('Subtext Coffee', 'Ethiopia Bensa Washed', 'Ethiopia Sidama', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.75'),
  b('Phil and Sebastian', 'Colombia La Palma Sidra', 'Colombia Cundinamarca', 'washed', 'washed', 'sidra', 'Sidra', 'light', '1800', '0.73'),
  b('Monogram Coffee', 'Rwanda Shyira', 'Rwanda Nyabihu', 'washed', 'washed', 'red_bourbon', 'Red Bourbon', 'medium_light', '2000', '0.74'),
  b('Hatch Coffee', 'Colombia El Paraiso Geisha', 'Colombia Cauca', 'thermal_shock_washed', 'thermal shock washed', 'geisha', 'Gesha', 'light', '1900', '0.74'),
  b('Luna Coffee', 'Ethiopia Duwancho Natural', 'Ethiopia Sidama', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.74'),
  b('Rogue Wave Coffee', 'Panama Abu Gesha', 'Panama Boquete', 'washed', 'washed', 'geisha', 'Gesha', 'light', '1700', '0.73'),
  b('Detour Coffee', 'Guatemala El Injerto Bourbon', 'Guatemala Huehuetenango', 'washed', 'washed', 'bourbon', 'Bourbon', 'medium_light', '1750', '0.73'),
  b('49th Parallel', 'Ethiopia Sidama Ardi', 'Ethiopia Sidama', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'medium_light', '2000', '0.73'),
  b('Glitch Coffee', 'Colombia El Paraiso Lychee', 'Colombia Cauca', 'thermal_shock', 'thermal shock', 'castillo', 'Castillo', 'medium_light', '1850', '0.72'),
  b('Glitch Coffee', 'Panama Janson Geisha', 'Panama Volcan', 'washed', 'washed', 'geisha', 'Gesha', 'light', '1700', '0.73'),
  b('Kurasu Kyoto', 'Ethiopia Yirgacheffe Washed', 'Ethiopia Yirgacheffe', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2000', '0.75'),
  b('Leaves Coffee Roasters', 'Kenya Kirinyaga AA', 'Kenya Kirinyaga', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76'),
  b('Lilo Coffee Roasters', 'Costa Rica Las Lajas Black Honey', 'Costa Rica Central Valley', 'black_honey', 'black honey', 'catuai', 'Catuai', 'medium_light', '1500', '0.71'),
  b('Philocoffea', 'Ethiopia Guji Washed', 'Ethiopia Guji', 'washed', 'washed', 'ethiopian_heirloom', 'Ethiopian heirloom', 'light', '2100', '0.75'),
  b('Fuglen Coffee Roasters', 'Kenya Kamwangi AA', 'Kenya Kirinyaga', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76'),
  b('Market Lane Coffee', 'Bolivia Caranavi Caturra', 'Bolivia Caranavi', 'washed', 'washed', 'caturra', 'Caturra', 'medium_light', '1600', '0.72'),
  b('Mecca Coffee', 'Ethiopia Bombe Natural', 'Ethiopia Sidama', 'natural', 'natural', 'ethiopian_heirloom', 'Ethiopian heirloom', 'medium_light', '2100', '0.73'),
  b('Single O', 'Kenya Gathaithi AA', 'Kenya Nyeri', 'washed', 'washed', 'sl28', 'SL28 SL34', 'light', '1800', '0.76'),
  b('Seven Seeds', 'Colombia La Divisa Pink Bourbon', 'Colombia Huila', 'washed', 'washed', 'pink_bourbon', 'Pink Bourbon', 'medium_light', '1800', '0.73'),
  b('Proud Mary', 'Panama Elida Estate Catuai Natural', 'Panama Volcan', 'natural', 'natural', 'catuai', 'Catuai', 'medium_light', '1700', '0.72'),
  b('Tanamera Coffee', 'Aceh Gayo Wet Hulled', 'Indonesia Aceh', 'wet_hulled', 'wet hulled', 'ateng', 'Ateng Timtim', 'medium', '1400', '0.70'),
  b('Space Roastery', 'Kerinci Honey Anaerobic', 'Indonesia Kerinci', 'anaerobic_honey', 'anaerobic honey', 's795', 'S795', 'medium_light', '1500', '0.71'),
  b('Smoking Barrels', 'Java Preanger Washed', 'Indonesia West Java', 'washed', 'washed', 'typica', 'Typica S795', 'medium', '1400', '0.70'),
  b('Fugol Coffee Roasters', 'Bali Kintamani Natural', 'Indonesia Bali', 'natural', 'natural', 'typica', 'Typica', 'medium', '1300', '0.69'),
  b('Hungry Bird', 'Flores Bajawa Washed', 'Indonesia Flores', 'washed', 'washed', 's795', 'S795', 'medium', '1500', '0.71'),
  b('Common Grounds', 'Papua Wamena Washed', 'Indonesia Papua', 'washed', 'washed', 'typica', 'Typica', 'medium', '1600', '0.71'),
  b('Sensa Coffee', 'Toraja Sapan Wet Hulled', 'Indonesia Sulawesi', 'wet_hulled', 'wet hulled', 'typica', 'Typica', 'medium', '1500', '0.70'),
  b('Kopi Tuku', 'Indonesia House Blend', 'Indonesia blend', 'washed', 'washed natural blend', 'mixed_variety', 'Mixed variety', 'medium_dark', '1200', '0.69', 'developed', 'high'),
  b('Roast Runner', 'Thailand Doi Pangkhon Honey', 'Thailand Chiang Rai', 'honey', 'honey', 'catuai', 'Catuai', 'medium_light', '1450', '0.71'),
  b('Fika Coffee', 'Laos Bolaven Washed', 'Laos Bolaven Plateau', 'washed', 'washed', 'catimor', 'Catimor Typica', 'medium_light', '1300', '0.70'),
  b('The Coffee Academics', 'Yunnan Catimor Natural', 'China Yunnan', 'natural', 'natural', 'yunnan_catimor', 'Yunnan Catimor', 'medium', '1500', '0.71'),
];

const e = (
  id: string,
  name: string,
  query: string,
  methodFamily: string,
  supportsIced: boolean,
  aeropressStyle?: AiBrewFormState['aeropressStyle'],
): LiveAuditEquipmentCase => ({ id, name, query, methodFamily, supportsIced, aeropressStyle });

export const LIVE_AUDIT_EQUIPMENT_CASES: LiveAuditEquipmentCase[] = [
  e('hario-v60', 'Hario V60', 'v60', 'v60', true),
  e('hario-switch-03', 'Hario Switch 03', 'switch 03', 'hario_switch', true),
  e('hario-switch-02', 'Hario Switch 02', 'switch 02', 'hario_switch', true),
  e('mugen-x-switch', 'MUGEN x SWITCH', 'mugen switch', 'hario_switch', true),
  e('aeropress', 'AeroPress Auto', 'aeropress', 'aeropress', false, 'auto'),
  e('aeropress', 'AeroPress Standard', 'aeropress', 'aeropress', false, 'standard'),
  e('aeropress', 'AeroPress Inverted', 'aeropress', 'aeropress', false, 'inverted'),
  e('aeropress', 'AeroPress Bypass', 'aeropress', 'aeropress', false, 'bypass'),
  e('aeropress', 'AeroPress No Bypass', 'aeropress', 'aeropress', false, 'no_bypass'),
  e('aeropress', 'AeroPress Bright Clean', 'aeropress', 'aeropress', false, 'bright_clean'),
  e('aeropress', 'AeroPress Sweet Body', 'aeropress', 'aeropress', false, 'sweet_body'),
  e('april-brewer', 'April Brewer', 'april brewer', 'april', true),
  e('blue-bottle-dripper', 'Blue Bottle Dripper', 'blue bottle', 'april', true),
  e('brewista-gem-series', 'Brewista Gem Series', 'brewista gem', 'april', true),
  e('brewista-tornado', 'Brewista Tornado', 'brewista tornado', 'april', true),
  e('cafec-deep-27', 'Cafec Deep 27', 'deep 27', 'v60', true),
  e('cafec-flower-dripper', 'Cafec Flower Dripper', 'cafec flower', 'v60', true),
  e('chemex', 'Chemex', 'chemex', 'chemex', true),
  e('clever-dripper', 'Clever Dripper', 'clever', 'clever_dripper', true),
  e('fellow-stagg-x', 'Fellow Stagg X', 'stagg x', 'april', true),
  e('hario-mugen', 'Hario Mugen', 'mugen', 'v60', true),
  e('hero-variable-dripper', 'Hero Variable Dripper', 'hero variable', 'v60', true),
  e('kalita-102', 'Kalita 102', 'kalita 102', 'melitta', true),
  e('kalita-wave-155-185', 'Kalita Wave 155/185', 'kalita wave', 'kalita_wave', true),
  e('kono-meimon', 'Kono Meimon', 'kono', 'kono', true),
  e('latina-cono', 'Latina Cono', 'latina cono', 'v60', true),
  e('latina-volcano', 'Latina Volcano', 'latina volcano', 'v60', true),
  e('loveramics', 'Loveramics', 'loveramics', 'v60', true),
  e('melitta', 'Melitta', 'melitta', 'melitta', true),
  e('mhw-3bomber-elf', 'MHW-3Bomber Elf', '3bomber elf', 'v60', true),
  e('orea-v3-v4', 'Orea V3/V4', 'orea', 'april', true),
  e('origami-dripper-s-m', 'Origami Dripper S/M', 'origami', 'origami', true),
  e('suji-v60-dripper', 'Suji V60 Dripper', 'suji v60', 'v60', true),
  e('suji-wave-dripper', 'Suji Wave Dripper', 'suji wave', 'april', true),
  e('the-gabi-master-a-b', 'The Gabi Master A/B', 'gabi master', 'v60', true),
  e('timemore-b75', 'Timemore B75', 'timemore b75', 'april', true),
  e('timemore-crystal-eye', 'Timemore Crystal Eye', 'crystal eye', 'v60', true),
  e('torch-mountain', 'Torch Mountain', 'torch mountain', 'v60', true),
  e('vietnam-drip', 'Vietnam Drip', 'vietnam drip', 'clever_dripper', true),
  e('april-hybrid-brewer', 'April Hybrid Brewer', 'april hybrid', 'april', true),
  e('fellow-stagg-xf-dripper', 'Fellow Stagg XF Dripper', 'stagg xf', 'april', true),
  e('hario-pegasus', 'Hario Pegasus', 'pegasus', 'melitta', true),
  e('nextlevel-pulsar', 'NextLevel Pulsar', 'pulsar', 'clever_dripper', true),
  e('origami-dripper-air-s', 'ORIGAMI Dripper Air S', 'origami air', 'origami', true),
  e('tricolate-brewer', 'Tricolate Brewer', 'tricolate', 'clever_dripper', true),
  e('espresso-machine', 'Espresso Machine', 'espresso', 'espresso', false),
  e('french-press', 'French Press', 'french press', 'french_press', false),
  e('hario-siphon', 'Hario Siphon', 'siphon', 'siphon', false),
  e('bialetti-moka-pot', 'Bialetti Moka Pot', 'moka', 'moka_pot', false),
  e('toddy-cold-brew', 'Toddy Cold Brew', 'cold brew', 'cold_brew', false),
  e('batch-brewer', 'Batch Brewer', 'batch', 'batch_brew', false),
];

export function buildLiveAuditUnsupportedIcedChecks() {
  return LIVE_AUDIT_EQUIPMENT_CASES
    .filter((equipment, index, all) => (
      !equipment.supportsIced
      && all.findIndex((candidate) => candidate.id === equipment.id) === index
    ));
}

function titleFor(index: number, recipe: Omit<LiveAuditRecipeCase, 'index' | 'title'>) {
  const raw = [
    'QA Live 100',
    String(index).padStart(3, '0'),
    recipe.brewMode.toUpperCase(),
    recipe.targetProfileId,
    recipe.equipment.name,
    recipe.bean.roastery,
    recipe.bean.coffeeName,
  ].join(' - ');
  return raw.replace(/\s+/g, ' ').slice(0, 180);
}

export function buildLiveAuditRecipeMatrix(limit = 180): LiveAuditRecipeCase[] {
  const recipes: Array<Omit<LiveAuditRecipeCase, 'index' | 'title'>> = [];
  let beanCursor = 0;
  let targetCursor = 0;
  let equipmentCursor = 0;

  const nextBean = () => {
    const bean = LIVE_AUDIT_BEANS[beanCursor % LIVE_AUDIT_BEANS.length];
    beanCursor += 1;
    return bean;
  };
  const nextTarget = () => {
    const target = LIVE_AUDIT_TARGET_PROFILE_IDS[targetCursor % LIVE_AUDIT_TARGET_PROFILE_IDS.length];
    targetCursor += 1;
    return target;
  };
  const pushRecipe = (
    equipment: LiveAuditEquipmentCase,
    brewMode: LiveAuditBrewMode,
    targetProfileId = nextTarget(),
  ) => {
    if (recipes.length >= limit) return;
    if (brewMode === 'iced' && !equipment.supportsIced) return;
    recipes.push({
      bean: nextBean(),
      equipment,
      brewMode,
      targetProfileId,
    });
  };

  const v60 = LIVE_AUDIT_EQUIPMENT_CASES.find((equipment) => equipment.id === 'hario-v60')!;
  const switch03 = LIVE_AUDIT_EQUIPMENT_CASES.find((equipment) => equipment.id === 'hario-switch-03')!;
  const aeropressAuto = LIVE_AUDIT_EQUIPMENT_CASES.find((equipment) => equipment.id === 'aeropress' && equipment.aeropressStyle === 'auto')!;
  for (const targetProfileId of LIVE_AUDIT_TARGET_PROFILE_IDS) {
    pushRecipe(v60, 'hot', targetProfileId);
    pushRecipe(v60, 'iced', targetProfileId);
    pushRecipe(switch03, 'hot', targetProfileId);
    pushRecipe(switch03, 'iced', targetProfileId);
    pushRecipe(aeropressAuto, 'hot', targetProfileId);
  }

  for (const style of ['standard', 'inverted', 'bypass', 'no_bypass', 'bright_clean', 'sweet_body'] as const) {
    const equipment = LIVE_AUDIT_EQUIPMENT_CASES.find((candidate) => candidate.id === 'aeropress' && candidate.aeropressStyle === style);
    if (equipment) pushRecipe(equipment, 'hot', nextTarget());
  }

  for (const equipment of LIVE_AUDIT_EQUIPMENT_CASES) {
    pushRecipe(equipment, 'hot', nextTarget());
    pushRecipe(equipment, 'iced', nextTarget());
  }

  while (recipes.length < limit) {
    const equipment = LIVE_AUDIT_EQUIPMENT_CASES[equipmentCursor % LIVE_AUDIT_EQUIPMENT_CASES.length];
    equipmentCursor += 1;
    const brewMode: LiveAuditBrewMode = equipment.supportsIced && recipes.length % 2 === 1 ? 'iced' : 'hot';
    pushRecipe(equipment, brewMode, nextTarget());
  }

  return recipes.map((recipe, index) => ({
    ...recipe,
    index: index + 1,
    title: titleFor(index + 1, recipe),
  }));
}
