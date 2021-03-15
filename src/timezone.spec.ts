import { expect } from 'chai';
import { Timezone } from './timezone';
import timezoneLarge from './timezone-large';

const version = timezoneLarge.version;

describe('Timezone', () => {
  beforeEach(() => Timezone.defineTimezones(Object.assign({
    'America/Barberg': 'America/Chicago',
    'America/Fooberg': '!250,XX,America/New_York'
  }, timezoneLarge)));

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
  });
});
