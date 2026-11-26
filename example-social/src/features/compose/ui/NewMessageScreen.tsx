/**
 * "New message": pick a person. `openConversation` finds or creates the
 * conversation on the server, then the thread is pushed inside the sheet
 * (`/compose/thread/[id]`). Closing from the thread goes back to this list;
 * closing from here collapses the sheet into the card.
 *
 * This screen combines two features (people search, messages), so it lives
 * in the compose feature, which is allowed to depend on both.
 */

import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View, type ListRenderItem } from 'react-native';

import type { User } from '../../../core/api/dto';
import { theme } from '../../../shared/theme';
import { QueryState, errorText } from '../../../shared/ui/QueryState';
import { SheetHeader } from '../../../shared/ui/SheetHeader';
import { useOpenConversationMutation } from '../../messages';
import { PersonRow, SearchField, useSearchUsersQuery } from '../../people';

const EMPTY: User[] = [];
const keyOf = (u: User) => u.id;

export function NewMessageScreen() {
  const [q, setQ] = useState('');
  const people = useSearchUsersQuery(q);
  const [openConversation, opening] = useOpenConversationMutation();
  const [pending, setPending] = useState<string | null>(null);

  const open = useCallback(
    async (user: User) => {
      setPending(user.id);
      try {
        const conversation = await openConversation({ userId: user.id }).unwrap();
        router.push({ pathname: '/compose/thread/[id]', params: { id: conversation.id } });
      } catch {
        // Error shown above the list.
      } finally {
        setPending(null);
      }
    },
    [openConversation],
  );

  // Depends on `pending`, so the rows render again when a row starts or stops loading.
  const renderItem = useCallback<ListRenderItem<User>>(
    ({ item }) => (
      <PersonRow
        user={item}
        onPress={open}
        detail="chevron"
        pending={pending === item.id}
        disabled={pending !== null}
        testID={`contact-${item.handle}`}
      />
    ),
    [open, pending],
  );

  return (
    <View style={styles.screen}>
      <SheetHeader title="New message" />
      <SearchField onQuery={setQ} placeholder="To: search people" />
      {opening.error ? <Text style={styles.error}>{errorText(opening.error)}</Text> : null}
      <FlatList
        data={people.data ?? EMPTY}
        keyExtractor={keyOf}
        renderItem={renderItem}
        extraData={pending}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<QueryState isLoading={people.isLoading} error={people.error} onRetry={people.refetch} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  error: { color: theme.like, paddingHorizontal: 16, paddingBottom: 8 },
});
