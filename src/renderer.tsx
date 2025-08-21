import React, { useState } from 'react';
const NS = 'atlas' as const;
export default function Panel() {
  const [result, setResult] = useState<string>('');
  async function onPing() {
    const res = await (window as any)[NS].ping();
    setResult(JSON.stringify(res));
  }
  return <button onClick={onPing}>Ping atlas</button>;
}