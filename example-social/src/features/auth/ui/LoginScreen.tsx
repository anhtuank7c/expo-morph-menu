/**
 * Sign-in screen. Shown by `Stack.Protected` while there is no session.
 */

import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_ACCOUNT } from '../../../backend';
import { selectLastAuthError } from '../../../core/session/authSlice';
import { theme } from '../../../shared/theme';
import { useAppSelector } from '../../../store/hooks';
import { useLoginMutation } from '../api/authApi';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  network_error: 'Could not reach the server. Check your connection and try again.',
  refresh_token_reused: 'Your session was revoked for security reasons. Sign in again.',
  session_revoked: 'Your session ended. Sign in again.',
  refresh_token_expired: 'Your session expired. Sign in again.',
};

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  // Prefilled with the demo account of the mock backend.
  const [email, setEmail] = useState(DEMO_ACCOUNT.email);
  const [password, setPassword] = useState(DEMO_ACCOUNT.password);
  const [login, { isLoading }] = useLoginMutation();
  // Only the error string: selecting the whole auth slice would re-render on every token refresh.
  const lastError = useAppSelector(selectLastAuthError);
  const submit = useCallback(() => login({ email, password }), [login, email, password]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>m</Text>
        </View>
        <Text style={styles.title}>Sign in to Murmur</Text>
        <Text style={styles.subtitle}>Example app for expo-morph-menu. All data is mock data.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          testID="login-email"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          onSubmitEditing={submit}
          testID="login-password"
        />
        {lastError ? <Text style={styles.error}>{MESSAGES[lastError] ?? `Sign-in failed (${lastError}).`}</Text> : null}
        <Pressable
          style={[styles.button, isLoading && styles.busy]}
          disabled={isLoading}
          onPress={submit}
          testID="login-submit"
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
        <Text style={styles.hint}>
          Demo account: {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </Text>
      </View>

      <Link href="/dev" style={styles.devLink}>
        Network and session debug
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, paddingHorizontal: 24, justifyContent: 'space-between' },
  brand: { alignItems: 'center', gap: 8 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: -4 },
  title: { fontSize: 26, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textMuted, textAlign: 'center' },
  form: { gap: 12 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.text,
  },
  error: { color: theme.like, fontSize: 14 },
  button: { height: 50, borderRadius: 25, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  busy: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { color: theme.textMuted, fontSize: 13, textAlign: 'center' },
  devLink: { color: theme.accent, textAlign: 'center', fontWeight: '600' },
});
