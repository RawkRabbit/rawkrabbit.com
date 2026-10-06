import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const entries = (await getCollection('log', ({ data }) => !data.draft)).sort((a, b) => +b.data.date - +a.data.date);
  return rss({
    title: 'RawkRabbit log',
    description: 'Releases, changes and notes from the RawkRabbit workshop.',
    site: context.site,
    items: entries.map((e) => ({ title: e.data.title, pubDate: e.data.date, description: e.data.summary, link: `/log/${e.id}/` })),
  });
}
