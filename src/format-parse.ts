import { DateAndTime } from './common';
import { DateTime } from './date-time';
import { abs, floor } from '@tubular/math';
import { ILocale } from './i-locale';
import { flatten, isArray, isEqual, isString, last, toNumber } from '@tubular/util';
import { getEras, getMeridiems, getMinDaysInWeek, getOrdinals, getStartOfWeek, getWeekend, normalizeLocale } from './locale-data';
import { Timezone } from './timezone';
import DateTimeFormatOptions = Intl.DateTimeFormatOptions;

let hasIntlDateTime = false;

try {
  hasIntlDateTime = typeof Intl !== 'undefined' && !!Intl?.DateTimeFormat;
}
catch {}

const shortOpts = { Y: 'year', M: 'month', D: 'day', w: 'weekday', h: 'hour', m: 'minute', s: 'second', z: 'timeZoneName',
                    ds: 'dateStyle', ts: 'timeStyle' };
const shortOptValues = { f: 'full', m: 'medium', n: 'narrow', s: 'short', l: 'long', dd: '2-digit', d: 'numeric' };
const styleOptValues = { F: 'full', L: 'long', M: 'medium', S: 'short' };
const patternsMoment = /({[A-Za-z0-9/_]+?!?}|V|v|R|r|I[FLMSx][FLMS]?|MMMM|MMM|MM|Mo|M|Qo|Q|DDDD|DDD|Do|DD|D|dddd|ddd|do|dd|d|e|E|ww|wo|w|WW|Wo|W|YYYYYY|yyyyyy|YYYY|yyyy|YY|yy|Y|y|N{1,5}|n|gggg|gg|GGGG|GG|A|a|HH|H|hh|h|kk|k|mm|m|ss|s|LTS|LT|LLLL|llll|LLL|lll|LL|ll|L|l|S+|ZZZ|zzz|ZZ|zz|Z|z|X|x)/g;
const cachedLocales: Record<string, ILocale> = {};

function formatEscape(s: string): string {
  let result = '';
  let inAlpha = false;

  s.split('').forEach(c => {
    if (/[a-z[]/i.test(c)) {
      if (!inAlpha) {
        inAlpha = true;
        result += '[';
      }
    }
    else if (inAlpha && c.trim().length > 0 && c.charCodeAt(0) < 128) {
      inAlpha = false;
      result += ']';
      result = result.replace(/(\s+)]$/, ']$1');
    }

    result += c;
  });

  if (inAlpha) {
    result += ']';
    result = result.replace(/(\s+)]$/, ']$1');
  }

  return result;
}

export function decomposeFormatString(format: string): string[] {
  const parts: (string | string[])[] = [];
  let inLiteral = true;
  let inBraces = false;
  let literal = '';
  let token = '';

  for (const ch of format.split('')) {
    if (/[a-z]/i.test(ch) || (inBraces && ch === '[')) {
      if (inBraces)
        literal += ch;
      else if (inLiteral) {
        parts.push(literal);
        literal = '';
        token = ch;
        inLiteral = false;
      }
      else
        token += ch;
    }
    else if (ch === '[') {
      inBraces = true;

      if (!inLiteral) {
        parts.push(token);
        token = '';
        inLiteral = true;
      }
    }
    else if (inBraces && ch === ']')
      inBraces = false;
    else {
      if (!inLiteral) {
        parts.push(token);
        token = '';
        inLiteral = true;
      }

      literal += ch;
    }
  }

  if ((inLiteral && literal) || (!inLiteral && token))
    parts.push(literal || token);

  for (let i = 1; i < parts.length; i += 2) {
    parts[i] = (parts[i] as string).split(patternsMoment);
  }

  parts.forEach((part, index) => {
    if (index % 2 === 0)
      return;

    if (part.length === 3 && !part[0] && !part[2])
      parts[index] = part[1];
    else {
      parts[index - 1] += part[0];
      parts[index + 1] = last(part as string[]) + (parts[index + 1] ?? '');
      parts[index] = part.slice(1, part.length - 1);
    }
  });

  return flatten(parts) as string[];
}

function isLetter(char: string, checkDot = false): boolean {
  return (checkDot && char === '.') ||
    // eslint-disable-next-line no-misleading-character-class -- Deliberately including combining diacritical marks
    /^[A-Za-zÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ\u0300-\u036FΑ-ΡΣ-ϔА-ҀҊ-ԯ\u05D0-\u05E9\u0620-\u065F\u066E-\u066F\u0671-\u06D3\u06D5\u06E5-\u06E6\u06EE-\u06EF\u06FA-\u06FC\u06FFऄ-\u0939\u0F00-\u0F14\u0F40-\u0FBC\u1000-\u103F]/.test(char);
}

