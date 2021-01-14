import { DateTime } from './date-time';
import { abs, floor } from '@tubular/math';
import { ILocale } from './i-locale';
import { flatten, isArray, isEqual, isString, last, regexEscape, sortObjectEntries } from '@tubular/util';
import { getEras, getMeridiems, getMinDaysInWeek, getOrdinals, getStartOfWeek, getWeekend, normalizeLocale } from './locale-data';
import { Timezone } from './timezone';

let hasIntlDateTime = false;

try {
  hasIntlDateTime = typeof Intl !== 'undefined' && !!Intl?.DateTimeFormat;
}
catch {}

const shortOpts = { Y: 'year', M: 'month', D: 'day', w: 'weekday', h: 'hour', m: 'minute', s: 'second', z: 'timeZoneName' };
const shortOptValues = { n: 'narrow', s: 'short', l: 'long', dd: '2-digit', d: 'numeric' };
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
    else if (inAlpha) {
      inAlpha = false;
      result += ']';
    }

    result += c;
  });

  return result;
}

export function decomposeFormatString(format: string): string[] {
  let parts: (string | string[])[] = [];

  // For some reason I can't get a regex to do this first part quite right
  while (format) {
    const pos1 = format.indexOf('['); if (pos1 < 0) break;
    const pos2 = format.indexOf(']', pos1 + 1); if (pos2 < 0) break;

    parts.push(format.substr(0, pos1));
    parts.push(format.substring(pos1, pos2 + 1));
    format = format.substr(pos2 + 1);
  }

  if (format)
    parts.push(format);

  for (let i = 0; i < parts.length; i += 2)
    parts[i] = (parts[i] as string).split(patternsMoment);

  parts = flatten(parts);

  // Even indices should contain literal text, and odd indices format patterns. When a format pattern
  // represents quoted literal text, move it to an even position.
  for (let i = 1; i < parts.length; i += 2) {
    const part = parts[i] as string;

    if (part.startsWith('[') && part.endsWith(']')) {
      parts[i - 1] += part.substr(1, part.length - 2) + (parts[i + 1] ?? '');
      parts.splice(i, 2);
    }
  }

  return parts as string[];
}

function cleanUpLongTimezone(zone: string): string {
  const $ = /\b(GMT[-+]\d[:\d]*)/.exec(zone);

  if ($)
    return $[1];

  return zone.replace(/^[\p{P}\p{N}\s]*/u, '').replace(/[\p{P}\p{N}\s]*$/u, '');
}

