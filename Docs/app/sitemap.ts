import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dns.nexoral.in'

  // Static routes from the docs folder structure
  const routes = [
    '',
    '/contact',
    '/docs/getting-started',
    '/docs/installation',
    '/docs/configuration',
    '/docs/dashboard',
    '/docs/features',
    '/docs/api',
    '/docs/architecture',
    '/docs/faq',
    '/docs/troubleshooting',
    '/docs/security',
    '/docs/changelog',
    '/docs/contributing',
    '/docs/license',
    '/docs/commands/install',
    '/docs/commands/remove',
    '/docs/commands/start',
    '/docs/commands/stop',
    '/docs/commands/update',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 :
      route === '/docs/getting-started' ? 0.95 :
        route === '/contact' ? 0.8 :
          route.includes('/commands/') ? 0.7 : 0.85,
  }))
}
