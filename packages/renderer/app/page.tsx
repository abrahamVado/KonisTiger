    'use client'
    import { useEffect, useState } from 'react';
    import { FaCat } from 'react-icons/fa';

    export default function Page() {
      const [version, setVersion] = useState<string>('');
      useEffect(() => {
        // ping preload
        (async () => {
          try {
            const v = await (window as any).api?.app?.getVersion?.();
            setVersion(v || '');
          } catch {}
        })();
      }, []);
      return (
        <main className="min-h-screen grid place-items-center p-10">
          <div className="max-w-xl text-center space-y-4">
            <FaCat size={42} />
            <h1 className="text-3xl font-bold">KonisTiger</h1>
            <p className="opacity-70">Electron + Next.js scaffold is running.</p>
            <p className="text-sm opacity-60">App version: {version || 'dev'}</p>
          </div>
        </main>
      );
    }
    