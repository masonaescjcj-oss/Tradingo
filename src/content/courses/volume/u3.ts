import { level, mirror, series } from '../../charts';
import { PALETTE } from '../../palette';
import type { Unit } from '../../types';

/*
 * Profile levels below were computed from each chart's own candles and volume
 * (each candle's volume spread evenly over its high–low range, value area = 70%).
 */

/** EUR/USD balance: POC ≈ 1.0833, value area 1.0820–1.0840. */
const EUR_BALANCE = series(
  [1.0822, 1.0834, 1.0829, 1.0838, 1.0831, 1.0826, 1.0833, 1.085, 1.0856, 1.0842, 1.0835, 1.083, 1.0836, 1.0828, 1.0812, 1.0805, 1.0818, 1.0829, 1.0834, 1.0831, 1.0837, 1.0832, 1.0828, 1.0833],
  { start: 1.0815 },
);
const EUR_BALANCE_VOL = [2600, 3100, 2900, 3300, 3000, 2800, 3200, 2400, 2100, 2700, 3100, 3300, 3400, 3000, 2200, 1900, 2500, 3100, 3500, 3300, 3600, 3400, 3200, 3300];

/** BTC range: most volume trades around 60,400. */
const BTC_POC = series(
  [60300, 60550, 60420, 60380, 60650, 60820, 60500, 60380, 60450, 60150, 59950, 60200, 60400, 60360, 60480, 60420, 60700, 60450, 60380, 60420],
  { start: 60200 },
);
const BTC_POC_VOL = [2400, 2800, 3100, 3300, 2600, 2200, 2900, 3400, 3500, 2500, 2100, 2800, 3600, 3700, 3500, 3600, 2700, 3300, 3500, 3400];

/** GBP/USD: balance around POC ≈ 1.2738, a drop away from it, then a hammer. */
const GBP_BACK_TO_POC = series([1.2735, 1.2742, 1.2738, 1.2745, 1.2739, 1.2733, 1.2741, 1.2736, 1.2744, 1.274, 1.2729, 1.2718, 1.2711, [1.2711, 1.2715, 1.2698, 1.2713]], {
  start: 1.2731,
});
const GBP_BACK_TO_POC_VOL = [3000, 3300, 3500, 3200, 3600, 3100, 3400, 3500, 3300, 3200, 2600, 2400, 2300, 3900];

/** ETH: balance (value area of candles 0–13: VAL 3015, POC 3023, VAH 3035), breakout, low-volume retest of VAH. */
const ETH_VAH_RETEST = series([3012, 3024, 3018, 3030, 3021, 3015, 3026, 3033, 3022, 3017, 3028, 3020, 3025, 3031, 3048, 3066, 3078, 3060, 3042, [3042, 3062, 3034, 3058]], {
  start: 3006,
});
const ETH_VAH_RETEST_VOL = [2800, 3100, 3300, 3000, 3400, 3200, 3500, 3100, 3600, 3300, 3400, 3500, 3300, 3200, 4800, 5200, 4600, 2200, 1900, 4100];

/** Gold: balance (value area of candles 0–13: VAL 2402, POC 2407, VAH 2412), then a poke above VAH that closes back inside. */
const GOLD_VAH_REJECT = series([2402, 2408, 2405, 2411, 2406, 2401, 2407, 2413, 2409, 2404, 2410, 2406, 2412, 2408, [2408, 2421, 2407, 2410]], { start: 2398 });
const GOLD_VAH_REJECT_VOL = [2900, 3200, 3400, 3100, 3500, 3000, 3300, 3100, 3600, 3200, 3400, 3500, 3200, 3300, 3700];

