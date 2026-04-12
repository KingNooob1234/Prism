import React, { useState, useEffect, useRef } from 'react';
import { Search, Bot, ArrowLeft, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

function getConvId(emailA, emailB) {
    return [emailA, emailB].sort().join('__');
}

function ChatView({ partnerEmail, partnerName, partnerAvatar, isAI, currentUser, onBack }) {
    const convId = isAI ? `ai__${currentUser.email}` : getConvId(currentUser.email, partnerEmail);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (isAI) {
            // Load AI conversation from localStorage
            const saved = localStorage.getItem(convId);
            setMessages(saved ? JSON.parse(saved) : [{ id: 'welcome', role: 'ai', text: "Hey! I'm your AI assistant. Ask me anything! 🤖", created_date: new Date().toISOString() }]);
            setIsLoading(false);
            return;
        }
        base44.entities.Message.filter({ conversation_id: convId }, 'created_date', 100)
            .then(data => { setMessages(data || []); setIsLoading(false); })
            .catch(() => setIsLoading(false));

        const unsub = base44.entities.Message.subscribe(event => {
            if (event.type === 'create' && event.data?.conversation_id === convId) {
                setMessages(prev => prev.find(m => m.id === event.data.id) ? prev : [...prev, event.data]);
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
            }
        });
        return unsub;
    }, [convId, isAI]);

    useEffect(() => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }, [messages.length]);

    const saveAIMessages = (msgs) => {
        localStorage.setItem(convId, JSON.stringify(msgs));
    };

    const send = async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');

        if (isAI) {
            const userMsg = { id: Date.now(), role: 'user', text, created_date: new Date().toISOString() };
            const newMsgs = [...messages, userMsg];
            setMessages(newMsgs);
            saveAIMessages(newMsgs);
            setIsAITyping(true);
            try {
                // Gather context: date/time, recent posts, comments
                let contextData = '';
                try {
                    const now = new Date();
                    contextData += `Current date and time: ${now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}.\n`;
                    const [recentPosts, recentComments] = await Promise.all([
                        base44.entities.Post.list('-created_date', 10),
                        base44.entities.Comment.list('-created_date', 20)
                    ]);
                    if (recentPosts?.length) {
                        contextData += `\nRecent posts on the platform (${recentPosts.length}):\n`;
                        recentPosts.forEach((p, i) => {
                            contextData += `  ${i + 1}. "${p.caption || 'No caption'}" by ${p.username || p.created_by || 'unknown'} — ${p.likes || 0} likes, ${p.comments || 0} comments\n`;
                        });
                    }
                    if (recentComments?.length) {
                        contextData += `\nRecent comments (${recentComments.length}):\n`;
                        recentComments.slice(0, 10).forEach((c, i) => {
                            contextData += `  ${i + 1}. ${c.username || 'user'}: "${c.text}"\n`;
                        });
                    }
                    contextData += `\nCurrent user: ${currentUser?.full_name || currentUser?.email || 'unknown'}\n`;
                } catch (_) {}

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: `You are a friendly AI assistant inside a social media app called Vybe. You have access to real platform data and know the current date/time. Keep responses short and conversational.\n\n${contextData}\nUser says: ${text}`
                });
                const aiMsg = { id: Date.now() + 1, role: 'ai', text: response, created_date: new Date().toISOString() };
                const finalMsgs = [...newMsgs, aiMsg];
                setMessages(finalMsgs);
                saveAIMessages(finalMsgs);
            } catch (_) {
                const errMsg = { id: Date.now() + 1, role: 'ai', text: "Sorry, I couldn't respond right now.", created_date: new Date().toISOString() };
                const finalMsgs = [...newMsgs, errMsg];
                setMessages(finalMsgs);
                saveAIMessages(finalMsgs);
            }
            setIsAITyping(false);
            return;
        }

        const optimistic = { id: Date.now(), conversation_id: convId, sender_email: currentUser.email, text, created_date: new Date().toISOString() };
        setMessages(p => [...p, optimistic]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        base44.entities.Message.create({ conversation_id: convId, sender_email: currentUser.email, sender_name: currentUser.full_name || 'Me', sender_avatar: currentUser.avatar_url || '', text, recipient_email: partnerEmail }).catch(() => {});
    };

    const isMe = (m) => isAI ? m.role === 'user' : m.sender_email === currentUser.email;

    return (
        <div className="flex flex-col h-screen bg-[#050505] text-white">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#050505]/90 backdrop-blur-2xl shrink-0"
                style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                <button onClick={onBack} className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 shrink-0 flex items-center justify-center">
                    {isAI ? <Bot className="w-5 h-5 text-white/70" /> :
                        partnerAvatar ? <img src={partnerAvatar} className="w-full h-full object-cover" alt={partnerName} /> :
                            <div className="w-full h-full flex items-center justify-center text-white/60 font-bold text-sm">{(partnerName || '?')[0].toUpperCase()}</div>}
                </div>
                <div>
                    <p className="font-semibold text-sm">{partnerName}</p>
                    {isAI && <p className="text-[11px] text-purple-400">AI Assistant</p>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ overscrollBehavior: 'contain' }}>
                {isLoading && <p className="text-center text-white/40 text-sm">Loading...</p>}
                {messages.map(m => {
                    const mine = isMe(m);
                    return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[78%] flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm ${mine ? 'bg-white text-black rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}>
                                    {m.text}
                                </div>
                                {m.created_date && <span className="text-[10px] text-white/30 px-1">{format(new Date(m.created_date), 'HH:mm')}</span>}
                            </div>
                        </div>
                    );
                })}
                {isAITyping && (
                    <div className="flex justify-start">
                        <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 rounded-bl-sm">
                            <div className="flex gap-1 items-center h-4">
                                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-white/5 flex gap-2 items-center bg-[#050505]/90 backdrop-blur-2xl shrink-0"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()} placeholder={isAI ? 'Ask anything...' : 'Message...'}
                    className="flex-1 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                <button onClick={send} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white text-black rounded-full">
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default function Messages() {
    const [activeChat, setActiveChat] = useState(null);
    const [query, setQuery] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const me = await base44.auth.me();
                setCurrentUser(me);
                // Show all other users — no friend requirement for messaging
                const allUsers = await base44.entities.User.list();
                setUsers(allUsers.filter(u => u.email !== me.email));
            } catch (_) {}
            setIsLoading(false);
        };
        load();
    }, []);

    if (!currentUser && !isLoading) return (
        <div className="h-screen bg-[#050505] flex items-center justify-center">
            <p className="text-white/40 text-sm">Sign in to use Messages</p>
        </div>
    );

    // ChatView renders its own full screen with no dock
    if (activeChat) return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#050505' }}>
            <ChatView
                partnerEmail={activeChat.email}
                partnerName={activeChat.full_name || activeChat.email}
                partnerAvatar={activeChat.avatar_url}
                isAI={activeChat.isAI}
                currentUser={currentUser}
                onBack={() => setActiveChat(null)}
            />
        </div>
    );

    const filtered = users.filter(u =>
        !query || (u.full_name || '').toLowerCase().includes(query.toLowerCase()) || (u.email || '').toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="h-screen w-full bg-[#050505] text-white overflow-y-auto pb-36 [&::-webkit-scrollbar]:hidden">
            <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-5 py-4"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
                <h1 className="text-xl font-bold mb-4">Messages</h1>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users..."
                        className="w-full border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-sm"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                </div>
            </div>

            <div className="px-3 py-3 space-y-1">
                {/* AI Assistant always first */}
                {!query && (
                    <div onClick={() => setActiveChat({ isAI: true, full_name: 'AI Assistant', email: 'ai', avatar_url: null })}
                        className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 transition-colors cursor-pointer border border-purple-500/20 bg-purple-500/5">
                        <div className="relative shrink-0 w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                            <Bot className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-white">AI Assistant</p>
                            <p className="text-xs text-purple-400/80">Ask me anything</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                    </div>
                )}

                {isLoading && <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}
                {!isLoading && filtered.length === 0 && !query && <p className="text-center text-white/40 text-sm py-8">No other users yet</p>}
                {filtered.map(u => (
                    <div key={u.id} onClick={() => setActiveChat(u)}
                        className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden bg-white/10">
                            {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/60 font-bold">{(u.full_name || u.email || '?')[0].toUpperCase()}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-white">{u.full_name || u.email}</p>
                            <p className="text-xs text-white/40 truncate">{u.email}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}