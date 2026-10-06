import type { Metadata, Viewport } from 'next';
import { RegistrarServiceWorker } from '@/components/registrar-sw';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Gabarita TI', template: '%s · Gabarita TI' },
  description: 'Questões de concursos de TI para resolver no celular.',
  applicationName: 'Gabarita TI',
  appleWebApp: { capable: true, title: 'Gabarita TI', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f1ea' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1211' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-3 focus:py-2"
        >
          Pular para o conteúdo
        </a>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