/** EUR/USD: balance (value area of candles 0–11: VAL 1.0844, POC 1.0850, VAH 1.0856), a drop below VAL, re-entry on candle 15. */
const EUR_REENTRY = series(
  [1.0848, 1.0856, 1.0851, 1.0858, 1.0846, 1.0853, 1.0849, 1.0857, 1.0852, 1.0847, 1.0855, 1.085, 1.0836, 1.0829, 1.0832, [1.0832, 1.0849, 1.083, 1.0847], 1.0853, 1.0859, 1.0864, 1.0862],
  { start: 1.0852 },
);
const EUR_REENTRY_VOL = [3200, 3400, 3600, 3300, 3500, 3700, 3400, 3600, 3500, 3300, 3400, 3500, 3900, 3100, 2600, 4300, 3800, 3600, 3700, 3200];

/** EUR/USD: HVN around 1.0800, a fast move through a thin area (LVN), HVN around 1.0870. */
const EUR_NODES = series(
  [1.0798, 1.0805, 1.0801, 1.0808, 1.0802, 1.0797, 1.0804, 1.0809, 1.0803, 1.0806, [1.0806, 1.0838, 1.0804, 1.0835], [1.0835, 1.0866, 1.0833, 1.0862], 1.0869, 1.0864, 1.0871, 1.0866, 1.0873, 1.0867, 1.0872, 1.0868, 1.0874, 1.0869],
  { start: 1.0801 },
);
const EUR_NODES_VOL = [3300, 3500, 3700, 3400, 3600, 3500, 3800, 3400, 3600, 3700, 5200, 4800, 3500, 3700, 3400, 3600, 3500, 3700, 3300, 3600, 3400, 3500];

/** Mirror image of EUR_NODES: high balance first, a fast drop, then a low balance. */
const EUR_NODES_DOWN = mirror(EUR_NODES, 1.0835);

/** BTC: balance near 60,100, one candle (8) crosses the thin area, balance near 61,300. */
const BTC_LVN_JUMP = series([60020, 60150, 60060, 60180, 60040, 60130, 60070, 60160, [60160, 61280, 60140, 61220], 61310, 61240, 61350, 61270, 61330, 61260, 61340], {
  start: 60080,
});
const BTC_LVN_JUMP_VOL = [3100, 3300, 3200, 3400, 3000, 3300, 3200, 3100, 6800, 3500, 3300, 3400, 3200, 3300, 3100, 3200];

/** GBP/USD: upper HVN, fast drop through an LVN, lower HVN, then a high-volume break back into the LVN. */
const GBP_INTO_LVN = series(
  [1.2791, 1.2785, 1.2793, 1.2787, 1.2794, 1.2786, 1.2792, 1.2788, [1.2788, 1.279, 1.2758, 1.2761], [1.2761, 1.2763, 1.2728, 1.2732], 1.2726, 1.2731, 1.2724, 1.2729, 1.2722, 1.273, 1.2725, 1.2731, [1.2731, 1.2756, 1.2729, 1.2753]],
  { start: 1.2786 },
);
const GBP_INTO_LVN_VOL = [3400, 3600, 3500, 3700, 3300, 3600, 3500, 3400, 5400, 5100, 3600, 3400, 3700, 3500, 3600, 3400, 3500, 3300, 5600];

