'use client';

import {
  ArrowUpRight,
  CloudSun,
  Droplets,
  Gauge,
  Globe2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  ThumbsDown,
  ThumbsUp,
  Wind,
} from 'lucide-react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  MouseEvent,
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BLOG_POSTS,
  CATEGORY_LABELS,
  fallbackNews,
  fetchLiveNews,
  NewsArticle,
  NewsCategory,
  reactionBaselines,
} from '@/lib/news';
import {
  compassDirection,
  DEFAULT_LOCATION,
  fetchWeather,
  searchLocations,
  WeatherLocation,
  WeatherSnapshot,
  weatherDetails,
} from '@/lib/weather';

type ReactionValue = 'like' | 'dislike';
type Reactions = Record<string, ReactionValue>;

const categories = Object.keys(CATEGORY_LABELS) as NewsCategory[];

function formatRelativeTime(value: string, renderTime: number | null) {
  if (renderTime === null) return 'Latest';
  const hours = Math.max(0, Math.round((renderTime - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ReactionBar({
  article,
  reactions,
  onReact,
}: {
  article: NewsArticle;
  reactions: Reactions;
  onReact: (id: string, value: ReactionValue) => void;
}) {
  const selected = reactions[article.id];
  const baseline = reactionBaselines(article.id);
  return (
    <div className="reaction-bar" aria-label={`Reactions for ${article.title}`}>
      <motion.button
        type="button"
        aria-label={`Like ${article.title}`}
        aria-pressed={selected === 'like'}
        className={selected === 'like' ? 'is-active' : ''}
        onClick={() => onReact(article.id, 'like')}
        whileTap={{ scale: 0.82 }}
      >
        <ThumbsUp aria-hidden="true" />
        <span>{baseline.likes + (selected === 'like' ? 1 : 0)}</span>
      </motion.button>
      <motion.button
        type="button"
        aria-label={`Dislike ${article.title}`}
        aria-pressed={selected === 'dislike'}
        className={selected === 'dislike' ? 'is-active dislike' : ''}
        onClick={() => onReact(article.id, 'dislike')}
        whileTap={{ scale: 0.82 }}
      >
        <ThumbsDown aria-hidden="true" />
        <span>{baseline.dislikes + (selected === 'dislike' ? 1 : 0)}</span>
      </motion.button>
    </div>
  );
}

function StoryVisual({ article, priority = false }: { article: NewsArticle; priority?: boolean }) {
  return (
    <div className="story-visual">
      <div className="visual-fallback" aria-hidden="true">
        <span>{article.source.slice(0, 2).toUpperCase()}</span>
        <small>Newsgrid / live wire</small>
      </div>
      {article.image ? (
        // Remote publisher thumbnails are intentionally rendered as-is; GDELT domains are not known at build time.
        // oxlint-disable-next-line next/no-img-element
        <img
          src={article.image}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <div className="image-wash" aria-hidden="true" />
    </div>
  );
}

function StoryCard({
  article,
  reactions,
  onReact,
  index,
  renderTime,
}: {
  article: NewsArticle;
  reactions: Reactions;
  onReact: (id: string, value: ReactionValue) => void;
  index: number;
  renderTime: number | null;
}) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4, -4]), {
    stiffness: 160,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-4, 4]), {
    stiffness: 160,
    damping: 22,
  });

  function handleMove(event: MouseEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  }

  function handleLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <motion.article
      className="news-card"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.055, 0.4), duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="card-sheen" aria-hidden="true" />
      <StoryVisual article={article} />
      <div className="card-body">
        <p className="kicker">{CATEGORY_LABELS[article.category as NewsCategory] ?? 'Editorial'} / {article.sourceCountry}</p>
        <h3>{article.title}</h3>
        <p className="summary">{article.summary}</p>
        <div className="card-footer">
          <div><b>{article.source}</b><span>{formatRelativeTime(article.publishedAt, renderTime)} · {article.readTime} min</span></div>
          {article.url ? (
            <a href={article.url} target="_blank" rel="noreferrer" aria-label={`Read ${article.title}`}>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ) : <span className="desk-mark">NG</span>}
        </div>
        <ReactionBar article={article} reactions={reactions} onReact={onReact} />
      </div>
    </motion.article>
  );
}

