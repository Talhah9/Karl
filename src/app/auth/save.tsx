import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { linkOAuth } from '@/lib/oauthHelper';

type LoadingState = 'email' | 'google' | 'apple' | null;
type Screen = 'main' | 'email-form' | 'email-sent';

export default function SaveAccountScreen() {
  const params = useLocalSearchParams<{ return?: string }>();
  const returnPath = params.return ? `/${params.return}` : null;

  const [screen, setScreen] = useState<Screen>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState('');

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  function afterSuccess() {
    if (returnPath) router.replace(returnPath as any);
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  async function handleGoogle() {
    setError('');
    setLoading('google');
    const err = await linkOAuth('google');
    setLoading(null);
    if (err) { setError(err); return; }
    afterSuccess();
  }

  async function handleApple() {
    setError('');
    setLoading('apple');
    const err = await linkOAuth('apple');
    setLoading(null);
    if (err) { setError(err); return; }
    afterSuccess();
  }

  async function handleEmail() {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || password.length < 6) {
      setError('Email valide et mot de passe (min. 6 caractères) requis.');
      return;
    }
    setError('');
    setLoading('email');
    const redirectTo = Linking.createURL('auth/callback');
    const { error: err } = await supabase.auth.updateUser({
      email: trimEmail,
      password,
      data: { emailRedirectTo: redirectTo },
    });
    setLoading(null);
    if (err) { setError(err.message); return; }
    setScreen('email-sent');
  }

  if (screen === 'email-sent') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centeredContent}>
          <Text style={{ fontSize: 48 }}>📬</Text>
          <Text style={styles.title}>Vérifie ta boîte mail</Text>
          <Text style={styles.sub}>
            Un lien de confirmation a été envoyé à{' '}
            <Text style={{ fontFamily: 'Sora_700Bold', color: C.purple }}>{email.trim()}</Text>.{'\n'}
            Clique dessus pour activer ton compte. Tes données sont déjà sauvegardées.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={dismiss}>
            <Text style={styles.primaryBtnText}>OK, compris</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'email-form') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.centeredContent} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setScreen('main')} style={styles.backRow}>
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>

            <Text style={styles.title}>Mon email</Text>
            <Text style={styles.sub}>Ton compte sera lié à cet email. Tes données ne bougent pas.</Text>

            <View style={styles.formBlock}>
              <TextInput
                style={styles.input}
                placeholder="adresse@email.com"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe (min. 6 caractères)"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, (!email || !password || loading === 'email') && { opacity: 0.5 }]}
              onPress={handleEmail}
              disabled={!email || !password || loading === 'email'}
            >
              {loading === 'email'
                ? <ActivityIndicator color={C.dark} />
                : <Text style={styles.primaryBtnText}>Créer mon compte</Text>
              }
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Main screen
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <View style={{ width: 40 }} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={dismiss} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <KarlMascot size={62} color={C.purple} />
          <Text style={styles.title}>Sauvegarde tes données</Text>
          <Text style={styles.sub}>
            Crée un compte gratuit pour retrouver tes transactions, charges et objectifs sur n'importe quel appareil.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Apple */}
        <Pressable
          style={[styles.appleBtn, loading && { opacity: 0.6 }]}
          onPress={handleApple}
          disabled={!!loading}
        >
          {loading === 'apple'
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={styles.appleBtnIcon}></Text>
                <Text style={styles.appleBtnText}>Continuer avec Apple</Text>
              </>
          }
        </Pressable>

        {/* Google */}
        <Pressable
          style={[styles.googleBtn, loading && { opacity: 0.6 }]}
          onPress={handleGoogle}
          disabled={!!loading}
        >
          {loading === 'google'
            ? <ActivityIndicator color={C.dark} />
            : <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Continuer avec Google</Text>
              </>
          }
        </Pressable>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>ou</Text>
          <View style={styles.orLine} />
        </View>

        {/* Email */}
        <Pressable
          style={[styles.emailBtn, loading && { opacity: 0.6 }]}
          onPress={() => setScreen('email-form')}
          disabled={!!loading}
        >
          <Text style={styles.emailBtnText}>Utiliser mon email →</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable onPress={() => router.push('/auth/sign-in')}>
            <Text style={styles.footerLink}>Déjà un compte ? Se connecter</Text>
          </Pressable>
          <Pressable onPress={dismiss} style={{ marginTop: 6 }}>
            <Text style={styles.laterLink}>Plus tard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontFamily: 'Sora_400Regular', fontSize: 16, color: C.muted },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  hero: { alignItems: 'center', gap: 14, marginTop: 12, marginBottom: 8 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },

  appleBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleBtnIcon: { fontFamily: 'Sora_700Bold', fontSize: 18, color: '#fff' },
  appleBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },

  googleBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: { fontFamily: 'Sora_800ExtraBold', fontSize: 18, color: '#4285F4' },
  googleBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#1a1a1a' },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: C.line },
  orText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },

  emailBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.purple },

  footer: { alignItems: 'center', marginTop: 8, gap: 4 },
  footerLink: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  laterLink: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.surf3 },

  // Email form
  backRow: { marginBottom: 8 },
  backText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  formBlock: { gap: 10 },
  input: {
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Sora_400Regular',
    fontSize: 15,
    color: C.text,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.dark },
  errorText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.warm,
    textAlign: 'center',
  },

  // Centered layout (email-sent)
  centeredContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 32,
  },
});
