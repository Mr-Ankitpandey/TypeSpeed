export const publicPages = {
  '/': {
    title: 'Free Typing Speed Test & Practice | TypeSpeed',
    description:
      'Test your typing speed in 15, 30, 60 or 120 seconds. Practice English words, measure WPM and accuracy, and track progress without an account.',
    heading: 'Free typing speed test',
    sections: [],
  },
  '/multiplayer': {
    title: 'Private Multiplayer Typing Races | TypeSpeed',
    description:
      'Create a private typing race for 2–8 friends. Approve guests, race the same passage, and compare server-verified WPM and accuracy.',
    heading: 'Private multiplayer typing races',
    sections: [],
  },
  '/learn': {
    title: 'Typing Practice Guides: Speed, Accuracy & WPM | TypeSpeed',
    description:
      'Learn how typing speed is measured, how corrections affect accuracy, and how to build a consistent touch-typing practice routine.',
    heading: 'Build better typing habits',
    sections: [
      [
        'Start with a repeatable test',
        'Choose a duration you can repeat consistently. Keep your posture comfortable and use the same content mode when comparing sessions. A single score reflects one passage; trends across several sessions tell you more.',
      ],
      [
        'Accuracy before speed',
        'Aim for controlled, correct keystrokes before increasing pace. Review the letters that cause repeated mistakes and practice them slowly. Correcting errors is useful, but those original attempts still affect accuracy.',
      ],
      [
        'Practice in short sessions',
        'Use a few focused tests, pause when your hands feel tense, and compare your recent results. Consistency matters more than rushing through a long session. Stop if typing causes discomfort.',
      ],
    ],
  },
  '/learn/typing-speed': {
    title: 'How to Calculate Typing WPM and Raw WPM | TypeSpeed',
    description:
      'Understand words per minute, raw typing speed, retained characters, and fixed-duration scoring with a clear worked example.',
    heading: 'How typing speed is measured',
    sections: [
      [
        'What does WPM mean?',
        'A standard typing word is five characters, including spaces. TypeSpeed validated WPM divides correctly retained characters by five and then by the official test duration in minutes.',
      ],
      [
        'A worked example',
        'If 250 correctly retained characters remain after a 60-second test, validated WPM is 250 ÷ 5 ÷ 1 = 50. If you made 275 printable attempts, raw WPM is 55. These two measurements show the difference between output and effort.',
      ],
      [
        'Compare like with like',
        'A short easy-word test and a long punctuation-heavy test are different tasks. Compare tests with similar durations, languages and content. TypeSpeed uses full-precision results for race ranking and rounds only the displayed values.',
      ],
    ],
  },
  '/learn/accuracy': {
    title: 'Improve Typing Accuracy & Understand Corrections | TypeSpeed',
    description:
      'Learn how typing accuracy is calculated, why corrected mistakes still count, and how targeted practice can help reduce repeated errors.',
    heading: 'Practice accuracy with intention',
    sections: [
      [
        'Attempts and corrections',
        'Accuracy is correct printable attempts divided by all printable attempts. If you mistype one character, delete it, then type nine correct characters, accuracy is 90%. Backspace is counted separately.',
      ],
      [
        'Find a sustainable pace',
        'Slow down when mistakes cluster. Focus on a short group of difficult letters, then return to ordinary words. Keep your wrists comfortable and take breaks rather than forcing speed.',
      ],
      [
        'Race qualification',
        'TypeSpeed requires at least 95% accuracy to qualify for winning. Eligible players rank by validated WPM, then accuracy and fewer incorrect attempts. A room can finish with no qualifying winner.',
      ],
    ],
  },
  '/about': {
    title: 'About TypeSpeed — By Ankit Pandey',
    description:
      'TypeSpeed is a free, open-source typing platform created by Ankit Pandey, with browser-local practice and private guest multiplayer races.',
    heading: 'Typing practice, built to be accessible',
    sections: [
      [
        'Created by Ankit Pandey',
        'TypeSpeed combines focused solo practice with private races for friends. It is open source under the MIT License and runs locally without a database, paid API or mandatory registration.',
      ],
      [
        'A transparent approach',
        'Solo history stays in your browser. Multiplayer scores are calculated by the server from accepted typing operations. The scoring rules and source code are public, and the application does not promise perfect bot prevention.',
      ],
    ],
  },
  '/privacy': {
    title: 'Privacy & Local Data | TypeSpeed',
    description:
      'Understand what TypeSpeed stores in your browser, what private race data reaches the server, and how to remove your local practice history.',
    heading: 'Your typing data and privacy',
    sections: [
      [
        'Browser-local practice',
        'Practice results, preferences and locally saved training data stay in your browser. Clearing site data removes them. There is no cross-device synchronization or account database.',
      ],
      [
        'Private races',
        'The server receives your display name, typing operations and temporary session identity to run races. Rooms and race state are held in memory and disappear when the backend restarts or expires them. Server or hosting infrastructure may retain operational request logs, including connection addresses.',
      ],
      [
        'No third-party tracking in the application',
        'TypeSpeed does not include advertising, third-party analytics or remote font services. A public hosting provider may process requests under its own policies. Never put passwords or sensitive documents into custom practice content.',
      ],
      [
        'Remove your data',
        'Use Clear history on the progress screen to remove saved test summaries. Clearing this site’s browser data removes all local settings, history and recordings. Leaving a multiplayer room revokes your active membership.',
      ],
    ],
  },
} as const;
export type PublicPath = keyof typeof publicPages;
export function siteOrigin(value: string | undefined) {
  if (!value) return '';
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.hostname === 'localhost' ||
    /^127\./.test(url.hostname)
  )
    throw new Error(
      'SITE_URL must be your assigned public HTTPS origin, without a path.',
    );
  return url.origin;
}
export function configuredOrigin(env: Record<string, string | undefined>) {
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') return '';
  return siteOrigin(
    env.SITE_URL ||
      (env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined),
  );
}
export function pageMeta(path: string) {
  const page = publicPages[path as PublicPath];
  return page
    ? { ...page, index: true }
    : {
        title: 'Your Private Workspace | TypeSpeed',
        description:
          'Private room, local results and personal settings for TypeSpeed.',
        heading: 'TypeSpeed',
        sections: [],
        index: false,
      };
}
export function structuredData(path: string, origin: string) {
  if (!origin || !publicPages[path as PublicPath]) return null;
  const page = publicPages[path as PublicPath];
  const author = {
    '@type': 'Person',
    name: 'Ankit Pandey',
    url: 'https://github.com/Mr-Ankitpandey',
  };
  const base = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: origin + path,
    author,
    inLanguage: 'en',
  };
  if (path === '/')
    return {
      ...base,
      '@type': 'WebApplication',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    };
  return base;
}
