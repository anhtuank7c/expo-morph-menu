/**
 * Debug screen for the mock backend: session, fault injection and a log of
 * every HTTP attempt made by the base query.
 *
 * Try:
 * - "Expire access token": the next request gets 401 token_expired, the
 *   client refreshes once and repeats the request.
 * - "Revoke session": the refresh fails and the app signs out.
 * - Chaos "High": watch retries with backoff, 429 with Retry-After, and
 *   writes replayed through their Idempotency-Key.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import type { ChaosLevel, MockServerControl } from '../api/mockServer';
import { selectAuth, type AuthState } from '../store/authSlice';
import { networkActions, selectNetworkEntries, type NetworkEntry } from '../store/networkSlice';

type RootLike = { auth: AuthState; network: { entries: NetworkEntry[] } };

const LEVELS: ChaosLevel[] = ['off', 'low', 'high'];

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function outcomeColor(entry: NetworkEntry) {
  if (entry.outcome === undefined) return '#8e8e93';
  if (typeof entry.outcome === 'number') {
    if (entry.outcome < 300) return '#16a34a';
    if (entry.outcome === 401) return '#d97706';
    return '#dc2626';
  }
  return '#dc2626';
}

export function NetworkPanel({
  control,
  onSignOut,
  accent = '#6d28d9',
}: {
  control: MockServerControl;
  onSignOut?: () => void;
  accent?: string;
}) {
  const dispatch = useDispatch();
  const auth = useSelector((s: RootLike) => selectAuth(s));
  const entries = useSelector((s: RootLike) => selectNetworkEntries(s));
  const server = useSyncExternalStore(control.subscribe, control.getState);
  const now = useNow();
  const expiresIn = auth.accessExpiresAt ? Math.round((auth.accessExpiresAt - now) / 1000) : null;

  return (
    <FlatList
      style={styles.screen}
      data={entries}
      keyExtractor={(e) => String(e.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.section}>Session</Text>
          <View style={styles.card}>
            <Row label="Status" value={auth.status} />
            <Row label="User" value={auth.userId ?? 'none'} />
            <Row
              label="Access token"
              value={expiresIn === null ? 'none' : expiresIn > 0 ? `expires in ${expiresIn} s` : 'expired'}
            />
            <Row label="Refreshes" value={String(auth.refreshCount)} />
            {auth.lastError ? <Row label="Last error" value={auth.lastError} /> : null}
          </View>
          <View style={styles.buttons}>
            <Button label="Expire access token" onPress={control.expireAccessTokens} />
            <Button label="Revoke session" onPress={control.revokeSessions} />
            {onSignOut ? <Button label="Sign out" onPress={onSignOut} /> : null}
          </View>

          <Text style={styles.section}>Fault injection</Text>
          <View style={styles.segments}>
            {LEVELS.map((level) => (
              <Pressable
                key={level}
                onPress={() => control.setChaos(level)}
                style={[styles.segment, server.chaos === level && { backgroundColor: accent }]}
                testID={`chaos-${level}`}
              >
                <Text style={[styles.segmentText, server.chaos === level && { color: '#fff' }]}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            Off: no faults. Low and high: network errors, 503, 429 with Retry-After, and lost responses after the server
            has committed a write. Latency {server.latencyMs[0]} to {server.latencyMs[1]} ms. Access tokens live{' '}
            {server.accessTtlSec} s.
          </Text>

          <View style={styles.logHeader}>
            <Text style={styles.section}>Requests</Text>
            <Pressable onPress={() => dispatch(networkActions.cleared())} hitSlop={8}>
              <Text style={[styles.link, { color: accent }]}>Clear</Text>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No requests yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.entry}>
          <View style={[styles.status, { backgroundColor: outcomeColor(item) }]}>
            <Text style={styles.statusText}>{item.outcome ?? '...'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.url} numberOfLines={1}>
              {item.method} {item.url}
            </Text>
            <Text style={styles.meta}>
              {item.attempt > 0 ? `retry ${item.attempt} · ` : ''}
              {item.durationMs !== undefined ? `${item.durationMs} ms` : 'pending'}
              {item.note ? ` · ${item.note}` : ''}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f5fa' },
  header: { padding: 16, gap: 10 },
  section: { fontSize: 13, fontWeight: '700', color: '#6b6878', textTransform: 'uppercase', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  label: { color: '#6b6878', fontSize: 14 },
  value: { color: '#16141f', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: '#16141f', fontWeight: '600', fontSize: 13 },
  segments: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segmentText: { fontWeight: '600', color: '#16141f', textTransform: 'capitalize' },
  hint: { color: '#6b6878', fontSize: 12, lineHeight: 17 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  link: { fontWeight: '600' },
  empty: { color: '#6b6878', paddingHorizontal: 16 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e7e5ee',
  },
  status: { minWidth: 58, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  url: { fontSize: 13, color: '#16141f', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  meta: { fontSize: 12, color: '#6b6878', marginTop: 2 },
});
