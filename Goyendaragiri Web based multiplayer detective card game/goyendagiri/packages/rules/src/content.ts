// ─── Sample content decks. TODO(content pass, design doc §4): replace fillers
// with authored bilingual cards from the Google Sheet export. ────────────────
import type { Card, Tile } from './types.js';

const EV: [string, string, string][] = [
  ['কাদা মাখা জুতা', 'Muddy shoes', 'boot-prints'], ['ছেঁড়া চিঠি', 'Torn letter', 'envelope'],
  ['মদের বোতল', 'Liquor bottle', 'bottle'], ['পোড়া দিয়াশলাই', 'Burnt matches', 'matchbox'],
  ['চুলের ক্লিপ', 'Hair clip', 'hairclip'], ['সিগারেটের টুকরা', 'Cigarette butt', 'cigarette'],
  ['মানিব্যাগ', 'Wallet', 'wallet'], ['আংটি', 'Ring', 'ring'], ['ওষুধের শিশি', 'Medicine vial', 'pill'],
  ['চাবি', 'Key', 'key'], ['দস্তানা', 'Gloves', 'gloves'], ['টাকার ব্যাগ', 'Money bag', 'money-stack'],
  ['ঘড়ি', 'Watch', 'watch'], ['রুমাল', 'Handkerchief', 'handkerchief'], ['নথিপত্র', 'Documents', 'documents'],
  ['পুরনো ছবি', 'Old photo', 'photo'], ['জুতার ছাপ', 'Footprint', 'footprint'], ['বোতাম', 'Button', 'button'],
  ['চশমা', 'Glasses', 'spectacles'], ['মোবাইল ফোন', 'Mobile phone', 'phone'], ['ডায়েরি', 'Diary', 'diary'],
  ['সুতা', 'Thread', 'thread'], ['কয়েন', 'Coin', 'coin'], ['তাবিজ', 'Amulet', 'amulet'],
  ['টিকিট', 'Ticket', 'ticket'], ['কলম', 'Pen', 'pen'], ['ফিতা', 'Ribbon', 'ribbon'],
  ['খাম', 'Envelope', 'letter'], ['আয়না', 'Mirror', 'mirror'], ['হাতব্যাগ', 'Handbag', 'bag'],
];
const MN: [string, string, string][] = [
  ['কুড়াল', 'Axe', 'axe'], ['বিষ', 'Poison', 'poison'], ['দড়ি', 'Rope', 'rope'], ['ইট', 'Brick', 'brick'],
  ['ছুরি', 'Knife', 'knife'], ['পিস্তল', 'Pistol', 'pistol'], ['বালিশ', 'Pillow', 'pillow'],
  ['লাঠি', 'Stick', 'stick'], ['তার', 'Wire', 'wire'], ['হাতুড়ি', 'Hammer', 'hammer'],
  ['আগুন', 'Fire', 'fire'], ['বন্দুক', 'Gun', 'gun'], ['ভাঙা কাচ', 'Glass shard', 'shard'],
  ['বেল্ট', 'Belt', 'belt'], ['শাবল', 'Crowbar', 'crowbar'], ['কাস্তে', 'Sickle', 'sickle'],
  ['গরম পানি', 'Hot water', 'kettle'], ['চেইন', 'Chain', 'chain'], ['ছাতা', 'Umbrella', 'umbrella'],
  ['কোদাল', 'Spade', 'spade'], ['বঁটি', 'Boti blade', 'blade'], ['করাত', 'Saw', 'saw'],
  ['পেরেক', 'Nail', 'nail'], ['মোমবাতি', 'Candle', 'candle'], ['স্কার্ফ', 'Scarf', 'scarf'],
];

function fill(list: [string, string, string][], type: 'evidence' | 'means', total: number): Card[] {
  const out: Card[] = list.map(([bn, en, icon], i) => ({
    id: `${type === 'evidence' ? 'ev' : 'mn'}_${String(i + 1).padStart(3, '0')}`, type, bn, en, icon,
  }));
  for (let i = list.length; i < total; i++) {
    out.push({
      id: `${type === 'evidence' ? 'ev' : 'mn'}_${String(i + 1).padStart(3, '0')}`, type,
      bn: `${type === 'evidence' ? 'প্রমাণ' : 'পদ্ধতি'} ${i + 1}`, en: `${type === 'evidence' ? 'Evidence' : 'Means'} #${i + 1}`,
      icon: 'placeholder',
    });
  }
  return out;
}

export const EVIDENCE_DECK: Card[] = fill(EV, 'evidence', 60);
export const MEANS_DECK: Card[] = fill(MN, 'means', 60);

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
