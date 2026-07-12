import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function NameScreen() {
  const { setUserName } = useApp();
  const [name, setName] = useState('');

  function handleContinue() {
    const trimmed = name.trim();
    if (trimmed) setUserName(trimmed);
    router.push('/onboarding/profile');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Comment veux-tu{'\n'}que je t'appelle ?</Text>
              <Text style={styles.sub}>
                Je l'utiliserai pour personnaliser nos échanges. Tu pourras le changer plus tard.
              </Text>
            </View>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ton prénom ou pseudo"
              placeholderTextColor={C.muted}
              autoFocus
              autoCorrect={false}
              autoCapitalize="words"
              maxLength={30}
              selectionColor={C.lime}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />

            <View style={styles.karlRow}>
              <KarlMascot size={34} />
              <Text style={styles.karlText}>
                {name.trim()
                  ? `Salut ${name.trim()} ! Ravi de faire ta connaissance. 👋`
                  : 'Tu peux aussi passer cette étape — je t\'appellerai "toi".'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button onPress={handleContinue}>
              {name.trim() ? 'Continuer' : 'Passer'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28 },
  scroll: { flex: 1 },
  scrollContent: { gap: 28, paddingBottom: 16 },

  header: { gap: 10 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 26,
    color: C.text,
    letterSpacing: -1,
    lineHeight: 30,
  },
  sub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.muted,
    lineHeight: 19,
  },

  input: {
    fontFamily: 'Sora_700Bold',
    fontSize: 28,
    color: C.text,
    letterSpacing: -0.5,
    borderBottomWidth: 2,
    borderBottomColor: C.lime,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },

  karlRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 14,
  },
  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.text,
    flex: 1,
  },

  footer: {},
});
