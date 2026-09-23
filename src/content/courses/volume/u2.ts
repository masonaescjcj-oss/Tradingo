import { level, series } from '../../charts';
import { PALETTE } from '../../palette';
import type { Candle, Unit } from '../../types';

/** Session VWAP at the last candle: Σ(typical price × volume) ÷ Σ volume. */
function vwap(candles: Candle[], volume: number[], digits: number): number {
  const pv = candles.reduce((sum, [, h, l, c], i) => sum + ((h + l + c) / 3) * volume[i], 0);
  return Number((pv / volume.reduce((a, b) => a + b, 0)).toFixed(digits));
}

/** BTC range: green candles carry much more volume than red ones, so OBV climbs. */
const BTC_ACCUMULATION = series([60200, 60650, 60300, 60700, 60250, 60600, 60150, 60650, 60300, 60750, 60350, 60700, 60300, 60800, 60400, 60750], {
  start: 60000,
});
const BTC_ACCUMULATION_VOL = [2100, 3900, 1500, 4100, 1400, 3800, 1300, 4200, 1500, 4300, 1400, 4000, 1300, 4400, 1500, 4100];

/** ETH pressing under 3,100 while OBV makes a new high on the last candle. */
const ETH_OBV_LEADS = series([3040, 3072, 3055, 3085, 3062, 3090, 3070, 3094, 3076, 3095, 3081, [3081, 3099, 3078, 3096]], { start: 3030 });
const ETH_OBV_LEADS_VOL = [2600, 4200, 1800, 4500, 1700, 4600, 1600, 4800, 1500, 4700, 1500, 5200];

/** EUR/USD 15M: an up day that stays above VWAP. */
const EUR_UP_DAY = series(
  [1.0812, 1.0818, 1.0815, 1.0824, 1.0831, 1.0827, 1.0836, 1.0842, 1.0838, 1.0846, 1.0853, 1.0849, 1.0857, 1.0862, 1.0858, 1.0866],
  { start: 1.0808 },
);
const EUR_UP_DAY_VOL = [5200, 3800, 2900, 3400, 3900, 2500, 3300, 3600, 2400, 3100, 3500, 2200, 2900, 3200, 2100, 3000];

/** GBP/USD 15M: a down day that stays below VWAP. */
const GBP_DOWN_DAY = series(
  [1.2745, 1.2738, 1.2742, 1.2731, 1.2724, 1.2729, 1.2718, 1.2711, 1.2716, 1.2705, 1.2698, 1.2703, 1.2692, 1.2686, 1.269, 1.2681],
  { start: 1.275 },
);
const GBP_DOWN_DAY_VOL = [5600, 4100, 2800, 3900, 3600, 2500, 3700, 3400, 2300, 3500, 3200, 2200, 3300, 3000, 2100, 2900];

/** BTC 15M: rally above VWAP, quiet pullback into it, then a bullish rejection candle. */
const BTC_VWAP_BOUNCE = series([60050, 60180, 60120, 60300, 60420, 60360, 60520, 60640, 60580, 60470, 60400, 60350, [60350, 60440, 60260, 60420]], {
  start: 59980,
});
const BTC_VWAP_BOUNCE_VOL = [4800, 3900, 2600, 3700, 4000, 2400, 3600, 3900, 2200, 1900, 1800, 1700, 3600];

/** BTC daily: long decline ending in a selling-climax candle (13). */
const BTC_CLIMAX = series([64000, 63500, 63800, 63000, 62400, 62700, 61800, 61000, 61300, 60200, 59300, 58200, 57100, [57100, 57300, 54200, 56300], 57200, 57600], {
  start: 64300,
});
const BTC_CLIMAX_VOL = [2100, 2400, 1900, 2600, 2800, 2000, 3000, 3300, 2400, 3700, 4100, 4600, 5200, 14800, 6200, 4300];

/** Gold: selling climax at candle 9, then a bounce and a quiet drift. */
const GOLD_CLIMAX = series([2445, 2438, 2441, 2430, 2422, 2426, 2414, 2405, 2396, [2396, 2398, 2366, 2389], 2397, 2403, 2398, 2391, 2386, 2393], {
  start: 2450,
});
const GOLD_CLIMAX_VOL = [3100, 3400, 2800, 3700, 3900, 2900, 4200, 4600, 5100, 13500, 5200, 3600, 2800, 2500, 2300, 2700];

