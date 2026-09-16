import en from "./en.js";
import hi from "./hi.js";
import bn from "./bn.js";
import te from "./te.js";
import mr from "./mr.js";
import ta from "./ta.js";
import ur from "./ur.js";
import gu from "./gu.js";
import kn from "./kn.js";
import ml from "./ml.js";
import or_ from "./or.js";
import pa from "./pa.js";
import as_ from "./as.js";
import mai from "./mai.js";
import sa from "./sa.js";
import ks from "./ks.js";
import ne from "./ne.js";
import sd from "./sd.js";
import kok from "./kok.js";
import doi from "./doi.js";
import mni from "./mni.js";
import brx from "./brx.js";
import sat from "./sat.js";

export const languages = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "mai", name: "Maithili", native: "मैथिली" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्" },
  { code: "ks", name: "Kashmiri", native: "کٲشُر" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "doi", name: "Dogri", native: "डोगरी" },
  { code: "mni", name: "Manipuri (Meitei)", native: "মৈতৈলোন্" },
  { code: "brx", name: "Bodo", native: "बड़ो" },
  { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
];

export const dict = {
  en, hi, bn, te, mr, ta, ur, gu, kn, or: or_, ml, pa, as: as_,
  mai, sa, ks, ne, kok, sd, doi, mni, brx, sat,
};

// Ensure every language has every key (fallback to English for any gap)
for (const { code } of languages) {
  if (!dict[code]) dict[code] = { ...en };
  else dict[code] = { ...en, ...dict[code] };
}
