import type { APIRoute } from 'astro';
import { GROUPS, getSubcategoryPaths, getWindowPaths } from '../lib/rankings';
import { withBase } from '../lib/url';

export const GET: APIRoute = ({ site }) => {
  const paths = [
    '/',
    '/about/',
    '/sources/',
    ...GROUPS.map((group) => `/${group.id}/`),
    ...getSubcategoryPaths().map(({ group, slug }) => `/${group}/${slug}/`),
    ...getWindowPaths().map(({ group, slug, window }) => `/${group}/${slug}/${window}/`),
  ];

  const urls = paths
    .map((path) => `  <url><loc>${new URL(withBase(path), site).toString()}</loc></url>`)
    .join('\n');

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
