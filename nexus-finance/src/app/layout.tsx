import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FinancialProvider } from "@/lib/financial-context";

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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Keuangan" />
        <meta name="application-name" content="Keuangan" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="apple-touch-icon" sizes="152x152" href="/app-icons/icon-1024x1024.svg" />
        <link rel="icon" type="image/svg+xml" sizes="32x32" href="/app-icons/icon-1024x1024.svg" />
        <link rel="icon" type="image/svg+xml" sizes="16x16" href="/app-icons/icon-1024x1024.svg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <FinancialProvider>
          {children}
        </FinancialProvider>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Enhanced service worker registration
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                  })
                    .then(function(registration) {
                      console.log('✅ SW registered successfully:', registration);
                      
                      // Check for updates
                      registration.addEventListener('updatefound', () => {
                        console.log('🔄 SW update found');
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 SW updated, reloading page...');
                            window.location.reload();
                          }
                        });
                      });
                    })
                    .catch(function(registrationError) {
                      console.error('❌ SW registration failed:', registrationError);
                    });
                });
              }

              // Listen for service worker messages
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', (event) => {
                  console.log('📨 SW message:', event.data);
                  
                  // Forward to window for global handling
                  window.dispatchEvent(new CustomEvent('swMessage', {
                    detail: event.data
                  }));
                });
              }

              // Listen for beforeinstallprompt
              window.addEventListener('beforeinstallprompt', (event) => {
                console.log('📱 Install prompt detected in window');
                // Store the event for later use
                window.deferredPrompt = event;
                
                // Notify any listeners
                window.dispatchEvent(new CustomEvent('beforeInstallPrompt', {
                  detail: event
                }));
              });

              // Listen for appinstalled
              window.addEventListener('appinstalled', (event) => {
                console.log('✅ App installed successfully');
                window.deferredPrompt = null;
                
                // Notify any listeners
                window.dispatchEvent(new CustomEvent('appinstalled'));
              });
            `,
          }}
        />
      </body>
    </html>
  );
}