/**
 * Social page redirect - all social functionality has moved to /marketing.
 */

import { redirect } from 'next/navigation';

export default function SocialRedirect() {
  redirect('/marketing');
}
