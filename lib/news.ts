export type NewsCategory = 'india' | 'world' | 'technology' | 'finance' | 'climate';

export type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceCountry: string;
  url: string;
  image: string;
  category: NewsCategory | 'blog';
  publishedAt: string;
  readTime: number;
  fallback?: boolean;
};

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  india: 'India',
  world: 'World',
  technology: 'Technology',
  finance: 'Finance',
  climate: 'Climate',
};

const CATEGORY_QUERIES: Record<NewsCategory, string> = {
  india: 'sourcecountry:india sourcelang:english',
  world: '(world OR global OR international) sourcelang:english',
  technology: '("artificial intelligence" OR "machine learning" OR software OR cybersecurity OR semiconductor) sourcelang:english',
  finance: '(finance OR banking OR markets OR stocks OR investment) sourcelang:english',
  climate: '("climate change" OR weather OR environment) sourcelang:english',
};

const FALLBACK_IMAGES = [
  'https://images.moneycontrol.com/static-mcnews/2023/02/coal-bbo.jpg',
  'https://img.etimg.com/thumb/msid-133697790,width-1200,height-630,imgsize-2419923,overlay-etmarkets/articleshow.jpg',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
];

const FALLBACK_COPY: Record<NewsCategory, string[]> = {
  india: [
    'India’s cities rethink growth through mobility, housing and public infrastructure',
    'The next digital chapter is being written beyond India’s largest metros',
    'A new generation of builders is reshaping India’s technology landscape',
  ],
  world: [
    'Global markets recalibrate as energy and technology signals shift',
    'Across borders, a new era of cooperation is meeting hard economic choices',
    'The world in motion: five developments shaping the week ahead',
  ],
  technology: [
    'AI moves from the laboratory into everyday products and public systems',
    'The race to build useful, responsible intelligence enters its next phase',
    'Small teams are building the next generation of global software',
  ],
  finance: [
    'Markets look past the noise to find the financial signals that matter',
    'Banking, investment and technology converge in a changing finance landscape',
    'How investors are balancing resilience with the search for growth',
  ],
  climate: [
    'Cities adapt as climate resilience becomes an everyday design challenge',
    'A cleaner energy future depends on the systems built today',
    'Weather extremes are changing how communities plan and prepare',
  ],
};

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result.toString(36);
}

function cleanTitle(title: string) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/\s[-–—|]\s[^-–—|]{2,35}$/, '')
    .replace(/[–—]/g, '-')
    .trim();
}

function parseGdeltDate(value?: string) {
  if (!value || !/^\d{8}T\d{6}Z?$/.test(value)) return new Date().toISOString();
  return new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`,
  ).toISOString();
}

function sourceName(domain: string) {
  return domain
    .replace(/^www\./, '')
    .split('.')[0]
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function fallbackNews(category: NewsCategory): NewsArticle[] {
  return FALLBACK_COPY[category].map((title, index) => ({
    id: `desk-${category}-${index}`,
    title,
    summary:
      'A Newsgrid editor’s preview. Refresh the live wire for the latest reporting from trusted publishers around the world.',
    source: 'Newsgrid desk',
    sourceCountry: category === 'india' ? 'India' : 'Global',
    url: '',
    image: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    category,
    publishedAt: new Date(Date.now() - index * 3_600_000).toISOString(),
    readTime: 3 + index,
    fallback: true,
  }));
}

export const BLOG_POSTS: NewsArticle[] = [
  {
    id: 'blog-signal-noise',
    title: 'The signal beneath the scroll',
    summary: 'Why a slower, more deliberate news habit can make a fast-moving world easier to understand.',
    source: 'Newsgrid analysis',
    sourceCountry: 'Editorial',
    url: '',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=80',
    category: 'blog',
    publishedAt: new Date().toISOString(),
    readTime: 6,
  },
  {
    id: 'blog-india-builders',
    title: 'Meet the builders designing for the next billion',
    summary: 'An editorial field note on products, public systems and the talent transforming modern India.',
    source: 'Newsgrid field notes',
    sourceCountry: 'India',
    url: '',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1400&q=80',
    category: 'blog',
    publishedAt: new Date(Date.now() - 86_400_000).toISOString(),
    readTime: 8,
  },
  {
    id: 'blog-climate-cities',
    title: 'The climate story is now a city story',
    summary: 'From shade to water to mobility, adaptation is becoming visible in the texture of everyday life.',
    source: 'Newsgrid perspectives',
    sourceCountry: 'World',
    url: '',
    image: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1400&q=80',
    category: 'blog',
    publishedAt: new Date(Date.now() - 172_800_000).toISOString(),
    readTime: 5,
  },
];

type GdeltArticle = {
  url?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  sourcecountry?: string;
};

export async function fetchLiveNews(category: NewsCategory, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(14_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const params = new URLSearchParams({
    query: CATEGORY_QUERIES[category],
    mode: 'artlist',
    maxrecords: '24',
    format: 'json',
    sort: 'datedesc',
    timespan: '48h',
  });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    signal: requestSignal,
  });
  if (!response.ok) throw new Error(`Live wire returned ${response.status}`);
  const payload = (await response.json()) as { articles?: GdeltArticle[] };
  const seen = new Set<string>();
  const articles = (payload.articles ?? [])
    .filter((item) => item.title && item.url && !seen.has(item.url))
    .map((item, index) => {
      seen.add(item.url!);
      const title = cleanTitle(item.title!);
      const source = sourceName(item.domain || new URL(item.url!).hostname);
      return {
        id: `live-${hash(item.url!)}`,
        title,
        summary: `Latest reporting from ${source}. Open the original story for complete context and continuing updates.`,
        source,
        sourceCountry: item.sourcecountry || (category === 'india' ? 'India' : 'World'),
        url: item.url!,
        image: item.socialimage || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
        category,
        publishedAt: parseGdeltDate(item.seendate),
        readTime: Math.max(2, Math.min(9, Math.round(title.split(' ').length / 4))),
      } satisfies NewsArticle;
    })
    .filter((item) => item.title.length > 18)
    .slice(0, 12);

  if (articles.length < 3) throw new Error('The live wire returned too few stories');
  return articles;
}

export function reactionBaselines(id: string) {
  const seed = Number.parseInt(hash(id).slice(0, 4), 36) || 120;
  return { likes: 28 + (seed % 420), dislikes: 2 + (seed % 31) };
}
