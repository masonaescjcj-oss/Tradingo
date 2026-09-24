/**
 * English versions of Chartoon's privacy policy, terms of use and account deletion guide.
 * Keep them in step with the Persian originals in ./legal (same sections, same facts), and
 * update `LEGAL_UPDATED_EN` together with `LEGAL_UPDATED`.
 */
import type { ACCOUNT_DELETION, LEGAL, LegalDoc } from './legal';

export const LEGAL_UPDATED_EN = 'September 24, 2026';

const privacy: LegalDoc = {
  id: 'privacy',
  title: 'Privacy Policy',
  summary: 'What we keep, who can see it and how to delete it',
  intro:
    "Chartoon is built to teach trading, and it only keeps the information the app needs to work. We don't sell your information to anyone, we don't show ads, and we don't use ad-tracking tools.",
  sections: [
    {
      title: 'Without an account',
      body: [
        'Your lesson progress, settings, simulator trades, chart drawings, duels with Shamak and chats with the assistant are stored only in your own browser or phone and never reach our servers. Clearing your browser data or deleting the app erases them too.',
      ],
    },
    {
      title: 'With an account',
      body: [
        'When you create an account, we keep the email address or mobile number you sign up with, the name you choose and your password. Your password is stored only in hashed form (bcrypt); the password itself is never kept.',
        'So that your progress is the same on all your devices, your app data (XP, completed lessons, streaks, coins, quests, simulator trades and settings) is stored on our server. Your weekly XP is also kept for the league.',
        "The messages and analyses you send in groups, and the duels you play with friends (rounds, scores and both players' names), are also stored on our server.",
      ],
    },
    {
      title: 'What other users can see',
      body: [
        'Your name and weekly XP in the league table; your name, ID, profile picture and the messages and analyses you send in chat groups, to the members of that group; and your name and duel scores, to the friend who plays your duel.',
        "You can block anyone you like so that their messages aren't shown to you in groups; they won't know. Your block list is visible only to you.",
        'Public profile: by tapping your name in chats, others can see your name, ID, profile picture, the month you joined and your learning progress (XP, streaks, league, lessons and courses, and duel wins). Your simulator trades, balance and email address or phone number are not on your profile.',
        "Your email address and mobile number are never shown to other users. Only Chartoon admins can see an account's name, email address or phone number and group messages, and only to handle reports and violations. Their actions are recorded in the admin log.",
      ],
    },
    {
      title: 'AI assistant',
      body: [
        "Messages you send to Shamak (the assistant) are sent to an AI service to get a reply, together with a summary of your progress (such as the lessons you've completed and your simulator stats). The chat text is not stored on our server and stays only on your device; we only keep a count of your daily messages to apply the usage limit.",
        "If you report one of Shamak's replies, only that reply, the question before it, the reason you picked and your comment are sent, together with your account, to Chartoon admins for review.",
        "Don't share sensitive personal or financial information (such as passwords or card numbers) with the assistant.",
      ],
    },
    {
      title: 'Problem reports',
      body: [
        "When you report a lesson step, we store the lesson and step IDs, the reason you picked, the comment you wrote and the app version. If you're signed in, the report is linked to your account.",
      ],
    },
    {
      title: 'Services we use',
      body: [
        "Supabase for the database and server, and Vercel for hosting the website and the web version. The app's requests to our server and to Binance also pass through app.chartoon.net on Vercel so that they can be reached from every network; this route doesn't store anything.",
        'Binance for live prices: when you open "Live prices" or a duel, prices are fetched from Binance\'s public servers, usually through that same Vercel route, so Binance doesn\'t see your IP address. Only if that route is unavailable does your device connect to Binance directly. No account information is ever sent to Binance.',
        'An AI service, only when you use the assistant.',
        'Under their own policies, these services may keep technical logs, such as IP addresses and request times, for security and troubleshooting.',
      ],
    },
    {
      title: 'Keeping and deleting your data',
      body: [
        'Account information is kept for as long as your account exists. Duels older than 90 days are deleted automatically.',
        'You can delete your account at any time from "Profile → Account → Delete account" (full guide, even without the app: chartoon.net/delete-account). This deletes your account, the progress saved on our server, your league points, your messages in groups, the duels you created and the progress on that device. In duels you played with a friend, the result stays for them but your name is removed. Problem reports are kept without your name.',
      ],
    },
    {
      title: 'Security',
      body: [
        "The app's connection to our server is encrypted (HTTPS), passwords are stored hashed, and after several wrong password attempts, sign-in is temporarily locked. No system is 100% secure, so don't reuse a password from another service for Chartoon.",
      ],
    },
    {
      title: 'Users under 18',
      body: [
        "There's no real money in Chartoon, but if you're under 18, use it with your parents' permission and involvement. Trading with real money is for adults only.",
      ],
    },
    {
      title: 'Changes and contact',
      body: [
        "If this policy changes, the date at the top of the page will change, and we'll let you know about important changes in the app.",
        'To delete your data, use "Delete account" in the app. For any other questions, write to us using the "Report a problem" flag at the top of any lesson page.',
      ],
    },
  ],
};

