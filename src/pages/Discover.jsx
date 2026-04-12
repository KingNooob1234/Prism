import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, TrendingUp, Flame, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Discover() {
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Trending');
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const touchStartY = useRef(0);
    const [pullY, setPullY] = useState(0);
    const isPulling = useRef(false);

    const categories = ["Trending", "New", "Popular"];

    const loadPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const all = await base44.entities.Post.list('-created_date', 50);
            let sorted = all || [];
            if (activeCategory === 'Popular') sorted = [...sorted].sort((a, b) => (b.likes || 0) - (a.likes || 0));
            else if (activeCategory === 'New') sorted = [...sorted].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            else sorted = [...sorted].sort((a, b) => ((b.likes || 0) + (b.comments || 0) * 2) - ((a.likes || 0) + (a.comments || 0) * 2));
            setPosts(sorted);
        } catch (_) {}
        setIsLoading(false);
    }, [activeCategory]);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    const filtered = posts.filter(p =>
        !searchQuery || (p.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.username || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadPosts();
        setIsRefreshing(false);
        setPullY(0);
    };

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
        <div className="h-screen w-full bg-[#050505] text-white overflow-hidden flex flex-col">
            {/* Pull indicator */}
            {pullY > 0 && (
                <div className="absolute top-0 left-0 w-full z-50 flex justify-center pointer-events-none" style={{ transform: `translateY(${pullY - 40}px)`, paddingTop: 'env(safe-area-inset-top)' }}>
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-2">
                        <RefreshCw className={`w-4 h-4 text-white ${pullY > 50 ? 'animate-spin' : ''}`} />
                    </div>
                </div>
            )}

            {/* Sticky header */}
            <div className="shrink-0 bg-[#050505]/90 backdrop-blur-3xl px-4 pb-3"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                    <input type="text" placeholder="Search posts, creators..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-sm transition-all" />
                </div>
                <div className="flex gap-2 mt-3 [&::-webkit-scrollbar]:hidden overflow-x-auto">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 px-4 py-1.5 rounded-xl border text-sm font-medium transition-all ${activeCategory === cat ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/70'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32 [&::-webkit-scrollbar]:hidden"
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

                <div className="px-4 py-3">
                    <h2 className="text-base font-bold flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {activeCategory === 'New' ? 'Recent Posts' : activeCategory === 'Popular' ? 'Most Popular' : 'Trending Now'}
                    </h2>

                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    )}

                    {!isLoading && filtered.length === 0 && (
                        <div className="flex flex-col items-center py-16 gap-3 text-white/40">
                            <TrendingUp className="w-8 h-8" />
                            <p className="text-sm">{searchQuery ? 'No results found' : 'No posts yet'}</p>
                        </div>
                    )}

                    {/* Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            {filtered.filter((_, i) => i % 2 === 0).map(post => (
                                <PostThumbnail key={post.id} post={post} onClick={() => navigate(createPageUrl('Home'))} />
                            ))}
                        </div>
                        <div className="space-y-2">
                            {filtered.filter((_, i) => i % 2 !== 0).map(post => (
                                <PostThumbnail key={post.id} post={post} onClick={() => navigate(createPageUrl('Home'))} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PostThumbnail({ post, onClick }) {
    return (
        <div className="relative rounded-2xl overflow-hidden group cursor-pointer bg-white/5 aspect-[3/4]" onClick={onClick}>
            {post.video_url && post.video_url.match(/\.(mp4|webm|mov)$/i) ? (
                <video src={post.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
                <img src={post.video_url} alt={post.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
                <p className="text-[11px] text-white/90 font-medium truncate">{post.username}</p>
                <div className="flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-white/60" />
                    <span className="text-[10px] text-white/60">{(post.likes || 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}