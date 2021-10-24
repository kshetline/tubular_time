import { isArray, isNumber, isString } from '@tubular/util';
import DateTimeFormat = Intl.DateTimeFormat;
import DateTimeFormatOptions = Intl.DateTimeFormatOptions;

let _hasIntl = false;
let _hasDateTimeStyle = true;
let _defaultLocale = 'en';

try {
  _hasIntl = typeof Intl !== 'undefined' && !!Intl?.DateTimeFormat;

  if (_hasIntl) {
    const full = new DateTimeFormat('en-us', { dateStyle: 'full' }).format(0);
    const short = new DateTimeFormat('en-us', { dateStyle: 'short' }).format(0);

    _hasDateTimeStyle = full !== short;

    if (!_hasDateTimeStyle)
      console.warn('Intl.DateTimeFormatOptions dateStyle and timeStyle not available');
  }
  else
    console.warn('Intl.DateTimeFormat not available');
}
catch (e) {
  _hasIntl = false;
  console.warn('Intl.DateTimeFormat not available: %s', e.message || e.toString());
}

try {
  if (_hasIntl)
    _defaultLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
  else if (typeof process === 'object' && process.env?.LANG)
    _defaultLocale = process.env.LANG.replace(/\..*$/, '').replace(/_/g, '-');
  else if (typeof navigator === 'object' && navigator.language)
    _defaultLocale = navigator.language;
}
catch (e) {
  _defaultLocale = 'en';
}

export const hasIntlDateTime = _hasIntl;
export const hasDateTimeStyle = _hasDateTimeStyle;
export const defaultLocale = _defaultLocale;

const backupDateFormats: Record<string, DateTimeFormatOptions> = {
  full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  short: { year: '2-digit', month: 'numeric', day: 'numeric' }
};

