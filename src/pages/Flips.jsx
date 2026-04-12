import React, { useState, useEffect, useRef } from 'react';
import { Images, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { sendNotification } from '../lib/useNotifications';
import { createPageUrl } from '@/utils';

function smartFit(naturalW, naturalH) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mediaLandscape = naturalW > naturalH;
    const viewLandscape = vw > vh;
    return mediaLandscape !== viewLandscape ? 'contain' : 'cover';
}

function FlipCard({ story, onLongPress }) {
    const [idx, setIdx] = useState(0);
    const [fit, setFit] = useState('cover');
    const photos = story.photo_urls || [];
    const pressTimer = useRef(null);
    const didLongPress = useRef(false);

    const advance = () => setIdx(i => (i + 1) % photos.length);

    const onPointerDown = () => {
        didLongPress.current = false;
        pressTimer.current = setTimeout(() => {
            didLongPress.current = true;
            onLongPress();
        }, 500);
    };
    const onPointerUp = () => {
        clearTimeout(pressTimer.current);
        if (!didLongPress.current) advance();
    };
    const onPointerLeave = () => clearTimeout(pressTimer.current);

    if (!photos.length) return null;

    return (
        <div
            className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden bg-black cursor-pointer select-none active:scale-[0.98] transition-transform duration-150 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
        >
            <img
                key={idx}
                src={photos[idx]}
                className="w-full h-full"
                style={{ objectFit: fit, animation: 'flipIn 0.22s ease-out' }}
                alt=""
                onLoad={e => setFit(smartFit(e.target.naturalWidth, e.target.naturalHeight))}
            />

            {photos.length > 1 && (
                <div className="absolute top-3 left-3 right-3 flex gap-1">
                    {photos.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 rounded-full transition-all duration-300"
                            style={{ background: i <= idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)' }} />
                    ))}
                </div>
            )}

            {idx === 0 && photos.length > 1 && (
                <div className="absolute bottom-14 right-3 bg-black/30 backdrop-blur-xl border border-white/20 rounded-full px-2.5 py-1 pointer-events-none">
                    <span className="text-white text-[10px] font-semibold">Tap →</span>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
                <p className="text-white font-bold text-xs">{story.username}</p>
                {story.caption ? <p className="text-white/80 text-[11px] mt-0.5">{story.caption}</p> : null}
            </div>

            {photos.length > 1 && (
                <div className="absolute top-7 right-3 bg-black/30 backdrop-blur-xl border border-white/15 rounded-full px-2 py-0.5 pointer-events-none">
                    <span className="text-white text-[10px] font-semibold">{idx + 1}/{photos.length}</span>
                </div>
            )}
        </div>
    );
}

function FlipViewer({ stories, startIndex, onClose }) {
    const [storyIdx, setStoryIdx] = useState(startIndex);
    const [photoIdx, setPhotoIdx] = useState(0);
    const [fit, setFit] = useState('cover');
    const story = stories[storyIdx];
    const photos = story?.photo_urls || [];

    const prev = () => {
        if (storyIdx > 0) { setStoryIdx(i => i - 1); setPhotoIdx(0); }
    };
    const next = () => {
        if (storyIdx < stories.length - 1) { setStoryIdx(i => i + 1); setPhotoIdx(0); }
    };
    const advancePhoto = () => {
        if (photoIdx < photos.length - 1) setPhotoIdx(i => i + 1);
        else next();
    };

    if (!story) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <div className="text-white/60 text-xs">{storyIdx + 1} / {stories.length}</div>
                <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 border border-white/20 rounded-full backdrop-blur-xl">
                    <X className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Progress bars */}
            {photos.length > 1 && (
                <div className="flex gap-1 px-4 pb-2 shrink-0">
                    {photos.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 rounded-full"
                            style={{ background: i <= photoIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)' }} />
                    ))}
                </div>
            )}

            {/* Image */}
            <div className="flex-1 relative overflow-hidden" onClick={advancePhoto}>
                <img
                    key={`${storyIdx}-${photoIdx}`}
                    src={photos[photoIdx]}
                    className="w-full h-full"
                    style={{ objectFit: fit, animation: 'flipIn 0.22s ease-out' }}
                    alt=""
                    onLoad={e => setFit(smartFit(e.target.naturalWidth, e.target.naturalHeight))}
                />
                {/* Caption overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-12 pointer-events-none">
                    <p className="text-white font-bold text-sm">{story.username}</p>
                    {story.caption ? <p className="text-white/80 text-xs mt-1">{story.caption}</p> : null}
                </div>
            </div>

            {/* Prev / Next story */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 gap-3">
                <button onClick={prev} disabled={storyIdx === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl disabled:opacity-20 transition-all active:scale-95">
                    <ChevronLeft className="w-5 h-5 text-white" />
                    <span className="text-white text-sm font-semibold">Prev</span>
                </button>
                <button onClick={next} disabled={storyIdx === stories.length - 1}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl disabled:opacity-20 transition-all active:scale-95">
                    <span className="text-white text-sm font-semibold">Next</span>
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>
            </div>
        </div>
    );
}

export default function Flips() {
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewerIndex, setViewerIndex] = useState(null);

    useEffect(() => {
        base44.entities.FlipStory.list('-created_date', 30)
            .then(data => { setStories(data || []); setIsLoading(false); })
            .catch(() => setIsLoading(false));

        const unsub = base44.entities.FlipStory.subscribe(event => {
            if (event.type === 'create') {
                setStories(p => [event.data, ...p]);
                sendNotification(
                    `${event.data.username || 'Someone'} posted a Flip`,
                    event.data.caption || 'New flip on Vybe 📸'
                );
            }
            if (event.type === 'delete') setStories(p => p.filter(s => s.id !== event.id));
        });
        return unsub;
    }, []);

    return (
        <div className="h-screen w-full bg-[#050505] text-white overflow-y-auto pb-36 [&::-webkit-scrollbar]:hidden">
            <div
                className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-5 py-4 flex items-center justify-between"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
            >
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Images className="w-5 h-5" /> Flips
                </h1>
                <Link
                    to={createPageUrl('Create') + '?mode=flip'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-black rounded-full text-sm font-semibold active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" /> New Flip
                </Link>
            </div>

            {isLoading && (
                <div className="flex justify-center py-20">
                    <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {!isLoading && stories.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center">
                    <Images className="w-10 h-10 text-white/20" />
                    <p className="text-white/40 text-sm">No flips yet — tap + to post up to 4 photos</p>
                </div>
            )}

            <div className="px-4 py-4 grid grid-cols-2 gap-3">
                {stories.map((story, i) => (
                    <FlipCard key={story.id} story={story} onLongPress={() => setViewerIndex(i)} />
                ))}
            </div>

            {viewerIndex !== null && (
                <FlipViewer stories={stories} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
            )}

            <style>{`@keyframes flipIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
    );
}