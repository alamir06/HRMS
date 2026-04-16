import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_TRANSLATE_URL =
  process.env.TRANSLATE_URL || "https://libretranslate.com/translate";
const TRANSLATE_API_KEY = process.env.TRANSLATE_API_KEY || "";
const TRANSLATE_TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS || 8000);
const TRANSLATE_MODE = (process.env.TRANSLATE_MODE || "transliteration").toLowerCase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRANSLITERATION_MAP_PATH = path.join(__dirname, "transliterationMap.json");

let transliterationMap = { vowels: {}, consonants: {}, reverseOverrides: {}, defaultVowel: "e" };
try {
  const mapText = readFileSync(TRANSLITERATION_MAP_PATH, "utf-8");
  transliterationMap = JSON.parse(mapText);
} catch (error) {
  console.warn("Failed to load transliteration map:", error.message || error);
}

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const buildConsonantKeys = () => {
  const keys = Object.keys(transliterationMap.consonants || {});
  return keys.sort((a, b) => b.length - a.length);
};

const consonantKeys = buildConsonantKeys();

const buildReverseMap = () => {
  const reverseMap = {};
  const vowels = transliterationMap.vowels || {};
  const consonants = transliterationMap.consonants || {};
  const overrides = transliterationMap.reverseOverrides || {};
  const defaultVowel = transliterationMap.defaultVowel || "e";

  Object.entries(vowels).forEach(([latin, amChar]) => {
    if (!reverseMap[amChar]) reverseMap[amChar] = latin;
  });

  Object.entries(consonants).forEach(([latin, mapping]) => {
    if (mapping[""]) {
      if (!reverseMap[mapping[""]]) reverseMap[mapping[""]] = latin;
    }

    Object.entries(mapping).forEach(([vowel, amChar]) => {
      if (!vowel) return;
      if (vowel === 'ee') return; // avoid duplicate resolution
      const syllable = `${latin}${vowel}`;
      if (!reverseMap[amChar]) reverseMap[amChar] = syllable;
    });
  });

  Object.entries(overrides).forEach(([amChar, latin]) => {
    reverseMap[amChar] = latin;
  });

  return reverseMap;
};

const reverseMap = buildReverseMap();

const isLetter = (char) => /[a-z]/i.test(char);

const transliterateEnglishToAmharic = (text) => {
  if (!text) return null;
  const vowels = transliterationMap.vowels || {};
  const consonants = transliterationMap.consonants || {};
  let i = 0;
  let result = "";
  const lower = text.toLowerCase();

  while (i < lower.length) {
    const char = lower[i];

    if (!isLetter(char)) {
      result += text[i];
      i += 1;
      continue;
    }

    let matchedConsonant = null;
    for (const key of consonantKeys) {
      if (lower.startsWith(key, i)) {
        matchedConsonant = key;
        break;
      }
    }

    if (matchedConsonant) {
      const consonantMap = consonants[matchedConsonant] || {};
      const nextIndex = i + matchedConsonant.length;

      let matchedVowel = null;
      const possibleVowels = ["ie", "ee", "aa", "wa", "a", "e", "i", "o", "u"];
      for (const vk of possibleVowels) {
        if (lower.startsWith(vk, nextIndex)) {
          matchedVowel = vk;
          break;
        }
      }

      if (matchedVowel && consonantMap[matchedVowel]) {
        result += consonantMap[matchedVowel];
        i = nextIndex + matchedVowel.length;
      } else {
        result += consonantMap[""] || matchedConsonant;
        i = nextIndex;
      }
      continue;
    }

    let matchedStandaloneVowel = null;
    const allVowelKeys = Object.keys(vowels).sort((a, b) => b.length - a.length);
    for (const vk of allVowelKeys) {
      if (lower.startsWith(vk, i)) {
        matchedStandaloneVowel = vk;
        break;
      }
    }

    if (matchedStandaloneVowel) {
      result += vowels[matchedStandaloneVowel];
      i += matchedStandaloneVowel.length;
      continue;
    }

    result += text[i];
    i += 1;
  }

  return normalizeText(result) || null;
};

const transliterateAmharicToEnglish = (text) => {
  if (!text) return null;
  let result = "";

  for (const char of text) {
    result += reverseMap[char] || char;
  }

  return normalizeText(result) || null;
};

export async function translateText(text, sourceLang, targetLang) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  if (sourceLang === targetLang) return normalized;

  if (TRANSLATE_MODE === "transliteration" && sourceLang === "en" && targetLang === "am") {
    return transliterateEnglishToAmharic(normalized);
  }

  if (TRANSLATE_MODE === "transliteration" && sourceLang === "am" && targetLang === "en") {
    return transliterateAmharicToEnglish(normalized);
  }

  if (typeof fetch !== "function") {
    console.warn("Translation skipped: fetch is not available");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);

  try {
    const payload = {
      q: normalized,
      source: sourceLang,
      target: targetLang,
      format: "text",
    };

    if (TRANSLATE_API_KEY) {
      payload.api_key = TRANSLATE_API_KEY;
    }

    const response = await fetch(DEFAULT_TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Translate failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return normalizeText(data.translatedText) || null;
  } catch (error) {
    console.warn("Translation failed:", error.message || error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function translatePairs(input, pairs) {
  if (!input || typeof input !== "object") return input;

  const output = { ...input };

  for (const { enKey, amKey } of pairs) {
    const enValue = normalizeText(output[enKey]);
    const amValue = normalizeText(output[amKey]);

    if (enValue && !amValue) {
      const translated = await translateText(enValue, "en", "am");
      output[amKey] = translated || enValue;
    } else if (amValue && !enValue) {
      const translated = await translateText(amValue, "am", "en");
      output[enKey] = translated || amValue;
    }
  }

  return output;
}
