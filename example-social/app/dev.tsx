/** Network and session debug screen (shared component, see example-shared/ui). */

import { NetworkPanel } from '../../example-shared/ui/NetworkPanel';
import { useLogoutMutation } from '../api/murmurApi';
import { server } from '../api/server';
import { selectIsSignedIn } from '../../example-shared/store/authSlice';
import { useAppSelector } from '../store';
import { theme } from '../theme';

export default function DevScreen() {
  const [logout] = useLogoutMutation();
  const signedIn = useAppSelector(selectIsSignedIn);
  return (
    <NetworkPanel control={server.control} accent={theme.accent} onSignOut={signedIn ? () => logout() : undefined} />
  );
}
