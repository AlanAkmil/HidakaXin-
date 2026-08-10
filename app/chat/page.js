'use client';

import { useEffect, useRef, useState } from 'react';
import { getChatMessages, sendChatMessage, subscribeChatMessages, isMyChatMessage, getProfile, setProfileName, trackMissionProgress, getSelectedBanner } from '../../lib/store';
import { BANNER_THEMES } from '../../lib/banners';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    setName(getProfile().name);
    trackMissionProgress('open_chat', 1);

    let active = true;
    getChatMessages().then((data) => {
      if (active) {
        setMessages(data);
        setLoaded(true);
      }
    });

    getSelectedBanner().then((id) => {
      const item = BANNER_THEMES.find((b) => b.id === id);
      if (active) setBannerUrl(item?.url || null);
    });

    // New messages arrive here in realtime for everyone connected — this
    // is what makes the chat actually shared instead of per-device.
    const unsubscribe = subscribeChatMessages((newMsg) => {
      setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const author = name.trim() || 'Anonim';
    setProfileName(author);
    setText('');
    // Don't manually append here — the realtime subscription above will
    // deliver this same message back once it's actually saved, keeping
    // the shown list in sync with what's really in the database.
    await sendChatMessage({ author, text: trimmed });
    trackMissionProgress('chat', 1);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-64px-84px)] max-w-3xl flex-col px-4 py-4">
      <div className="mb-3">
        <h1 className="font-display text-xl font-extrabold text-ink">Chat Publik</h1>
        <p className="text-xs text-ink-faint">Ngobrol bareng semua orang yang lagi buka HidakaXin, realtime.</p>
      </div>

      {/* Banner cuma jadi background KOTAK CHAT ini doang, gak nutupin
          seluruh halaman — biar bubble-nya tetep gampang dibaca. */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-line shadow-card">
        {bannerUrl && (
          <>
            <video src={bannerUrl} muted loop playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-paper/60 via-paper/75 to-paper/90" />
          </>
        )}
        <div className={`relative h-full space-y-2.5 overflow-y-auto p-3 ${!bannerUrl ? 'bg-paper-card' : ''}`}>
          {loaded && messages.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-faint">Belum ada obrolan. Mulai duluan yuk!</p>
          )}
          {messages.map((m) => {
            const mine = isMyChatMessage(m);
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[78%] gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-bold text-accent shadow">
                      {m.author.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div
                    className={`min-w-0 rounded-2xl px-3 py-2 shadow ${
                      mine ? 'rounded-tr-sm bg-accent text-white' : 'rounded-tl-sm bg-paper-card text-ink'
                    }`}
                  >
                    {!mine && <p className="mb-0.5 text-xs font-bold text-accent">{m.author}</p>}
                    <p className={`break-words text-sm ${mine ? 'text-white' : 'text-ink'}`}>{m.text}</p>
                    <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-ink-faint'}`}>
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama"
          maxLength={40}
          className="w-24 flex-shrink-0 rounded-full border border-line bg-paper-card px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan.."
          maxLength={500}
          className="flex-1 rounded-full border border-line bg-paper-card px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
