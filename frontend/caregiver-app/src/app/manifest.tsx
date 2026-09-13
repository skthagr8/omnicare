import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OmniCare Caregiver',
    short_name: 'OmniCare',
    description: 'Caregiver app for elderly care management',
    start_url: '/',
    display: 'standalone',
    background_color: '#F9FAFB',
    theme_color: '#4F46E5',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Emergency',
        short_name: 'Emergency',
        description: 'Quick access to emergency',
        url: '/emergency',
        icons: [{ src: '/icons/emergency-icon.svg', sizes: 'any' }],
      },
    ],
  };
}