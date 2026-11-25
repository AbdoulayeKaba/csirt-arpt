import React from "react"
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import './responsive-polish.css';
import '@/lib/datetime/locale';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'CSIRT-ARPT — Centre de réponse aux incidents',
  description:
    'CSIRT-ARPT, centre de réponse aux incidents de cybersécurité de l’Autorité de Régulation des Postes et Télécommunications (République de Guinée). Contact : csirt@arpt.gov.gn.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
};

/** Pages publiques mises en cache 2 minutes ; une sauvegarde du site les invalide tout de suite. */
export const revalidate = 120

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1f6b42' },
    { media: '(prefers-color-scheme: dark)', color: '#14532d' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="light" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === 'production' ? <Analytics /> : null}
      </body>
    </html>
  );
}
