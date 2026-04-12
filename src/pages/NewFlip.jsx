import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Image } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function NewFlip() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const initial = [0,1,2,3].map(i => params.get(`p${i}`)).filter(Boolean);

    const [photos, setPhotos] = useState(initial);
    const [caption, setCaption] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const flipInputRef = useRef(null);

    const handleAdd = async (e) => {
        const files = Array.from(e.target.files || []).slice(0, 4 - photos.length);
        if (!files.length) return;
        setIsUploading(true);
        const urls = [];
        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            urls.push(file_url);
        }
        setPhotos(p => [...p, ...urls].slice(0, 4));
        setIsUploading(false);
        e.target.value = '';
    };

    const post = async () => {
        if (!photos.length) return;
        setIsPosting(true);
        let user = null;
        try { user = await base44.auth.me(); } catch (_) {}
        await base44.entities.FlipStory.create({
            photo_urls: photos,
            caption: caption || '',
            username: user?.full_name ? `@${user.full_name}` : '@guest',
            avatar: user?.avatar_url || '',
        });
        navigate('/Flips');
        setIsPosting(false);
    };

    return (
        <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <button onClick={() => navigate(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                    <X className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-base">New Flip</h1>
                <button
                    onClick={post}
                    disabled={!photos.length || isPosting}
                    className="px-5 py-2 bg-white text-black font-semibold rounded-full text-sm disabled:opacity-30 active:scale-95 transition-all"
                >
                    {isPosting ? 'Posting...' : 'Post'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-2 gap-3">
                    {photos.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                            <img src={url} className="w-full h-full object-cover" alt="" />
                            <button
                                onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                                className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-xl border border-white/15 rounded-full px-2 py-0.5">
                                <span className="text-white text-[10px] font-semibold">{i + 1}</span>
                            </div>
                        </div>
                    ))}
                    {photos.length < 4 && (
                        <button
                            onClick={() => flipInputRef.current?.click()}
                            disabled={isUploading}
                            className="aspect-square rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-40"
                        >
                            {isUploading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Image className="w-6 h-6 text-white/40" />
                                    <span className="text-white/40 text-xs">{photos.length === 0 ? 'Add photos' : 'Add more'}</span>
                                    <span className="text-white/25 text-[10px]">{4 - photos.length} left</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                <input ref={flipInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />

                {photos.length > 0 && (
                    <div className="mt-5">
                        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Caption (optional)</label>
                        <input
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="Say something..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}