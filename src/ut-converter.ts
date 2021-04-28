import { floor, max, round } from '@tubular/math';
import { clone } from '@tubular/util';
import { DAY_MSEC, DAY_SEC, DELTA_TDT_DAYS, DELTA_TDT_MSEC, JD_J2000, UNIX_TIME_ZERO_AS_JULIAN_DAY, YMDDate } from './common';
import { Timezone } from './timezone';
import { getDateFromDayNumber_SGC, getDayNumber_SGC } from './calendar';

/* eslint-disable @typescript-eslint/indent, comma-spacing, space-infix-ops */
const baseHistoricDeltaT = [
// Values to smooth transition from polynomial used for earlier years.
  // 1580-1599
   130.8, 129.7, 128.6, 127.5, 126.4, 125.4, 124.3, 123.2, 122.1, 121.0,
   119.9, 118.8, 117.7, 116.6, 115.5, 114.5, 113.4, 112.3, 111.2, 110.1,

// From http://astro.ukho.gov.uk/nao/lvm/, with interpolated between-decade values.
  // 1600-1649
   109 , 107 , 106 , 104 , 103 , 101 , 99.7, 98.2, 96.8, 95.4,
   94.0, 92.6, 91.2, 89.8, 88.4, 87.0, 85.6, 84.2, 82.8, 81.4,
   80.0, 78.6, 77.2, 75.7, 74.3, 72.9, 71.5, 70.1, 68.7, 67.3,
   66.0, 64.7, 63.4, 62.2, 60.9, 59.7, 58.5, 57.4, 56.2, 55.1,
   54.0, 52.9, 51.9, 50.8, 49.8, 48.8, 47.8, 46.9, 45.9, 45.0,
  // 1650-1699
   44.0, 43.1, 42.1, 41.2, 40.2, 39.3, 38.4, 37.5, 36.7, 35.8,
   35.0, 34.2, 33.5, 32.7, 32.0, 31.3, 30.6, 30.0, 29.3, 28.6,
   28.0, 27.4, 26.7, 26.1, 25.5, 24.9, 24.3, 23.7, 23.1, 22.6,
   22.0, 21.4, 20.9, 20.4, 19.8, 19.3, 18.8, 18.3, 17.9, 17.4,
   17.0, 16.6, 16.3, 15.9, 15.6, 15.3, 15.0, 14.8, 14.5, 14.3,
  // 1700-1749
   14.0, 13.8, 13.5, 13.3, 13.0, 12.8, 12.6, 12.4, 12.3, 12.1,
   12.0, 11.9, 11.9, 11.8, 11.8, 11.8, 11.8, 11.9, 11.9, 11.9,
   12.0, 12.1, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8,
   13.0, 13.2, 13.3, 13.5, 13.7, 13.9, 14.1, 14.4, 14.6, 14.8,
   15.0, 15.2, 15.4, 15.6, 15.8, 16.0, 16.2, 16.4, 16.6, 16.8,
  // 1750-1799
   17.0, 17.2, 17.4, 17.6, 17.8, 18.0, 18.2, 18.4, 18.6, 18.8,
   19.0, 19.2, 19.5, 19.7, 19.9, 20.1, 20.4, 20.6, 20.7, 20.9,
   21.0, 21.1, 21.1, 21.1, 21.1, 21.1, 21.1, 21.1, 21.0, 21.0,
   21.0, 21.0, 21.0, 21.1, 21.1, 21.2, 21.2, 21.2, 21.2, 21.1,
   21.0, 20.9, 20.7, 20.5, 20.2, 19.9, 19.7, 19.3, 19.0, 18.7,

// From http://astro.ukho.gov.uk/nao/lvm/
  // 1800-1849
   18.4 , 18.0 , 17.6 , 17.3 , 16.9 , 16.6 , 16.3 , 16.0 , 15.8 , 15.7 ,
   15.7 , 15.7 , 15.8 , 16.0 , 16.2 , 16.4 , 16.5 , 16.7 , 16.7 , 16.7 ,
   16.5 , 16.2 , 15.8 , 15.3 , 14.8 , 14.1 , 13.5 , 12.8 , 12.1 , 11.4 ,
   10.8 , 10.2 ,  9.7 ,  9.3 ,  8.9 ,  8.5 ,  8.2 ,  8.0 ,  7.8 ,  7.7 ,
    7.6 ,  7.6 ,  7.7 ,  7.7 ,  7.9 ,  8.0 ,  8.2 ,  8.5 ,  8.7 ,  9.0 ,
  // 1850-1899
    9.3 ,  9.67,  9.98, 10.23, 10.37, 10.36, 10.18,  9.88,  9.54,  9.24,
    9.04,  8.99,  9.01,  8.97,  8.76,  8.25,  7.38,  6.22,  4.92,  3.59,
    2.37,  1.36,  0.56, -0.10, -0.65, -1.13, -1.58, -2.01, -2.43, -2.83,
   -3.21, -3.58, -3.91, -4.17, -4.34, -4.39, -4.31, -4.14, -3.97, -3.86,
   -3.88, -4.07, -4.37, -4.69, -4.93, -5.02, -4.87, -4.48, -3.86, -3.02,
  // 1900-1949
   -1.98, -0.75,  0.62,  2.06,  3.51,  4.92,  6.24,  7.49,  8.70,  9.90,
   11.14, 12.43, 13.75, 15.06, 16.32, 17.48, 18.52, 19.44, 20.25, 20.98,
   21.62, 22.19, 22.69, 23.12, 23.49, 23.79, 24.02, 24.20, 24.32, 24.39,
   24.42, 24.41, 24.38, 24.32, 24.25, 24.16, 24.08, 24.04, 24.06, 24.17,
   24.43, 24.83, 25.35, 25.92, 26.51, 27.05, 27.51, 27.89, 28.24, 28.58,

// From http://astro.ukho.gov.uk/nao/lvm/, mid-year values omitted
  // 1950-1999
   28.93, 29.32, 29.70, 30.00, 30.20, 30.41, 30.76, 31.34, 32.03, 32.65,
   33.07, 33.36, 33.62, 33.96, 34.44, 35.09, 35.95, 36.93, 37.96, 38.95,
   39.93, 40.95, 42.04, 43.15, 44.24, 45.28, 46.28, 47.29, 48.33, 49.37,
   50.36, 51.28, 52.13, 52.94, 53.70, 54.39, 54.98, 55.46, 55.89, 56.37,
   56.99, 57.70, 58.45, 59.19, 59.92, 60.68, 61.46, 62.23, 62.90, 63.42,
 // 2000-2019
   63.81, 64.08, 64.27, 64.41, 64.55, 64.73, 64.95, 65.20, 65.48, 65.77,
   66.06, 66.33, 66.61, 66.92, 67.28, 67.69, 68.11, 68.53, 68.92, 69.24

// From 2020 onward, data from timezone files, via updateDeltaTs().
// Get additional data from https://www.iers.org/IERS/EN/DataProducts/EarthOrientationData/eop.html
// As ΔT = 32.184 (for TDT - TAI) + (TAI - UTC)† - (UT1-UTC)
// † 37 seconds on 2021-04-27, as will likely remain for some time.
];

