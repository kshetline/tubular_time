import { DateTime } from './date-time';
import { abs, floor } from '@tubular/math';
import { LocaleInfo } from './locale-info';
import { isString } from '@tubular/util';

const shortOpts = { Y: 'year', M: 'month', D: 'day', w: 'weekday', h: 'hour', m: 'minute', s: 'second' };
const shortOptValues = { n: 'narrow', s: 'short', l: 'long', dd: '2-digit', d: 'numeric' };
const patternsMoment = /(\[[^]]*?]|{[A-Za-z0-9/_]+?!?}|MMMM|MMM|MM|Mo|M|Qo|Q|DDDD|DDDo|DDD|Do|DD|D|dddd|ddd|do|dd|d|e|E|ww|wo|w|WW|Wo|W|YYYYYY|yyyyyy|YYYY|yyyy|YY|yy|Y|y|NNNNN|NNN|NN|N|gggg|gg|GGGG|GG|A|a|HH|H|hh|h|kk|k|mm|m|ss|s|LTS|LT|LLLL|llll|LLL|lll|LL|ll|L|l|S+|ZZ|zz|Z|z|X|x)/g;
const cachedLocales: Record<string, LocaleInfo> = {};

const locale = getLocaleInfo('en');

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

export function format(dt: DateTime, fmt: string): string {
  const parts = decomposeFormatString(fmt);
  const result: string[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    result.push(parts[i]);
    const field = parts[i + 1];

    if (field == null)
      break;

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
        result.push(locale.meridiem(hour, min, field === 'a'));
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
          const localFormat = locale.longDateFormat[field];

          if (localFormat == null)
            result.push('???');
          else if (isString(localFormat))
            result.push(format(dt, localFormat));
          else
            result.push(localFormat.format(dt.utcTimeMillis));
        }
        break;

      default:
        if (field.startsWith('S'))
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

function getLocaleInfo(localeName: string): LocaleInfo {
  const locale: LocaleInfo = cachedLocales[localeName] ?? {} as LocaleInfo;

  if (Object.keys(locale).length > 0)
    return locale;

  const fmt = (opts: any) => {
    const options: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };

    Object.keys(opts).forEach(key => {
      const value = shortOptValues[opts[key]] ?? opts[key];
      key = shortOpts[key];
      options[key] = value;
    });

    return new Intl.DateTimeFormat(localeName, options);
  };

  locale.months = [];
  locale.monthsShort = [];

  for (let month = 1; month <= 12; ++month) {
    const date = Date.UTC(2021, month - 1, 1);
    let format = fmt({ month: 'long' });

    locale.months.push(getDatePart(format, date, 'month'));
    format = fmt({ month: 'short' });
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

  locale.longDateFormat = {};
  locale.longDateFormat.LLLL = fmt({ Y: 'd', M: 'l', D: 'd', w: 'l', h: 'd', m: 'dd' }); // Thursday, September 4, 1986 8:30 PM
  locale.longDateFormat.llll = fmt({ Y: 'd', M: 's', D: 'd', w: 's', h: 'd', m: 'dd' }); // Thu, Sep 4, 1986 8:30 PM
  locale.longDateFormat.LLL = fmt({ Y: 'd', M: 's', D: 'd', h: 'd', m: 'dd' }); // September 4, 1986 8:30 PM
  locale.longDateFormat.lll = fmt({ Y: 'd', M: 's', D: 'd', h: 'd', m: 'dd' }); // Sep 4, 1986 8:30 PM
  locale.longDateFormat.LTS = fmt({ h: 'd', m: 'dd', s: 'dd' }); // 8:30:25 PM
  locale.longDateFormat.LT = fmt({ h: 'd', m: 'dd' }); // 8:30 PM
  locale.longDateFormat.LL = fmt({ Y: 'd', M: 's', D: 'd' }); // September 4, 1986
  locale.longDateFormat.ll = fmt({ Y: 'd', M: 's', D: 'd' }); // Sep 4, 1986
  locale.longDateFormat.L = fmt({ Y: 'd', M: 'dd', D: 'dd' }); // 09/04/1986
  locale.longDateFormat.l = fmt({ Y: 'd', M: 'd', D: 'd' }); // 9/4/1986

  locale.meridiem = (hours: number, minutes: number, isLower: boolean) => {
    if (hours < 12)
      return isLower ? 'am' : 'AM';
    else
      return isLower ? 'pm' : 'PM';
  };

  return locale;
}