/** ETH: long rally ending in a wide, long-upper-wick candle on huge volume. */
const ETH_BUY_CLIMAX = series([3120, 3138, 3131, 3152, 3170, 3162, 3186, 3205, 3198, 3224, 3246, 3238, 3265, 3290, 3318, [3318, 3405, 3312, 3334]], {
  start: 3110,
});
const ETH_BUY_CLIMAX_VOL = [2400, 2700, 2100, 2900, 3100, 2300, 3300, 3500, 2500, 3800, 4100, 2900, 4500, 5000, 5800, 13900];

/** GBP/USD: selling climax (8), bounce, low-volume secondary test (14) above the climax low, bullish candle. */
const GBP_SECONDARY_TEST = series(
  [1.278, 1.2766, 1.2771, 1.2752, 1.2738, 1.2743, 1.2722, 1.2705, [1.2705, 1.2709, 1.2662, 1.2694], 1.2712, 1.2726, 1.2716, 1.2701, 1.269, [1.269, 1.2694, 1.2671, 1.2689], [1.2689, 1.2712, 1.2686, 1.2709]],
  { start: 1.279 },
);
const GBP_SECONDARY_TEST_VOL = [2800, 3100, 2500, 3400, 3700, 2600, 4200, 4800, 12600, 5100, 3900, 2700, 2300, 2100, 1900, 3600];

