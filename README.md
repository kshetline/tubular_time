# @tubular/time

Not all days are 24 hours. Some are 23 hours, or 25, or even 23.5 or 24.5 or 47 hours. Some minutes are 61 seconds long. How about a Thursday followed directly by a Saturday, giving Friday the slip? Or a September only 19 days long? This is a date/time library for handling both day-to-day situations (so to speak) and some weird ones too.

[![npm](https://img.shields.io/npm/v/@tubular/time.svg)](https://www.npmjs.com/package/@tubular/time/) [![Build Status](https://img.shields.io/travis/kshetline/tubular_time/master.svg)](https://travis-ci.com/github/kshetline/tubular_time/) [![Coverage Status](https://coveralls.io/repos/github/kshetline/tubular_time/badge.svg?branch=master)](https://coveralls.io/github/kshetline/tubular_time) [![npm downloads](https://img.shields.io/npm/dm/@tubular/time.svg)](https://npmjs.org/package/@tubular/time/) ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@tubular/time)  ![license](https://img.shields.io/badge/licence-mit-informational)

## Key features<!-- omit in toc -->

* Mutable and immutable DateTime objects supporting the Gregorian and Julian calendar systems, with settable crossover.
* IANA timezone support, with features beyond formatting using timezones, such as parsing, accessible listings of all available timezones (single-array list, grouped by UTC offset, or grouped by region), and live updates of timezone definitions.
* Supports leap seconds and conversions between TAI (International Atomic Time) and UTC (Universal Coordinated Time).
* Supports and recognizes negative Daylight Saving Time.
* Extensive date/time manipulation and calculation capabilities.
* Many features available using a familiar Moment.js-style API.
* Astronomical time conversions among TDT (Terrestrial Dynamic Time), UT1, UTC and TAI.
* Local mean time, by geographic longitude, to one minute (of time) resolution.
* Astronomical time conversions among TDT (Terrestrial Dynamic Time), UT1, UTC and TAI, as well as local mean time, by geographic longitude, to one minute (of time) resolution.
* Internationalization via JavaScript’s `Intl` Internationalization API, with additional built-in i18n support for issues not covered by `Intl`, and US-English fallback for environments without `Intl` support.
* Package suitable for tree shaking and Angular optimization.
* Full TypeScript typing support.

<img src="https://shetline.com/readme/tubular-time/2.4.0/montage.jpg" alt="October 1582">

**@tubular/time** is a collection of date and time classes and functions, providing extensive internationalized date/time parsing and formatting capabilities, date/time manipulations such as field-specific add/subtract, set, and roll; calendar computations; support for live-updatable IANA time zones; and a settable Julian/Gregorian calendar switchover date.

This library was originally developed for an astronomy website, <https://skyviewcafe.com>, and has some features of particular interest for astronomy and historical events, but has been expanded to provide many features similar to the now-legacy-status Moment.js.

Unlike Moment.js, IANA timezone handling is built in, not a separate module, with a compact set of timezone definitions that reach roughly five years into the past and five years into the future, expanded into the past and future using Daylight Saving Time rules and/or values extracted from `Intl.DateTimeFormat`. Unlike the `Intl` API, the full list of available timezones is exposed, facilitating the creation of timezone selection interfaces.

Two alternate large timezone definition sets, of approximately 280K each, are available, each serving slightly different purposes. These definitions can be bundled at compile time, or loaded dynamically at run time. You can also download live updates when the IANA Time Zone Database is updated.

- [Installation](#installation)
  - [Via npm](#via-npm)
  - [Via `<script>` tag](#via-script-tag)
- [Basic usage](#basic-usage)
  - [Creating immutable `DateTime` instances with `ttime()`](#creating-immutable-datetime-instances-with-ttime)
- [Formatting output](#formatting-output)
  - [Special CJK date formatting options](#special-cjk-date-formatting-options)
- [Format string tokens](#format-string-tokens)
- [Moment.js-style localized formats](#momentjs-style-localized-formats)
- [@tubular/time `Intl.DateTimeFormat` shorthand string formats](#tubulartime-intldatetimeformat-shorthand-string-formats)
  - [Examples](#examples)
- [Pre-defined formats](#pre-defined-formats)
- [Parsing with a format string, and optionally a locale](#parsing-with-a-format-string-and-optionally-a-locale)
- [Converting timezones](#converting-timezones)
- [Converting locales](#converting-locales)
- [Defining and updating timezones](#defining-and-updating-timezones)
  - [Live timezone updates](#live-timezone-updates)
- [The `YMDDate` and `DateAndTime` objects](#the-ymddate-and-dateandtime-objects)
- [Reading individual `DateTime` fields](#reading-individual-datetime-fields)
- [Modifying `DateTime` values](#modifying-datetime-values)
  - [Using `add` (and `subtract`)](#using-add-and-subtract)
  - [Using `roll()`](#using-roll)
  - [Using `set()`](#using-set)
  - [Using `startOf()` and `endOf()`](#using-startof-and-endof)
- [Time value](#time-value)
- [Timezone offsets from UTC](#timezone-offsets-from-utc)
- [Validation](#validation)
- [Comparison and sorting](#comparison-and-sorting)
  - [Sorting an array of dates](#sorting-an-array-of-dates)
  - [min/max functions](#minmax-functions)
- [Monthly calendar generation](#monthly-calendar-generation)
- [Dealing with weird months](#dealing-with-weird-months)
  - [Methods](#methods)
  - [Another way to drop a day](#another-way-to-drop-a-day)
- [Dealing with weird days](#dealing-with-weird-days)
  - [Typical Daylight Saving Time examples](#typical-daylight-saving-time-examples)
  - [Examples of big UTC offset shifts due to moving the International Dateline](#examples-of-big-utc-offset-shifts-due-to-moving-the-international-dateline)
- [Leap Seconds, TAI, and Julian Dates](#leap-seconds-tai-and-julian-dates)
  - [Leap second time values](#leap-second-time-values)
  - [TAI field values](#tai-field-values)
  - [Converting from UT/UTC to TAI, and back again](#converting-from-ututc-to-tai-and-back-again)
  - [Astronomical `DateAndTime` fields](#astronomical-dateandtime-fields)
  - [`epochMillis`, `utcMillis`, and `taiMillis` getters/setters](#epochmillis-utcmillis-and-taimillis-getterssetters)
  - [Sorting and comparison with TAI and non-TAI `DateTime` instances](#sorting-and-comparison-with-tai-and-non-tai-datetime-instances)
- [Global default settings](#global-default-settings)
- [The `DateTime` class](#the-datetime-class)
  - [Constructor](#constructor)
  - [Locking and cloning](#locking-and-cloning)
  - [`DateTime` astronomical time functions](#datetime-astronomical-time-functions)
  - [`DateTime` static constant](#datetime-static-constant)
  - [`DateTime` static methods](#datetime-static-methods)
  - [`DateTime` getters](#datetime-getters)
  - [`DateTime` getter/setters](#datetime-gettersetters)
  - [Other `DateTime` methods](#other-datetime-methods)
- [The `Calendar` class](#the-calendar-class)
- [The `Timezone` class](#the-timezone-class)
  - [Static `Timezone` constants](#static-timezone-constants)
  - [Static `Timezone` getter](#static-timezone-getter)
  - [`LeapSecondInfo` interface](#leapsecondinfo-interface)
  - [Static `Timezone` methods](#static-timezone-methods)
  - [`Timezone` getters](#timezone-getters)
  - [`Timezone` methods](#timezone-methods)
- [Other functions available on `ttime`](#other-functions-available-on-ttime)
- [Constants available on `ttime`](#constants-available-on-ttime)

## Installation

### Via npm

`npm install @tubular/time`

`import { ttime, DateTime, Timezone`...`} from '@tubular/time'; // ESM`

...or...

`const { ttime, DateTime, Timezone`...`} = require('@tubular/time/cjs'); // CommonJS`

Documentation examples will assume **@tubular/time** has been imported as above.

### Via `<script>` tag

To remotely download the full code as an ES module:

```html
<script type="module">
  import('https://unpkg.com/@tubular/time/dist/fesm2015/index.mjs').then(pkg => {
    const { ttime, DateTime, Timezone} = pkg;

    // ...
  });
</script>
```

For the old-fashioned UMD approach (which can save you from about 560K of extra data):

```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
<script src="https://unpkg.com/@tubular/time/dist/umd/index.js"></script>
```

_(Or ...`/data/timezone-large.js"`)_

The script element just above the `index.js` URL is an example of _optionally_ loading extended timezone definitions. Such a script element, if used, should precede the `index.js` script.

The **@tubular/time** package will be available via the global variable `tbTime`. `tbTime.ttime` is the default function, and other functions, classes, and constants will also be available on this variable, such as `tbTime.DateTime`, `tbTime.julianDay`, `tbTime.TIME_MS`, etc.

## Basic usage

While there are a wide range of functions and classes available from **@tubular/time**, the workhorse is the `ttime()` function, which produces immutable instances of the `DateTime` class.

`function ttime(initialTime?: number | string | DateAndTime | Date | number[] | null, format?: string, locale?: string | string[]): DateTime`

### Creating immutable `DateTime` instances with `ttime()`

`DateTime` instances can be created in many ways. The simplest way is to create a current-time instance, done by passing no arguments at all. Dates and times can also be expressed as strings, objects, and arrays of numbers.

|                                                                                                                     |                                                                                                                                                  | .toString()                                                                                                                                                                           |
|---------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ttime()`                                                                                                           | Current time.                                                                                                                                    | `DateTime<2021‑01‑28T03:29:12.040 ‑05:00>`                                                                                                                                            |
| `ttime('1969‑07‑12T20:17')`<br>`ttime('1969‑07‑12T20:17Z')`<br>`ttime('20210704T0945-03')`<br>`ttime('2021‑W04‑4')` | DateTime from an ISO-8601 date/time string.<br>A trailing `Z` causes the time to be parsed as UTC. Without it, your default timezone is assumed. | `DateTime<1969‑07‑12T20:17:00.000 ‑04:00§>`<br>`DateTime<1969-07-12T20:17:00.000 +00:00>`<br>`DateTime<2021-07-04T09:45:00.000 -03:00>`<br>`DateTime<2021-01-28T00:00:00.000 -05:00>` |
| `ttime('2021-w05-5')`                                                                                               | DateTime from an ISO-8601-like date/time variant (lowercase `w` instead of uppercase `W`) for locale-based week numbering.                       | `DateTime<2021-01-28T00:00:00.000 -05:00>`                                                                                                                                            |
| `ttime('2017‑03‑02 14:45 Europe/Paris')`                                                                            | From an ISO-8601 date/time (variant with space instead of `T`) and IANA timezone.                                                                | `DateTime<2017-03-02T14:45:00.000 +01:00>`                                                                                                                                            |
| `ttime('20:17:15')`                                                                                                 | Dateless time from an ISO-8601 time string.                                                                                                      | `DateTime<20:17:15.000>`                                                                                                                                                              |
| `ttime(1200848400000)`                                                                                              | From a millisecond timestamp.                                                                                                                    | `DateTime<2008-01-20T12:00:00.000 -05:00>`                                                                                                                                            |
| `ttime({ tai: 1200848400000 })`                                                                                     | From a TAI millisecond timestamp.                                                                                                                | `DateTime<2008-01-20T12:00:00.000 -05:00>`                                                                                                                                            |
| `ttime({ y: 2008, m: 1, d: 20, hrs: 12, min: 0 })`                                                                  | From a `DateAndTime` object, short-style field names.                                                                                            | `DateTime<2008-01-20T12:00:00.000 -05:00>`                                                                                                                                            |
| `ttime({ year: 2008, month: 1, day: 20, hour: 12, minute: 0 })`                                                     | From a `DateAndTime` object, long-style field names.                                                                                             | `DateTime<2008-01-20T12:00:00.000 -05:00>`                                                                                                                                            |
| `ttime([2013, 12, 11, 10, 9, 8, 765])`                                                                              | From a numeric array: year, month, day, (hour (0-23), minute, second, millisecond), in that order.                                               | `DateTime<2013-12-11T10:09:08.765 -05:00>`                                                                                                                                            |
| `ttime(new Date(2008, 0, 20, 12, 0))`                                                                               | From a JavaScript `Date` object.                                                                                                                 | `DateTime<2008-01-20T12:00:00.000 -05:00>`                                                                                                                                            |
| `ttime('Feb 26 2021 11:00:00 GMT‑0500')`                                                                            | From an ECMA-262 string<br>(Parsing performed by JavaScript `Date('`*time_string*`')`).                                                          | `DateTime<2021-02-26T11:00:00.000 ‑05:00>`                                                                                                                                            |
| `ttime.unix(1318781876.721)`                                                                                        | From a Unix timestamp.                                                                                                                           | `DateTime<2011-10-16T12:17:56.721 -04:00§>`                                                                                                                                           |
| `ttime.unix(1318781876.721, 'UTC')`                                                                                 | From a Unix timestamp, with timezone.                                                                                                            | `DateTime<2011-10-16T16:17:56.721 +00:00>`                                                                                                                                            |

When dealing with Daylight Saving Time, and days when clocks are turned backward, some hour/minute combinations are repeated. The time might be 1:59, go back to 1:00, then forward again to 1:59, and only after hitting 1:59 for this second time during the day, move forward to 2:00.

By default, any ambiguous time is treated as the earlier time, the first occurrence of that time during a day. You can, however, use either an explicit UTC offset, or a subscript 2 (₂), to indicate the later time.

`ttime('11/7/2021 1:25 AM America/Denver', 'MM/DD/YYYY h:m a z').toString()` →<br>`DateTime<2021-11-07T01:25:00.000 -06:00§>`

`ttime('11/7/2021 1:25₂ AM America/Denver', 'MM/DD/YYYY h:m a z').toString()` →<br>`DateTime<2021-11-07T01:25:00.000₂-07:00>`

`ttime('2021-11-07 01:25 -07:00 America/Denver').toString()` →<br>`DateTime<2021-11-07T01:25:00.000₂-07:00>`

## Formatting output

Dates and times can be formatted in many ways, using a broad selection of format tokens, described in the table below.

For the greatest adherence to localized formats for dates and times, you can use the I*XX* format strings, which call directly upon `Intl.DateTimeFormat` (if available) to create localized dates, times, and combined date/times.

You can also produce more customized, flexible formatting, specifying the order, positioning, and style (text vs. number, fully spelled out or abbreviated, with or without leading zeros) of each date/time field, with embedded punctuation and text as desired.

For example:

`ttime().format('ddd MMM D, y N [at] h:mm A z')` →<br>`Wed Feb 3, 2021 AD at 8:59 PM EST`

`ttime().toLocale('de').format('ddd MMM D, y N [at] h:mm A z')` →<br>`Mi 02 3, 2021 n. Chr. at 9:43 PM GMT-5`

Please note that most unaccented Latin letters (a-z, A-Z) are interpreted as special formatting characters, as well as the tilde (`~`), so when using those characters as literal text they should be surrounded with square brackets, as with the word “at” in the example above.

### Special CJK date formatting options

A few of the formatting tokens below can have an optional trailing tilde (`~`) added. This is for special handling of Chinese, Japanese, and Korean (CJK) date notation. The `~` is replaced, where appropriate, with `年`, `月`, or `日` for Chinese and Japanese, and with `년`, `월`, or `일` for Korean. Korean formatting also adds a space character when the following character is a letter or digit, but not when punctuation or the end of the format string comes next.

For all other languages, `~` is replaced with a space character when the following character is a letter or digit, or simply removed when followed by punctuation or the end of the format string.

For example:

`ttime().toLocale('zh').format('MMM~YYYY~')` →<br>`8月2021年`

`ttime().toLocale('es').format('MMM~YYYY~')` →<br>`ago 2021`

## Format string tokens

|                                   |                         Token | Output                                                                                                                                                                                                                                                                                                               |
|-----------------------------------|------------------------------:|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Era                               | NNNNN<br>NNN,&nbsp;NN,&nbsp;N | BC AD<br><br>Abbreviated era (no distinction between narrow and abbreviated, as in Moment.js).                                                                                                                                                                                                                       |
|                                   |                          NNNN | Before Christ, Anno Domini<br><br>Long-form era.                                                                                                                                                                                                                                                                     |
|                                   |                             n | BC<br><br>Abbreviated era, only shows for BC, not AD. When year is AD, leading space before `n` token is removed.                                                                                                                                                                                                    |
| Year                              |                        YYYYYY | -001970 -001971 ... +001907 +001971<br><br>Always-signed years, padded to six digits.                                                                                                                                                                                                                                |
|                                   |     YYYY&nbsp;&nbsp;<br>YYYY~ | 1970 1971 ... 2029 2030<br><br>Padded to at least four digits. With `~`, `年` or `년` is added when needed for CJK locales, otherwise replaced by a space character or empty string.                                                                                                                                   |
|                                   |                            YY | 70 71 ... 29 30<br><br>Padded to two digits with leading zero if necessary.                                                                                                                                                                                                                                          |
|                                   |           Y&nbsp;&nbsp;<br>Y~ | 1970 1971 ... 9999 +10000 +10001<br><br>Padded to at least four digits, `+` sign shown when over 9999. With `~`, `年` or `년` is added when needed for CJK locales, otherwise `~` is replaced by a space character or empty string.                                                                                    |
|                                   |           y&nbsp;&nbsp;<br>y~ | 1 2 ... 2020 ...<br><br>Era year, for use with BC/AD, never 0 or negative. With `~`, `年` or `년` is added when needed for CJK locales, otherwise `~` is replaced by a space character or empty string.                                                                                                                |
| Week year (ISO)                   |                          GGGG | 1970 1971 ... 2029 2030, `+` sign shown when over 9999.                                                                                                                                                                                                                                                              |
|                                   |                            GG | 70 71 ... 29 30<br><br>Padded to two digits with leading zero if necessary.                                                                                                                                                                                                                                          |
| Week year (locale)                |                          gggg | 1970 1971 ... 2029 2030, `+` sign shown when over 9999.                                                                                                                                                                                                                                                              |
|                                   |                            gg | 70 71 ... 29 30<br><br>Padded to two digits with leading zero if necessary.                                                                                                                                                                                                                                          |
| Quarter                           |                            Qo | 1st 2nd 3rd 4th                                                                                                                                                                                                                                                                                                      |
|                                   |                             Q | 1 2 3 4                                                                                                                                                                                                                                                                                                              |
| Month                             |     MMMM&nbsp;&nbsp;<br>MMMM~ | January February ... November December<br>1月 2月 ... 11月 12月 • 一月 二月 ... 十一月 十二月 • 1월 2월 ... 11월 12월<br><br>For CJK locales, `月` or `월` is added when using either the `MMMM` and `MMMM~` token, but using `MMMM~` allows the position of the `~` to be replaced with a blank, when appropriate, for other languages. |
|                                   |       MMM&nbsp;&nbsp;<br>MMM~ | Jan Feb ... Nov Dec<br>1月 2月 ... 11月 12月 • 1월 2월 ... 11월 12월<br><br>With `~`, `月` or `월` is added when needed for CJK locales, otherwise `~` is replaced by a space character or empty string.                                                                                                                       |
|                                   |         MM&nbsp;&nbsp;<br>MM~ | 01 02 ... 11 12<br>01月 02月 ... 11月 12月 • 01월 02월 ... 11월 12월<br><br>With `~`, `月` or `월` is added when needed for CJK locales, otherwise `~` is replaced by a space character or empty string.                                                                                                                       |
|                                   |           M&nbsp;&nbsp;<br>M~ | 1 2 ... 11 12<br>1月 2月 ... 11月 12月 • 1월 2월 ... 11월 12월<br><br>With `~`, `月` or `월` is added when needed for CJK locales, otherwise `~` is replaced by a space character or empty string.                                                                                                                             |
|                                   |                            Mo | 1st 2nd ... 11th 12th                                                                                                                                                                                                                                                                                                |
| Week (ISO)                        |                            WW | 01 02 ... 52 53                                                                                                                                                                                                                                                                                                      |
|                                   |                             W | 1 2 ... 52 53                                                                                                                                                                                                                                                                                                        |
| Week (locale)                     |                            ww | 01 02 ... 52 53                                                                                                                                                                                                                                                                                                      |
|                                   |                             w | 1 2 ... 52 53                                                                                                                                                                                                                                                                                                        |
| Day of month                      |         DD&nbsp;&nbsp;<br>DD~ | 01 02 ... 30 31<br><br>With `~`, `日` or `일` is added when needed for CJK locales, otherwise `~` is replaced by a space character or empty string.                                                                                                                                                                    |
|                                   |           D&nbsp;&nbsp;<br>D~ | 1 2 ... 30 31<br><br>With `~`, `日` or `일` is added when needed for CJK locales, otherwise `~` is replaced by a space character or empty string.                                                                                                                                                                      |
|                                   |                            Do | 1st 2nd ... 30th 31st                                                                                                                                                                                                                                                                                                |
| Day of year                       |                          DDDD | 001 002 ... 364 365 366                                                                                                                                                                                                                                                                                              |
|                                   |                           DDD | 1 2 ... 364 365 366                                                                                                                                                                                                                                                                                                  |
| Day of week                       |                          dddd | Sunday Monday ... Friday Saturday                                                                                                                                                                                                                                                                                    |
|                                   |                           ddd | Sun Mon ... Fri Sat                                                                                                                                                                                                                                                                                                  |
|                                   |                            dd | Su Mo ... Fr Sa                                                                                                                                                                                                                                                                                                      |
|                                   |                             d | 0 1 ... 5 6                                                                                                                                                                                                                                                                                                          |
|                                   |                            do | 0th 1st ... 5th 6th                                                                                                                                                                                                                                                                                                  |
| Day of Week (ISO)                 |                             E | 1 2 ... 6 7                                                                                                                                                                                                                                                                                                          |
| Day of Week (locale)              |                             e | 1 2 ... 6 7<br><br>Note: this is 1-based, not 0-based, as in Moment.js.                                                                                                                                                                                                                                              |
| Hour                              |                            HH | 00-23                                                                                                                                                                                                                                                                                                                |
|                                   |                             H | 0-23                                                                                                                                                                                                                                                                                                                 |
|                                   |                            hh | 01-12, for use with AM/PM                                                                                                                                                                                                                                                                                            |
|                                   |                             h | 1-12, for use with AM/PM                                                                                                                                                                                                                                                                                             |
|                                   |                            KK | 00-11, for use with AM/PM                                                                                                                                                                                                                                                                                            |
|                                   |                             K | 0-11, for use with AM/PM                                                                                                                                                                                                                                                                                             |
|                                   |                            kk | 01-24                                                                                                                                                                                                                                                                                                                |
|                                   |                             k | 1-24                                                                                                                                                                                                                                                                                                                 |
| Day period                        |                             A | AM PM                                                                                                                                                                                                                                                                                                                |
|                                   |                             a | am pm                                                                                                                                                                                                                                                                                                                |
| Minute                            |                            mm | 00-59                                                                                                                                                                                                                                                                                                                |
|                                   |                             m | 0-59                                                                                                                                                                                                                                                                                                                 |
| Second                            |                            ss | 00-59                                                                                                                                                                                                                                                                                                                |
|                                   |                             s | 0-59                                                                                                                                                                                                                                                                                                                 |
| Fractional seconds                |                             S | 0-9 (tenths of a second)                                                                                                                                                                                                                                                                                             |
|                                   |                            SS | 00-99 (hundredths of a second)                                                                                                                                                                                                                                                                                       |
|                                   |                           SSS | 000-999 (milliseconds)                                                                                                                                                                                                                                                                                               |
|                                   |                       SSSS... | Additional zeros after milliseconds.                                                                                                                                                                                                                                                                                 |
| Timezone                          |                           ZZZ | America/New_York, Europe/Paris, etc.<br><br>IANA timezone, if available.                                                                                                                                                                                                                                             |
|                                   |                           zzz | Australian Central Standard Time, Pacific Daylight Time, etc.<br><br>_Long form names are only for output &mdash; cannot be parsed._                                                                                                                                                                                 |
|                                   |                            ZZ | -0700 -0600 ... +0600 +0700<br><br>If used with a TAI time, the displayed offset will be the difference between TAI and UTC at a given moment in time. Outside of the well-defined span of officially-declared leap seconds, this offset might be displayed with millisecond precision.                              |
|                                   |                    zz,&nbsp;z | EST, CDT, MST, PDT, AEST, etc.<br><br>Please note that timezones in this format are not internationalized, and are not unambiguous when parsed.                                                                                                                                                                      |
|                                   |                             Z | -07:00 -06:00 ... +06:00 +07:00                                                                                                                                                                                                                                                                                      |
| Unix timestamp, UTC               |                             X | 1360013296                                                                                                                                                                                                                                                                                                           |
| Unix millisecond timestamp, UTC   |                             x | 1360013296123                                                                                                                                                                                                                                                                                                        |
| Unix timestamp, epoch             |                            XX | 1360013296                                                                                                                                                                                                                                                                                                           |
| Unix millisecond timestamp, epoch |                            xx | 1360013296123                                                                                                                                                                                                                                                                                                        |
| Unix timestamp, TAI               |                            XT | 1360013331                                                                                                                                                                                                                                                                                                           |
| Unix millisecond timestamp, TAI   |                            xt | 1360013331123                                                                                                                                                                                                                                                                                                        |
| Daylight Saving Time indicator    |                             V | § # ^ ~ ❄<br><br>Symbol indicating DST is in effect.<br>This is typically §, meaning the clock has been turned forward one hour.<br># means two hours forward, ^ means half an hour, ~ is any other forward amount.<br>❄ is negative DST, i.e. “Winter Time”.<br>Renders one blank space when DST is not in effect.  |
|                                   |                             v | Same as above, but no blank space when DST is not in effect.                                                                                                                                                                                                                                                         |
| Occurrence indicator              |                             R | 1:00 , 1:01 ... 1:58 , 1:59 , 1:00₂, 1:01₂ ... 1:58₂, 1:59₂, 2:00 , 2:01<br><br>A subscript 2 (₂) that denotes the second occurrence of the same clock time during a day when clocks are turned back for Daylight Saving Time.                                                                                       |
|                                   |                             r | Same as above, but no blank space when subscript isn’t needed.                                                                                                                                                                                                                                                       |

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

The capital letters `F`, `L`, `M`, and `S` correspond to the option values `'full'`, `'long'`, `'medium'`, and `'short'`. `ILS` thus specifies a long style date and a short style time. `IL` is a long style date alone, without time. `IxS` is a short style time without a date.

### Examples

| Format | Output |
|---|---|
| IFF | `Thursday, September 4, 1986 at 8:30:00 PM Eastern Daylight Time` |
| ILM | `September 4, 1986 at 8:30:00 PM` |
| IS | `9/4/86` |
| IxL | `8:30:00 PM EDT` |

You can also augment these formats with brace-enclosed `Intl.DateTimeFormatOptions`, such as:

`IMM{hourCycle:23h}`

...which will start with whatever the localized time formatting is and force it into 24-hour time, whether the standard localized form is a 12- or 24-hour format. Note that no quotes are placed around the option values, as they would be in JavaScript/TypeScript code.

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

## Parsing with a format string, and optionally a locale

(_As viewed via formatted output_)

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

`ttime('2005-10-10 16:30 America/Los_Angeles').tz('Europe/Warsaw').toString()` →<br>`DateTime<2005-10-11T01:30:00.000 +02:00>`

Please note that if you pass a second argument of `true`, the timezone is changed, _but the wall time stays the same._ This same option to preserve wall time is available for the `utc()` and `local()` methods, where the optional boolean value will be the one and only argument.

`ttime('2005-10-10 16:30 America/Los_Angeles').tz('Europe/Warsaw', true).toString()` →<br>`DateTime<2005-10-10T16:30:00.000 +02:00>`

`ttime('2005-10-10 16:30 America/Los_Angeles').utc().toString()` →<br>`DateTime<2005-10-10T23:30:00.000 +00:00>`

`ttime('2005-10-10 16:30 America/Los_Angeles').utc().toString(true)` →<br>`DateTime<2005-10-10T16:30:00.000 +00:00>`

`// Local zone is America/New_York`<br>`ttime('2005-10-10 16:30 America/Los_Angeles').local().toString()` →<br>`DateTime<2005-10-10T19:30:00.000 +04:00>`

## Converting locales

`ttime('7. helmikuuta 2021', 'IL', 'fi').toLocale('de').format('IL')` →<br>`7. Februar 2021`

## Defining and updating timezones

These functions define the size and behavior of the IANA timezone definitions used by **@tubular/time**:

```
ttime.initTimezoneSmall();
ttime.initTimezoneLarge();
ttime.initTimezoneLargeAlt();
```

By default, **@tubular/time** is set up using `initTimezoneSmall()`. This covers explicitly-defined timezone information for roughly the release date of the version of **@tubular/time** you’re using, +/- five years, supplemented by rules-based extensions (i.e. knowing that for a particular timezone, say, “DST starts on the last Sunday of March and ends on the last Sunday of October”), and further supplemented by information extracted from `Intl`, when available.

With proper tree-shaking, the code footprint of **@tubular/time** should be less than 150K when using the small timezone definitions.

Using `initTimezoneLarge()` provides the full IANA timezone database. Using this will increase code size by about 280K, presuming that your build process is smart enough to have otherwise excluded unused code in the first place.

`initTimezoneLargeAlt()` provides a slight variant of the full IANA timezone database, and is also roughly 280K. This variant rounds all timezone offsets to full minutes, and adjusts a small number of fairly old historical changes by a few hours so that only the time-of-day ever goes backward, never the calendar date. It’s generally more than enough trouble for software to cope with missing and/or repeated hours during a day; `initTimezoneLargeAlt()` makes sure the date/time can’t be, say, the 19th of the month, then the 18th, and then the 19th again, as happens with the unmodified America/Juneau timezone during October 1867.

For browser-based inclusion of timezone definitions, if not relying on a tool like **webpack** to handle such issues for you, you can also include full timezone definitions this way:

```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large.js"></script>
```

...or...

```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
```

Either of these should appear _before_ the script tag that loads **@tubular/time** itself.

### Live timezone updates

Timezone definitions can be updated live as well. Different polling methods are needed for Node.js code or browser-hosted code, since both environments access web resources in very different ways (and browsers have CORS issues, which Node.js does not).

To be informed when a live timezone update takes place, add and remove update listeners using these functions:

```
function addZonesUpdateListener(listener: (result: boolean | Error) => void): void;
function removeZonesUpdateListener(listener: (result: boolean | Error) => void): void;
function clearZonesUpdateListeners(): void
```

The result received by a callback is `true` if an update was successful, and caused changes in timezone definitions, `false` if successful, but no changes occurred, or an instance of `Error`, indicating an error (probably an HTTP failure) has occurred.

For example:

```
  const listener = result => console.log(result); // Keep in a variable if removal is needed later

  ttime.addZonesUpdateListener(listener);

  // Later on in the code...

  ttime.removeZonesUpdateListener(listener);
```

Why use a listener? Because you might want to recalculate previously calculated times, which possibly have changed due to timezone definition changes. For example, imagine you have a video meeting scheduled for 10:00 in a client’s timezone, which, when you first schedule it, was going to be 15:00 in your timezone. Between the time you scheduled the meeting, however, and when the meeting actually takes place, the switch to Daylight Saving Time is cancelled for the client’s timezone. If you still intend to talk to your client at 10:00 their time, you have to meet at 16:00 in your timezone instead.

To poll for for timezone updates at a regular interval, use:

```
function pollForTimezoneUpdates(zonePoller: IZonePoller | false, name: ZoneOptions = 'small', intervalDays = 1): void;
```

* `zonePoller`: Either `zonePollerBrowser` (from `tbTime.zonePollerBrowser`) or  `zonePollerNode` (using `import` or `require`, from `'@tubular/time'`). If you pass the boolean value `false`, polling ceases.
* `name`: One of `'small'`, `'large'`, or `'large-alt'`. Defaults to `'small'`.
* `intervalDays`: Frequency of polling, in days. Defaults to 1 day. The fastest allowed rate is once per hour (~0.04167 days).

You can also do a one-off request:

```
function getTimezones(zonePoller: IZonePoller | false, name: ZoneOptions = 'small'): Promise<boolean>;
```

`zonePoller` and `name` are the same as above. Any periodic polling done by `pollForTimezoneUpdates()` is canceled. You can get a response via registered listeners, but this function also returns a `Promise`. The promise either resolves to a boolean value, or is rejected with an `Error`.

## The `YMDDate` and `DateAndTime` objects

`YMDate`:

```json5
{
  y: 2021, // short for year
  q: 1, // short for quarter
  m: 2, // short for month
  d: 4, // short for day
  dow: 4, // short for dayOfWeek (output only)
  dowmi: 1, // dayOfWeekMonthIndex (output only)
  dy: 35, // short for dayOfYear
  n: 18662, // short for epochDay
  j: false, // short for isJulian

  year: 2021,
  quarter: 1, // quarter of the year 1-4
  month: 2,
  day: 4,
  dayOfWeek: 4, // Day of week as 0-6 for Sunday-Saturday (output only)
  dayOfWeekMonthIndex: 1, // Day of week month index, 1-5, e.g. 2 for 2nd Tuesday of the month (output only)
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
  yearByWeekLocale: 2021, // year that accompanies a locale-specific year/week/day-of-week style date
  weekLocale: 6, // week that accompanies a locale-specific year/week/day-of-week style date
  dayByWeekLocale: 5, // day that accompanies a locale-specific year/week/day-of-week style date

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
  dstOffset: 0, // DST offset, in minutes - usually positive, but can be negative (output only)
  occurrence: 1, // usually 1, but can be 2 for the second occurrence of the same wall clock time during a single day, caused by clock being turned back for DST
  deltaTai: 37, // How much (in seconds) TAI exceeds UTC or UT1 at given moment in time (output only)
  /* In the well-defined range for UTC, deltaTai is always an integer value.
     Outside that range it can be a non-integer with millisecond precision. */

  jde: 2459249.722008264, // Julian days, ephemeris
  mjde: 59249.22200826416, // Modified Julian days, ephemeris
  jdu: 2459249.7212051502, // Julian days, UT
  mjdu: 59249.22120515024 // Modified Julian days, UT
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
* `yw` / `yearByWeek`: An ISO week-based calendar year, where each week starts on Monday. This year is the same as the normal calendar year for most of the calendar year, except for, possibly, a few days at the beginning and end of the year. Week 1 is the first week which contains January 4. Along with this style of year, you can specify:
    * Nothing more, in which case the date is treated as the first day of the first week of the year.
    * `w` / `week`: The 1-based week number.
      * If nothing more, the date is treated as the first day of the given week.
      * `dw` / `dayByWeek`: The 1-based day of the given week.
* `ywl` / `yearByWeekLocale`, etc.: These fields work the same as `yw` / `yearByWeek`, etc., except that they apply to locale-specific rules for the day of the week on which each week starts, and for the definition of the first week of the year.

In specifying a time, the minimum needed is a 0-23 value for `hrs` / `hour`. All other unspecified time fields will be treated as 0.

[Astronomical time fields](#astronomical-dateandtime-fields) will supersede any of the above date fields.

As discussed earlier, concerning parsing time strings, ambiguous times due to Daylight Saving Time default to the earlier of two times. You can, however, use `occurrence: 2` to explicitly specify the later time. An explicit `utcOffset` can also accomplish this disambiguation.

## Reading individual `DateTime` fields

As an output from a `DateTime` instance, such as what you get from `ttime().wallTime`, all `DateAndTime` fields will be filled in with synchronized values. `ttime().wallTime.hour` provides the hour value, `ttime().wallTime.utcOffset` provides the UTC offset in seconds for the given time, etc.

`ttime().wallTimeShort` returns a `DateAndTime` object with all available short-form field names, and `ttime().wallTimeLong` only long-form field names. `ttime().wallTimeSparse` returns a `DateAndTime` object with a minimal set of short-form field names: `y`, `m`, `d`, `hrs`, `min`, `sec`, `millis`.

## Modifying `DateTime` values

There are six main methods for modifying a `DateTime` value:

* `add(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = true): DateTime`
* `subtract(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = true): DateTime`
* `roll(field: DateTimeField | DateTimeFieldName, amount: number, minYear = 1900, maxYear = 2099)`
* `set(field: DateTimeField | DateTimeFieldName, value: number, loose = false): DateTime`
* `startOf(field: DateTimeField | DateTimeFieldName): DateTime`
* `endOf(field: DateTimeField | DateTimeFieldName): DateTime`

> Before going further, it needs to be mentioned that `DateTime` instances can be either locked, and thus immutable, or unlocked. Instances generated using `ttime(`...`)` are locked. Instances created using [the `DateTime` constructor](#the-datetime-class) (covered later in this document) are created unlocked, but can be locked after creation.

When you use the add/subtract/roll/set methods on a locked instance, a new modified and locked instance is returned. When used on an unlocked instance, these methods modify that instance itself, and a reference to the modified instance is returned.

### Using `add` (and `subtract`)

> `subtract()` is nothing more than a convenience method which negates the amount being added, and then calls `add()`. The documentation that follows is in terms of the `add()` method alone, but applies, with this negation, to the `subtract()` method as well.

An example of using `add()`:

`ttime().add('year', 1)` or `ttime().add(DateTimeField.YEAR, 1)`

The above produces a date one year later than the current time. In most cases, this means that the resulting date has the same month and date, but in the case of a leap day:

`ttime('2024-02-29').add('year', 1).toIsoString(10)` → `2025-02-28`

...the date is pinned to 28 so that an invalid date is not created. Similarly, when adding months, invalid dates are prevented:

`ttime('2021-01-31').add(DateTimeField.MONTH, 1).toIsoString(10)` → `2021-02-28`

You can `add` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`, `YEAR_WEEK`, and `YEAR_WEEK_LOCALE`, as provided by the `DateTimeField` enum, or their string equivalents (`'milli'`, `'millis'`, `'millisecond'`, `'milliseconds'`... `'day'`, `'days'`, `'date'`, `'month'`, `'months'`, etc.).

_(There are further fields defined for dealing with [leap seconds and TAI](#tai-field-values), described later.)_

For fields `MILLI` through `HOUR`, fixed units of time, multiplied by the `amount` you pass, are applied. When dealing with months, quarters, and years, the variable lengths of months, quarters, and years apply.

`DAY` amounts can be handled either way, as variable in length (due to possible effects of Daylight Saving Time), or as fixed units of 24 hours. The default for `variableDays` is `true`.

DST can alter the duration of days, typically adding or subtracting an hour, but other amounts of change are possible (like the half-hour shift used by Australia’s Lord Howe Island), so adding days can possibly cause the hour (and even minute) fields to change:

`ttime('2021-02-28T07:00 Europe/London', false).add('days', 100).toIsoString()` →<br>`2021-06-08T08:00:00.000+01:00` (note shift from 7:00 to 8:00)

`ttime('2021-02-28T07:00 Australia/Lord_Howe, false').add('days', 100).toIsoString()` →<br>
2021-06-08T06:30:00.000+10:30` (note shift from 7:00 to 6:30)

By default, however, hour and minute fields remain unchanged.

`ttime('2021-02-28T07:00 Australia/Lord_Howe').add('days', 100).toIsoString()` →<br>`2021-06-08T07:00:00.000+10:30`

Even with the default behavior, however, it is still possible for hours and minutes to change, in just the same way adding one month to January 31 does not yield February 31. When clocks are turned forward, some times of day simply do not exist, so a result might have to be adjusted to a valid hour and minute in some cases.

`ttime('2000-04-27T00:30 Africa/Cairo').add('day', 1).toString()` →<br>`DateTime<2000-04-28T01:30:00.000 +03:00§>` (clock turned forward at midnight to 1:00)

### Using `roll()`

You can use the `roll()` method to roll, or “spin”, through values for each date/time field. This operation can be used, for example, in a user interface where you select a field and use up/down arrows to change the value, and the value changes in a wrap-around fashion, e.g. ...58 → 59 → 00 → 01..., etc.

While seconds and minutes wrap at 59, hours at 23, and dates wrap at the length of the current month, there are no natural wrapping boundaries for years. The wrap-range defaults to 1900-2099, but you can pass optional arguments to change this range (this only effects rolling of years, not other time units).

You can `roll` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `AM_PM`, `DAY`, `DAY_OF_WEEK`, `DAY_OF_WEEK_LOCALE`, `DAY_OF_YEAR`, `WEEK`, `WEEK_LOCALE`, `MONTH`, `YEAR`, `YEAR_WEEK`, `YEAR_WEEK_LOCALE`, `ERA`.

For the purpose of the `roll()` method, `AM_PM` and `ERA` are treated as numeric values. AM and BC are 0, PM and AD are 1. If you roll by an odd number, the value will be changed. If you roll by an even value, the value will remain unchanged.

Examples of using `roll()`:

`ttime('1690-09-15').roll('month', 5).toIsoString(10)` → `1690-05-15`<br>
`ttime('1690-09-15').roll('era', 1).format('MMM D, y N')` → `Sep 15, 1690 BC`<br>
`ttime('10:15').roll('ampm', 1).format('h:mm A')` → `10:15 PM`

### Using `set()`

This method sets date/time fields to explicit values. In the default mode, you can only use valid values for each particular field. In the `loose` mode, some leeway is given, such as allowing the date to be set to 31 when the month is September (resulting in October 1), or allowing the month to be set to 0 (meaning December of the previous year) or 13 (January of the next year). Using these loose values means, of course, that other fields besides the one field being set might change.

You can `set` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `AM_PM`, `DAY`, `DAY_OF_WEEK`, `DAY_OF_WEEK_LOCALE`, `DAY_OF_YEAR`, `WEEK`, `WEEK_LOCALE`, `MONTH`, `YEAR`, `YEAR_WEEK`, `YEAR_WEEK_LOCALE`, `ERA`.

Examples of using `set()`:

`ttime('1690-09-15').set('month', 5).toIsoString(10)` → `1690-02-15`<br>
`ttime('1690-09-15').set('month', 13, true).toIsoString(10)` → `1691-01-15`

There is a corresponding `get()` method which returns the numeric value of a field, or `undefined` if the field does not exist.

### Using `startOf()` and `endOf()`

These functions transform a `DateTime` to the beginning or end of a given unit of time.

`ttime('2300-05-05T04:08:10.909').startOf(DateTimeField.MINUTE).toIsoString(23)` →<br>`2300-05-05T04:08:00.000`

`ttime('2300-05-05T04:08:10.909').startOf('hour').toIsoString(23)` →<br>`2300-05-05T04:00:00.000`

`ttime('2300-05-05T04:08:10.909').startOf(DateTimeField.WEEK).format(ttime.WEEK_AND_DAY)` →<br>`2300-W18-1`

`ttime('2300-05-05T04:08:10.909').startOf('year').toIsoString(23)` →<br>`2300-01-01T00:00:00.000`

`ttime('2300-05-05T04:08:10.909').endOf('day').toIsoString(23)` →<br>`2300-05-05T23:59:59.999`

`ttime('2300-05-05T04:08:10.909').endOf(DateTimeField.MONTH).toIsoString(23)` →<br>`2300-05-31T23:59:59.999`

## Time value

In milliseconds:

`ttime().utcMillis`

In seconds:

`ttime().utcSeconds`

As a native JavaScript `Date` object:

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

If you prefer that an exception be thrown, you can do this:

`ttime('1234-56-78').throwIfInvalid()`

If a `DateTime` is valid, `throwIfInvalid()` returns that instance, so you can use the result as the `DateTime` itself.

Parsing of dates and times specified as strings is somewhat loose. When no format string is provided, dates are parsed according to ISO-8601, with leniency about leading zeros when delimiters are used. Pseudo-months 0 and 13 are accepted, as are days of the month from 0 to 32, regardless of the length of a given month. Years can be in the range -271820 to 275759.

When parsing using a format string, especially formats where months are numeric, not textual, strict matching of delimiters is not required. For example, even where proper localized output formatting is done with dots, input using dashes instead of dots is acceptable:

`ttime('2021-02-08', null, 'de').format('IS')` → `08.02.21`<br>
`ttime('08.02.21', 'IS', 'de').format('IS')` → `08.02.21`<br>
`ttime('008-2-21', 'IS', 'de').format('IS')` → `08.02.21`

Except in compact, delimiter-free ISO formats like `20210208`, leading zeros are never required. Extra, unexpected leading zeros are generally ignored, although an ISO date month should have no more than two digits, and when a two-digit year is expected, a 3-digit year such as 021 will be treated as 21 AD, not 2021.

_Future releases may offer options for stricter parsing._

There are also functions for checking if a year, month, and day-of-month together constitute a valid date.

The following functions can be imported/required from `'@tubular/time'`, or, in a browser script, found on the `tbTime` global:

```
function isValidDate_SGC(yearOrDate: YearOrDate, month?: number, day?: number): boolean;
function isValidDateGregorian(yearOrDate: YearOrDate, month?: number, day?: number): boolean;
function isValidDateJulian(yearOrDate: YearOrDate, month?: number, day?: number): boolean;
```

The `yearOrDate` argument can be just a number for the year (in which case `month` and `day` should also be provided), a `YMDDate` object, or a `[year, month, day]` numeric array.

There is also this method, available on instances of `Calendar` or `DateTime`, which determines the validity of a date according to that instance’s Julian/Gregorian switch-over:

```
isValidDate(year: number, month: number, day: number): boolean;
isValidDate(yearOrDate: YMDDate | number[]): boolean;
```

A related method takes a possibly invalid date and coerces it into a valid date, such as turning September 31 into October 1.

```
normalizeDate(year: number, month: number, day: number): YMDDate;
normalizeDate(yearOrDate: YMDDate | number[]): YMDDate;
```

## Comparison and sorting

You can test whether moments in time expressed as `DateTime` instances are before, after, or the same as each other. By default, this comparison is exact to the millisecond. You can, however, pass an optional unit of time for the resolution of the comparison.

`ttime('2020-08-31').isBefore('2020-09-01')` → `true`<br>
`ttime('2020-08-31').isBefore('2020-09-01', 'year')` → `false`<br>
`ttime('2020-08-31').isSameOrBefore('2020-08-03')` → `false`<br>
`ttime('2020-08-31').isSameOrBefore('2020-08-03', 'month')` → `true`<br>
`ttime('2020-08-31 07:45').isAfter('2020-08-31 07:43')` → `true`<br>
`ttime('2020-08-31 07:45').isAfter('2020-08-31 07:43', 'hour')` → `true`

The full list of functions for these comparisons is as follows: `isBefore`, `isSameOrBefore`, `isSame`, `isSameOrAfter`, `isAfter`.

You can also check if a `DateTime` instance is chronologically, non-inclusively between two other `DateTime` instances:

`ttime().isBetween('1776-06-04', '1809-02-12')` → `false`

There are two general comparison methods which, when comparing two `DateTime` instances, return a negative number if the first is less than the second, 0 if the two are equal at the given resolution, or a positive number if the first instance is greater than the second. This is the style of comparison function that works with JavaScript `sort`.

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

The `DateTime` method `getCalendarMonth()` returns an array of `YMDDate` objects, the zeroth date object being on the locale-specific first day of the week (possibly from the preceding month), with a multiple-of-7 length of dates to represent a full month. As an example (filtered down to just the day-of-month for visual clarity):

`ttime().getCalendarMonth().map(date => date.m === ttime.FEBRUARY ? date.d : '-')` →

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

## Dealing with weird months

The utility of the `getCalendarMonth()` method is more evident with when viewing the calendar generated for October 1582, when (by default) the Julian calendar ends, and the Gregorian calendar begins:

`ttime('1582-10-01', null, 'fr').getCalendarMonth().map(date => date.d)` →

```json5
[
   1,  2,  3,  4, 15, 16, 17,
  18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31
]
```

By using the locale `'fr'`, the calendar generated above starts on Monday instead of Sunday. Notice how the 4th of the month is immediately followed by the 15th.

One of the last switches to the Gregorian calendar was enacted by Russia in 1918. The month of February didn’t even start with the 1st, but started on the 14th:

`new DateTime('1918-02', null, '1918-02-14').getCalendarMonth(1).map(date => date.m === ttime.FEBRUARY ? date.d : '-')`

```json5
[
  '-', '-', '-', 14, 15,  16,  17,
  18,  19,  20,  21, 22,  23,  24,
  25,  26,  27,  28, '-', '-', '-'
]
```

Given such examples, here are some things to consider which might defy ordinary expectations about how calendar months work:

* A month does not necessary start on the 1st.
* A month might be missing days in the middle.
* Because of the previous possibilities, the last numeric date of the month (in the above example, 28) is not necessary the same thing as the number of days in the month (in the example above, only 15 days).
* There are timezone changes which eliminate both a day-of-the-month number *and* a day of the week.

The `getCalendarMonth()` method shows all of these effects together, but there are additional functions to examine each issue separately. These methods are available on both the `DateTime` class, and the `Calendar` class. Arguments which are optional when using the `DateTime` class are required when using the `Calendar` class, because instances of the `Calendar` class have no internal year, month, or day values available as defaults.

### Methods

Total number of days in a month, as affected by leap years and Julian/Gregorian switch-over. If a day is missing due to a timezone issue, that day is still counted as a day in the month, albeit a special 0-length day:

```
getDaysInMonth(year?: number, month?: number): number;
```

The range of dates excluded due to Julian/Gregorian switch-over only. If no days are excluded, the result is `null`. If days are excluded, a two-element array is returned. `result[0]` is the first day dropped, `result[1]` is the last day dropped:

```
getMissingDateRange(year?: number, month?: number): number[] | null;
```

The first date in a month. Usually 1, of course, but possibly different, as in the previous example for Russia, February 1918:

```
getFirstDateInMonth(year?: number, month?: number): number;
```

The last date in a month. Usually 28, 29, 30, or 31. This method is provided mainly because this number can be different from the `getDaysInMonth()` value:

```
getLastDateInMonth(year?: number, month?: number): number;
```

### Another way to drop a day

In December 2011, the nation of Samoa jumped over the International Dateline (or, since no major tectonic shifts occurred, perhaps it’s better to say the International Dateline jumped over Samoa). The Pacific/Apia timezone was changed from UTC-10:00 to UTC+14:00. As a result, Friday, December 30, 2011 did not exist for Samoans. Thursday was followed immediately by Saturday, a type of discontinuity that doesn’t happen with days dropped by switching from the Julian to the Gregorian calendar.

<a id="apia" name="apia"></a>**@tubular/time** handles this situation by treating that skipped-over Friday as a day that exists, but one that is 0 seconds long. The `getCalendarMonth()` method makes this 0-length status apparent by rendering the day-of-the-month for that day as a negative number.

`new DateTime('2011-12', 'Pacific/Apia').getCalendarMonth().map(date => date.m === ttime.DECEMBER ? date.d : '-')` →

```json5
[
  '-', '-', '-', '-', 1,  2,  3,
  4,   5,   6,   7,   8,  9,  10,
  11,  12,  13,  14,  15, 16, 17,
  18,  19,  20,  21,  22, 23, 24,
  25,  26,  27,  28,  29, -30, 31
]
```

Here’s what that month looks like, as rendered by the drop-down date picker at skyviewcafe.com:

<img src="https://shetline.com/readme/tubular-time/2.4.0/apia_dec_2011_cal.jpg" width=185 height=150 alt="Apia Dec 2011">

The following section about weird days provides another method for detecting days like the missing Friday above.

## Dealing with weird days

A day is, of course, *usually* 24 hours long, which is also 1440 minutes, or 86400 seconds. Two things can change the length of a day, however:

* Daylight Saving Time rules, which typically subtract or add one hour, but DST changes are not always one hour.
* Changes in a timezone’s base offset from UTC, such as the Samoa example above. The biggest of these changes have been due to timezones switching back and forth over the International Dateline, resulting in days as short as 0 hours, and days as long as 47 hours (1969-09-30, Pacific/Kwajalein).

These two methods tell you how long a particular day is, in either seconds or minutes:

```
getSecondsInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number;

getMinutesInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number;
```

It is possible, but highly unlikely (no timezone is currently defined this way, or is ever likely to be), for `getSecondsInDay()` to return a non-integer value. `getMinutesInDay()` is always rounded to the nearest integer minute. Despite this rounding, the value will nearly always be precisely correct anyway. Except for a few late 19th century/early 20th century timezone changes away from local mean time, UTC offset changes are otherwise in whole minutes, typically whole hours, with most fractional hour changes being in multiples of 15 minutes.

This next method provides a description of any discontinuity in time during a day caused by Daylight Saving Time or other changes in UTC offset. It provides the wall-clock time when a clock change starts, the number of milliseconds applied to that time to turn the clock either forward or backward, and the ending wall-clock time. The notation “24:00:00” refers to midnight of the next day. If there is no discontinuity, as with most days, the method returns `null`:

```
getDiscontinuityDuringDay(yearOrDate?: YearOrDate, month?: number, day?: number): Discontinuity | null;
```

### Typical Daylight Saving Time examples

`new DateTime('2021-03-14', 'America/New_York').getDiscontinuityDuringDay()` →<br>`{ start: '02:00:00', end: '03:00:00', delta: 3600000 } // spring forward!`

`new DateTime('2021-07-01', 'America/New_York').getDiscontinuityDuringDay()`) → `null`

`new DateTime('2021-11-07', 'America/New_York').getDiscontinuityDuringDay()` →<br>`{ start: '02:00:00', end: '01:00:00', delta: -3600000 } // fall back!`

### Examples of big UTC offset shifts due to moving the International Dateline

`// As soon as it’s midnight on the 30th, it’s instantly midnight on the 31st, erasing 24 hours:`<br>
`new DateTime('2011-12-30', 'Pacific/Apia').getDiscontinuityDuringDay()`) →<br>`{ start: '00:00:00', end: '24:00:00', delta: 86400000 }`

`// As soon as it’s midnight on the 31th, turn back to 1AM on the 30th, adding 23 hours to the day:`<br>
`new DateTime('1969-09-30', 'Pacific/Kwajalein').getDiscontinuityDuringDay()` →<br>`{ start: '24:00:00', end: '01:00:00', delta: -82800000 }`

Here’s a skyviewcafe.com image for that extra-long day in the Marshall Islands, with two sunrises, two sunsets, and 24 hours, 6 minutes worth of daylight packed into a 47-hour day:

<img src="https://shetline.com/readme/tubular-time/2.4.0/mhl_sep_30_1969.jpg" width=215 height=195 alt="Marshall Islands, September 30, 1969">

## Leap Seconds, TAI, and Julian Dates

UTC (Universal Coordinated Time) is not a uniform timescale. It is currently defined to track closely with another time standard, UT1, which is based on the slightly variable, and (in the long run) slowly lengthening rotation time of the Earth. Each single second of UTC is equal to one standard, atomically-defined second, but whole seconds are occasionally inserted (and, theoretically, might occasionally be deleted) to keep UTC within 0.9s of UT1. These seconds are called _leap seconds_.

The current system for UTC was adopted in 1970 and implemented in 1972[*](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). UTC is only strictly defined relative to TAI starting in 1972 and going forward in time until the next announced omission or addition of a leap second. You can, however, create a **@tubular/time** `DateTime` instance using UTC while also using year values in the distant past or future.

So how are dates and times outside the well-defined range of UTC handled?

The answer is that `DateTime` uses both extended UTC and UT1 outside the well-defined UTC range. This works as follows:

* For all dates prior to 1957, estimated UT1 is in effect. This is most accurate back to 1600, for which there is sufficient astronomical data for reasonable approximate conversions from UT1 to TAI and dynamical time. Further back in time less accurate approximations are in effect.
* From 1957-1958, using a sliding weighted average, UT1 transitions to *proleptic* UTC.
* From 1958-1972 *proleptic* UTC, [as proposed by Tony Finch](https://fanf.livejournal.com/69586.html), is used, with the first non-official leap second occurring at 1959-06-30 23:59:60.
* From 1972 up until the latest updates provided by the [International Bureau of Weights and Measures](https://en.wikipedia.org/wiki/International_Bureau_of_Weights_and_Measures), well-defined UTC prevails, with the first official leap second occurring at 1972-06-30 23:59:60.
* For a year to 18 months after the current time, or after the last defined leap second, *whichever is later*, a presumed leap-second-free span of UTC is projected to occur.
* A sliding weighted average transition from UTC to estimated UT1 follows for the next 365 days.
* Formulaic predicted UT1 is used for all later dates and times thereafter.

> Note: It is possible (no sooner than 2023) that the use of leap seconds might be abandoned, depending on the results of the World Radiocommunication Conference that year. One possible outcome is that UTC will become locked to TAI, and allowed to drift further and further out of synchronization with UT1.

All timezones other than TAI, ZONELESS, and DATELESS, such as Europe/London or Asia/Tokyo, are handled the same way as described for UTC above &mdash; simply at varying timezone offsets from UTC.

### Leap second time values

`DateTime` instances generally behave as if leap seconds do not exist. `DateTime` instances which express leap seconds can be created as follows:

* By being directly parsed:<br>
`new DateTime('1972-06-30 23:59:60Z')` → `"DateTime<1972-07-01T00:00:10.000 TAI>"`<br>
Note that this only works for defined leap seconds. `new DateTime('2021-04-15 23:59:60Z')`, not a valid leap second, is treated as `2021-04-16 00:00:00Z`.<br><br>
* From TAI, Julian date, or modified Julian date values. For example:<br>
`new DateTime('1972-07-01T00:00:10 TAI', 'UTC').toString()` →
`"DateTime<1972-06-30T23:59:60.000 +00:00>"`<br>
`new DateTime({ jde: 2450630.5007242477 }, 'UTC').toIsoString(19)` →
`"1997-06-30T23:59:60"`<br><br>
* By add/subtract operations using TAI quantities:
`new DateTime('2016-12-31 18:59:59 EST').add('seconds_tai', 1).toString()` →
`"DateTime<2016-12-31T18:59:60.000 -05:00>"`<br><br>
* Using the set operation (this only works if the result is the is considered a valid leap second):
`new DateTime('2016-12-31 18:59:59 EST').set('second', 60).toString()` →
`"DateTime<2016-12-31T18:59:60.000 -05:00>"`<br><br>
* Using the `setUtcMillis` method, with the optional second `leapSecondMillis` argument:
`new DateTime('utc').setUtcMillis(252460799999, 701).toString()` →
`"DateTime<1977-12-31T23:59:60.700 +00:00>"`<br>

### TAI field values

You can `add` and `subtract` TAI quantities using the following fields: `MILLI_TAI`, `SECOND_TAI`, `MINUTE_TAI`, `HOUR_TAI`, and `DAY_TAI`, as provided by the `DateTimeField` enum, or their string equivalents (`'milli_tai'`, `'millis_tai'`, `'millisecond_tai'`, `'milliseconds_tai'`, `'second_tai'`... etc.).

### Converting from UT/UTC to TAI, and back again

**@tubular/time** `DateTime` instances maintain UT/UTC time using integer millisecond values (sometimes along with an ancillary integer count of milliseconds during leap seconds). Starting with version 3.8.0 of **@tubular/time**, `DateTime` TAI time values, likewise measured in milliseconds, can be integer or non-integer values. This difference is because integer TAI values, as previously used, do not have a unique one-to-one correspondence with UT/UTC integer values. Without fractional precision for TAI, a UT/UTC value converted to TAI, then converted back to UT/UTC, would not reliably be restored to its original value.

Over the range of time starting from January 1, 1958, up until roughly six months beyond present realtime, time is maintained specifically as UTC (not UT1 or UT1/UTC transitional) and UTC integer milliseconds are reliably converted to TAI integer milliseconds.

### Astronomical `DateAndTime` fields

* `jde`: Julian Date (ephemeris) &mdash; Time measured in fixed-length days of dynamical time from noon, January 1, 4713 BCE (-4712-01-01T12:00) Terrestrial Dynamical Time (TDT), defined to be exactly 32.184 seconds ahead of TAI.
* `mjde`: Modified Julian Date (ephemeris) &mdash; Same as Julian Date (ephemeris) plus 2400000.5, moving time 0 to midnight, November 17, 1858 (1858-11-07T00:00).
* `jdu`: Julian Date (UT) &mdash; Time measured in variable-length days of earth rotation time from mean solar noon on the Prime Meridian, January 1, 4713 BCE (-4712-01-01T12:00).
* `mjdu`: Modified Julian Date (UT) &mdash; Same as Julian Date (UT) plus 2400000.5, moving time 0 to mean solar midnight, November 17, 1858 (1858-11-07T00:00).

### `epochMillis`, `utcMillis`, and `taiMillis` getters/setters

The `epochMillis` getter/setter returns, or allows you to modify, the fundamental core value for a `DateTime` instance.

For a TAI instance, `epochMillis` is the same as `taiMillis`, with `utcMillis` providing a conversion to or from UTC (or UT1 outside the well-defined UTC range). For a non-TAI instance `epochMillis` is the same as `utcMillis`, with `taiMillis` performing conversions.

During a leap second the `epochMillis`/`utcMillis` value is pinned 59 seconds, 999 milliseconds into the minute in which the leap seconds occurs. The `taiMillis` value, however, still varies over the course of that second.

In the unlikely event a negative leap second is ever declared, the `epochMillis`/`utcMillis` value for a non-TAI `DateTime` instance will simply skip over the leap second, while `taiMillis` advances contiguously.

`epochSeconds`, `utcSeconds`, and `taiSeconds` are essentially the same as `epochMillis`, `utcMillis`, and `taiMillis`, but functioning at one-second resolution.

### Sorting and comparison with TAI and non-TAI `DateTime` instances

* TAI instances are compared to each other by `taiMillis`.
* Non-TAI instances are compared to each other by `utcMillis`, but if the `utcMillis` values are identical, comparison is done using `leapSecondMillis`.
* Mixed types are compared by `taiMillis`.
* Coarse-resolution comparison (e.g. only comparing to a resolution of whole seconds or whole days) between mixed TAI and non-TAI instances is not well-defined and should be avoided.

## Global default settings

The next two methods get or set the first year of the one hundred-year range that will be used to interpret two-digit year numbers. The “default default” is 1970, meaning that 00-69 will be treated as 2000-2069, and 70-99 will be treated as 1970-1999:

`ttime.getDefaultCenturyBase(): number;`<br>
`ttime.setDefaultCenturyBase(newBase: number): void;`

Get/set the default locale (or prioritized array of locales). This defaults to the value provided either by a web browser or the Node.js environment:

`ttime.getDefaultLocale(): string | string[];`<br>
`ttime.setDefaultLocale(newLocale: string | string[]): void;`

Get/set the default timezone. The “default default” (if you don’t use `setDefaultTimezone()`) is:

1. The default timezone provided by the `Intl` package, if available.
2. The timezone determined by the `Timezone.guess()` function.
3. The `OS` timezone, a special **@tubular/time** timezone created by probing the JavaScript `Date` class to determine the rules of the unnamed JavaScript-supported local timezone.

`ttime.getDefaultTimezone(): Timezone;`<br>
`ttime.setDefaultTimezone(newZone: Timezone | string): void;`

## The `DateTime` class

The main `ttime()` function works by creating instances of the `DateTime` class. You can also use `new DateTime(`...`)` to create instances of `DateTime` directly. This is necessary for taking advantage of support for variable switch-over from the Julian to the Gregorian calendar, which by default is set at October 15, 1582.

### Constructor

```
  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null,
              gregorianChange?: GregorianChange);

  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null, locale?: string | string[],
              gregorianChange?: GregorianChange);
```

All arguments to the constructor are optional. When passed no arguments, `new DateTime()` will return an instance for the current moment, in the default timezone, default locale, and with the default October 15, 1582 Gregorian calendar switch-over.

* `initialTime`: This can be a single number (for milliseconds since 1970-01-01T00:00 UTC), an ISO-8601 date as a string, and ECMA-262 date as string, an ASP.​NET JSON date string, a JavaScript `Date` object, [a `DateAndTime` object](#the-ymddate-and-dateandtime-objects), an array of numbers (in the order year, month, day, hour, etc.), or a `null`, which causes the current time to be used.
* `timezone`: This can be a `Timezone` instance, a string specifying an IANA timezone (e.g. 'Pacific/Honolulu'), a UTC offset (e.g. 'UTC+04:00'), or `null` to use the default timezone.
* `locale`: a locale string (e.g. 'fr-FR'), an array of locales strings in order of preference (e.g. ['fr-FR', 'fr-CA', 'en-US']), or `null` to use the default locale.
* `gregorianChange`: The first date when the Gregorian calendar is active, the string `'J'` for a pure Julian calendar, the string 'G' for a pure Gregorian calendar, the constant `ttime.PURE_JULIAN`, the constant `ttime.PURE_GREGORIAN`, or `null` for the default of 1582-10-15. A date can take the form of a year-month-day ISO-8601 date string (e.g. '1752-09-14'), a year-month-day numeric array (e.g. [1918, 2, 14]), or a date as a `YMDDate` object.

As a string, `initialTime` can also include a trailing timezone or UTC offset, using the letter `Z` to indicate UTC (e.g. '1969‑07‑12T20:17Z'), or a specific timezone (e.g. '1969‑07‑20T16:17 EDT', '1969‑07‑20T16:17 America/New_York', or '1969‑07‑20T16:17-0400').

If the `timezone` argument is itself `null` or unspecified, this embedded timezone will become the timezone for the `DateTime` instance. If the `timezone` argument is also provided, the time will be parsed according to the first timezone, then it will be transformed to the second timezone.

`new DateTime('2022-06-01 14:30 America/Chicago', 'Europe/Paris', 'fr_FR').format('IMM ZZZ')` →<br>`1 juin 2022 à 21:30:00 Europe/Paris`

The following is an example of using the `gregorianChange` parameter to apply the change from the Julian to Gregorian calendar that was used by Great Britain, including what were the American colonies at the time:

`new DateTime('1752-09', null, '1752-09-14').getCalendarMonth(1).map(date => date.m === ttime.SEPTEMBER ? date.d : '-')`

```json5
[
  '-', 1,  2,  14, 15, 16, 17,
  18,  19, 20, 21, 22, 23, 24,
  25,  26, 27, 28, 29, 30, '-'
]
```

### Locking and cloning

The `lock()` method takes a mutable `DateTime` instance and makes it immutable, returning that same instance. _This is a one-way trip._ Once locked, an instance cannot be unlocked.

The `clone()` method creates a copy of a `DateTime` instance. By default, the copy is either locked or unlocked, the same as the original. You can, however, use `clone(false)` to create an unlocked, mutable copy of a locked original.

### `DateTime` astronomical time functions

Converts Julian days into milliseconds from the 1970-01-01T00:00 UTC epoch:

```
DateTime.julianDay(millis: number): number;
```

Converts milliseconds from the 1970-01-01T00:00 UTC epoch into Julian days:

```
DateTime.millisFromJulianDay(jd: number): number;
```

Given a year, month, day according to the standard Gregorian calendar change (SGC) of 1582-10-15, and optional hour, minute, and second UTC, returns a Julian day number.

```
DateTime.julianDay_SGC(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number;
```

### `DateTime` static constant

```
static INVALID_DATE;
```

### `DateTime` static methods

Compares two `DateTime` instances, or a `DateTime` instance and another date form, returns a negative value when the first date is less than the second, 0 when the two are equal (for the given `resolution`), or positive value when the first date is greater than the second:

```
static compare(d1: DateTime, d2: DateTime | string | number | Date,
               resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): number;
```

Determine if a value is an instance of the `DateTime` class:

```
static isDateTime(obj: any): obj is DateTime; // boolean
```

### `DateTime` getters

```
dstOffsetMinutes: number;
dstOffsetSeconds: number;
error: string | undefined; // Explanation of why a DateTime is considered invalid, undefined if valid.
leapSecondMillis: number; // Number of milliseconds into a leap second (normally 0)
// 'DATETIME` is the usual type, but a DateTime instance can be DATELESS (time-only)
//   or an abstract date/time with no real-world timezone.
type: 'ZONELESS' | 'DATELESS' | 'DATETIME';
utcOffsetMinutes: number;
utcOffsetSeconds: number;
valid: boolean;
wallTimeLong: DateAndTime;
wallTimeShort: DateAndTime;
```

### `DateTime` getter/setters

```
locale: string | string[];
epochMillis: number;
epochSeconds: number;
taiMillis: number;
taiSeconds: number;
timezone: Timezone;
utcMillis: number; // utcTimeMillis has been deprecated
utcSeconds: number; // utcTimeSeconds has been deprecated
wallTime: DateAndTime;
```

### Other `DateTime` methods

```
computeUtcMillisFromWallTime(wallTime: DateAndTime): number;

format(fmt = fullIsoFormat, localeOverride?: string | string[]): string;

// For questions like “What date is the second Tuesday of this month?”
//   `dayOfTheWeek` 0-6 for Sun-Sat, index is 1-based. You can use the constant `ttime.LAST`
//   for `index` to get the last occurrence of a particular day of the month, be it the 4th or 5th
//   (or even earlier, as in some unusual Julian-Gregorian transition months).
getDateOfNthWeekdayOfMonth(year: number, month: number, dayOfTheWeek: number, index: number): number;
getDateOfNthWeekdayOfMonth(dayOfTheWeek: number, index: number): number;

// Number of days from 1970-01-01
getDayNumber(yearOrDate: YearOrDate, month?: number, day?: number);

// Day of the week for date, 0-6 for Sun-Sat
getDayOfWeek(): number;
getDayOfWeek(year: number, month: number, day: number): number;
getDayOfWeek(date: YMDDate | number[]): number; // As number[]: [year, month, day]

// How many times does a given day of the week (0-6 for Sun-Sat) occur during this month?
getDayOfWeekInMonthCount(year: number, month: number, dayOfTheWeek: number): number;
getDayOfWeekInMonthCount(dayOfTheWeek: number): number;

// Is the date the 1st, 2nd, 3rd, 4th, or 5th occurrence of its day of the week
//   during the given month?
getDayOfWeekInMonthIndex(year: number, month: number, day: number): number;
getDayOfWeekInMonthIndex(date: YMDDate | number[]): number;
getDayOfWeekInMonthIndex(): number;

// Returns the date (day-of-the-month only) of the first occurrence of a given day
//   of the week on or after a given date. For example, election day in the
//   United States is the first Tuesday on or after November 2, so election day
//   in 2024 is getDayOnOrAfter(2024, 11, ttime.TUESDAY, 2).
getDayOnOrAfter(year: number, month: number, dayOfTheWeek: number, minDate: number): number;
getDayOnOrAfter(dayOfTheWeek: number, minDate: number): number;

// Returns the date (day-of-the-month only) of the first occurrence of a given day
//   of the week on or before a given date.
getDayOnOrBefore(year: number, month: number, dayOfTheWeek: number, maxDate: number): number;
getDayOnOrBefore(dayOfTheWeek: number, minDate: number): number;

// Number of days in a given year. Typically 365 or 366, but it can be smaller values
//   for years when days have been dropped when transitioning from the Julian to the
//   Gregorian calendar.
getDaysInYear(year?: number): number;

// Returned date is an arbitrary distant future for a pure Julian calendar, distant past
// for pure Gregorian, otherwise the first-used Gregorian date.
getGregorianChange(): YMDDate;

// This method is for finding the date of the first day of the first week of a week-based
//   calendar, which can be a few days before or after January 1, depending on how weeks
//   are defined. For ISO weeks, this date is the Monday at the beginning of a week which
//   contains January 4, e.g. getStartDateOfFirstWeekOfYear(year, 1, 4).
getStartDateOfFirstWeekOfYear(year: number, startingDayOfWeek?: number, minDaysInCalendarYear?: number): YMDDate;

// UTC millisecond value at the start of a given day, per the `DateTime` instance’s
//   timezone and calendar rules.
getStartOfDayMillis(yearOrDate?: YearOrDate, month?: number, day?: number): number;

// Convert a UTC millisecond value into a `DateAndTime` object, per the `DateTime` instance’s
//   timezone and calendar rules.
getTimeOfDayFieldsFromMillis(millis: number): DateAndTime;

// Display short name for `DateTime` instance’s timezone, such as "EDT" or "PST".
getTimezoneDisplayName(): string;

// Typically 52 or 53, the number of weeks in a week-based year, ISO by default.
getWeeksInYear(year: number, startingDayOfWeek = 1, minDaysInCalendarYear = 4): number;

// Typically 52 or 53, the number of weeks in a locale-specific week-based year.
getWeeksInYearLocale(year: number): number;

// For a given standard calendar date, return the week-based year, week number, and day
//   number, according to startingDayOfWeek and minDaysInCalendarYear, defaulting to ISO.
getYearWeekAndWeekday(year: number, month: number, day: number,
  startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];
getYearWeekAndWeekday(date: YearOrDate | number,
  startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];

// For a given standard calendar date, return the locale-specific week-based year,
// week number, and day.
getYearWeekAndWeekdayLocale(year: number, month: number, day: number): number[];
getYearWeekAndWeekdayLocale(date: YearOrDate | number): number[];

// Check if a given date is before this DateTime’s switch to the Gregorian calendar.
isJulianCalendarDate(yearOrDate: YearOrDate, month?: number, day?: number): boolean;

// `true` if the given year is a leap year, according to this `DateTime` instance's
// calendar rules. For example:
//
// new (null, null, 'G').isLeapYear(1900) → false
// new (null, null, 'J').isLeapYear(1900) → true
isLeapYear(year?: number): boolean;

isPureGregorian(): boolean;

isPureJulian(): boolean;

// Is the DateTime instance TAI?
isTai(): boolean;

// Is the DateTime instance UTC, or a timezone offset from UTC?
// (Anything other than TAI, DATELESS, and ZONELESS.)
isUtcBased(): boolean;

// Sets the first date when the Gregorian calendar starts. Pass 'J' as the first argument to get
//   a perpetual Julian calendar, or 'G' for always-Gregorian (extending even before the Gregorian
//   calendar existed - a fancy word for that being a "proleptic" Gregorian calendar). You can
//   also pass a string date (e.g. '1752-09-14'), a numeric array (e.g. [1752, 9, 14], or a YMDDate
//   object. If you pass a numeric year alone for the first argument, include two more arguments
//   for the month and date as well.
setGregorianChange(gcYearOrDate: YearOrDate | string, gcMonth?: number, gcDate?: number): DateTime;

// If pureGregorian is true, calendar becomes pure, proleptic Gregorian. If false, standard change date of 1582-10-15 is applied.
setPureGregorian(pureGregorian: boolean): DateTime;

// If pureJulian is true, calendar becomes pure Julian. If false, standard change date of 1582-10-15 is applied.
setPureJulian(pureJulian: boolean): DateTime;

// Throws an exception if the `DateTime` is invalid, otherwise returns the instance itself.
throwIfInvalid(): DateTime;

// Convert DateTime to a JavaScript Date.
toDate(): Date;

// Format as hour and minute, using the format 'HH:mm', or 'HH:mmv' if includeDst is true.
toHoursAndMinutesString(includeDst = false): string;

// Format as 'Y-MM-DDTHH:mm:ss.SSSZ', trimming to an optional maxLength that *does not* count
//   any leading + or - sign. If maxLength is negative, remove that many characters from the
//   end of the full string. Base length for positive years <= 9999 is 24 characters.
toIsoString(maxLength?: number): string;

// Create a clone of a DateTime instance with a different locale.
toLocale(newLocale: string | string[]): DateTime;

// Convert to a string, such as 'DateTime<2017-03-02T14:45:00.000 +01:00>.
//   When dateless: 'DateTime<20:17:15.000>'
//   When zoneless: 'DateTime<2017-03-02T14:45:00.000>'
//   When TAI: 'DateTime<2017-03-02T14:45:00.000 TAI>'
toString(): string;

// Format as 'Y-MM-DD HH:mmv'.
toYMDhmString(): string;
```

## The `Calendar` class

This is the superclass of the `DateTime` class. It stores no internal date value, however. It merely implements calendar calculations, and holds the Julian/Gregorian change date to be used for the calendar.

Most of the purely date-related methods of `DateTime` exist on `Calendar`. `Calendar` does not have any methods that refer to an internal date value (such as `add`, `roll`, etc.), formatting, locale, or timezone.

The constructor takes the same arguments as the `setGregorianChange()` method:

```
constructor(gcYearOrDateOrType?: YearOrDate | CalendarType | string, gcMonth?: number, gcDate?: number);
```

This `Calendar` method adds a given number of days to a date:

```
addDaysToDate(deltaDays: number, yearOrDate: YearOrDate, month?: number, day?: number): YMDDate
```

## The `Timezone` class

### Static `Timezone` constants

```
  static OS_ZONE: Timezone; // Local timezone as derived from analyzing values returned by JavaScript `Date`.
  static TAI_ZONE: Timezone; // International Atomic Time (TAI).
  static UT_ZONE: Timezone; // Universal Coordinated Time (AKA UTC, UCT, GMT, Zulu Time, etc.)
  static ZONELESS: Timezone; // A pseudo timezone for abstract date/time instances.
  static DATELESS: Timezone; // A pseudo timezone for abstract dateless, time-only `DateTime` instances.
```

### Static `Timezone` getter

```
version: string; // Current timezone version, e.g. 2021a
```

### `LeapSecondInfo` interface

This defines the moment *immediately after* the insertion or deletion of a leap second.

```
export interface LeapSecondInfo {
  utcMillis: number;
  taiMillis: number;
  dateAfter: YMDDate;
  deltaTai: number;
  isNegative: boolean;
  // Optional flag indicating if a specific moment in time is during a leap second.
  // When a query is a UTC value, this flag is true for the 59th second of a minute.
  inLeap?: boolean;
  // For an unlikely, but theoretically possible, negative leap second, this optional flag
  // is true if a query time is in the 58th second of a minute, preceding an omitted 59th
  // second.
  inNegativeLeap?: boolean;
}
```

### Static `Timezone` methods

Check if a given IANA `zoneName` is associated with an ISO Alpha-2 (two-letter) `country` code:

```
static doesZoneMatchCountry(zoneName: string, country: string): boolean;
```

Find the officially-defined, or proleptic, difference in seconds between TAI and UTC at the given TAI moment (in milliseconds from the 1970 epoch). This value will be part of an `LeapSecondInfo` object which also defines when that offset started (the moment after the insertion/deletion of a leap second), and the flags `inLeap` and `inNegativeLeap` (defined above). This can be `null` if no leap seconds are declared in the current timezone data:

```
static findDeltaTaiFromUtc(utcTime: number): LeapSecondInfo;
```

Find the officially-defined, or proleptic, difference in seconds between TAI and UTC at the given UTC moment (in milliseconds from the 1970 epoch). This value will be part of an `LeapSecondInfo` object which also defines when that offset started (the moment after the insertion/deletion of a leap second), and the flags `inLeap` and `inNegativeLeap` (defined above). This can be `null` if no leap seconds are declared in the current timezone data:

```
static findDeltaTaiFromUtc(utcTime: number): LeapSecondInfo;
```

<a id="format-utc-offset" name="format-utc-offset"></a>Take a duration, `offsetSeconds`, and turn it into a formatted UTC offset, e.g. `-18000` → `'-05:00'`. If `noColons` is set to `false` (it defaults to `true` if not specified), colons will be omitted from the output, e.g. `'-0500'`. If the duration is not in whole minutes, seconds will be added to the output, e.g. `'+15:02:19'`:

```
static formatUtcOffset(offsetSeconds: number, noColons = false): string;
```

Return a timezone matching `name`, if available. If no such timezone exists, a clone of `Timezone.OS_ZONE` is returned, but with the given `name`, and with `result.error` containing an error message. `name` can be `"DATELESS"`, `"TAI"`, or `"ZONELESS"`, as well as an IANA timezone name, or common name like `"UTC"` or `"GMT"`:

```
static from(name: string): Timezone;
```

Get all timezone names which can be treated as aliases for the give zone name. All equivalent timezones are treated as aliases for each other by this method, with no particular regard given to which zone name is the actual root name as opposed to being a link.

```
static getAliasesForZone(zone: string): string[]
```

This method returns a full list of available IANA timezone names. Does **not** include names for the above static constants:

```
static getAvailableTimezones(): string[];
```

Get a `Set` of ISO Alpha-2 (two-letter) country codes associated with a given IANA `zoneName`:

```
static getCountries(zoneName: string): Set<string>;
```

The last known, declared leap second. This can be `null` if no leap seconds are declared in the current timezone data:

```
static getDateAfterLastKnownLeapSecond(): YMDDate
```

Get the symbol (`^`, `§`, `#`, `❄`, or `~`) **@tubular/time** associates with various Daylight Saving Time offsets, or an empty string for `dstOffsetSeconds` of 0:

```
static getDstSymbol(dstOffsetSeconds: number): string;
```

Get the full list of leap seconds, including 10 non-official, proleptic leap seconds defined from 1959 to 1971, and all officially declared leap seconds thereafter (up to the latest software update). This can be `null` if no leap seconds are declared in the current timezone data:

```
static getLeapSecondList(): LeapSecondInfo[];
```

This method returns a list of available IANA timezone names in a structured form, grouped by standard UTC offset and Daylight Saving Time offset (if any), e.g. `+02:00`, `-05:00§`, etc. The “MISC” timezones, and the various IANA “Etc” timezones, are filtered out:

```
export interface OffsetsAndZones {
  offset: string;
  offsetSeconds: number;
  dstOffset: number;
  zones: string[];
}

static getOffsetsAndZones(): OffsetsAndZones[]
```

Get a rough estimate, if applicable and available, for the population of an IANA `zoneName`, otherwise 0:

```
static getPopulation(zoneName: string): number;
```

This method returns a full list of available IANA timezone names in a structured form, grouped by regions (e.g. “Africa”, “America”, “Etc”, “Europe”, etc.). The large “America” region is broken down into three regions, “America”, “America/Argentina”, and “America/Indiana”. There is also a “MISC” region that contains a number of redundant, deprecated, or legacy timezones, such as many single-name-no-slash timezones and SystemV timezones:

```
export interface RegionAndSubzones {
  region: string;
  subzones: string[];
}

static getRegionsAndSubzones(): RegionAndSubzones[];
```

If a `shortName` such as 'PST' or 'EET' is available, return information about that timezone, or `undefined` if not available. Please keep in mind that some short timezone names are ambiguous, so you might not get the desired result:

```
export interface ShortZoneNameInfo {
  utcOffset: number;
  dstOffset: number;
  ianaName: string;
}

static getShortZoneNameInfo(shortName: string): ShortZoneNameInfo;
```

Return a timezone matching `name`, if available. If no such timezone exists, a clone of `Timezone.OS_ZONE` is returned, but using the given `name`, and with `result.error` containing an error message. If the name `'LMT'` (for Local Mean Time) is used, then include the optional `longitude` in degrees (negative west of the Prime Meridian), and a timezone matching Local Mean Time for that longitude will be returned, with a UTC offset at a resolution of one (time) minute (as opposed to angular minutes):

```
static getTimezone(name: string, longitude?: number): Timezone
```

The same as `getDateAfterLastKnownLeapSecond()`, but `null` if the given date is in the past:

```
static getUpcomingLeapSecond(): YMDDate;
```

This method returns the name of the IANA timezone that best matches your local timezone. If the `Intl` package is available, it’s not a guess at all, but a proper system-reported value. Otherwise, the `guess()` method finds the most populous timezone that most closely matches `OS_ZONE`. If `recheck` is `true`, a fresh check is forced instead of using a cached result:

```
static guess(recheck = false): string;
```

Check if there is a timezone matching `name`:

```
static has(name: string): boolean;
```

Check if a `shortName` for a timezone, such as 'PST' or 'EET', is available:

```
static hasShortName(name: string): boolean;
```

### `Timezone` getters

```
aliasFor: string | undefined; // undefined for a primary timezone name
countries: Set<string>; // ISO Alpha-2 country codes, empty set if no associated countries
dstOffset: number; // in seconds
dstRule: string | undefined; // undefined, or textual representation of last start-of-DST rule in effect.
error: string | undefined; // undefined if no error
population: number; // 0 if inapplicable or unknown
stdRule: string | undefined; // undefined, or textual representation of last end-of-DST rule in effect.
usesDst: boolean;
utcOffset: number; // in seconds
zoneName: string;
```

### `Timezone` methods

For a given `utcTime`, find the most recent change in the timezone, on or before `utcTime`. The change can be a DST “spring forward” or “fall back” change, a change in the standard UTC offset, or even just a change in the short-form name of the timezone:

```
export interface Transition {
  transitionTime: number; // in milliseconds
  utcOffset: number; // in seconds
  dstOffset: number; // in seconds
  name?: string;
  deltaOffset?: number; // in seconds, compared to previous transition utcOffset
  dstFlipped?: boolean; // true if dstOffset has changed 0 to non-0, or non-0 to 0, from previous transition
  baseOffsetChanged?: boolean;
  wallTime?: number; // in milliseconds
  wallTimeDay?: number;
}

findTransitionByUtc(utcTime: number): Transition | null;
```

For a given `wallTime`, expressed in milliseconds, find the most recent change in the timezone, on or before `wallTime`. For an ambiguous wall time, the _later_ time applies:

```
findTransitionByWallTime(wallTime: number): Transition | null
```

Get all transitions in a timezone. Returns null for simple, single-UTC-offset timezones which have no transitions.

```
getAllTransitions(): Transition[] | null
```

Get the short-form name for the timezone, dependent upon `utcTime` in milliseconds, such as the America/New_York timezone returning `'EST'` during the winter, but `'EDT'` during the summer.

```
getDisplayName(utcTime: number);
```

Return the formatted UTC offset for a given moment in time, specified in milliseconds, [formatted as per `Timezone.formatUtcOffset`](#format-utc-offset):

```
getFormattedOffset(utcTime: number, noColons = false): string;
```

Return the UTC offset in seconds (with effect of DST, if applicable, included) for the timezone at `utcTime` in milliseconds. The `day` parameter is usually not needed, but for the [edge case of a 0-length day](#apia), passing the wall-time day value helps distinguish between the two overlapping midnights of one day and the instantaneous next day:

```
getOffset(utcTime: number, day = 0): number;
```

For a given `wallTime`, in milliseconds for this timezone, return the UTC offset in seconds at that time. Where wall time is ambiguous, `wallTime` refers to the _later_ time:

```
getOffsetForWallTime(wallTime: number): number;
```

For a given `utcTime`, in milliseconds, return the UTC offset in seconds, and DST offset in seconds, at that time for this timezone. The UTC offset includes the effect of the DST offset, if any. The result is a two-element numeric array, `[utcOffset, dstOffset]`:

```
getOffsets(utcTime: number): number[];
```

Check if the given `utcTime`, in milliseconds, is during Daylight Saving Time for this timezone:

```
isDuringDst(utcTime: number): boolean;
```

Check if this timezone explicitly supports the given `country`, specified as a two-letter ISO Alpha-2 code:

```
supportsCountry(country: string): boolean;
```

## Other functions available on `ttime`

Get the minimum number of days within a given calendar year needed for a week to be considered part of a locale’s week-based calendar for that year:

```
ttime.getMinDaysInWeek(locale: string | string[]): number;
```

Day number (0-6 for Sunday-Saturday) considered the first day of a week for a locale:

```
ttime.getStartOfWeek(locale: string | string[]): number;
```

Day numbers (0-6 for Sunday-Saturday) considered to comprise weekend days for a locale:

```
ttime.getWeekend(locale: string | string[]): number[];
```

Determine if a value is an instance of the `Date` class:

```
ttime.isDate(obj: any): obj is Date; // boolean
```

Determine if a value is an instance of the `DateTime` class:

```
ttime.isDateTime(obj: any): obj is DateTime; // boolean
```

Converts Julian days into milliseconds from the 1970-01-01T00:00 UTC epoch:

```
ttime.julianDay(millis: number): number;
```

Converts milliseconds from the 1970-01-01T00:00 UTC epoch into Julian days:

```
ttime.millisFromJulianDay(jd: number): number;
```

Given a year, month, day according to the standard Gregorian calendar change (SGC) of 1582-10-15, and optional hour, minute, and second UTC, returns a Julian day number.

```
ttime.julianDay_SGC(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number;
```

For a given TDT Julian Date (ephemeris time), return the number of seconds that TDT is ahead of Universal Time (UT1):

```
ttime.getDeltaTAtJulianDate(timeJDE: number): number;
```

For a given TAI millisecond value (1970 epoch), return the corresponding UT1 or UTC milliseconds:

```
ttime.taiToUtMillis(millis: number, forUtc = false): number;
```

For a given TDT Julian Date (ephemeris time), return the Julian Date in Universal Time (UT1):

```
ttime.tdtToUt(timeJDE: number): number;
```

For a given UT1 or UTC millisecond value (1970 epoch), return the corresponding TAI milliseconds:

```
ttime.utToTaiMillis(millis: number, asUtc = false): number;
```

For a given UT1 Julian Date (Universal Time), return the Julian Date in ephemeris time (TDT):

```
ttime.utToTdt(timeJDU: number): number;
```

Create new `Intl.DateTimeFormat` instances with more flexibility for mixing options. For instance:

> `new DateTimeFormat('ja', { timeStyle: 'short' })`

... shows hours with no leading zero for single-digit hours. If you try to add the leading zero like this:

> `new DateTimeFormat('ja', { timeStyle: 'short', hour: '2-digit' })`

...an exception is thrown. By using `newDateTimeFormat`, however, `@tubular/time` will attempt to override `dateStyle` and `timeStyle` options with specific variations which are otherwise disallowed.

`ttime.newDateTimeFormat(locales?: string | string[], options?: DateTimeFormatOptions)`

## Constants available on `ttime`

```
// Locale
ttime.defaultLocale;

// Feature flags
ttime.hasDateTimeStyle: boolean;
ttime.hasIntlDateTime: boolean;

// Formats
ttime.DATETIME_LOCAL: string;
ttime.DATETIME_LOCAL_SECONDS: string;
ttime.DATETIME_LOCAL_MS: string;
ttime.DATE: string;
ttime.TIME: string;
ttime.TIME_SECONDS: string;
ttime.TIME_MS: string;
ttime.WEEK: string;
ttime.WEEK_AND_DAY: string;
ttime.WEEK_LOCALE: string;
ttime.WEEK_AND_DAY_LOCALE: string;
ttime.MONTH: string;

// Calendar
ttime.PURE_JULIAN: CalendarType;
ttime.PURE_GREGORIAN: CalendarType;

ttime.SUNDAY: number;
ttime.MONDAY: number;
ttime.TUESDAY: number;
ttime.WEDNESDAY: number;
ttime.THURSDAY: number;
ttime.FRIDAY: number;
ttime.SATURDAY: number;

ttime.JANUARY: number;
ttime.FEBRUARY: number;
ttime.MARCH: number;
ttime.APRIL: number;
ttime.MAY: number;
ttime.JUNE: number;
ttime.JULY: number;
ttime.AUGUST: number;
ttime.SEPTEMBER: number;
ttime.OCTOBER: number;
ttime.NOVEMBER: number;
ttime.DECEMBER: number;

ttime.LAST: number; // For use with getDateOfNthWeekdayOfMonth()
```
