import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FocusFlow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>

      {/* Grammarly 等浏览器扩展会在 body 上插 data-* 属性，导致 hydration mismatch */}
      <body
        suppressHydrationWarning
        className="bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-white antialiased selection:bg-blue-500 selection:text-white transition-colors duration-300 font-sans"
      >
        {children}
      </body>
    </html>
  );
}
