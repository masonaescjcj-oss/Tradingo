import { level, mirror, series } from '../../charts';
import { PALETTE } from '../../palette';
import type { Candle } from '../../types';
import type { Unit } from '../../types';

/** Linearly maps a candle series onto a new price range; RSI only depends on relative moves, so it is unchanged. */
function fit(candles: Candle[], lo: number, hi: number, digits: number): Candle[] {
  const min = Math.min(...candles.map((k) => k[2]));
  const max = Math.max(...candles.map((k) => k[1]));
  const f = (v: number) => Number((lo + ((v - min) / (max - min)) * (hi - lo)).toFixed(digits));
  return candles.map((k) => k.map(f) as Candle);
}

/**
 * EUR/USD bearish divergence: high at candle 17 (RSI 14 ≈ 75) and a higher high at candle 32 (RSI ≈ 65).
 * Candles 35–36 then close below the swing low between the peaks (1.0844).
 */
const EUR_BEAR_CONFIRM = series(
  [
    1.0802, 1.0796, 1.0808, 1.0801, 1.0795, 1.0806, 1.0799, 1.0811, 1.0804, 1.0798, 1.0809, 1.0803, 1.0812, 1.0806, 1.083, 1.0852, 1.0874,
    [1.0874, 1.09, 1.0871, 1.0896],
    1.0878, 1.0862,
    [1.0862, 1.0865, 1.0844, 1.085],
    [1.085, 1.0863, 1.0847, 1.086],
    1.0853, 1.0864, 1.0857, 1.0869, 1.0862, 1.0874, 1.0867, 1.088, 1.0873, 1.0886,
    [1.0886, 1.0906, 1.0883, 1.0899],
    1.0884, 1.0868, 1.0858,
    [1.0858, 1.0861, 1.0833, 1.0837],
  ],
  { start: 1.0806 },
);
const EUR_BEAR_DIV = EUR_BEAR_CONFIRM.slice(0, 35);
const BEAR_NOTES = [
  { index: 17, text: 'سقف ۱', at: 'high' as const, tone: 'bear' as const },
  { index: 32, text: 'سقف ۲', at: 'high' as const, tone: 'bear' as const },
];

/**
 * BTC bullish divergence: low at candle 17 (RSI 14 ≈ 18) and a lower low at candle 31 (RSI ≈ 30).
 * Candle 34 then closes above the swing high between the lows (60480).
 */
const BTC_BULL_CONFIRM = series(
  [
    62550, 62370, 62520, 62340, 62490, 62310, 62460, 62280, 62430, 62250, 62400, 62250, 62400, 62250, 61650, 60950, 60250,
    [60250, 60300, 59400, 59650],
    59950, 60200,
    [60200, 60480, 60150, 60400],
    [60400, 60420, 60150, 60200],
    60300, 60100, 60200, 60000, 60100, 59900, 60000, 59750, 59850,
    [59850, 59900, 59250, 59550],
    59950, 60300, 60700, 60900,
  ],
  { start: 62400 },
);
const BTC_BULL_DIV = BTC_BULL_CONFIRM.slice(0, 34);
const BULL_NOTES = [
  { index: 17, text: 'کف ۱', at: 'low' as const, tone: 'bull' as const },
  { index: 31, text: 'کف ۲', at: 'low' as const, tone: 'bull' as const },
];

/** EUR/USD mirror image of the bearish divergence: a bullish divergence (lows at 17 and 32). */
const EUR_BULL_DIV = mirror(EUR_BEAR_DIV, 1.085);

/** ETH bearish divergence (mirror of the BTC chart): the higher high at candle 31 has the lower RSI. */
const ETH_BEAR_DIV = fit(mirror(BTC_BULL_DIV, 61000), 2930, 3110, 0);

/** GBP/USD bullish divergence followed by a strong bullish candle (candle 32). */
const GBP_BULL_DIV = fit(BTC_BULL_CONFIRM.slice(0, 33), 1.262, 1.279, 4);

/**
 * EUR/USD hidden bullish divergence in an uptrend: low at candle 18 (RSI ≈ 58) and a higher low at candle 30 (RSI ≈ 45).
 */