let historicDeltaT = clone(baseHistoricDeltaT);
let calibration = 0;
let lastTableYear = -1;
const preKnownLeapSeconds = getDayNumber_SGC(1958, 1, 1) + UNIX_TIME_ZERO_AS_JULIAN_DAY;
let postKnownLeapSeconds: number;

updateDeltaTs();

export function updateDeltaTs(post2019values?: number[], lastKnownLeapSecond?: YMDDate): void {
  if (!post2019values)
    post2019values = [69.36, 69.36];

  historicDeltaT = clone(baseHistoricDeltaT);
  historicDeltaT.push(...post2019values);
  calibration = 0;
  lastTableYear = -1;

  // const now = new DateTime().wallTime; // max(new DateTime(), new DateTime(Timezone.getDateAfterLastKnownLeapSecond(), 'UTC')).wallTime;
  let lastDay = Date.now() / DAY_MSEC;

  if (lastKnownLeapSecond)
    lastDay = max(lastDay, getDayNumber_SGC(lastKnownLeapSecond));

  const lastYMD = getDateFromDayNumber_SGC(lastDay);

  postKnownLeapSeconds = getDayNumber_SGC({ y: lastYMD.y + 1, m: lastYMD.m < 7 ? 1 : 7, d: 1 }) + UNIX_TIME_ZERO_AS_JULIAN_DAY;
}

export function getDeltaTAtJulianDate(timeJDE: number): number {
  const year = (timeJDE - JD_J2000) / 365.25 + 2000.0;

  // Do a three-point interpolation from either the table or the computed values.
  const tableMidYear = floor(year);
  const dt1 = deltaTAtStartOfYear(tableMidYear - 1);
  const dt2 = deltaTAtStartOfYear(tableMidYear);
  const dt3 = deltaTAtStartOfYear(tableMidYear + 1);
  const a = dt2 - dt1;
  const b = dt3 - dt2;
  const c = b - a;
  const n = year - tableMidYear;

  return dt2 + n * (a + b + n * c) / 2.0;
}

export function getDeltaTAtTaiMillis(millis: number): number {
  return getDeltaTAtJulianDate(millis / DAY_MSEC + UNIX_TIME_ZERO_AS_JULIAN_DAY);
}

