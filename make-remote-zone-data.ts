import fs from 'fs';
import { timezoneSmall } from './src/timezone-small';
import { timezoneLarge } from './src/timezone-large';
import { timezoneLargeAlt } from './src/timezone-large-alt';

const zoneSets = {
  small: timezoneSmall,
  large: timezoneLarge,
  large_alt: timezoneLargeAlt,
};

Object.keys(zoneSets).forEach(set => {
  fs.writeFileSync(`dist/timezone-${set}-data.js`,
    `window.tbTime_timezone_${set} = ` + JSON.stringify(zoneSets[set]));
});
