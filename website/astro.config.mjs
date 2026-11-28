// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const repo = 'https://github.com/anhtuank7c/expo-morph-menu';
const url = 'https://anhtuank7c.github.io/expo-morph-menu/';
// The sister package: both sites and READMEs link to each other.
const sister = 'https://anhtuank7c.github.io/expo-morph-carousel/';

/** Search and link previews: a share image, the sitemap and what the package is (schema.org). */
const head = [
  { tag: 'meta', attrs: { property: 'og:image', content: `${url}og.png` } },
  { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
  { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
  { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
  { tag: 'meta', attrs: { name: 'twitter:image', content: `${url}og.png` } },
  { tag: 'meta', attrs: { name: 'keywords', content: 'react native fab, expo router menu, floating action button, morph menu, shared element transition, reanimated menu, bottom sheet' } },
  { tag: 'link', attrs: { rel: 'sitemap', href: '/expo-morph-menu/sitemap-index.xml' } },
  {
    tag: 'script',
    attrs: { type: 'application/ld+json' },
    content: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: 'expo-morph-menu',
      description: 'A floating action button for expo-router that morphs into a card menu, then into a full-screen route and back. Reanimated 4, slots, iOS, Android and web.',
      url,
      codeRepository: repo,
      programmingLanguage: 'TypeScript',
      runtimePlatform: ['React Native', 'Expo', 'iOS', 'Android', 'Web'],
      license: 'https://opensource.org/licenses/MIT',
      author: { '@type': 'Person', name: 'Tuan Nguyen', url: 'https://github.com/anhtuank7c' },
      sameAs: [repo, 'https://www.npmjs.com/package/expo-morph-menu'],
    }),
  },
];

export default defineConfig({
  site: 'https://anhtuank7c.github.io',
  base: '/expo-morph-menu',
  // The example sources shown on the pages live outside the site folder.
  vite: { server: { fs: { allow: ['..'] } } },
  integrations: [
    starlight({
      title: 'Morph Menu',
      description:
        'A floating action menu for expo-router: the button grows into a card, a row grows into a full-screen route. Live demos, copyable code, slots.',
      logo: { src: './src/assets/logo.svg', alt: 'Morph Menu' },
      favicon: '/favicon.svg',
      head,
      social: [
        { icon: 'github', label: 'GitHub', href: repo },
        { icon: 'npm', label: 'npm', href: 'https://www.npmjs.com/package/expo-morph-menu' },
      ],
      editLink: { baseUrl: `${repo}/edit/main/website/` },
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        vi: { label: 'Tiếng Việt', lang: 'vi' },
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Start here',
          translations: { vi: 'Bắt đầu' },
          items: [{ slug: 'getting-started' }, { slug: 'usage' }],
        },
        {
          label: 'Examples',
          translations: { vi: 'Ví dụ' },
          items: [
            { slug: 'examples' },
            { slug: 'examples/basic' },
            { slug: 'examples/custom-slots' },
            { slug: 'examples/left-corner' },
            { slug: 'examples/social' },
            {
              label: 'Demo apps',
              translations: { vi: 'App mẫu' },
              items: ['wallet', 'chat', 'delivery', 'shop', 'music', 'notes'].map((id) => ({ slug: `examples/${id}` })),
            },
          ],
        },
        {
          label: 'Guides',
          translations: { vi: 'Hướng dẫn' },
          items: [
            { slug: 'guides/configuration' },
            { slug: 'guides/custom-ui' },
            { slug: 'guides/integration' },
            { slug: 'guides/web' },
            { slug: 'guides/how-it-works' },
            { slug: 'guides/architecture' },
            { slug: 'guides/performance' },
          ],
        },
        {
          label: 'Reference',
          translations: { vi: 'Tham khảo' },
          items: [{ slug: 'reference/api' }, { slug: 'reference/platforms' }],
        },
        {
          label: 'More from the author',
          translations: { vi: 'Cùng tác giả' },
          items: [
            {
              label: 'Morph Carousel: a liquid carousel for Expo',
              translations: { vi: 'Morph Carousel: carousel hiệu ứng liquid cho Expo' },
              link: sister,
            },
          ],
        },
      ],
    }),
  ],
});