function WeatherPanel({
  weather,
  loading,
  error,
  query,
  suggestions,
  onQuery,
  onSubmit,
  onSelect,
}: {
  weather: WeatherSnapshot | null;
  loading: boolean;
  error: string;
  query: string;
  suggestions: WeatherLocation[];
  onQuery: (value: string) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onSelect: (location: WeatherLocation) => void;
}) {
  const details = weatherDetails(weather?.weatherCode ?? 1);
  const location = weather?.location ?? DEFAULT_LOCATION;
  return (
    <motion.aside
      className="weather-panel"
      aria-label="Location weather"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="weather-grid" aria-hidden="true" />
      <div className="weather-orbit orbit-one" aria-hidden="true"><i /></div>
      <div className="weather-orbit orbit-two" aria-hidden="true"><i /></div>
      <div className="weather-heading">
        <span>Weather / exact location</span>
        <CloudSun aria-hidden="true" />
      </div>

      <div className="weather-reading">
        <div className="weather-mark">{details.mark}</div>
        <strong>{loading && !weather ? '··' : `${Math.round(weather?.temperature ?? 0)}°`}</strong>
        <h2>{location.name}</h2>
        <p><MapPin aria-hidden="true" /> {[location.admin1, location.country].filter(Boolean).join(', ')}</p>
        <span>{loading ? 'Reading the atmosphere…' : error || details.label}</span>
      </div>

      <form className="weather-search" onSubmit={onSubmit}>
        <Search aria-hidden="true" />
        <Input
          aria-label="Search city or location for weather"
          placeholder="Search city or exact location"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          autoComplete="off"
        />
        <Button type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="spin" aria-hidden="true" /> : 'Check'}
        </Button>
        {suggestions.length > 0 ? (
          <div className="location-results" aria-label="Location suggestions">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                key={`${suggestion.id}-${suggestion.latitude}`}
                onClick={() => onSelect(suggestion)}
              >
                <span>{suggestion.name}</span>
                <small>{[suggestion.admin1, suggestion.country].filter(Boolean).join(', ')}</small>
              </button>
            ))}
          </div>
        ) : null}
      </form>

      <div className="weather-metrics">
        <div><Wind /><span>Wind</span><b>{Math.round(weather?.windSpeed ?? 0)} km/h {compassDirection(weather?.windDirection ?? 0)}</b></div>
        <div><Droplets /><span>Humidity</span><b>{Math.round(weather?.humidity ?? 0)}%</b></div>
        <div><Gauge /><span>Feels like</span><b>{Math.round(weather?.apparentTemperature ?? 0)}°</b></div>
        <div><CloudSun /><span>Cloud cover</span><b>{Math.round(weather?.cloudCover ?? 0)}%</b></div>
      </div>
      <div className="sun-line">
        <span><Sunrise /> {weather?.sunrise ? new Date(weather.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '··'}</span>
        <span>H {Math.round(weather?.high ?? 0)}° / L {Math.round(weather?.low ?? 0)}°</span>
        <span><Sunset /> {weather?.sunset ? new Date(weather.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '··'}</span>
      </div>
    </motion.aside>
  );
}

