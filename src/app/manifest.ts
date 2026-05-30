import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prode Mundial 2026',
    short_name: 'Prode 2026',
    description: 'Prode del Mundial de Fútbol 2026',
    start_url: '/',
    display: 'standalone',
    background_color: '#14532d',
    theme_color: '#14532d',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
