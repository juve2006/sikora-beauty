// Words that turn a product text into a medical claim (RULES.md: cosmetic effects only; Google Ads
// disapproves them). The admin warns where it finds one and never blocks: «запалення» can be the
// right word, and the cosmetologist decides. Each entry is a whole word, its endings spelled out:
// «heal» must not catch «healthy», nor «treat» the cosmetic «treatment».
const words = [
  'лікув\\p{L}*',
  'лікує',
  'лікують',
  'вилік\\p{L}*',
  'терап\\p{L}*',
  'хвороб\\p{L}*',
  'захворюв\\p{L}*',
  'діагно\\p{L}*',
  'дерматит\\p{L}*',
  'екзем\\p{L}*',
  'псоріаз\\p{L}*',
  'інфекці\\p{L}*',
  'протизапальн\\p{L}*',
  'антибактеріальн\\p{L}*',
  'медичн\\p{L}*',
  'гарант\\p{L}*',
  'назавжди',
  'клінічно доведен\\p{L}*',
  'cure[sd]?',
  'heal(?:s|ed|ing)?',
  'treats?',
  'diseases?',
  'therap\\p{L}*',
  'diagnos\\p{L}*',
  'dermatitis',
  'eczema',
  'psoriasis',
  'infections?',
  'anti-inflammatory',
  'antibacterial',
  'medical(?:ly)?',
  'guarantee[sd]?',
  'permanent(?:ly)?',
  'clinically proven',
];
const claim = new RegExp(
  `(?<![\\p{L}-])(?:${words.join('|')})(?![\\p{L}-])`,
  'giu',
);

export const medicalClaims = (text: string) => [
  ...new Set(Array.from(text.matchAll(claim), ([word]) => word.toLowerCase())),
];