export default function Home() {
  const [category, setCategory] = useState<NewsCategory>('india');
  const [articles, setArticles] = useState<NewsArticle[]>(() => fallbackNews('india'));
  const [newsLoading, setNewsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [newsMessage, setNewsMessage] = useState('Connecting to the live wire…');
  const [reactions, setReactions] = useState<Reactions>({});
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [formattedDate, setFormattedDate] = useState('Today / India edition');
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<WeatherLocation[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const newsRequest = useRef<AbortController | null>(null);
  const weatherRequest = useRef<AbortController | null>(null);

  const reactToStory = useCallback((id: string, value: ReactionValue) => {
    setReactions((current) => {
      const updated = { ...current };
      if (updated[id] === value) delete updated[id];
      else updated[id] = value;
      window.localStorage.setItem('newsgrid-reactions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadCategory = useCallback(async (nextCategory: NewsCategory) => {
    newsRequest.current?.abort();
    const controller = new AbortController();
    newsRequest.current = controller;
    setCategory(nextCategory);
    setArticles(fallbackNews(nextCategory));
    setIsLive(false);
    setNewsLoading(true);
    setNewsMessage(`Showing ${CATEGORY_LABELS[nextCategory]} now; refreshing the live wire…`);
    try {
      const liveArticles = await fetchLiveNews(nextCategory, controller.signal);
      setArticles(liveArticles);
      setIsLive(true);
      setNewsMessage(`${liveArticles.length} stories · refreshed from the global live wire`);
      return { category: nextCategory, stories: liveArticles.length, status: 'live' };
    } catch {
      if (controller.signal.aborted) {
        return { category: nextCategory, stories: 0, status: 'cancelled' };
      }
      const fallback = fallbackNews(nextCategory);
      setArticles(fallback);
      setIsLive(false);
      setNewsMessage('Live wire is slow. Showing the editor’s preview; refresh to try again.');
      return { category: nextCategory, stories: fallback.length, status: 'editor-preview' };
    } finally {
      if (!controller.signal.aborted) setNewsLoading(false);
    }
  }, []);

  const loadLocation = useCallback(async (location: WeatherLocation) => {
    weatherRequest.current?.abort();
    const controller = new AbortController();
    weatherRequest.current = controller;
    setWeatherLoading(true);
    setWeatherError('');
    setSuggestions([]);
    setLocationQuery('');
    try {
      const snapshot = await fetchWeather(location, controller.signal);
      setWeather(snapshot);
      return {
        location: `${snapshot.location.name}, ${snapshot.location.country}`,
        temperatureCelsius: snapshot.temperature,
        condition: weatherDetails(snapshot.weatherCode).label,
        windKmh: snapshot.windSpeed,
      };
    } catch (error) {
      if (controller.signal.aborted) {
        return { location: `${location.name}, ${location.country}`, status: 'cancelled' };
      }
      const message = error instanceof Error ? error.message : 'Weather is temporarily unavailable';
      setWeatherError(message);
      throw error;
    } finally {
      if (!controller.signal.aborted) setWeatherLoading(false);
    }
  }, []);

  const loadWeatherByCity = useCallback(async (city: string) => {
    const clean = city.trim();
    if (clean.length < 2) throw new Error('Enter at least two characters for a location');
    const matches = await searchLocations(clean);
    if (!matches[0]) throw new Error(`No weather location found for “${clean}”`);
    return loadLocation(matches[0]);
  }, [loadLocation]);

  useEffect(() => {
    const start = window.setTimeout(() => {
      void loadCategory('india');
      void loadLocation(DEFAULT_LOCATION);
    }, 0);
    return () => {
      window.clearTimeout(start);
      newsRequest.current?.abort();
      weatherRequest.current?.abort();
    };
  }, [loadCategory, loadLocation]);

  useEffect(() => {
    const restoreTheme = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem('newsgrid-theme');
      setDarkMode(savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches));
      try {
        setReactions(JSON.parse(window.localStorage.getItem('newsgrid-reactions') ?? '{}') as Reactions);
      } catch {
        setReactions({});
      }
      setRenderTime(Date.now());
      setFormattedDate(new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' }).format(new Date()));
    }, 0);
    return () => window.clearTimeout(restoreTheme);
  }, []);

  useEffect(() => {
    if (locationQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchLocations(locationQuery, controller.signal)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locationQuery]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const report = (error: unknown) => console.warn('WebMCP registration failed', error);
    const newsTool = context.registerTool(
      {
        name: 'browse_news_category',
        title: 'Browse news category',
        description: 'Load a supported India or world news category and update the visible Newsgrid feed.',
        inputSchema: {
          type: 'object',
          properties: { category: { type: 'string', enum: categories } },
          required: ['category'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const value = (input as { category?: string })?.category;
          if (!categories.includes(value as NewsCategory)) throw new Error('Unsupported news category');
          return loadCategory(value as NewsCategory);
        },
      },
      { signal: lifecycle.signal },
    );
    const weatherTool = context.registerTool(
      {
        name: 'check_weather_for_city',
        title: 'Check weather for a city',
        description: 'Find a city and update the visible weather panel with its current conditions.',
        inputSchema: {
          type: 'object',
          properties: { city: { type: 'string', minLength: 2 } },
          required: ['city'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const city = (input as { city?: string })?.city;
          if (typeof city !== 'string') throw new Error('City must be a string');
          return loadWeatherByCity(city);
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.all([Promise.resolve(newsTool), Promise.resolve(weatherTool)]).catch(report);
    return () => lifecycle.abort();
  }, [loadCategory, loadWeatherByCity]);

  const handleWeatherSubmit = useCallback(async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (suggestions[0]) {
      void loadLocation(suggestions[0]);
      return;
    }
    setWeatherLoading(true);
    setWeatherError('');
    try {
      await loadWeatherByCity(locationQuery);
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : 'Location not found');
      setWeatherLoading(false);
    }
  }, [loadLocation, loadWeatherByCity, locationQuery, suggestions]);

  const leadStory = articles[0] ?? fallbackNews(category)[0];
  const gridStories = useMemo(() => articles.slice(1), [articles]);
  const toggleTheme = useCallback(() => {
    setDarkMode((current) => {
      const next = !current;
      window.localStorage.setItem('newsgrid-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <main className={`news-shell${darkMode ? ' theme-dark' : ''}`} id="top">
        <header className="masthead">
          <a className="news-brand" href="#top"><span>NEWSGRID</span><b>/ भारत</b></a>
          <nav aria-label="News categories">
            {categories.slice(0, 4).map((item) => (
              <button key={item} type="button" onClick={() => void loadCategory(item)}>{CATEGORY_LABELS[item]}</button>
            ))}
            <a href="#blog">Blog</a>
          </nav>
          <div className="header-actions">
            <a className="weather-jump" href="#weather"><MapPin /> Local weather <span>↘</span></a>
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
              <span className={darkMode ? '' : 'selected'}><Sun aria-hidden="true" /></span>
              <span className={darkMode ? 'selected' : ''}><Moon aria-hidden="true" /></span>
            </button>
          </div>
        </header>

        <div className="ticker" aria-label="News topics ticker">
          <b><i /> LIVE</b>
          <div className="ticker-viewport">
            <div className="ticker-track"><span>INDIA · WORLD · TECHNOLOGY · FINANCE · CLIMATE · CULTURE</span></div>
          </div>
        </div>

        <section className="front-page">
          <div className="edition-line"><span>Independent news interface</span><time>{formattedDate}</time><span>Edition / 001</span></div>

          <section className="hero-grid" aria-label="Lead story and weather">
            <AnimatePresence mode="wait">
              <motion.article
                className="lead-story"
                key={leadStory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
              >
                <StoryVisual article={leadStory} priority />
                <div className="lead-copy">
                  <div><p className="kicker">{CATEGORY_LABELS[category]} / Top story</p><span className="story-index">01</span></div>
                  <h1>{leadStory.title}</h1>
                  <p>{leadStory.summary}</p>
                  <div className="lead-meta">
                    <div><b>{leadStory.source}</b><span>{formatRelativeTime(leadStory.publishedAt, renderTime)} · {leadStory.readTime} min read</span></div>
                    {leadStory.url ? <a href={leadStory.url} target="_blank" rel="noreferrer">Read story <ArrowUpRight /></a> : <span>Editor’s preview</span>}
                  </div>
                  <ReactionBar article={leadStory} reactions={reactions} onReact={reactToStory} />
                </div>
              </motion.article>
            </AnimatePresence>
            <div id="weather">
              <WeatherPanel
                weather={weather}
                loading={weatherLoading}
                error={weatherError}
                query={locationQuery}
                suggestions={suggestions}
                onQuery={(value) => {
                  setLocationQuery(value);
                  if (value.trim().length < 2) setSuggestions([]);
                }}
                onSubmit={handleWeatherSubmit}
                onSelect={(location) => void loadLocation(location)}
              />
            </div>
          </section>

          <section className="news-section" id="latest">
            <div className="section-heading">
              <div><span>01 / Live desk</span><h2>Now on the wire</h2></div>
              <div className="feed-status"><i className={isLive ? 'live' : ''} /><span>{newsMessage}</span></div>
            </div>
            <div className="category-tabs" role="tablist" aria-label="Choose news category">
              {categories.map((item) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === item}
                  className={category === item ? 'active' : ''}
                  key={item}
                  onClick={() => void loadCategory(item)}
                >
                  {CATEGORY_LABELS[item]}<span>↗</span>
                </button>
              ))}
              <button className="refresh-feed" type="button" onClick={() => void loadCategory(category)} disabled={newsLoading}>
                <RefreshCw className={newsLoading ? 'spin' : ''} /> Refresh
              </button>
            </div>

            {newsLoading ? (
              <div className="loading-line"><span /><p>Scanning the {CATEGORY_LABELS[category]} live wire</p></div>
            ) : null}

            <AnimatePresence mode="popLayout">
              <motion.div className="news-grid" key={category}>
                {gridStories.map((article, index) => (
                  <StoryCard key={article.id} article={article} reactions={reactions} onReact={reactToStory} index={index} renderTime={renderTime} />
                ))}
              </motion.div>
            </AnimatePresence>
          </section>

          <section className="editorial-break">
            <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true, amount: 0.4 }}>
              <Globe2 aria-hidden="true" /><span>NEWSGRID MANIFESTO / 01</span>
            </motion.div>
            <motion.p initial={{ y: 34, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.4 }}>
              Headlines move quickly.<br /><em>Understanding</em> should not.
            </motion.p>
          </section>

          <section className="blog-section" id="blog">
            <div className="section-heading">
              <div><span>02 / Editorial</span><h2>Ideas beyond the headline</h2></div>
              <p>Original field notes, explainers and perspectives from the Newsgrid desk.</p>
            </div>
            <div className="blog-grid">
              {BLOG_POSTS.map((article, index) => (
                <StoryCard key={article.id} article={article} reactions={reactions} onReact={reactToStory} index={index} renderTime={renderTime} />
              ))}
            </div>
          </section>
        </section>

        <footer>
          <a className="news-brand" href="#top"><span>NEWSGRID</span><b>/ भारत</b></a>
          <p>India, the world, and the weather outside, all in one considered daily interface.</p>
          <div><span>Weather data / Open-Meteo</span><span>News discovery / GDELT</span><span>Prototype edition / 2026</span></div>
        </footer>
      </main>
    </MotionConfig>
  );
}
