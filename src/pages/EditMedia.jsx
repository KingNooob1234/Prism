import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Type, Pen, Check, X, RotateCcw, Sticker, Sliders, Sun, Contrast, Droplets } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COLORS = ['#ffffff', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ff2d92', '#000000'];
const STICKERS = ['🔥', '💜', '✨', '🌊', '🎯', '💫', '🎬', '❤️', '🦋', '🌙'];

const FILTERS = [
    { id: 'none', name: 'None', css: '' },
    { id: 'vivid', name: 'Vivid', css: 'saturate(1.8) contrast(1.1)' },
    { id: 'cool', name: 'Cool', css: 'hue-rotate(30deg) saturate(1.3) brightness(1.05)' },
    { id: 'warm', name: 'Warm', css: 'sepia(0.3) saturate(1.5) brightness(1.05)' },
    { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.4)' },
    { id: 'fade', name: 'Fade', css: 'opacity(0.85) saturate(0.7) brightness(1.1)' },
    { id: 'cyber', name: 'Cyber', css: 'saturate(2) hue-rotate(45deg) contrast(1.2)' },
];

export default function EditMedia() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const mediaUrl = params.get('url');
    const mediaType = params.get('type') || 'video';

    const canvasRef = useRef(null);
    const [texts, setTexts] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [mode, setMode] = useState(null); // 'text' | 'draw' | 'sticker' | 'adjust'
    const [newText, setNewText] = useState('');
    const [textColor, setTextColor] = useState('#ffffff');
    const [drawColor, setDrawColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(4);
    const [isDrawing, setIsDrawing] = useState(false);
    const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
    const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100 });
    const [caption, setCaption] = useState('');
    const [showCaptionInput, setShowCaptionInput] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const lastPoint = useRef(null);
    const dragText = useRef(null);

    // Combined CSS filter
    const computedFilter = [
        activeFilter.css,
        `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`
    ].filter(Boolean).join(' ');

    // Draw canvas logic
    useEffect(() => {
        if (mode !== 'draw' || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches?.[0] || e;
            return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
        };
        const start = (e) => { e.preventDefault(); setIsDrawing(true); lastPoint.current = getPos(e); };
        const draw = (e) => {
            e.preventDefault();
            if (!isDrawing || !lastPoint.current) return;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPoint.current = pos;
        };
        const end = () => { setIsDrawing(false); lastPoint.current = null; };
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', end);
        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', end);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', end);
        };
    }, [mode, drawColor, brushSize, isDrawing]);

    const addText = () => {
        if (!newText.trim()) return;
        setTexts(t => [...t, { id: Date.now(), text: newText, color: textColor, x: 50, y: 40, size: 24 }]);
        setNewText('');
        setMode(null);
    };

    const addSticker = (emoji) => {
        setStickers(s => [...s, { id: Date.now(), emoji, x: 40 + Math.random() * 20, y: 40 + Math.random() * 20 }]);
        setMode(null);
    };

    const clearCanvas = () => {
        if (canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    // Drag text
    const startDragText = (e, id) => {
        e.stopPropagation();
        dragText.current = { id };
    };
    const onDrag = (e) => {
        if (!dragText.current) return;
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const touch = e.touches?.[0] || e;
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        setTexts(p => p.map(t => t.id === dragText.current.id ? { ...t, x, y } : t));
        setStickers(p => p.map(s => s.id === dragText.current.id ? { ...s, x, y } : s));
    };
    const endDrag = () => { dragText.current = null; };

    const publish = async () => {
        setIsPosting(true);
        try {
            let user = null;
            try { user = await base44.auth.me(); } catch (_) {}
            await base44.entities.Post.create({
                video_url: mediaUrl,
                caption: caption || 'New post ✨',
                username: user?.full_name ? `@${user.full_name}` : '@guest',
                avatar: user?.avatar_url || '',
                likes: 0,
                comments: 0,
                filter_used: activeFilter.id,
            });
            navigate('/');
        } catch (_) { alert('Failed to post.'); }
        setIsPosting(false);
    };

    const toolBtn = (active) => `min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all ${active ? 'bg-white text-black border-white' : 'bg-black/30 backdrop-blur-xl border-white/20 text-white'}`;

    return (
        <div className="h-screen w-full bg-black flex flex-col overflow-hidden select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Top bar */}
            <div className="flex justify-between items-center px-4 py-3 z-30 shrink-0 gap-2">
                <button onClick={() => navigate(-1)} className={toolBtn(false)}><X className="w-5 h-5" /></button>
                <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    <button onClick={() => setMode(m => m === 'text' ? null : 'text')} className={toolBtn(mode === 'text')}><Type className="w-5 h-5" /></button>
                    <button onClick={() => setMode(m => m === 'draw' ? null : 'draw')} className={toolBtn(mode === 'draw')}><Pen className="w-5 h-5" /></button>
                    <button onClick={() => setMode(m => m === 'sticker' ? null : 'sticker')} className={toolBtn(mode === 'sticker')}><Sticker className="w-5 h-5" /></button>
                    <button onClick={() => setMode(m => m === 'adjust' ? null : 'adjust')} className={toolBtn(mode === 'adjust')}><Sliders className="w-5 h-5" /></button>
                    {mode === 'draw' && <button onClick={clearCanvas} className={toolBtn(false)}><RotateCcw className="w-5 h-5" /></button>}
                </div>
                <button onClick={() => setShowCaptionInput(true)} className="px-4 py-2 bg-white text-black font-semibold rounded-full text-sm shrink-0">Next</button>
            </div>

            {/* Color picker for text/draw */}
            {(mode === 'text' || mode === 'draw') && (
                <div className="flex justify-center gap-2 px-4 py-2 z-30 shrink-0 flex-wrap">
                    {COLORS.map(c => (
                        <button key={c} onClick={() => mode === 'text' ? setTextColor(c) : setDrawColor(c)}
                            className="w-7 h-7 rounded-full border-2 transition-transform"
                            style={{ backgroundColor: c, borderColor: (mode === 'text' ? textColor : drawColor) === c ? 'white' : 'transparent', transform: (mode === 'text' ? textColor : drawColor) === c ? 'scale(1.35)' : 'scale(1)' }} />
                    ))}
                    {mode === 'draw' && (
                        <div className="w-full flex items-center gap-3 mt-2 px-2">
                            <span className="text-white/50 text-xs">Size</span>
                            <input type="range" min={2} max={20} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="flex-1 accent-white" />
                            <span className="text-white/60 text-xs w-4">{brushSize}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Text input */}
            {mode === 'text' && (
                <div className="flex gap-2 px-4 pb-2 z-30 shrink-0">
                    <input autoFocus value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addText()}
                        placeholder="Add text..." className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-white/40 text-sm placeholder-white/40"
                        style={{ color: textColor }} />
                    <button onClick={addText} className="min-w-[44px] flex items-center justify-center bg-white text-black rounded-2xl px-3"><Check className="w-4 h-4" /></button>
                </div>
            )}

            {/* Sticker picker */}
            {mode === 'sticker' && (
                <div className="flex gap-3 px-4 pb-2 z-30 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {STICKERS.map(e => (
                        <button key={e} onClick={() => addSticker(e)} className="shrink-0 w-12 h-12 text-2xl flex items-center justify-center bg-white/10 border border-white/20 rounded-2xl hover:bg-white/20 transition-all">{e}</button>
                    ))}
                </div>
            )}

            {/* Adjustments */}
            {mode === 'adjust' && (
                <div className="px-5 pb-2 z-30 shrink-0 space-y-2">
                    {[{ key: 'brightness', icon: Sun, label: 'Brightness', min: 50, max: 200 }, { key: 'contrast', icon: Contrast, label: 'Contrast', min: 50, max: 200 }, { key: 'saturation', icon: Droplets, label: 'Saturation', min: 0, max: 300 }].map(({ key, icon: Icon, label, min, max }) => (
                        <div key={key} className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-white/60 shrink-0" />
                            <input type="range" min={min} max={max} value={adjustments[key]}
                                onChange={e => setAdjustments(a => ({ ...a, [key]: Number(e.target.value) }))}
                                className="flex-1 accent-white" />
                            <span className="text-white/50 text-xs w-8 text-right">{adjustments[key]}</span>
                        </div>
                    ))}
                    <button onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100 })} className="text-xs text-white/40 underline">Reset</button>
                </div>
            )}

            {/* Filter bar — always visible at bottom of toolbar */}
            {!mode && (
                <div className="flex gap-2 px-4 pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0">
                    {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setActiveFilter(f)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${activeFilter.id === f.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/70'}`}>
                            {f.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Media + overlays */}
            <div className="relative flex-1 overflow-hidden"
                onMouseMove={onDrag} onTouchMove={onDrag}
                onMouseUp={endDrag} onTouchEnd={endDrag}>
                {mediaType === 'photo'
                    ? <img src={mediaUrl} className="w-full h-full object-cover" style={{ filter: computedFilter }} alt="preview" />
                    : <video src={mediaUrl} className="w-full h-full object-cover" style={{ filter: computedFilter }} autoPlay loop playsInline />}

                <canvas ref={canvasRef} width={1080} height={1920} className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ pointerEvents: mode === 'draw' ? 'auto' : 'none', cursor: mode === 'draw' ? 'crosshair' : 'default', touchAction: 'none' }} />

                {texts.map(t => (
                    <div key={t.id} className="absolute cursor-move font-bold drop-shadow-lg"
                        style={{ color: t.color, left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%,-50%)', fontSize: `${t.size}px`, touchAction: 'none' }}
                        onMouseDown={e => startDragText(e, t.id)} onTouchStart={e => startDragText(e, t.id)}
                        onDoubleClick={() => setTexts(p => p.filter(x => x.id !== t.id))}>
                        {t.text}
                    </div>
                ))}
                {stickers.map(s => (
                    <div key={s.id} className="absolute cursor-move text-4xl"
                        style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)', touchAction: 'none' }}
                        onMouseDown={e => startDragText(e, s.id)} onTouchStart={e => startDragText(e, s.id)}
                        onDoubleClick={() => setStickers(p => p.filter(x => x.id !== s.id))}>
                        {s.emoji}
                    </div>
                ))}
            </div>

            <p className="text-center text-white/20 text-[10px] py-1.5 shrink-0">Double-tap elements to remove</p>

            {/* Caption sheet */}
            {showCaptionInput && (
                <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-8 gap-5">
                    <p className="text-white font-semibold text-lg">Add a caption</p>
                    <textarea autoFocus value={caption} onChange={e => setCaption(e.target.value)} rows={3}
                        placeholder="Describe your post..."
                        className="w-full max-w-sm bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none" />
                    <div className="flex gap-3 w-full max-w-sm">
                        <button onClick={() => setShowCaptionInput(false)} className="flex-1 py-3 rounded-2xl border border-white/20 text-white font-semibold">Back</button>
                        <button onClick={publish} disabled={isPosting} className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold">
                            {isPosting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}