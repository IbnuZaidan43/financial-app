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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Keuangan" />
        <meta name="application-name" content="Keuangan" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="apple-touch-icon" sizes="512x512" href="/app-icons/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/app-icons/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/app-icons/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
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
                  navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                  })
                    .then(function(registration) {
                      console.log('✅ SW registered successfully:', registration.scope);
                      
                      window.swRegistration = registration;
                      window.swActive = registration.active;
                      
                      registration.addEventListener('updatefound', () => {
                        console.log('🔄 SW update found');
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              console.log('🔄 SW updated, reloading page...');
                              window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
                                detail: { registration }
                              }));
                              setTimeout(() => {
                                window.location.reload();
                              }, 2000);
                            }
                          });
                        }
                      });
                      
                      navigator.serviceWorker.addEventListener('controllerchange', () => {
                        console.log('🔄 SW controller changed');
                        window.location.reload();
                      });
                      
                      window.dispatchEvent(new CustomEvent('swReady', {
                        detail: { registration }
                      }));
                      
                      console.log('🖼️ Initializing asset optimization...');
                    })
                    .catch(function(registrationError) {
                      console.error('❌ SW registration failed:', registrationError);
                      window.dispatchEvent(new CustomEvent('swError', {
                        detail: { error: registrationError }
                      }));
                    });
                });
              }

              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', (event) => {
                  console.log('📨 SW message:', event.data.type, event.data);
                  
                  switch(event.data.type) {
                    case 'API_OFFLINE':
                      console.warn('📡 API offline, using cached data');
                      window.dispatchEvent(new CustomEvent('apiOffline', {
                        detail: event.data
                      }));
                      break;
                      
                    case 'SYNC_QUEUE_UPDATED':
                      console.log('🔄 Sync queue updated:', event.data.queueLength);
                      window.dispatchEvent(new CustomEvent('syncQueueUpdated', {
                        detail: event.data
                      }));
                      break;
                      
                    case 'SYNC_COMPLETED':
                      console.log('✅ Sync completed:', event.data.remaining);
                      window.dispatchEvent(new CustomEvent('syncCompleted', {
                        detail: event.data
                      }));
                      break;
                      
                    case 'CACHE_STATUS_RESPONSE':
                      window.dispatchEvent(new CustomEvent('cacheStatus', {
                        detail: event.data.status
                      }));
                      break;
                      
                    case 'BEFORE_INSTALL_PROMPT':
                      console.log('📱 Install prompt from SW');
                      window.dispatchEvent(new CustomEvent('beforeInstallPrompt', {
                        detail: event.data.event
                      }));
                      break;
                      
                    case 'APP_INSTALLED':
                      console.log('✅ App installed from SW');
                      window.dispatchEvent(new CustomEvent('appinstalled'));
                      break;
                  }
                  
                  window.dispatchEvent(new CustomEvent('swMessage', {
                    detail: event.data
                  }));
                });
              }

              window.addEventListener('beforeinstallprompt', (event) => {
                console.log('📱 Install prompt detected');
                event.preventDefault();
                window.deferredPrompt = event;
                
                document.body.classList.add('install-prompt-available');
                
                window.dispatchEvent(new CustomEvent('beforeInstallPrompt', {
                  detail: event
                }));
              });

              window.addEventListener('appinstalled', (event) => {
                console.log('✅ App installed successfully');
                window.deferredPrompt = null;
                
                document.body.classList.remove('install-prompt-available');
                document.body.classList.add('app-installed');
                
                window.dispatchEvent(new CustomEvent('appinstalled'));
                
                if (typeof gtag !== 'undefined') {
                  gtag('event', 'app_installed', {
                    'event_category': 'PWA',
                    'event_label': 'install_success'
                  });
                }
              });

              function updateNetworkStatus() {
                const isOnline = navigator.onLine;
                console.log('🌐 Network status:', isOnline ? 'online' : 'offline');
                
                document.body.classList.toggle('offline', !isOnline);
                document.body.classList.toggle('online', isOnline);
                
                window.dispatchEvent(new CustomEvent('networkStatusChanged', {
                  detail: { online: isOnline }
                }));
              }

              window.addEventListener('online', updateNetworkStatus);
              window.addEventListener('offline', updateNetworkStatus);
              updateNetworkStatus();

              if ('performance' in window) {
                window.addEventListener('load', () => {
                  setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    console.log('⚡ Page load performance:', {
                      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                      totalTime: perfData.loadEventEnd - perfData.fetchStart
                    });
                  }, 0);
                });
              }

              window.addEventListener('DOMContentLoaded', function() {
                console.log('🖼️ Setting up asset optimization...');
                const lazyImages = document.querySelectorAll('img[data-src]');
                if ('IntersectionObserver' in window) {
                  const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                      if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                          img.src = src;
                          img.classList.remove('lazy');
                          img.classList.add('loaded');
                        }
                        imageObserver.unobserve(img);
                      }
                    });
                  }, {
                    rootMargin: '50px 0px',
                    threshold: 0.1
                  });
                  
                  lazyImages.forEach((img) => imageObserver.observe(img));
                  console.log('🖼️ Lazy loading setup for', lazyImages.length, 'images');
                } else {
                  lazyImages.forEach((img) => {
                    const src = img.dataset.src;
                    if (src) {
                      img.src = src;
                    }
                  });
                }

                const criticalLinks = [
                  { href: '/app-icons/icon-192x192.png', as: 'image' },
                  { href: '/app-icons/icon-512x512.png', as: 'image' },
                  { href: '/manifest.json', as: 'fetch' }
                ];

                criticalLinks.forEach(({ href, as }) => {
                  const link = document.createElement('link');
                  link.rel = 'preload';
                  link.href = href;
                  link.as = as;
                  document.head.appendChild(link);
                });

                console.log('🚀 Critical assets preloaded');
              });
            `,
          }}
        />
      </body>
    </html>
  );
}