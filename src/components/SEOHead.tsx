import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  type?: string;
  keywords?: string;
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  rss?: boolean;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'Excellence Académie';
const BASE_URL = 'https://www.exacademie.net';
const DEFAULT_TITLE = `${SITE_NAME} – Formation aux Concours en Côte d'Ivoire`;
const DEFAULT_DESCRIPTION =
  "Excellence Académie – Leader de la formation aux concours en Côte d'Ivoire. Inscription formation concours : ENA, Magistrature, Greffe, Agent pénitentiaire, CAPA.";
const DEFAULT_IMAGE = '/og-image.png';
const DEFAULT_KEYWORDS =
  "inscription formation concours, formation concours, ENA Côte d'Ivoire, magistrature, greffe, notaire, avocature, CAPA, agent pénitentiaire, Excellence Académie, Abidjan, inscription Excellence Académie";

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${BASE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  url = '/',
  image = DEFAULT_IMAGE,
  imageAlt = "Excellence Académie – Formation aux concours en Côte d'Ivoire",
  type = 'website',
  keywords = DEFAULT_KEYWORDS,
  noindex = false,
  publishedTime,
  modifiedTime,
  rss = false,
  structuredData,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullUrl = absoluteUrl(url);
  const fullImage = absoluteUrl(image);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />
      <link rel="canonical" href={fullUrl} />
      {rss && (
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${SITE_NAME} – Journal`}
          href={`${BASE_URL}/rss.xml`}
        />
      )}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:secure_url" content={fullImage} />
      <meta property="og:image:type" content={fullImage.endsWith('.png') ? 'image/png' : 'image/jpeg'} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:locale" content="fr_CI" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={imageAlt} />
      <meta name="twitter:site" content="@exacademie" />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData).replace(/</g, '\\u003c')}
        </script>
      )}
    </Helmet>
  );
}
