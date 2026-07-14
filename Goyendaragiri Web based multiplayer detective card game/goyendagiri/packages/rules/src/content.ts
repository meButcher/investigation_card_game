// ─── Card + tile content. 58 evidence + 62 means, each with an icon id that maps
// to a CC-BY game-icons.net SVG at /icons/<icon>.svg (see apps/client/public/icons).
// Every card also carries a hidden `tag` (4th tuple field) — a theme used only by
// the smart shuffler in engine.ts to keep the murderer's cards ambiguous. Never shown in UI.
import type { Card, Tile } from './types.js';

const EV: [string, string, string, string][] = [
  ['কাদা মাখা জুতা', 'Muddy shoes', 'boot-prints', 'wearable'],
  ['ছেঁড়া চিঠি', 'Torn letter', 'folded-paper', 'paper'],
  ['ব্র্যান্ডির বোতল', 'Brandy bottle', 'brandy-bottle', 'trace'],
  ['পোড়া দিয়াশলাই', 'Burnt matches', 'match-head', 'trace'],
  ['চুলের ক্লিপ', 'Hair clip', 'hair-strands', 'personal'],
  ['সিগারেটের টুকরা', 'Cigarette butt', 'cigarette', 'trace'],
  ['মানিব্যাগ', 'Wallet', 'wallet', 'money'],
  ['আংটি', 'Ring', 'diamond-ring', 'jewelry'],
  ['ওষুধের শিশি', 'Medicine vial', 'medicines', 'personal'],
  ['চাবি', 'Key', 'key', 'personal'],
  ['দস্তানা', 'Gloves', 'gloves', 'wearable'],
  ['টাকার ব্যাগ', 'Money bag', 'money-stack', 'money'],
  ['পকেট ঘড়ি', 'Pocket watch', 'pocket-watch', 'jewelry'],
  ['রুমাল', 'Cloth', 'rolled-cloth', 'wearable'],
  ['নথিপত্র', 'Documents', 'paper', 'paper'],
  ['পুরনো ছবি', 'Old portrait', 'portrait', 'paper'],
  ['জুতার ছাপ', 'Footprint', 'footprint', 'trace'],
  ['বোতাম', 'Shirt button', 'shirt-button', 'wearable'],
  ['চশমা', 'Glasses', 'prank-glasses', 'personal'],
  ['মোবাইল ফোন', 'Smartphone', 'smartphone', 'personal'],
  ['ডায়েরি', 'Notebook', 'notebook', 'paper'],
  ['পশমি সুতা', 'Wool thread', 'wool', 'wearable'],
  ['দুটি কয়েন', 'Two coins', 'two-coins', 'money'],
  ['তাবিজ', 'Amulet', 'gem-pendant', 'jewelry'],
  ['টিকিট', 'Ticket', 'ticket', 'money'],
  ['ঝর্ণা কলম', 'Fountain pen', 'fountain-pen', 'paper'],
  ['ফিতা', 'Ribbon', 'ribbon', 'wearable'],
  ['খাম', 'Envelope', 'envelope', 'paper'],
  ['আয়না', 'Mirror', 'mirror-mirror', 'personal'],
  ['হাতব্যাগ', 'Handbag', 'hand-bag', 'personal'],
  ['রক্তের দাগ', 'Bloodstain', 'dripping-blade', 'trace'],
  ['ছুরিকাহত চিরকুট', 'Stabbed note', 'stabbed-note', 'paper'],
  ['ফাটা কাচ', 'Cracked glass', 'cracked-glass', 'trace'],
  ['আঙুলের ছাপ', 'Fingerprint', 'finger-print', 'trace'],
  ['মুক্তার হার', 'Pearl necklace', 'pearl-necklace', 'jewelry'],
  ['চিরুনি', 'Comb', 'comb', 'personal'],
  ['লাইটার', 'Lighter', 'lighter', 'trace'],
  ['বাড়ির চাবি', 'House keys', 'house-keys', 'personal'],
  ['রত্নহার', 'Gem necklace', 'gem-necklace', 'jewelry'],
  ['খবরের কাগজ', 'Newspaper', 'newspaper', 'paper'],
  ['চামড়ার জুতা', 'Leather boot', 'leather-boot', 'wearable'],
  ['কাগজের ক্লিপ', 'Paper clip', 'paper-clip', 'paper'],
  ['কালির দাগ', 'Ink stain', 'ink-swirl', 'paper'],
  ['নখ', 'Fingernail', 'fingernail', 'trace'],
  ['পালক', 'Feather', 'feather', 'trace'],
  ['ব্যাংক নোট', 'Banknote', 'banknote', 'money'],
  ['মোমবাতির টুকরা', 'Candle stub', 'candles', 'trace'],
  ['কাচের গ্লাস', 'Glass', 'glass-shot', 'trace'],
  ['কাপড়ের ক্লিপ', 'Clothespin', 'clothespin', 'wearable'],
  ['ম্যাগনিফায়ার', 'Magnifier', 'magnifying-glass', 'personal'],
  ['কয়েনের স্তূপ', 'Coin pile', 'coins-pile', 'money'],
  ['পালকের কলম', 'Quill', 'quill', 'paper'],
  ['বো-টাই', 'Bow tie', 'bow-tie-ribbon', 'wearable'],
  ['গলার হার', 'Necklace', 'necklace', 'jewelry'],
  ['জামাকাপড়', 'Clothes', 'clothes', 'wearable'],
  ['কাগজের ব্যাগ', 'Paper bag', 'paper-bag-open', 'paper'],
  ['ক্যামেরা', 'Camera', 'photo-camera', 'personal'],
  ['বুকমার্ক', 'Bookmark', 'bookmark', 'paper'],
];