export function format(dt: DateTime, fmt: string, localeOverride?: string | string[]): string {
  if (!dt.valid)
    return '##Invalid_Date##';

  const localeNames = !hasIntlDateTime ? 'en' : normalizeLocale(localeOverride ?? dt.locale);
  const locale = getLocaleInfo(localeNames);
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
      case 'YYYYYY':
      case 'yyyyyy':
        result.push((year < 0 ? '-' : '+') + abs(year).toString().padStart(6, '0'));
        break;

      case 'YYYY':
      case 'yyyy':
        result.push((year < 0 ? '-' : '') + abs(year).toString().padStart(4, '0'));
        break;

      case 'YY':
      case 'yy':
        result.push((abs(year) % 100).toString().padStart(2, '0'));
        break;

      case 'Y':
        result.push((year < 0 ? '-' : year <= 9999 ? '' : '+') + abs(year).toString().padStart(4, '0'));
        break;

      case 'y':
        result.push(eraYear.toString());
        break;

      case 'Qo':
        result.push(locale.ordinals[quarter]);
        break;

      case 'Q':
        result.push(quarter.toString());
        break;

      case 'MMMM':
        result.push(locale.months[month - 1]);
        break;

      case 'MMM':
        result.push(locale.monthsShort[month - 1]);
        break;

      case 'MM':
        result.push(month.toString().padStart(2, '0'));
        break;

      case 'Mo':
        result.push(locale.ordinals[month]);
        break;

      case 'M':
        result.push(month.toString());
        break;

      case 'Wo':
        result.push(locale.ordinals[wt.w]);
        isoWeek = true;
        break;

      case 'WW':
      case 'W':
        result.push(wt.w.toString().padStart(field === 'WW' ? 2 : 1, '0'));
        isoWeek = true;
        break;

      case 'wo':
        result.push(locale.ordinals[wt.wl]);
        isoWeek = false;
        break;

      case 'ww':
      case 'w':
        result.push(wt.wl.toString().padStart(field === 'ww' ? 2 : 1, '0'));
        isoWeek = false;
        break;

      case 'DD':
        result.push(day.toString().padStart(2, '0'));
        break;

      case 'Do':
        result.push(locale.ordinals[day]);
        break;

      case 'D':
        result.push(day.toString());
        break;

      case 'dddd':
        result.push(locale.weekdays[dayOfWeek]);
        break;

      case 'ddd':
        result.push(locale.weekdaysShort[dayOfWeek]);
        break;

      case 'dd':
        result.push(locale.weekdaysMin[dayOfWeek]);
        break;

      case 'do':
        result.push(locale.ordinals[isoWeek ? wt.dw : wt.dwl]);
        break;

      case 'd':
        result.push((isoWeek ? wt.dw : wt.dwl).toString());
        break;

      case 'HH':
        result.push(hour.toString().padStart(2, '0'));
        break;

      case 'H':
        result.push(hour.toString());
        break;

      case 'hh':
        result.push(h.toString().padStart(2, '0'));
        break;

      case 'h':
        result.push(h.toString());
        break;

      case 'KK':
        result.push(K.toString().padStart(2, '0'));
        break;

      case 'K':
        result.push(K.toString());
        break;

      case 'kk':
        result.push(k.toString().padStart(2, '0'));
        break;

      case 'k':
        result.push(k.toString());
        break;

      case 'mm':
        result.push(min.toString().padStart(2, '0'));
        break;

      case 'm':
        result.push(min.toString());
        break;

      case 'ss':
        result.push(sec.toString().padStart(2, '0'));
        break;

      case 's':
        result.push(sec.toString());
        break;

      case 'A':
      case 'a':
        {
          const values = locale.meridiem;
          const forHour = values[values.length === 2 ? floor(hour / 12) : hour];

          result.push(forHour[field === 'A' && forHour.length > 1 ? 1 : 0]);
        }
        break;

      case 'X':
        result.push(floor(dt.utcTimeMillis / 1000).toString());
        break;

      case 'x':
        result.push(dt.utcTimeMillis.toString());
        break;

      case 'LLLL':
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
          result.push(cleanUpLongTimezone(locale.dateTimeFormats.Z.format(dt.utcTimeMillis)));
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'zz':  // As zone acronym (e.g. EST, PDT, AEST), if possible
      case 'z':
        if (hasIntlDateTime && locale.dateTimeFormats.z instanceof Intl.DateTimeFormat) {
          result.push(cleanUpLongTimezone(locale.dateTimeFormats.z.format(dt.utcTimeMillis)));
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
              const options: Intl.DateTimeFormatOptions = {};

              if (dt.timezone.zoneName !== 'OS')
                options.timeZone = (dt.timezone.zoneName === 'UT' ? 'UTC' : dt.timezone.zoneName);

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
          result.push(wt.millis.toString().padStart(3, '0').substr(0, field.length).padEnd(field.length, '0'));
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
  const options: Intl.DateTimeFormatOptions = {};

  localeNames = normalizeLocale(localeNames);

  if (timezone !== 'OS')
    options.timeZone = (timezone === 'UT' ? 'UTC' : timezone);

  Object.keys(opts).forEach(key => {
    const value = shortOptValues[opts[key]] ?? opts[key];
    key = shortOpts[key];
    options[key] = value;
  });

  return new Intl.DateTimeFormat(localeNames, options);
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

    for (let month = 1; month <= 12; ++month) {
      const date = Date.UTC(2021, month - 1, 1);
      let format = fmt({ M: 'l' });

      locale.months.push(getDatePart(format, date, 'month'));
      format = fmt({ M: 's' });
      locale.monthsShort.push(getDatePart(format, date, 'month'));
    }

    locale.weekdays = [];
    locale.weekdaysShort = [];
    locale.weekdaysMin = [];

    for (let day = 3; day <= 9; ++day) {
      const date = Date.UTC(2021, 0, day);
      let format = new Intl.DateTimeFormat(localeNames, { timeZone: 'UTC', weekday: 'long' });

      locale.weekdays.push(getDatePart(format, date, 'weekday'));
      format = fmt({ w: 's' });
      locale.weekdaysShort.push(getDatePart(format, date, 'weekday'));
      format = fmt({ w: 'n' });
      locale.weekdaysMin.push(getDatePart(format, date, 'weekday'));
    }

    // If weekdaysMin are so narrow that there are non-unique names, try either 2 or 3 characters from weekdaysShort.
    for (let len = 2; len < 4 && new Set(locale.weekdaysMin).size < 7; ++len)
      locale.weekdaysMin = locale.weekdaysShort.map(name => name.substr(0, len));
  }
  else {
    locale.months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    locale.monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    locale.weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    locale.weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    locale.weekdaysMin = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  }

  locale.dateTimeFormats = {};
  locale.meridiem = getMeridiems(localeNames);
  locale.startOfWeek = getStartOfWeek(localeNames);
  locale.minDaysInWeek = getMinDaysInWeek(localeNames);
  locale.weekend = getWeekend(localeNames);
  locale.eras = getEras(localeNames);
  locale.ordinals = getOrdinals(localeNames);

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
    .replace(/[\u06F0-\u06F9]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x06C0)); // Urdu/Persian digits
}

