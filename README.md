# @tubular/time

Not all days are 24 hours. Some are 23 hours, or 25, or even 23.5 or 24.5 or 47. How about a Thursday followed directly by a Saturday, giving Friday the slip? Or a September only 19 days long? This is date/time library that handles both the day-to-day situations (so to speak) and the weird ones too.

## Key features

* Mutable and immutable DateTime objects supporting the Gregorian and Julian calendar systems, with settable crossover.
* IANA timezone support, with features beyond simply parsing and formatting using timezones, including an accessible listing of all available timezones and live updates of timezone definitions.
* Handles Local Mean Time, derived from longitude, to a resolution of one (time) minute.
* Supports and recognizes negative Daylight Saving Time.
* Many features available using a familiar Moment.js-style API.
* Extensive date/time manipulation and calculation capabilities.
* Astronomical time functions.
* Internationalization via JavaScript’s `Intl` Internationalization API, with additional built-in i18n support for issues not covered by `Intl`, and US-English fallback for environments without `Intl` support.
* Suitable for tree shaking and Angular optimization.
* Full TypeScript typing support.

<img src="https://shetline.com/readme/tubular-time/2.4.0/oct_1582.jpg" alt="October 1582">
<br>
<img src="https://shetline.com/readme/tubular-time/2.4.0/sep_1752.jpg" alt="September 1752">

**@tubular/time** is a collection of date and time classes and functions, providing extensive internationalized date/time parsing and formatting capabilities, date/time manipulations such as field-specific add/subtract, set, and roll; calendar computations; support for live-updatable IANA time zones; and a settable Julian/Gregorian calendar switchover date.

This library was originally developed for an astronomy website, <https://skyviewcafe.com>, and has some features of particular interest for astronomy and historical events, but has been expanded to provide many features similar to the now-legacy-status Moment.js.

Unlike Moment.js, IANA timezone handling is built in, not a separate module, with a compact set of timezone data that reaches roughly five years into the past and five years into the future, expanded into the past and future using Daylight Saving Time rules and/or values extracted from `Intl.DateTimeFormat`. Unlike the `Intl` API, the full list of available timezones is exposed, allowing the creation of timezone selection interfaces.

Two alternate large timezone definition sets, of approximately 280K each, are available, each serving slightly different purposes. These definitions can be bundled at compile time, or loaded dynamically at run time. You can also download live updates when the IANA Time Zone Database is updated.

## Installation

### Via npm

`npm install @tubular/time`

`import { ttime, DateTime, Timezone`...`} from '@tubular/time';`

...or...

`const { ttime, DateTime, Timezone`...`} = require('@tubular/time');`

Documentation examples will assume **@tubular/time** has been imported as above.

### Via `<script>` tag

```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
<script src="https://unpkg.com/@tubular/time/dist/web/index.js"></script>
```

The first script element is an example of optionally loading extended timezone definitions. Such a script element, if used, should precede the `index.js` script.

The package will be available via the global variable `tbTime`. `tbTime.ttime` is the default function, and other functions, classes, and constants will also be available on this variable, such as `tbTime.DateTime`, `tbTime.julianDay`, `tbTime.TIME_MS`, etc.

## Basic usage

While there are a wide range of functions and classes available from **@tubular/time**, the workhorse is the `ttime()` function, which produces immutable instances of the `DateTime` class.

`function ttime(initialTime?: number | string | DateAndTime | Date | number[] | null, format?: string, locale?: string | string[]): DateTime`

### Creating immutable `DateTime` instances with `ttime()`

`DateTime` instances can be created in many ways. The simplest way is to create a current-time instance, done by passing no arguments at all. Dates and times can also be expressed as strings, objects, and arrays of numbers.