const terms: LegalDoc = {
  id: 'terms',
  title: 'Terms of Use',
  summary: 'The rules for using Chartoon, groups and duels',
  intro:
    "By using Chartoon (the app, the web version and the chartoon.net website), you agree to these terms. We've kept them short and simple; please read them in full.",
  sections: [
    {
      title: 'Education only, not financial advice',
      body: [
        "None of the lessons, examples, charts, the simulator, the AI assistant's replies, or users' messages in groups or duels are investment advice or buy or sell signals.",
        'Chartoon is not a broker, an exchange or a financial advisor. Your financial decisions and their results are your own responsibility.',
      ],
    },
    {
      title: 'Real market risk',
      body: [
        "Trading forex, gold, crypto and leveraged contracts is high risk, and you could lose all of your capital. Only trade with money you can afford to lose without it turning your life upside down.",
        "Good results in the simulator don't guarantee good results in the real market. Simulator prices may differ from brokers' prices or arrive with a delay.",
      ],
    },
    {
      title: 'Virtual money and rewards',
      body: [
        "Simulator dollars, coins, XP, chests and other in-app rewards have no monetary value and can't be exchanged for money, sold or transferred to anyone else.",
      ],
    },
    {
      title: 'Your account',
      body: [
        "Enter accurate information and keep your password safe. Each account belongs to one person, and you're responsible for everything done with your account.",
      ],
    },
    {
      title: 'Behavior in groups and duels',
      body: [
        'Not allowed: advertising, selling signals or courses, scams and promises of guaranteed profit, asking others for money or personal information, insults and harassment, indecent or illegal content, spam, and cheating in leagues and duels.',
        'Reported messages may be hidden. Admins can delete messages that break these rules, stop you from sending messages temporarily or permanently, and suspend your account.',
      ],
    },
    {
      title: 'Content and ownership',
      body: [
        "The lessons, the app's design, the Shamak character and the Chartoon name and logo belong to Chartoon. Copying them or using them commercially without permission is prohibited.",
        "What you send in groups remains yours. By sending it, you allow us to store it and show it to that group's members.",
      ],
    },
    {
      title: 'Accuracy and availability',
      body: [
        'We try to keep the content accurate and up to date, but it may contain errors or become outdated over time (for example, session hours or broker rules). If you spot an error, let us know with "Report a problem".',
        'The service may sometimes be unavailable or may change. Some features may become part of a premium subscription in the future; any payment will always be made with your knowledge and by your own choice.',
      ],
    },
    {
      title: 'Limitation of liability',
      body: [
        "To the extent permitted by law, Chartoon is not responsible for any profit or loss arising from users' financial decisions, errors in the content or interruptions to the service.",
      ],
    },
    {
      title: 'Ending your use and changes to these terms',
      body: [
        'You can delete your account at any time from "Profile → Account → Delete account". We may also restrict or delete accounts that break these terms.',
        "If these terms change, the date at the top of the page will change, and we'll let you know about important changes in the app. If you keep using Chartoon, you accept the new terms.",
      ],
    },
  ],
};

export const LEGAL_EN: typeof LEGAL = { privacy, terms };

/** The account deletion guide at chartoon.net/delete-account, in English. */
export const ACCOUNT_DELETION_EN: typeof ACCOUNT_DELETION = {
  id: 'delete-account',
  title: 'Delete Your Account',
  intro:
    "You can delete your Chartoon account and its data yourself at any time, from the Android app or from the web version, even without installing the app. Deletion happens immediately and can't be undone.",
  sections: [
    {
      title: 'In the app',
      body: ['Open the Chartoon app and go to "Profile → Account".', 'Tap "Delete account", enter your password and confirm.'],
    },
    {
      title: 'Without the app, in a browser',
      body: [
        'Open app.chartoon.net in your browser and sign in with your email address or mobile number and your password.',
        'Then follow the same path: "Profile → Account → Delete account".',
      ],
    },
    {
      title: 'What gets deleted',
      body: [
        'Your account (email address or mobile number, name, ID, profile picture and password hash) and all its active sign-ins on other devices.',
        'Progress saved on our server: XP, lessons, streaks, coins, quests, simulator trades and settings.',
        'League points, group memberships, all the messages and analyses you sent in groups, the duels you created and your AI assistant usage stats.',
        'Progress saved on the device you use to delete the account.',
      ],
    },
    {
      title: 'What stays',
      body: [
        'In duels you played with a friend, the result stays for your friend, but your name is changed to "Deleted account".',
        'Reports you sent about lesson errors are kept to fix the content, with no link to your account.',
        "Automatic database backups kept by our server provider (Supabase) are deleted automatically after a few days, on that provider's schedule.",
      ],
    },
    {
      title: 'Without an account',
      body: [
        "If you used Chartoon without an account (as a guest), there's nothing on our servers. Everything is on your own phone or browser, and it's erased when you delete the app or clear the app's or browser's data.",
      ],
    },
    {
      title: "If you can't access your account",
      body: [
        "If you don't remember your password, email the support address listed on Chartoon's app store page and include your account's email address or mobile number. Once we've confirmed that the account is yours, the account and its data will be deleted.",
      ],
    },
  ],
  /** For store reviewers; the same summary as in ACCOUNT_DELETION. */
  english: [
    'Delete your Chartoon account: in the Android app or at app.chartoon.net, sign in and open Profile → Account → Delete account, then confirm with your password. Deletion is immediate and permanent.',
    'Deleted: your account (email or mobile number, name, @ID, profile picture, password hash) and sessions; progress saved on the server (XP, lessons, streaks, coins, quests, simulator trades, settings); league points, group memberships and all your chat messages; duels you created; AI assistant usage counts; and progress on the device you delete from.',
    'Kept: in duels you played against a friend, the friend keeps the result with your name replaced by "deleted account"; lesson problem reports are kept without any link to you; automatic database backups kept by our server provider (Supabase) expire on its schedule after a few days.',
    "Guest users (no account) have no data on our servers. If you cannot sign in, write to the support email on our store page with your account's email or mobile number.",
  ],
};
