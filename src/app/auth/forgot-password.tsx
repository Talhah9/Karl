import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

import { C } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail) { setError('Renseigne ton adresse email.'); return; }
    setError('');
    setLoading(true);
    const redirectTo = Linking.createURL('auth/callback');
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimEmail, { redirectTo });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navBack}>← Retour</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          {sent ? (
            <>
              <Text style={{ fontSize: 44 }}>📬</Text>
              <Text style={styles.title}>Email envoyé !</Text>
              <Text style={styles.sub}>
                Si un compte existe pour{' '}
                <Text style={{ fontFamily: 'Sora_700Bold', color: C.purple }}>{email.trim()}</Text>
                , tu recevras un lien de réinitialisation dans quelques secondes.
              </Text>
              <Pressable style={styles.btn} onPress={() => router.back()}>
                <Text style={styles.btnText}>Retour à la connexion</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Mot de passe oublié ?</Text>
              <Text style={styles.sub}>Indique ton email et on t'envoie un lien de réinitialisation.</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TextInput
                style={styles.input}
                placeholder="adresse@email.com"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />

              <Pressable
                style={[styles.btn, (!email || loading) && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={!email || loading}
              >
                {loading
                  ? <ActivityIndicator color={C.dark} />
                  : <Text style={styles.btnText}>Envoyer le lien</Text>
                }
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  nav: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  navBack: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 40,
  },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: C.text, letterSpacing: -0.8 },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13.5, color: C.muted, lineHeight: 20 },
  input: {
    backgroundColor: C.surf, borderWidth: 1.5, borderColor: C.line,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Sora_400Regular', fontSize: 15, color: C.text,
  },
  btn: {
    height: 52, borderRadius: 26, backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.dark },
  errorText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.warm },
});