export function analyzeFormat(locale: string, dateStyle: string, timeStyle?: string): string {
  const options: any = { timeZone: 'UTC' };

  if (dateStyle)
    options.dateStyle = dateStyle;

  if (timeStyle)
    options.timeStyle = timeStyle;

  const sampleDate = Date.UTC(2345, 9, 20, 11, 22, 33);
  const format = new Intl.DateTimeFormat(locale, options);
  const formatted = convertDigits(format.format(sampleDate));
  const fields = {
    year: /((?:23)?45)/.exec(formatted),
    month: /(10)/.exec(formatted),
    day: /(20)/.exec(formatted),
    weekday: null,
    hour: /(11)/.exec(formatted),
    minute: /(22)/.exec(formatted),
    second: /(33)/.exec(formatted),
    ampm: null,
    zone: /(UTC)/.exec(formatted)
  };

  if (dateStyle) {
    if (dateStyle === 'full')
      dateStyle = 'long';

    const weekdayText = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: dateStyle }).format(sampleDate);
    fields.weekday = new RegExp('(' + regexEscape(weekdayText) + ')').exec(formatted);
  }

  if (dateStyle && fields.month == null) {
    const monthText = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: dateStyle }).format(sampleDate);
    fields.month = new RegExp('(' + regexEscape(monthText) + ')').exec(formatted);
  }

  let hourMode: string;

  if (timeStyle) {
    const ams: string[] = [];
    const pms: string[] = [];

    for (const style of ['long', 'short', 'narrow']) {
      for (const hour24 of [0, 11, 12, 23]) {
        const date = Date.UTC(2345, 9, 20, hour24, 22, 33);
        const timeText = convertDigits(new Intl.DateTimeFormat(locale,
          { timeZone: 'UTC', hour: '2-digit', dayPeriod: style }).format(date));
        const $ = /(\D*)(\d+)(.*)/.exec(timeText);
        const hour = Number($[2]);
        const ampm = ($[1] || $[3]).trim();

        if (ampm)
          (hour24 < 12 ? ams : pms).push(ampm);

        if (hour24 === 0 && hour === 24)
          hourMode = 'h24';
        else if (hour24 === 0 && hour === 12)
          hourMode = 'h12';
        else if (hour24 === 12 && hour === 0)
          hourMode = 'h11';
        else if (!hourMode && hour24 === 23 && hour === 23)
          hourMode = 'h23';
      }
    }

    if (ams.length > 0 || pms.length > 0)
      fields.ampm = new RegExp('(' + flatten([ams, pms]).map(s => regexEscape(s)).join('|') + ')').exec(formatted);
  }

  Object.keys(fields).forEach(key => fields[key] == null && delete fields[key]);
  sortObjectEntries(fields, (a, b) => a[1].index - b[1].index, true);

  let formatString = '';
  let lastIndex = 0;

  Object.keys(fields).forEach(key => {
    const match = fields[key];

    formatString += formatEscape(formatted.substring(lastIndex, match.index));

    switch (key) {
      case 'year':
        formatString += match[1].length < 3 ? 'YY' : 'YYYY';
        break;

      case 'month':
        if (/^\d+$/.test(match[1]))
          formatString += 'MM';
        else if (dateStyle === 'full')
          formatString += 'MMMM';
        else
          formatString += 'MMM';
        break;

      case 'date':
        formatString += 'DD';
        break;

      case 'weekday':
        formatString += { long: 'dddd', medium: 'ddd', short: 'dd' }[dateStyle];
        break;

      case 'hour':
        formatString += { h11: 'KK', h12: 'hh', h23: 'HH', h24: 'kk' }[hourMode];
        break;

      case 'minute':
        formatString += 'mm';
        break;

      case 'second':
        formatString += 'ss';
        break;

      case 'ampm':
        formatString += 'A';
        break;

      case 'zone':
        formatString += 'z';
        break;
    }

    lastIndex = match.index + match[1].length;
  });

  formatString += formatEscape(formatted.substr(lastIndex));

  return formatString;
}
