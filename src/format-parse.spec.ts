import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';
import { initTimezoneLarge } from './index';
import { localeList } from './locale-data';
import { analyzeFormat } from './format-parse';

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
  });

  it('should properly decompose format strings', function () {
    this.slow(30000);
    this.timeout(45000);

    localeList.forEach(lcl => {
      const styles = ['full', 'long', 'medium', 'short', undefined];

      for (let i = 0; i < 5; ++i) {
        for (let j = 0; j < (i < 4 ? 5 : 4); ++j) {
          const format = analyzeFormat(lcl, styles[i], styles[j]);

          expect(!!format).is.true;
          expect(i !== 0 || lcl === 'my' || format.includes('dddd')).is.true;
          expect(i === 4 || format.includes('MM')).is.true;
          expect(i === 4 || format.includes('DD')).is.true;
          expect(j === 4 || /hh|kk/i.test(format)).is.true;
          expect(j === 4 || /mm\b/i.test(format)).is.true;
        }
      }
    });
  });
});
