# اپ اندروید چارتون: بیلد و انتشار

اپ اندروید از همین کد Expo ساخته می‌شه (همون کدی که نسخه‌ی وب app.chartoon.net رو می‌سازه). پوشه‌ی `android/` توی مخزن نیست و هر بار با `npx expo prebuild` از روی `app.json` ساخته می‌شه (CNG)، پس تنظیمات بومی فقط توی `app.json` و `eas.json` عوض می‌شن.

| چیز | مقدار |
| --- | --- |
| شناسه‌ی پکیج | `net.chartoon.app` (بعد از اولین انتشار دیگه عوض نمی‌شه) |
| نسخه | `1.0.0`، versionCode ۲ (هر بیلدی که به فروشگاه می‌ره باید یکی بیشتر از قبلی باشه؛ توی EAS خودکار بالا می‌ره) |
| اندروید | حداقل ۷ (API 24)، هدف API 36 |
| مجوزها | اینترنت، صدا، لرزش، اعلان (یادآوری تمرین) و راه‌اندازی بعد از روشن شدن گوشی (تا یادآوری‌ها بمونن)؛ میکروفون، حافظه، پوش فایربیس و نشان‌های لانچر عمداً بسته شدن |
| حجم | R8 و حذف منابع بی‌استفاده روشنه (`expo-build-properties`)؛ APK تست فقط arm64 حدود ۲۵ مگابایت |
| لینک‌ها | `chartoon://` و لینک‌های دوئل `https://app.chartoon.net/duel/...` |
| نوار ناوبری | شفاف و هم‌رنگ خود اپ (`expo-navigation-bar` با `enforceContrast: false`)؛ دکمه‌ها و پایین صفحه‌ها با `Screen` بالای نوار می‌مونن و تب‌بار خودش جای نوار رو نگه می‌داره |

## انیمیشن ورود

مثل دولینگو: صفحه‌ی اسپلش خود اندروید شمعک رو وسط صفحه‌ی سرمه‌ای نشون می‌ده و اولین فریم اپ (`src/components/Intro.tsx`) دقیقاً همون تصویره، پس جابه‌جایی دیده نمی‌شه. بعد شمعک یه جهش کوچیک می‌کنه و پایین صفحه قایم می‌شه که فقط سرش پیدا باشه، «چارتون» با کندل‌های صعودی وسط صفحه ظاهر می‌شه و کل صحنه آروم محو می‌شه و اپ باز می‌شه (حدود ۲ ثانیه). همین انیمیشن تا وقتی فونت‌ها و پیشرفت ذخیره‌شده بارگذاری بشن صفحه‌ی بارگذاری هم هست. اگه «کاهش حرکت» گوشی روشن باشه، فقط محو می‌شه.

اسپلش کل مربع ۲۴۰ واحدی لوگو (`assets/splash-icon.png`) رو ۱۸۰dp نشون می‌ده (`imageWidth` افزونه‌ی `expo-splash-screen` توی `app.json`) و `SPLASH_BOX` توی `Intro.tsx` همین عدده؛ اگه یکی عوض شد، اون یکی هم باید عوض بشه.

**لوگو:** «شمعک نو»، شمعک بدون خط دور با سایه‌روشن نرم و هاله‌ی سبز روی سرمه‌ای. منبع برداری‌ش توی `assets/brand/` هست (`logo-icon.svg` آیکون کامل، `logo-mark.svg` خود شمعک با هاله) و همه‌ی PNGها از روی همین دو ساخته شدن: آیکون اپ و لایه‌های آیکون تطبیقی اندروید (شمعک توی دایره‌ی امن ۶۶dp)، آیکون تک‌رنگ (themed)، اسپلش، آیکون اعلان، آیکون‌های PWA و سایت، و آیکون و تصویر شاخص گوگل‌پلی. کامپوننت `LogoMark` همون شمعک رو توی اپ می‌کشه. شمعک داخل درس‌ها (`Mascot`، با حالت‌ها و دست‌ها) شخصیت اپه و جداست.

## بیلد

### روش اصلی: EAS (بیلد ابری Expo)

کلید امضای اپ روی سرور Expo می‌مونه و گم نمی‌شه. یه بار لازمه:

1. یه حساب رایگان توی [expo.dev](https://expo.dev) بساز و از **Account settings → Access tokens** یه توکن بساز.
2. توکن رو به‌عنوان متغیر `EXPO_TOKEN` توی تنظیمات محیط (یا روی سیستم خودت) بذار. توکن رو هیچ‌وقت توی کد یا گفتگو نذار.
3. `npx eas-cli@latest init` (پروژه رو به حساب وصل می‌کنه و `extra.eas.projectId` رو به `app.json` اضافه می‌کنه).

بعد از اون:

```bash
npx eas-cli@latest build -p android --profile preview      # APK برای نصب مستقیم روی گوشی و تست
npx eas-cli@latest build -p android --profile production   # AAB برای گوگل‌پلی (امضاشده با کلید EAS)
npx eas-cli@latest submit -p android --profile production  # فرستادن آخرین AAB به گوگل‌پلی (از انتشار دوم به بعد)
```

آدرس و کلید Publishable پروژه‌ی Supabase توی `eas.json` هستن (هر دو عمومی‌ان و توی نسخه‌ی وب هم دیده می‌شن)، چون بیلد ابری فایل `.env.local` رو نداره. کلید secret یا service_role هیچ‌وقت نباید اون‌جا بره.

برای کافه‌بازار و مایکت که APK امضاشده می‌خوان: از پروفایل preview یه APK با همون کلید EAS بساز، یا کلید رو از `npx eas-cli credentials` دانلود کن و جای امن نگهش دار.

### روش محلی (بدون حساب Expo)

با JDK 21 و Android SDK (پلتفرم 36، build-tools 36، NDK 27.1):

```bash
npx expo prebuild -p android --clean
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a -Pexpo.useLegacyPackaging=true \
  -Pandroid.injected.signing.store.file=/path/to/chartoon-release.keystore \
  -Pandroid.injected.signing.store.password=… -Pandroid.injected.signing.key.alias=chartoon -Pandroid.injected.signing.key.password=…
```

برای گوگل‌پلی به‌جای APK یه AAB بساز (همون پارامترهای امضا؛ ۶۴ و ۳۲ بیتی ARM):

```bash
cd android && ./gradlew bundleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a \
  -Pandroid.injected.signing.store.file=… -Pandroid.injected.signing.store.password=… \
  -Pandroid.injected.signing.key.alias=chartoon -Pandroid.injected.signing.key.password=…
# خروجی: android/app/build/outputs/bundle/release/app-release.aab
```

**کلید امضای چارتون** (`chartoon-release.keystore`، نام مستعار `chartoon`، RSA 4096، معتبر تا ۲۰۵۴) از ۲۴ سپتامبر ۲۰۲۶ ساخته شده و
همه‌ی APKها (کافه‌بازار، مایکت، نصب مستقیم) باید با همین امضا بشن؛ نسخه‌ای با کلید دیگه روی نسخه‌ی قبلی نصب نمی‌شه. فایل و رمزش
فقط پیش صاحب اپه: دو نسخه‌ی پشتیبان جدا نگه دار و هیچ‌وقت توی مخزن نذار (`*.jks` و `*.keystore` توی `.gitignore` هستن). برای
گوگل‌پلی همین کلید «کلید آپلود» می‌شه و Play App Signing کلید امضای نهایی رو خودش نگه می‌داره.

اثر انگشت SHA-256 این کلید (عمومیه و مشکلی نداره دیده بشه):
`4D:39:BB:D8:23:88:EF:5B:B3:F9:A3:3D:CE:EE:4A:01:26:B7:A5:84:57:BE:47:1C:71:DA:85:58:3C:1C:82:B5`

بدون پارامترهای `injected.signing` بیلد با کلید دیباگ عمومی امضا می‌شه: Play Protect هشدار «App scan recommended» می‌ده و گوگل‌پلی
قبولش نمی‌کنه؛ فقط برای تست خیلی سریع.

اگه Gradle موقع دانلود از Maven Central خطای 429 داد، یه آینه‌ی Maven Central (مثلاً `maven-central.storage-download.googleapis.com/maven2`) رو اول فهرست مخزن‌ها بذار.

## انتشار در گوگل‌پلی

فایل‌های آماده توی `store/android/`:

| فایل | کاربرد | اندازه |
| --- | --- | --- |
| `icon-512.png` | آیکون فروشگاه | ۵۱۲×۵۱۲ |
| `feature-graphic.png` | تصویر شاخص بالای صفحه | ۱۰۲۴×۵۰۰ |
| `screenshots/1-lesson.png` تا `6-league.png` | اسکرین‌شات گوشی با توضیح فارسی | ۱۰۸۰×۱۹۲۰ |

### قدم‌ها

1. **حساب توسعه‌دهنده:** play.google.com/console (۲۵ دلار یک‌بار). گوگل از ایران حساب قبول نمی‌کنه؛ حساب باید مال یه شخص یا شرکت توی یه کشور پشتیبانی‌شده باشه، با احراز هویت واقعی.
2. **تست بسته:** حساب‌های شخصی جدید باید قبل از انتشار عمومی، اپ رو حداقل ۱۴ روز با حداقل ۱۲ تستر توی Closed testing نگه دارن (قانون فعلی گوگل؛ قبل از شروع توی کنسول چک کن).
3. **ساخت اپ:** اسم، زبان پیش‌فرض فارسی، نوع App، رایگان.
4. **اولین AAB رو دستی آپلود کن** (Testing → Internal testing). Play App Signing رو قبول کن.
5. **لینک‌های دوئل:** `public/.well-known/assetlinks.json` از قبل اثر انگشت کلید چارتون رو داره (برای APKهای نصب مستقیم و فروشگاه‌های ایرانی). بعد از آپلود توی گوگل‌پلی، از **Setup → App signing** اثر انگشت SHA-256 کلید امضای گوگل رو هم به همون فهرست `sha256_cert_fingerprints` اضافه کن و نسخه‌ی وب رو دوباره منتشر کن. تا نسخه‌ی وب منتشر نشه، لینک‌های دوئل توی مرورگر باز می‌شن (و باز هم کار می‌کنن). شکل فایل:

   ```json
   [{ "relation": ["delegate_permission/common.handle_all_urls"],
      "target": { "namespace": "android_app", "package_name": "net.chartoon.app",
                  "sha256_cert_fingerprints": ["<SHA-256 از کنسول>"] } }]
   ```

6. فرم‌های پایین رو پر کن، صفحه‌ی فروشگاه رو بساز و نسخه رو برای بررسی بفرست.

### متن صفحه‌ی فروشگاه

**اسم (حداکثر ۳۰ حرف):** چارتون: آموزش ترید به سبک بازی

**توضیح کوتاه (حداکثر ۸۰ حرف):** ترید، فارکس و کریپتو رو مثل یه بازی یاد بگیر؛ با درس‌های ۵ دقیقه‌ای و شبیه‌ساز

**توضیح کامل:**

> چارتون ترید رو مثل یه بازی یادت می‌ده: هر روز چند دقیقه، درس‌های کوتاه، امتیاز و جایزه، و شمعک که همه‌جا همراهته.
>
> 📚 ۸ دوره و ۲۷۹ درس کوتاه: از «بازار چیه» تا نمودار شمعی، روند، حمایت و مقاومت، اندیکاتورها، الگوها، فیبوناچی، پرایس اکشن، اسمارت مانی، مدیریت ریسک و روانشناسی ترید، برای فارکس، طلا و کریپتو.
>
> 🎯 سؤال‌های تعاملی: روی کندل درست بزن، خط حمایت رو بکش، حد ضرر رو روی نمودار بذار، ادامه‌ی نمودار رو پیش‌بینی کن.
>
> 📈 شبیه‌ساز معامله با قیمت زنده: نمودار بزرگ مثل متاتریدر با تایم‌فریم‌های مختلف، ۴۲ ابزار رسم، سفارش مارکت و لیمیت و استاپ، حد ضرر و حد سود، ژورنال و آمار عملکرد، و مربی‌ای که اشتباه‌های معاملاتیت رو نشونت می‌ده. همه با پول مجازی.
>
> ⚔️ دوئل چارتون: سه راند سؤال سرعتی، پیش‌بینی نمودار واقعی و معامله‌ی ۶۰ ثانیه‌ای، با شمعک یا با دوستات.
>
> 🔥 روزهای پیاپی، هدف روزانه، مأموریت‌ها، صندوق جایزه و لیگ هفتگی که هر روز برت می‌گردونن.
>
> 💬 گروه‌های گفتگو برای اشتراک تحلیل، و دستیار هوش مصنوعی شمعک برای جواب سؤال‌هات.
>
> چارتون فقط آموزشیه: توصیه‌ی سرمایه‌گذاری یا سیگنال نمی‌ده، کارگزار نیست و هیچ پول واقعی‌ای در کار نیست. معامله در بازار واقعی ریسک بالایی داره.

**English (en-US):**

- Title: Chartoon: Learn Trading
- Short description: Learn trading like a game: 5-minute lessons, live charts and paper trading.
- Full description: Chartoon teaches trading the way Duolingo teaches languages: bite-sized lessons, streaks, XP and a friendly candlestick mascot. 8 courses and 279 lessons on forex, gold and crypto, from candlesticks and trends to indicators, patterns, Fibonacci, price action, risk management and trading psychology. Practise in a paper-trading simulator with live prices, 42 drawing tools and a trade journal, duel friends, and climb the weekly league. Education only: no investment advice, not a broker, no real money.

**دسته:** Education · **ایمیل تماس:** (لازمه؛ هنوز مشخص نشده) · **وب‌سایت:** https://chartoon.net · **سیاست حریم خصوصی:** https://chartoon.net/privacy/

### جواب فرم‌های کنسول

- **Data safety:**
  - جمع‌آوری: *Personal info → Email address، Phone number، Name و User IDs* (برای حساب کاربری؛ ایمیل یا شماره، اختیاری چون حالت مهمان هست؛ آیدی و پیشرفت آموزشی توی پروفایل عمومی برای بقیه دیده می‌شه)؛ *Messages → Other in-app messages* (پیام گروه‌ها)؛ *App activity → Other user-generated content و App interactions* (پیشرفت، معامله‌های شبیه‌ساز، دوئل‌ها). هدف همه: App functionality و Account management.
  - اشتراک با شخص ثالث: خیر (سرویس‌های Supabase، Vercel و هوش مصنوعی از طرف ما پردازش می‌کنن و طبق تعریف گوگل «اشتراک» حساب نمی‌شن).
  - رمزگذاری در انتقال: بله (HTTPS). درخواست حذف: بله؛ از داخل اپ و از https://chartoon.net/delete-account/
  - موقعیت، مخاطبین، عکس، اطلاعات مالی، شناسه‌ی دستگاه و گزارش کرش: جمع نمی‌شن.
  - مدت نگه‌داری پشتیبان‌ها رو از تنظیمات پروژه‌ی Supabase چک کن و اگه لازم شد متن صفحه‌ی حذف حساب رو دقیق‌تر کن.
- **Account deletion URL:** https://chartoon.net/delete-account/
- **App access:** همه‌ی بخش‌ها بدون ورود باز هستن. گفتگو، دوئل با دوست و لیگ واقعی حساب می‌خوان که داخل خود اپ با ایمیل (یا شماره موبایل ایران) و رمز، بدون کد تأیید، ساخته می‌شه؛ برای بررسی‌کننده حساب جدا لازم نیست.
- **Ads:** No ads.
- **Content rating (IARC):** دسته‌ی Reference/Education؛ خشونت، محتوای جنسی، الفاظ رکیک و مواد: نه؛ قمار واقعی یا شبیه‌سازی‌شده: نه (شبیه‌ساز معامله با پول مجازیه و جایزه‌ی پولی نداره)؛ تعامل کاربرها: بله (گروه‌های گفتگو)؛ خرید دیجیتال: نه.
- **Target audience:** ۱۸ سال به بالا (محتوای مالی؛ این‌طوری سیاست‌های Families هم شامل اپ نمی‌شه).
- **Financial features:** اپ خدمات مالی ارائه نمی‌ده (فقط آموزش و شبیه‌ساز با پول مجازی).
- **News / Government / Health apps:** خیر.

## کافه‌بازار و مایکت

برای این دو فروشگاه APK یونیورسال بساز (همون فرمان بیلد محلی با `-PreactNativeArchitectures=arm64-v8a,armeabi-v7a`؛ حدود ۳۱ مگابایت) تا روی گوشی‌های ۳۲ بیتی قدیمی هم نصب بشه. x86 فقط برای شبیه‌سازهاست و لازم نیست.

هر دو APK امضاشده‌ی خود توسعه‌دهنده رو می‌گیرن و امضا رو عوض نمی‌کنن، پس همه‌ی نسخه‌ها باید با یه کلید امضا بشن. ثبت‌نام توسعه‌دهنده با کارت ملی و حساب بانکی ایرانی انجام می‌شه. همون متن‌ها و تصویرها به کار میان (کافه‌بازار اسکرین‌شات عمودی می‌خواد).