const EUR_HIDDEN_BULL = series(
  [
    1.0828, 1.0823, 1.0851, 1.0846, 1.0874, 1.0869, 1.0897, 1.0892, 1.092, 1.0915, 1.0943, 1.0938, 1.0912, 1.0924, 1.0898, 1.091, 1.0884, 1.0896,
    [1.0896, 1.0899, 1.0862, 1.087],
    1.0914, 1.0958, 1.0944, 1.0988, 1.1032, 1.1076, 1.112, 1.1164, 1.1097, 1.103, 1.0963,
    [1.0963, 1.0972, 1.0884, 1.0896],
    1.0931, 1.0961,
  ],
  { start: 1.08 },
);
const HIDDEN_BULL_NOTES = [
  { index: 18, text: 'کف ۱', at: 'low' as const, tone: 'bull' as const },
  { index: 30, text: 'کف ۲', at: 'low' as const, tone: 'bull' as const },
];

/** Mirror image: hidden bearish divergence in a downtrend (highs at 18 and 30). */
const EUR_HIDDEN_BEAR = mirror(EUR_HIDDEN_BULL, 1.098);

/** ETH hidden bullish divergence ending with the first bounce candle (31). */
const ETH_HIDDEN_BULL = fit(EUR_HIDDEN_BULL.slice(0, 32), 2880, 3240, 0);

/** Gold: bearish divergence (highs at 17 and 31) confirmed by candle 34 closing below the swing low. */
const GOLD_BEAR_CONFIRM = fit(mirror(BTC_BULL_CONFIRM, 61000), 2372, 2428, 1);
const GOLD_SWING_LOW = GOLD_BEAR_CONFIRM[20][2];

/** USD/JPY: bullish divergence confirmed by candle 34 closing above the swing high. */
const JPY_BULL_CONFIRM = fit(BTC_BULL_CONFIRM.slice(0, 35), 148.6, 151.2, 2);
const JPY_SWING_HIGH = JPY_BULL_CONFIRM[20][1];

