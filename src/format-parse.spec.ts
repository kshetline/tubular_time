import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';
import ttime, { initTimezoneLarge } from './index';
import { localeList } from './locale-data';
import { analyzeFormat, parse } from './format-parse';

describe('FormatParse', () => {
  before(() => {
    initTimezoneLarge();
    DateTime.setDefaultLocale('en-us');
    DateTime.setDefaultTimezone('America/New_York');
  });

  it('should properly decompose format strings', () => {
    expect(new DateTime('2022-07-07 8:08 ACST').format('IMM zzz ZZZ z')).to.equal('Jul 7, 2022, 8:08:00 AM Australian Central Standard Time Australia/Adelaide GMT+9:30');
    expect(new DateTime('2022-07-07 8:08 PST').format('IMM zzz ZZZ z')).to.equal('Jul 7, 2022, 9:08:00 AM Pacific Daylight Time America/Los_Angeles PDT');
    expect(new DateTime('2022-07-07 8:08 PST').format('IMM{hourCycle:h23} zzz ZZZ z')).to.equal('Jul 7, 2022, 09:08:00 Pacific Daylight Time America/Los_Angeles PDT');
    expect(new DateTime('2022-07-07 8:08 PDT').format('IMM zzz ZZZ z')).to.equal('Jul 7, 2022, 8:08:00 AM Pacific Daylight Time America/Los_Angeles PDT');
    expect(new DateTime('1995-05-06 EDT').format('IMM zzz ZZZ z')).to.equal('May 6, 1995, 12:00:00 AM Eastern Daylight Time America/New_York EDT');
    expect(new DateTime('foo').valid).is.false;
    expect(new DateTime('2021-01-02').format('GGGG-[W]WW-E')).to.equal('2020-W53-6');
    expect(new DateTime('2021-01-03').format('GGGG-[W]WW-E')).to.equal('2020-W53-7');
    expect(new DateTime('2021-01-04').format('GGGG-[W]WW-E')).to.equal('2021-W01-1');
    expect(new DateTime('2021-W06-4').format('GGGG-[W]WW-E')).to.equal('2021-W06-4');
    expect(new DateTime('2021-W06-4').format('gggg-[w]ww-e')).to.equal('2021-w07-5');
    expect(new DateTime('20212-06-04').format('YYYY-MM-DD')).to.equal('20212-06-04');
    expect(new DateTime('20212-06-04').format('Y-MM-DD')).to.equal('+20212-06-04');
    expect(new DateTime('1986-09-04T20:30:03').format('yyyy-MMM-DD, hh:mm A')).to.equal('1986-Sep-04, 08:30 PM');
    expect(new DateTime('1986-09-04T20:30:03').format('LTS')).to.equal('8:30:03 PM');
    expect(new DateTime('1986-09-04T20:30:03').format('LLLL')).to.equal('Thursday, September 4, 1986, 8:30 PM');
    expect(new DateTime('1986-09-04T20:30:03').format('ILS')).to.equal('September 4, 1986 at 8:30 PM');
    expect(new DateTime('1986-09-04T20:30:03 America/New_York').format('IxL')).to.equal('8:30:03 PM EDT');
    expect(new DateTime('1986-09-04T20:30:03Z').format('IxL')).to.equal('8:30:03 PM UTC');
    expect(new DateTime('1986-09-04').format('MMM D, y N')).to.equal('Sep 4, 1986 AD');
    expect(new DateTime('1986-09-04').format('MMM D, y n')).to.equal('Sep 4, 1986');
    expect(new DateTime('-1986-09-04').format('MMM D, y n')).to.equal('Sep 4, 1987 BC');
    expect(new DateTime('1986-09-04T20:30:03').toLocale('fr').format('yyyy MMMM DD, hh:mm A')).to.equal('1986 septembre 04, 08:30 PM');
    expect(new DateTime('1986-05-04T20:30:03').format('yyyy MMMM DD, HH:mm', 'es')).to.equal('1986 mayo 04, 20:30');
    expect(new DateTime('2021-05-04').format('YYYY-MM-DD [Q:]Q Qo [M:]Mo [d:]do [E:]E [e:]e'))
      .to.equal('2021-05-04 Q:2 2nd M:5th d:2nd E:2 e:3');
    expect(new DateTime('1986-09-04').toLocale('en,ru').format('IS')).to.equal('9/4/86');
    expect(new DateTime('1986-09-04').toLocale(['ru', 'en']).format('IS')).to.equal('04.09.1986');
    expect(new DateTime('1986-09-04').toLocale(['qq', 'fr']).format('IS')).to.equal('04/09/1986');
    expect(new DateTime('1986-09-04').format('D\u200F/M\u200F/YYYY h:mm A', 'ar')).to.equal('٤\u200F/٩\u200F/١٩٨٦ ١٢:٠٠ ص');
    expect(new DateTime('1986-09-04').format('D/M/YY h:mm A', 'bn')).to.equal('৪/৯/৮৬ ১২:০০ AM');
    expect(new DateTime('1986-09-04').format('ISS', 'bn')).to.equal('৪/৯/৮৬ ১২:০০ AM');
    expect(new DateTime('1986-09-04').format('ISS{numberingSystem:latn}', 'bn')).to.equal('4/9/86 12:00 AM');
    expect(new DateTime('1986-09-04').format('DD-MM-YY နံနက် H:mm', 'my')).to.equal('၀၄-၀၉-၈၆ နံနက် ၀:၀၀');
  });

  it('should properly analyze Intl.DateTimeFormat-generated formats', function () {
    this.slow(30000);
    this.timeout(45000);

    localeList.forEach(lcl => {
 //     console.log('\n\nLocale: %s', lcl);
      const styles = ['full', 'long', 'medium', 'short', undefined];

      for (let i = 0; i < 5; ++i) {
        for (let j = 0; j < (i < 4 ? 5 : 4); ++j) {
          const format = analyzeFormat(lcl, styles[i], styles[j]);
//          console.log('%s%s: %s', i, j, format);

          expect(!!format).is.true;
          expect(i !== 0 || lcl === 'my' || format.includes('dddd')).is.true;
          expect(i === 4 || format.includes('M')).is.true;
          expect(i === 4 || format.includes('D')).is.true;
          expect(j === 4 || /[hk]/i.test(format)).is.true;
          expect(j === 4 || /m\b/i.test(format)).is.true;
        }
      }
    });
  });

  it('should be able to parse dates', () => {
    expect(parse('1/17/2022 1:22:33', 'MM/DD/YYYY H:m:s', 'UTC').toIsoString(19)).to.equal('2022-01-17T01:22:33');
    expect(parse('1/17/2022 1:22:33.44 am', 'MM/DD/YYYY H:m:s.S A', 'UTC').toIsoString(23)).to.equal('2022-01-17T01:22:33.440');
    expect(parse('1/17/2022 1:22 am', 'MM/DD/YYYY H:m:s.S A', 'UTC').toIsoString(19)).to.equal('2022-01-17T01:22:00');
    expect(parse('1/17/2022 1:22:33 pm', 'MM/DD/YYYY H:m:s a', 'UTC').toIsoString(19)).to.equal('2022-01-17T13:22:33');
    expect(parse('1-17.2022 1 22 33 pm', 'MM/DD/YYYY H:m:s a', 'UTC').toIsoString(19)).to.equal('2022-01-17T13:22:33');
    expect(parse('Jan 17, 2022 at 1:22:33 pm', 'MMM DD, YYYY [at] H:m:s a', 'UTC').toIsoString(19)).to.equal('2022-01-17T13:22:33');
    expect(parse('Sun Jan 17, 2022 at 1:22:33 pm', 'ddd MMM DD, YYYY [at] H:m:s a', 'UTC').toIsoString(19)).to.equal('2022-01-17T13:22:33');
    expect(parse('১৭ জানু, ২০২২ ১:২২:৩৩ PM', 'IMM', 'UTC', 'bn').toIsoString(19)).to.equal('2022-01-17T13:22:33');
    expect(parse('১৭ জানু, ২০২২ ১:২২:৩৩ রাত', 'IMM', 'UTC', 'bn').toIsoString(19)).to.equal('2022-01-17T01:22:33');
    expect(parse('2020, W1, D1', 'GGGG, [W]W, [D]E', 'UTC').toIsoString(10)).to.equal('2019-12-30');
    expect(parse('2020, W7, D5', 'GGGG, [W]W, [D]E', 'UTC').format('GGGG-[W]WW-E')).to.equal('2020-W07-5');
    expect(parse('2020, w1, d1', 'gggg, [w]w, [d]e', 'UTC').toIsoString(10)).to.equal('2019-12-29');
    expect(parse('2020, w32, d4', 'gggg, [w]w, [d]e', 'UTC').format('gggg-[w]ww-e')).to.equal('2020-w32-4');
    expect(parse('January 27, 2021 9:43 PM', 'LLL').toString()).to.equal('DateTime<2021-01-27T21:43:00.000 -05:00>');
    expect(parse('1:05:57 AM', 'LTS').toString()).to.equal('DateTime<01:05:57.000>');
    expect(parse('11/7/2021 1:25 AM', 'MM/DD/YYYY h:m a', 'America/Denver').toString()).to.equal('DateTime<2021-11-07T01:25:00.000 -06:00§>');
    expect(parse('11/7/2021 1:25₂ AM', 'MM/DD/YYYY h:m a', 'America/Denver').toString()).to.equal('DateTime<2021-11-07T01:25:00.000₂-07:00>');
    expect(parse('2016-12-31T23:59:60', ttime.DATETIME_LOCAL_SECONDS, 'UTC',
      undefined, true).toString()).to.equal('DateTime<2016-12-31T23:59:60.000 +00:00>');
  });

  it('should correctly handle two-digit years', () => {
    const saveBase = DateTime.getDefaultCenturyBase();

    DateTime.setDefaultCenturyBase(1970);
    expect(ttime('7/20/76', 'IS').toIsoString(10)).to.equal('1976-07-20');
    DateTime.setDefaultCenturyBase(2000);
    expect(ttime('7/20/76', 'IS').toIsoString(10)).to.equal('2076-07-20');
    DateTime.setDefaultCenturyBase(saveBase);
  });

  it('should be able to parse back formatted output', function () {
    const years = 10;
    const skip = 5000; // 50 or less for anything more than a cursory test
    this.slow(Math.max(years * 400000 / skip, 15000));
    this.timeout(Math.max(years * 550000 / skip, 20000));

    localeList.forEach(lcl => {
      // if (lcl < 'zh') return;
      // console.log('Locale: %s', lcl);
      const styles = ['F', 'L', 'M', 'S'];

      loop:
      for (let i = 0; i < 4; ++i) {
        for (let j = 0; j < 4; ++j) {
          for (let t = 0; t < 31_622_400_000 * years; t += 43_860_000 * skip) { // 12h:11m
            const fmt = 'I' + styles[i] + styles[j];
            const time = new DateTime(t, 'UTC', lcl);

            if (time.getMinutesInDay() !== 1440)
              continue;

            const timeString = time.format(fmt, lcl);
            let parsed: DateTime;

            try {
              parsed = parse(timeString, fmt, 'UTC', lcl);
            }
            catch (e) {
              const t2 = time.format(fmt, 'en-us');
              console.error(`${lcl}, ${fmt}: ${timeString}, ${t2}, parse failed: ${e.message}`);
              parsed = parse(timeString, fmt, 'UTC', lcl);
              break loop;
            }

            expect(parsed?.epochMillis).to.equal(t, `${lcl}, ${fmt}: ${timeString} ==> ${parsed.toIsoString()}`);
          }
        }
      }
    });
  });

  it('should be able to parse dateless times', () => {
    expect(new DateTime('17:18:19').toString()).to.equal('DateTime<17:18:19.000>');
    expect(parse('5:18:19pm', 'IxF', 'en-us').toString()).to.equal('DateTime<17:18:19.000>');
  });

  it('should be able to format and parse BCE/CE eras', () => {
    expect(new DateTime('2022-07-07').format('MMM D, y n')).to.equal('Jul 7, 2022');
    expect(new DateTime('2022-07-07').format('MMM D, y N')).to.equal('Jul 7, 2022 AD');
    expect(new DateTime('-2021-07-07').format('MMM D, y n')).to.equal('Jul 7, 2022 BC');
    expect(new DateTime('-2021-07-07').format('MMM D, Y')).to.equal('Jul 7, -2021');
    expect(new DateTime('-2021-07-07').format('MMM D, y NNNN')).to.equal('Jul 7, 2022 Before Christ');
    expect(parse('Jul 7, 2022', 'MMM D, y n').toIsoString(10)).to.equal('2022-07-07');
    expect(parse('Jul 7, 2022 ad', 'MMM D, y n').toIsoString(10)).to.equal('2022-07-07');
    expect(parse('Jul 7, 2022 bc', 'MMM D, y n').toIsoString(10)).to.equal('-2021-07-07');
    expect(parse('Jul 7, 2022 bc, 3:00', 'MMM D, Y, H:mm').toIsoString(10)).to.equal('-2021-07-07');
    expect(parse('Jul 7, 2022 bce', 'MMM D, Y').toIsoString(10)).to.equal('-2021-07-07');
    expect(parse('Jul 7, 2022 Before Common Era', 'MMM D, Y').toIsoString(10)).to.equal('-2021-07-07');
  });

  it('should be able to parse times with timezones', () => {
    expect(parse('Jul 7, 2022 04:05 PM America/Chicago', 'MMM D, y n hh:mm A z').epochMillis)
      .to.equal(Date.UTC(2022, 6, 7, 16, 5, 0) + 5 * 3_600_000);
    expect(parse('Jul 7, 2022 04:05 PM EDT', 'MMM D, y n hh:mm A z').epochMillis)
      .to.equal(Date.UTC(2022, 6, 7, 16, 5, 0) + 4 * 3_600_000);
    expect(parse('Jul 7, 2022 04:05 PM PST', 'MMM D, y n hh:mm A z').epochMillis)
      .to.equal(Date.UTC(2022, 6, 7, 16, 5, 0) + 8 * 3_600_000);
    expect(parse('Jul 7, 2022 04:05 PM PST', 'MMM D, y n hh:mm A z', 'America/New_York').format('IMM z'))
      .to.equal('Jul 7, 2022, 8:05:00 PM EDT');
    expect(parse('Jul 7, 2022 04:05 PM +03:00', 'MMM D, y n hh:mm A z').epochMillis)
      .to.equal(Date.UTC(2022, 6, 7, 16, 5, 0) - 3 * 3_600_000);
    expect(parse('Jul 7, 2022 04:05 PM UT+0300', 'MMM D, y n hh:mm A z').epochMillis)
      .to.equal(Date.UTC(2022, 6, 7, 16, 5, 0) - 3 * 3_600_000);
    expect(parse('Jul 7, 2022 04:05 PM GMT-0300', 'MMM D, y n hh:mm A z').epochMillis)
      .to.equal(Date.UTC(2022, 6, 7, 16, 5, 0) + 3 * 3_600_000);
    expect(parse('Jul 7, 2022 04:05 PM Etc/GMT+3', 'MMM D, y n hh:mm A z').epochMillis)
      .to.equal(Date.UTC(2022, 6, 7, 16, 5, 0) + 3 * 3_600_000);
  });

  it('should use priority meridiem forms over Intl forms', () => {
    expect(new DateTime(0, 'UTC', 'he').format('A')).to.equal('לפ׳');
    expect(new DateTime('1970-01-01T12:00', 'UTC', 'hi').format('A')).to.equal('अ');
  });
});
