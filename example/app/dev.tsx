/** Network and session debug screen (shared component, see example-shared/ui). */

import { NetworkPanel } from '../../example-shared/ui/NetworkPanel';
import { server } from '../api/server';

export default function DevScreen() {
  return <NetworkPanel control={server.control} accent="#0a84ff" />;
}
