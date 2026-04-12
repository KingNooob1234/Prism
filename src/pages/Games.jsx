import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Gamepad2, Upload, Play, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Built-in demo game using WebGL/Canvas
function BuiltInGame({ onExit, gameControls }) {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        x: 200, y: 300, vx: 0, vy: 0,
        bullets: [], enemies: [],
        score: 0, alive: true, frame: 0
    });
    const keysRef = useRef({});
    const animRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // keyboard - focus canvas to receive key events
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
        const onKey = (e) => {
            keysRef.current[e.key] = e.type === 'keydown';
            // Prevent page scroll on arrow keys / space
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);

        // spawn enemies
        const spawnTimer = setInterval(() => {
            const s = stateRef.current;
            s.enemies.push({ x: Math.random() * canvas.width, y: -30, vy: 1.5 + Math.random() * 2, hp: 1 });
        }, 900);

        const loop = () => {
            const s = stateRef.current;
            const keys = keysRef.current;
            const gc = gameControls.current;
            const W = canvas.width, H = canvas.height;

            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, W, H);

            // stars
            s.frame++;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            for (let i = 0; i < 30; i++) {
                const sx = (i * 137 + s.frame * 0.5) % W;
                const sy = (i * 97 + s.frame * 0.8) % H;
                ctx.fillRect(sx, sy, 1, 1);
            }

            if (!s.alive) {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 32px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
                ctx.font = '18px sans-serif';
                ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 20);
                ctx.fillStyle = 'rgba(255,100,100,0.8)';
                ctx.fillRect(W / 2 - 60, H / 2 + 50, 120, 40);
                ctx.fillStyle = 'white';
                ctx.font = '16px sans-serif';
                ctx.fillText('Restart', W / 2, H / 2 + 75);
                animRef.current = requestAnimationFrame(loop);
                return;
            }

            // movement from keys or game controls
            const spd = 3.5;
            if (keys['ArrowLeft'] || gc.left) s.vx = -spd;
            else if (keys['ArrowRight'] || gc.right) s.vx = spd;
            else s.vx *= 0.7;
            if (keys['ArrowUp'] || gc.up) s.vy = -spd;
            else if (keys['ArrowDown'] || gc.down) s.vy = spd;
            else s.vy *= 0.7;

            s.x = Math.max(20, Math.min(W - 20, s.x + s.vx));
            s.y = Math.max(20, Math.min(H - 20, s.y + s.vy));

            // shoot
            if ((keys[' '] || gc.action) && s.frame % 8 === 0) {
                s.bullets.push({ x: s.x, y: s.y - 20 });
            }

            // bullets
            s.bullets = s.bullets.filter(b => b.y > -10);
            s.bullets.forEach(b => {
                b.y -= 8;
                ctx.fillStyle = '#ff4499';
                ctx.shadowColor = '#ff4499';
                ctx.shadowBlur = 8;
                ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
                ctx.shadowBlur = 0;
            });

            // enemies
            s.enemies = s.enemies.filter(e => e.hp > 0 && e.y < H + 40);
            s.enemies.forEach(e => {
                e.y += e.vy;
                // draw triangle enemy
                ctx.fillStyle = '#ff3366';
                ctx.shadowColor = '#ff3366';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(e.x, e.y + 20);
                ctx.lineTo(e.x - 18, e.y - 10);
                ctx.lineTo(e.x + 18, e.y - 10);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;

                // collision with bullets
                s.bullets.forEach(b => {
                    if (Math.abs(b.x - e.x) < 18 && Math.abs(b.y - e.y) < 20) {
                        e.hp = 0; b.y = -999; s.score++;
                    }
                });
                // collision with player
                if (Math.abs(s.x - e.x) < 22 && Math.abs(s.y - e.y) < 22) {
                    s.alive = false;
                }
            });

            // draw player (triangle ship pointing up)
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - 22);
            ctx.lineTo(s.x - 14, s.y + 14);
            ctx.lineTo(s.x + 14, s.y + 14);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // score
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Score: ${s.score}`, 14, 28);

            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);

        // click restart
        const onClick = (e) => {
            const s = stateRef.current;
            if (!s.alive) {
                const rect = canvas.getBoundingClientRect();
                const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
                const W = canvas.width, H = canvas.height;
                if (cx > W / 2 - 60 && cx < W / 2 + 60 && cy > H / 2 + 50 && cy < H / 2 + 90) {
                    stateRef.current = { x: W / 2, y: H * 0.7, vx: 0, vy: 0, bullets: [], enemies: [], score: 0, alive: true, frame: 0 };
                }
            }
        };
        canvas.addEventListener('click', onClick);

        return () => {
            cancelAnimationFrame(animRef.current);
            clearInterval(spawnTimer);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
            canvas.removeEventListener('click', onClick);
        };
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full" />;
}

export default function Games() {
    const [currentGame, setCurrentGame] = useState(null); // null = list, 'builtin' = demo, obj = creator game
    const [games, setGames] = useState([]);
    const [user, setUser] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const gameControls = useRef({ left: false, right: false, up: false, down: false, action: false });
    const joyCenter = useRef(null);
    const joyActive = useRef(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {});
        // Load creator-posted games from localStorage for now
        const saved = localStorage.getItem('creator_games');
        if (saved) setGames(JSON.parse(saved));
    }, []);

    const handleGameUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            const newGame = { id: Date.now(), name: file.name.replace(/\.[^.]+$/, ''), url: file_url, creator: user?.full_name || 'Unknown', uploader: user?.email };
            const updated = [...games, newGame];
            setGames(updated);
            localStorage.setItem('creator_games', JSON.stringify(updated));
        } catch (_) { alert('Upload failed'); }
        setIsUploading(false);
        e.target.value = '';
    };

    // Joystick touch handlers
    const onJoyStart = (e) => {
        e.preventDefault();
        joyActive.current = true;
        joyCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onJoyMove = (e) => {
        e.preventDefault();
        if (!joyActive.current || !joyCenter.current) return;
        const dx = e.touches[0].clientX - joyCenter.current.x;
        const dy = e.touches[0].clientY - joyCenter.current.y;
        const dead = 10;
        gameControls.current.left = dx < -dead;
        gameControls.current.right = dx > dead;
        gameControls.current.up = dy < -dead;
        gameControls.current.down = dy > dead;
    };
    const onJoyEnd = () => {
        joyActive.current = false;
        gameControls.current.left = false;
        gameControls.current.right = false;
        gameControls.current.up = false;
        gameControls.current.down = false;
    };

    const btnStyle = "min-w-[50px] min-h-[50px] flex items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl active:bg-white/30 transition-all select-none";

    if (currentGame) {
        const isIframe = currentGame !== 'builtin';
        return (
            <div className="w-full bg-black flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', height: '100dvh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
                {/* Game header */}
                <div className="flex items-center gap-3 px-4 py-2 shrink-0 bg-black/60 backdrop-blur-xl border-b border-white/10">
                    <button onClick={() => setCurrentGame(null)} className="min-w-[40px] min-h-[40px] flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-white font-semibold text-sm flex-1">{isIframe ? currentGame.name : 'Space Shooter'}</span>
                </div>

                {/* Game canvas/iframe */}
                <div className="flex-1 relative overflow-hidden">
                    {isIframe ? (
                        <iframe src={currentGame.url} className="w-full h-full border-none" title={currentGame.name} allow="autoplay" />
                    ) : (
                        <BuiltInGame onExit={() => setCurrentGame(null)} gameControls={gameControls} />
                    )}
                </div>

                {/* Game controls overlay */}
                <div className="shrink-0 bg-black/80 backdrop-blur-2xl border-t border-white/10 px-4 py-3 flex items-center justify-between"
                    style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                    {/* D-Pad */}
                    <div className="relative w-36 h-36 shrink-0">
                        {/* Up */}
                        <button className={`${btnStyle} absolute top-0 left-1/2 -translate-x-1/2`}
                            onPointerDown={() => gameControls.current.up = true} onPointerUp={() => gameControls.current.up = false}>
                            <ChevronUp className="w-5 h-5 text-white" />
                        </button>
                        {/* Down */}
                        <button className={`${btnStyle} absolute bottom-0 left-1/2 -translate-x-1/2`}
                            onPointerDown={() => gameControls.current.down = true} onPointerUp={() => gameControls.current.down = false}>
                            <ChevronDown className="w-5 h-5 text-white" />
                        </button>
                        {/* Left */}
                        <button className={`${btnStyle} absolute left-0 top-1/2 -translate-y-1/2`}
                            onPointerDown={() => gameControls.current.left = true} onPointerUp={() => gameControls.current.left = false}>
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        {/* Right */}
                        <button className={`${btnStyle} absolute right-0 top-1/2 -translate-y-1/2`}
                            onPointerDown={() => gameControls.current.right = true} onPointerUp={() => gameControls.current.right = false}>
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                        {/* Center */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10" />
                    </div>

                    {/* Joystick */}
                    <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center relative shrink-0"
                        onTouchStart={onJoyStart} onTouchMove={onJoyMove} onTouchEnd={onJoyEnd}>
                        <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30" />
                        <span className="absolute -bottom-5 text-white/30 text-[10px]">MOVE</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-center gap-3 shrink-0">
                        <button className={`${btnStyle} w-14 h-14`}
                            onPointerDown={() => gameControls.current.action = true} onPointerUp={() => gameControls.current.action = false}>
                            <span className="text-white font-bold text-sm">A</span>
                        </button>
                        <button className={`${btnStyle} w-10 h-10`}>
                            <span className="text-white/60 font-bold text-xs">B</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-[#050505] text-white overflow-y-auto pb-36 [&::-webkit-scrollbar]:hidden">
            <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-5 py-4"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold flex items-center gap-2"><Gamepad2 className="w-5 h-5" /> Games</h1>
                    {user && (
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-semibold active:scale-95 transition-all disabled:opacity-50">
                            {isUploading ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                            {isUploading ? 'Uploading...' : 'Post Game'}
                        </button>
                    )}
                    <input ref={fileInputRef} type="file" accept=".html,.zip" className="hidden" onChange={handleGameUpload} />
                </div>
                <p className="text-white/40 text-xs mt-1">Creators can upload HTML games</p>
            </div>

            <div className="px-4 py-4 space-y-3">
                {/* Built-in demo game */}
                <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/8 transition-all cursor-pointer active:scale-[0.98]"
                    onClick={() => setCurrentGame('builtin')}>
                    <div className="h-40 bg-gradient-to-br from-[#0d0d1a] to-[#1a0d2e] flex items-center justify-center relative overflow-hidden">
                        {/* Animated preview */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-0 h-0" style={{ borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderBottom: '36px solid white', filter: 'drop-shadow(0 0 12px white)' }} />
                        </div>
                        <div className="absolute top-4 left-4 text-white/20 text-[10px] font-mono">SCORE: 0</div>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/10 border border-white/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                            <Play className="w-3 h-3 text-white" />
                            <span className="text-white text-xs font-semibold">Play Now</span>
                        </div>
                    </div>
                    <div className="px-4 py-3">
                        <p className="font-semibold text-sm">Space Shooter</p>
                        <p className="text-white/40 text-xs mt-0.5">By Vybe • WebGL Arcade</p>
                    </div>
                </div>

                {/* Creator uploaded games */}
                {games.map(game => (
                    <div key={game.id} className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/8 transition-all cursor-pointer active:scale-[0.98]"
                        onClick={() => setCurrentGame(game)}>
                        <div className="h-32 bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                            <Gamepad2 className="w-10 h-10 text-white/20" />
                        </div>
                        <div className="px-4 py-3">
                            <p className="font-semibold text-sm">{game.name}</p>
                            <p className="text-white/40 text-xs mt-0.5">By {game.creator}</p>
                        </div>
                    </div>
                ))}

                {games.length === 0 && (
                    <div className="text-center py-8 text-white/20 text-sm">
                        No creator games yet — be the first to upload!
                    </div>
                )}
            </div>
        </div>
    );
}