/** Network and session debug screen, opened from the pulse icon or the sign-in screen. */

import { useCallback } from 'react';

import { server } from '../../../backend';
import { theme } from '../../../shared/theme';
import { useAppSelector } from '../../../store/hooks';
import { selectIsSignedIn, useLogoutMutation } from '../../auth';
import { NetworkPanel } from './NetworkPanel';

export function DevScreen() {
  const [logout] = useLogoutMutation();
  const signedIn = useAppSelector(selectIsSignedIn);
  const signOut = useCallback(() => void logout(), [logout]);
  return <NetworkPanel control={server.control} accent={theme.accent} onSignOut={signedIn ? signOut : undefined} />;
}
