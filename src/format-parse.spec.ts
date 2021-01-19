import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';
import { initTimezoneLarge } from './index';
import { localeList } from './locale-data';
import { analyzeFormat, parse } from './format-parse';

describe('FormatParse', () => {
  before(() => initTimezoneLarge());

  it('should properly decompose format strings', () => {
    expect(new DateTime('2022-07-07 8:08 ACST').format('IMM zzz ZZZ z')).to.equal('Jul 7, 2022, 8:08:00 AM Australian Central Standard Time Australia/Adelaide GMT+9:30');
    expect(new DateTime('2022-07-07 8:08 PST').format('IMM zzz ZZZ z')).to.equal('Jul 7, 2022, 9:08:00 AM Pacific Daylight Time America/Los_Angeles PDT');
    expect(new DateTime('2022-07-07 8:08 PDT').format('IMM zzz ZZZ z')).to.equal('Jul 7, 2022, 8:08:00 AM Pacific Daylight Time America/Los_Angeles PDT');
    expect(new DateTime('1995-05-06 EDT').format('IMM zzz ZZZ z')).to.equal('May 6, 1995, 4:00:00 AM Eastern Daylight Time America/New_York EDT');
    expect(new DateTime('foo').valid).is.false;
    expect(new DateTime('2021-W06-4').format('YYYY-[W]WW-d')).to.equal('2021-W06-4');
    expect(new DateTime('2021-W06-4').format('YYYY-[w]ww-d')).to.equal('2021-w07-5');
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
    expect(new DateTime('2021-05-04').format('YYYY-MM-DD [Q:]Q Qo [M:]Mo [W:]Wo [d:]do [w:]wo [d:]do [D:]Do'))
      .to.equal('2021-05-04 Q:2 2nd M:5th W:18th d:2nd w:19th d:3rd D:4th');
    expect(new DateTime('1986-09-04').toLocale('en,ru').format('IS')).to.equal('9/4/86');
    expect(new DateTime('1986-09-04').toLocale(['ru', 'en']).format('IS')).to.equal('04.09.1986');
    expect(new DateTime('1986-09-04').toLocale(['qq', 'fr']).format('IS')).to.equal('04/09/1986');
    expect(new DateTime('1986-09-04').format('D\u200F/M\u200F/YYYY h:mm A', 'ar')).to.equal('٤\u200F/٩\u200F/١٩٨٦ ١٢:٠٠ ص');
    expect(new DateTime('1986-09-04').format('D/M/YY h:mm A', 'bn')).to.equal('৪/৯/৮৬ ১২:০০ রাত');
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
  });

  it('should be able to parse back formatted output', function () {
    this.slow(300000);
    this.timeout(450000);

    localeList.forEach(lcl => {
      // if (lcl < 'et') return;
      console.log('Locale: %s', lcl);
      const styles = ['F', 'L', 'M', 'S'];

      loop:
      for (let i = 0; i < 4; ++i) {
        for (let j = 0; j < 4; ++j) {
          for (let t = 0; t < 31_622_400_000; t += 43_860_000) { // 12h:11m
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

            expect(parsed?.utcTimeMillis).to.equal(t, `${lcl}, ${fmt}: ${timeString} ==> ${parsed.toIsoString()}`);
          }
        }
      }
    });
  });
});