function isCased(s: string): boolean {
  return s.toLowerCase() !== s.toUpperCase();
}

export function format(dt: DateTime, fmt: string, localeOverride?: string | string[]): string {
  if (!dt.valid)
    return '##Invalid_Date##';

  const localeNames = !hasIntlDateTime ? 'en' : normalizeLocale(localeOverride ?? dt.locale);
  const locale = getLocaleInfo(localeNames);
  const zeroAdj = locale.zeroDigit.charCodeAt(0) - 48;
  const toNum = (n: number | string, pad = 1) => n.toString().padStart(pad, '0')
    .replace(/\d/g, ch => String.fromCharCode(ch.charCodeAt(0) + zeroAdj));
  const parts = decomposeFormatString(fmt);
  const result: string[] = [];
  const wt = dt.wallTime;
  const year = wt.y;
  const eraYear = abs(year) + (year <= 0 ? 1 : 0);
  const month = wt.m;
  const quarter = floor((month + 2) / 3);
  const day = wt.d;
  const hour = wt.hrs;
  const h = (hour === 0 ? 12 : hour <= 12 ? hour : hour - 12);
  const K = (hour < 12 ? hour : hour - 12);
  const k = (hour === 0 ? 24 : hour);
  const min = wt.min;
  const sec = wt.sec;
  const dayOfWeek = dt.getDayOfWeek();
  let isoWeek = !parts.find((value, index) => index % 2 === 1 && /ww?/.test(value));

  for (let i = 0; i < parts.length; i += 2) {
    result.push(parts[i]);
    const field = parts[i + 1];

    if (field == null)
      break;

    if (/^[LlZzI]/.test(field) && locale.cachedTimezone !== dt.timezone.zoneName || (hasIntlDateTime && isEqual(locale.dateTimeFormats, {})))
      generatePredefinedFormats(locale, dt.timezone.zoneName);

    switch (field) {
      case 'YYYYYY': // long year, always signed
      case 'yyyyyy':
        result.push((year < 0 ? '-' : '+') + toNum(abs(year), 6));
        break;

      case 'YYYY': // year, padded to at least 4 digits, signed if negative or > 9999
      case 'yyyy':
      case 'Y':
        result.push((year < 0 ? '-' : year <= 9999 ? '' : '+') + toNum(abs(year), 4));
        break;

      case 'YY': // 2-digit year
      case 'yy':
        result.push(toNum(abs(year) % 100, 2));
        break;

      case 'y': // Era year, never signed, min value 1.
        result.push(toNum(eraYear));
        break;

      case 'Qo': // Quarter ordinal
        result.push(locale.ordinals[quarter]);
        break;

      case 'Q': // Quarter
        result.push(toNum(quarter));
        break;

      case 'MMMM': // Long textual month
        result.push(locale.months[month - 1]);
        break;

      case 'MMM': // Short textual month
        result.push(locale.monthsShort[month - 1]);
        break;

      case 'MM': // 2-digit month
        result.push(toNum(month, 2));
        break;

      case 'Mo': // Month ordinal
        result.push(locale.ordinals[month]);
        break;

      case 'M': // Numerical month
        result.push(toNum(month));
        break;

      case 'Wo': // ISO week ordinal
        result.push(locale.ordinals[wt.w]);
        isoWeek = true;
        break;

      case 'WW': // ISO week number
      case 'W':
        result.push(toNum(wt.w, field === 'WW' ? 2 : 1));
        isoWeek = true;
        break;

      case 'wo': // Locale week ordinal
        result.push(locale.ordinals[wt.wl]);
        isoWeek = false;
        break;

      case 'ww': // Locale week number
      case 'w':
        result.push(toNum(wt.wl, field === 'ww' ? 2 : 1));
        isoWeek = false;
        break;

      case 'DD': // 2-digit day of month
        result.push(toNum(day, 2));
        break;

      case 'Do': // Day-of-month ordinal
        result.push(locale.ordinals[day]);
        break;

      case 'D': // Day-of-month number
        result.push(toNum(day));
        break;

      case 'dddd': // Long textual day of week
        result.push(locale.weekdays[dayOfWeek]);
        break;

      case 'ddd': // Short textual day of week
        result.push(locale.weekdaysShort[dayOfWeek]);
        break;

      case 'dd': // Minimal textual day of week
        result.push(locale.weekdaysMin[dayOfWeek]);
        break;

      case 'do': // Day-of-week ordinal
        result.push(locale.ordinals[isoWeek ? wt.dw : wt.dwl]);
        break;

      case 'd': // Day-of-week number
        result.push(toNum(isoWeek ? wt.dw : wt.dwl));
        break;

      case 'HH': // Two-digit 0-23 hour
        result.push(toNum(hour, 2));
        break;

      case 'H': // Numeric 0-23 hour
        result.push(toNum(hour));
        break;

      case 'hh': // Two-digit 1-12 hour
        result.push(toNum(h, 2));
        break;

      case 'h':// Numeric 1-12 hour
        result.push(toNum(h));
        break;

      case 'KK': // Two-digit 0-11 hour (needs AM/PM qualification)
        result.push(toNum(K, 2));
        break;

      case 'K': // Numeric 0-11 hour (needs AM/PM qualification)
        result.push(toNum(K));
        break;

      case 'kk': // Two-digit 1-24 hour
        result.push(toNum(k, 2));
        break;

      case 'k': // Numeric 1-24 hour
        result.push(toNum(k));
        break;

      case 'mm': // Two-digit minute
        result.push(toNum(min, 2));
        break;

      case 'm': // Numeric minute
        result.push(toNum(min));
        break;

      case 'ss': // Two-digit second
        result.push(toNum(sec, 2));
        break;

      case 's': // Numeric second
        result.push(toNum(sec));
        break;

      case 'A': // AM/PM indicator (may have more than just two forms)
      case 'a':
        {
          const values = locale.meridiem;
          const dayPartsForHour = values[values.length === 2 ? floor(hour / 12) : hour];

          // If there is no case distinction between the first two forms, use the first form
          // (the rest are there for parsing, not formatting).
          if (dayPartsForHour.length === 1 ||
              (!isCased(dayPartsForHour[0]) && !isCased(dayPartsForHour[0])))
            result.push(dayPartsForHour[0]);
          else
            result.push(dayPartsForHour[field === 'A' && dayPartsForHour.length > 1 ? 1 : 0]);
        }
        break;

      case 'X': // Epoch 1970-01-01 00:00 UTC seconds
        result.push(floor(dt.utcTimeMillis / 1000).toString());
        break;

      case 'x': // Epoch 1970-01-01 00:00 UTC milliseconds
        result.push(dt.utcTimeMillis.toString());
        break;

      case 'LLLL': // Various Moment.js-style shorthand date/time formats
      case 'llll':
      case 'LLL':
      case 'lll':
      case 'LTS':
      case 'LT':
      case 'LL':
      case 'll':
      case 'L':
      case 'l':
        {
          const localeFormat = locale.dateTimeFormats[field];

          if (localeFormat == null)
            result.push('???');
          else if (isString(localeFormat))
            result.push(format(dt, localeFormat));
          else
            result.push(localeFormat.format(dt.utcTimeMillis));
        }
        break;

      case 'ZZZ': // As IANA zone name, if possible
        if (dt.timezone.zoneName !== 'OS') {
          result.push(dt.timezone.zoneName);
          break;
        }
        else if (hasIntlDateTime) {
          result.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'zzz':  // As long zone name (e.g. "Pacific Daylight Time"), if possible
        if (hasIntlDateTime && locale.dateTimeFormats.Z instanceof Intl.DateTimeFormat) {
          result.push(getDatePart(locale.dateTimeFormats.Z, dt.utcTimeMillis, 'timeZoneName'));
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'zz':  // As zone acronym (e.g. EST, PDT, AEST), if possible
      case 'z':
        if (hasIntlDateTime && locale.dateTimeFormats.z instanceof Intl.DateTimeFormat) {
          result.push(getDatePart(locale.dateTimeFormats.z, dt.utcTimeMillis, 'timeZoneName'));
          break;
        }
        else if (dt.timezone.zoneName !== 'OS') {
          result.push(dt.timezone.zoneName);
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'ZZ': // Zone as UTC offset
      case 'Z':
        result.push(dt.timezone.getFormattedOffset(dt.utcTimeMillis, field === 'ZZ'));
        break;

      case 'V':
      case 'v':
        result.push(Timezone.getDstSymbol(wt.dstOffset) + (wt.dstOffset === 0 && field === 'V' ? ' ' : ''));
        break;

      case 'R':
      case 'r':
        result.push(wt.occurrence === 2 ? '\u2082' : field === 'R' ? ' ' : ''); // Subscript 2
        break;

      case 'n':
        if (year < 1)
          result.push(locale.eras[0]);
        else if (result.length > 0 && last(result).endsWith(' '))
          result[result.length - 1] = last(result).trimEnd();
        break;

      default:
        if (field.startsWith('N'))
          result.push(locale.eras[year < 1 ? 0 : 1]);
        else if (field.startsWith('I')) {
          if (hasIntlDateTime) {
            let intlFormat = locale.dateTimeFormats[field] as Intl.DateTimeFormat;

            if (!intlFormat) {
              const options: Intl.DateTimeFormatOptions = { calendar: 'gregory' };
              const zone = convertDigits(dt.timezone.zoneName);

              if (/^UT[-+]\d\d(?::?00)/.test(zone))
                options.timeZone = 'Etc/GMT' + (zone.charAt(2) === '-' ? '+' : '-') + toNumber(zone.substr(3));
              else if (zone !== 'OS')
                options.timeZone = (zone === 'UT' ? 'UTC' : zone);

              if (field.charAt(1) !== 'x')
                options.dateStyle = styleOptValues[field.charAt(1)];

              if (field.length > 2)
                options.timeStyle = styleOptValues[field.charAt(2)];

              try {
                locale.dateTimeFormats[field] = intlFormat = new Intl.DateTimeFormat(localeNames, options);
              }
              catch {
                console.warn('Timezone "%s" not recognized', options.timeZone);
                delete options.timeZone;
                locale.dateTimeFormats[field] = intlFormat = new Intl.DateTimeFormat(localeNames, options);
              }
            }

            result.push(intlFormat.format(dt.utcTimeMillis));
          }
          else {
            let intlFormat = '';

            switch (field.charAt(1)) {
              case 'F': intlFormat = 'dddd, MMMM D, YYYY'; break;
              case 'L': intlFormat = 'MMMM D, YYYY'; break;
              case 'M': intlFormat = 'MMM D, YYYY'; break;
              case 'S': intlFormat = 'M/D/YY'; break;
            }

            if (intlFormat && /..[FLMS]/.test(field))
              intlFormat += ', ';

            switch (field.charAt(2)) {
              case 'F':
              case 'L': intlFormat += 'h:mm:ss A zz'; break;
              case 'M': intlFormat += 'h:mm:ss A'; break;
              case 'S': intlFormat += 'h:mm A'; break;
            }

            result.push(format(dt, intlFormat));
          }
        }
        else if (field.startsWith('S'))
          result.push(toNum(wt.millis.toString().padStart(3, '0').substr(0, field.length), field.length));
        else
          result.push('??');
    }
  }

  return result.join('');
}

function getDatePart(format: Intl.DateTimeFormat, date: number, partName: string): string {
  const parts = format.formatToParts(date);
  const part = parts.find(part => part.type === partName);

  if (part)
    return part.value;
  else
    return '???';
}

function quickFormat(localeNames: string | string[], timezone: string, opts: any) {
  const options: Intl.DateTimeFormatOptions = { calendar: 'gregory' };

  localeNames = normalizeLocale(localeNames);

  if (/^UT[-+]\d\d(?::?00)/.test(timezone))
    options.timeZone = 'Etc/GMT' + (timezone.charAt(2) === '-' ? '+' : '-') + toNumber(timezone.substr(3));
  else if (timezone === 'DATELESS' || timezone === 'ZONELESS')
    options.timeZone = 'UTC';
  else if (timezone !== 'OS')
    options.timeZone = (timezone === 'UT' ? 'UTC' : timezone);

  Object.keys(opts).forEach(key => {
    const value = shortOptValues[opts[key]] ?? opts[key];
    key = shortOpts[key];
    options[key] = value;
  });

  return new Intl.DateTimeFormat(localeNames, options);
}

// Find the shortest case-insensitive version of each string in the array that doesn't match
// the starting characters of any other item in the array.
function shortenItems(items: string[]): string[] {
  items = items.map(item => item.toLowerCase().replace(/\u0307/g, ''));

  for (let i = 0; i < items.length; ++i) {
    for (let j = 1; j < items[i].length; ++j) {
      const item = items[i].substr(0, j);
      let matched = false;

      for (let k = 0; k < items.length && !matched; ++k)
        matched = (k !== i && items[k].startsWith(item));

      if (!matched) {
        items[i] = item;
        break;
      }
    }
  }

  return items;
}

function getLocaleInfo(localeNames: string | string[]): ILocale {
  const joinedNames = isArray(localeNames) ? localeNames.join(',') : localeNames;
  const locale: ILocale = cachedLocales[joinedNames] ?? {} as ILocale;

  if (locale && Object.keys(locale).length > 0)
    return locale;

  const fmt = (opts: any) => quickFormat(localeNames, 'UTC', opts);

  locale.name = isArray(localeNames) ? localeNames.join(',') : localeNames;

  if (hasIntlDateTime) {
    locale.months = [];
    locale.monthsShort = [];
    const narrow: string[] = [];

    for (let month = 1; month <= 12; ++month) {
      const date = Date.UTC(2021, month - 1, 1);
      let format = fmt({ ds: 'l' });

      locale.months.push(getDatePart(format, date, 'month'));
      format = fmt({ M: 's' });
      locale.monthsShort.push(getDatePart(format, date, 'month'));
      format = fmt({ M: 'n' });
      narrow.push(getDatePart(format, date, 'month'));
    }

    if (isEqual(locale.months, locale.monthsShort) && new Set(narrow).size === 12)
      locale.monthsShort = narrow;

    locale.monthsMin = shortenItems(locale.months);
    locale.monthsShortMin = shortenItems(locale.monthsShort);

    locale.weekdays = [];
    locale.weekdaysShort = [];
    locale.weekdaysMin = [];

    for (let day = 3; day <= 9; ++day) {
      const date = Date.UTC(2021, 0, day);
      let format = fmt({ ds: 'f' });

      locale.weekdays.push(getDatePart(format, date, 'weekday'));
      format = fmt({ w: 's' });
      locale.weekdaysShort.push(getDatePart(format, date, 'weekday'));
      format = fmt({ w: 'n' });
      locale.weekdaysMin.push(getDatePart(format, date, 'weekday'));
    }

    // If weekdaysMin are so narrow that there are non-unique names, try either 2 or 3 characters from weekdaysShort.
    for (let len = 2; len < 4 && new Set(locale.weekdaysMin).size < 7; ++len)
      locale.weekdaysMin = locale.weekdaysShort.map(name => name.substr(0, len));

    locale.zeroDigit = fmt({ m: 'd' }).format(0);
  }
  else {
    locale.months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    locale.monthsMin = shortenItems(locale.months);
    locale.monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    locale.monthsShortMin = shortenItems(locale.monthsShort);
    locale.weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    locale.weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    locale.weekdaysMin = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    locale.zeroDigit = '0';
  }

  locale.dateTimeFormats = {};
  locale.meridiem = getMeridiems(localeNames);
  locale.startOfWeek = getStartOfWeek(localeNames);
  locale.minDaysInWeek = getMinDaysInWeek(localeNames);
  locale.weekend = getWeekend(localeNames);
  locale.eras = getEras(localeNames);
  locale.ordinals = getOrdinals(localeNames);
  locale.parsePatterns = {};

  cachedLocales[joinedNames] = locale;

  return locale;
}

function generatePredefinedFormats(locale: ILocale, timezone: string): void {
  const fmt = (opts: any) => quickFormat(locale.name, timezone, opts);

  locale.cachedTimezone = timezone;
  locale.dateTimeFormats = {};

  if (hasIntlDateTime) {
    locale.dateTimeFormats.LLLL = fmt({ Y: 'd', M: 'l', D: 'd', w: 'l', h: 'd', m: 'dd' }); // Thursday, September 4, 1986 8:30 PM
    locale.dateTimeFormats.llll = fmt({ Y: 'd', M: 's', D: 'd', w: 's', h: 'd', m: 'dd' }); // Thu, Sep 4, 1986 8:30 PM
    locale.dateTimeFormats.LLL = fmt({ Y: 'd', M: 's', D: 'd', h: 'd', m: 'dd' }); // September 4, 1986 8:30 PM
    locale.dateTimeFormats.lll = fmt({ Y: 'd', M: 's', D: 'd', h: 'd', m: 'dd' }); // Sep 4, 1986 8:30 PM
    locale.dateTimeFormats.LTS = fmt({ h: 'd', m: 'dd', s: 'dd' }); // 8:30:25 PM
    locale.dateTimeFormats.LT = fmt({ h: 'd', m: 'dd' }); // 8:30 PM
    locale.dateTimeFormats.LL = fmt({ Y: 'd', M: 's', D: 'd' }); // September 4, 1986
    locale.dateTimeFormats.ll = fmt({ Y: 'd', M: 's', D: 'd' }); // Sep 4, 1986
    locale.dateTimeFormats.L = fmt({ Y: 'd', M: 'dd', D: 'dd' }); // 09/04/1986
    locale.dateTimeFormats.l = fmt({ Y: 'd', M: 'd', D: 'd' }); // 9/4/1986
    locale.dateTimeFormats.Z = fmt({ z: 'l', Y: 'd' }); // Don't really want the year, but without *something* else
    locale.dateTimeFormats.z = fmt({ z: 's', Y: 'd' }); //   a whole date appears, and just a year is easier to remove.
  }
  else {
    locale.dateTimeFormats.LLLL = 'dddd, MMMM D, YYYY h:mm A'; // Thursday, September 4, 1986 8:30 PM
    locale.dateTimeFormats.llll = 'ddd, MMM D, YYYY h:mm A'; // Thu, Sep 4, 1986 8:30 PM
    locale.dateTimeFormats.LLL = 'MMMM D, YYYY h:mm A'; // September 4, 1986 8:30 PM
    locale.dateTimeFormats.lll = 'MMM D, YYYY h:mm A'; // Sep 4, 1986 8:30 PM
    locale.dateTimeFormats.LTS = 'h:mm:ss A'; // 8:30:25 PM
    locale.dateTimeFormats.LT = 'h:mm A'; // 8:30 PM
    locale.dateTimeFormats.LL = 'MMMM D, YYYY'; // September 4, 1986
    locale.dateTimeFormats.ll = 'MMM D, YYYY'; // Sep 4, 1986
    locale.dateTimeFormats.L = 'MM/DD/YYYY'; // 09/04/1986
    locale.dateTimeFormats.l = 'M/D/YYYY'; // 9/4/1986
  }
}

function convertDigits(n: string): string {
  return n.replace(/[\u0660-\u0669]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0630)) // Arabic digits
    .replace(/[\u06F0-\u06F9]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x06C0)) // Urdu/Persian digits
    .replace(/[\u0966-\u096F]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0936)) // Devanagari digits
    .replace(/[\u09E6-\u09EF]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x09B6)) // Bengali digits
    .replace(/[\u0F20-\u0F29]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0EF0)) // Tibetan digits
    .replace(/[\u1040-\u1049]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x1010)); // Myanmar digits
}

