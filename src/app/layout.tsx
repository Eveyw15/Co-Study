import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'FocusFlow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Tailwind CDN (keeps your original styling approach) */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />

        {/* Tailwind config (copied from the original index.html) */}
        <Script id="tailwind-config" strategy="beforeInteractive">
          {`
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  fontFamily: {
                    sans: ['Arial', 'Helvetica', 'sans-serif'],
                    mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
                  },
                  colors: {
                    apple: {
                      gray: '#F5F5F7',
                      dark: '#1D1D1F',
                      blue: '#0071E3',
                      card: 'rgba(255, 255, 255, 0.72)',
                      cardDark: 'rgba(30, 30, 30, 0.72)'
                    }
                  },
                  animation: {
                    'spin-slow': 'spin 3s linear infinite',
                  }
                }
              }
            }
          `}
        </Script>
      </head>
      <body className="bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-white antialiased selection:bg-blue-500 selection:text-white transition-colors duration-300 font-sans">
        {children}
      </body>
    </html>
  );
}
