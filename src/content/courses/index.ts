import { PALETTE } from '../palette';
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

type CourseInfo = Omit<Course, 'units'>;

/** A long course made of the units of several topic modules, in this order. */
function merge(info: CourseInfo, parts: Course[]): Course {
  return { ...info, units: parts.flatMap((p) => p.units) };
}

/**
 * Every course, in catalog order. Each topic is one long course (all of crypto in one
 * place, and so on) built from the topic modules; unit and lesson ids stay the same,
 * so saved progress carries over.
 */
export const ALL_COURSES: Course[] = [
  merge(
    {
      id: 'basics',
      title: 'مبانی ترید',
      subtitle: 'بازار، نمودار، سفارش و بروکر',
      description:
        'از صفر شروع کن: بازار مالی چیه، نمودار و تایم‌فریم رو چطور بخونی، سبک‌های معامله، انواع سفارش، کار با پلتفرم و انتخاب بروکر و حساب.',
      category: 'foundations',
      level: 'beginner',
      ...PALETTE.green,
      badge: basics.badge,
    },
    [basics, orders],
  ),
  merge(
    {
      id: 'forex',
      title: 'فارکس و طلا',
      subtitle: 'جفت‌ارزها، طلا، نفت و اخبار اقتصادی',
      description:
        'هر چیزی که برای معامله در فارکس لازم داری: جفت‌ارزها، پیپ و لات، هزینه‌ها و محاسبات؛ طلا، نفت و شاخص‌ها؛ و تحلیل فاندامنتال: اقتصاد کلان، تقویم اقتصادی و رابطه‌ی بازارها با هم.',
      category: 'foundations',
      level: 'beginner',
      ...PALETTE.sky,
      badge: forex.badge,
    },
    [forex, gold, fundamental],
  ),
  merge(
    {
      id: 'crypto',
      title: 'کریپتو',
      subtitle: 'از بیت‌کوین تا فیوچرز، دیفای و آنچین',
      description:
        'کل دنیای کریپتو در یک دوره: بیت‌کوین و بلاک‌چین، آلت‌کوین‌ها و صرافی، امنیت کیف پول، دیفای و ریسک‌هاش، فیوچرز و اهرم و لیکوئید، و در آخر توکنومیکس، داده‌های آنچین و چرخه‌های بازار.',
      category: 'foundations',
      level: 'beginner',
      ...PALETTE.gold,
      badge: crypto.badge,
    },
    [crypto, defi, leverage, onchain],
  ),
  merge(
    {
      id: 'technical',
      title: 'تحلیل تکنیکال',
      subtitle: 'کندل، روند، الگوها، فیبوناچی و چندزمانی',
      description:
        'نمودار رو قدم‌به‌قدم خوندن یاد بگیر: کندل‌شناسی، روند و حمایت و مقاومت، خط روند و ساختار بازار، الگوهای نموداری، فیبوناچی و تحلیل چندزمانی.',
      category: 'technical',
      level: 'beginner',
      ...PALETTE.coral,
      badge: candles.badge,
    },
    [candles, trend, chartPatterns, fibonacci, multiTimeframe],
  ),
  merge(
    {
      id: 'risk',
      title: 'ریسک و روانشناسی',
      subtitle: 'زنده موندن توی بازار',
      description:
        'مهم‌ترین مهارت هر تریدر: اندازه‌ی ریسک، ریاضی ضرر و ریسک حرفه‌ای؛ و کنترل احساسات، سوگیری‌های ذهنی و ساختن عادت و انضباط.',
      category: 'risk',
      level: 'beginner',
      ...PALETTE.teal,
      badge: risk.badge,
    },
    [risk, psychology],
  ),
  merge(
    {
      id: 'indicators',
      title: 'اندیکاتورها',
      subtitle: 'میانگین متحرک، RSI، MACD، حجم و ایچیموکو',
      description:
        'ابزارهای محبوب تحلیل: میانگین‌های متحرک و کراس‌ها، بولینگر، RSI و MACD و استوکاستیک، واگرایی، حجم و ولوم پروفایل، و ایچیموکو از اجزا تا استراتژی.',
      category: 'technical',
      level: 'intermediate',
      ...PALETTE.flame,
      badge: oscillators.badge,
    },
    [movingAverages, oscillators, volume, ichimoku],
  ),
  merge(
    {
      id: 'strategies',
      title: 'استراتژی‌های معاملاتی',
      subtitle: 'شکست، رنج، سوئینگ، دی‌ترید، اسکالپ و سیستم شخصی',
      description:
        'از تحلیل تا معامله: استراتژی شکست و بازگشت به میانگین، سوئینگ‌تریدینگ، دی‌تریدینگ و اسکالپینگ، و در آخر ساختن سیستم معاملاتی خودت با آمار، بک‌تست و فوروارد تست.',
      category: 'strategy',
      level: 'intermediate',
      ...PALETTE.pink,
      badge: tradingSystem.badge,
    },
    [breakout, meanReversion, swing, dayTrading, scalping, tradingSystem],
  ),
  merge(
    {
      id: 'advanced',
      title: 'تحلیل پیشرفته',
      subtitle: 'پرایس اکشن، عرضه و تقاضا، اسمارت مانی، الیوت و هارمونیک',
      description:
        'برای وقتی پایه‌ها رو بلدی: پرایس اکشن و ستاپ‌هاش، زون‌های عرضه و تقاضا، اسمارت مانی (نقدینگی، اوردربلاک و FVG)، نظریه‌ی داو و امواج الیوت، و الگوهای هارمونیک.',
      category: 'technical',
      level: 'advanced',
      ...PALETTE.violet,
      badge: smc.badge,
    },
    [priceAction, supplyDemand, smc, elliott, harmonics],
  ),
];

/** Course ids from before the topics were merged, and the long course that holds each now. */
export const COURSE_ALIASES: Record<string, string> = {
  orders: 'basics',
  gold: 'forex',
  fundamental: 'forex',
  defi: 'crypto',
  leverage: 'crypto',
  onchain: 'crypto',
  candles: 'technical',
  trend: 'technical',
  'chart-patterns': 'technical',
  fibonacci: 'technical',
  'multi-timeframe': 'technical',
  psychology: 'risk',
  'moving-averages': 'indicators',
  oscillators: 'indicators',
  volume: 'indicators',
  ichimoku: 'indicators',
  breakout: 'strategies',
  'mean-reversion': 'strategies',
  swing: 'strategies',
  'day-trading': 'strategies',
  scalping: 'strategies',
  'trading-system': 'strategies',
  'price-action': 'advanced',
  'supply-demand': 'advanced',
  smc: 'advanced',
  elliott: 'advanced',
  harmonics: 'advanced',
};