export function analyzeFormat(locale: string | string[], dateStyle: string, timeStyle?: string): string {
  const options: DateTimeFormatOptions = { timeZone: 'UTC', calendar: 'gregory' };

  if (dateStyle)
    options.dateStyle = dateStyle;

  if (timeStyle)
    options.timeStyle = timeStyle;

  const sampleDate = Date.UTC(2233, 3 /* 4 */, 5, 6, 7, 8);
  const format = new Intl.DateTimeFormat(locale, options);
  const parts = format.formatToParts(sampleDate);
  const dateLong = (dateStyle === 'full' || dateStyle === 'long');
  const timeLong = (timeStyle === 'full' || timeStyle === 'long');
  let formatString = '';

  parts.forEach(part => {
    const value = part.value = convertDigits(part.value);
    const len = value.length;

    switch (part.type) {
      case 'day':
        formatString += 'DD'.substring(0, len);
        break;

      case 'dayPeriod':
        formatString += 'A';
        break;

      case 'hour':
        formatString += ({ h11: 'KK', h12: 'hh', h23: 'HH', h24: 'kk' }
          [format.resolvedOptions().hourCycle ?? 'h23'] ?? 'HH').substr(0, len);
        break;

      case 'literal':
        formatString += formatEscape(value);
        break;

      case 'minute':
        formatString += 'mm'.substring(0, len);
        break;

      case 'month':
        if (/^\d+$/.test(value))
          formatString += 'MM'.substring(0, len);
        else
          formatString += (dateLong ? 'MMMM' : 'MMM');
        break;

      case 'second':
        formatString += 'ss'.substring(0, len);
        break;

      case 'timeZoneName':
        formatString += (timeLong ? 'zzz' : 'z');
        break;

      case 'weekday':
        formatString += (dateLong ? 'dddd' : dateStyle === 'medium' ? 'ddd' : 'dd');
        break;

      case 'year':
        formatString += (len < 3 ? 'YY' : 'YYYY');
        break;
    }
  });

  return formatString;
}

