import { DateTime } from './date-time';
import { abs, floor } from '@tubular/math';
import { LocaleInfo } from './locale-info';
import { isEqual, isString } from '@tubular/util';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import moment from 'moment/moment';
import { getMeridiems, normalizeLocale } from './locale-data';

let hasIntlDateTime = false;

try {
  hasIntlDateTime = typeof Intl !== 'undefined' && !!Intl?.DateTimeFormat;
}
catch {}

const shortOpts = { Y: 'year', M: 'month', D: 'day', w: 'weekday', h: 'hour', m: 'minute', s: 'second', z: 'timeZoneName' };
const shortOptValues = { n: 'narrow', s: 'short', l: 'long', dd: '2-digit', d: 'numeric' };
const styleOptValues = { F: 'full', L: 'long', M: 'medium', S: 'short' };
const patternsMoment = /(\[[^]]*?]|{[A-Za-z0-9/_]+?!?}|I[FLMSx][FLMS]?|MMMM|MMM|MM|Mo|M|Qo|Q|DDDD|DDDo|DDD|Do|DD|D|dddd|ddd|do|dd|d|e|E|ww|wo|w|WW|Wo|W|YYYYYY|yyyyyy|YYYY|yyyy|YY|yy|Y|y|NNNNN|NNN|NN|N|gggg|gg|GGGG|GG|A|a|HH|H|hh|h|kk|k|mm|m|ss|s|LTS|LT|LLLL|llll|LLL|lll|LL|ll|L|l|S+|ZZZ|zzz|ZZ|zz|Z|z|X|x)/g;
const cachedLocales: Record<string, LocaleInfo> = {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const localeList = [
  'af', 'ar', 'ar-DZ', 'ar-KW', 'ar-LY', 'ar-MA', 'ar-SA', 'ar-TN', 'az', 'be', 'bg', 'bm', 'bn', 'bn-BD',
  'bo', 'br', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'de-AT', 'de-CH', 'el', 'en', 'en-AU', 'en-CA', 'en-GB',
  'en-IE', 'en-IL', 'en-IN', 'en-NZ', 'en-SG', 'eo', 'es', 'es-DO', 'es-MX', 'es-US', 'et', 'eu', 'fa',
  'fi', 'fil', 'fo', 'fr', 'fr-CA', 'fr-CH', 'fy', 'ga', 'gd', 'gl', 'gu', 'hi', 'hr', 'hu', 'hy-AM',
  'is', 'it', 'it-CH', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky', 'lb', 'lo', 'lt', 'lv',
  'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'ms-MY', 'mt', 'my', 'nb', 'ne', 'nl', 'nl-BE', 'nn', 'pl', 'pt',
  'pt-BR', 'ro', 'ru', 'sd', 'se', 'si', 'sk', 'sl', 'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'tg', 'th',
  'tk', 'tr', 'tzm', 'ug-CN', 'uk', 'ur', 'uz', 'vi', 'yo', 'zh-CN', 'zh-HK', 'zh-TW'
];

export function decomposeFormatString(format: string): string[] {
  const parts = format.split(patternsMoment);

  // Even indices should contain literal text, and odd indices format patterns. When a format pattern
  // represents quoted literal text, move it to an even position.
  for (let i = 1; i < parts.length; i += 2) {
    const part = parts[i];

    if (part.startsWith('[')) {
      parts[i - 1] += part.substr(1, part.length - 2) + (parts[i + 1] ?? '');
      parts.splice(i, 2);
    }
  }

  return parts;
}

function cleanUpLongTimezone(zone: string): string {
  return zone.replace(/^[\p{P}\p{N}\s]*/u, '').replace(/[\p{P}\p{N}\s]*$/u, '');
}

export function format(dt: DateTime, fmt: string): string {
  const localeName = !hasIntlDateTime ? 'en' : normalizeLocale(dt.locale);
  const locale = getLocaleInfo(localeName);
  const parts = decomposeFormatString(fmt);
  const result: string[] = [];
  const wallTime = dt.wallTime;
  const year = wallTime.y;
  const eraYear = abs(year) + (year <= 0 ? 1 : 0);
  const month = wallTime.m;
  const day = wallTime.d;
  const hour = wallTime.hrs;
  const h = (hour === 0 ? 12 : hour <= 12 ? hour : hour - 12);
  const k = (hour === 0 ? 24 : hour);
  const min = wallTime.min;
  const sec = wallTime.sec;
  const dayOfWeek = dt.getDayOfWeek();

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
        result.push(eraYear.toString().padStart(4, '0'));
        break;

      case 'YY':
      case 'yy':
        result.push((eraYear % 100).toString().padStart(2, '0'));
        break;

      case 'Y':
        result.push((year < 0 ? '-' : year <= 9999 ? '' : '+') + abs(year).toString().padStart(4, '0'));
        break;

      case 'y':
        result.push(eraYear.toString());
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

      case 'M':
        result.push(month.toString());
        break;

      case 'DD':
        result.push(day.toString().padStart(2, '0'));
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
          const localFormat = locale.dateTimeFormats[field];

          if (localFormat == null)
            result.push('???');
          else if (isString(localFormat))
            result.push(format(dt, localFormat));
          else
            result.push(localFormat.format(dt.utcTimeMillis));
        }
        break;

      case 'ZZZ':
        if (dt.timezone.zoneName !== 'OS') {
          result.push(dt.timezone.zoneName);
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'zzz':
        if (hasIntlDateTime && locale.dateTimeFormats.Z instanceof Intl.DateTimeFormat) {
          result.push(cleanUpLongTimezone(locale.dateTimeFormats.Z.format(dt.utcTimeMillis)));
          break;
        }

      // eslint-disable-next-line no-fallthrough
      case 'zz':
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
      case 'ZZ':
      case 'Z':
        result.push(dt.timezone.getFormattedOffset(dt.utcTimeMillis, field === 'ZZ'));
        break;

      default:
        if (field.startsWith('I')) {
          if (hasIntlDateTime) {
            let intlFormat = locale.dateTimeFormats[field] as Intl.DateTimeFormat;

            if (!intlFormat) {
              // For some reason the typing for Intl.DateTimeFormatOptions doesn't know about dateStyle and timeStyle.
              const options = {} as any;

              if (dt.timezone.zoneName !== 'OS')
                options.timeZone = dt.timezone.zoneName;

              if (field.charAt(1) !== 'x')
                options.dateStyle = styleOptValues[field.charAt(1)];

              if (field.length > 2)
                options.timeStyle = styleOptValues[field.charAt(2)];

              try {
                locale.dateTimeFormats[field] = intlFormat = new Intl.DateTimeFormat(locale.name, options);
              }
              catch {
                console.warn('Timezone "%s" not recognized', options.timeZone);
                delete options.timeZone;
                locale.dateTimeFormats[field] = intlFormat = new Intl.DateTimeFormat(locale.name, options);
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
          result.push(wallTime.millis.toString().padStart(3, '0').substr(0, field.length).padEnd(field.length, '0'));
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

function quickFormat(localeName: string, timezone: string, opts: any) {
  const options: Intl.DateTimeFormatOptions = {};

  if (timezone !== 'OS')
    options.timeZone = timezone;

  Object.keys(opts).forEach(key => {
    const value = shortOptValues[opts[key]] ?? opts[key];
    key = shortOpts[key];
    options[key] = value;
  });

  return new Intl.DateTimeFormat(localeName, options);
}

function getLocaleInfo(localeName: string): LocaleInfo {
  const locale: LocaleInfo = cachedLocales[localeName] ?? {} as LocaleInfo;

  if (locale && Object.keys(locale).length > 0)
    return locale;

  const fmt = (opts: any) => quickFormat(localeName, 'UTC', opts);

  locale.name = localeName;

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
      let format = new Intl.DateTimeFormat(localeName, { timeZone: 'UTC', weekday: 'long' });

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
  locale.meridiem = getMeridiems(localeName);

  cachedLocales[localeName] = locale;

  return locale;
}

function generatePredefinedFormats(locale: LocaleInfo, timezone: string): void {
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
