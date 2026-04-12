import React, { useRef, useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Music, Bookmark, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CommentsSheet from './CommentsSheet';

export default function FeedItem({ post, currentUser }) {
    const videoRef = useRef(null);
    const navigate = useNavigate();
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [objectFit, setObjectFit] = useState('cover');

    const detectFit = (mediaW, mediaH) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const mediaLandscape = mediaW > mediaH;
        const viewLandscape = vw > vh;
        // Mismatch: fit by constraining axis that would overflow
        if (mediaLandscape && !viewLandscape) {
            // wide media on tall screen → contain so full width shown, top/bottom letterbox
            setObjectFit('contain');
        } else if (!mediaLandscape && viewLandscape) {
            // tall media on wide screen → contain so full height shown
            setObjectFit('contain');
        } else {
            setObjectFit('cover');
        }
    };
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post?.likes ?? 0);
    const [isSaved, setIsSaved] = useState(false);
    const [showSensitiveWarning, setShowSensitiveWarning] = useState(post?.isSensitive ?? false);
    const [showComments, setShowComments] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
    const [isSpeeding, setIsSpeeding] = useState(false);
    const lastTap = useRef(0);
    const likeInProgress = useRef(false);

    // Check if current user already liked
    useEffect(() => {
        if (!currentUser?.email || !post?.id) return;
        base44.entities.Like.filter({ post_id: String(post.id), user_email: currentUser.email })
            .then(likes => setIsLiked(likes && likes.length > 0))
            .catch(() => {});
    }, [post?.id, currentUser?.email]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                if (videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.play().catch(() => {
                        // autoplay blocked - play muted as fallback
                        videoRef.current.muted = true;
                        setIsMuted(true);
                        videoRef.current.play().catch(() => {});
                    });
                }
                setIsPlaying(true);
                setShowComments(false);
            } else {
                videoRef.current?.pause();
                setIsPlaying(false);
            }
        }, { threshold: 0.6 });
        if (videoRef.current) observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, []);

    // Real-time like count
    useEffect(() => {
        if (!post?.id) return;
        const unsub = base44.entities.Post.subscribe(event => {
            if (event.id === post.id && event.type === 'update') {
                setLikeCount(event.data.likes ?? likeCount);
            }
        });
        return unsub;
    }, [post?.id]);

    const handlePointerDown = (e) => {
        if (e.target.tagName === 'VIDEO') { videoRef.current.playbackRate = 2; setIsSpeeding(true); }
    };
    const handlePointerUp = () => {
        if (videoRef.current) { videoRef.current.playbackRate = 1; setIsSpeeding(false); }
    };

    const handleLike = async () => {
        if (likeInProgress.current) return;
        likeInProgress.current = true;
        const next = !isLiked;
        setIsLiked(next);
        const newCount = likeCount + (next ? 1 : -1);
        setLikeCount(newCount);
        try {
            if (next) {
                await base44.entities.Like.create({ post_id: String(post.id), user_email: currentUser?.email || 'guest' });
            } else {
                const likes = await base44.entities.Like.filter({ post_id: String(post.id), user_email: currentUser?.email || 'guest' });
                if (likes?.[0]) await base44.entities.Like.delete(likes[0].id);
            }
            await base44.entities.Post.update(post.id, { likes: newCount });
        } catch (_) {}
        likeInProgress.current = false;
    };

    const handleShare = async (e) => {
        e.stopPropagation();
        try {
            if (navigator.share) await navigator.share({ title: post.caption || 'Check out this!', url: post.video_url || window.location.href });
            else { await navigator.clipboard.writeText(post.video_url || window.location.href); }
        } catch (_) {}
    };

    const handleSave = async (e) => {
        e.stopPropagation();
        const next = !isSaved;
        setIsSaved(next);
        if (next) base44.entities.SavedPost.create({ post_id: String(post.id), post_video_url: post.video_url }).catch(() => {});
    };

    const handleCreatorClick = (e) => {
        e.stopPropagation();
        const email = post.created_by || '';
        const url = createPageUrl('CreatorProfile') + `?email=${encodeURIComponent(email)}&username=${encodeURIComponent(post.username || '')}&avatar=${encodeURIComponent(post.avatar || '')}`;
        navigate(url);
    };

    const handleVideoTap = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-no-tap]')) return;
        const now = Date.now();
        if (now - lastTap.current < 300) {
            const rect = e.currentTarget.getBoundingClientRect();
            setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            setShowHeart(true);
            if (!isLiked) handleLike();
            setTimeout(() => setShowHeart(false), 800);
        } else {
            if (isPlaying) { videoRef.current?.pause(); } else { videoRef.current?.play().catch(() => {}); }
            setIsPlaying(p => !p);
        }
        lastTap.current = now;
    };

    const glassBtn = 'p-2.5 rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:bg-white/20 active:scale-95 transition-all duration-200';

    // Detect if it's a photo or video
    const isPhoto = post.video_url && !post.video_url.match(/\.(mp4|webm|mov)/i);

    return (
        <div className="relative w-full h-full bg-black" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
            {isPhoto ? (
                <img
                    src={post.video_url}
                    className="w-full h-full"
                    style={{ objectFit }}
                    alt={post.caption}
                    onClick={handleVideoTap}
                    onLoad={e => detectFit(e.target.naturalWidth, e.target.naturalHeight)}
                />
            ) : (
                <video
                    ref={videoRef}
                    src={post.video_url}
                    className="w-full h-full"
                    style={{ objectFit }}
                    loop
                    playsInline
                    onClick={handleVideoTap}
                    onLoadedMetadata={e => detectFit(e.target.videoWidth, e.target.videoHeight)}
                />
            )}

            {isSpeeding && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full z-30 pointer-events-none">
                    <span className="text-white text-sm font-bold tracking-wider animate-pulse">2× Speed</span>
                </div>
            )}

            {showHeart && (
                <div className="absolute z-50 pointer-events-none" style={{ left: heartPos.x - 40, top: heartPos.y - 40, animation: 'heartBurst 0.8s ease-out forwards' }}>
                    <Heart className="w-20 h-20 fill-red-500 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                </div>
            )}

            {post.isSensitive && showSensitiveWarning && (
                <div className="absolute inset-0 z-40 backdrop-blur-3xl bg-black/60 flex flex-col items-center justify-center p-8 text-center" onClick={e => e.stopPropagation()}>
                    <ShieldAlert className="w-12 h-12 text-white/80 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Sensitive Content</h3>
                    <p className="text-white/60 text-sm mb-6">Flagged by AI moderation.</p>
                    <button onClick={() => setShowSensitiveWarning(false)} className="px-6 py-3 bg-white/10 border border-white/20 rounded-full font-medium text-white">Show anyway</button>
                </div>
            )}

            {/* Right sidebar */}
            <div className="absolute right-3 bottom-36 flex flex-col items-center gap-4 z-20" data-no-tap onClick={e => e.stopPropagation()}>
                <button onClick={handleCreatorClick} className="relative focus:outline-none">
                    <div className="w-11 h-11 rounded-full overflow-hidden border-[1.5px] border-white/60 bg-white/10">
                        {post.avatar ? <img src={post.avatar} className="w-full h-full object-cover" alt="avatar" /> : <div className="w-full h-full flex items-center justify-center text-white/60 font-bold text-sm">{(post.username || '?')[0]}</div>}
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full flex items-center justify-center border-[1.5px] border-black/80">
                        <span className="text-black text-[11px] font-bold leading-none">+</span>
                    </div>
                </button>

                <button className={`${glassBtn} flex flex-col items-center gap-1 min-w-[52px]`} onClick={handleLike}>
                    <Heart className={`w-6 h-6 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold text-white/90">{likeCount.toLocaleString()}</span>
                </button>

                <button className={`${glassBtn} flex flex-col items-center gap-1 min-w-[52px]`} onClick={() => setShowComments(true)}>
                    <MessageCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold text-white/90">{(post.comments ?? 0).toLocaleString()}</span>
                </button>

                <button className={`${glassBtn} flex flex-col items-center gap-1 min-w-[52px]`} onClick={handleSave}>
                    <Bookmark className={`w-6 h-6 transition-colors ${isSaved ? 'fill-amber-400 text-amber-400' : 'text-white'}`} strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold text-white/90">Save</span>
                </button>

                <button className={`${glassBtn} flex flex-col items-center gap-1 min-w-[52px]`} onClick={handleShare}>
                    <Share2 className="w-6 h-6 text-white" strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold text-white/90">Share</span>
                </button>
            </div>

            {/* Mute toggle */}
            {!isPhoto && (
                <button onClick={e => {
                    e.stopPropagation();
                    const next = !isMuted;
                    setIsMuted(next);
                    if (videoRef.current) videoRef.current.muted = next;
                }}
                    className="absolute top-20 right-3 z-20 p-2 rounded-full bg-black/30 backdrop-blur-xl border border-white/20">
                    {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                </button>
            )}

            {/* Bottom caption — compact, wrapping */}
            <div className="absolute bottom-32 left-3 z-20 pointer-events-none" style={{ maxWidth: 'calc(100% - 90px)' }}>
                <div className="bg-black/20 backdrop-blur-[30px] border border-white/10 rounded-2xl px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <h2 className="text-xs font-bold text-white">{post.username}</h2>
                    <p className="text-[11px] text-white/85 mt-0.5 font-light leading-relaxed">{post.caption}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 bg-white/5 w-fit px-2 py-1 rounded-full border border-white/10">
                        <Music className="w-2.5 h-2.5 text-white/70 shrink-0" />
                        <div className="overflow-hidden w-20">
                            <div className="whitespace-nowrap animate-[marquee_5s_linear_infinite] text-[10px] text-white/80 font-medium">
                                Original Sound •
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CommentsSheet post={post} isOpen={showComments} onClose={() => setShowComments(false)} currentUser={currentUser} />

            <style dangerouslySetInnerHTML={{__html:`
                @keyframes marquee { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }
                @keyframes heartBurst { 0%{transform:scale(0.5);opacity:0.8} 50%{transform:scale(1.2);opacity:1} 100%{transform:scale(1.5);opacity:0} }
            `}} />
        </div>
    );
}