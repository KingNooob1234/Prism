import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RefreshCw } from 'lucide-react';
import FeedItem from '../components/FeedItem.jsx';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, sendNotification } from '../lib/useNotifications';
import { openLoginPopup } from '@/lib/app-params';

export default function Home() {
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('forYou');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [followingEmails, setFollowingEmails] = useState([]);
    const scrollRef = useRef(null);
    const touchStartY = useRef(0);
    const [pullY, setPullY] = useState(0);
    const isPulling = useRef(false);

    // Request notification permission on first load
    useEffect(() => { requestNotificationPermission(); }, []);

    useEffect(() => {
        base44.auth.me().then(u => {
            setUser(u);
            if (u) {
                // Load friends (accepted friend requests) as "following"
                base44.entities.FriendRequest.filter({ status: 'accepted' }).then(reqs => {
                    const emails = (reqs || []).flatMap(r =>
                        r.from_email === u.email ? [r.to_email] : r.to_email === u.email ? [r.from_email] : []
                    );
                    setFollowingEmails(emails);
                }).catch(() => {});
            }
        }).catch(() => {});
    }, []);

    const loadPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const dbPosts = await base44.entities.Post.list('-created_date', 30);
            if (activeTab === 'following') {
                if (!user) {
                    setPosts([]);
                } else {
                    setPosts(dbPosts.filter(p => followingEmails.includes(p.created_by)));
                }
            } else {
                setPosts(dbPosts || []);
            }
        } catch (_) {}
        setIsLoading(false);
    }, [activeTab, user, followingEmails]);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    // Real-time new post subscription
    useEffect(() => {
        const unsub = base44.entities.Post.subscribe(event => {
            if (event.type === 'create') {
                setPosts(p => [event.data, ...p]);
                sendNotification(
                    `${event.data.username || 'Someone'} posted`,
                    event.data.caption || 'New post on Vybe ✨'
                );
            }
            if (event.type === 'delete') setPosts(p => p.filter(x => x.id !== event.id));
        });
        return unsub;
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadPosts();
        setIsRefreshing(false);
        setPullY(0);
    };

    // Pull to refresh
    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchMove = (e) => {
        const el = scrollRef.current;
        if (!el || el.scrollTop > 0) return;
        const dy = e.touches[0].clientY - touchStartY.current;
        if (dy > 0) { isPulling.current = true; setPullY(Math.min(dy * 0.4, 80)); }
    };
    const onTouchEnd = () => {
        if (isPulling.current && pullY > 50) handleRefresh();
        else setPullY(0);
        isPulling.current = false;
    };

    return (
        <div className="relative h-screen w-full bg-black overflow-hidden">
            {/* Pull to refresh indicator */}
            {pullY > 0 && (
                <div className="absolute top-0 left-0 w-full z-50 flex justify-center pointer-events-none" style={{ transform: `translateY(${pullY - 40}px)`, paddingTop: 'env(safe-area-inset-top)' }}>
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-2">
                        <RefreshCw className={`w-4 h-4 text-white ${pullY > 50 ? 'animate-spin' : ''}`} />
                    </div>
                </div>
            )}
            {isRefreshing && (
                <div className="absolute top-0 left-0 w-full z-50 flex justify-center pointer-events-none pt-16" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }}>
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-2">
                        <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div className="absolute top-0 left-0 w-full bg-gradient-to-b from-black/80 via-black/40 to-transparent z-40 flex justify-center items-center space-x-6 text-white/90 font-medium tracking-wide pointer-events-none"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)', paddingBottom: '1.5rem' }}>
                <button className={`relative flex flex-col items-center pointer-events-auto transition-opacity ${activeTab === 'following' ? 'opacity-100 font-bold' : 'opacity-50'}`} onClick={() => { if (!user) { openLoginPopup(`${window.location.origin}${window.location.pathname}`); return; } setActiveTab('following'); }}>
                    Following
                    {activeTab === 'following' && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-white" />}
                </button>
                <button className={`relative flex flex-col items-center pointer-events-auto transition-opacity ${activeTab === 'forYou' ? 'opacity-100 font-bold' : 'opacity-50'}`} onClick={() => setActiveTab('forYou')}>
                    For You
                    {activeTab === 'forYou' && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-white" />}
                </button>
                <Link to={createPageUrl('Discover')} className="opacity-50 hover:opacity-100 transition-opacity pointer-events-auto">Discover</Link>
            </div>

            <div
                ref={scrollRef}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {isLoading && (
                    <div className="h-screen w-full flex items-center justify-center">
                        <div style={{ width: 44, height: 44, animation: 'spinTri 1s linear infinite' }}>
                            <svg viewBox="0 0 40 40" width={44} height={44}>
                                <polygon points="20,4 36,34 4,34" fill="none" stroke="#ff4488" strokeWidth="3" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(255,80,120,0.8))' }} />
                            </svg>
                        </div>
                        <style>{`@keyframes spinTri{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                    </div>
                )}
                {!isLoading && posts.length === 0 && (
                    <div className="h-screen w-full flex flex-col items-center justify-center gap-4 text-white/40 px-8 text-center">
                        <p className="text-lg">No posts yet</p>
                        <p className="text-sm">{activeTab === 'following' ? 'Add friends to see their posts here' : 'Be the first to post!'}</p>
                        {activeTab === 'following' && !user && <button onClick={() => { openLoginPopup(`${window.location.origin}${window.location.pathname}`); }} className="px-6 py-3 bg-white text-black font-semibold rounded-2xl text-sm">Sign In</button>}
                    </div>
                )}
                {posts.map((post, i) => (
                    <div key={post.id || i} className="h-screen w-full snap-start relative flex-shrink-0">
                        <FeedItem post={post} currentUser={user} />
                    </div>
                ))}
            </div>
        </div>
    );
}