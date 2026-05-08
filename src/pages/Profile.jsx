import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Grid, LogIn, LogOut, Trash2, AlertCircle, Video, Settings, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [myPosts, setMyPosts] = useState([]);
    const [savedPosts, setSavedPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('grid');
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [deletingPost, setDeletingPost] = useState(null);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const avatarInputRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const isAuth = await base44.auth.isAuthenticated();
                if (isAuth) {
                    const userData = await base44.auth.me();
                    setUser(userData);
                    const [saved, posts] = await Promise.all([
                        base44.entities.SavedPost.list('-created_date'),
                        base44.entities.Post.filter({ created_by: userData.email }, '-created_date')
                    ]);
                    setSavedPosts(saved || []);
                    setMyPosts(posts || []);
                }
            } catch (_) {}
            setIsLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        const unsub = base44.entities.Post.subscribe(event => {
            if (event.type === 'delete') setMyPosts(p => p.filter(x => x.id !== event.id));
            if (event.type === 'create' && event.data?.created_by === user?.email) setMyPosts(p => [event.data, ...p]);
        });
        return unsub;
    }, [user?.email]);

    const handleDeletePost = async (postId) => {
        await base44.entities.Post.delete(postId);
        setDeletingPost(null);
    };

    const handleLogin = () => {
        const callbackUrl = `${window.location.origin}${window.location.pathname}`;
        base44.auth.redirectToLogin(callbackUrl);
    };
    const handleLogout = () => base44.auth.logout();

    const openEditProfile = () => {
        setEditName(user?.full_name || '');
        setEditBio(user?.bio || '');
        setShowEditProfile(true);
    };

    const saveProfile = async () => {
        setIsSavingProfile(true);
        try {
            await base44.auth.updateMe({ full_name: editName, bio: editBio });
            setUser(u => ({ ...u, full_name: editName, bio: editBio }));
        } catch (_) {}
        setIsSavingProfile(false);
        setShowEditProfile(false);
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingAvatar(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.auth.updateMe({ avatar_url: file_url });
            setUser(u => ({ ...u, avatar_url: file_url }));
        } catch (_) {}
        setIsUploadingAvatar(false);
    };

    return (
        <div className="h-screen w-full bg-[#050505] text-white overflow-y-auto pb-36 [&::-webkit-scrollbar]:hidden" style={{ overscrollBehavior: 'none' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-5 py-3 flex justify-between items-center"
                style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                <h1 className="text-lg font-semibold tracking-tight">{user ? user.full_name : 'Guest'}</h1>
                <div className="flex items-center gap-2">
                    {user && <button onClick={openEditProfile} className="min-w-[44px] min-h-[44px] flex items-center justify-center opacity-50 hover:opacity-80 transition-opacity"><Settings className="w-5 h-5" /></button>}
                    <button onClick={user ? handleLogout : handleLogin} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
                        {user ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {!user ? (
                <div className="flex flex-col items-center justify-center h-[70vh] gap-5 px-8">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <LogIn className="w-8 h-8 text-white/50" />
                    </div>
                    <p className="text-white/60 text-center">Sign in to view your profile, posts, and saved videos.</p>
                    <button onClick={handleLogin} className="px-8 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-gray-100 transition-colors">Sign In</button>
                </div>
            ) : (
                <>
                    <div className="px-6 py-8 flex flex-col items-center">
                        {/* Avatar with upload */}
                        <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-30" />
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#050505] bg-white/10">
                                {isUploadingAvatar ? (
                                    <div className="w-full h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>
                                ) : user.avatar_url ? (
                                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/40 font-bold text-3xl">{(user.full_name || user.email || '?')[0].toUpperCase()}</div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </div>
                        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

                        <h2 className="text-xl font-bold mt-4 tracking-tight">{user.full_name}</h2>
                        <p className="text-white/50 text-sm mt-1">{user.email}</p>
                        <p className="text-white/60 text-sm mt-2 font-light text-center">{user.bio || 'No bio yet'}</p>

                        <div className="flex gap-10 mt-6 w-full max-w-sm justify-center">
                            <div className="flex flex-col items-center"><span className="text-xl font-bold">{myPosts.length}</span><span className="text-[11px] text-white/50 uppercase tracking-wider mt-1">Posts</span></div>
                            <div className="flex flex-col items-center"><span className="text-xl font-bold">{savedPosts.length}</span><span className="text-[11px] text-white/50 uppercase tracking-wider mt-1">Saved</span></div>
                        </div>

                        <div className="flex gap-3 mt-6 w-full max-w-sm">
                            <button onClick={openEditProfile} className="flex-1 bg-white text-black font-semibold py-3 rounded-2xl hover:bg-gray-100 transition-colors">Edit Profile</button>
                            <button onClick={() => setShowDeleteAccount(true)} className="flex-1 bg-white/5 border border-red-500/30 font-semibold py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors">Delete Account</button>
                        </div>
                    </div>

                    <div className="flex w-full border-b border-white/10">
                        <button onClick={() => setActiveTab('grid')} className={`flex-1 py-4 flex justify-center transition-colors ${activeTab === 'grid' ? 'border-b-2 border-white text-white' : 'text-white/30'}`}><Grid className="w-5 h-5" strokeWidth={1.5} /></button>
                        <button onClick={() => setActiveTab('saved')} className={`flex-1 py-4 flex justify-center transition-colors ${activeTab === 'saved' ? 'border-b-2 border-white text-white' : 'text-white/30'}`}><Bookmark className="w-5 h-5" strokeWidth={1.5} /></button>
                    </div>

                    <div className="grid grid-cols-3 gap-0.5">
                        {activeTab === 'grid' && myPosts.map(post => (
                            <div key={post.id} className="aspect-[3/4] relative group cursor-pointer overflow-hidden bg-white/5">
                                {post.video_url?.match(/\.(mp4|webm|mov)/i) ? <video src={post.video_url} className="w-full h-full object-cover" /> : <img src={post.video_url} className="w-full h-full object-cover" alt="" />}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <button onClick={() => setDeletingPost(post.id)} className="opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center bg-red-500/80 rounded-full transition-opacity"><Trash2 className="w-4 h-4 text-white" /></button>
                                </div>
                            </div>
                        ))}
                        {activeTab === 'grid' && myPosts.length === 0 && <div className="col-span-3 py-16 flex flex-col items-center gap-3 text-white/40"><Video className="w-8 h-8" /><span className="text-sm">No posts yet</span></div>}
                        {activeTab === 'saved' && savedPosts.map(saved => (
                            <div key={saved.id} className="aspect-[3/4] relative overflow-hidden bg-white/5">
                                {saved.post_video_url?.match(/\.(mp4|webm|mov)/i) ? <video src={saved.post_video_url} className="w-full h-full object-cover" /> : <img src={saved.post_video_url} className="w-full h-full object-cover" alt="" />}
                                <div className="absolute top-2 right-2"><Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" /></div>
                            </div>
                        ))}
                        {activeTab === 'saved' && savedPosts.length === 0 && <div className="col-span-3 py-16 flex flex-col items-center gap-3 text-white/40"><Bookmark className="w-8 h-8" /><span className="text-sm">No saved content yet</span></div>}
                    </div>
                </>
            )}

            {/* Edit Profile */}
            {showEditProfile && (
                <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-end">
                    <div className="w-full bg-[#1a1a1a] rounded-t-3xl p-6 border-t border-white/10 space-y-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
                        <h3 className="text-lg font-bold text-white text-center">Edit Profile</h3>
                        <div>
                            <label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Display Name</label>
                            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-white/40 placeholder-white/40" placeholder="Your name" />
                        </div>
                        <div>
                            <label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Bio</label>
                            <input value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-white/40 placeholder-white/40" placeholder="Something about you..." />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 rounded-2xl border border-white/20 font-semibold text-white">Cancel</button>
                            <button onClick={saveProfile} disabled={isSavingProfile} className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold">{isSavingProfile ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete post confirm */}
            {deletingPost && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-end">
                    <div className="w-full bg-[#1a1a1a] rounded-t-3xl p-6 border-t border-white/10" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
                        <h3 className="text-lg font-bold text-white text-center mb-2">Delete Post?</h3>
                        <p className="text-white/50 text-sm text-center mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingPost(null)} className="flex-1 py-3 rounded-2xl border border-white/20 font-semibold">Cancel</button>
                            <button onClick={() => handleDeletePost(deletingPost)} className="flex-1 py-3 rounded-2xl bg-red-500 font-semibold text-white">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete account */}
            {showDeleteAccount && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-end">
                    <div className="w-full bg-[#1a1a1a] rounded-t-3xl p-6 border-t border-white/10" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white text-center mb-2">Delete Account?</h3>
                        <p className="text-white/50 text-sm text-center mb-6">All your data will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteAccount(false)} className="flex-1 py-3 rounded-2xl border border-white/20 font-semibold">Cancel</button>
                            <button onClick={handleLogout} className="flex-1 py-3 rounded-2xl bg-red-500 font-semibold text-white">Delete Account</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}