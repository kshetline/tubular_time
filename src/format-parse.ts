import moment from 'moment';

import { DateTime } from './date-time';
import { abs } from '@tubular/math';
import { LocaleInfo } from './locale-info';

moment.locale('en');
const locale: LocaleInfo = moment.localeData() as any;
const patternsMoment = /(\[[^]]*?]|\[[A-Za-z0-9/_!]*?]|MMMM|MMM|MM|Mo|M|Qo|Q|DDDD|DDDo|DDD|Do|DD|D|dddd|ddd|do|dd|d|e|E|ww|wo|w|WW|Wo|W|YYYYYY|yyyyyy|YYYY|yyyy|YY|yy|Y|y|NNNNN|NNN|NN|N|gggg|gg|GGGG|GG|A|a|HH|H|hh|h|kk|k|mm|m|ss|s|S+|ZZ|Z|X|x)/g;

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

export function format(dt: DateTime, format: string): string {
  const parts = decomposeFormatString(format);
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
    const min = wallTime.min;
    const sec = wallTime.sec;
    const dayOfWeek = dt.getDayOfWeek(wallTime);

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
        result.push(locale.weekdays()[dayOfWeek]);
        break;

      case 'ddd':
        result.push(locale.weekdaysShort()[dayOfWeek]);
        break;

      case 'dd':
        result.push(locale.weekdaysMin()[dayOfWeek]);
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

      default:
        if (field.startsWith('S')) {
          result.push(wallTime.millis.toString().padStart(3, '0').substr(0, field.length).padEnd(field.length, '0'));
        }
        else
          result.push('??');
    }
  }

  return result.join('');
}
