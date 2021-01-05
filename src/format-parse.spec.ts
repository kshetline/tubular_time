import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';

describe('FormatParse', () => {
  it('should properly decompose format strings', () => {
    expect(new DateTime('2021-w06-4').format('YYYY-[W]WW-d')).to.equal('2021-W06-4');
    expect(new DateTime('2021-w06-4').format('YYYY-[w]ww-d')).to.equal('2021-w07-5');
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
  });
});
