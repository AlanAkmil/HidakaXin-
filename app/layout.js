import { Manrope } from 'next/font/google';
import './globals.css';
import TopHeader from '../components/TopHeader';
import BottomNav from '../components/BottomNav';
import MainWrapper from '../components/MainWrapper';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';
import ThemeSync from '../components/ThemeSync';

const body = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body'
});

export const metadata = {
  title: 'HidakaXin — Tonton Donghua Sub Indo',
  description: 'HidakaXin: portal donghua & cultivation anime — jadwal rilis, koleksi lengkap, dan streaming kilat.',
  metadataBase: new URL('https://hidakaxin.vercel.app'),
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HidakaXin'
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: '/icons/apple-touch-icon.png'
  }
};

export const viewport = {
  themeColor: '#ff5a36'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${body.variable}`}>
      <body className="bg-paper text-ink font-body antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('hidakaxin:theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}"
          }}
        />
        <ThemeSync />
        <ServiceWorkerRegister />
        <TopHeader />
        <MainWrapper>{children}</MainWrapper>
        <BottomNav />
      </body>
    </html>
  );
}
