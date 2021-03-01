import { convertDigits, DateAndTime, getDatePart, getDateValue, parseTimeOffset } from './common';
import { DateTime } from './date-time';
import { abs, floor, mod } from '@tubular/math';
import { ILocale } from './i-locale';
import { flatten, isArray, isEqual, isNumber, isString, last, toNumber } from '@tubular/util';
import {
  checkDtfOptions, getMeridiems, getMinDaysInWeek, getOrdinals, getStartOfWeek, getWeekend,
  hasIntlDateTime, normalizeLocale
} from './locale-data';
import { Timezone } from './timezone';
import DateTimeFormat = Intl.DateTimeFormat;
import DateTimeFormatOptions = Intl.DateTimeFormatOptions;

const shortOpts = { Y: 'year', M: 'month', D: 'day', w: 'weekday', h: 'hour', m: 'minute', s: 'second', z: 'timeZoneName',
                    ds: 'dateStyle', ts: 'timeStyle', e: 'era' };
const shortOptValues = { f: 'full', m: 'medium', n: 'narrow', s: 'short', l: 'long', dd: '2-digit', d: 'numeric' };
const styleOptValues = { F: 'full', L: 'long', M: 'medium', S: 'short' };
const patternsMoment = /({[A-Za-z0-9/_]+?!?}|V|v|R|r|I[FLMSx][FLMS]?|MMMM|MMM|MM|Mo|M|Qo|Q|DDDD|DDD|Do|DD|D|dddd|ddd|do|dd|d|E|e|ww|wo|w|WW|Wo|W|YYYYYY|yyyyyy|YYYY|yyyy|YY|yy|Y|y|N{1,5}|n|gggg|gg|GGGG|GG|A|a|HH|H|hh|h|kk|k|mm|m|ss|s|LTS|LT|LLLL|llll|LLL|lll|LL|ll|L|l|S+|ZZZ|zzz|ZZ|zz|Z|z|X|x)/g;
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

  for (let i = 1; i < parts.length; i += 2)
    parts[i] = (parts[i] as string).split(patternsMoment);

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
  // This custom test works out better than the \p{L} character class for parsing purposes here.
  return (checkDot && char === '.') ||
    // eslint-disable-next-line no-misleading-character-class -- Deliberately including combining diacritical marks
    /^[A-Za-zÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ\u0300-\u036FΑ-ΡΣ-ϔА-ҀҊ-ԯ\u05D0-\u05E9\u0620-\u065F\u066E-\u066F\u0671-\u06D3\u06D5\u06E5-\u06E6\u06EE-\u06EF\u06FA-\u06FC\u06FF\u0904-\u0939\u0F00-\u0F14\u0F40-\u0FBC\u1000-\u103F]/.test(char);
}

function isCased(s: string): boolean {
  return s.toLowerCase() !== s.toUpperCase();
}

function timeMatch(dt: DateTime, locale: ILocale): boolean {
  const format = locale.dateTimeFormats.check as DateTimeFormat;

  if (!format)
    return false;

  const fields = format.formatToParts(dt.utcTimeMillis);
  const wt = dt.wallTime;

  return wt.hrs === getDateValue(fields, 'hour') &&
         wt.min === getDateValue(fields, 'minute') &&
         wt.sec === getDateValue(fields, 'second');
}

