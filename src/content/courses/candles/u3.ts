import { PALETTE } from '../../palette';
import { level, PATTERN_OPTIONS as P, series } from '../../charts';
import type { Candle, Unit } from '../../types';

// EUR/USD downtrend ending with a bullish harami.
const HARAMI_DOWN: Candle[] = series(
  [1.0938, 1.0943, 1.0925, 1.0912, 1.0917, 1.09, 1.0892, [1.0892, 1.0895, 1.0846, 1.085], [1.0858, 1.0872, 1.0854, 1.0868]],
  { start: 1.095 },
);

// GBP/USD uptrend: mother bar (index 7), inside bar, breakout.
const MOTHER_BAR: Candle[] = series(
  [
    1.2652,
    [1.2652, 1.2655, 1.2634, 1.2647],
    1.266, 1.2671,
    [1.2671, 1.2673, 1.2654, 1.2665],
    1.2678, 1.2684,
    [1.2684, 1.2722, 1.268, 1.2716],
    [1.2716, 1.2719, 1.2698, 1.2703],
    [1.2703, 1.2735, 1.27, 1.2731],
    1.2742, 1.2751,
  ],
  { start: 1.264 },
);

// Gold rally that pauses with an inside bar.
const INSIDE_END: Candle[] = series(
  [2384, [2384, 2385, 2378, 2382], 2388, 2393, [2393, 2394, 2386, 2390], 2396, [2396, 2412, 2395, 2410], [2410, 2411, 2401, 2405]],
  { start: 2380 },
);

// BTC uptrend: mother bar, inside bar, close above the mother high.
const INSIDE_BREAK: Candle[] = series(
  [60400, [60400, 60560, 60150, 60250], 60700, [60700, 60920, 60480, 60600], 61000, [61000, 61900, 60900, 61800], [61800, 61850, 61300, 61450], [61450, 62200, 61400, 62100]],
  { start: 60100 },
);

// EUR/USD uptrend ending with a dark cloud cover.
const DARK_CLOUD: Candle[] = series(
  [1.0812, 1.0826, 1.082, 1.0836, 1.085, 1.0844, 1.0862, 1.087, [1.087, 1.0902, 1.0868, 1.0898], [1.09, 1.0906, 1.0876, 1.088]],
  { start: 1.08 },
);

// ETH downtrend with a piercing line at index 8.
const PIERCING: Candle[] = series(
  [3172, 3180, 3150, 3128, 3136, 3104, 3088, [3088, 3092, 3040, 3046], [3040, 3078, 3034, 3074], 3082, 3090],
  { start: 3200 },
);

// Gold uptrend ending with a tweezer top.
const TWEEZER_TOP: Candle[] = series(
  [2366, 2372, 2369, 2378, 2385, 2382, 2391, 2398, 2402, [2402, 2421, 2400, 2418], [2418, 2421, 2408, 2412]],
  { start: 2360 },
);

// BTC back at 57,800 support, tweezer bottom.
const TWEEZER_BOTTOM: Candle[] = series(
  [59300, 58700, 58150, [58150, 58700, 57800, 58600], 59100, 59500, 59200, 58800, 58400, [58400, 58450, 57800, 57950], [57950, 58500, 57800, 58420]],
  { start: 59800 },
);

// EUR/USD downtrend ending with a morning star.
const MORNING_STAR: Candle[] = series(
  [1.0935, 1.0941, 1.0922, 1.0908, 1.0913, 1.0896, 1.088, [1.088, 1.0884, 1.0838, 1.0842], [1.0838, 1.0842, 1.0826, 1.0834], [1.0836, 1.0874, 1.0833, 1.087]],
  { start: 1.095 },
);

// BTC uptrend with an evening star (the star is index 7), then a drop.
const EVENING_STAR: Candle[] = series(
  [60600, 60400, 61000, 61500, 61300, 61900, [61950, 63050, 61900, 63000], [63050, 63400, 62900, 63120], [63050, 63100, 62150, 62200], 61900, 61700],
  { start: 60200 },
);

// Gold base after a decline, then three white soldiers.
const THREE_SOLDIERS: Candle[] = series(
  [2350, 2338, 2327, 2320, 2316, 2319, 2313, 2316, 2311, [2310, 2328, 2308, 2326], [2322, 2345, 2320, 2342], [2338, 2362, 2336, 2359]],
  { start: 2360 },
);