|  |  | .toString() |
|---|---|---|
| `ttime()` | Current time | `DateTime<2021‑01‑28T03:29:12.040 ‑05:00>` |
| `ttime('1969‑07‑12T20:17')`<br>`ttime('1969‑07‑12T20:17Z')`<br>`ttime('20210704T0945-03')`<br>`ttime('2021‑W04‑4')` | DateTime from an ISO-8601 date/time string.<br>The trailing `Z` causes the time to be parsed as UTC. Without it, your default timezone is assumed. | `DateTime<1969‑07‑12T20:17:00.000 ‑04:00§>`<br>`DateTime<1969-07-12T20:17:00.000 +00:00>`<br>`DateTime<2021-07-04T09:45:00.000 -03:00>`<br>`DateTime<2021-01-28T00:00:00.000 -05:00>`
| `ttime('2021-w05-5')` | DateTime from an ISO-8601-like date/time variant for locale-based week numbering | `DateTime<2021-01-28T00:00:00.000 -05:00>` |
| `ttime('2017‑03‑02 14:45 Europe/Paris')` | From an ISO-8601 date/time (variant with space instead of `T`) and IANA timezone | `DateTime<2017-03-02T14:45:00.000 +01:00>` |
| `ttime('20:17:15')` | Dateless time from an ISO-8601 time string | `DateTime<20:17:15.000>` |
| `ttime(1200848400000)` | From millisecond timestamp | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime({ y: 2008, m: 1, d: 20, hrs: 12, min: 0 })` | From `DateAndTime` object, short-style field names | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime({ year: 2008, month: 1, day: 20, hour: 12, minute: 0 })` | From `DateAndTime` object, long-style field names | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime([2013, 12, 11, 10, 9, 8, 765])` | From numeric array: year, month, day, (hour (0-23), minute, second, millisecond), in that order. | `DateTime<2013-12-11T10:09:08.765 -05:00>` |
| `ttime(new Date(2008, 0, 20, 12, 0))` | From JavaScript `Date` object | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime('Feb 26 2021 11:00:00 GMT‑0500')` | ECMA-262 string<br>(Parsing performed by JavaScript `Date('`*time_string*`')`) | `DateTime<2021-02-26T11:00:00.000 ‑05:00>` |
| `ttime.unix(1318781876.721)` | From Unix timestamp | `DateTime<2011-10-16T12:17:56.721 -04:00§>` |
| `ttime.unix(1318781876.721, 'UTC')` | From Unix timestamp, with timezone | `DateTime<2011-10-16T16:17:56.721 +00:00>` |

When dealing Daylight Saving Time, and days when clocks are turned backward, some hour/minute combinations are repeated. The time might be 1:59, go back to 1:00, then forward again to 1:59, and only after hitting 1:59 for this second time during the day, move forward to 2:00.

By default, any ambiguous time is treated as the earlier time, the first occurrence of that time during a day. You can, however, use either an explicit UTC offset, or a subscript 2 (₂), to indicate the later time.

`ttime('11/7/2021 1:25 AM America/Denver', 'MM/DD/YYYY h:m a z').toString()` →<br>
`DateTime<2021-11-07T01:25:00.000 -06:00§>`

`ttime('11/7/2021 1:25₂ AM America/Denver', 'MM/DD/YYYY h:m a z').toString()` →<br>
`DateTime<2021-11-07T01:25:00.000₂-07:00>`

`ttime('2021-11-07 01:25 -07:00 America/Denver').toString()` →<br>
`DateTime<2021-11-07T01:25:00.000₂-07:00>`

## Formatting output

Dates and times can be formatted in a many ways, using a broad selection of format tokens, described in the table below.

For the greatest adherence to localized formats for dates and times, you can use the I*XX* format strings, which call directly upon `Intl.DateTimeFormat` (if available) to create localized dates, times, and combined dates/times.

You can also produce more customized, flexible formatting, specifying the order, positioning, and style (text vs. number, fully spelled out or abbreviated, with or without leading zeros) of each date/time field, with embedded punctuation and text as desired.

For example:

`ttime().format('ddd MMM D, y N [at] h:mm A z')` →<br>
`Wed Feb 3, 2021 AD at 8:59 PM EST`

`ttime().toLocale('de').format('ddd MMM D, y N [at] h:mm A z')` →<br>
`Mi 02 3, 2021 n. Chr. at 9:43 PM GMT-5`

Please note that, as most unaccented Latin letters are interpreted as special formatting characters, when using those characters as literal text they should be surrounded with square brackets, as with the word “at” above.

## Format string tokens