export const u2: Unit = {
  id: 'volume-u2',
  title: 'اندیکاتورهای حجمی',
  ...PALETTE.teal,
  lessons: [
    {
      id: 'volume-u2-l1',
      title: 'OBV',
      steps: [
        {
          type: 'learn',
          title: 'OBV چیه؟',
          body: '**OBV (On-Balance Volume)** که جو گرانویل معرفی کرد، یه جمع تجمعیه: اگه کندل **بالاتر از کندل قبلی بسته بشه**، حجمش **اضافه** می‌شه؛ اگه **پایین‌تر بسته بشه، کم** می‌شه و اگه برابر باشه، OBV تغییری نمی‌کنه.',
          example: {
            rows: [
              { label: 'OBV شروع', value: '۱۰٬۰۰۰' },
              { label: 'روز ۱: بسته شدن بالاتر، حجم ۲٬۰۰۰', value: '+۲٬۰۰۰', tone: 'bull' },
              { label: 'روز ۲: بسته شدن پایین‌تر، حجم ۱٬۵۰۰', value: '−۱٬۵۰۰', tone: 'bear' },
            ],
            result: { label: 'OBV جدید', value: '۱۰٬۵۰۰', tone: 'gold' },
          },
        },
        {
          type: 'learn',
          title: 'شیب مهمه، نه عدد',
          body: 'عدد خود OBV مهم نیست، چون به نقطه‌ی شروع بستگی داره؛ **جهت و شیبش** مهمه. OBV رو به بالا یعنی حجم کندل‌های مثبت بیشتر از منفی‌هاست و OBV رو به پایین، برعکس.',
          tip: 'OBV روی نمودارهای این اپ کشیده نمی‌شه؛ از رنگ کندل‌ها و قد میله‌های حجم می‌تونی شکلش رو حدس بزنی.',
        },
        {
          type: 'choice',
          prompt: 'OBV امروز ۵۰٬۰۰۰ هست. سه روز بعد این‌طوری بوده. OBV آخر چنده؟',
          facts: [
            { label: 'روز ۱: بسته شدن بالاتر', value: 'حجم ۴٬۰۰۰', tone: 'bull' },
            { label: 'روز ۲: بسته شدن پایین‌تر', value: 'حجم ۳٬۰۰۰', tone: 'bear' },
            { label: 'روز ۳: بسته شدن بالاتر', value: 'حجم ۶٬۰۰۰', tone: 'bull' },
          ],
          options: ['۵۷٬۰۰۰', '۶۳٬۰۰۰', '۴۳٬۰۰۰', '۵۱٬۰۰۰'],
          answer: 0,
          explanation: '۵۰٬۰۰۰ + ۴٬۰۰۰ − ۳٬۰۰۰ + ۶٬۰۰۰ = ۵۷٬۰۰۰. روزهای بالاتر جمع و روزهای پایین‌تر کم می‌شن.',
        },
        {
          type: 'truefalse',
          statement: 'اگه قیمت دقیقاً برابر کندل قبلی بسته بشه، OBV تغییری نمی‌کنه.',
          topic: 'OBV',
          answer: true,
          explanation: 'طبق قانون گرانویل، فقط بسته شدن بالاتر یا پایین‌تر حجم رو به OBV اضافه یا ازش کم می‌کنه؛ بسته شدن برابر اثری نداره.',
        },
        {
          type: 'chart',
          prompt: 'قیمت توی رنجه. از روی رنگ کندل‌ها و میله‌های حجم، OBV احتمالاً چه شکلیه؟',
          chart: { candles: BTC_ACCUMULATION, volume: BTC_ACCUMULATION_VOL },
          symbol: 'BTC/USDT · 4H',
          options: [
            { label: 'رو به بالا؛ حجم کندل‌های مثبت بیشتره' },
            { label: 'رو به پایین؛ حجم کندل‌های منفی بیشتره' },
            { label: 'صاف؛ حجم هیچ اثری روی OBV نداره' },
          ],
          answer: 0,
          explanation: 'هر کندل سبز با حجم بالا به OBV اضافه می‌کنه و کندل‌های قرمز کم‌حجم فقط کمی کم می‌کنن؛ پس OBV مدام بالا می‌ره، در حالی که قیمت توی رنجه.',
        },
        {
          type: 'learn',
          title: 'واگرایی و انباشت',
          body: 'اگه قیمت سقف بالاتر بزنه ولی OBV سقف پایین‌تر بسازه، یعنی حجم پشت رشد ضعیف شده (**واگرایی منفی OBV**). برعکس، اگه قیمت توی رنج باشه و OBV مدام بالا بره، خیلی از تریدرها اون رو نشونه‌ی **انباشت (Accumulation)** توسط خریدارهای بزرگ می‌دونن.',
        },
        {
          type: 'predict',
          prompt: 'قیمت هنوز زیر مقاومت ۳٬۱۰۰ هست ولی OBV همین الان سقف جدید زده. کدوم حرکت محتمل‌تره؟',
          chart: { candles: ETH_OBV_LEADS, volume: ETH_OBV_LEADS_VOL, lines: [level.resistance(3100)], ghost: true },
          symbol: 'ETH/USDT · 4H',
          answer: 'buy',
          explanation: 'حجم روی کندل‌های سبز خیلی بیشتره و OBV زودتر از قیمت سقف جدید زده؛ یعنی فشار خرید داره جمع می‌شه. شکست به بالا محتمل‌تره، ولی تریدرهای محتاط منتظر بسته شدن بالای ۳٬۱۰۰ می‌مونن.',
        },
        {
          type: 'fill',
          sentence: 'اگه کندل بالاتر از کندل قبلی بسته بشه، حجمش به OBV ___ می‌شه و اگه پایین‌تر بسته بشه، از OBV ___ می‌شه.',
          answers: ['اضافه', 'کم'],
          distractors: ['ضرب', 'تقسیم', 'پاک'],
          explanation: 'OBV فقط جمع و تفریق حجمه؛ علامت رو جهت بسته شدن نسبت به کندل قبلی تعیین می‌کنه.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'OBV', sub: 'On-Balance Volume', meaning: 'جمع تجمعی حجم با علامت' },
            { term: 'انباشت', sub: 'Accumulation', meaning: 'خرید آروم قبل از حرکت' },
            { term: 'توزیع', sub: 'Distribution', meaning: 'فروش آروم در سقف' },
            { term: 'واگرایی OBV', sub: 'OBV Divergence', meaning: 'ناهماهنگی جهت قیمت و OBV' },
          ],
        },
      ],
    },
    {
      id: 'volume-u2-l2',
      title: 'VWAP',
      steps: [
        {
          type: 'learn',
          title: 'VWAP چیه؟',
          body: '**VWAP (Volume Weighted Average Price)** میانگین قیمتیه که **با حجم وزن‌دهی** شده: جمع (قیمت معمول × حجم) تقسیم بر جمع حجم. **قیمت معمول** هر کندل = (سقف + کف + بسته شدن) ÷ ۳. معمولاً از **شروع هر روز (سشن)** از نو حساب می‌شه.',
          visual: {
            kind: 'chart',
            chart: { candles: EUR_UP_DAY, volume: EUR_UP_DAY_VOL, lines: [level.line(vwap(EUR_UP_DAY, EUR_UP_DAY_VOL, 4), 'VWAP', 'sky')] },
            symbol: 'VWAP روزانه',
          },
          tip: 'خط VWAP توی نمودارهای این درس، مقدار VWAP در کندل آخره.',
        },
        {
          type: 'learn',
          title: 'چرا VWAP مهمه؟',
          body: 'خیلی از مؤسسه‌ها VWAP رو **معیار کیفیت اجرای سفارش** می‌دونن: خرید زیر VWAP یعنی قیمتی بهتر از میانگین روز. تریدرهای روزانه قیمت **بالای VWAP** رو نشونه‌ی دست بالای خریدارها توی اون روز و **زیرش** رو دست بالای فروشنده‌ها می‌دونن.',
        },
        {
          type: 'choice',
          prompt: 'امروز فقط دو معامله روی اتریوم انجام شده. VWAP چنده؟',
          facts: [
            { label: 'معامله‌ی ۱', value: '۱۰۰ واحد در ۳٬۰۰۰', tone: 'sky' },
            { label: 'معامله‌ی ۲', value: '۳۰۰ واحد در ۳٬۱۰۰', tone: 'sky' },
          ],
          options: ['۳٬۰۷۵', '۳٬۰۵۰', '۳٬۱۰۰', '۳٬۰۲۵'],
          answer: 0,
          explanation: '(۱۰۰ × ۳٬۰۰۰ + ۳۰۰ × ۳٬۱۰۰) ÷ ۴۰۰ = (۳۰۰٬۰۰۰ + ۹۳۰٬۰۰۰) ÷ ۴۰۰ = ۳٬۰۷۵. چون حجم بیشتر توی ۳٬۱۰۰ معامله شده، VWAP به اون نزدیک‌تره تا میانگین ساده‌ی ۳٬۰۵۰.',
        },
        {
          type: 'truefalse',
          statement: 'VWAP استاندارد روزانه، اول هر سشن معاملاتی از نو حساب می‌شه.',
          topic: 'VWAP',
          answer: true,
          explanation: 'VWAP روزانه فقط معامله‌های همون روز رو حساب می‌کنه؛ برای همین اول هر سشن صفر می‌شه و دوباره ساخته می‌شه.',
        },
        {
          type: 'chart',
          prompt: 'قیمت تقریباً کل روز زیر VWAP مونده. سوگیری (Bias) روزانه چیه؟',
          chart: { candles: GBP_DOWN_DAY, volume: GBP_DOWN_DAY_VOL, lines: [level.line(vwap(GBP_DOWN_DAY, GBP_DOWN_DAY_VOL, 4), 'VWAP', 'sky')] },
          symbol: 'GBP/USD · 15M',
          options: [
            { label: 'نزولی؛ فروشنده‌ها دست بالا رو دارن' },
            { label: 'صعودی؛ خریدارها دست بالا رو دارن' },
            { label: 'VWAP هیچ اطلاعاتی نمی‌ده' },
          ],
          answer: 0,
          explanation: 'وقتی قیمت مدام زیر میانگین وزنی روز معامله می‌شه، یعنی بیشتر حجم امروز توی قیمت‌های بالاتر خریده شده و الان توی ضرره؛ فروشنده‌ها کنترل رو دارن.',
        },
        {
          type: 'learn',
          title: 'VWAP به‌عنوان حمایت و مقاومت',
          body: 'توی روزهای روندی، قیمت اغلب به VWAP **پولبک** می‌زنه و ازش برمی‌گرده؛ مثل یه حمایت یا مقاومت پویا. **Anchored VWAP** همین محاسبه‌ست ولی از یه نقطه‌ی دلخواه شروع می‌شه؛ مثلاً از یه کف مهم یا روز انتشار یه خبر.',
        },
        {
          type: 'predict',
          prompt: 'قیمت امروز بالای VWAP بوده، با حجم کم تا VWAP اصلاح کرده و الان یه کندل صعودی با حجم بیشتر از روش بسته شده. قدم بعدی؟',
          chart: {
            candles: BTC_VWAP_BOUNCE,
            volume: BTC_VWAP_BOUNCE_VOL,
            lines: [level.line(vwap(BTC_VWAP_BOUNCE, BTC_VWAP_BOUNCE_VOL, 0), 'VWAP', 'sky')],
            ghost: true,
          },
          symbol: 'BTC/USDT · 15M',
          trend: 'up',
          answer: 'buy',
          explanation: 'سوگیری روز صعودیه، اصلاح کم‌حجم بوده و قیمت از VWAP با حجم بیشتر برگشته؛ یعنی خریدارها از این سطح دفاع کردن. حد ضرر منطقی کمی زیر کف همین کندل.',
        },
        {
          type: 'order',
          prompt: 'مراحل حساب کردن VWAP رو مرتب کن.',
          items: ['قیمت معمول: (سقف+کف+بسته)÷۳', 'ضرب قیمت معمول در حجم هر کندل', 'جمع حاصل‌ضرب‌ها از شروع سشن', 'تقسیم بر جمع حجم از شروع سشن'],
          explanation: 'VWAP در واقع میانگینیه که هر قیمت رو به اندازه‌ی حجمش حساب می‌کنه؛ برای همین باید اول حاصل‌ضرب‌ها و حجم‌ها رو جدا جمع کنی.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'VWAP', sub: 'Volume Weighted Avg. Price', meaning: 'میانگین قیمت وزن‌دار با حجم' },
            { term: 'قیمت معمول', sub: 'Typical Price', meaning: '(سقف + کف + بسته شدن) ÷ ۳' },
            { term: 'VWAP لنگرشده', sub: 'Anchored VWAP', meaning: 'VWAP از یه نقطه‌ی دلخواه' },
            { term: 'سشن', sub: 'Session', meaning: 'بازه‌ای که VWAP از اولش حساب می‌شه' },
          ],
        },
      ],
    },
    {
      id: 'volume-u2-l3',
      title: 'حجم اوج و پایان روند',
      steps: [
        {
          type: 'learn',
          title: 'اوج فروش (Selling Climax)',
          body: 'بعد از یه ریزش طولانی، گاهی یه کندل بزرگ با **حجم خیلی غیرعادی** و معمولاً **سایه‌ی پایینی بلند** می‌بینیم؛ فروشنده‌های ترسیده یه‌جا خالی می‌کنن و خریدارهای بزرگ جذبش می‌کنن. به این **اوج فروش** یا **تسلیم (Capitulation)** می‌گن.',
          visual: { kind: 'chart', chart: { candles: BTC_CLIMAX, volume: BTC_CLIMAX_VOL }, symbol: 'اوج فروش' },
        },
        {
          type: 'learn',
          title: 'اوج خرید (Buying Climax)',
          body: 'برعکسش، بعد از یه رشد طولانی، کندل پرحجم و بزرگ با **سایه‌ی بالایی بلند** ممکنه **اوج خرید** باشه؛ جایی که تازه‌واردها با هیجان می‌خرن و بزرگ‌ترها می‌فروشن. این اصطلاح‌ها از روش **وایکوف (Wyckoff)** میان.',
        },
        {
          type: 'tap',
          prompt: 'روی کندلی بزن که شبیه اوج فروش (Selling Climax) هست.',
          chart: { candles: GOLD_CLIMAX, volume: GOLD_CLIMAX_VOL },
          symbol: 'XAU/USD · 4H',
          answer: 9,
          explanation: 'بعد از یه ریزش طولانی، این کندل بلندترین میله‌ی حجم رو داره و سایه‌ی پایینی خیلی بلندی ساخته؛ قیمت تا پایین رفت ولی خریدارها برش گردوندن. این ویژگی‌های کلاسیک اوج فروشه.',
        },
        {
          type: 'chart',
          prompt: 'کندل آخر بعد از یه رشد طولانی، با حجم غیرعادی و سایه‌ی بالایی بلند بسته شده. این احتمالاً چیه؟',
          chart: { candles: ETH_BUY_CLIMAX, volume: ETH_BUY_CLIMAX_VOL },
          symbol: 'ETH/USDT · 1D',
          options: [{ label: 'اوج خرید؛ احتمال خستگی روند' }, { label: 'اوج فروش؛ احتمال کف' }, { label: 'شکست فیک یه حمایت' }],
          answer: 0,
          explanation: 'رشد طولانی، بعد یه کندل خیلی پرحجم که قیمت رو بالا برد ولی نتونست اونجا نگهش داره (سایه‌ی بالایی بلند)؛ یعنی عرضه‌ی زیادی وارد شده. این شبیه اوج خریده، هرچند تأیید لازم داره.',
        },
        {
          type: 'truefalse',
          statement: 'هر جهش حجم یعنی روند تموم شده.',
          topic: 'حجم اوج · Climax',
          answer: false,
          explanation: 'جهش حجم می‌تونه شروع یه حرکت (مثلاً شکست) هم باشه. اوج فقط بعد از یه حرکت طولانی و با رفتار قیمتی مناسب معنی پیدا می‌کنه و باز هم تأیید لازم داره.',
        },
        {
          type: 'learn',
          title: 'تأیید بعد از اوج',
          body: 'اوج حجم به‌تنهایی کافی نیست. نشونه‌ی تأیید: بعد از اوج فروش، قیمت برمی‌گرده و وقتی دوباره کف رو **تست ثانویه (Secondary Test)** می‌کنه، **حجم خیلی کمتره** و کف پایین‌تری ساخته نمی‌شه؛ یعنی فروشنده‌ها ته کشیدن.',
        },
        {
          type: 'predict',
          prompt: 'بعد از اوج فروش، قیمت دوباره کف رو تست کرده؛ این بار با حجم خیلی کم و بدون کف پایین‌تر. کندل آخر صعودیه. قدم بعدی؟',
          chart: { candles: GBP_SECONDARY_TEST, volume: GBP_SECONDARY_TEST_VOL, ghost: true },
          symbol: 'GBP/USD · 4H',
          answer: 'buy',
          explanation: 'تست ثانویه‌ی کم‌حجم که بالای کف اوج فروش نگه داشته شده، نشون می‌ده فشار فروش ته کشیده. احتمال برگشت بیشتره؛ حد ضرر زیر کف اوج فروش.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'اوج فروش', sub: 'Selling Climax', meaning: 'ریزش پرحجم آخر یه روند نزولی' },
            { term: 'اوج خرید', sub: 'Buying Climax', meaning: 'رشد پرحجم آخر یه روند صعودی' },
            { term: 'تسلیم', sub: 'Capitulation', meaning: 'فروش هیجانی و دسته‌جمعی' },
            { term: 'تست ثانویه', sub: 'Secondary Test', meaning: 'برگشت کم‌حجم به کف اوج' },
          ],
        },
        {
          type: 'choice',
          prompt: 'بیت‌کوین بعد از ۳ هفته ریزش، یه کندل روزانه با حجم ۴ برابر میانگین و سایه‌ی پایینی بلند زده. منطقی‌ترین برخورد؟',
          options: [
            'احتمال اوج فروش رو در نظر بگیر و منتظر تست کم‌حجم بمون',
            'فوراً با کل سرمایه بخر؛ کف قطعیه',
            'فوراً بفروش چون حجم فروش زیاده',
            'حجم رو نادیده بگیر؛ فقط قیمت مهمه',
          ],
          answer: 0,
          explanation: 'این ویژگی‌ها شبیه اوج فروشه، ولی کف فقط با تأیید معتبر می‌شه. تست ثانویه‌ی کم‌حجم و کف بالاتر، ورود کم‌ریسک‌تری می‌ده.',
        },
      ],
    },
  ],
};
