/**
 * Opens an anonymous session when there is none: at start, and again after
 * the session is revoked (for example from the Network screen). Failed
 * attempts are retried with backoff by the base query; if they still fail,
 * this component tries again every 5 seconds.
 */

import { useEffect } from 'react';

import { selectAuth } from '../../example-shared/store/authSlice';
import { useStartSessionMutation } from '../api/sheetApi';
import { useAppSelector } from '../store';

export function SessionGate() {
  const { status } = useAppSelector(selectAuth);
  const [startSession] = useStartSessionMutation();

  useEffect(() => {
    if (status !== 'signedOut') return;
    startSession();
    const timer = setInterval(() => startSession(), 5000);
    return () => clearInterval(timer);
  }, [status, startSession]);

  return null;
}