| | Token | Output |
|-------|------:|-------|
| Era | NNNNN<br>NNN,&nbsp;NN,&nbsp;N | BC AD<br><br>Abbreviated era (no distinction between narrow and abbreviated). |
| | NNNN | Before Christ, Anno Domini<br><br>Long-form era.
| | n | BC<br><br>Abbreviated era, only shows BC, not AD. When AD, leading space before `n` token is removed. |
| Year | YYYYYY | -001970 -001971 ... +001907 +001971<br><br>Always-signed years, padded to six digits |
| | YYYY | 1970 1971 ... 2029 2030<br><br>Padded to at least four digits. |
| | YY | 70 71 ... 29 30 |
| | Y | 1970 1971 ... 9999 +10000 +10001<br><br>Padded to at least four digits, `+` sign shown when over 9999. |
| | y | 1 2 ... 2020 ...<br>Era year, for use with BC/AD, never 0 or negative. |
| Week year (ISO) | GGGG | 1970 1971 ... 2029 2030, `+` sign shown when over 9999. |
| | GG | 70 71 ... 29 30 |
| Week year (locale) | gggg | 1970 1971 ... 2029 2030, `+` sign shown when over 9999. |
| | gg | 70 71 ... 29 30 |
| Quarter | Qo | 1st 2nd 3rd 4th |
| | Q | 1 2 3 4 |
| Month | MMMM | January February ... November December |
| | MMM | Jan Feb ... Nov Dec |
| | MM | 01 02 ... 11 12 |
| | M | 1 2 ... 11 12 |
| | Mo | 1st 2nd ... 11th 12th |
| Week (ISO) | WW | 01 02 ... 52 53 |
| | W | 1 2 ... 52 53 |
| Week (locale) | ww | 01 02 ... 52 53 |
| | w | 1 2 ... 52 53 |
| Day of month | DD | 01 02 ... 30 31 |
| | D | 1 2 ... 30 31 |
| | Do | 1st 2nd ... 30th 31st |
| Day of year | DDDD | 001 002 ... 364 365 366 |
| | DDD | 1 2 ... 364 365 366 |
| Day of week | dddd | Sunday Monday ... Friday Saturday |
| | ddd | Sun Mon ... Fri Sat |
| | dd | Su Mo ... Fr Sa |
| | d | 0 1 ... 5 6 |
| | do | 0th 1st ... 5th 6th |
| Day of Week (ISO) | E | 1 2 ... 6 7 |
| Day of Week (locale) | e | 1 2 ... 6 7<br><br>Note: this is 1-based, not 0-based, as in Moment.js |
| Hour | HH | 00-23 |
| | H | 0-23 |
| | hh | 01-12, for use with AM/PM |
| | h | 1-12, for use with AM/PM |
| | KK | 00-11, for use with AM/PM |
| | K | 0-11, for use with AM/PM |
| | kk | 01-24 |
| | k | 1-24 |
| Day period | A | AM PM |
| | a | am pm |
| Minute | mm | 00-59 |
| | m | 0-59 |
| Second | ss | 00-59
| | s | 0-59 |
| Fractional seconds | S | 0-9 (tenths of a second) |
| | SS | 00-99 (hundredths of a second) |
| | SSS | 000-999 (milliseconds) |
| | SSSS... | Additional zeros after milliseconds. |
| Timezone | ZZZ | America/New_York, Europe/Paris, etc.<br><br>IANA timezone, if available. |
| | zzz | Australian Central Standard Time, Pacific Daylight Time, etc.<br><br>Long form names, only for output &mdash; cannot be parsed. |
| | ZZ | -0700 -0600 ... +0600 +0700
| | zz,&nbsp;z | EST, CDT, MST, PDT, AEST, etc.<br><br>Please note that timezones in this format are not internationalized, and are not unambiguous when parsed. |
| | Z | -07:00 -06:00 ... +06:00 +07:00
| Unix timestamp | X | 1360013296 |
| Unix millisecond timestamp | x | 1360013296123 |
| Daylight Saving Time indicator | V | § # ^ ~ ❄<br><br>Symbol indicating DST is in effect.<br>This is typically §, meaning the clock has been turned forward one hour.<br># means two hours forward, ^ means half an hour, ~ is any other forward amount.<br>❄ is negative DST, i.e. “Winter Time”.<br>Renders one blank space when DST is not in effect. |
| | v | Same as above, but no blank space when DST is not in effect. |
| Occurrence indicator | R | 1:00 , 1:01 ... 1:58 , 1:59 , 1:00₂, 1:01₂ ... 1:58₂, 1:59₂, 2:00 , 2:01<br><br>A subscript 2 (₂) that denotes the second occurrence of the same clock time during a day when clocks are turned back for Daylight Saving Time. |
| | r | Same as above, but no blank space when subscript isn’t needed. |

**Moment.js formats not supported by @tubular/time:** DDDo, Wo, wo, yo

**@tubular/time formats not supported by Moment.js:** KK, K, kk, k, ZZZ, V, v, R, r, n, I*XX* (IFF, IFL, IFM... IxM, IxS)

## Moment.js-style localized formats

| | Token | Output |
| -------|------:|------- |
| Month name, day of month, day of week, year, time | LLLL | Thursday, September 4, 1986 8:30 PM |
| | llll | Thu, Sep 4, 1986 8:30 PM |
| Month name, day of month, year, time | LLL | September 4, 1986 8:30 PM |
| | lll | Sep 4, 1986 8:30 PM |
| Month name, day of month, year | LL | September 4, 1986 |
| | ll | Sep 4, 1986 |
| Month numeral, day of month, year | L | 09/04/1986 |
| | l | 9/4/1986 |
| Time with seconds | LTS | 8:30:25 PM |
| Time | LT | 8:30 PM |

## @tubular/time `Intl.DateTimeFormat` shorthand string formats

