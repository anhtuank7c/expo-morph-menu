import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

/** Human-readable text for an RTK Query error. */
export function errorText(error: FetchBaseQueryError | SerializedError | undefined) {
  if (!error) return '';
  if ('status' in error) {
    if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR')
      return 'Could not reach the server.';
    const body = error.data as { message?: string } | undefined;
    if (typeof error.status === 'number') return body?.message ?? `Request failed (${error.status}).`;
  }
  return 'Something went wrong.';
}

/**
 * Loading and error states for a query. The base query has already retried
 * with backoff by the time an error reaches the screen, so the user gets a
 * manual retry button.
 */
export function QueryState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.box}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (!error) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{errorText(error)}</Text>
      <Pressable style={styles.button} onPress={onRetry} testID="query-retry">
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  text: { color: theme.textMuted, textAlign: 'center' },
  button: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: { color: theme.text, fontWeight: '600' },
});
