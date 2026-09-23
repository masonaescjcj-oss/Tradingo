import type { Course } from '../types';

import { course as basics } from './basics';
import { course as forex } from './forex';
import { course as crypto } from './crypto';
import { course as orders } from './orders';
import { course as candles } from './candles';
import { course as trend } from './trend';
import { course as chartPatterns } from './chart-patterns';
import { course as movingAverages } from './moving-averages';
import { course as oscillators } from './oscillators';
import { course as volume } from './volume';
import { course as fibonacci } from './fibonacci';
import { course as multiTimeframe } from './multi-timeframe';
import { course as elliott } from './elliott';
import { course as harmonics } from './harmonics';
import { course as ichimoku } from './ichimoku';
import { course as priceAction } from './price-action';
import { course as supplyDemand } from './supply-demand';
import { course as smc } from './smc';
import { course as scalping } from './scalping';
import { course as dayTrading } from './day-trading';
import { course as swing } from './swing';
import { course as breakout } from './breakout';
import { course as meanReversion } from './mean-reversion';
import { course as tradingSystem } from './trading-system';
import { course as risk } from './risk';
import { course as psychology } from './psychology';
import { course as leverage } from './leverage';
import { course as fundamental } from './fundamental';
import { course as onchain } from './onchain';
import { course as gold } from './gold';
import { course as defi } from './defi';

/** Every course, in catalog order. */
export const ALL_COURSES: Course[] = [
  basics,
  forex,
  crypto,
  orders,
  candles,
  trend,
  chartPatterns,
  movingAverages,
  oscillators,
  volume,
  fibonacci,
  multiTimeframe,
  elliott,
  harmonics,
  ichimoku,
  priceAction,
  supplyDemand,
  smc,
  scalping,
  dayTrading,
  swing,
  breakout,
  meanReversion,
  tradingSystem,
  risk,
  psychology,
  leverage,
  fundamental,
  onchain,
  gold,
  defi,
];