These start with a capital letter `I`, followed by one letter for the date format, which corresponds to the `dateStyle` option of `Intl.DateTimeFormat`, and one letter for the time format, corresponding to the `timeStyle` option.

The capital letters `F`, `L`, `M`, and `S` correspond to the option values `'full'`, `'long'`, `'medium'`, and `'short'`. `ILS` thus specifies a long style date and a short style time. `IL` is a long style date alone, without time. `IxS` a short style time without a date.

## Pre-defined formats

```javascript
ttime.DATETIME_LOCAL         = 'Y-MM-DD[T]HH:mm';
ttime.DATETIME_LOCAL_SECONDS = 'Y-MM-DD[T]HH:mm:ss';
ttime.DATETIME_LOCAL_MS      = 'Y-MM-DD[T]HH:mm:ss.SSS';
ttime.DATE                   = 'Y-MM-DD';
ttime.TIME                   = 'HH:mm';
ttime.TIME_SECONDS           = 'HH:mm:ss';
ttime.TIME_MS                = 'HH:mm:ss.SSS';
ttime.WEEK                   = 'GGGG-[W]WW';
ttime.WEEK_AND_DAY           = 'GGGG-[W]WW-E';
ttime.WEEK_LOCALE            = 'gggg-[w]ww';
ttime.WEEK_AND_DAY_LOCALE    = 'gggg-[w]ww-e';
ttime.MONTH                  = 'Y-MM';
```

### Examples

| Format | Output |
|---|---|
| IFF | `Thursday, September 4, 1986 at 8:30:00 PM Eastern Daylight Time` |
| ILM | `September 4, 1986 at 8:30:00 PM` |
| IS | `9/4/86` |
| IxL | `8:30:00 PM EDT` |

## Parsing with a format string, optional locale, with formatted output

| | .format('IMM') |
|---|---|
| `ttime('02/03/32', 'MM-DD-YY')` | `Feb 3, 2032, 12:00:00 AM` |
| `ttime('02/03/32', 'DD-MM-YY')` | `Mar 2, 2032, 12:00:00 AM` |
| `ttime('02/03/32 4:30 pm', 'DD-MM-YY hh:mm a', 'fr')` | `2 mars 2032 à 16:30:00` |
| `ttime('02/03/32', 'DD-MM-YYYY')` | `Mar 2, 0032, 12:00:00 AM` |
| `ttime('2032-03-02T16:30', null, 'ru')` | `2 мар. 2032 г., 16:30:00` |
| `ttime('2032-03-02T16:30', null, 'ar-sa')` | `٠٢‏/٠٣‏/٢٠٣٢ ٤:٣٠:٠٠ م` |
| `ttime('2032-03-02T16:30', null, 'zh-cn')` | `2032年3月2日 下午4:30:00` |

## Converting timezones

`ttime('2005-10-10 16:30 America/Los_Angeles').tz('Europe/Warsaw').toString()` →<br>
`DateTime<2005-10-11T01:30:00.000 +02:00>`

`ttime('2005-10-10 16:30 America/Los_Angeles').utc().toString()` →<br>
`DateTime<2005-10-10T23:30:00.000 +00:00>`

`ttime('2005-10-10 16:30 America/Los_Angeles').local().toString()` →<br>
`DateTime<2005-10-10T19:30:00.000 +04:00>`

## Converting locales

`ttime('7. helmikuuta 2021', 'IL', 'fi').toLocale('de').format('IL')` →<br>
`7. Februar 2021`

## The `YMDDate` and `DateAndTime` objects

`YMDate`:

```json5
{
  y: 2021, // short for year
  q: 1, // short for quarter
  m: 2, // short for month
  d: 4, // short for day
  dow: 4, // short for dayOfWeek
  dowmi: 1, // dayOfWeekMonthIndex
  dy: 35, // short for dayOfYear
  n: 18662, // short for epochDay
  j: false, // short for isJulian

  year: 2021,
  quarter: 1, // quarter of the year 1-4
  month: 2,
  day: 4,
  dayOfWeek: 4, // Day of week as 0-6 for Sunday-Saturday
  dayOfWeekMonthIndex: 1, // Day of week month index, 1-5, e.g. 2 for 2nd Tuesday of the month
  dayOfYear: 35,
  epochDay: 18662, // days since January, 1 1970
  isJulian: false, // true if a Julian calendar date instead of a Gregorian date

  yw: 2021, // short for yearByWeek
  w: 5, // short for week
  dw: 4, // short for dayByWeek
  yearByWeek: 2021, // year that accompanies an ISO year/week/day-of-week style date
  week: 5, // week that accompanies an ISO year/week/day-of-week style date
  dayByWeek: 4, // day that accompanies an ISO year/week/day-of-week style date

  ywl: 2021, // short for yearByWeekLocale
  wl: 6, // short for weekLocale
  dwl: 5, // short for dayByWeekLocale
  yearByWeekLocale: 2021, // year that accompanies an locale-specific year/week/day-of-week style date
  weekLocale: 6, // week that accompanies an locale-specific year/week/day-of-week style date
  dayByWeekLocale: 5, // day that accompanies an locale-specific year/week/day-of-week style date

  error: 'Error description if applicable, otherwise undefined'
}
```

