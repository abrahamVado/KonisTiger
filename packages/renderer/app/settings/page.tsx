    'use client'
    import { useState, useEffect } from 'react';

    export default function SettingsPage() {
      const [theme, setTheme] = useState<'light'|'dark'|'system'>('system');
      const [locale, setLocale] = useState('en');
      const [auto, setAuto] = useState(true);

      useEffect(() => {
        (async () => {
          try {
            const t = await (window as any).api.settings.getTheme();
            const l = await (window as any).api.settings.getLocale();
            setTheme(t || 'system'); setLocale(l || 'en');
          } catch {}
        })();
      }, []);

      return (
        <main className="min-h-screen p-10">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <label className="w-32">Theme</label>
              <select value={theme} onChange={e => setTheme(e.target.value as any)} className="border rounded px-2 py-1">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
              <button className="ml-3 border px-3 py-1 rounded" onClick={() => (window as any).api.settings.setTheme(theme)}>Save</button>
            </div>
            <div className="flex gap-3 items-center">
              <label className="w-32">Locale</label>
              <select value={locale} onChange={e => setLocale(e.target.value)} className="border rounded px-2 py-1">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
                <option value="pt">Português</option>
                <option value="de">Deutsch</option>
              </select>
              <button className="ml-3 border px-3 py-1 rounded" onClick={() => (window as any).api.settings.setLocale(locale)}>Save</button>
            </div>
            <div className="flex gap-3 items-center">
              <label className="w-32">Auto-launch</label>
              <button className="border px-3 py-1 rounded" onClick={async () => {
                const res = await (window as any).api.app.setAutoLaunch(true);
                alert('Auto-launch enabled: ' + res.enabled);
              }}>Enable</button>
            </div>
          </div>
        </main>
      );
    }
    