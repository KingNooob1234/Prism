import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Grid, UserPlus, CheckCircle, Lock, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildLoginUrl } from '@/lib/app-params';

export default function CreatorProfile() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const creatorEmail = params.get('email');
    const usernameParam = params.get('username') || '';
    const avatarParam = params.get('avatar') || '';

    const [currentUser, setCurrentUser] = useState(null);
    const [creatorUser, setCreatorUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [followStatus, setFollowStatus] = useState(null); // null | 'pending' | 'accepted'
    const [isLoading, setIsLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [friendRequestId, setFriendRequestId] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const me = await base44.auth.me().catch(() => null);
                setCurrentUser(me);

                if (!creatorEmail) {
                    // Guest post - no real account
                    setIsGuest(true);
                    setIsLoading(false);
                    return;
                }

                // Load real user info
                const allUsers = await base44.entities.User.list();
                const found = allUsers.find(u => u.email === creatorEmail);
                setCreatorUser(found || null);

                // Load their posts
                const creatorPosts = await base44.entities.Post.filter({ created_by: creatorEmail }, '-created_date', 30);
                setPosts(creatorPosts || []);

                // Check friend status
                if (me && me.email !== creatorEmail) {
                    const [sent] = await Promise.all([
                        base44.entities.FriendRequest.filter({ from_email: me.email, to_email: creatorEmail }),
                    ]);
                    if (sent?.[0]) {
                        setFollowStatus(sent[0].status);
                        setFriendRequestId(sent[0].id);
                    }
                }
            } catch (_) {}
            setIsLoading(false);
        };
        load();
    }, [creatorEmail]);

    const sendFriendRequest = async () => {
        if (!currentUser) { window.location.href = buildLoginUrl(`${window.location.origin}${window.location.pathname}`); return; }
        setFollowStatus('pending');
        const req = await base44.entities.FriendRequest.create({
            from_email: currentUser.email,
            from_name: currentUser.full_name || currentUser.email,
            from_avatar: currentUser.avatar_url || '',
            to_email: creatorEmail,
            status: 'pending',
        });
        setFriendRequestId(req?.id);
    };

    const openMessages = () => {
        navigate(createPageUrl('Messages'));
    };

    const displayName = creatorUser?.full_name || usernameParam || 'Unknown User';
    const displayAvatar = creatorUser?.avatar_url || avatarParam || '';
    const isSelf = currentUser?.email === creatorEmail;
    const isFriend = followStatus === 'accepted';

    return (
        <div className="h-screen w-full bg-[#050505] text-white overflow-y-auto pb-36 [&::-webkit-scrollbar]:hidden">
            <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-5 py-3 flex items-center gap-3"
                style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                <button onClick={() => navigate(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-semibold tracking-tight flex-1">{displayName}</h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                <div style={{ width: 44, height: 44, animation: 'spinTri 1s linear infinite' }}>
                    <svg viewBox="0 0 40 40" width={44} height={44}>
                        <polygon points="20,4 36,34 4,34" fill="none" stroke="#ff4488" strokeWidth="3" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(255,80,120,0.8))' }} />
                    </svg>
                </div>
                <style>{`@keyframes spinTri{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
            ) : isGuest ? (
                /* Guest creator */
                <div className="flex flex-col items-center justify-center py-20 gap-4 px-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="font-semibold text-white/80">Guest Creator</p>
                    <p className="text-white/40 text-sm">This content was posted by a guest. Their posts are private.</p>
                </div>
            ) : (
                <>
                    <div className="px-6 py-8 flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-30" />
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#050505] bg-white/10">
                                {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" alt={displayName} /> : <div className="w-full h-full flex items-center justify-center text-white/40 font-bold text-3xl">{displayName[0]?.toUpperCase()}</div>}
                            </div>
                        </div>
                        <h2 className="text-xl font-bold mt-4">{displayName}</h2>
                        <p className="text-white/50 text-sm mt-1">{creatorUser?.bio || ''}</p>

                        <div className="flex gap-10 mt-6 w-full max-w-sm justify-center">
                            <div className="flex flex-col items-center">
                                <span className="text-xl font-bold">{posts.length}</span>
                                <span className="text-[11px] text-white/50 uppercase tracking-wider mt-1">Posts</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xl font-bold">{posts.reduce((s, p) => s + (p.likes || 0), 0).toLocaleString()}</span>
                                <span className="text-[11px] text-white/50 uppercase tracking-wider mt-1">Likes</span>
                            </div>
                        </div>

                        {!isSelf && (
                            <div className="flex gap-3 mt-6 w-full max-w-sm">
                                {isFriend ? (
                                    <>
                                        <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm">
                                            <CheckCircle className="w-4 h-4" /> Friends
                                        </div>
                                        <button onClick={openMessages} className="flex-1 bg-white text-black font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                                            <MessageSquare className="w-4 h-4" /> Message
                                        </button>
                                    </>
                                ) : followStatus === 'pending' ? (
                                    <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 font-semibold text-sm">
                                        Request Sent
                                    </div>
                                ) : (
                                    <button onClick={sendFriendRequest} className="flex-1 bg-white text-black font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                                        <UserPlus className="w-4 h-4" /> Add Friend
                                    </button>
                                )}
                            </div>
                        )}
                        {isSelf && (
                            <button onClick={() => navigate(createPageUrl('Profile'))} className="mt-6 w-full max-w-sm bg-white/5 border border-white/10 font-semibold py-3 rounded-2xl hover:bg-white/10 transition-colors">
                                View My Profile
                            </button>
                        )}
                    </div>

                    <div className="flex w-full border-b border-white/10">
                        <div className="flex-1 py-4 flex justify-center border-b-2 border-white">
                            <Grid className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-0.5">
                        {posts.map(post => (
                            <div key={post.id} className="aspect-[3/4] relative overflow-hidden bg-white/5">
                                {post.video_url?.match(/\.(mp4|webm|mov)/i)
                                    ? <video src={post.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                    : <img src={post.video_url} className="w-full h-full object-cover" alt="" />}
                            </div>
                        ))}
                        {posts.length === 0 && (
                            <div className="col-span-3 py-16 flex flex-col items-center gap-3 text-white/30">
                                <Grid className="w-7 h-7" />
                                <p className="text-sm">No posts yet</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}