`DateAndTime`, which extends the `YMDDate` interface:

```json5
{
  hrs: 0, // short for hour
  min: 18, // short for minute
  sec: 32, // short for second
  hour: 0,
  minute: 18,
  second: 32,
  millis: 125, // 0-999 milliseconds part of time

  utcOffset: -18000, // offset (in seconds) from UTC, negative west from 0°, including DST offset when applicable
  dstOffset: 0, // DST offset, in minutes - usually positive, but can be negative
  occurrence: 1, // usually 1, but can be 2 for the second occurrence of the same wall clock time during a single day, caused by clock being turned back for DST
}
```

When using a `YMDDate` or `DateAndTime` object to create a `DateTime` instance, you need only set a minimal number of fields to specify the date and/or time you are trying to specify. You can use either short or long names for fields (if you use both, the short form takes priority).

At minimum, you must specify a date or a time. If you only specify a date, the time will be treated as midnight at the start of that date. If you only specify a time, you can create a special dateless time instance. You can also, of course, specify both date and time together.

In specifying a date, the date fields have the following priority:

* `n` / `epochDay`: Number of days before/after epoch day 0, which is January 1, 1970.
* `y` / `year`: A normal calendar year. Along with the year, you can specify:
  * Nothing more, in which case the date is treated as January 1 of that year.
  * `m` / `month`: The month (a normal 1-12 month, not the weird 0-11 month the JavaScript `Date` uses!).
    * If nothing more is given, the date is treated as the first of the month.
    * `d` / `day`: The date of the month.
  * `dy` / `dayOfYear`: The 1-based number of days into the year, such that 32 means February 1.
* `yw` / `yearByWeek`: An ISO week-based calendar year, where each week starts on Monday. This year is the same as the normal calendar year for most of the calendar year, except for, possibly, a few days at the beginning and end of the year. Week 1 is the first week that contains January 4. Along with this style of year, you can specify:
    * Nothing more, in which case the date is treated as the first day of the first week of the year.
    * `w` / `week`: The 1-based week number.
      * If nothing more, the date is treated as the first day of the given week.
      * `dw` / `dayByWeek`: The 1-based day of the given week.
* `ywl` / `yearByWeekLocale`, etc: These fields work the same as `yw` / `yearByWeek`, etc., except that they apply to locale-specific rules for the day of the week on which each week starts, and for the definition of the first week of the year.

In specifying a time, the minimum needed is a 0-23 value for `hrs` / `hour`. All other unspecified time fields will be treated as 0.

As discussed earlier when parsing strings, ambiguous times due to Daylight Saving Time can default to the earlier of two times. You can, however, use `occurrence: 2` to explicitly specify the later time. An explicit `utcOffset` can also accomplish disambiguation.

## Reading individual `DateTime` fields

As an output from a `DateTime` instance, such as what you get from `ttime().wallTime`, all `DateAndTime` fields will be filled in with synchronized values. `ttime().wallTime.hour` provides the hour value, `ttime().wallTime.utcOffset` provides the UTC offset in seconds for the given time, etc.

`ttime().wallTimeShort` returns a `DateAndTime` object with all available short-form field names, and `ttime().wallTimeLong` only long-form field names.

## Modifying `DateTime` values

There are six main methods for modifying a `DateTime` value:

* `add(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = true): DateTime`
* `subtract(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = true): DateTime`
* `roll(field: DateTimeField | DateTimeFieldName, amount: number, minYear = 1900, maxYear = 2099)`
* `set(field: DateTimeField | DateTimeFieldName, value: number, loose = false): DateTime`
* `startOf(field: DateTimeField | DateTimeFieldName): DateTime`
* `endOf(field: DateTimeField | DateTimeFieldName): DateTime`

