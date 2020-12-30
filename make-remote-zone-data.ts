import fs from 'fs';
import timezoneSmall from './src/timezone-small';
import timezoneLarge from './src/timezone-large';
import timezoneLargeAlt from './src/timezone-large-alt';

const zoneSets = {
  small: timezoneSmall,
  large: timezoneLarge,
  'large-alt': timezoneLargeAlt,
};

Object.keys(zoneSets).forEach(set => {
  fs.mkdirSync('dist/data', { recursive: true });
  fs.writeFileSync(`dist/data/timezone-${set}.js`,
    `window.tbTime_timezone_${set.replace(/-/g, '_')} = ` + JSON.stringify(zoneSets[set]));
});