const MN: [string, string, string, string][] = [
  ['কুড়াল', 'Axe', 'battle-axe', 'axe'],
  ['বিষ', 'Poison', 'poison-bottle', 'poison'],
  ['দড়ি', 'Rope', 'rope-coil', 'bind'],
  ['ইট', 'Brick', 'brick-wall', 'blunt'],
  ['ছুরি', 'Knife', 'bowie-knife', 'blade'],
  ['পিস্তল', 'Pistol', 'pistol-gun', 'gun'],
  ['বালিশ', 'Pillow', 'pillow', 'bind'],
  ['বেসবল ব্যাট', 'Baseball bat', 'baseball-bat', 'blunt'],
  ['কাঁটাতার', 'Barbed wire', 'barbed-wire', 'bind'],
  ['হাতুড়ি', 'Hammer', 'claw-hammer', 'blunt'],
  ['আগুন', 'Fire', 'flame', 'fire'],
  ['রিভলভার', 'Revolver', 'revolver', 'gun'],
  ['ভাঙা বোতল', 'Broken bottle', 'broken-bottle', 'blade'],
  ['বেল্ট', 'Belt', 'belt', 'bind'],
  ['শাবল', 'Crowbar', 'crowbar', 'blunt'],
  ['কাস্তে', 'Sickle', 'sickle', 'blade'],
  ['আগুন বোমা', 'Fire bomb', 'fire-bomb', 'fire'],
  ['শিকল', 'Chain', 'crossed-chains', 'bind'],
  ['ছাতা', 'Umbrella', 'umbrella', 'blunt'],
  ['মাংস কাটার ছুরি', 'Cleaver', 'meat-cleaver', 'blade'],
  ['ক্ষুরের ফলা', 'Razor blade', 'razor-blade', 'blade'],
  ['করাত', 'Saw', 'hand-saw', 'blade'],
  ['পেরেক', 'Nails', 'nails', 'blade'],
  ['মোমবাতি', 'Candle', 'candle-holder', 'fire'],
  ['ছোরা', 'Dagger', 'plain-dagger', 'blade'],
  ['বাঁকা ছুরি', 'Curved knife', 'curvy-knife', 'blade'],
  ['ছোট কুড়াল', 'Hatchet', 'axe-swing', 'axe'],
  ['সিরিঞ্জ', 'Syringe', 'syringe', 'poison'],
  ['বিষাক্ত গ্যাস', 'Poison gas', 'poison-gas', 'poison'],
  ['গদা', 'Mace', 'flanged-mace', 'blunt'],
  ['কাস্তে-বড়', 'Scythe', 'scythe', 'blade'],
  ['প্রজাপতি ছুরি', 'Butterfly knife', 'butterfly-knife', 'blade'],
  ['ছোঁড়া ছুরি', 'Thrown knife', 'thrown-knife', 'blade'],
  ['গ্রেনেড', 'Grenade', 'stick-grenade', 'fire'],
  ['মলোটভ', 'Molotov', 'fire-bottle', 'fire'],
  ['আগুনের কুড়াল', 'Fire axe', 'fire-axe', 'axe'],
  ['ভাঙা কুড়াল', 'Broken axe', 'broken-axe', 'axe'],
  ['যুদ্ধ হাতুড়ি', 'War hammer', 'thor-hammer', 'blunt'],
  ['বড় হাতুড়ি', 'Sledge', 'stake-hammer', 'blunt'],
  ['কাঁটা গদা', 'Spiked mace', 'spiked-mace', 'blunt'],
  ['হাড়ের ছুরি', 'Bone knife', 'bone-knife', 'blade'],
  ['গুপ্ত ছোরা', 'Cloak dagger', 'cloak-dagger', 'blade'],
  ['বলির ছোরা', 'Ritual dagger', 'sacrificial-dagger', 'blade'],
  ['মৃত্যুর কাস্তে', 'Reaper scythe', 'reaper-scythe', 'blade'],
  ['চেইন করাত', 'Chainsaw', 'chainsaw', 'blade'],
  ['গোল করাত', 'Circular saw', 'circular-saw', 'blade'],
  ['ক্ষুর', 'Razor', 'razor', 'blade'],
  ['ফাঁদতার', 'Tripwire', 'tripwire', 'bind'],
  ['তারের কুণ্ডলী', 'Wire coil', 'wire-coil', 'bind'],
  ['ক্রস কুড়াল', 'Crossed axes', 'crossed-axes', 'axe'],
  ['ক্যাম্পফায়ার', 'Campfire', 'campfire', 'fire'],
  ['বিষের মেঘ', 'Poison cloud', 'poison-cloud', 'poison'],
  ['বিষ সিরিঞ্জ', 'Venom syringe', 'skull-with-syringe', 'poison'],
  ['ফলা', 'Blade', 'bat-blade', 'blade'],
  ['রক্তাক্ত ছুরি', 'Dripping knife', 'dripping-knife', 'blade'],
  ['হাড়ের গদা', 'Bone mace', 'bone-mace', 'blunt'],
  ['গুঁড়িতে কুড়াল', 'Axe in log', 'axe-in-log', 'axe'],
  ['বিষের শিশি', 'Poison vial', 'poison', 'poison'],
  ['দোনলা বন্দুক', 'Shotgun', 'sawed-off-shotgun', 'gun'],
  ['পুরনো রাইফেল', 'Old rifle', 'winchester-rifle', 'gun'],
  ['অ্যাসিডের শিশি', 'Acid flask', 'acid-flask', 'poison'],
  ['ক্লোরোফর্ম রুমাল', 'Chloroform rag', 'chloroform', 'poison'],
];

