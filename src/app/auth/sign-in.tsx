import { router } from 'expo-router';
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

import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { signInOAuth } from '@/lib/oauthHelper';

type LoadingState = 'email' | 'google' | 'apple' | null;

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState('');

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  function afterSuccess() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  async function handleGoogle() {
    setError('');
    setLoading('google');
    const err = await signInOAuth('google');
    setLoading(null);
    if (err) { setError(err); return; }
    afterSuccess();
  }

  async function handleApple() {
    setError('');
    setLoading('apple');
    const err = await signInOAuth('apple');
    setLoading(null);
    if (err) { setError(err); return; }
    afterSuccess();
  }

  async function handleEmail() {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || !password) { setError('Remplis les deux champs.'); return; }
    setError('');
    setLoading('email');
    const { error: err } = await supabase.auth.signInWithPassword({ email: trimEmail, password });
    setLoading(null);
    if (err) { setError('Email ou mot de passe incorrect.'); return; }
    afterSuccess();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable onPress={goBack}>
          <Text style={styles.navBack}>← Retour</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <KarlMascot size={54} color={C.purple} />
            <Text style={styles.title}>Bon retour 👋</Text>
            <Text style={styles.sub}>Reconnecte-toi pour retrouver toutes tes données.</Text>
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
              placeholder="Mot de passe"
              placeholderTextColor={C.muted}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry
              autoComplete="current-password"
            />
            <Pressable onPress={() => router.push('/auth/forgot-password')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryBtn, (!email || !password || loading === 'email') && { opacity: 0.5 }]}
            onPress={handleEmail}
            disabled={!email || !password || loading === 'email'}
          >
            {loading === 'email'
              ? <ActivityIndicator color={C.dark} />
              : <Text style={styles.primaryBtnText}>Se connecter</Text>
            }
          </Pressable>

          <View style={styles.footer}>
            <Pressable onPress={() => router.push('/auth/save')}>
              <Text style={styles.footerLink}>Pas encore de compte ? Créer un compte</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  nav: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  navBack: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  content: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  hero: { alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: C.text, letterSpacing: -0.8 },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13.5, color: C.muted, textAlign: 'center' },

  appleBtn: {
    height: 52, borderRadius: 26, backgroundColor: '#000',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  appleBtnIcon: { fontFamily: 'Sora_700Bold', fontSize: 18, color: '#fff' },
  appleBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },

  googleBtn: {
    height: 52, borderRadius: 26, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  googleIcon: { fontFamily: 'Sora_800ExtraBold', fontSize: 18, color: '#4285F4' },
  googleBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#1a1a1a' },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: C.line },
  orText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },

  formBlock: { gap: 10 },
  input: {
    backgroundColor: C.surf, borderWidth: 1.5, borderColor: C.line,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Sora_400Regular', fontSize: 15, color: C.text,
  },
  forgotRow: { alignSelf: 'flex-end' },
  forgotText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },

  primaryBtn: {
    height: 52, borderRadius: 26, backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.dark },

  footer: { alignItems: 'center', marginTop: 6 },
  footerLink: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  errorText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.warm, textAlign: 'center' },
});