export const u3: Unit = {
  id: 'volume-u3',
  title: 'ولوم پروفایل',
  ...PALETTE.coral,
  lessons: [
    {
      id: 'volume-u3-l1',
      title: 'ولوم پروفایل و POC',
      steps: [
        {
          type: 'learn',
          title: 'ولوم پروفایل چیه؟',
          body: 'حجم معمولی نشون می‌ده **چه زمانی** معامله شده؛ **ولوم پروفایل (Volume Profile)** نشون می‌ده **توی چه قیمتی** معامله شده. یه هیستوگرام افقی کنار نمودار که هر ردیفش، حجم معامله‌شده توی یه سطح قیمته.',
          visual: {
            kind: 'chart',
            chart: { candles: EUR_BALANCE, volume: EUR_BALANCE_VOL, lines: [level.line(1.0833, 'POC', 'sky')] },
            symbol: 'POC یه رنج',
          },
          tip: 'اپ هیستوگرام افقی رو نمی‌کشه؛ سطح‌های مهمش رو با خط و ناحیه نشون می‌دیم.',
        },
        {
          type: 'learn',
          title: 'نقطه‌ی کنترل (POC)',
          body: '**POC (Point of Control)** قیمتیه که **بیشترین حجم** توی بازه‌ی انتخابی اونجا معامله شده؛ جایی که خریدار و فروشنده بیشتر از همه روی قیمت توافق داشتن. POC اغلب مثل **آهنربا** قیمت رو به سمت خودش می‌کشه و می‌تونه **حمایت یا مقاومت** باشه.',
        },
        {
          type: 'choice',
          prompt: 'فرق اصلی ولوم پروفایل با حجم معمولی (میله‌های پایین نمودار) چیه؟',
          options: ['پروفایل حجم رو بر اساس قیمت نشون می‌ده، نه زمان', 'پروفایل فقط حجم خریدها رو نشون می‌ده', 'پروفایل فقط روی کریپتو کار می‌کنه', 'هیچ فرقی با هم ندارن'],
          answer: 0,
          explanation: 'میله‌های حجم معمولی روی محور زمان‌ان (حجم هر کندل)؛ پروفایل همون حجم رو روی محور قیمت پخش می‌کنه تا ببینی کجا بیشتر معامله شده.',
        },
        {
          type: 'choice',
          prompt: 'ولوم پروفایل یه روز EUR/USD این‌طوریه. POC کجاست؟',
          facts: [
            { label: 'حجم در 1.0840', value: '۱٬۲۰۰', tone: 'neutral' },
            { label: 'حجم در 1.0850', value: '۳٬۴۰۰', tone: 'sky' },
            { label: 'حجم در 1.0860', value: '۲٬۱۰۰', tone: 'neutral' },
          ],
          options: ['1.0850', '1.0840', '1.0860', '1.0855'],
          answer: 0,
          explanation: 'POC یعنی سطحی با بیشترین حجم؛ اینجا ۱٫۰۸۵۰ با ۳٬۴۰۰ واحد. وسط بودن یا نبودن مهم نیست، فقط حجم تعیین می‌کنه.',
        },
        {
          type: 'truefalse',
          statement: 'POC همیشه دقیقاً وسط محدوده‌ی قیمت (بین سقف و کف) قرار داره.',
          topic: 'POC',
          answer: false,
          explanation: 'POC جاییه که بیشترین حجم معامله شده و می‌تونه نزدیک سقف، کف یا هر جای دیگه‌ی محدوده باشه.',
        },
        {
          type: 'chart',
          prompt: 'قیمت بیشترین زمان و حجم رو دور این خط گذرونده. این خط به احتمال زیاد چیه؟',
          chart: { candles: BTC_POC, volume: BTC_POC_VOL, lines: [level.unknown(60400)] },
          symbol: 'BTC/USDT · 1H',
          options: [{ label: 'POC؛ پرحجم‌ترین قیمت' }, { label: 'سقف محدوده' }, { label: 'کف محدوده' }, { label: 'حد ضرر' }],
          answer: 0,
          explanation: 'قیمت مدام از این سطح دور شده و دوباره برگشته و بیشتر کندل‌های پرحجم دورش بسته شدن؛ این رفتار POC هست. سقف و کف محدوده خیلی بالاتر و پایین‌ترن.',
        },
        {
          type: 'predict',
          prompt: 'قیمت از ناحیه‌ی پرحجم به پایین دور شده و با یه چکش پرحجم برگشته. POC بالای سرشه. کدوم حرکت محتمل‌تره؟',
          chart: { candles: GBP_BACK_TO_POC, volume: GBP_BACK_TO_POC_VOL, lines: [level.line(1.2738, 'POC', 'sky')], ghost: true },
          symbol: 'GBP/USD · 1H',
          answer: 'buy',
          explanation: 'فروشنده‌ها نتونستن قیمت رو پایین‌تر نگه دارن و چکش نشون می‌ده خریدارها وارد شدن؛ برگشت به سمت POC (آهنربای قیمت) محتمل‌تره. حد ضرر زیر کف چکش.',
        },
        {
          type: 'fill',
          sentence: 'قیمتی که بیشترین حجم اونجا معامله شده رو ___ می‌گن و اغلب مثل ___ قیمت رو به سمت خودش می‌کشه.',
          answers: ['POC', 'آهنربا'],
          distractors: ['OBV', 'RSI', 'دیوار'],
          explanation: 'POC پرحجم‌ترین سطح قیمته؛ چون بازار اونجا بیشترین توافق رو داشته، قیمت زیاد بهش برمی‌گرده.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'ولوم پروفایل', sub: 'Volume Profile', meaning: 'حجم معامله‌شده در هر سطح قیمت' },
            { term: 'POC', sub: 'Point of Control', meaning: 'پرحجم‌ترین سطح قیمت' },
            { term: 'پروفایل سشن', sub: 'Session Profile', meaning: 'پروفایل یه روز معاملاتی' },
            { term: 'پروفایل بازه‌ی ثابت', sub: 'Fixed Range', meaning: 'پروفایل بازه‌ای که خودت انتخاب می‌کنی' },
          ],
        },
      ],
    },
    {
      id: 'volume-u3-l2',
      title: 'ناحیه‌ی ارزش: VAH و VAL',
      steps: [
        {
          type: 'learn',
          title: 'ناحیه‌ی ارزش (Value Area)',
          body: '**ناحیه‌ی ارزش** محدوده‌ی قیمتیه که حدود **۷۰٪ حجم** اونجا معامله شده؛ از POC شروع می‌کنن و به دو طرف گسترش می‌دن. سقفش **VAH (Value Area High)** و کفش **VAL (Value Area Low)** هست؛ جایی که بازار قیمت رو «منصفانه» دونسته.',
          visual: {
            kind: 'chart',
            chart: {
              candles: EUR_BALANCE,
              volume: EUR_BALANCE_VOL,
              zones: [{ from: 1.082, to: 1.084, tone: 'sky' }],
              lines: [level.line(1.084, 'VAH', 'gold'), level.line(1.0833, 'POC', 'sky'), level.line(1.082, 'VAL', 'gold')],
            },
            symbol: 'ناحیه‌ی ارزش',
          },
        },
        {
          type: 'learn',
          title: 'پذیرش یا رد',
          body: 'وقتی قیمت از ناحیه‌ی ارزش بیرون می‌ره، دو حالت داره: یا **پذیرفته می‌شه** (چند کندل بیرون می‌مونه و حجم می‌گیره؛ احتمال ادامه‌ی حرکت) یا **رد می‌شه** (سریع برمی‌گرده داخل؛ احتمال حرکت به سمت POC و حتی لبه‌ی مقابل).',
        },
        {
          type: 'choice',
          prompt: 'ناحیه‌ی ارزش معمولاً چند درصد حجم رو در بر می‌گیره؟',
          options: ['حدود ۷۰٪', 'حدود ۵۰٪', 'حدود ۹۰٪', 'دقیقاً ۱۰۰٪'],
          answer: 0,
          explanation: 'تعریف رایج ناحیه‌ی ارزش حدود ۷۰٪ حجمه؛ این عدد از ایده‌ی یک انحراف معیار توی مارکت پروفایل اومده.',
        },
        {
          type: 'choice',
          prompt: 'کل حجم یه روز ۱۰٬۰۰۰ قرارداد بوده. ناحیه‌ی ارزش تقریباً چند قرارداد رو پوشش می‌ده؟',
          facts: [{ label: 'کل حجم روز', value: '۱۰٬۰۰۰ قرارداد', tone: 'sky' }],
          options: ['۷٬۰۰۰', '۵٬۰۰۰', '۳٬۰۰۰', '۱۰٬۰۰۰'],
          answer: 0,
          explanation: '۷۰٪ × ۱۰٬۰۰۰ = ۷٬۰۰۰ قرارداد. بقیه‌ی ۳٬۰۰۰ قرارداد بالای VAH و زیر VAL معامله شدن.',
        },
        {
          type: 'predict',
          prompt: 'قیمت ناحیه‌ی ارزش رو رو به بالا شکسته، پولبک کم‌حجم زده و از روی VAH با کندل صعودی برگشته. قدم بعدی؟',
          chart: {
            candles: ETH_VAH_RETEST,
            volume: ETH_VAH_RETEST_VOL,
            zones: [{ from: 3015, to: 3035, tone: 'sky', end: 13 }],
            lines: [level.line(3035, 'VAH', 'gold'), level.line(3023, 'POC', 'sky'), level.line(3015, 'VAL', 'gold')],
            ghost: true,
          },
          symbol: 'ETH/USDT · 1H',
          trend: 'up',
          answer: 'buy',
          explanation: 'قیمت بیرون از ناحیه‌ی ارزش پذیرفته شده و حالا VAH نقش حمایت رو بازی می‌کنه؛ پولبک کم‌حجم و کندل صعودی پرحجم این رو تأیید می‌کنن. حد ضرر برگشت به داخل ناحیه‌ی ارزش (زیر VAH).',
        },
        {
          type: 'predict',
          prompt: 'قیمت سایه‌ش رو بالای VAH زده ولی دوباره داخل ناحیه‌ی ارزش بسته شده. کدوم حرکت محتمل‌تره؟',
          chart: {
            candles: GOLD_VAH_REJECT,
            volume: GOLD_VAH_REJECT_VOL,
            zones: [{ from: 2402, to: 2412, tone: 'sky' }],
            lines: [level.line(2412, 'VAH', 'gold'), level.line(2407, 'POC', 'sky'), level.line(2402, 'VAL', 'gold')],
            ghost: true,
          },
          symbol: 'XAU/USD · 1H',
          answer: 'sell',
          explanation: 'بالای VAH پذیرفته نشد و سریع برگشت داخل؛ یعنی خریدارها اون قیمت‌ها رو گرون دیدن. حرکت به سمت POC محتمل‌تره؛ حد ضرر بالای سقف همین کندل.',
        },
        {
          type: 'learn',
          title: 'قانون ۸۰٪',
          body: 'یه قاعده‌ی معروف مارکت پروفایل: اگه قیمت **بیرون از ناحیه‌ی ارزش** باز بشه یا بره، بعد **برگرده داخلش و اونجا بمونه**، احتمال خوبی هست که کل ناحیه رو تا **لبه‌ی مقابل** طی کنه. اسمش **قانون ۸۰٪**ه، ولی این عدد رو قطعی ندون؛ یه قاعده‌ی تجربیه.',
        },
        {
          type: 'tap',
          prompt: 'قیمت زیر VAL رفته. روی اولین کندلی بزن که دوباره داخل ناحیه‌ی ارزش بسته شد.',
          chart: {
            candles: EUR_REENTRY,
            volume: EUR_REENTRY_VOL,
            zones: [{ from: 1.0844, to: 1.0856, tone: 'sky', end: 11 }],
            lines: [level.line(1.0856, 'VAH', 'gold'), level.line(1.0844, 'VAL', 'gold')],
          },
          symbol: 'EUR/USD · 30M',
          answer: 15,
          explanation: 'بعد از سه کندل زیر VAL، این کندل صعودی پرحجم دوباره بالای VAL بسته شد. طبق ایده‌ی قانون ۸۰٪، قیمت بعدش کل ناحیه رو تا VAH طی کرد.',
        },
        {
          type: 'order',
          prompt: 'مراحل ساختن ناحیه‌ی ارزش رو مرتب کن.',
          items: ['پیدا کردن POC (پرحجم‌ترین ردیف)', 'اضافه کردن ردیف پرحجم‌تر بالا یا پایین', 'تکرار تا رسیدن به حدود ۷۰٪ حجم', 'بالاترین ردیف VAH، پایین‌ترین VAL'],
          explanation: 'ناحیه‌ی ارزش از POC شروع می‌شه و هر بار ردیف پرحجم‌ترِ کناری بهش اضافه می‌شه تا ۷۰٪ حجم پوشش داده بشه.',
        },
      ],
    },
    {
      id: 'volume-u3-l3',
      title: 'گره‌های حجمی HVN و LVN',
      steps: [
        {
          type: 'learn',
          title: 'HVN و LVN',
          body: '**HVN (High Volume Node)** سطح‌هایی با حجم زیادن؛ جایی که بازار مدتی متعادل بوده و قیمت معمولاً اونجا **کند می‌شه**. **LVN (Low Volume Node)** سطح‌های کم‌حجمن؛ قیمت معمولاً ازشون **سریع رد می‌شه** چون اونجا معامله‌ی کمی انجام شده.',
          visual: {
            kind: 'chart',
            chart: {
              candles: EUR_NODES,
              volume: EUR_NODES_VOL,
              zones: [
                { from: 1.086, to: 1.0878, label: 'HVN', tone: 'sky' },
                { from: 1.0815, to: 1.0858, label: 'LVN', tone: 'gold' },
                { from: 1.0793, to: 1.0812, label: 'HVN', tone: 'sky' },
              ],
            },
            symbol: 'گره‌های حجمی',
          },
        },
        {
          type: 'learn',
          title: 'کاربرد HVN و LVN',
          body: 'خیلی از تریدرها **HVN بعدی** رو هدف قیمت می‌ذارن و **LVN** رو مرزی می‌بینن که قیمت یا سریع ازش رد می‌شه یا ازش برمی‌گرده. حد ضرر رو جایی می‌ذارن که اگه قیمت بهش برسه، ایده باطل شده؛ چون ورود قیمت به یه LVN معمولاً یعنی حرکت سریع.',
        },
        {
          type: 'chart',
          prompt: 'قیمت از کدوم ناحیه سریع‌تر و با کندل‌های کمتری رد شد؟ (یعنی LVN کدومه؟)',
          chart: {
            candles: EUR_NODES_DOWN,
            volume: EUR_NODES_VOL,
            zones: [
              { from: 1.0858, to: 1.0877, label: 'الف', tone: 'neutral' },
              { from: 1.0812, to: 1.0855, label: 'ب', tone: 'neutral' },
              { from: 1.0792, to: 1.081, label: 'ج', tone: 'neutral' },
            ],
          },
          symbol: 'EUR/USD · 1H',
          options: [{ label: 'ب؛ ناحیه‌ی وسط' }, { label: 'الف؛ ناحیه‌ی بالا' }, { label: 'ج؛ ناحیه‌ی پایین' }],
          answer: 0,
          explanation: 'قیمت توی «الف» و «ج» کلی کندل گذروند (حجم زیاد، HVN)، ولی «ب» رو فقط با دو کندل بزرگ طی کرد؛ پس اونجا معامله‌ی کمی انجام شده و LVN هست.',
        },
        {
          type: 'tap',
          prompt: 'روی کندلی بزن که کل LVN رو یه‌جا طی کرد.',
          chart: {
            candles: BTC_LVN_JUMP,
            volume: BTC_LVN_JUMP_VOL,
            zones: [
              { from: 61150, to: 61420, label: 'HVN', tone: 'sky' },
              { from: 60300, to: 61100, label: 'LVN', tone: 'gold' },
              { from: 59950, to: 60250, label: 'HVN', tone: 'sky' },
            ],
          },
          symbol: 'BTC/USDT · 1H',
          answer: 8,
          explanation: 'این کندل بزرگ پرحجم در یه حرکت از HVN پایین تا HVN بالا رفت؛ برای همین تقریباً هیچ معامله‌ای وسط راه انجام نشد و LVN شکل گرفت.',
        },
        {
          type: 'truefalse',
          statement: 'قیمت معمولاً از LVN سریع رد می‌شه، چون اونجا معامله‌ی کمی انجام شده.',
          topic: 'LVN',
          answer: true,
          explanation: 'توی LVN سفارش‌های کمی منتظرن؛ پس وقتی قیمت واردش می‌شه، معمولاً سریع به HVN بعدی می‌رسه یا از لبه‌ش برمی‌گرده.',
        },
        {
          type: 'predict',
          prompt: 'قیمت از HVN پایین به داخل LVN شکسته و کندل با حجم بالا بسته شده. HVN بعدی بالای سرشه. کدوم حرکت محتمل‌تره؟',
          chart: {
            candles: GBP_INTO_LVN,
            volume: GBP_INTO_LVN_VOL,
            zones: [
              { from: 1.2782, to: 1.2798, label: 'HVN', tone: 'sky' },
              { from: 1.2738, to: 1.278, label: 'LVN', tone: 'gold' },
              { from: 1.2718, to: 1.2736, label: 'HVN', tone: 'sky' },
            ],
            ghost: true,
          },
          symbol: 'GBP/USD · 1H',
          answer: 'buy',
          explanation: 'ورود پرحجم به LVN یعنی قیمت احتمالاً سریع تا HVN بالایی می‌ره، چون وسط راه معامله‌ی کمی انجام شده. هدف منطقی HVN بالا و حد ضرر برگشت به داخل HVN پایین.',
        },
        {
          type: 'choice',
          prompt: 'اتریوم توی ناحیه‌ی ارزش دیروزه (VAL ۳٬۰۰۰، POC ۳٬۰۴۰، VAH ۳٬۰۸۰). قیمت به VAL رسیده و با یه کندل برگشتی پرحجم رد شده. زیر VAL یه LVN تا ۲٬۹۵۰ هست. برنامه‌ی منطقی؟',
          options: [
            'خرید نزدیک VAL، حد ضرر کمی زیر VAL، هدف اول POC',
            'فروش چون قیمت به VAL رسیده',
            'خرید با حد ضرر وسط LVN و هدف ۲٬۹۵۰',
            'خرید بدون حد ضرر؛ VAL حتماً نگه می‌داره',
          ],
          answer: 0,
          explanation: 'رد شدن از VAL یعنی برگشت به داخل ارزش و حرکت به سمت POC محتمل‌تره. اگه قیمت زیر VAL بره، وارد LVN می‌شه و ممکنه سریع بریزه؛ پس حد ضرر باید نزدیک و زیر VAL باشه.',
        },
        {
          type: 'match',
          pairs: [
            { term: 'HVN', sub: 'High Volume Node', meaning: 'ناحیه‌ی پرحجم؛ قیمت کند می‌شه' },
            { term: 'LVN', sub: 'Low Volume Node', meaning: 'ناحیه‌ی کم‌حجم؛ قیمت سریع رد می‌شه' },
            { term: 'POC', sub: 'Point of Control', meaning: 'پرحجم‌ترین قیمت کل پروفایل' },
            { term: 'ناحیه‌ی ارزش', sub: 'Value Area', meaning: 'محدوده‌ی حدود ۷۰٪ حجم' },
          ],
        },
        {
          type: 'order',
          prompt: 'یه برنامه‌ی ساده با ولوم پروفایل رو مرتب کن.',
          items: ['انتخاب بازه و رسم پروفایل', 'مشخص کردن POC، VAH و VAL', 'پیدا کردن HVN و LVN مهم', 'صبر برای واکنش قیمت توی لبه‌ها', 'ورود با حد ضرر و هدف HVN بعدی'],
          explanation: 'اول نقشه (پروفایل و سطح‌ها)، بعد صبر برای واکنش قیمت و در آخر ورود با ریسک مشخص. ولوم پروفایل می‌گه کجا، رفتار قیمت می‌گه کی.',
        },
      ],
    },
  ],
};