function validateField(name: string, value: number, min: number, max: number): void {
  if (value < min || value > max)
    throw new Error(`${name} value (${value}) out of range [${min}, ${max}]`);
}

function matchAmPm(locale: ILocale, input: string): [boolean, number] {
  if (!locale.meridiem)
    return [false, 0];

  input = input.toLowerCase().replace(/\xA0/g, ' ');

  for (const meridiem of [locale.meridiem, [['am', 'a.m.', 'a. m.'], ['pm', 'p.m.', 'p. m.']]]) {
    for (let i = 0; i < meridiem.length; ++i) {
      const forms = meridiem[i];
      const isPM = (i > 11 || (meridiem.length === 2 && i > 0));

      for (const form of forms) {
        if (input.startsWith(form.toLowerCase()))
          return [isPM, form.length];
      }
    }
  }

  return [false, 0];
}

function matchMonth(locale: ILocale, input: string): [number, number] {
  if (!locale.monthsMin || !locale.monthsShortMin)
    return [0, 0];

  input = input.toLowerCase().replace(/\u0307/g, '');

  for (const months of [locale.monthsMin, locale.monthsShortMin]) {
    let maxLen = 0;
    let month = 0;

    for (let i = 0; i < 12; ++i) {
      const MMM = convertDigits(months[i]);

      if (MMM.length > maxLen && input.startsWith(MMM)) {
        maxLen = MMM.length;
        month = i + 1;
      }
    }

    if (maxLen > 0) {
      // eslint-disable-next-line no-unmodified-loop-condition
      while (isLetter(input.charAt(maxLen), true)) ++maxLen;
      return [month, maxLen];
    }
  }

  return [0, 0];
}

