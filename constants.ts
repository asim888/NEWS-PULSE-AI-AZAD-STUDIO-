import { Article, Category, Language } from './types';

export const LOGO_URL = 'https://i.postimg.cc/9FT5FFtX/logo.png';
export const BRANDING_ASSET_URL = 'https://i.postimg.cc/JzFKvjvF/assets.png';

export const CATEGORIES: Category[] = [
  { id: 'azad-studio', name: 'Azad Studio', isPremium: false },
  { id: 'hyderabad', name: 'Hyderabad', isPremium: true },
  { id: 'telangana', name: 'Telangana', isPremium: true },
  { id: 'india', name: 'India', isPremium: true },
  { id: 'international', name: 'International', isPremium: true },
  { id: 'sports', name: 'Sports', isPremium: true },
];

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', voiceName: 'en-IN' }, // Changed to Indian English
  { code: 'hi', name: 'Hindi', voiceName: 'hi-IN' },
  { code: 'ur', name: 'Urdu', voiceName: 'ur-IN' }, // Prefer Indian Urdu, fallback handled in service
  { code: 'te', name: 'Telugu', voiceName: 'te-IN' },
  { code: 'ur-ro', name: 'Roman Urdu', voiceName: 'en-IN' }, // Using Indian English voice for Roman script reading
];

// Multi-source RSS Feeds for Redundancy (Constants act as backup to DB)
export const RSS_FEED_URLS: Record<string, string[]> = {
    'azad-studio': [
        'https://rsshub.app/telegram/channel/AzadStudioOfficial',
        'https://t.me/s/AzadStudioOfficial?embed=1&mode=rss' 
    ],
    'hyderabad': [
        'https://www.thehindu.com/news/cities/Hyderabad/feeder/default.rss',
        'https://www.siasat.com/category/hyderabad/feed/',
        'https://telanganatoday.com/category/hyderabad/feed'
    ],
    'telangana': [
        'https://www.thehindu.com/news/telangana/feeder/default.rss',
        'https://telanganatoday.com/feed',
        'https://news.google.com/rss/search?q=Telangana&hl=en-IN&gl=IN&ceid=IN:en'
    ],
    'india': [
        'https://www.ndtv.com/news/national/feeder/default.rss',
        'https://www.thehindu.com/news/national/feeder/default.rss',
        'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'
    ],
    'international': [
        'https://www.ndtv.com/news/international/feeder/default.rss',
        'https://www.theguardian.com/world/rss',
        'https://feeds.bbci.co.uk/news/world/rss.xml'
    ],
    'sports': [
        'https://www.thehindu.com/sport/feeder/default.rss',
        'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'
    ],
    'breaking': [
        'https://www.ndtv.com/india-news/feeder/default.rss',
        'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'
    ]
};

// Static content for Azad Studio (Simulating Telegram Feed)
export const MOCK_ARTICLES: Article[] = [
  {
    id: 'azad-1',
    title: 'Azad Studio Announces New AI Initiative',
    description: 'A deep dive into the latest project from Azad Studio, focusing on generative AI and community engagement.',
    content: 'Azad Studio has officially launched its new AI initiative aimed at revolutionizing content creation. The project, codenamed "Pulse," leverages cutting-edge AI models to deliver personalized news and media. This platform is designed to be highly secure, cost-effective, and require minimal maintenance, reflecting the studio\'s core principles. The founders expressed their excitement, stating this is a significant step towards democratizing information.',
    link: '#',
    source: 'Azad Studio Telegram',
    pubDate: new Date().toISOString(),
    category: 'azad-studio',
    imageUrl: 'https://picsum.photos/seed/ai/800/450',
  },
  {
    id: 'azad-2',
    title: 'Community Drive: Voice for the Voiceless',
    description: 'Azad Studio continues its mission to highlight grassroots issues with a new documentary series.',
    content: 'In our latest effort to bring attention to underrepresented communities, Azad Studio is releasing a series of short documentaries. These stories focus on the daily struggles and triumphs of individuals often overlooked by mainstream media. Join us on our Telegram channel for exclusive behind-the-scenes content.',
    link: '#',
    source: 'Azad Studio Telegram',
    pubDate: new Date(Date.now() - 86400000).toISOString(),
    category: 'azad-studio',
    imageUrl: 'https://picsum.photos/seed/doc/800/450',
  }
];

