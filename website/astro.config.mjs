// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const repo = 'https://github.com/anhtuank7c/expo-morph-menu';

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
      ],
    }),
  ],
});
