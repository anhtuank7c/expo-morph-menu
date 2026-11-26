import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { useDebounced } from '../../../shared/lib/useDebounced';
import { theme } from '../../../shared/theme';

/**
 * Search input with its own state. Each keystroke renders only this
 * component; the screen receives the debounced, normalized query.
 */
export const SearchField = memo(function SearchField({
  onQuery,
  busy,
  placeholder = 'Search people',
}: {
  onQuery: (query: string) => void;
  busy?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const query = useDebounced(text.trim().toLowerCase());
  useEffect(() => onQuery(query), [query, onQuery]);

  return (
    <View style={styles.field}>
      <Ionicons name="search" size={18} color={theme.textMuted} />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        testID="search-input"
      />
      {busy && <ActivityIndicator size="small" color={theme.textMuted} />}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.surface,
  },
  input: { flex: 1, fontSize: 15, color: theme.text },
});
