/** Countries for mobile sign-in: ISO code, dialling code and names. Iran is the default. */
import { isEn } from '@/i18n';

export type Country = { iso: string; dial: string; fa: string; en: string };

export const DEFAULT_COUNTRY = 'IR';

export const COUNTRIES: Country[] = [
  { iso: 'IR', dial: '98', fa: 'ایران', en: 'Iran' }, // i18n-ignore: the en field holds the English
  { iso: 'AF', dial: '93', fa: 'افغانستان', en: 'Afghanistan' }, // i18n-ignore: the en field holds the English
  { iso: 'TJ', dial: '992', fa: 'تاجیکستان', en: 'Tajikistan' }, // i18n-ignore: the en field holds the English
  { iso: 'TR', dial: '90', fa: 'ترکیه', en: 'Turkey' }, // i18n-ignore: the en field holds the English
  { iso: 'AE', dial: '971', fa: 'امارات', en: 'United Arab Emirates' }, // i18n-ignore: the en field holds the English
  { iso: 'IQ', dial: '964', fa: 'عراق', en: 'Iraq' }, // i18n-ignore: the en field holds the English
  { iso: 'DE', dial: '49', fa: 'آلمان', en: 'Germany' }, // i18n-ignore: the en field holds the English
  { iso: 'GB', dial: '44', fa: 'انگلستان', en: 'United Kingdom' }, // i18n-ignore: the en field holds the English
  { iso: 'US', dial: '1', fa: 'آمریکا', en: 'United States' }, // i18n-ignore: the en field holds the English
  { iso: 'CA', dial: '1', fa: 'کانادا', en: 'Canada' }, // i18n-ignore: the en field holds the English
  { iso: 'AL', dial: '355', fa: 'آلبانی', en: 'Albania' }, // i18n-ignore: the en field holds the English
  { iso: 'DZ', dial: '213', fa: 'الجزایر', en: 'Algeria' }, // i18n-ignore: the en field holds the English
  { iso: 'AD', dial: '376', fa: 'آندورا', en: 'Andorra' }, // i18n-ignore: the en field holds the English
  { iso: 'AO', dial: '244', fa: 'آنگولا', en: 'Angola' }, // i18n-ignore: the en field holds the English
  { iso: 'AR', dial: '54', fa: 'آرژانتین', en: 'Argentina' }, // i18n-ignore: the en field holds the English
  { iso: 'AM', dial: '374', fa: 'ارمنستان', en: 'Armenia' }, // i18n-ignore: the en field holds the English
  { iso: 'AU', dial: '61', fa: 'استرالیا', en: 'Australia' }, // i18n-ignore: the en field holds the English
  { iso: 'AT', dial: '43', fa: 'اتریش', en: 'Austria' }, // i18n-ignore: the en field holds the English
  { iso: 'AZ', dial: '994', fa: 'آذربایجان', en: 'Azerbaijan' }, // i18n-ignore: the en field holds the English
  { iso: 'BH', dial: '973', fa: 'بحرین', en: 'Bahrain' }, // i18n-ignore: the en field holds the English
  { iso: 'BD', dial: '880', fa: 'بنگلادش', en: 'Bangladesh' }, // i18n-ignore: the en field holds the English
  { iso: 'BY', dial: '375', fa: 'بلاروس', en: 'Belarus' }, // i18n-ignore: the en field holds the English
  { iso: 'BE', dial: '32', fa: 'بلژیک', en: 'Belgium' }, // i18n-ignore: the en field holds the English
  { iso: 'BO', dial: '591', fa: 'بولیوی', en: 'Bolivia' }, // i18n-ignore: the en field holds the English
  { iso: 'BA', dial: '387', fa: 'بوسنی و هرزگوین', en: 'Bosnia and Herzegovina' }, // i18n-ignore: the en field holds the English
  { iso: 'BR', dial: '55', fa: 'برزیل', en: 'Brazil' }, // i18n-ignore: the en field holds the English
  { iso: 'BG', dial: '359', fa: 'بلغارستان', en: 'Bulgaria' }, // i18n-ignore: the en field holds the English
  { iso: 'KH', dial: '855', fa: 'کامبوج', en: 'Cambodia' }, // i18n-ignore: the en field holds the English
  { iso: 'CM', dial: '237', fa: 'کامرون', en: 'Cameroon' }, // i18n-ignore: the en field holds the English
  { iso: 'CL', dial: '56', fa: 'شیلی', en: 'Chile' }, // i18n-ignore: the en field holds the English
  { iso: 'CN', dial: '86', fa: 'چین', en: 'China' }, // i18n-ignore: the en field holds the English
  { iso: 'CO', dial: '57', fa: 'کلمبیا', en: 'Colombia' }, // i18n-ignore: the en field holds the English
  { iso: 'CR', dial: '506', fa: 'کاستاریکا', en: 'Costa Rica' }, // i18n-ignore: the en field holds the English
  { iso: 'HR', dial: '385', fa: 'کرواسی', en: 'Croatia' }, // i18n-ignore: the en field holds the English
  { iso: 'CU', dial: '53', fa: 'کوبا', en: 'Cuba' }, // i18n-ignore: the en field holds the English
  { iso: 'CY', dial: '357', fa: 'قبرس', en: 'Cyprus' }, // i18n-ignore: the en field holds the English
  { iso: 'CZ', dial: '420', fa: 'چک', en: 'Czechia' }, // i18n-ignore: the en field holds the English
  { iso: 'DK', dial: '45', fa: 'دانمارک', en: 'Denmark' }, // i18n-ignore: the en field holds the English
  { iso: 'DO', dial: '1', fa: 'جمهوری دومینیکن', en: 'Dominican Republic' }, // i18n-ignore: the en field holds the English
  { iso: 'EC', dial: '593', fa: 'اکوادور', en: 'Ecuador' }, // i18n-ignore: the en field holds the English
  { iso: 'EG', dial: '20', fa: 'مصر', en: 'Egypt' }, // i18n-ignore: the en field holds the English
  { iso: 'EE', dial: '372', fa: 'استونی', en: 'Estonia' }, // i18n-ignore: the en field holds the English
  { iso: 'ET', dial: '251', fa: 'اتیوپی', en: 'Ethiopia' }, // i18n-ignore: the en field holds the English
  { iso: 'FI', dial: '358', fa: 'فنلاند', en: 'Finland' }, // i18n-ignore: the en field holds the English
  { iso: 'FR', dial: '33', fa: 'فرانسه', en: 'France' }, // i18n-ignore: the en field holds the English
  { iso: 'GE', dial: '995', fa: 'گرجستان', en: 'Georgia' }, // i18n-ignore: the en field holds the English
  { iso: 'GH', dial: '233', fa: 'غنا', en: 'Ghana' }, // i18n-ignore: the en field holds the English
  { iso: 'GR', dial: '30', fa: 'یونان', en: 'Greece' }, // i18n-ignore: the en field holds the English
  { iso: 'GT', dial: '502', fa: 'گواتمالا', en: 'Guatemala' }, // i18n-ignore: the en field holds the English
  { iso: 'HK', dial: '852', fa: 'هنگ‌کنگ', en: 'Hong Kong' }, // i18n-ignore: the en field holds the English
  { iso: 'HU', dial: '36', fa: 'مجارستان', en: 'Hungary' }, // i18n-ignore: the en field holds the English
  { iso: 'IS', dial: '354', fa: 'ایسلند', en: 'Iceland' }, // i18n-ignore: the en field holds the English
  { iso: 'IN', dial: '91', fa: 'هند', en: 'India' }, // i18n-ignore: the en field holds the English
  { iso: 'ID', dial: '62', fa: 'اندونزی', en: 'Indonesia' }, // i18n-ignore: the en field holds the English
  { iso: 'IE', dial: '353', fa: 'ایرلند', en: 'Ireland' }, // i18n-ignore: the en field holds the English
  { iso: 'IT', dial: '39', fa: 'ایتالیا', en: 'Italy' }, // i18n-ignore: the en field holds the English
  { iso: 'JP', dial: '81', fa: 'ژاپن', en: 'Japan' }, // i18n-ignore: the en field holds the English
  { iso: 'JO', dial: '962', fa: 'اردن', en: 'Jordan' }, // i18n-ignore: the en field holds the English
  { iso: 'KZ', dial: '7', fa: 'قزاقستان', en: 'Kazakhstan' }, // i18n-ignore: the en field holds the English
  { iso: 'KE', dial: '254', fa: 'کنیا', en: 'Kenya' }, // i18n-ignore: the en field holds the English
  { iso: 'KW', dial: '965', fa: 'کویت', en: 'Kuwait' }, // i18n-ignore: the en field holds the English
  { iso: 'KG', dial: '996', fa: 'قرقیزستان', en: 'Kyrgyzstan' }, // i18n-ignore: the en field holds the English
  { iso: 'LV', dial: '371', fa: 'لتونی', en: 'Latvia' }, // i18n-ignore: the en field holds the English
  { iso: 'LB', dial: '961', fa: 'لبنان', en: 'Lebanon' }, // i18n-ignore: the en field holds the English
  { iso: 'LY', dial: '218', fa: 'لیبی', en: 'Libya' }, // i18n-ignore: the en field holds the English
  { iso: 'LT', dial: '370', fa: 'لیتوانی', en: 'Lithuania' }, // i18n-ignore: the en field holds the English
  { iso: 'LU', dial: '352', fa: 'لوکزامبورگ', en: 'Luxembourg' }, // i18n-ignore: the en field holds the English
  { iso: 'MY', dial: '60', fa: 'مالزی', en: 'Malaysia' }, // i18n-ignore: the en field holds the English
  { iso: 'MV', dial: '960', fa: 'مالدیو', en: 'Maldives' }, // i18n-ignore: the en field holds the English
  { iso: 'MT', dial: '356', fa: 'مالت', en: 'Malta' }, // i18n-ignore: the en field holds the English
  { iso: 'MX', dial: '52', fa: 'مکزیک', en: 'Mexico' }, // i18n-ignore: the en field holds the English
  { iso: 'MD', dial: '373', fa: 'مولداوی', en: 'Moldova' }, // i18n-ignore: the en field holds the English
  { iso: 'MC', dial: '377', fa: 'موناکو', en: 'Monaco' }, // i18n-ignore: the en field holds the English
  { iso: 'MN', dial: '976', fa: 'مغولستان', en: 'Mongolia' }, // i18n-ignore: the en field holds the English
  { iso: 'ME', dial: '382', fa: 'مونته‌نگرو', en: 'Montenegro' }, // i18n-ignore: the en field holds the English
  { iso: 'MA', dial: '212', fa: 'مراکش', en: 'Morocco' }, // i18n-ignore: the en field holds the English
  { iso: 'NL', dial: '31', fa: 'هلند', en: 'Netherlands' }, // i18n-ignore: the en field holds the English
  { iso: 'NZ', dial: '64', fa: 'نیوزیلند', en: 'New Zealand' }, // i18n-ignore: the en field holds the English
  { iso: 'NG', dial: '234', fa: 'نیجریه', en: 'Nigeria' }, // i18n-ignore: the en field holds the English
  { iso: 'MK', dial: '389', fa: 'مقدونیه‌ی شمالی', en: 'North Macedonia' }, // i18n-ignore: the en field holds the English
  { iso: 'NO', dial: '47', fa: 'نروژ', en: 'Norway' }, // i18n-ignore: the en field holds the English
  { iso: 'OM', dial: '968', fa: 'عمان', en: 'Oman' }, // i18n-ignore: the en field holds the English
  { iso: 'PK', dial: '92', fa: 'پاکستان', en: 'Pakistan' }, // i18n-ignore: the en field holds the English
  { iso: 'PA', dial: '507', fa: 'پاناما', en: 'Panama' }, // i18n-ignore: the en field holds the English
  { iso: 'PY', dial: '595', fa: 'پاراگوئه', en: 'Paraguay' }, // i18n-ignore: the en field holds the English
  { iso: 'PE', dial: '51', fa: 'پرو', en: 'Peru' }, // i18n-ignore: the en field holds the English
  { iso: 'PH', dial: '63', fa: 'فیلیپین', en: 'Philippines' }, // i18n-ignore: the en field holds the English
  { iso: 'PL', dial: '48', fa: 'لهستان', en: 'Poland' }, // i18n-ignore: the en field holds the English
  { iso: 'PT', dial: '351', fa: 'پرتغال', en: 'Portugal' }, // i18n-ignore: the en field holds the English
  { iso: 'QA', dial: '974', fa: 'قطر', en: 'Qatar' }, // i18n-ignore: the en field holds the English
  { iso: 'RO', dial: '40', fa: 'رومانی', en: 'Romania' }, // i18n-ignore: the en field holds the English
  { iso: 'RU', dial: '7', fa: 'روسیه', en: 'Russia' }, // i18n-ignore: the en field holds the English
  { iso: 'SA', dial: '966', fa: 'عربستان سعودی', en: 'Saudi Arabia' }, // i18n-ignore: the en field holds the English
  { iso: 'RS', dial: '381', fa: 'صربستان', en: 'Serbia' }, // i18n-ignore: the en field holds the English
  { iso: 'SG', dial: '65', fa: 'سنگاپور', en: 'Singapore' }, // i18n-ignore: the en field holds the English
  { iso: 'SK', dial: '421', fa: 'اسلواکی', en: 'Slovakia' }, // i18n-ignore: the en field holds the English
  { iso: 'SI', dial: '386', fa: 'اسلوونی', en: 'Slovenia' }, // i18n-ignore: the en field holds the English
  { iso: 'ZA', dial: '27', fa: 'آفریقای جنوبی', en: 'South Africa' }, // i18n-ignore: the en field holds the English
  { iso: 'KR', dial: '82', fa: 'کره‌ی جنوبی', en: 'South Korea' }, // i18n-ignore: the en field holds the English
  { iso: 'ES', dial: '34', fa: 'اسپانیا', en: 'Spain' }, // i18n-ignore: the en field holds the English
  { iso: 'LK', dial: '94', fa: 'سریلانکا', en: 'Sri Lanka' }, // i18n-ignore: the en field holds the English
  { iso: 'SE', dial: '46', fa: 'سوئد', en: 'Sweden' }, // i18n-ignore: the en field holds the English
  { iso: 'CH', dial: '41', fa: 'سوئیس', en: 'Switzerland' }, // i18n-ignore: the en field holds the English
  { iso: 'SY', dial: '963', fa: 'سوریه', en: 'Syria' }, // i18n-ignore: the en field holds the English
  { iso: 'TW', dial: '886', fa: 'تایوان', en: 'Taiwan' }, // i18n-ignore: the en field holds the English
  { iso: 'TZ', dial: '255', fa: 'تانزانیا', en: 'Tanzania' }, // i18n-ignore: the en field holds the English
  { iso: 'TH', dial: '66', fa: 'تایلند', en: 'Thailand' }, // i18n-ignore: the en field holds the English
  { iso: 'TN', dial: '216', fa: 'تونس', en: 'Tunisia' }, // i18n-ignore: the en field holds the English
  { iso: 'TM', dial: '993', fa: 'ترکمنستان', en: 'Turkmenistan' }, // i18n-ignore: the en field holds the English
  { iso: 'UG', dial: '256', fa: 'اوگاندا', en: 'Uganda' }, // i18n-ignore: the en field holds the English
  { iso: 'UA', dial: '380', fa: 'اوکراین', en: 'Ukraine' }, // i18n-ignore: the en field holds the English
  { iso: 'UY', dial: '598', fa: 'اروگوئه', en: 'Uruguay' }, // i18n-ignore: the en field holds the English
  { iso: 'UZ', dial: '998', fa: 'ازبکستان', en: 'Uzbekistan' }, // i18n-ignore: the en field holds the English
  { iso: 'VE', dial: '58', fa: 'ونزوئلا', en: 'Venezuela' }, // i18n-ignore: the en field holds the English
  { iso: 'VN', dial: '84', fa: 'ویتنام', en: 'Vietnam' }, // i18n-ignore: the en field holds the English
  { iso: 'YE', dial: '967', fa: 'یمن', en: 'Yemen' }, // i18n-ignore: the en field holds the English
];

/** A country's name in the app's language. */
export function countryName(c: Country): string {
  return isEn() ? c.en : c.fa;
}

export function findCountry(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];
}

/** The flag emoji of an ISO code (two regional-indicator letters). */
export function flagOf(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
