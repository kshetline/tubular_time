import { expect } from 'chai';
import { Timezone } from './timezone';
import timezoneLarge from './timezone-large';
import './format-parse';
import { DateTime } from './date-time';
import { initTimezoneLarge } from './index';

const version = timezoneLarge.version;

describe('Timezone', () => {
  beforeEach(() => Timezone.defineTimezones(Object.assign(Object.assign({
    'America/Barberg': 'America/Chicago',
    'America/Bazberg': '-0500 -0500 0;-50/0',
    'America/Fooberg': '!250,XX,America/New_York'
  }, timezoneLarge), {
    leapSeconds: '912 1096 1461 1826 2191 2557 2922 3287 3652 4199 4564 4929 5660 6574 7305 7670 8217 8582 8947 9496 10043 10592 13149 14245 15522 16617 17167'
  })));

  it('should properly create Timezone instances', () => {
    expect(Timezone.from('America/New_York').aliasFor).to.equal(null);
    expect(Timezone.from('Antarctica/Troll').aliasFor).to.equal(null);
    expect(Timezone.from('America/New_York').population).to.be.greaterThan(20000000);
    expect(Timezone.from('America/New_York').supportsCountry('US')).to.be.true;
    expect(Timezone.from('America/New_York').supportsCountry('AD')).to.be.false;
    expect(Timezone.from('Europe/Dublin').supportsCountry('IE')).to.be.true;
    expect(Timezone.from('Europe/Dublin').supportsCountry('VI')).to.be.false;
    expect(Timezone.from('America/Barberg').aliasFor).to.equal('America/Chicago');
    expect(Timezone.from('America/Fooberg').aliasFor).to.equal(null);
  });

  it('should properly guess matching timezones', () => {
    expect(Timezone.guess(true, 'US', 'US/Eastern')).to.equal('America/New_York');
    expect(Timezone.guess(true, 'CA', 'US/Eastern')).to.equal('America/Toronto');
    expect(Timezone.guess(true, 'LY', 'Africa/Cairo')).to.equal('Africa/Tripoli');
    Timezone.guess(true);
  });

  it('should properly perform Timezone utility functions', () => {
    expect(Timezone.version).to.equal(version);
    expect(Timezone.from('America/Fooberg').population).to.equal(250);
    expect(Timezone.getPopulation('America/Fooberg')).to.equal(250);
    expect(Timezone.from('America/Fooberg').supportsCountry('xx')).to.be.true;
    expect(Timezone.from('UTC').usesDst).to.be.false;
    expect(Timezone.from('America/Chicago').usesDst).to.be.true;
    expect(Timezone.from('America/Chicago').isDuringDst(Date.UTC(2021, 6, 1))).to.be.true;
    expect(Timezone.from('America/Chicago').isDuringDst(Date.UTC(2022, 0, 1))).to.be.false;
    expect(Timezone.from('Europe/Paris').supportsCountry('FR')).to.be.true;
    expect(Timezone.from('Europe/Paris').supportsCountry('JA')).to.be.false;
    expect(Array.from(Timezone.from('Pacific/Honolulu').countries).sort().join('')).to.equal('UMUS');
    expect(Timezone.getAvailableTimezones().length).to.be.greaterThan(200);

    const regions = Timezone.getRegionsAndSubzones();

    expect(!!regions.find(r => r.region === 'Asia')).to.be.true;
    expect(!!regions.find(r => r.region === 'Valhalla')).to.be.false;

    const offsets = Timezone.getOffsetsAndZones();

    expect((offsets.find(o => o.offset === '-05:00§')?.zones ?? []).includes('America/New York')).to.be.true;
    expect((offsets.find(o => o.offset === '-10:00')?.zones ?? []).includes('Pacific/Honolulu')).to.be.true;
    expect(!!offsets.find(o => o.offset === '-99:99')).to.be.false;

    expect(Timezone.getDateAfterLastKnownLeapSecond()).includes({ y: 2017, m: 1, d: 1 });
    expect(Timezone.getUpcomingLeapSecond()).equals(null);
    expect(Timezone.getLeapSecondList().length).equals(39);
    expect(Timezone.getLeapSecondList()[30].dateAfter).includes({ y: 1994, m: 7, d: 1 });

    expect(Timezone.from('America/Chicago').stdRule).to.equal('first Sun on/after Nov 1, at 2:00 wall time begin std time');
    expect(Timezone.from('America/Chicago').dstRule).to.equal('first Sun on/after Mar 8, at 2:00 wall time save 1 hour');
    expect(Timezone.from('Europe/Dublin').dstRule).to.equal('last Sun of Oct, at 1:00 UTC save -1 hour');
    expect(Timezone.from('UTC').dstRule).to.not.exist;
  });

  it('should gracefully handle timezones not available in Intl', () => {
    expect(() => new DateTime(null, 'America/Barberg', 'en-us').format('IMM')).not.to.throw;
    expect(() => new DateTime(null, 'America/Bazberg', 'en-us').format('IMM')).not.to.throw;
    expect(() => new DateTime(null, 'Pacific/Kanton', 'en-us').format('IMM')).not.to.throw;
    expect(new DateTime(0, 'America/Barberg', 'en-us').format('IMM')).to.equal('Dec 31, 1969, 6:00:00 PM');
    expect(new DateTime(0, 'America/Bazberg', 'en-us').format('IMM')).to.equal('Dec 31, 1969, 7:00:00 PM');
  });

  it('should recognize timezone aliases', () => {
    initTimezoneLarge();
    expect(Timezone.getAliasesForZone('Africa/Accra')).to.deep.equal([
      'Africa/Abidjan', 'Africa/Bamako', 'Africa/Banjul', 'Africa/Conakry', 'Africa/Dakar', 'Africa/Freetown',
      'Africa/Lome', 'Africa/Nouakchott', 'Africa/Ouagadougou', 'Africa/Timbuktu', 'Atlantic/Reykjavik',
      'Atlantic/St_Helena', 'Iceland'
    ]);
    expect(Timezone.getAliasesForZone('Africa/Lome')).to.deep.equal([
      'Africa/Abidjan', 'Africa/Accra', 'Africa/Bamako', 'Africa/Banjul', 'Africa/Conakry', 'Africa/Dakar',
      'Africa/Freetown', 'Africa/Nouakchott', 'Africa/Ouagadougou', 'Africa/Timbuktu', 'Atlantic/Reykjavik',
      'Atlantic/St_Helena', 'Iceland'
    ]);
    expect(Timezone.getAliasesForZone('America/New_York')).to.deep.equal([
      'SystemV/EST5EDT', 'US/Eastern'
    ]);
    expect(Timezone.getAliasesForZone('Antarctica/Mawson')).to.deep.equal([]);
  });
});