function skipDayOfWeek(locale: ILocale, input: string): number {
  if (!locale.weekdays || !locale.weekdaysShort || !locale.weekdaysMin)
    return 0;

  input = input.toLowerCase();

  for (const days of [locale.weekdays, locale.weekdaysShort, locale.weekdaysMin]) {
    let maxLen = 0;

    for (let i = 0; i < 7; ++i) {
      const dd = days[i].toLowerCase();

      if (dd.length > maxLen && input.startsWith(dd))
        maxLen = dd.length;
    }

    if (maxLen > 0) {
      // eslint-disable-next-line no-unmodified-loop-condition
      while (isLetter(input.charAt(maxLen), true)) ++maxLen;
      return maxLen;
    }
  }

  return 0;
}

export function parse(input: string, format: string, zone?: Timezone | string, locales?: string | string[]): DateTime {
  input = convertDigits(input.trim()).replace(/\u200F/g, '');
  format = format.trim().replace(/\u200F/g, '');
  locales = !hasIntlDateTime ? 'en' : normalizeLocale(locales ?? DateTime.getDefaultLocale());

  if (isString(zone))
    zone = Timezone.from(zone);

  const locale = getLocaleInfo(locales);
  const $ = /^(I[FLMSx][FLMS]?)/.exec(format);

  if ($ && $[1] !== 'Ix') {
    const key = $[1];
    const styles = { F: 'full', L: 'long', M: 'medium', S: 'short' };
    format = locale.parsePatterns[key];

    if (!format) {
      format = analyzeFormat(locales, styles[key.charAt(1)], styles[key.charAt(2)]);

      if (!format)
        return DateTime.INVALID_DATE;

      format = format.replace(/\u200F/g, '');
      locale.parsePatterns[key] = format;
    }
  }

  const w = {} as DateAndTime;
  const parts = decomposeFormatString(format);
  let pm: boolean = null;
  let pos: number;
  let trimmed: boolean;

  for (let i = 0; i < parts.length; ++i) {
    let part = parts[i];
    const nextPart = parts[i + 1];

    if (i % 2 === 0) {
      part = part.trim();
      // noinspection JSNonASCIINames,NonAsciiCharacters
      const altPart = { de: 'd’', 'd’': 'de' }[part];

      if (input.startsWith(part))
        input = input.substr(part.length).trimLeft();
      else if (altPart && input.startsWith(altPart))
        input = input.substr(altPart.length).trimLeft();

      // Exact in-between text wasn't matched, but if the next thing coming up is a numeric field,
      // just skip over the text being parsed until the next digit is found.
      if (i < parts.length - 1 &&
        (nextPart.toLowerCase().startsWith('y') || (nextPart.length < 3 && /^[MDHhKkmsS]/.test(nextPart)))) {
        const $ = /^\D*(?=\d)/.exec(input);

        if ($)
          input = input.substr($[0].length);
        else if (!/^s/i.test(nextPart))
          throw new Error(`Match for "${nextPart}" field not found`);
      }

      continue;
    }

    if (part.endsWith('o'))
      throw new Error('Parsing of ordinal forms is not supported');

    if (part === 'd' || part.toLowerCase() === 'w')
      throw new Error('Parsing of week-of-year/day-of-week only supported for ISO-8601 dates');

    const firstChar = part.substr(0, 1);
    let newValueText = (/^([-+]?\d+)/.exec(input) ?? [])[1];
    let newValue = toNumber(newValueText);
    let handled = false;

    if (newValueText != null && part.length < 3 || firstChar.toLowerCase() === 'y') {
      handled = true;

      switch (firstChar) {
        case 'Y':
        case 'y':
        // TODO: Era handling
          if (part.toLowerCase() === 'yy') {
            const base = DateTime.getDefaultCenturyBase();
            w.y = newValue - base % 100 + base + (newValue < base % 100 ? 100 : 0);
          }
          else
            w.y = newValue;

          break;

        case 'M':
          validateField('month', newValue, 1, 12);
          w.m = newValue;
          break;

        case 'D':
          validateField('date', newValue, 1, 31);
          w.d = newValue;
          break;

        case 'H':
          validateField('hour-24', newValue, 0, 23);
          w.hrs = newValue;
          break;

        case 'h':
          validateField('hour-12', newValue, 1, 12);

          if (pm == null)
            w.hrs = newValue;
          else if (pm)
            w.hrs = newValue === 12 ? 12 : newValue + 12;
          else
            w.hrs = newValue === 12 ? 0 : newValue;
          break;

        case 'm':
          validateField('minute', newValue, 0, 59);
          w.min = newValue;
          break;

        case 's':
          validateField('second', newValue, 0, 59);
          w.sec = newValue;
          break;

        case 'S':
          newValueText = newValueText.padEnd(3, '0').substr(0, 3);
          newValue = toNumber(newValueText);
          validateField('millisecond', newValue, 0, 999);
          w.millis = newValue;
          break;

        default:
          handled = false;
      }
    }

    if (handled) {
      input = input.substr(newValueText?.length ?? 0).trimLeft();
      continue;
    }

    switch (firstChar) {
      case 'A':
      case 'a':
        {
          const [isPM, length] = matchAmPm(locale, input);

          if (length > 0) {
            handled = true;
            pm = isPM;
            input = input.substr(length).trimLeft();

            if (w.hrs != null && pm && w.hrs !== 12)
              w.hrs += 12;
            else if (w.hrs != null && !pm && w.hrs === 12)
              w.hrs = 0;
          }
        }
        break;

      case 'M':
        {
          const [month, length] = matchMonth(locale, input);

          if (month > 0) {
            handled = true;
            input = input.substr(length).trimLeft();
            w.m = month;
          }
        }
        break;

      case 'd':
        {
          const length = skipDayOfWeek(locale, input);

          if (length > 0) {
            handled = true;
            input = input.substr(length).trimLeft();
          }
        }
        break;

      case 'Z':
      case 'z':
        // Ignore value of zone for now
        // This is very hard to match when in comes before other parts of the time, especially (as with
        // Vietnamese) there's no clear delimiter between the zone name and subsequent text.
        trimmed = false;

        if (locale.name.startsWith('vi')) {
          if ((pos = input.toLowerCase().indexOf('tế')) >= 0) {
            input = input.substr(pos + 2).trimStart();
            trimmed = true;
          }
          else if ((pos = (/\s(chủ|thứ)\s/.exec(input.toLowerCase()) ?? { index: -1 }).index) >= 0)  {
            input = input.substr(pos + 1);
            trimmed = true;
          }
        }
        else if (locale.name.startsWith('zh')) {
          if ((pos = input.toLowerCase().indexOf(' ')) >= 0) {
            input = input.substr(pos).trimStart();
            trimmed = true;
          }
        }

        if (!trimmed && nextPart?.trim()) {
          pos = input.toLowerCase().indexOf(nextPart);

          if (pos >= 0)
            input = input.substr(pos).trimStart();
          else
            input = input.replace(/^[^,]+/, '');
        }

        handled = true;
        break;
    }

    if (!handled) {
      if (firstChar === 's')
        w.sec = 0;
      else if (firstChar === 'S')
        w.millis = 0;
      else
        throw new Error(`Match for "${part}" field not found`);
    }
  }

  if (w.y == null) {
    zone = Timezone.DATELESS;
    w.y = 1970;
    w.m = 1;
    w.d = 1;
  }

  return new DateTime(w, zone, locales);
}
