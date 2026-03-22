import { redirect } from 'next/navigation';

/**
 * Root page redirects to dashboard (authenticated) or login.
 * The middleware handles auth checking.
 */
export default function Home() {
  redirect('/dashboard');
}
