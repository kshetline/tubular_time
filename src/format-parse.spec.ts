import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';

describe('FormatParse', () => {
  it('should properly decompose format strings', () => {
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
});