export const u3: Unit = {
  id: 'oscillators-u3',
  title: 'واگرایی',
  ...PALETTE.pink,
  lessons: [
    {
      id: 'oscillators-u3-l1',
      title: 'واگرایی معمولی مثبت و منفی',
      steps: [
        {
          type: 'learn',
          title: 'واگرایی منفی (Bearish Divergence)',
          body: 'وقتی قیمت **سقف بالاتر (HH)** می‌زنه ولی RSI **سقف پایین‌تر (LH)** می‌سازه، بهش **واگرایی منفی معمولی** می‌گن. یعنی قیمت بالاتر رفته ولی **مومنتوم ضعیف‌تر شده**؛ هشداری برای اصلاح یا برگشت.',
          visual: { kind: 'chart', chart: { candles: EUR_BEAR_DIV, rsi: 14, notes: BEAR_NOTES }, symbol: 'واگرایی منفی' },
        },
        {
          type: 'learn',
          title: 'واگرایی مثبت (Bullish Divergence)',
          body: 'برعکسش: قیمت **کف پایین‌تر (LL)** می‌زنه ولی RSI **کف بالاتر (HL)** می‌سازه. یعنی فروشنده‌ها قیمت رو پایین‌تر بردن ولی **با قدرت کمتر**؛ هشداری برای برگشت به بالا.',
          visual: { kind: 'chart', chart: { candles: BTC_BULL_DIV, rsi: 14, notes: BULL_NOTES }, symbol: 'واگرایی مثبت' },
        },
        {
          type: 'chart',
          prompt: 'قیمت و RSI رو توی دو کف مقایسه کن. این چه واگرایی‌ایه؟',
          chart: {
            candles: EUR_BULL_DIV,
            rsi: 14,
            notes: [
              { index: 17, text: 'کف ۱', at: 'low', tone: 'bull' },
              { index: 32, text: 'کف ۲', at: 'low', tone: 'bull' },
            ],
          },
          symbol: 'EUR/USD · 1H',
          options: [{ label: 'واگرایی مثبت معمولی (صعودی)' }, { label: 'واگرایی منفی معمولی (نزولی)' }, { label: 'واگرایی نیست؛ هر دو هم‌جهتن' }],
          answer: 0,
          explanation: 'کف ۲ قیمت پایین‌تر از کف ۱ هست ولی RSI توی کف ۲ بالاتر از کف ۱ مونده؛ یعنی فشار فروش ضعیف شده. این واگرایی مثبت معمولیه.',
        },
        {
          type: 'tap',
          prompt: 'روی کندلی بزن که سقف دومِ واگرایی منفی رو ساخت (سقف بالاتر قیمت با RSI پایین‌تر).',
          chart: { candles: ETH_BEAR_DIV, rsi: 14 },
          symbol: 'ETH/USDT · 4H',
          answer: 31,
          explanation: 'این کندل بالاترین سقف نموداره، ولی RSI اینجا خیلی پایین‌تر از سقف اول (حدود ۷۰ در مقابل بالای ۸۰) مونده؛ یعنی رشد دوم با مومنتوم کمتری انجام شده.',
        },
        {
          type: 'truefalse',
          statement: 'به محض دیدن واگرایی، قیمت حتماً برمی‌گرده.',
          topic: 'واگرایی · Divergence',
          answer: false,
          explanation: 'واگرایی فقط ضعیف شدن مومنتوم رو نشون می‌ده. قیمت ممکنه مدتی به روندش ادامه بده؛ برای همین تریدرها منتظر تأیید قیمتی می‌مونن.',
        },
        {
          type: 'learn',
          title: 'واگرایی کجا معتبرتره؟',
          body: 'واگرایی روی **تایم‌فریم‌های بالاتر**، نزدیک **سطوح مهم** (حمایت و مقاومت) و بعد از یه **حرکت طولانی** ارزش بیشتری داره. همیشه سقف‌های قیمت رو با **سقف‌های متناظر RSI** (توی همون کندل‌ها) مقایسه کن، نه نقطه‌های دلخواه.',
        },
        {
          type: 'predict',
          prompt: 'قیمت کف پایین‌تری زده ولی RSI کف بالاتری ساخته و کندل آخر صعودی قویه. کدوم احتمال بیشتره؟',
          chart: { candles: GBP_BULL_DIV, rsi: 14, notes: BULL_NOTES, ghost: true },
          symbol: 'GBP/USD · 4H',
          answer: 'buy',
          explanation: 'واگرایی مثبت یعنی فروشنده‌ها توی کف دوم ضعیف‌تر بودن و کندل صعودی قوی نشون می‌ده خریدارها وارد شدن. احتمال برگشت بیشتره؛ حد ضرر زیر کف ۲.',
        },
        {
          type: 'fill',
          sentence: 'توی واگرایی منفی، قیمت سقف ___ می‌زنه ولی RSI سقف ___ می‌سازه.',
          answers: ['بالاتر', 'پایین‌تر'],
          distractors: ['مساوی', 'قدیمی‌تر', 'جدیدتر'],
          explanation: 'قیمت بالاتر رفته ولی مومنتوم (RSI) نتونسته همراهی کنه؛ این همون ناهماهنگیه که بهش واگرایی می‌گیم.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'واگرایی منفی', sub: 'Bearish Divergence', meaning: 'قیمت HH، ولی RSI LH' },
            { term: 'واگرایی مثبت', sub: 'Bullish Divergence', meaning: 'قیمت LL، ولی RSI HL' },
            { term: 'مومنتوم', sub: 'Momentum', meaning: 'سرعت و قدرت حرکت قیمت' },
            { term: 'تأیید', sub: 'Confirmation', meaning: 'نشونه‌ی قیمتی بعد از واگرایی' },
          ],
        },
      ],
    },
    {
      id: 'oscillators-u3-l2',
      title: 'واگرایی مخفی',
      steps: [
        {
          type: 'learn',
          title: 'واگرایی مخفی مثبت',
          body: 'توی **روند صعودی**، قیمت **کف بالاتر (HL)** می‌زنه ولی RSI **کف پایین‌تر (LL)** می‌سازه. این **واگرایی مخفی مثبت**ه و برخلاف واگرایی معمولی، نشونه‌ی **ادامه‌ی روند** بعد از اصلاحه.',
          visual: { kind: 'chart', chart: { candles: EUR_HIDDEN_BULL, rsi: 14, notes: HIDDEN_BULL_NOTES }, symbol: 'واگرایی مخفی مثبت' },
        },
        {
          type: 'learn',
          title: 'واگرایی مخفی منفی',
          body: 'توی **روند نزولی**، قیمت **سقف پایین‌تر (LH)** می‌زنه ولی RSI **سقف بالاتر (HH)** می‌سازه. یعنی رشد اصلاحی با مومنتوم زیاد بوده ولی قیمت نتونسته سقف قبلی رو بشکنه؛ نشونه‌ی **ادامه‌ی روند نزولی**.',
          tip: 'یادت بمونه: معمولی = هشدار برگشت، مخفی = ادامه‌ی روند.',
        },
        {
          type: 'chart',
          prompt: 'روند نزولیه. قیمت و RSI رو توی دو سقف مقایسه کن. این چه واگرایی‌ایه؟',
          chart: {
            candles: EUR_HIDDEN_BEAR,
            rsi: 14,
            notes: [
              { index: 18, text: 'سقف ۱', at: 'high', tone: 'bear' },
              { index: 30, text: 'سقف ۲', at: 'high', tone: 'bear' },
            ],
          },
          symbol: 'EUR/USD · 4H',
          options: [
            { label: 'مخفی منفی؛ ادامه‌ی روند نزولی' },
            { label: 'معمولی منفی؛ برگشت به پایین' },
            { label: 'مخفی مثبت؛ ادامه‌ی روند صعودی' },
            { label: 'معمولی مثبت؛ برگشت به بالا' },
          ],
          answer: 0,
          explanation: 'سقف ۲ قیمت پایین‌تر از سقف ۱ هست ولی RSI توی سقف ۲ بالاتر رفته. توی روند نزولی این واگرایی مخفی منفیه و بیشتر به ادامه‌ی نزول اشاره داره.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'معمولی منفی', sub: 'Regular Bearish', meaning: 'قیمت HH، RSI LH؛ هشدار برگشت' },
            { term: 'معمولی مثبت', sub: 'Regular Bullish', meaning: 'قیمت LL، RSI HL؛ هشدار برگشت' },
            { term: 'مخفی مثبت', sub: 'Hidden Bullish', meaning: 'قیمت HL، RSI LL؛ ادامه‌ی صعود' },
            { term: 'مخفی منفی', sub: 'Hidden Bearish', meaning: 'قیمت LH، RSI HH؛ ادامه‌ی نزول' },
          ],
        },
        {
          type: 'choice',
          prompt: 'توی یه روند نزولی، قیمت سقف پایین‌تری زده ولی RSI سقف بالاتری ساخته. این چیه و چه معنایی داره؟',
          options: [
            'واگرایی مخفی منفی؛ احتمال ادامه‌ی نزول',
            'واگرایی معمولی مثبت؛ احتمال برگشت به بالا',
            'واگرایی مخفی مثبت؛ احتمال ادامه‌ی صعود',
            'واگرایی نیست؛ اهمیتی نداره',
          ],
          answer: 0,
          explanation: 'قیمت LH و RSI HH توی روند نزولی یعنی واگرایی مخفی منفی: رشد اصلاحی پرقدرت بوده ولی ساختار نزولی سر جاشه.',
        },
        {
          type: 'truefalse',
          statement: 'واگرایی مخفی مثبت بیشتر توی روند صعودی و موقع اصلاح‌ها دیده می‌شه.',
          topic: 'واگرایی مخفی · Hidden',
          answer: true,
          explanation: 'واگرایی مخفی مثبت یعنی کف بالاتر قیمت با کف پایین‌تر RSI؛ این الگو توی اصلاح‌های یه روند صعودی شکل می‌گیره و به ادامه‌ی روند اشاره داره.',
        },
        {
          type: 'learn',
          title: 'چرا مخفی کار می‌کنه؟',
          body: 'توی اصلاح یه روند صعودی، اگه RSI خیلی پایین بیاد ولی قیمت **کف قبلی رو حفظ کنه**، یعنی فروش سریع بوده ولی **نتونسته ساختار روند رو بشکنه**. خیلی از تریدرها این رو فرصت ورود هم‌جهت با روند می‌دونن.',
        },
        {
          type: 'predict',
          prompt: 'روند صعودیه. قیمت کف بالاتری ساخته ولی RSI کف پایین‌تری زده و کندل آخر صعودیه. قدم بعدی؟',
          chart: { candles: ETH_HIDDEN_BULL, rsi: 14, notes: HIDDEN_BULL_NOTES, ghost: true },
          symbol: 'ETH/USDT · 4H',
          trend: 'up',
          answer: 'buy',
          explanation: 'واگرایی مخفی مثبت توی روند صعودی به ادامه‌ی روند اشاره داره؛ کف ۲ بالاتر از کف ۱ مونده و کندل صعودی شروع برگشت رو نشون می‌ده. حد ضرر زیر کف ۲.',
        },
        {
          type: 'choice',
          prompt: 'کدوم ترکیب برای معامله با واگرایی مخفی مثبت منطقی‌تره؟',
          options: [
            'روند صعودی + اصلاح تا حمایت + کندل تأیید',
            'روند نزولی قوی + سقف پایین‌تر قیمت',
            'بازار رنج بدون هیچ ساختاری',
            'درست بعد از شکسته شدن کف قبلی روند',
          ],
          answer: 0,
          explanation: 'واگرایی مخفی مثبت ابزار ادامه‌ی روند صعودیه؛ وقتی با حمایت و کندل تأیید همراه بشه، کیفیتش خیلی بیشتره. اگه کف قبلی بشکنه، اصلاً کف بالاتری در کار نیست.',
        },
      ],
    },
    {
      id: 'oscillators-u3-l3',
      title: 'تأیید واگرایی و اشتباه‌های رایج',
      steps: [
        {
          type: 'learn',
          title: 'واگرایی، سیگنال ورود نیست',
          body: 'واگرایی فقط می‌گه مومنتوم ضعیف شده. **تأیید** یعنی قیمت هم نشون بده جهت داره عوض می‌شه؛ مثلاً توی واگرایی منفی، **بسته شدن زیر کف میانی** (کفِ بین دو سقف) یا شکست خط روند.',
          visual: {
            kind: 'chart',
            chart: { candles: EUR_BEAR_CONFIRM, rsi: 14, notes: BEAR_NOTES, lines: [level.line(1.0844, 'کف میانی', 'sky')] },
            symbol: 'تأیید واگرایی منفی',
          },
        },
        {
          type: 'learn',
          title: 'واگرایی می‌تونه تکرار بشه',
          body: 'توی روندهای قوی، قیمت می‌تونه **چند واگرایی پشت سر هم** بسازه و باز هم ادامه بده (واگرایی دوتایی یا سه‌تایی). برای همین ورود زودهنگام فقط با دیدن واگرایی، یکی از **رایج‌ترین اشتباه‌ها**ست.',
        },
        {
          type: 'tap',
          prompt: 'روی اولین کندلی بزن که واگرایی منفی رو تأیید کرد (بسته شدن زیر کف میانی).',
          chart: {
            candles: GOLD_BEAR_CONFIRM,
            rsi: 14,
            notes: [
              { index: 17, text: 'سقف ۱', at: 'high', tone: 'bear' },
              { index: 31, text: 'سقف ۲', at: 'high', tone: 'bear' },
            ],
            lines: [level.line(GOLD_SWING_LOW, 'کف میانی', 'sky')],
          },
          symbol: 'XAU/USD · 4H',
          answer: 34,
          explanation: 'تا قبل از این کندل، قیمت بالای کف میانی بسته می‌شد. این کندل اولین بسته شدن زیرشه؛ یعنی ساختار صعودی شکسته و واگرایی منفی تأیید شده.',
        },
        {
          type: 'choice',
          prompt: 'بعد از تأیید واگرایی منفی فروختی. منطقی‌ترین جای حد ضرر کجاست؟',
          options: ['بالای سقف دوم (بالاترین سقف)', 'کمی زیر کف میانی', 'دقیقاً روی قیمت ورود', 'لازم نیست؛ واگرایی تأیید شده'],
          answer: 0,
          explanation: 'اگه قیمت سقف دوم رو بشکنه، کل سناریوی واگرایی باطل می‌شه. پس حد ضرر منطقی بالای همون سقفه.',
        },
        {
          type: 'truefalse',
          statement: 'یه روند قوی می‌تونه چند بار واگرایی بسازه و باز هم ادامه بده.',
          topic: 'واگرایی تکراری',
          answer: true,
          explanation: 'واگرایی فقط کند شدن مومنتومه، نه پایان قطعی روند. توی روندهای قوی، واگرایی‌های دوتایی و سه‌تایی زیاد دیده می‌شن.',
        },
        {
          type: 'predict',
          prompt: 'واگرایی مثبت شکل گرفته و قیمت همین الان بالای سقف میانی (سقفِ بین دو کف) بسته شده. قدم بعدی؟',
          chart: {
            candles: JPY_BULL_CONFIRM,
            rsi: 14,
            notes: BULL_NOTES,
            lines: [level.line(JPY_SWING_HIGH, 'سقف میانی', 'gold')],
            ghost: true,
          },
          symbol: 'USD/JPY · 4H',
          answer: 'buy',
          explanation: 'واگرایی مثبت به‌علاوه‌ی شکست سقف میانی یعنی هم مومنتوم و هم ساختار قیمت برگشت رو تأیید کردن. خرید با حد ضرر زیر کف ۲ منطقیه؛ باز هم احتمالیه، نه قطعی.',
        },
        {
          type: 'learn',
          title: 'اشتباه‌های رایج',
          body: 'اشتباه‌های معروف: وصل کردن **نقطه‌های نامتناظر** (سقف قیمت با یه جای دیگه‌ی RSI)، دنبال واگرایی گشتن توی **تایم‌فریم‌های خیلی پایین و پرنویز** و **نادیده گرفتن روند تایم بالاتر**. واگرایی خلاف یه روند قوی، شانس کمتری داره.',
        },
        {
          type: 'order',
          prompt: 'مراحل یه معامله با واگرایی منفی رو مرتب کن.',
          items: ['سقف بالاتر قیمت روی یه سطح مهم', 'سقف پایین‌تر RSI توی همون نقطه', 'صبر برای بسته شدن زیر کف میانی', 'فروش با حد ضرر بالای سقف دوم', 'هدف: حمایت بعدی یا نسبت ۱ به ۲'],
          explanation: 'اول الگو (سقف قیمت و RSI)، بعد تأیید، بعد ورود با ریسک مشخص و هدف منطقی. ورود قبل از تأیید، رایج‌ترین اشتباه با واگرایی‌هاست.',
        },
        {
          type: 'choice',
          prompt: 'بعد از تأیید واگرایی منفی، اتریوم رو فروختی. نسبت ریسک به ریوارد چنده؟',
          facts: [
            { label: 'ورود (فروش)', value: '۳٬۰۰۰ دلار', tone: 'sky' },
            { label: 'حد ضرر بالای سقف دوم', value: '۳٬۰۹۰ دلار', tone: 'bear' },
            { label: 'هدف', value: '۲٬۸۲۰ دلار', tone: 'bull' },
          ],
          options: ['۱ به ۲', '۲ به ۱', '۱ به ۳', '۱ به ۱٫۵'],
          answer: 0,
          explanation: 'ریسک: ۳٬۰۹۰ − ۳٬۰۰۰ = ۹۰ دلار. ریوارد: ۳٬۰۰۰ − ۲٬۸۲۰ = ۱۸۰ دلار. ۹۰ به ۱۸۰ یعنی ۱ به ۲.',
        },
      ],
    },
  ],
};
