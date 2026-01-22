/**
 * Structured Data (JSON-LD) components for SEO
 * These provide rich snippets for search engines
 */

const BASE_URL = 'https://seatify.app';

interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Organization schema - identifies the business
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Seatify',
    url: BASE_URL,
    logo: `${BASE_URL}/og-image.png`,
    description: 'Free seating chart maker for weddings, corporate events, and parties.',
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * SoftwareApplication schema - for app store/search listings
 */
export function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Seatify',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Create beautiful seating charts for weddings, corporate events, and parties. Drag-and-drop interface, smart optimization, and instant exports.',
    url: BASE_URL,
    screenshot: `${BASE_URL}/og-image.png`,
    featureList: [
      'Drag-and-drop seating chart editor',
      'Smart seating optimization',
      'Relationship management (partners, family, avoid)',
      'CSV import/export',
      'PDF table cards and place cards',
      'QR code generation for tables',
      'Real-time collaboration via shareable links',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * FAQPage schema - for FAQ rich snippets in search results
 */
export function FAQPageSchema({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * WebSite schema with SearchAction - enables sitelinks search box
 */
export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Seatify',
    url: BASE_URL,
    description: 'Free seating chart maker for weddings, corporate events, and parties.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * BreadcrumbList schema for navigation context
 */
export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Default landing page FAQs for structured data
 */
export const LANDING_PAGE_FAQS: FAQItem[] = [
  {
    question: 'Is Seatify really free?',
    answer: 'Yes! Seatify is completely free to use. Create unlimited seating charts, add unlimited guests, and export to PDF without paying anything.',
  },
  {
    question: 'Do I need to create an account?',
    answer: 'No account is required to try the demo. You can explore all features immediately. Create a free account only when you want to save your work.',
  },
  {
    question: 'How does the smart seating optimization work?',
    answer: 'Our algorithm analyzes guest relationships (partners, family members, people to keep apart) and automatically assigns seats to maximize happiness and minimize conflicts.',
  },
  {
    question: 'Can I import my guest list?',
    answer: 'Yes! You can import guests from a CSV or Excel file. Our import wizard helps you map columns and handles duplicates automatically.',
  },
  {
    question: 'What export options are available?',
    answer: 'Export your seating chart as PDF table cards for display, place cards for individual seats, or download your guest list as CSV for other tools.',
  },
];

/**
 * Combined structured data for landing page
 */
export function LandingPageStructuredData() {
  return (
    <>
      <OrganizationSchema />
      <SoftwareApplicationSchema />
      <WebSiteSchema />
      <FAQPageSchema faqs={LANDING_PAGE_FAQS} />
    </>
  );
}
