import { router } from 'expo-router';
import { useState } from 'react';
import {
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

import { Button } from '@/components/ui/Button';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function EditNameScreen() {
  const { userName, setUserName } = useApp();
  const [name, setName] = useState(userName);

  function handleSave() {
    const trimmed = name.trim();
    setUserName(trimmed);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.nav}>
            <View style={{ width: 24 }} />
            <Text style={styles.navTitle}>Prénom / Pseudo</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.navClose}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Comment veux-tu{'\n'}que je t'appelle ?</Text>
              <Text style={styles.sub}>
                Laisse vide pour un message neutre ("Salut 👋").
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
              onSubmitEditing={handleSave}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button onPress={handleSave}>
              Enregistrer
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.text },
  navClose: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },
  scroll: { flex: 1 },
  scrollContent: { gap: 24, paddingBottom: 16 },
  header: { gap: 8 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.8,
  },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
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
  footer: { gap: 18 },
});
