import fs from 'fs';
import { timeZoneSmall } from './src/timezone-small';
import { timeZoneLarge } from './src/timezone-large';
import { timeZoneLargeAlt } from './src/timezone-large-alt';

const zoneSets = {
  small: timeZoneSmall,
  large: timeZoneLarge,
  large_alt: timeZoneLargeAlt,
};

Object.keys(zoneSets).forEach(set => {
  fs.writeFileSync(`dist/timezone-${set}-data.js`,
    `window.tbTime_timezone_${set} = ` + JSON.stringify(zoneSets[set]));
});