export function utToTdt(timeJDU: number): number {
  let timeJDE = timeJDU;

  for (let i = 0; i < 5; ++i)
    timeJDE = timeJDU + getDeltaTAtJulianDate(timeJDE) / DAY_SEC;

  return timeJDE;
}

export function utToTai(timeJDU: number, asUtc = false): number {
  let utcMillis: number;
  let deltaTai: number;

  if (asUtc && preKnownLeapSeconds - 365 <= timeJDU && timeJDU <= postKnownLeapSeconds + 365) {
    utcMillis = round((timeJDU - UNIX_TIME_ZERO_AS_JULIAN_DAY) * DAY_MSEC);
    deltaTai = Timezone.findDeltaTaiFromUtc(utcMillis)?.deltaTai ?? 0;
  }

  if (asUtc && preKnownLeapSeconds <= timeJDU && timeJDU <= postKnownLeapSeconds)
    return timeJDU + deltaTai / DAY_SEC;

  const tai = utToTdt(timeJDU) - DELTA_TDT_DAYS;

  if (!asUtc || timeJDU < preKnownLeapSeconds - 365 || timeJDU > postKnownLeapSeconds + 365)
    return tai;

  const weight = (timeJDU <= preKnownLeapSeconds ? preKnownLeapSeconds - timeJDU : timeJDU - postKnownLeapSeconds);

  return ((timeJDU + deltaTai / DAY_SEC) * (365 - weight) + tai * weight) / 365;
}

export function utToTaiMillis(millis: number, asUtc = false): number {
  return round((utToTai(millis / DAY_MSEC + UNIX_TIME_ZERO_AS_JULIAN_DAY, asUtc) -
    UNIX_TIME_ZERO_AS_JULIAN_DAY) * DAY_MSEC);
}

export function tdtToUt(timeJDE: number): number {
  return timeJDE - getDeltaTAtJulianDate(timeJDE) / DAY_SEC;
}

export function tdtDaysToTaiMillis(timeJDE: number): number {
  return (timeJDE - UNIX_TIME_ZERO_AS_JULIAN_DAY) * DAY_MSEC - DELTA_TDT_MSEC;
}

export function taiDaysToUt(timeJDE: number): number {
  return tdtToUt(timeJDE + DELTA_TDT_DAYS);
}

export function taiMillisToTdt(millis: number): number {
  return (millis + DELTA_TDT_MSEC) / DAY_MSEC + UNIX_TIME_ZERO_AS_JULIAN_DAY;
}

export function taiToUtMillis(millis: number, forUtc = false): number {
  const tdt = millis / DAY_MSEC + UNIX_TIME_ZERO_AS_JULIAN_DAY + DELTA_TDT_DAYS;
  const timeJDU = tdtToUt(tdt);
  const jduMillis = (timeJDU - UNIX_TIME_ZERO_AS_JULIAN_DAY) * DAY_MSEC;

  if (!forUtc || timeJDU < preKnownLeapSeconds - 365 || timeJDU > postKnownLeapSeconds + 365)
    return round(jduMillis);

  const deltaTai = Timezone.findDeltaTaiFromTai(millis)?.deltaTai ?? 0;
  const utMillis = millis - deltaTai * 1000;

  if (preKnownLeapSeconds <= timeJDU && timeJDU <= postKnownLeapSeconds)
    return utMillis;

  const weight = (timeJDU <= preKnownLeapSeconds ? preKnownLeapSeconds - timeJDU : timeJDU - postKnownLeapSeconds);

  return round((utMillis * (365 - weight) + jduMillis * weight) / 365);
}

function deltaTAtStartOfYear(year: number): number {
  // Make the post-table approximations line up with the last tabular delta T.
  if (lastTableYear < 0) {
    lastTableYear = historicDeltaT.length + 1578; // Temporarily 1 less than it should be
    calibration = historicDeltaT[historicDeltaT.length - 1] - deltaTAtStartOfYear(lastTableYear + 1);
    console.log('calibration', calibration);
    ++lastTableYear;
  }

  // Polynomial expressions from http://eclipsewise.com/help/deltatpoly2014.html

  let t, u;

  if (year < -500) {
    u = (year - 1820) / 100;

    return -20 + 32 * u ** 2;
  }
  else if (year < 500) {
    u = year / 100.0;

    return 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3
           - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  }
  else if (year <= 1580) {
    u = (year - 1000.0) / 100.0;

    return 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3
           - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  }
  else if (year <= lastTableYear)
    return historicDeltaT[year - 1580];
  else if (year < 3000) {
    t = year - 2015;

    return calibration + 67.69 + 0.3645 * t + 0.0039755 * t ** 2;
  }

  u = (year - 1820.0) / 100.0;

  // Changed -20 in original expression to -171.82, so result matches above formula at year 3000
  return calibration - 171.82 + 32 * u ** 2;
}
