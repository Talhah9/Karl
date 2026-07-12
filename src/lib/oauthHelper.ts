import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export type OAuthProvider = 'google' | 'apple';

async function parseAndApplySession(url: string): Promise<string | null> {
  // PKCE code
  const queryStr = url.split('?')[1]?.split('#')[0] ?? '';
  const code = new URLSearchParams(queryStr).get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error?.message ?? null;
  }
  // Implicit / tokens in hash
  const hashStr = url.split('#')[1] ?? '';
  const hash = new URLSearchParams(hashStr);
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return error?.message ?? null;
  }
  return 'Impossible de récupérer la session OAuth';
}

// Use linkIdentity when the user is anonymous (preserves user_id)
export async function linkOAuth(provider: OAuthProvider): Promise<string | null> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  } as any);
  if (error) return error.message;
  const url = (data as any)?.url as string | undefined;
  if (!url) return 'URL OAuth manquante';

  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (result.type !== 'success') return null; // user cancelled — no error to show
  return parseAndApplySession(result.url);
}

// Use signInWithOAuth for returning users (new session, restores existing account)
export async function signInOAuth(provider: OAuthProvider): Promise<string | null> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return error.message;
  if (!data?.url) return 'URL OAuth manquante';

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  return parseAndApplySession(result.url);
}
