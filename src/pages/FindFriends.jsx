import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Clock, CheckCircle, Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildLoginUrl } from '@/lib/app-params';

export default function FindFriends() {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [sentRequests, setSentRequests] = useState({}); // to_email -> status
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('discover'); // discover | requests

    useEffect(() => {
        const load = async () => {
            try {
                const me = await base44.auth.me();
                setCurrentUser(me);
                const [allUsers, allRequests] = await Promise.all([
                    base44.entities.User.list(),
                    base44.entities.FriendRequest.list(),
                ]);
                setUsers(allUsers.filter(u => u.email !== me.email));
                // Build sent map from requests where I am the sender
                const sentMap = {};
                const incoming = [];
                (allRequests || []).forEach(r => {
                    if (r.from_email === me.email) {
                        sentMap[r.to_email] = r.status;
                    } else if (r.to_email === me.email && r.status === 'pending') {
                        incoming.push(r);
                    }
                });
                setSentRequests(sentMap);
                setIncomingRequests(incoming);
            } catch (_) {}
            setIsLoading(false);
        };
        load();
    }, []);

    // Real-time friend request updates
    useEffect(() => {
        const unsub = base44.entities.FriendRequest.subscribe(event => {
            if (event.type === 'create' && event.data?.to_email === currentUser?.email) {
                setIncomingRequests(p => [...p, event.data]);
            }
            if (event.type === 'update') {
                setSentRequests(p => ({ ...p, [event.data.to_email]: event.data.status }));
                if (event.data.to_email === currentUser?.email || event.data.from_email === currentUser?.email) {
                    setIncomingRequests(p => p.map(r => r.id === event.id ? event.data : r));
                }
            }
        });
        return unsub;
    }, [currentUser?.email]);

    const sendRequest = async (targetUser) => {
        if (!currentUser) { window.location.href = buildLoginUrl(`${window.location.origin}${window.location.pathname}`); return; }
        setSentRequests(p => ({ ...p, [targetUser.email]: 'pending' }));
        base44.entities.FriendRequest.create({
            from_email: currentUser.email,
            from_name: currentUser.full_name || currentUser.email,
            from_avatar: currentUser.avatar_url || '',
            to_email: targetUser.email,
            status: 'pending',
        }).catch(() => setSentRequests(p => { const n = { ...p }; delete n[targetUser.email]; return n; }));
    };

    const respondToRequest = async (request, accept) => {
        const newStatus = accept ? 'accepted' : 'declined';
        setIncomingRequests(p => p.filter(r => r.id !== request.id));
        base44.entities.FriendRequest.update(request.id, { status: newStatus }).catch(() => {});
    };

    const filtered = users.filter(u =>
        !query || (u.full_name || '').toLowerCase().includes(query.toLowerCase()) || (u.email || '').toLowerCase().includes(query.toLowerCase())
    );

    const pendingCount = incomingRequests.filter(r => r.status === 'pending').length;

    if (!currentUser && !isLoading) return (
        <div className="h-screen bg-[#050505] flex items-center justify-center">
            <p className="text-white/40 text-sm">Sign in to find friends</p>
        </div>
    );

    return (
        <div className="h-screen w-full bg-[#050505] text-white overflow-y-auto pb-36 [&::-webkit-scrollbar]:hidden">
            <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-5 py-4"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold">Find Friends</h1>
                    <button onClick={() => setActiveTab(t => t === 'requests' ? 'discover' : 'requests')}
                        className="relative min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 border border-white/10 rounded-full">
                        <Bell className="w-5 h-5" />
                        {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">{pendingCount}</span>}
                    </button>
                </div>

                {/* Tab switcher */}
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-3">
                    <button onClick={() => setActiveTab('discover')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'discover' ? 'bg-white text-black' : 'text-white/60'}`}>Discover</button>
                    <button onClick={() => setActiveTab('requests')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all relative ${activeTab === 'requests' ? 'bg-white text-black' : 'text-white/60'}`}>
                        Requests {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
                    </button>
                </div>

                {activeTab === 'discover' && (
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people..."
                            className="w-full border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-sm"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    </div>
                )}
            </div>

            {/* Incoming requests tab */}
            {activeTab === 'requests' && (
                <div className="px-4 py-3 space-y-2">
                    {incomingRequests.filter(r => r.status === 'pending').length === 0 && (
                        <p className="text-center text-white/30 text-sm py-12">No pending requests</p>
                    )}
                    {incomingRequests.filter(r => r.status === 'pending').map(req => (
                        <div key={req.id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0">
                                {req.from_avatar ? <img src={req.from_avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-white/60 font-bold">{(req.from_name || '?')[0].toUpperCase()}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{req.from_name}</p>
                                <p className="text-white/40 text-xs">{req.from_email}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => respondToRequest(req, false)} className="min-w-[36px] min-h-[36px] flex items-center justify-center bg-white/10 border border-white/20 rounded-full text-sm font-semibold px-3">✕</button>
                                <button onClick={() => respondToRequest(req, true)} className="min-w-[36px] min-h-[36px] flex items-center justify-center bg-white text-black rounded-full text-sm font-semibold px-3">✓</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Discover tab */}
            {activeTab === 'discover' && (
                <div className="px-4 py-3 space-y-1">
                    {isLoading && <div className="flex justify-center py-12"><div style={{ width: 36, height: 36, animation: 'spinTri 1s linear infinite' }}><svg viewBox="0 0 40 40" width={36} height={36}><polygon points="20,4 36,34 4,34" fill="none" stroke="#ff4488" strokeWidth="3" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(255,80,120,0.8))' }} /></svg></div><style>{`@keyframes spinTri{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></div>}
                    {!isLoading && filtered.length === 0 && <p className="text-center text-white/30 text-sm py-12">No other users found</p>}
                    {filtered.map(u => {
                        const status = sentRequests[u.email];
                        return (
                            <div key={u.id} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 transition-colors">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0">
                                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt={u.full_name} /> : <div className="w-full h-full flex items-center justify-center text-white/60 font-bold">{(u.full_name || u.email || '?')[0].toUpperCase()}</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white text-sm">{u.full_name || 'Anonymous'}</p>
                                    <p className="text-white/40 text-xs truncate">{u.email}</p>
                                </div>
                                {status === 'accepted' ? (
                                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Friends</div>
                                ) : status === 'pending' ? (
                                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-semibold"><Clock className="w-3.5 h-3.5" /> Pending</div>
                                ) : (
                                    <button onClick={() => sendRequest(u)} className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 px-4 rounded-full bg-white text-black text-sm font-semibold active:scale-95 transition-all">
                                        <UserPlus className="w-4 h-4" /> Add
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}