// Category-Specific Fallbacks (Last Resort if internet is down)
export const CATEGORY_FALLBACKS: Record<string, Article[]> = {
    'hyderabad': [{
        id: 'hyd-fb-1',
        title: 'Hyderabad: The City of Pearls',
        description: 'Explore the rich history and modern developments of Hyderabad. This section will update with live news shortly.',
        content: 'Hyderabad is known for its rich history, food, and multi-lingual culture. We are currently establishing a connection to the live news feed. Please check back in a few moments for real-time updates on traffic, weather, and local events.',
        link: '#',
        source: 'News Pulse AI',
        pubDate: new Date().toISOString(),
        category: 'hyderabad',
        imageUrl: LOGO_URL
    }],
    'telangana': [{
        id: 'ts-fb-1',
        title: 'Telangana State Updates',
        description: 'Latest happenings from across the state of Telangana. Live feed connecting...',
        content: 'Stay tuned for the latest political, social, and economic news from Telangana. Our AI agents are currently scouring multiple sources to bring you the most accurate reporting.',
        link: '#',
        source: 'News Pulse AI',
        pubDate: new Date().toISOString(),
        category: 'telangana',
        imageUrl: LOGO_URL
    }],
    'india': [{
        id: 'ind-fb-1',
        title: 'National News Headlines',
        description: 'Top stories from across India. Connecting to live broadcast...',
        content: 'From Delhi to Kanyakumari, we bring you the stories that matter. We are currently refreshing the feed to ensure you get the latest breaking news.',
        link: '#',
        source: 'News Pulse AI',
        pubDate: new Date().toISOString(),
        category: 'india',
        imageUrl: LOGO_URL
    }],
    'international': [{
        id: 'int-fb-1',
        title: 'Global Affairs & World News',
        description: 'Major events happening around the globe. Live feed refreshing...',
        content: 'Keep up with international relations, global markets, and major world events. Our system is syncing with global news wires.',
        link: '#',
        source: 'News Pulse AI',
        pubDate: new Date().toISOString(),
        category: 'international',
        imageUrl: LOGO_URL
    }],
    'sports': [{
        id: 'spt-fb-1',
        title: 'Sports Action & Scores',
        description: 'Cricket, Football, and more. Loading live scores...',
        content: 'Get the latest match updates, player stats, and tournament news. We are currently fetching the latest scoreboard data.',
        link: '#',
        source: 'News Pulse AI',
        pubDate: new Date().toISOString(),
        category: 'sports',
        imageUrl: LOGO_URL
    }]
};

export const FALLBACK_ARTICLES: Article[] = [
    {
        id: 'fb-1',
        title: 'News Service Refreshing',
        description: 'We are updating the news feed. Please check back in a moment.',
        content: 'The news service is currently updating. This could be due to network conditions. Please browse our featured Azad Studio content while we reconnect.',
        link: '#',
        source: 'System',
        pubDate: new Date().toISOString(),
        category: 'breaking',
        imageUrl: LOGO_URL
    }
];

export const FOUNDER_BIOS = [
  { 
    name: 'Abu Aimal', 
    role: 'Co-Founder & Lead Developer',
    bio: 'Abu Aimal Founder, Azad Studio & Social Activist Abu Aimal is a journalist, founder of Azad Studio, and a committed social activist. Known for his fearless reporting and dedication to grassroots issues, he uses media as a tool for social change, giving voice to the unheard and advocating for justice and equality.', 
    imageUrl: 'https://i.postimg.cc/KvskFffK/Abu_Aimal.jpg' 
  },
  { 
    name: 'Aimal Akram', 
    role: 'Co-Founder & AI Specialist',
    bio: 'Aimal Akram Director & Chief Editor, Azad Studio Aimal Akram is the Director and Chief Editor of Azad Studio. With a sharp editorial vision and strong leadership, he oversees content creation and strategy, ensuring impactful journalism that informs, empowers, and inspires.', 
    imageUrl: 'https://i.postimg.cc/7Z264kfr/Aimal_Akram.jpg' 
  },
  {
    name: 'Azad Studio Team',
    role: 'Strategic Partner',
    bio: 'Committed to delivering unbiased, high-quality journalism to audiences worldwide through innovative technology.',
    imageUrl: 'https://i.postimg.cc/9FT5FFtX/logo.png'
  }
];