// Gold morning star on the 2300 support with a volume spike on the third candle.
const MORNING_STAR_VOLUME: Candle[] = series(
  [2338, 2330, 2334, 2322, 2314, [2314, 2316, 2301, 2303], [2302, 2305, 2297, 2301], [2301, 2322, 2300, 2319]],
  { start: 2345 },
);

// ETH: first rejection at 3200, then an evening star under the same level.
const EVENING_AT_RESISTANCE: Candle[] = series(
  [3110, 3140, 3175, [3175, 3201, 3160, 3165], 3140, 3120, 3135, 3150, [3150, 3188, 3148, 3185], [3187, 3202, 3183, 3190], [3188, 3190, 3148, 3152]],
  { start: 3080 },
);

export const u3: Unit = {
  id: 'candles-u3',
  title: 'الگوهای دو و سه‌کندلی',
  ...PALETTE.sky,
  lessons: [
    {
      id: 'candles-u3-l1',
      title: 'هارامی و اینساید بار',
      steps: [
        {
          type: 'learn',
          title: 'هارامی (Harami)',
          body: '**هارامی** یعنی یه کندل بزرگ و بعدش یه کندل کوچیک که **بدنه‌ش کامل داخل بدنه‌ی** کندل قبلیه. بعد از روند نزولی بهش **هارامی صعودی** و بعد از روند صعودی **هارامی نزولی** می‌گن؛ یعنی قدرت روند داره کم می‌شه.',
          visual: {
            kind: 'glyphs',
            items: [
              { glyph: 'bullHarami', label: 'هارامی صعودی' },
              { glyph: 'bearHarami', label: 'هارامی نزولی' },
            ],
          },
          tip: 'هارامی به ژاپنی یعنی «باردار»؛ کندل کوچیک مثل بچه توی شکم کندل بزرگه.',
        },
        {
          type: 'learn',
          title: 'اینساید بار (Inside Bar)',
          body: 'توی **اینساید بار** کل کندل دوم، **با سایه‌هاش**، بین سقف و کف کندل قبلی جا می‌شه. به کندل بزرگ اول **کندل مادر (Mother Bar)** می‌گن. اینساید بار یعنی بازار داره **استراحت می‌کنه و فشرده** می‌شه.',
          visual: { kind: 'glyphs', items: [{ glyph: 'insideBar', label: 'اینساید بار' }] },
          tip: 'فرق اصلی: هارامی بدنه‌ها رو مقایسه می‌کنه، اینساید بار کل کندل رو با سایه‌ها.',
        },
        {
          type: 'chart',
          prompt: 'بعد از این ریزش، دو کندل آخر چه الگویی ساختن؟',
          chart: { candles: HARAMI_DOWN, highlight: HARAMI_DOWN.length - 1 },
          symbol: 'EUR/USD · 4H',
          trend: 'down',
          options: [P.bullHarami, P.bearHarami, P.bullEngulf, P.hammer],
          answer: 0,
          explanation: 'یه کندل قرمز بزرگ و بعدش یه سبز کوچیک که بدنه‌ش کامل داخل بدنه‌ی قرمزه، اونم بعد از روند نزولی: هارامی صعودی. فشار فروش کم شده؛ برای ورود منتظر تأیید بمون.',
        },
        {
          type: 'truefalse',
          statement: 'توی اینساید بار، سقف و کف کندل دوم (با سایه‌ها) داخل محدوده‌ی کندل قبلی قرار می‌گیره.',
          topic: 'اینساید بار · Inside Bar',
          answer: true,
          explanation: 'تعریف اینساید بار همینه: کل کندل دوم، نه فقط بدنه‌ش، بین سقف و کف کندل مادر جا می‌شه.',
        },
        {
          type: 'tap',
          prompt: 'توی این نمودار یه اینساید بار هست. روی کندل مادرش ضربه بزن.',
          chart: { candles: MOTHER_BAR },
          symbol: 'GBP/USD · 1H',
          answer: 7,
          explanation: 'کندل مادر همون کندل سبز بزرگیه که کندل بعدی کامل داخل محدوده‌ش جا شده. سقف و کف همین کندل، سطوح شکست اینساید بار هستن.',
        },
        {
          type: 'learn',
          title: 'معامله‌ی اینساید بار',
          body: 'خیلی از تریدرها **شکست سقف یا کف کندل مادر** رو معامله می‌کنن، ترجیحاً **هم‌جهت با روند**. مثلاً توی روند صعودی، سفارش خرید کمی بالای سقف مادر و حد ضرر کمی زیر کفش.',
          example: {
            rows: [
              { label: 'سقف کندل مادر', value: '1.0880', mono: true },
              { label: 'کف کندل مادر', value: '1.0840', mono: true },
              { label: 'سفارش خرید (بالای سقف)', value: '1.0882', mono: true, dot: 'sky' },
              { label: 'حد ضرر (زیر کف)', value: '1.0838', mono: true, dot: 'bear' },
            ],
            result: { label: 'ریسک', value: '۴۴ پیپ', tone: 'bear' },
          },
        },
        {
          type: 'chart',
          prompt: 'دو کندل آخر نسبت به هم چه الگویی دارن؟',
          chart: { candles: INSIDE_END, highlight: INSIDE_END.length - 1 },
          symbol: 'XAU/USD · 1H',
          trend: 'up',
          options: [P.insideBar, P.bullEngulf, P.bearEngulf, P.doji],
          answer: 0,
          explanation: 'سقف کندل آخر پایین‌تر از سقف کندل قبلی و کفش بالاتر از کف اونه؛ یعنی کامل داخلش جا شده. این اینساید باره؛ بازار بعد از یه حرکت قوی داره استراحت می‌کنه.',
        },
        {
          type: 'predict',
          prompt: 'توی روند صعودی یه اینساید بار شکل گرفت و کندل آخر بالای سقف کندل مادر بسته شد. چی کار می‌کنی؟',
          chart: {
            candles: INSIDE_BREAK,
            ghost: true,
            lines: [level.line(61900, 'سقف مادر', 'sky'), level.line(60900, 'کف مادر', 'gold')],
          },
          symbol: 'BTC/USDT · 4H',
          trend: 'up',
          answer: 'buy',
          explanation: 'شکست سقف کندل مادر هم‌جهت با روند صعودیه و احتمال ادامه‌ی حرکت رو بیشتر می‌کنه. حد ضرر منطقی زیر کف کندل مادره، چون اگه اونجا بشکنه، ستاپ باطل شده.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'هارامی', sub: 'Harami', meaning: 'بدنه‌ی دوم داخل بدنه‌ی اول' },
            { term: 'اینساید بار', sub: 'Inside Bar', meaning: 'کل کندل دوم داخل محدوده‌ی اول' },
            { term: 'کندل مادر', sub: 'Mother Bar', meaning: 'کندل بزرگی که بعدی توش جا می‌شه' },
            { term: 'کندل تأیید', sub: 'Confirmation', meaning: 'کندل بعدی که جهت الگو رو ثابت می‌کنه' },
          ],
        },
      ],
    },
    {
      id: 'candles-u3-l2',
      title: 'نفوذی، ابر سیاه و انبری',
      steps: [
        {
          type: 'learn',
          title: 'الگوی نفوذی (Piercing Line)',
          body: 'بعد از روند نزولی، یه **کندل قرمز بلند** میاد و بعدش یه کندل سبز که پایین باز می‌شه ولی **بالای وسط بدنه‌ی قرمز** بسته می‌شه (نه بالاتر از باز شدنش). یعنی خریدارها بیش از نصف ریزش کندل قبل رو پس گرفتن.',
          visual: { kind: 'glyphs', items: [{ glyph: 'piercing', label: 'الگوی نفوذی' }] },
          example: {
            rows: [
              { label: 'باز شدن کندل قرمز', value: '1.0900', mono: true, dot: 'bear' },
              { label: 'بسته شدن کندل قرمز', value: '1.0860', mono: true, dot: 'bear' },
            ],
            result: { label: 'سبز باید بالای وسط بدنه بسته بشه', value: '1.0880', mono: true, tone: 'bull' },
          },
        },
        {
          type: 'learn',
          title: 'ابر سیاه (Dark Cloud Cover)',
          body: 'برعکس نفوذی و **بعد از روند صعودی**: یه کندل سبز بلند و بعد یه کندل قرمز که بالاتر باز می‌شه ولی **زیر وسط بدنه‌ی سبز** بسته می‌شه. یعنی فروشنده‌ها بیش از نصف رشد کندل قبل رو پس گرفتن.',
          visual: { kind: 'glyphs', items: [{ glyph: 'darkCloud', label: 'ابر سیاه' }] },
          tip: 'توی فارکس و کریپتو گپ کم پیش میاد؛ برای همین خیلی‌ها باز شدن نزدیک بسته شدن قبلی رو هم قبول می‌کنن.',
        },
        {
          type: 'choice',
          prompt: 'روی طلا، کندل قرمز دیروز از ۲۴۰۰ باز شد و ۲۳۶۰ بسته شد. امروز کندل سبز از ۲۳۵۵ باز شده. برای الگوی نفوذی، سبز حداقل باید بالای چه قیمتی بسته بشه؟',
          facts: [
            { label: 'باز شدن قرمز', value: '۲۴۰۰', tone: 'bear' },
            { label: 'بسته شدن قرمز', value: '۲۳۶۰', tone: 'bear' },
          ],
          options: ['۲۳۸۰', '۲۴۰۰', '۲۳۶۰', '۲۳۷۰'],
          answer: 0,
          explanation: 'وسط بدنه‌ی قرمز = (۲۴۰۰ + ۲۳۶۰) ÷ ۲ = ۲۳۸۰. سبز باید بالای ۲۳۸۰ و زیر ۲۴۰۰ بسته بشه؛ اگه بالای ۲۴۰۰ بسته بشه، دیگه پوشای صعودیه.',
        },
        {
          type: 'chart',
          prompt: 'بالای این روند صعودی، دو کندل آخر چه الگویی ساختن؟',
          chart: { candles: DARK_CLOUD, highlight: DARK_CLOUD.length - 1 },
          symbol: 'EUR/USD · 1H',
          trend: 'up',
          options: [P.darkCloud, P.bearEngulf, P.piercing, P.shootingStar],
          answer: 0,
          explanation: 'کندل قرمز بالاتر از بسته شدن سبز باز شده و زیر وسط بدنه‌ی سبز بسته شده، ولی کل بدنه‌ش رو نپوشونده. این ابر سیاهه، نه پوشای نزولی.',
        },
        {
          type: 'learn',
          title: 'انبری (Tweezers)',
          body: 'توی **کف انبری** دو کندل پشت سر هم **کف تقریباً یکسان** دارن و توی **سقف انبری** سقف یکسان. یعنی قیمت دو بار به یه سطح رسیده و هر دو بار **پس زده شده**؛ ته روند نزولی یا بالای روند صعودی، هشدار برگشته.',
          visual: {
            kind: 'glyphs',
            items: [
              { glyph: 'tweezerBottom', label: 'کف انبری' },
              { glyph: 'tweezerTop', label: 'سقف انبری' },
            ],
          },
        },
        {
          type: 'tap',
          prompt: 'روی کندلی ضربه بزن که الگوی نفوذی رو کامل کرده.',
          chart: { candles: PIERCING },
          symbol: 'ETH/USDT · 4H',
          trend: 'down',
          answer: 8,
          explanation: 'بعد از یه کندل قرمز بلند، این کندل سبز پایین‌تر باز شده و بالای وسط بدنه‌ی قرمز (حدود ۳۰۶۷) بسته شده. کندل‌های سبز قبلی حتی به نصف کندل قرمز قبلشون هم نرسیده بودن.',
        },
        {
          type: 'chart',
          prompt: 'این دو کندل آخر، بالای روند، چه الگویی ساختن؟',
          chart: { candles: TWEEZER_TOP, highlight: TWEEZER_TOP.length - 1 },
          symbol: 'XAU/USD · 4H',
          trend: 'up',
          options: [P.tweezerTop, P.tweezerBottom, P.darkCloud, P.bearEngulf],
          answer: 0,
          explanation: 'هر دو کندل دقیقاً به یه سقف رسیدن و پس زده شدن: سقف انبری. کندل قرمز زیر وسط بدنه‌ی سبز بسته نشده، پس ابر سیاه نیست.',
        },
        {
          type: 'truefalse',
          statement: 'توی الگوی ابر سیاه، کندل قرمز کل بدنه‌ی کندل سبز قبلی رو می‌پوشونه.',
          topic: 'ابر سیاه · Dark Cloud',
          answer: false,
          explanation: 'ابر سیاه فقط تا زیر وسط بدنه‌ی سبز پایین میاد. اگه کل بدنه رو بپوشونه، الگو پوشای نزولی می‌شه که معمولاً قوی‌تر هم هست.',
        },
        {
          type: 'predict',
          prompt: 'بیت‌کوین دوباره به حمایت ۵۷٬۸۰۰ رسیده و یه کف انبری ساخته. منطقی‌ترین انتخاب چیه؟',
          chart: { candles: TWEEZER_BOTTOM, ghost: true, lines: [level.support(57800, '57,800')] },
          symbol: 'BTC/USDT · 1H',
          trend: 'down',
          answer: 'buy',
          explanation: 'دو کندل پشت سر هم دقیقاً روی حمایت کف زدن و کندل دوم سبز و قوی بسته شده. خریدارها از این سطح دفاع می‌کنن؛ احتمال برگشت بیشتره و حد ضرر هم زیر کف انبری مشخصه.',
        },
        {
          type: 'fill',
          sentence: 'توی الگوی نفوذی، کندل سبز باید بالای ___ بدنه‌ی قرمز بسته بشه، ولی پایین‌تر از ___ اون.',
          answers: ['وسط', 'قیمت باز شدن'],
          distractors: ['کف', 'سایه‌ی پایینی'],
          explanation: 'اگه سبز زیر وسط بسته بشه الگو کامل نیست، و اگه بالای باز شدن قرمز بسته بشه، دیگه پوشای صعودیه.',
        },
      ],
    },
    {
      id: 'candles-u3-l3',
      title: 'ستاره‌ی صبحگاهی، عصرگاهی، سه سرباز و سه کلاغ',
      steps: [
        {
          type: 'learn',
          title: 'ستاره‌ی صبحگاهی و عصرگاهی',
          body: '**ستاره‌ی صبحگاهی** سه کندله: یه قرمز بلند ته روند نزولی، یه **کندل کوچیک (ستاره)** پایین‌تر، و یه سبز بلند که تا **بالای وسط کندل اول** بالا میاد. **ستاره‌ی عصرگاهی** دقیقاً برعکسشه و بالای روند صعودی شکل می‌گیره.',
          visual: {
            kind: 'glyphs',
            items: [
              { glyph: 'morningStar', label: 'ستاره‌ی صبحگاهی' },
              { glyph: 'eveningStar', label: 'ستاره‌ی عصرگاهی' },
            ],
          },
          tip: 'اگه کندل وسط دوجی باشه، بهش «ستاره‌ی دوجی» صبحگاهی یا عصرگاهی می‌گن.',
        },
        {
          type: 'chart',
          prompt: 'سه کندل آخر، بعد از این ریزش، چه الگویی ساختن؟',
          chart: { candles: MORNING_STAR, highlight: MORNING_STAR.length - 1 },
          symbol: 'EUR/USD · 4H',
          trend: 'down',
          options: [P.morningStar, P.eveningStar, P.threeSoldiers, P.tweezerBottom],
          answer: 0,
          explanation: 'قرمز بلند، بعد یه ستاره‌ی کوچیک پایین‌تر و در آخر سبز بلندی که بالای وسط کندل اول بسته شده: ستاره‌ی صبحگاهی، یه الگوی برگشتی صعودی.',
        },
        {
          type: 'tap',
          prompt: 'روی «ستاره» (کندل وسط) الگوی ستاره‌ی عصرگاهی ضربه بزن.',
          chart: { candles: EVENING_STAR },
          symbol: 'BTC/USDT · 4H',
          trend: 'up',
          answer: 7,
          explanation: 'ستاره همون کندل کوچیکیه که بعد از سبز بلند، بالای روند ساخته شده. کندل قرمز بلند بعدش الگو رو کامل کرد و قیمت ریخت.',
        },
        {
          type: 'learn',
          title: 'سه سرباز سفید و سه کلاغ سیاه',
          body: '**سه سرباز سفید** یعنی سه کندل سبز بلند پشت سر هم که هر کدوم **داخل بدنه‌ی قبلی باز** و **نزدیک سقفش بسته** می‌شه. **سه کلاغ سیاه** برعکسشه: سه قرمز بلند که هر کدوم نزدیک کفش بسته می‌شه. هر دو نشونه‌ی **قدرت یه طرف** بازارن.',
          visual: {
            kind: 'glyphs',
            items: [
              { glyph: 'threeSoldiers', label: 'سه سرباز سفید' },
              { glyph: 'threeCrows', label: 'سه کلاغ سیاه' },
            ],
          },
          tip: 'اگه این الگوها بعد از یه حرکت خیلی طولانی بیان، قیمت ممکنه زیادی کشیده شده باشه؛ ورود بعد از یه اصلاح منطقی‌تره.',
        },
        {
          type: 'chart',
          prompt: 'بعد از یه دوره نوسان در کف، سه کندل آخر چه الگویی‌ان؟',
          chart: { candles: THREE_SOLDIERS, highlight: THREE_SOLDIERS.length - 1 },
          symbol: 'XAU/USD · 1D',
          options: [P.threeSoldiers, P.threeCrows, P.morningStar, P.eveningStar],
          answer: 0,
          explanation: 'سه کندل سبز بلند پشت سر هم، هر کدوم داخل بدنه‌ی قبلی باز شده و نزدیک سقفش بسته شده: سه سرباز سفید. خریدارها سه بازه‌ی پشت سر هم کنترل رو داشتن.',
        },
        {
          type: 'truefalse',
          statement: 'توی ستاره‌ی صبحگاهی، کندل وسط (ستاره) حتماً باید سبز باشه.',
          topic: 'ستاره‌ی صبحگاهی · Morning Star',
          answer: false,
          explanation: 'رنگ ستاره مهم نیست؛ مهم اینه که بدنه‌ش کوچیک باشه و نشون بده فشار فروش از نفس افتاده. کندل سوم، یعنی سبز بلند، الگو رو کامل می‌کنه.',
        },
        {
          type: 'learn',
          title: 'همه‌چیز رو کنار هم بذار',
          body: 'الگوهای سه‌کندلی وقتی قوی‌ترن که **روی سطح مهم** بیان و کندل سوم با **حجم بالا** همراه باشه. حد ضرر معمولاً اون‌طرف **سایه‌ی ستاره** می‌ره؛ جایی که اگه قیمت بهش برسه، الگو باطل شده.',
          visual: {
            kind: 'chart',
            chart: {
              candles: MORNING_STAR_VOLUME,
              lines: [level.support(2300)],
              volume: [42, 45, 38, 50, 55, 62, 40, 95],
            },
            symbol: 'صبحگاهی روی حمایت',
          },
        },
        {
          type: 'predict',
          prompt: 'اتریوم به مقاومت ۳۲۰۰ برگشته و یه ستاره‌ی عصرگاهی ساخته. چی کار می‌کنی؟',
          chart: { candles: EVENING_AT_RESISTANCE, ghost: true, lines: [level.resistance(3200, '3200')] },
          symbol: 'ETH/USDT · 4H',
          trend: 'up',
          answer: 'sell',
          explanation: 'ستاره‌ی عصرگاهی درست زیر مقاومتی شکل گرفته که قبلاً هم قیمت رو پس زده بود. احتمال ریزش بیشتره، ولی قطعی نیست؛ حد ضرر بالای سقف ستاره و مقاومت.',
        },
        {
          type: 'order',
          prompt: 'کندل‌های ستاره‌ی عصرگاهی رو به ترتیب بچین.',
          items: ['کندل سبز بلند توی روند صعودی', 'کندل کوچیک (ستاره) بالاتر از اون', 'کندل قرمز بلند تا زیر وسط کندل اول'],
          explanation: 'اول خریدارها قدرت دارن، بعد با ستاره مردد می‌شن و در آخر فروشنده‌ها با یه کندل قرمز بلند کنترل رو می‌گیرن.',
        },
        {
          type: 'choice',
          prompt: 'روی ETH/USDT · 4H، بعد از یه ریزش، روی حمایت ۲۸۰۰ یه ستاره‌ی صبحگاهی ساخته شده و کندل سومش حجم بالایی داره. حد ضرر رو کجا می‌ذاری؟',
          options: [
            'کمی زیر کف کندل وسط (ستاره)',
            'بالای سقف کندل سوم',
            'دقیقاً روی قیمت ورود',
            'لازم نیست؛ الگو با حجم تأیید شده',
          ],
          answer: 0,
          explanation: 'پایین‌ترین نقطه‌ی الگو کف ستاره‌ست. اگه قیمت زیر اون بسته بشه، الگو و حمایت هر دو شکست خوردن؛ پس حد ضرر کمی زیرش منطقیه.',
        },
      ],
    },
  ],
};
