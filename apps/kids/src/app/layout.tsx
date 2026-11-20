import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Mesmas fontes do Cognuss (K-D06), no pacote de UI (OFL, ver packages/ui/fonts/LICENSE.md).
const display = localFont({
  src: '../../../../packages/ui/fonts/archivo-black-latin-400.woff2',
  weight: '400',
  variable: '--font-archivo',
  display: 'swap',
});
const sans = localFont({
  src: [
    { path: '../../../../packages/ui/fonts/hind-latin-400.woff2', weight: '400' },
    { path: '../../../../packages/ui/fonts/hind-latin-500.woff2', weight: '500' },
    { path: '../../../../packages/ui/fonts/hind-latin-600.woff2', weight: '600' },
    { path: '../../../../packages/ui/fonts/hind-latin-700.woff2', weight: '700' },
  ],
  variable: '--font-hind',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Cognuss Kids', template: '%s · Cognuss Kids' },
  description: 'Plano de estudos da escola, para o Ensino Fundamental e o Médio.',
  robots: { index: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d0b0b',
};

// Tema escuro por padrão, claro se escolhido no botão do topo (K-D09), antes da pintura.
const bootScript = `(function(){try{if(localStorage.getItem('gutta-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
