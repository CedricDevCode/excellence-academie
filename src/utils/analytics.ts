type GtagFunction = (...args: any[]) => void;

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: GtagFunction;
  }
}

const GA_MEASUREMENT_ID = String(
  (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || ''
).trim();

let initialized = false;

export const isAnalyticsConfigured = Boolean(GA_MEASUREMENT_ID);

export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID || initialized) return;
  if (typeof window === 'undefined') return;

  // Respecte un refus explicite même si le script a déjà été chargé.
  (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;

  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function setAnalyticsConsent(granted: boolean): void {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = !granted;
  if (granted) initAnalytics();
}

export function trackPageview(path: string): void {
  if (!initialized || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!initialized || !window.gtag) return;
  window.gtag('event', name, params || {});
}
