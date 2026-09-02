import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://premdheeraj.github.io/newsgrid/'),
  title: 'NEWSGRID / भारत: India & World News',
  description: 'A kinetic India and world news experience with local weather, reader reactions, and editorial blogs.',
  openGraph: {
    title: 'NEWSGRID / भारत: India & World News',
    description: 'India, world, technology, finance, climate, and exact-location weather in one kinetic editorial experience.',
    url: 'https://premdheeraj.github.io/newsgrid/',
    siteName: 'NEWSGRID / भारत',
    type: 'website',
    images: [{ url: 'https://premdheeraj.github.io/newsgrid/og.png', width: 1200, height: 630, alt: 'NEWSGRID India, world, and weather' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEWSGRID / भारत: India & World News',
    description: 'India, world, technology, finance, climate, and exact-location weather in one kinetic editorial experience.',
    images: ['https://premdheeraj.github.io/newsgrid/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