const backupTimeFormats: Record<string, DateTimeFormatOptions> = {
  full: { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'long' },
  long: { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' },
  medium: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  short: { hour: 'numeric', minute: '2-digit' }
};

function populate(original: any, supplement: any): void {
  Object.keys(supplement).forEach(key => original[key] = original[key] ?? supplement[key]);
}

export function checkDtfOptions(options: DateTimeFormatOptions): DateTimeFormatOptions {
  if (!hasDateTimeStyle && options.dateStyle) {
    populate(options, backupDateFormats[options.dateStyle]);
    delete options.dateStyle;
  }

  if (!hasDateTimeStyle && options.timeStyle) {
    populate(options, backupTimeFormats[options.timeStyle]);
    delete options.timeStyle;
  }

  return options;
}

export const localeList = [
  'af', 'ar', 'ar-dz', 'ar-kw', 'ar-ly', 'ar-ma', 'ar-sa', 'ar-tn', 'az', 'be', 'bg', 'bm', 'bn', 'bn-bd',
  'bo', 'br', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'de-at', 'de-ch', 'el', 'en', 'en-au', 'en-ca', 'en-gb',
  'en-ie', 'en-il', 'en-in', 'en-nz', 'en-sg', 'eo', 'es', 'es-do', 'es-mx', 'es-us', 'et', 'eu', 'fa',
  'fi', 'fil', 'fo', 'fr', 'fr-ca', 'fr-ch', 'fy', 'ga', 'gd', 'gl', 'gu', 'hi', 'hr', 'hu', 'hy-am',
  'is', 'it', 'it-ch', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky', 'lb', 'lo', 'lt', 'lv',
  'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'ms-my', 'mt', 'my', 'nb', 'ne', 'nl', 'nl-be', 'nn', 'pl', 'pt',
  'pt-br', 'ro', 'ru', 'sd', 'se', 'si', 'sk', 'sl', 'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'tg', 'th',
  'tk', 'tr', 'tzm', 'ug-cn', 'uk', 'ur', 'uz', 'vi', 'yo', 'zh-cn', 'zh-hk', 'zh-tw'
];

Object.freeze(localeList);

export function normalizeLocale(locale: string | string[]): string | string[] {
  if (!hasIntlDateTime || !locale)
    return 'en-us';

  if (isString(locale) && locale.includes(','))
    locale = locale.split(',').map(lcl => lcl.trim().replace(/-u-.*$/, ''));

  if (isArray(locale)) {
    if (locale.length === 0)
      return 'en';
    if (locale.length === 1)
      return normalizeLocale(locale[0]);
    else
      return locale.map(lcl => normalizeLocale(lcl) as string);
  }

  return locale.replace(/_/g, '-').toLowerCase();
}

function reduceLocale(locale: string): string {
  return locale.replace(/-[^-]*?$/i, '');
}

function getLocaleResource<T>(locale: string | string[], localeData: Record<string, T>): T {
  let data: any;

  locale = normalizeLocale(locale);

  if (!isArray(locale))
    locale = [locale];

  for (let lcl of locale) {
    let next: string;

    do {
      data = localeData[lcl];
      next = reduceLocale(lcl);
    } while (!data && lcl.includes('-') && (lcl = next));

    if (data)
      break;
  }

  return data;
}

/* eslint-disable quote-props */
// noinspection SpellCheckingInspection
const meridiems = {
  'af': [['vm', 'VM'], ['nm', 'NM']],
  'ar': [['ص'], ['م']],
  'az': [['gecə'], ['gecə'], ['gecə'], ['gecə'], ['səhər'], ['səhər'], ['səhər'], ['səhər'], ['səhər'], ['səhər'], ['səhər'], ['səhər'], ['gündüz'], ['gündüz'], ['gündüz'], ['gündüz'], ['gündüz'], ['axşam'], ['axşam'], ['axşam'], ['axşam'], ['axşam'], ['axşam'], ['axşam']],
  'be': [['ночы'], ['ночы'], ['ночы'], ['ночы'], ['раніцы'], ['раніцы'], ['раніцы'], ['раніцы'], ['раніцы'], ['раніцы'], ['раніцы'], ['раніцы'], ['дня'], ['дня'], ['дня'], ['дня'], ['дня'], ['вечара'], ['вечара'], ['вечара'], ['вечара'], ['вечара'], ['вечара'], ['вечара']],
  'bn': [['রাত'], ['রাত'], ['রাত'], ['রাত'], ['সকাল'], ['সকাল'], ['সকাল'], ['সকাল'], ['সকাল'], ['সকাল'], ['দুপুর'], ['দুপুর'], ['দুপুর'], ['দুপুর'], ['দুপুর'], ['দুপুর'], ['দুপুর'], ['বিকাল'], ['বিকাল'], ['বিকাল'], ['রাত'], ['রাত'], ['রাত'], ['রাত']],
  'bn-bd': [['রাত'], ['রাত'], ['রাত'], ['রাত'], ['ভোর'], ['ভোর'], ['সকাল'], ['সকাল'], ['সকাল'], ['সকাল'], ['সকাল'], ['সকাল'], ['দুপুর'], ['দুপুর'], ['দুপুর'], ['বিকাল'], ['বিকাল'], ['বিকাল'], ['সন্ধ্যা'], ['সন্ধ্যা'], ['রাত'], ['রাত'], ['রাত'], ['রাত']],
  'bo': [['སྔ་དྲོ', 'མཚན་མོ'], ['སྔ་དྲོ', 'མཚན་མོ'], ['སྔ་དྲོ', 'མཚན་མོ'], ['སྔ་དྲོ', 'མཚན་མོ'], ['སྔ་དྲོ', 'ཞོགས་ཀས'], ['སྔ་དྲོ', 'ཞོགས་ཀས'], ['སྔ་དྲོ', 'ཞོགས་ཀས'], ['སྔ་དྲོ', 'ཞོགས་ཀས'], ['སྔ་དྲོ', 'ཞོགས་ཀས'], ['སྔ་དྲོ', 'ཞོགས་ཀས'], ['སྔ་དྲོ', 'ཉིན་གུང'], ['སྔ་དྲོ', 'ཉིན་གུང'], ['ཕྱི་དྲོ', 'ཉིན་གུང'], ['ཕྱི་དྲོ', 'ཉིན་གུང'], ['ཕྱི་དྲོ', 'ཉིན་གུང'], ['ཕྱི་དྲོ', 'ཉིན་གུང'], ['ཕྱི་དྲོ', 'ཉིན་གུང'], ['ཕྱི་དྲོ', 'དགོང་དག'], ['ཕྱི་དྲོ', 'དགོང་དག'], ['ཕྱི་དྲོ', 'དགོང་དག'], ['ཕྱི་དྲོ', 'མཚན་མོ'], ['ཕྱི་དྲོ', 'མཚན་མོ'], ['ཕྱི་དྲོ', 'མཚན་མོ'], ['ཕྱི་དྲོ', 'མཚན་མོ']],
  'br': [['a.m.', 'A.M.'], ['g.m.', 'G.M.']],
  'el': [['πμ', 'ΠΜ', 'π.μ.'], ['μμ', 'ΜΜ', 'μ.μ.']],
  'eo': [['atm', 'ATM', 'a.t.m.', 'A.T.M.'], ['ptm', 'PTM', 'p.t.m.', 'P.T.M.']],
  'fa': [['قبل از ظهر'], ['بعد از ظهر']],
  'gu': [['રાત'], ['રાત'], ['રાત'], ['રાત'], ['સવાર'], ['સવાર'], ['સવાર'], ['સવાર'], ['સવાર'], ['સવાર'], ['બપોર'], ['બપોર'], ['બપોર'], ['બપોર'], ['બપોર'], ['બપોર'], ['બપોર'], ['સાંજ'], ['સાંજ'], ['સાંજ'], ['રાત'], ['રાત'], ['રાત'], ['રાત']],
  'he': [['לפ׳', 'לפ׳', 'לפנה״צ'], ['אח׳', 'אח׳', 'אחה״צ']],
  'hi': [['पू', 'रात'], ['पू', 'रात'], ['पू', 'रात'], ['पू', 'रात'], ['पू', 'सुबह'], ['पू', 'सुबह'], ['पू', 'सुबह'], ['पू', 'सुबह'], ['पू', 'सुबह'], ['पू', 'सुबह'], ['पू', 'दोपहर'], ['पू', 'दोपहर'], ['अ', 'दोपहर'], ['अ', 'दोपहर'], ['अ', 'दोपहर'], ['अ', 'दोपहर'], ['अ', 'दोपहर'], ['अ', 'शाम'], ['अ', 'शाम'], ['अ', 'शाम'], ['अ', 'रात'], ['अ', 'रात'], ['अ', 'रात'], ['अ', 'रात']],
  'hu': [['de', 'DE', 'de.'], ['du', 'DU', 'du.']],
  'hy': [['գիշերվա'], ['գիշերվա'], ['գիշերվա'], ['գիշերվա'], ['առավոտվա'], ['առավոտվա'], ['առավոտվա'], ['առավոտվա'], ['առավոտվա'], ['առավոտվա'], ['առավոտվա'], ['առավոտվա'], ['ցերեկվա'], ['ցերեկվա'], ['ցերեկվա'], ['ցերեկվա'], ['ցերեկվա'], ['երեկոյան'], ['երեկոյան'], ['երեկոյան'], ['երեկոյան'], ['երեկոյան'], ['երեկոյան'], ['երեկոյան']],
  'ja': [['午前'], ['午後']],
  'jv': [['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'enjing'], ['isuk', 'Isuk', 'siyang'], ['wengi', 'Wengi', 'siyang'], ['wengi', 'Wengi', 'siyang'], ['wengi', 'Wengi', 'siyang'], ['wengi', 'Wengi', 'sonten'], ['wengi', 'Wengi', 'sonten'], ['wengi', 'Wengi', 'sonten'], ['wengi', 'Wengi', 'sonten'], ['wengi', 'Wengi', 'ndalu'], ['wengi', 'Wengi', 'ndalu'], ['wengi', 'Wengi', 'ndalu'], ['wengi', 'Wengi', 'ndalu'], ['wengi', 'Wengi', 'ndalu']],
  'km': [['ព្រឹក'], ['ល្ងាច']],
  'kn': [['ರಾತ್ರಿ', 'ಪೂರ್ವಾಹ್ನ'], ['ರಾತ್ರಿ', 'ಪೂರ್ವಾಹ್ನ'], ['ರಾತ್ರಿ', 'ಪೂರ್ವಾಹ್ನ'], ['ರಾತ್ರಿ', 'ಪೂರ್ವಾಹ್ನ'], ['ಬೆಳಿಗ್ಗೆ', 'ಪೂರ್ವಾಹ್ನ'], ['ಬೆಳಿಗ್ಗೆ', 'ಪೂರ್ವಾಹ್ನ'], ['ಬೆಳಿಗ್ಗೆ', 'ಪೂರ್ವಾಹ್ನ'], ['ಬೆಳಿಗ್ಗೆ', 'ಪೂರ್ವಾಹ್ನ'], ['ಬೆಳಿಗ್ಗೆ', 'ಪೂರ್ವಾಹ್ನ'], ['ಬೆಳಿಗ್ಗೆ', 'ಪೂರ್ವಾಹ್ನ'], ['ಮಧ್ಯಾಹ್ನ', 'ಪೂರ್ವಾಹ್ನ'], ['ಮಧ್ಯಾಹ್ನ', 'ಪೂರ್ವಾಹ್ನ'], ['ಮಧ್ಯಾಹ್ನ', 'ಅಪರಾಹ'], ['ಮಧ್ಯಾಹ್ನ', 'ಅಪರಾಹ'], ['ಮಧ್ಯಾಹ್ನ', 'ಅಪರಾಹ'], ['ಮಧ್ಯಾಹ್ನ', 'ಅಪರಾಹ'], ['ಮಧ್ಯಾಹ್ನ', 'ಅಪರಾಹ'], ['ಸಂಜೆ', 'ಅಪರಾಹ'], ['ಸಂಜೆ', 'ಅಪರಾಹ'], ['ಸಂಜೆ', 'ಅಪರಾಹ'], ['ರಾತ್ರಿ', 'ಅಪರಾಹ'], ['ರಾತ್ರಿ', 'ಅಪರಾಹ'], ['ರಾತ್ರಿ', 'ಅಪರಾಹ'], ['ರಾತ್ರಿ', 'ಅಪರಾಹ']],
  'ko': [['오전'], ['오후']],
  'ku': [['BN', 'به‌یانی'], ['PN', 'ئێواره‌']],
  'lo': [['ຕອນເຊົ້າ'], ['ຕອນແລງ']],
  'ml': [['രാത്രി'], ['രാത്രി'], ['രാത്രി'], ['രാത്രി'], ['രാവിലെ'], ['രാവിലെ'], ['രാവിലെ'], ['രാവിലെ'], ['രാവിലെ'], ['രാവിലെ'], ['രാവിലെ'], ['രാവിലെ'], ['ഉച്ച കഴിഞ്ഞ്'], ['ഉച്ച കഴിഞ്ഞ്'], ['ഉച്ച കഴിഞ്ഞ്'], ['ഉച്ച കഴിഞ്ഞ്'], ['ഉച്ച കഴിഞ്ഞ്'], ['വൈകുന്നേരം'], ['വൈകുന്നേരം'], ['വൈകുന്നേരം'], ['രാത്രി'], ['രാത്രി'], ['രാത്രി'], ['രാത്രി']],
  'mn': [['ү.ө.', 'ҮӨ'], ['ү.х.', 'ҮХ']],
  'mr': [['म.पू.', 'पहाटे'], ['म.पू.', 'पहाटे'], ['म.पू.', 'पहाटे'], ['म.पू.', 'पहाटे'], ['म.पू.', 'पहाटे'], ['म.पू.', 'पहाटे'], ['म.पू.', 'सकाळी'], ['म.पू.', 'सकाळी'], ['म.पू.', 'सकाळी'], ['म.पू.', 'सकाळी'], ['म.पू.', 'सकाळी'], ['म.पू.', 'सकाळी'], ['म.उ.', 'दुपारी'], ['म.उ.', 'दुपारी'], ['म.उ.', 'दुपारी'], ['म.उ.', 'दुपारी'], ['म.उ.', 'दुपारी'], ['म.उ.', 'सायंकाळी'], ['म.उ.', 'सायंकाळी'], ['म.उ.', 'सायंकाळी'], ['म.उ.', 'रात्री'], ['म.उ.', 'रात्री'], ['म.उ.', 'रात्री'], ['म.उ.', 'रात्री']],
  'ms': [['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['pagi', 'PG'], ['tengahari', 'PG'], ['tengahari', 'PTG'], ['tengahari', 'PTG'], ['tengahari', 'PTG'], ['petang', 'PTG'], ['petang', 'PTG'], ['petang', 'PTG'], ['petang', 'PTG'], ['malam', 'PTG'], ['malam', 'PTG'], ['malam', 'PTG'], ['malam', 'PTG'], ['malam', 'PTG']],
  'my': [['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['နံနက်', 'နံနက်'], ['ညနေ', 'မွန်းတည့်'], ['ညနေ', 'နေ့လယ်'], ['ညနေ', 'နေ့လယ်'], ['ညနေ', 'နေ့လယ်'], ['ညနေ', 'ညနေ'], ['ညနေ', 'ညနေ'], ['ညနေ', 'ညနေ'], ['ညနေ', 'ည'], ['ညနေ', 'ည'], ['ညနေ', 'ည'], ['ညနေ', 'ည'], ['ညနေ', 'ည']],
  'ne': [['पूर्वाह्न', 'राति'], ['पूर्वाह्न', 'राति'], ['पूर्वाह्न', 'राति'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['पूर्वाह्न', 'बिहान'], ['अपराह्न', 'दिउँसो'], ['अपराह्न', 'दिउँसो'], ['अपराह्न', 'दिउँसो'], ['अपराह्न', 'दिउँसो'], ['अपराह्न', 'साँझ'], ['अपराह्न', 'साँझ'], ['अपराह्न', 'साँझ'], ['अपराह्न', 'साँझ'], ['अपराह्न', 'राति'], ['अपराह्न', 'राति'], ['अपराह्न', 'राति'], ['अपराह्न', 'राति']],
  'ru': [['ночи'], ['ночи'], ['ночи'], ['ночи'], ['утра'], ['утра'], ['утра'], ['утра'], ['утра'], ['утра'], ['утра'], ['утра'], ['дня'], ['дня'], ['дня'], ['дня'], ['дня'], ['вечера'], ['вечера'], ['вечера'], ['вечера'], ['вечера'], ['вечера'], ['вечера']],
  'sd': [['صبح'], ['شام', 'منجهند']],
  'si': [['පෙ.ව.', 'පෙර වරු'], ['ප.ව.', 'පස් වරු']],
  'sq': [['pd', 'PD', 'e paradites'], ['md', 'MD', 'e pasdites']],
  'ta': [['யாமம்', 'முற்பகல்'], ['யாமம்', 'முற்பகல்'], ['வைகறை', 'முற்பகல்'], ['வைகறை', 'முற்பகல்'], ['வைகறை', 'முற்பகல்'], ['வைகறை', 'முற்பகல்'], ['காலை', 'முற்பகல்'], ['காலை', 'முற்பகல்'], ['காலை', 'முற்பகல்'], ['காலை', 'முற்பகல்'], ['நண்பகல்', 'முற்பகல்'], ['நண்பகல்', 'முற்பகல்'], ['நண்பகல்', 'பிற்பகல்'], ['நண்பகல்', 'பிற்பகல்'], ['எற்பாடு', 'பிற்பகல்'], ['எற்பாடு', 'பிற்பகல்'], ['எற்பாடு', 'பிற்பகல்'], ['எற்பாடு', 'பிற்பகல்'], ['மாலை', 'பிற்பகல்'], ['மாலை', 'பிற்பகல்'], ['மாலை', 'பிற்பகல்'], ['மாலை', 'பிற்பகல்'], ['யாமம்', 'பிற்பகல்'], ['யாமம்', 'பிற்பகல்']],
  'te': [['రాత్రి'], ['రాత్రి'], ['రాత్రి'], ['రాత్రి'], ['ఉదయం'], ['ఉదయం'], ['ఉదయం'], ['ఉదయం'], ['ఉదయం'], ['ఉదయం'], ['మధ్యాహ్నం'], ['మధ్యాహ్నం'], ['మధ్యాహ్నం'], ['మధ్యాహ్నం'], ['మధ్యాహ్నం'], ['మధ్యాహ్నం'], ['మధ్యాహ్నం'], ['సాయంత్రం'], ['సాయంత్రం'], ['సాయంత్రం'], ['రాత్రి'], ['రాత్రి'], ['రాత్రి'], ['రాత్రి']],
  'tg': [['шаб'], ['шаб'], ['шаб'], ['шаб'], ['субҳ'], ['субҳ'], ['субҳ'], ['субҳ'], ['субҳ'], ['субҳ'], ['субҳ'], ['рӯз'], ['рӯз'], ['рӯз'], ['рӯз'], ['рӯз'], ['бегоҳ'], ['бегоҳ'], ['бегоҳ'], ['шаб'], ['шаб'], ['шаб'], ['шаб'], ['шаб']],
  'th': [['ก่อนเที่ยง'], ['หลังเที่ยง']],
  'tr': [['öö', 'ÖÖ'], ['ös', 'ÖS']],
  'ug': [['چۈشتىن بۇرۇن', 'يېرىم كېچە'], ['چۈشتىن بۇرۇن', 'يېرىم كېچە'], ['چۈشتىن بۇرۇن', 'يېرىم كېچە'], ['چۈشتىن بۇرۇن', 'يېرىم كېچە'], ['چۈشتىن بۇرۇن', 'يېرىم كېچە'], ['چۈشتىن بۇرۇن', 'يېرىم كېچە'], ['چۈشتىن بۇرۇن', 'سەھەر'], ['چۈشتىن بۇرۇن', 'سەھەر'], ['چۈشتىن بۇرۇن', 'سەھەر'], ['چۈشتىن بۇرۇن', 'چۈشتىن بۇرۇن'], ['چۈشتىن بۇرۇن', 'چۈشتىن بۇرۇن'], ['چۈشتىن بۇرۇن', 'چۈشتىن بۇرۇن'], ['چۈشتىن كېيىن', 'چۈش'], ['چۈشتىن كېيىن', 'چۈشتىن كېيىن'], ['چۈشتىن كېيىن', 'چۈشتىن كېيىن'], ['چۈشتىن كېيىن', 'چۈشتىن كېيىن'], ['چۈشتىن كېيىن', 'چۈشتىن كېيىن'], ['چۈشتىن كېيىن', 'چۈشتىن كېيىن'], ['چۈشتىن كېيىن', 'كەچ'], ['چۈشتىن كېيىن', 'كەچ'], ['چۈشتىن كېيىن', 'كەچ'], ['چۈشتىن كېيىن', 'كەچ'], ['چۈشتىن كېيىن', 'كەچ'], ['چۈشتىن كېيىن', 'كەچ']],
  'uk': [['дп'], ['пп']],
  'ur': [['ق.د.', 'صبح'], ['ب.د.', 'شام']],
  'vi': [['sa', 'SA'], ['ch', 'CH']],
  'zh': [['上午'], ['下午']]
};

// Otherwise Chrome uses plain old AM/PM for nearly all locales
const priorityMeridiems: Record<string, boolean> = {};
['af', 'bo', 'br', 'el', 'eo', 'he', 'hi', 'hu', 'jv', 'ku', 'lo', 'mn', 'my', 'mr', 'ne', 'sd', 'sq', 'si', 'th', 'ug', 'ur', 'zh']
  .forEach(lang => priorityMeridiems[lang] = true);

export const DEFAULT_MERIDIEMS = [['am', 'AM'], ['pm', 'PM']];

export function hasPriorityMeridiems(locale: string | string[]): boolean {
  return !!getLocaleResource<boolean>(locale, priorityMeridiems);
}

export function getMeridiems(locale: string | string[]): string[][] {
  let result = getLocaleResource<string[][]>(locale, meridiems);

  if (!result)
    result = DEFAULT_MERIDIEMS;

  return result;
}

const weekStartByCountry: Record<string, number> = {};

`ag as au bd br bs bt bw bz ca cn co dm do et gt
 gu hk hn id il in jm jp ke kh kr la mh mm mo mt
 mx mz ni np pa pe ph pk pr pt py sa sg sv th tt
 tw um us ve vi ws ye za zw`
  .split(/s+/).forEach(country => weekStartByCountry[country] = 0);

`ad ai al am an ar at ax az ba be bg bm bn by ch
 cl cm cr cy cz de dk ec ee es fi fj fo fr gb ge
 gf gp gr hr hu ie is it kg kz lb li lk lt lu lv
 mc md me mk mn mq my nl no nz pl re ro rs ru se
 si sk sm tj tm tr ua uy uz va vn xk`
  .split(/s+/).forEach(country => weekStartByCountry[country] = 1);

weekStartByCountry.mv = 5;

`ae af bh dj dz eg iq ir jo kw ly om qa sd sy`
  .split(/s+/).forEach(country => weekStartByCountry[country] = 6);

const weekInfo = {
  'af': [1, 4, 5], 'ar': [6, 1, 5, 6], 'ar-dz': [0, 3, 5, 6], 'ar-sa': [0, 1, 4, 5], 'az': [1, 1, 6, 0],
  'be': [1, 1, 6, 0], 'bg': [1, 1, 6, 0], 'bn': [0, 1, 6, 0], 'bn-bd': [0, 1, 6, 0], 'bo': [0, 1, 6, 0],
  'bs': [1, 1, 6, 0], 'en': [1, 1, 6, 0], 'en-au': [0, 3, 6, 0], 'en-ca': [0, 1, 6, 0], 'en-il': [0, 1, 5, 6],
  'en-us': [0, 1, 6, 0], 'eo': [1, 1, 6, 0], 'es-mx': [0, 3, 6, 0], 'es-us': [0, 1, 6, 0], 'eu': [1, 1, 6, 0],
  'fa': [6, 1, 6, 0], 'fr': [1, 1, 6, 0], 'fr-ca': [0, 1, 6, 0], 'gu': [0, 1, 6, 0], 'hi': [0, 1, 6, 0],
  'hr': [1, 1, 6, 0], 'hy-am': [1, 1, 6, 0], 'ja': [0, 1, 6, 0], 'jv': [1, 1, 6, 0], 'ka': [1, 1, 6, 0],
  'kk': [1, 1, 6, 0], 'kn': [0, 1, 6, 0], 'ko': [0, 1, 6, 0], 'ku': [6, 1, 6, 0], 'ky': [1, 1, 6, 0],
  'lo': [0, 1, 6, 0], 'mk': [1, 1, 6, 0], 'ml': [0, 1, 6, 0], 'mn': [0, 1, 6, 0], 'mr': [0, 1, 5, 6],
  'ms': [1, 1, 6, 0], 'ne': [0, 1, 6, 0], 'pt': [1, 1, 6, 0], 'pt-br': [0, 1, 6, 0], 'ro': [1, 1, 6, 0],
  'sd': [1, 4, 5], 'si': [0, 1, 6, 0], 'sl': [1, 1, 6, 0], 'sr': [1, 1, 6, 0], 'sw': [1, 1, 6, 0], 'ta': [0, 1, 6, 0],
  'te': [0, 1, 6, 0], 'tg': [1, 1, 6, 0], 'th': [0, 1, 6, 0], 'tk': [1, 1, 6, 0], 'tr': [1, 1, 6, 0],
  'tzm': [6, 1, 6, 0], 'ug-cn': [1, 1, 6, 0], 'uk': [1, 1, 6, 0], 'uz': [1, 1, 6, 0], 'zh': [0, 1, 6, 0]
};

function getWeekInfo(locale: string | string[]): number[] {
  let result = getLocaleResource<number []>(locale, weekInfo);

  if (result == null)
    result = weekInfo.en;

  locale = normalizeLocale(locale);

  if (!isArray(locale))
    locale = [locale];

  let day: number;

  for (const lcl of locale) {
    const country = lcl.split('-')[1];

    if (country) {
      if (weekInfo[lcl] != null)
        break;

      day = weekStartByCountry[country];

      if (day != null)
        break;
    }
  }

  if (day != null)
    result[0] = day;

  return result;
}

export function getStartOfWeek(locale: string | string[]): number {
  return getWeekInfo(locale)[0];
}

export function getMinDaysInWeek(locale: string | string[]): number {
  return getWeekInfo(locale)[1];
}

export function getWeekend(locale: string | string[]): number[] {
  return getWeekInfo(locale).slice(2);
}

// noinspection SpellCheckingInspection
const ordinals = {
  'af': ['0de', '1ste', '2de', '3de', '4de', '5de', '6de', '7de', '8ste', '9de', '10de', '11de', '12de', '13de', '14de', '15de', '16de', '17de', '18de', '19de', '20ste', '21ste', '22ste', '23ste', '24ste', '25ste', '26ste', '27ste', '28ste', '29ste', '30ste', '31ste'],
  'ar': 1,
  'az': ['0-ıncı', '1-inci', '2-nci', '3-üncü', '4-üncü', '5-inci', '6-ncı', '7-nci', '8-inci', '9-uncu', '10-uncu', '11-inci', '12-nci', '13-üncü', '14-üncü', '15-inci', '16-ncı', '17-nci', '18-inci', '19-uncu', '20-nci', '21-inci', '22-nci', '23-üncü', '24-üncü', '25-inci', '26-ncı', '27-nci', '28-inci', '29-uncu', '30-uncu', '31-inci'],
  'be': 1,
  'bg': ['0-ев', '1-ви', '2-ри', '3-ти', '4-ти', '5-ти', '6-ти', '7-ми', '8-ми', '9-ти', '10-ти', '11-ти', '12-ти', '13-ти', '14-ти', '15-ти', '16-ти', '17-ти', '18-ти', '19-ти', '20-ти', '21-ви', '22-ри', '23-ти', '24-ти', '25-ти', '26-ти', '27-ми', '28-ми', '29-ти', '30-ти', '31-ви'],
  'bm': 1, 'bn': 1, 'bo': 1,
  'br': ['0vet', '1añ', '2vet', '3vet', '4vet', '5vet', '6vet', '7vet', '8vet', '9vet', '10vet', '11vet', '12vet', '13vet', '14vet', '15vet', '16vet', '17vet', '18vet', '19vet', '20vet', '21vet', '22vet', '23vet', '24vet', '25vet', '26vet', '27vet', '28vet', '29vet', '30vet', '31vet'],
  'bs': 2,
  'ca': ['0è', '1r', '2n', '3r', '4t', '5è', '6è', '7è', '8è', '9è', '10è', '11è', '12è', '13è', '14è', '15è', '16è', '17è', '18è', '19è', '20è', '21è', '22è', '23è', '24è', '25è', '26è', '27è', '28è', '29è', '30è', '31è'],
  'cs': 2,
  'cy': ['0', '1af', '2il', '3ydd', '4ydd', '5ed', '6ed', '7ed', '8fed', '9fed', '10fed', '11eg', '12fed', '13eg', '14eg', '15fed', '16eg', '17eg', '18fed', '19eg', '20fed', '21ain', '22ain', '23ain', '24ain', '25ain', '26ain', '27ain', '28ain', '29ain', '30ain', '31ain'],
  'da': 2, 'de': 2, 'el': 6,
  'en': ['0th', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th', '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st'],
  'eo': 3, 'es': 4, 'et': 2, 'eu': 2, 'fa': 5, 'fi': 2, 'fil': 1, 'fo': 2,
  'fr': ['0e', '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e', '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e', '21e', '22e', '23e', '24e', '25e', '26e', '27e', '28e', '29e', '30e', '31e'],
  'fy': ['0de', '1ste', '2de', '3de', '4de', '5de', '6de', '7de', '8ste', '9de', '10de', '11de', '12de', '13de', '14de', '15de', '16de', '17de', '18de', '19de', '20ste', '21ste', '22ste', '23ste', '24ste', '25ste', '26ste', '27ste', '28ste', '29ste', '30ste', '31ste'],
  'ga': ['0mh', '1d', '2na', '3mh', '4mh', '5mh', '6mh', '7mh', '8mh', '9mh', '10mh', '11mh', '12na', '13mh', '14mh', '15mh', '16mh', '17mh', '18mh', '19mh', '20mh', '21mh', '22na', '23mh', '24mh', '25mh', '26mh', '27mh', '28mh', '29mh', '30mh', '31mh'],
  'gd': ['0mh', '1d', '2na', '3mh', '4mh', '5mh', '6mh', '7mh', '8mh', '9mh', '10mh', '11mh', '12na', '13mh', '14mh', '15mh', '16mh', '17mh', '18mh', '19mh', '20mh', '21mh', '22na', '23mh', '24mh', '25mh', '26mh', '27mh', '28mh', '29mh', '30mh', '31mh'],
  'gl': 4, 'gu': 1, 'hi': 1, 'hr': 2, 'hu': 2, 'hy-am': 1, 'is': 2, 'it': 4, 'ja': 1, 'jv': 1,
  'ka': ['0', '1-ლი', 'მე-2', 'მე-3', 'მე-4', 'მე-5', 'მე-6', 'მე-7', 'მე-8', 'მე-9', 'მე-10', 'მე-11', 'მე-12', 'მე-13', 'მე-14', 'მე-15', 'მე-16', 'მე-17', 'მე-18', 'მე-19', 'მე-20', '21-ე', '22-ე', '23-ე', '24-ე', '25-ე', '26-ე', '27-ე', '28-ე', '29-ე', '30-ე', '31-ე'],
  'kk': ['0-ші', '1-ші', '2-ші', '3-ші', '4-ші', '5-ші', '6-шы', '7-ші', '8-ші', '9-шы', '10-шы', '11-ші', '12-ші', '13-ші', '14-ші', '15-ші', '16-шы', '17-ші', '18-ші', '19-шы', '20-шы', '21-ші', '22-ші', '23-ші', '24-ші', '25-ші', '26-шы', '27-ші', '28-ші', '29-шы', '30-шы', '31-ші'],
  'km': ['ទី0', 'ទី1', 'ទី2', 'ទី3', 'ទី4', 'ទី5', 'ទី6', 'ទី7', 'ទី8', 'ទី9', 'ទី10', 'ទី11', 'ទី12', 'ទី13', 'ទី14', 'ទី15', 'ទី16', 'ទី17', 'ទី18', 'ទី19', 'ទី20', 'ទី21', 'ទី22', 'ទី23', 'ទី24', 'ទី25', 'ទី26', 'ទី27', 'ទី28', 'ទី29', 'ទី30', 'ទី31'],
  'kn': ['0ನೇ', '1ನೇ', '2ನೇ', '3ನೇ', '4ನೇ', '5ನೇ', '6ನೇ', '7ನೇ', '8ನೇ', '9ನೇ', '10ನೇ', '11ನೇ', '12ನೇ', '13ನೇ', '14ನೇ', '15ನೇ', '16ನೇ', '17ನೇ', '18ನೇ', '19ನೇ', '20ನೇ', '21ನೇ', '22ನೇ', '23ನೇ', '24ನೇ', '25ನೇ', '26ನೇ', '27ನೇ', '28ನೇ', '29ನೇ', '30ನೇ', '31ನೇ'],
  'ko': 1, 'ku': 1,
  'ky': ['0-чү', '1-чи', '2-чи', '3-чү', '4-чү', '5-чи', '6-чы', '7-чи', '8-чи', '9-чу', '10-чу', '11-чи', '12-чи', '13-чү', '14-чү', '15-чи', '16-чы', '17-чи', '18-чи', '19-чу', '20-чы', '21-чи', '22-чи', '23-чү', '24-чү', '25-чи', '26-чы', '27-чи', '28-чи', '29-чу', '30-чу', '31-чи'],
  'lb': 2,
  'lo': ['ທີ່0', 'ທີ່1', 'ທີ່2', 'ທີ່3', 'ທີ່4', 'ທີ່5', 'ທີ່6', 'ທີ່7', 'ທີ່8', 'ທີ່9', 'ທີ່10', 'ທີ່11', 'ທີ່12', 'ທີ່13', 'ທີ່14', 'ທີ່15', 'ທີ່16', 'ທີ່17', 'ທີ່18', 'ທີ່19', 'ທີ່20', 'ທີ່21', 'ທີ່22', 'ທີ່23', 'ທີ່24', 'ທີ່25', 'ທີ່26', 'ທີ່27', 'ທີ່28', 'ທີ່29', 'ທີ່30', 'ທີ່31'],
  'lt': ['0-oji', '1-oji', '2-oji', '3-oji', '4-oji', '5-oji', '6-oji', '7-oji', '8-oji', '9-oji', '10-oji', '11-oji', '12-oji', '13-oji', '14-oji', '15-oji', '16-oji', '17-oji', '18-oji', '19-oji', '20-oji', '21-oji', '22-oji', '23-oji', '24-oji', '25-oji', '26-oji', '27-oji', '28-oji', '29-oji', '30-oji', '31-oji'],
  'lv': 2, 'mi': 4,
  'mk': ['0-ев', '1-ви', '2-ри', '3-ти', '4-ти', '5-ти', '6-ти', '7-ми', '8-ми', '9-ти', '10-ти', '11-ти', '12-ти', '13-ти', '14-ти', '15-ти', '16-ти', '17-ти', '18-ти', '19-ти', '20-ти', '21-ви', '22-ри', '23-ти', '24-ти', '25-ти', '26-ти', '27-ми', '28-ми', '29-ти', '30-ти', '31-ви'],
  'ml': 1, 'mn': 1, 'mr': 1, 'ms': 1, 'mt': 4, 'my': 1, 'nb': 2, 'ne': 1,
  'nl': ['0de', '1ste', '2de', '3de', '4de', '5de', '6de', '7de', '8ste', '9de', '10de', '11de', '12de', '13de', '14de', '15de', '16de', '17de', '18de', '19de', '20ste', '21ste', '22ste', '23ste', '24ste', '25ste', '26ste', '27ste', '28ste', '29ste', '30ste', '31ste'],
  'nn': 2, 'pl': 2, 'pt': 4, 'ro': 1, 'ru': 1, 'sd': 1, 'se': 2,
  'si': ['0 වැනි', '1 වැනි', '2 වැනි', '3 වැනි', '4 වැනි', '5 වැනි', '6 වැනි', '7 වැනි', '8 වැනි', '9 වැනි', '10 වැනි', '11 වැනි', '12 වැනි', '13 වැනි', '14 වැනි', '15 වැනි', '16 වැනි', '17 වැනි', '18 වැනි', '19 වැනි', '20 වැනි', '21 වැනි', '22 වැනි', '23 වැනි', '24 වැනි', '25 වැනි', '26 වැනි', '27 වැනි', '28 වැනි', '29 වැනි', '30 වැනි', '31 වැනි'],
  'sk': 2, 'sl': 2, 'sq': 2, 'sr': 2,
  'sv': ['0:e', '1:a', '2:a', '3:e', '4:e', '5:e', '6:e', '7:e', '8:e', '9:e', '10:e', '11:e', '12:e', '13:e', '14:e', '15:e', '16:e', '17:e', '18:e', '19:e', '20:e', '21:a', '22:a', '23:e', '24:e', '25:e', '26:e', '27:e', '28:e', '29:e', '30:e', '31:a'],
  'sw': 1,
  'ta': ['0வது', '1வது', '2வது', '3வது', '4வது', '5வது', '6வது', '7வது', '8வது', '9வது', '10வது', '11வது', '12வது', '13வது', '14வது', '15வது', '16வது', '17வது', '18வது', '19வது', '20வது', '21வது', '22வது', '23வது', '24வது', '25வது', '26வது', '27வது', '28வது', '29வது', '30வது', '31வது'],
  'te': ['0వ', '1వ', '2వ', '3వ', '4వ', '5వ', '6వ', '7వ', '8వ', '9వ', '10వ', '11వ', '12వ', '13వ', '14వ', '15వ', '16వ', '17వ', '18వ', '19వ', '20వ', '21వ', '22వ', '23వ', '24వ', '25వ', '26వ', '27వ', '28వ', '29వ', '30వ', '31వ'],
  'tg': ['0-ум', '1-ум', '2-юм', '3-юм', '4-ум', '5-ум', '6-ум', '7-ум', '8-ум', '9-ум', '10-ум', '11-ум', '12-ум', '13-ум', '14-ум', '15-ум', '16-ум', '17-ум', '18-ум', '19-ум', '20-ум', '21-ум', '22-юм', '23-юм', '24-ум', '25-ум', '26-ум', '27-ум', '28-ум', '29-ум', '30-юм', '31-ум'],
  'th': 1,
  'tk': ["0'unjy", "1'inji", "2'nji", "3'ünji", "4'ünji", "5'inji", "6'njy", "7'nji", "8'inji", "9'unjy", "10'unjy", "11'inji", "12'nji", "13'ünji", "14'ünji", "15'inji", "16'njy", "17'nji", "18'inji", "19'unjy", "20'nji", "21'inji", "22'nji", "23'ünji", "24'ünji", "25'inji", "26'njy", "27'nji", "28'inji", "29'unjy", "30'unjy", "31'inji"],
  'tr': ["0'ıncı", "1'inci", "2'nci", "3'üncü", "4'üncü", "5'inci", "6'ncı", "7'nci", "8'inci", "9'uncu", "10'uncu", "11'inci", "12'nci", "13'üncü", "14'üncü", "15'inci", "16'ncı", "17'nci", "18'inci", "19'uncu", "20'nci", "21'inci", "22'nci", "23'üncü", "24'üncü", "25'inci", "26'ncı", "27'nci", "28'inci", "29'uncu", "30'uncu", "31'inci"],
  'tzm': 1, 'ug-cn': 1, 'uk': 1, 'ur': 1, 'uz': 1, 'vi': 1,
  'yo': ['ọjọ́ 0', 'ọjọ́ 1', 'ọjọ́ 2', 'ọjọ́ 3', 'ọjọ́ 4', 'ọjọ́ 5', 'ọjọ́ 6', 'ọjọ́ 7', 'ọjọ́ 8', 'ọjọ́ 9', 'ọjọ́ 10', 'ọjọ́ 11', 'ọjọ́ 12', 'ọjọ́ 13', 'ọjọ́ 14', 'ọjọ́ 15', 'ọjọ́ 16', 'ọjọ́ 17', 'ọjọ́ 18', 'ọjọ́ 19', 'ọjọ́ 20', 'ọjọ́ 21', 'ọjọ́ 22', 'ọjọ́ 23', 'ọjọ́ 24', 'ọjọ́ 25', 'ọjọ́ 26', 'ọjọ́ 27', 'ọjọ́ 28', 'ọjọ́ 29', 'ọjọ́ 30', 'ọjọ́ 31'],
  'zh': 1
};

export function getOrdinals(locale: string | string[]): string[] {
  const ords = getLocaleResource<string[] | number>(locale, ordinals);
  let result: string[];

  if (isNumber(ords)) {
    result = [];

    for (let i = 0; i <= 31; ++i) // noinspection SpellCheckingInspection
      result.push(i + (' .aº\u0645η'.substr(ords - 1, 1).trim()));
  }
  else if (!ords)
    result = ordinals.en;
  else
    result = ords;

  return result;
}