> Before going further, it needs to be mentioned that `DateTime` instances can be either locked, and thus immutable, or unlocked. Instances generated using `ttime(`...`)` are locked. Instances created using [the `DateTime` constructor](#the-datetime-constructor) (covered later in this document) are created unlocked, but can be locked after creation.

When you use the add/subtract/roll/set methods on a locked instance, a new modified and locked instance is returned. When used on an unlocked instance, these methods modify the instance itself is modified, and a reference to that same instance is returned.

### Using `add` (and `subtract`)

The `add()` method is the main method here. `subtract()` is nothing more than a convenience method that negates the amount being added, and then calls `add()`, so I will speak of this going forward in terms of the `add()` method.

An example of using `add()`:

`ttime().add('year', 1)` or `ttime().add(DateTimeField.YEAR, 1)`

The above produces a date one year later than the current time. In most cases, this means that the resulting date has the same month and date, but in the case of a leap day:

`ttime('2024-02-29').add('year', 1)..toIsoString(10)` → `2025-02-28`

...the date is pinned to 28 so that an invalid date is not created. Similarly, when adding months, invalid dates are prevented:

`ttime('2021-01-31').add(DateTimeField.MONTH, 1).toIsoString(10)` → `2021-02-28`

You can `add` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`, as provided by the `DateTimeField` enum, or their string equivalents (`'milli'`, `'millis'`, `'millisecond'`, `'milliseconds'`... `'day'`, `'days'`, `'date'`, `'month'`, `'months'`, etc.)

For fields `MILLI` through `HOUR`, fixed units of time, multiplied by the `amount` you pass, are applied. When dealing with months, quarters, and years, the variable lengths of months, quarters, and years apply.

`DAY` amounts can be handled either way, as variable in length (due to possible effects of Daylight Saving Time), or fixed units of 24 hours. The default for `variableDays` is `true`.

DST can alter the duration of days, typically adding or subtracting an hour, but other amounts of change are possible (like the half-hour shift used by Australia’s Lord Howe Island), so adding days can possibly cause the hour (and even minute) fields to change:

`ttime('2021-02-28T07:00 Europe/London', false).add('days', 100).toIsoString()` →<br>
`2021-06-08T08:00:00.000+01:00` (note shift from 7:00 to 8:00)

`ttime('2021-02-28T07:00 Australia/Lord_Howe, false').add('days', 100).toIsoString()` →<br>
`2021-06-08T06:30:00.000+10:30` (note shift from 7:00 to 6:30)

By default, however, hour and minute fields remain unchanged.

`ttime('2021-02-28T07:00 Australia/Lord_Howe').add('days', 100).toIsoString()` →<br>
`2021-06-08T07:00:00.000+10:30`

Even with the default behavior, however, it is still possible hours and minutes my change, in just the same way adding one month to January 31 does not yield February 31. When clocks are turned forward, some times of day simply do not exist, so a result might have to be adjusted to a valid hour and minute in some cases.

`ttime('2000-04-27T00:30 Africa/Cairo').add('day', 1).toString()` →<br>
`DateTime<2000-04-28T01:30:00.000 +03:00§>` (clock turned forward at midnight to 1:00)

### Using `roll()`

You can use the `roll()` method to “spin” through values for each date/time field. This can be used for a user interface where you select a field and use up/down arrows to change the value, and the value changes in a wrap-around fashion, like ...58 → 59 → 00 → 01..., etc.

While seconds and minutes wrap at 59, and dates wrap at the length of the current month, there’s no natural wrapping boundaries for years. The wrap-range defaults to 1900-2099, but you can pass optional arguments to change this range (this only effects years, not other units).

You can `roll` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `AM_PM`, `DAY`, `DAY_OF_WEEK`, `DAY_OF_WEEK_LOCALE`, `DAY_OF_YEAR`, `WEEK`, `WEEK_LOCALE`, `MONTH`, `YEAR`, `YEAR_WEEK`, `YEAR_WEEK_LOCALE`, `ERA`.

For the purpose of the `roll()` method, `AM_PM` and `ERA` are treated as numeric values. AM and BC are 0, PM and AD are 1. If you roll by an odd number, the value is changed. If you roll by an even value, the value will be unchanged.

Examples of using `role()`:

`ttime('1690-09-15').roll('month', 5).toIsoString(10)` → `1690-05-15`<br>
`ttime('1690-09-15').roll('era', 1).format('MMM D, y N')` → `Sep 15, 1690 BC`<br>
`ttime('10:15').roll('ampm', 1).format('h:mm A')` → `10:15 PM`

### Using `set()`

This method sets date/time fields to explicit values. In the default mode, you can only use valid values for each particular field. In the `loose` mode, some leeway is given, such as allowing the date to be set to 31 when the month is September (resulting in October 1), or allowing the month to be set to 0 (meaning December of the previous year) or 13 (January of the next year). Using these loose values means, of course, that other fields besides the one field being set might change.

You can `set` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `AM_PM`, `DAY`, `DAY_OF_WEEK`, `DAY_OF_WEEK_LOCALE`, `DAY_OF_YEAR`, `WEEK`, `WEEK_LOCALE`, `MONTH`, `YEAR`, `YEAR_WEEK`, `YEAR_WEEK_LOCALE`, `ERA`.

Examples of using `set()`:

`ttime('1690-09-15').set('month', 5).toIsoString(10)` → `1690-02-15`<br>
`ttime('1690-09-15').set('month', 13, true).toIsoString(10)` → `1691-01-15`

### Using `startOf()` and `endOf()`

These functions transform a `DateTime` to the beginning or end of a given unit of time.

`ttime('2300-05-05T04:08:10.909').startOf(DateTimeField.MINUTE).toIsoString(23)` →<br>
`2300-05-05T04:08:00.000`

`ttime('2300-05-05T04:08:10.909').startOf('hour').toIsoString(23)` →<br>
`2300-05-05T04:00:00.000`

`ttime('2300-05-05T04:08:10.909').startOf(DateTimeField.WEEK).format(ttime.WEEK_AND_DAY)` →<br>
`2300-W18-1`

`ttime('2300-05-05T04:08:10.909').startOf('year').toIsoString(23)` →<br>
`2300-01-01T00:00:00.000`

`ttime('2300-05-05T04:08:10.909').endOf('day').toIsoString(23)` →<br>
`2300-05-05T23:59:59.999`

`ttime('2300-05-05T04:08:10.909').endOf(DateTimeField.MONTH).toIsoString(23)` →<br>
`2300-05-31T23:59:59.999`

## Time value

In milliseconds:

`ttime().utcTimeMillis`

In seconds:

`ttime().utcTimeSeconds`

As native JavaScript `Date` object:

`ttime().toDate()`

## Timezone offsets from UTC

Offset from UTC for a given `DateTime` in seconds, negative for timezones west of the Prime Meridian, including any change due to Daylight Saving Time when applicable:

`ttime().utcOffsetSeconds`

Offset from UTC for a given `DateTime` in minutes:

`ttime().utcOffsetMinutes`

Change in seconds from a timezone’s standard UTC offset due to Daylight Saving Time. This will be 0 when DST is not in effect, or always 0 if DST is never in effect. While usually a positive number, some timezones (like Europe/Dublin) employ negative DST during the winter:

`ttime().dstOffsetSeconds`

Change in minutes from a timezone’s standard UTC offset due to Daylight Saving Time:

`ttime().dstOffsetMinutes`

Returns `true` when a moment in time is during DST, `false` otherwise:

`ttime().isDST()`

## Validation

When an invalid `DateTime` instance is created, the `valid` property returns `false`, and the `error` property (which is otherwise `undefined`) returns a description of the error.

`ttime('1234-56-78').valid` → `false`<br>
`ttime('1234-56-78').error` → `'Invalid month: 56'`

Parsing of date and times specified as strings is somewhat loose. When no format string is provided, dates are parsed according to ISO-8601, with leniency about leading zeros when delimiters are used. Pseudo-months 0 and 13 are accepted, as are days of the month from 0 to 32, regardless of the length of a given month. Years can be in the range -271820 to 275759.

When parsing using a format string, especially formats where months are numeric, not textual, strict matching of delimiters is not required. For example, even though proper output formatting is done with dots, for input dashes as well as dots are acceptable:

`ttime('2021-02-08', null, 'de').format('IS')` → `08.02.21`<br>
`ttime('08.02.21', 'IS', 'de').format('IS')` → `08.02.21`<br>
`ttime('008-2-21', 'IS', 'de').format('IS')` → `08.02.21`

Except in compact, delimiter-free ISO formats like `20210208`, leading zeros are never required. Extra, unexpected leading zeros are generally ignored, although an ISO date month should have no more than two digits, and when a two-digit year is expected, a 3-digit year such as 021 will be treated as 21 AD, not 2021.

_Future releases may offer options for stricter parsing._

## Comparison and sorting

You can test whether moments in time expressed as `DateTime` instances are before, after, or the same as each other. By default, this comparison is exact to the milliseconds. You can, however, pass an optional unit of time for the resolution of the comparison.

`ttime('2020-08-31').isBefore('2020-09-01')` → `true`<br>
`ttime('2020-08-31').isBefore('2020-09-01', 'year')` → `false`<br>
`ttime('2020-08-31').isSameOrBefore('2020-08-03')` → `false`<br>
`ttime('2020-08-31').isSameOrBefore('2020-08-03', 'month')` → `true`<br>
`ttime('2020-08-31 07:45').isAfter('2020-08-31 07:43')` → `true`<br>
`ttime('2020-08-31 07:45').isAfter('2020-08-31 07:43', 'hour')` → `true`

The full list of functions for these comparisons is as follows: `isBefore`, `isSameOrBefore`, `isSame`, `isSameOrAfter`, `isAfter`.

You can also check if a `DateTime` instance is chronologically, non-inclusively between two other `DateTime` instances:

`ttime().isBetween('1776-06-04', '1809-02-12')` → `false`

There are two general comparison functions that, when comparing two `DateTime` instances, return a negative number if the first is less than the second, 0 if the two are equal at the given resolution, or a positive number if the first instance is greater than the second. This is the style of comparison function that works with JavaScript `sort`.

`ttime().compare('1776-06-04')` → `7721460952408`<br>
`ttime().compare(ttime(), 'minute')` → `0`<br>
`ttime().compare('3776-06-04')` → `-55392442920503`<br>
`DateTime.compare(ttime('1776-06-04'), ttime('1809-02-12'))` → `-1031616000000`

### Sorting an array of dates

`ttime.sort(dates: DateTime[], descending = false): DateTime[]`

This sort modifies the array which is passed in, and returns that same array.

### min/max functions

`ttime.min(...dates: DateTime[]): DateTime`<br>
`ttime.max(...dates: DateTime[]): DateTime`

## Monthly calendar generation

The `DateTime` method `getCalendarMonth()` returns an array of `YMDDate` objects, the zeroth date object being on the locale-specific first day of the week (possible from the preceding month), with multiple-of-7 length of dates to represent a full month. As an example, filtered down to just the day-of-month for visual clarity:

`ttime().getCalendarMonth().map(date => date.m === 2 ? date.d : '-')` →

```json5
[
  '-', 1,   2,   3,   4,   5,   6,
  7,   8,   9,   10,  11,  12,  13,
  14,  15,  16,  17,  18,  19,  20,
  21,  22,  23,  24,  25,  26,  27,
  28, '-',  '-', '-', '-', '-', '-'
]
```

For the above example, the current date was February 11, 2021, so the calendar was generated for that month. The locale was `'en-us'`, so each week starts on Sunday.

The utility of this method is more evident with when viewing the calendar generated for October 1582, when (by default) the Julian calendar ends, and the Gregorian calendar begins:

`ttime('1582-10-01', null, 'fr').getCalendarMonth().map(date => date.d)` →

```json5
[
   1,  2,  3,  4, 15, 16, 17,
  18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31
]
```

By using the locale `'fr'`, the calendar generated above starts on Monday instead of Sunday. Notice how the 4th of the month is immediately followed by the 15th.

## The `DateTime` class

The main `ttime()` function works by creating instances of the `DateTime` class. You can use `new DateTime(`...`)` to create instances of `DateTime` directly. This is necessary for taking advantage of support for variable switch-over from the Julian to the Gregorian calendar, which by default is set at October 15, 1582.

### Constructor

```
  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null, gregorianChange?: GregorianChange);

  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null, locale?: string | string[], gregorianChange?: GregorianChange);