export function format(dt: DateTime, fmt: string, localeOverride?: string | string[]): string {
  if (!dt.valid)
    return '##Invalid_Date##';

  const currentLocale = normalizeLocale(localeOverride ?? dt.locale);
  const localeNames = !hasIntlDateTime ? 'en' : currentLocale;
  const locale = getLocaleInfo(localeNames);
  const zeroAdj = locale.zeroDigit.charCodeAt(0) - 48;
  const toNum = (n: number | string, pad = 1): string => {
    if (n == null || (isNumber(n) && isNaN(n)))
      return '?'.repeat(pad);
    else
      return n.toString().padStart(pad, '0').replace(/\d/g, ch => String.fromCharCode(ch.charCodeAt(0) + zeroAdj));
  };

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
        result.push((year < 0 ? '-' : year <= 9999 ? '' : field === 'Y' ? '+' : '') + toNum(abs(year), 4));
        break;

      case 'YY': // 2-digit year
      case 'yy':
        result.push(toNum(mod(abs(year), 100), 2));
        break;

      case 'y': // Era year, never signed, min value 1.
        result.push(toNum(eraYear));
        break;

      case 'GGGG': // ISO-week year
      case 'GG':
        result.push((wt.yw < 0 ? '-' : year <= 9999 ? '' : field === 'GGGG' ? '+' : '') +
          toNum(field.length === 2 ? abs(wt.yw) % 100 : abs(wt.yw), field.length));
        break;

      case 'gggg': // Locale-week year
      case 'gg':
        result.push((wt.ywl < 0 ? '-' : year <= 9999 ? '' : field === 'gggg' ? '+' : '') +
          toNum(field.length === 2 ? abs(wt.ywl) % 100 : abs(wt.ywl), field.length));
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

      case 'WW': // ISO week number
      case 'W':
        result.push(toNum(wt.w, field === 'WW' ? 2 : 1));
        break;

      case 'ww': // Locale week number
      case 'w':
        result.push(toNum(wt.wl, field === 'ww' ? 2 : 1));
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
        result.push(locale.ordinals[dayOfWeek]);
        break;

      case 'd': // Day-of-week number
        result.push(toNum(dayOfWeek));
        break;

      case 'E': // Day-of-week ISO
        result.push(toNum(wt.dw));
        break;

      case 'e': // Day-of-week locale
        result.push(toNum(wt.dwl));
        break;

      case 'HH': // Two-digit 00-23 hour
        result.push(toNum(hour, 2));
        break;

      case 'H': // Numeric 0-23 hour
        result.push(toNum(hour));
        break;

      case 'hh': // Two-digit 01-12 hour
        result.push(toNum(h, 2));
        break;

      case 'h':// Numeric 1-12 hour
        result.push(toNum(h));
        break;

      case 'KK': // Two-digit 00-11 hour (needs AM/PM qualification)
        result.push(toNum(K, 2));
        break;

      case 'K': // Numeric 0-11 hour (needs AM/PM qualification)
        result.push(toNum(K));
        break;

      case 'kk': // Two-digit 01-24 hour
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
          const values = locale.meridiemAlt ?? locale.meridiem;
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
            result.push(`[${field}?]`);
          else if (isString(localeFormat))
            result.push(format(dt, localeFormat, localeOverride));
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
          result.push(DateTimeFormat().resolvedOptions().timeZone);
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'zzz':  // As long zone name (e.g. "Pacific Daylight Time"), if possible
        if (hasIntlDateTime && locale.dateTimeFormats.Z instanceof DateTimeFormat) {
          result.push(getDatePart(locale.dateTimeFormats.Z, dt.utcTimeMillis, 'timeZoneName'));
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'zz':  // As zone acronym (e.g. EST, PDT, AEST), if possible
      case 'z':
        if (hasIntlDateTime && locale.dateTimeFormats.z instanceof DateTimeFormat) {
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
          result.push(locale.eras[(year < 1 ? 0 : 1) + (field.length === 4 ? 2 : 0)]);
        else if (field.startsWith('I')) {
          if (hasIntlDateTime) {
            let intlFormat = locale.dateTimeFormats[field] as DateTimeFormat;

            if (!intlFormat) {
              const options: DateTimeFormatOptions = { calendar: 'gregory' };
              const zone = convertDigits(dt.timezone.zoneName);
              let $: RegExpExecArray;

              if (($ = /^(?:GMT|UTC?)([-+])(\d\d(?::?\d\d))/.exec(zone))) {
                options.timeZone = 'Etc/GMT' + ($[1] === '-' ? '+' : '-') + $[2].replace(/^0+(?=\d)|:|00$/g, '');

                if (!Timezone.has(options.timeZone))
                  delete options.timeZone;
              }
              else if (zone !== 'OS')
                options.timeZone = (zone === 'UT' ? 'UTC' : zone);

              if (field.charAt(1) !== 'x')
                options.dateStyle = styleOptValues[field.charAt(1)];

              if (field.length > 2)
                options.timeStyle = styleOptValues[field.charAt(2)];

              try {
                locale.dateTimeFormats[field] = intlFormat = new DateTimeFormat(localeNames, checkDtfOptions(options));
              }
              catch {
                console.warn('Timezone "%s" not recognized', options.timeZone);
                delete options.timeZone;
                locale.dateTimeFormats[field] = intlFormat = new DateTimeFormat(localeNames, options);
              }
            }

            if (timeMatch(dt, locale))
              result.push(intlFormat.format(dt.utcTimeMillis));
            else {
              // Favor @tubular/time timezone offsets over those derived from Intl.
              let intlFormatAlt = locale.dateTimeFormats['_' + field] as string;

              if (!intlFormatAlt)
                intlFormatAlt = locale.dateTimeFormats['_' + field] = analyzeFormat(currentLocale, intlFormat);

              result.push(format(dt, intlFormatAlt, localeOverride));
            }
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

function quickFormat(localeNames: string | string[], timezone: string, opts: any): DateTimeFormat {
  const options: DateTimeFormatOptions = { calendar: 'gregory' };
  let $: RegExpExecArray;

  localeNames = normalizeLocale(localeNames);

  if (timezone === 'DATELESS' || timezone === 'ZONELESS')
    options.timeZone = 'UTC';
  else if (($ = /^(?:GMT|UTC?)([-+])(\d\d(?::?\d\d))/.exec(timezone))) {
    options.timeZone = 'Etc/GMT' + ($[1] === '-' ? '+' : '-') + $[2].replace(/^0+(?=\d)|:|00$/g, '');

    if (!Timezone.has(options.timeZone))
      delete options.timeZone;
  }
  else if (timezone !== 'OS')
    options.timeZone = (timezone === 'UT' ? 'UTC' : timezone);

  Object.keys(opts).forEach(key => {
    const value = shortOptValues[opts[key]] ?? opts[key];
    key = shortOpts[key] ?? key;
    options[key] = value;
  });

  return new DateTimeFormat(localeNames, checkDtfOptions(options));
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

  const fmt = (opts: any): DateTimeFormat => quickFormat(localeNames, 'UTC', opts);

  locale.name = isArray(localeNames) ? localeNames.join(',') : localeNames;

  if (hasIntlDateTime) {
    locale.months = [];
    locale.monthsShort = [];
    const narrow: string[] = [];
    let format: DateTimeFormat;

    for (let month = 1; month <= 12; ++month) {
      const date = Date.UTC(2021, month - 1, 1);

      format = fmt({ ds: 'l' });
      locale.months.push(getDatePart(format, date, 'month'));
      format = fmt({ ds: 'm' });
      locale.monthsShort.push(getDatePart(format, date, 'month'));
      format = fmt({ M: 'n' });
      narrow.push(getDatePart(format, date, 'month'));
    }

    if (isEqual(locale.months, locale.monthsShort) && new Set(narrow).size === 12 && narrow.find(m => !/^\d+$/.test(m)))
      locale.monthsShort = narrow;

    locale.monthsMin = shortenItems(locale.months);
    locale.monthsShortMin = shortenItems(locale.monthsShort);

    locale.weekdays = [];
    locale.weekdaysShort = [];
    locale.weekdaysMin = [];
    locale.meridiemAlt = [];

    for (let day = 3; day <= 9; ++day) {
      const date = Date.UTC(2021, 0, day);

      format = fmt({ ds: 'f' });
      locale.weekdays.push(getDatePart(format, date, 'weekday'));
      format = fmt({ w: 's' });
      locale.weekdaysShort.push(getDatePart(format, date, 'weekday'));
      format = fmt({ w: 'n' });
      locale.weekdaysMin.push(getDatePart(format, date, 'weekday'));
    }

    // If weekdaysMin are so narrow that there are non-unique names, try either 2 or 3 characters from weekdaysShort.
    for (let len = 2; len < 4 && new Set(locale.weekdaysMin).size < 7; ++len)
      locale.weekdaysMin = locale.weekdaysShort.map(name => name.substr(0, len));

    const hourForms = new Set<string>();

    format = fmt({ h: 'd', hourCycle: 'h12' });

    for (let hour = 0; hour < 24; ++hour) {
      const date = Date.UTC(2021, 0, 1, hour,  0, 0);
      const value = getDatePart(format, date, 'dayPeriod');
      const lcValue = value.toLowerCase();

      hourForms.add(value);

      if (value === lcValue)
        locale.meridiemAlt.push([value]);
      else
        locale.meridiemAlt.push([lcValue, value]);
    }

    if (hourForms.size < 3) {
      locale.meridiemAlt.splice(13, 11);
      locale.meridiemAlt.splice(1, 11);
    }

    locale.eras = [getDatePart(fmt({ y: 'n', e: 's' }), Date.UTC(-1, 0, 1), 'era')];
    locale.eras.push(getDatePart(fmt({ y: 'n', e: 's' }), Date.UTC(1, 0, 1), 'era'));
    locale.eras.push(getDatePart(fmt({ y: 'n', e: 'l' }), Date.UTC(-1, 0, 1), 'era'));
    locale.eras.push(getDatePart(fmt({ y: 'n', e: 'l' }), Date.UTC(1, 0, 1), 'era'));

    locale.zeroDigit = fmt({ m: 'd' }).format(0);
  }
  else {
    locale.eras = ['BC', 'AD', 'Before Christ', 'Anno Domini'];
    locale.months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
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
  locale.ordinals = getOrdinals(localeNames);
  locale.parsePatterns = {};

  cachedLocales[joinedNames] = locale;

  return locale;
}

function generatePredefinedFormats(locale: ILocale, timezone: string): void {
  const fmt = (opts: any): DateTimeFormat => quickFormat(locale.name, timezone, opts);

  locale.cachedTimezone = timezone;
  locale.dateTimeFormats = {};

  if (hasIntlDateTime) {
    locale.dateTimeFormats.LLLL = fmt({ Y: 'd', M: 'l', D: 'd', w: 'l', h: 'd', m: 'dd' }); // Thursday, September 4, 1986 8:30 PM
    locale.dateTimeFormats.llll = fmt({ Y: 'd', M: 's', D: 'd', w: 's', h: 'd', m: 'dd' }); // Thu, Sep 4, 1986 8:30 PM
    locale.dateTimeFormats.LLL = fmt({ Y: 'd', M: 'l', D: 'd', h: 'd', m: 'dd' }); // September 4, 1986 8:30 PM
    locale.dateTimeFormats.lll = fmt({ Y: 'd', M: 's', D: 'd', h: 'd', m: 'dd' }); // Sep 4, 1986 8:30 PM
    locale.dateTimeFormats.LTS = fmt({ h: 'd', m: 'dd', s: 'dd' }); // 8:30:25 PM
    locale.dateTimeFormats.LT = fmt({ h: 'd', m: 'dd' }); // 8:30 PM
    locale.dateTimeFormats.LL = fmt({ Y: 'd', M: 'l', D: 'd' }); // September 4, 1986
    locale.dateTimeFormats.ll = fmt({ Y: 'd', M: 's', D: 'd' }); // Sep 4, 1986
    locale.dateTimeFormats.L = fmt({ Y: 'd', M: 'dd', D: 'dd' }); // 09/04/1986
    locale.dateTimeFormats.l = fmt({ Y: 'd', M: 'd', D: 'd' }); // 9/4/1986
    locale.dateTimeFormats.Z = fmt({ z: 'l', Y: 'd' }); // Don't really want the year, but without *something* else
    locale.dateTimeFormats.z = fmt({ z: 's', Y: 'd' }); //   a whole date appears, and just a year is easier to remove.
    locale.dateTimeFormats.check = fmt({ h: 'd', m: 'd', s: 'd', hourCycle: 'h23' });

    Object.keys(locale.dateTimeFormats).forEach(key => {
      if (/^L/i.test(key))
        locale.dateTimeFormats['_' + key] = analyzeFormat(locale.name.split(','),
          locale.dateTimeFormats[key] as DateTimeFormat);
    });
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

function isLocale(locale: string | string[], matcher: string): boolean {
  if (isString(locale))
    return locale.startsWith(matcher);
  else if (locale.length > 0)
    return locale[0].startsWith(matcher);
  else
    return false;
}

export function analyzeFormat(locale: string | string[], formatter: DateTimeFormat): string;
export function analyzeFormat(locale: string | string[], dateStyle: string, timeStyle?: string): string;
export function analyzeFormat(locale: string | string[], dateStyleOrFormatter: string | DateTimeFormat,
                              timeStyle?: string): string {
  const options: DateTimeFormatOptions = { timeZone: 'UTC', calendar: 'gregory' };
  let dateStyle: string;

  if (dateStyleOrFormatter == null || isString(dateStyleOrFormatter)) {
    if (dateStyleOrFormatter)
      options.dateStyle = dateStyle = dateStyleOrFormatter as string;

    if (timeStyle)
      options.timeStyle = timeStyle;
  }
  else {
    const formatOptions = dateStyleOrFormatter.resolvedOptions();

    Object.assign(options, formatOptions);
    options.timeZone = 'UTC';
    dateStyle = formatOptions.dateStyle ??
      (options.month === 'long' ? 'long' : options.month === 'short' ? 'short' : null);
    timeStyle = formatOptions.timeStyle;
  }

  const sampleDate = Date.UTC(2233, 3 /* 4 */, 5, 6, 7, 8);
  const format = new DateTimeFormat(locale, checkDtfOptions(options));
  const parts = format.formatToParts(sampleDate);
  const dateLong = (dateStyle === 'full' || dateStyle === 'long');
  const monthLong = (dateLong || (dateStyle === 'medium' && isLocale(locale, 'ne')));
  const timeFull = (timeStyle === 'full');
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
          formatString += (monthLong ? 'MMMM' : 'MMM');
        break;

      case 'second':
        formatString += 'ss'.substring(0, len);
        break;

      case 'timeZoneName':
        formatString += (timeFull ? 'zzz' : 'z');
        break;

      case 'weekday':
        formatString += (dateLong ? 'dddd' : dateStyle === 'medium' ? 'ddd' : 'dd');
        break;

      case 'year':
        formatString += (len < 3 ? 'YY' : 'YYYY');
        break;

      case 'era':
        formatString += 'N';
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
  input = input.toLowerCase().replace(/\xA0/g, ' ');

  for (const meridiem of [locale.meridiemAlt, locale.meridiem, [['am', 'a.m.', 'a. m.'], ['pm', 'p.m.', 'p. m.']]]) {
    if (meridiem == null)
      continue;

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

function matchEra(locale: ILocale, input: string): [boolean, number] {
  input = input.toLowerCase().replace(/\xA0/g, ' ');

  for (const eras of [locale.eras, ['BC', 'AD', 'BCE', 'CE', 'Before Christ', 'Anno Domini', 'Before Common Era', 'Common Era']]) {
    if (eras == null)
      continue;

    for (let i = eras.length - 1; i >= 0; --i) {
      const form = eras[i];

      if (input.startsWith(form.toLowerCase()))
        return [i % 2 === 0, form.length];
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

function isNumericPart(part: string): boolean {
  return /^[gy]/i.test(part) || (part.length < 3 && /^[WwMDEeHhKkmsS]/.test(part));
}

export function parse(input: string, format: string, zone?: Timezone | string, locales?: string | string[]): DateTime {
  let origZone = zone;
  let restoreZone = false;
  let occurrence = 0;

  if (input.includes('₂'))
    occurrence = 2;

  input = convertDigits(input.replace(/[\u00AD\u2010-\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ').trim()).replace(/[\u200F₂]/g, '');
  format = format.trim().replace(/\u200F/g, '');
  locales = !hasIntlDateTime ? 'en' : normalizeLocale(locales ?? DateTime.getDefaultLocale());

  if (isString(zone))
    origZone = zone = Timezone.from(zone);

  const locale = getLocaleInfo(locales);
  let $ = /^(I[FLMSx][FLMS]?)/.exec(format);

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
  else if (/^L(L{1,3}|TS?)$/i.test(format))
    format = (locale.dateTimeFormats['_' + format] ?? locale.dateTimeFormats[format]) as string ?? format;

  const w = {} as DateAndTime;
  const parts = decomposeFormatString(format);
  const hasEraField = !!parts.find(part => part.toLowerCase().startsWith('n'));
  const base = DateTime.getDefaultCenturyBase();
  let bce: boolean = null;
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
      if (i < parts.length - 1 && isNumericPart(nextPart)) {
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
    else if (part === 'd')
      throw new Error('Parsing "d" token is not supported');

    let firstChar = part.substr(0, 1);
    let newValueText = (/^([-+]?\d+)/.exec(input) ?? [])[1];
    let newValue = toNumber(newValueText);
    const value2d = newValue - base % 100 + base + (newValue < base % 100 ? 100 : 0);
    let handled = false;

    if (newValueText != null && part.length < 3 || /[gy]/i.test(part)) {
      handled = true;

      switch (firstChar) {
        case 'Y':
        case 'y':
          if (part.toLowerCase() === 'yy' && newValueText.length < 3)
            w.y = value2d;
          else if (bce)
            w.y = 1 - newValue;
          else
            w.y = newValue;

          if (!hasEraField && (parts[i + 2] == null || isNumericPart(parts[i + 2]))) {
            firstChar = 'n';
            handled = false;
            input = input.substr(newValueText?.length ?? 0).trimLeft();
          }
          break;

        case 'G':
          if (part.length === 2 && newValueText.length < 3)
            w.yw = value2d;
          else
            w.yw = newValue;
          break;

        case 'g':
          if (part.length === 2 && newValueText.length < 3)
            w.ywl = value2d;
          else
            w.ywl = newValue;
          break;

        case 'M':
          validateField('month', newValue, 1, 12);
          w.m = newValue;
          break;

        case 'W':
          validateField('week-iso', newValue, 1, 53);
          w.w = newValue;
          break;

        case 'w':
          validateField('week-locale', newValue, 1, 53);
          w.wl = newValue;
          break;

        case 'D':
          validateField('date', newValue, 1, 31);
          w.d = newValue;
          break;

        case 'E':
          validateField('day-of-week-iso', newValue, 1, 7);
          w.dw = newValue;
          break;

        case 'e':
          validateField('day-of-week-locale', newValue, 1, 7);
          w.dwl = newValue;
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
      case 'N':
      case 'n':
        {
          const [isBCE, length] = matchEra(locale, input);

          if (length > 0) {
            bce = isBCE;
            input = input.substr(length).trimLeft();

            if (w.y != null && bce)
              w.y = 1 - w.y;
          }
        }

        handled = true; // Treat as handled no matter what, defaulting to CE.
        break;

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
        trimmed = false;

        if (!/^UTC?[-+]/.test(input) && ($ = /^(Z|\bEtc\/GMT(?:0|[-+]\d{1,2})|[_/a-z]+)([^-+_/a-z]|$)/i.exec(input))) {
          let embeddedZone: string | Timezone = $[1];

          if (/^(Z|UTC?|GMT)$/i.test(embeddedZone))
            embeddedZone = 'UT';

          embeddedZone = Timezone.from(embeddedZone);
          restoreZone = origZone && !embeddedZone.error;

          if (embeddedZone instanceof Timezone && embeddedZone.error) {
            const szni = Timezone.getShortZoneNameInfo($[1]);

            if (szni) {
              w.utcOffset = szni.utcOffset;
              embeddedZone = Timezone.from(szni.ianaName);
              restoreZone = !!origZone;
            }
            else
              embeddedZone = null;
          }

          if (embeddedZone) {
            zone = embeddedZone;
            input = input.substr($[1].length).trimStart();
            trimmed = true;
          }
        }
        else if (($ = /^(UTC?|GMT)?([-+]\d\d(?:\d{4}|:\d\d(:\d\d)?)?)/i.exec(input))) {
          w.utcOffset = parseTimeOffset($[2]);
          input = input.substr($[0].length).trimStart();
          trimmed = true;
        }

        // Timezone text is very hard to match when it comes before other parts of the time rather than being
        // the very last thing in a time string, especially (as with Vietnamese) when there's no clear delimiter
        // between the zone name and subsequent text.
        if (!trimmed && locale.name.startsWith('vi')) {
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

  if (w.y == null && w.yw == null && w.ywl == null)
    zone = undefined;

  if (occurrence)
    w.occurrence = occurrence;

  let result = new DateTime(w, zone, locales);

  if (restoreZone && origZone)
    result = result.tz(origZone);

  return result;
}
