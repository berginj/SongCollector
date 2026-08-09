import { useEffect, useState } from 'react';

export function useLoad<T>(loader: () => Promise<T>, dependencies: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    loader().then((value) => { if (active) setData(value); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Something went wrong.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // loader is intentionally represented by the caller's dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  return { data, setData, error, loading };
}