function fill(list: [string, string, string, string][], type: 'evidence' | 'means', total: number): Card[] {
  const out: Card[] = list.map(([bn, en, icon, tag], i) => ({
    id: `${type === 'evidence' ? 'ev' : 'mn'}_${String(i + 1).padStart(3, '0')}`, type, bn, en, icon, tag,
  }));
  for (let i = list.length; i < total; i++) {
    out.push({
      id: `${type === 'evidence' ? 'ev' : 'mn'}_${String(i + 1).padStart(3, '0')}`, type,
      bn: `${type === 'evidence' ? 'প্রমাণ' : 'পদ্ধতি'} ${i + 1}`, en: `${type === 'evidence' ? 'Evidence' : 'Means'} #${i + 1}`,
      icon: 'magnifying-glass', tag: '',
    });
  }
  return out;
}

export const EVIDENCE_DECK: Card[] = fill(EV, 'evidence', 58);
export const MEANS_DECK: Card[] = fill(MN, 'means', 58);

const W = (pairs: [string, string][]) => pairs.map(([bn, en]) => ({ bn, en }));
export const CAUSE_TILE: Tile = {
  id: 'tile_cause', kind: 'cause', bn: 'মৃত্যুর কারণ', en: 'Cause of death',
  words: W([['শ্বাসরোধ', 'Suffocation'], ['রক্তক্ষরণ', 'Blood loss'], ['বিষক্রিয়া', 'Poisoning'], ['দুর্ঘটনা', 'Accident'], ['রোগ', 'Illness'], ['অজানা', 'Unknown']]),
};
export const LOCATION_TILES: Tile[] = [
  { id: 'tile_loc_1', kind: 'location', bn: 'অপরাধের স্থান', en: 'Location of crime',
    words: W([['বাঁশঝাড়', 'Bamboo grove'], ['লেকের পাড়', 'Lakeside'], ['ডাকাতবাড়ি', 'Hideout'], ['গ্রামের হাট', 'Market'], ['মন্দির', 'Temple'], ['নৌকা', 'Boat']]) },
  { id: 'tile_loc_2', kind: 'location', bn: 'অপরাধের স্থান', en: 'Location of crime',
    words: W([['ধানক্ষেত', 'Paddy field'], ['স্কুলঘর', 'Schoolhouse'], ['কবরস্থান', 'Graveyard'], ['রেলস্টেশন', 'Rail station'], ['চা দোকান', 'Tea stall'], ['পুকুরপাড়', 'Pond bank']]) },
  { id: 'tile_loc_3', kind: 'location', bn: 'অপরাধের স্থান', en: 'Location of crime',
    words: W([['গোয়ালঘর', 'Cowshed'], ['ছাদ', 'Rooftop'], ['উঠান', 'Courtyard'], ['রান্নাঘর', 'Kitchen'], ['গুদাম', 'Warehouse'], ['সাঁকো', 'Footbridge']]) },
  { id: 'tile_loc_4', kind: 'location', bn: 'অপরাধের স্থান', en: 'Location of crime',
    words: W([['জঙ্গল', 'Jungle'], ['মাঠ', 'Field'], ['ঘাট', 'River ghat'], ['মেলা', 'Fair'], ['দোতলা ঘর', 'Upper room'], ['কুয়া', 'Well']]) },
];
const SCENE: [string, [string, string][]][] = [
  ['ঘটনার সূত্র · State of the scene', [['এলোমেলো', 'Disarray'], ['পরিপাটি', 'Tidy'], ['ভাঙা জিনিস', 'Broken items'], ['পোড়া গন্ধ', 'Burnt smell'], ['ভেজা মেঝে', 'Wet floor'], ['অন্ধকার', 'Dark']]],
  ['ভুক্তভোগীর অবস্থা · The victim', [['বৃদ্ধ', 'Old'], ['যুবক', 'Young'], ['ধনী', 'Rich'], ['ঋণগ্রস্ত', 'In debt'], ['একাকী', 'Alone'], ['সশস্ত্র', 'Armed']]],
  ['সময় · Time of death', [['সন্ধ্যা', 'Dusk'], ['মধ্যরাত', 'Midnight'], ['ভোর', 'Dawn'], ['সকাল', 'Morning'], ['দুপুর', 'Noon'], ['অজানা', 'Unknown']]],
  ['আবহাওয়া · Weather', [['বৃষ্টি', 'Rain'], ['কুয়াশা', 'Fog'], ['ঝড়', 'Storm'], ['গরম', 'Heat'], ['শীত', 'Cold'], ['পরিষ্কার', 'Clear']]],
  ['খুনীর ছাপ · Killer trait', [['সতর্ক', 'Careful'], ['তাড়াহুড়ো', 'Hasty'], ['শক্তিশালী', 'Strong'], ['চতুর', 'Cunning'], ['পরিচিত', 'Familiar'], ['আগন্তুক', 'Stranger']]],
  ['উদ্দেশ্য · Motive hint', [['টাকা', 'Money'], ['প্রতিশোধ', 'Revenge'], ['ঈর্ষা', 'Jealousy'], ['গোপন রক্ষা', 'Keep a secret'], ['ক্ষমতা', 'Power'], ['ভুলবশত', 'By mistake']]],
  ['শব্দ · Sounds heard', [['চিৎকার', 'Scream'], ['ধস্তাধস্তি', 'Struggle'], ['নীরবতা', 'Silence'], ['কুকুরের ডাক', 'Dog barking'], ['পায়ের শব্দ', 'Footsteps'], ['গান', 'Music']]],
  ['ফেলে যাওয়া · Left behind', [['কিছু না', 'Nothing'], ['অস্ত্র', 'The weapon'], ['কাপড়', 'Clothing'], ['খাবার', 'Food'], ['চিরকুট', 'A note'], ['ছাই', 'Ashes']]],
  ['দেহের অবস্থান · Body found', [['ঘরের ভিতর', 'Indoors'], ['পানিতে', 'In water'], ['মাটির নিচে', 'Buried'], ['খোলা জায়গায়', 'In the open'], ['লুকানো', 'Hidden'], ['ঝুলন্ত', 'Hanging']]],
  ['সাক্ষ্যপ্রমাণ · Traces', [['আঙুলের ছাপ', 'Fingerprints'], ['রক্তের দাগ', 'Bloodstains'], ['ছেঁড়া কাপড়', 'Torn cloth'], ['চুল', 'Hair'], ['কাদা', 'Mud'], ['কিছুই না', 'None']]],
  ['খুনীর সম্পর্ক · Relation', [['আত্মীয়', 'Relative'], ['প্রতিবেশী', 'Neighbour'], ['ব্যবসায়ী', 'Business partner'], ['অপরিচিত', 'Unknown'], ['বন্ধু', 'Friend'], ['শত্রু', 'Enemy']]],
  ['ঘটনার গতি · Speed', [['পরিকল্পিত', 'Planned'], ['হঠাৎ', 'Sudden'], ['ধীরে ধীরে', 'Gradual'], ['দ্বিধাগ্রস্ত', 'Hesitant'], ['নিষ্ঠুর', 'Brutal'], ['দক্ষ', 'Skilled']]],
];
export const SCENE_TILES: Tile[] = SCENE.map(([title, words], i) => {
  const [bn, en] = title.split(' · ');
  return { id: `tile_scene_${String(i + 1).padStart(2, '0')}`, kind: 'scene' as const, bn, en, words: W(words) };
});