```

All arguments to the constructor are optional. When passed no arguments, `new DateTime()` will return an instance for the current moment, in the default timezone, default locale, and with the default October 15, 1582 Gregorian calendar switch-over.

* `initialTime`: This can be a single number (for milliseconds since 1970-01-01T00:00 UTC), an ISO-8601 date as a string, and ECMA-262 date as string, an ASP.​NET JSON date string, a JavaScript `Date` object, [a `DateAndTime` object](the-dateandtime-object), an array of numbers (in the order year, month, day, hour, etc.), or a `null`, which causes the current time to be used.
* `timezone`: a `Timezone` instance, a string specifying an IANA timezone (e.g. 'Pacific/Honolulu') or a UTC offset (e.g. 'UTC+04:00'), or `null` to use the default timezone.
* `locale`: a locale string (e.g. 'fr-FR'), an array of locales strings in order of preference (e.g. ['fr-FR', 'fr-CA', 'en-US']), or `null` to use the default locale.
* `gregorianChange`: The first date when the Gregorian calendar is active, the string `'J'` for a pure Julian calendar, the string 'G' for a pure Gregorian calendar, the constant `ttime.PURE_JULIAN`, the constant `ttime.PURE_GREGORIAN`, or `null` for the default of 1582-10-15. A date can take the form of a year-month-day ISO-8601 date string (e.g. '1752-09-14'), a year-month-day numeric array (e.g. [1918, 2, 14]), or a date as a `DateAndTime` object.

As a string, `initialTime` can also include a trailing timezone or UTC offset, using the letter `Z` to indicate UTC (e.g. '1969‑07‑12T20:17Z'), or a specific timezone (e.g. '1969‑07‑12T20:17Z', '1969‑07‑12T16:17 EDT', '1969‑07‑12T16:17 America/New_York', or '1969‑07‑12T16:17-0400').

If the `timezone` argument is itself `null` or unspecified, this embedded timezone will become the timezone for the `DateTime` instance. If the `timezone` argument is also provided, the time will be parsed according to the first timezone, then it will be transformed to the second timezone.

