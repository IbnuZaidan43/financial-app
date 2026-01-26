import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aplikasi Keuangan - Pengelolaan Keuangan Pribadi",
  description: "Aplikasi pengelolaan keuangan pribadi yang modern dan mudah digunakan. Kelola pemasukan, pengeluaran, dan tabungan dengan interface yang intuitif.",
  keywords: ["keuangan", "pengelolaan keuangan", "aplikasi keuangan", "pemasukan", "pengeluaran", "tabungan", "budget"],
  authors: [{ name: "Keuangan App Team" }],
  icons: {
    icon: "/app-icons/icon-512x512.png",
    apple: "/app-icons/icon-512x512.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Keuangan",
  },
  openGraph: {
    title: "Aplikasi Keuangan",
    description: "Aplikasi pengelolaan keuangan pribadi yang modern dan mudah digunakan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aplikasi Keuangan",
    description: "Aplikasi pengelolaan keuangan pribadi yang modern dan mudah digunakan",
  },
};

export const viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="apple-touch-icon" sizes="512x512" href="/app-icons/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/app-icons/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/app-icons/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(reg => console.log('✅ SW registered'))
                    .catch(err => console.error('❌ SW failed:', err));
                });
              }

              function updateNetworkStatus() {
                const isOnline = navigator.onLine;
                document.body.classList.toggle('offline', !isOnline);
                window.dispatchEvent(new CustomEvent('networkStatusChanged', { detail: { online: isOnline } }));
              }
              window.addEventListener('online', updateNetworkStatus);
              window.addEventListener('offline', updateNetworkStatus);
              updateNetworkStatus();

              window.addEventListener('DOMContentLoaded', function() {
                const lazyImages = document.querySelectorAll('img[data-src]');
                if ('IntersectionObserver' in window) {
                  const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                      if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                      }
                    });
                  });
                  lazyImages.forEach((img) => observer.observe(img));
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}