/**
 * SEO page redirect - all SEO functionality has moved to /marketing.
 */

import { redirect } from 'next/navigation';

export default function SEORedirect() {
  redirect('/marketing');
}
