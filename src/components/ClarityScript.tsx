'use client';

import Script from 'next/script';

/**
 * Microsoft Clarity analytics script
 *
 * Clarity provides:
 * - Heatmaps (click, scroll, area)
 * - Session recordings
 * - Insights dashboard
 *
 * Free tier includes unlimited data.
 * GDPR compliant when configured properly.
 *
 * To get your project ID:
 * 1. Sign up at https://clarity.microsoft.com
 * 2. Create a new project
 * 3. Copy the project ID from the setup page
 * 4. Add NEXT_PUBLIC_CLARITY_PROJECT_ID to your environment variables
 */
export function ClarityScript() {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  // Don't render if no Clarity ID is configured
  if (!clarityId) {
    return null;
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
    >
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityId}");
      `}
    </Script>
  );
}
