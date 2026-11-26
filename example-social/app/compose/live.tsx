/**
 * "Go live": `startLive` creates a broadcast on the server, then `getLive`
 * polls it every second for the viewer count. "End" sends `endLive` and
 * closes the sheet and the menu. Leaving with the close button also ends
 * the broadcast (cleanup on unmount).
 */

import { Ionicons } from '@expo/vector-icons';
import { useMorphDismiss } from 'expo-morph-menu';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEndLiveMutation, useGetLiveQuery, useStartLiveMutation } from '../../api/murmurApi';
import { errorText } from '../../components/QueryState';
import { SheetHeader } from '../../components/SheetHeader';
import { theme } from '../../theme';

export default function GoLive() {
  const dismiss = useMorphDismiss();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [startLive, start] = useStartLiveMutation();
  const [endLive, end] = useEndLiveMutation();
  const liveId = start.data?.id;
  const { data: live } = useGetLiveQuery(liveId ?? '', { skip: !liveId, pollingInterval: 1000 });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!liveId) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [liveId]);

  // Ending the broadcast when the screen goes away for any reason.
  const liveRef = useRef<string | undefined>(undefined);
  liveRef.current = liveId;
  useEffect(() => () => void (liveRef.current && endLive(liveRef.current)), [endLive]);

  const elapsed = live ? Math.floor((now - live.startedAt) / 1000) : 0;
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const finish = async () => {
    if (liveId) await endLive(liveId);
    liveRef.current = undefined;
    dismiss({ closeMenu: true });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SheetHeader title={liveId ? '' : 'Go live'} dark />
      <View style={styles.preview}>
        <Ionicons name="videocam" size={56} color="rgba(255,255,255,0.25)" />
        {live && (
          <View style={styles.badges}>
            <View style={styles.live}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{clock}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="eye" size={13} color="#fff" />
              <Text style={styles.pillText}>{live.viewers}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        {start.error ? <Text style={styles.error}>{errorText(start.error)}</Text> : null}
        {!liveId ? (
          <>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Add a title"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.title}
            />
            <Pressable style={styles.start} disabled={start.isLoading} onPress={() => startLive({ title })} testID="live-start">
              {start.isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.startText}>Start broadcast</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.streamTitle}>{live?.title ?? start.data?.title}</Text>
            <Pressable style={styles.end} disabled={end.isLoading} onPress={finish} testID="live-end">
              {end.isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.startText}>End</Text>}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0a10' },
  preview: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    backgroundColor: '#1c1a26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', gap: 8 },
  live: { backgroundColor: theme.live, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  liveText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  controls: { paddingHorizontal: 16, gap: 12 },
  title: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
  },
  error: { color: '#fca5a5', textAlign: 'center' },
  streamTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  start: { height: 50, borderRadius: 25, backgroundColor: theme.live, alignItems: 'center', justifyContent: 'center' },
  end: { height: 50, borderRadius: 25, backgroundColor: '#3f3c4a', alignItems: 'center', justifyContent: 'center' },
  startText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
