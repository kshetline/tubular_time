import { IZonePoller } from './i-zone-poller';
import { Timezone } from './timezone';
import { initTimeZoneSmall } from './timezone-small';

initTimeZoneSmall();

export {
  Calendar, CalendarType, GREGORIAN_CHANGE_MAX_YEAR, GREGORIAN_CHANGE_MIN_YEAR, SUNDAY, MONDAY, TUESDAY, WEDNESDAY,
  THURSDAY, FRIDAY, SATURDAY, LAST, YMDDate, YearOrDate, GregorianChange, getISOFormatDate, addDaysToDate_SGC,
  getDateFromDayNumber_SGC, getDateFromDayNumberGregorian, getDateFromDayNumberJulian, getDateOfNthWeekdayOfMonth_SGC,
  getDayNumber_SGC, getDayNumberGregorian, getDayNumberJulian, getDayOfWeek, getDayOfWeek_SGC,
  getDayOfWeekInMonthCount_SGC, getDayOnOrAfter_SGC, getDayOnOrBefore_SGC, getDaysInMonth_SGC, getDaysInYear_SGC,
  getFirstDateInMonth_SGC, getLastDateInMonth_SGC, getLastDateInMonthGregorian, getLastDateInMonthJulian,
  isJulianCalendarDate_SGC, isValidDate_SGC, isValidDateGregorian, isValidDateJulian, parseISODate
} from './calendar';
export { DateTime, DateTimeField, UNIX_TIME_ZERO_AS_JULIAN_DAY } from './date-time';
export {
  DateAndTime, MINUTE_MSEC, dateAndTimeFromMillis_SGC, DAY_MINUTES, DAY_MSEC, HOUR_MSEC, millisFromDateTime_SGC,
  parseISODateTime, parseTimeOffset
} from './common';
export { Timezone, Transition, ZoneInfo, RegionAndSubzones } from './timezone';
export { zonePollerBrowser } from './zone-poller-browser';
export { zonePollerNode } from './zone-poller-node';

let pollingInterval: any;

const zonesUrl = 'https://unpkg.com/@tubular/time/dist/timezone-{name}-data.js';

export function pollForTimezoneUpdates(zonePoller: IZonePoller | false,
                                       name: 'small' | 'large' | 'large-alt' | 'large_alt' = 'small',
                                       intervalDays = 1): void {
  if (pollingInterval)
    clearInterval(pollingInterval);

  if (name === 'large-alt')
    name = 'large_alt';

  if (zonePoller && name && intervalDays >= 0) {
    const url = zonesUrl.replace('{name}', name);
    console.log(url);
    const poll = () => {
      zonePoller.getTimezones(url).then(zones => {
        Timezone.defineTimeZones(zones);
        dispatchUpdateNotification(true);
      })
        .catch(err => dispatchUpdateNotification(err instanceof Error ? err : new Error(err)));
    };

    poll();
    pollingInterval = setInterval(poll, intervalDays * 86400000);

    // Using unref prevents the interval alone from keeping a process alive
    if (pollingInterval.unref)
      pollingInterval.unref();
  }
}

const listeners = new Set<(result: boolean | Error) => void>();

function dispatchUpdateNotification(result: boolean | Error): void {
  listeners.forEach(listener => {
    try {
      listener(result);
    }
    catch (e) {}
  });
}

export function addZonesUpdateListener(listener: (result: boolean | Error) => void): void {
  listeners.add(listener);
}

export function removeZonesUpdateListener(listener: (result: boolean | Error) => void): void {
  listeners.delete(listener);
}

export function clearZonesUpdateListeners(): void {
  listeners.clear();
}
