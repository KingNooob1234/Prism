import React, { useRef, useEffect, useState, useCallback } from 'react';

// AR overlay filters drawn on a canvas over the live camera stream
// Uses browser FaceDetector API (Chrome/Android) with canvas fallback
const AR_FILTERS = [
    { id: 'none', name: 'Off', emoji: '✕' },
    { id: 'sunglasses', name: 'Shades', emoji: '🕶️' },
    { id: 'crown', name: 'Crown', emoji: '👑' },
    { id: 'dog', name: 'Dog', emoji: '🐶' },
    { id: 'rainbow', name: 'Rainbow', emoji: '🌈' },
    { id: 'fire', name: 'Fire', emoji: '🔥' },
];

function drawSunglasses(ctx, face) {
    const { x, y, width, height } = face.boundingBox || face;
    const eyeY = y + height * 0.38;
    const eyeSpan = width * 0.7;
    const lensW = eyeSpan * 0.4;
    const lensH = lensW * 0.55;
    const leftX = x + width * 0.15;
    const rightX = x + width * 0.45;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    // left lens
    ctx.beginPath(); ctx.ellipse(leftX + lensW / 2, eyeY, lensW / 2, lensH / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // right lens
    ctx.beginPath(); ctx.ellipse(rightX + lensW / 2, eyeY, lensW / 2, lensH / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // bridge
    ctx.beginPath(); ctx.moveTo(leftX + lensW, eyeY); ctx.lineTo(rightX, eyeY); ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
}

function drawCrown(ctx, face) {
    const { x, y, width } = face.boundingBox || face;
    const cx = x + width / 2;
    const topY = y - width * 0.15;
    const crownH = width * 0.22;
    const crownW = width * 0.7;
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - crownW / 2, topY);
    ctx.lineTo(cx - crownW / 2, topY - crownH);
    ctx.lineTo(cx - crownW / 4, topY - crownH * 0.5);
    ctx.lineTo(cx, topY - crownH);
    ctx.lineTo(cx + crownW / 4, topY - crownH * 0.5);
    ctx.lineTo(cx + crownW / 2, topY - crownH);
    ctx.lineTo(cx + crownW / 2, topY);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // gems
    ['#ff3b30', '#007aff', '#34c759'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(cx - crownW / 4 + (i * crownW / 4), topY - crownH * 0.4, 5, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawDogEars(ctx, face) {
    const { x, y, width } = face.boundingBox || face;
    const earH = width * 0.35;
    const earW = width * 0.22;
    ctx.save();
    ctx.fillStyle = '#c8a96e';
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    // left ear
    ctx.beginPath(); ctx.ellipse(x + width * 0.12, y - earH * 0.3, earW / 2, earH / 2, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath(); ctx.ellipse(x + width * 0.12, y - earH * 0.3, earW / 3.5, earH / 3, -0.3, 0, Math.PI * 2); ctx.fill();
    // right ear
    ctx.fillStyle = '#c8a96e';
    ctx.strokeStyle = '#8b6914';
    ctx.beginPath(); ctx.ellipse(x + width * 0.88, y - earH * 0.3, earW / 2, earH / 2, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath(); ctx.ellipse(x + width * 0.88, y - earH * 0.3, earW / 3.5, earH / 3, 0.3, 0, Math.PI * 2); ctx.fill();
    // nose
    const noseY = y + (face.boundingBox?.height || face.height) * 0.6;
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(x + width / 2, noseY, width * 0.07, width * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawRainbow(ctx, face) {
    const { x, y, width } = face.boundingBox || face;
    const cx = x + width / 2;
    const ry = y - width * 0.05;
    const colors = ['#ff0000', '#ff7700', '#ffff00', '#00cc00', '#0000ff', '#8b00ff'];
    ctx.save();
    colors.forEach((c, i) => {
        const r = width * (0.55 - i * 0.07);
        ctx.beginPath();
        ctx.arc(cx, ry, r, Math.PI, 0);
        ctx.strokeStyle = c;
        ctx.lineWidth = width * 0.055;
        ctx.stroke();
    });
    ctx.restore();
}

function drawFire(ctx, face) {
    const { x, y, width } = face.boundingBox || face;
    const cx = x + width / 2;
    const now = Date.now() / 300;
    ctx.save();
    for (let i = -2; i <= 2; i++) {
        const fx = cx + i * width * 0.16;
        const fy = y - width * 0.12;
        const h = width * (0.18 + Math.abs(Math.sin(now + i)) * 0.12);
        const grad = ctx.createLinearGradient(fx, fy, fx, fy - h);
        grad.addColorStop(0, 'rgba(255,80,0,0.9)');
        grad.addColorStop(0.5, 'rgba(255,200,0,0.7)');
        grad.addColorStop(1, 'rgba(255,255,100,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(fx, fy, width * 0.07, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

export default function ARFilters({ videoRef, activeFilter }) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const detectorRef = useRef(null);
    const lastFaces = useRef([]);

    const initDetector = useCallback(async () => {
        if ('FaceDetector' in window) {
            try { detectorRef.current = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true }); } catch (_) {}
        }
    }, []);

    useEffect(() => { initDetector(); }, []);

    useEffect(() => {
        if (activeFilter === 'none') {
            cancelAnimationFrame(animRef.current);
            const canvas = canvasRef.current;
            if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const render = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!canvas || !video || video.readyState < 2) { animRef.current = requestAnimationFrame(render); return; }

            canvas.width = video.videoWidth || video.clientWidth;
            canvas.height = video.videoHeight || video.clientHeight;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Try FaceDetector, else use last known faces or center fallback
            if (detectorRef.current) {
                try {
                    const detected = await detectorRef.current.detect(video);
                    if (detected.length > 0) lastFaces.current = detected;
                } catch (_) {}
            }

            const faces = lastFaces.current.length > 0 ? lastFaces.current : [{
                boundingBox: { x: canvas.width * 0.25, y: canvas.height * 0.2, width: canvas.width * 0.5, height: canvas.height * 0.45 }
            }];

            faces.forEach(face => {
                const fb = face.boundingBox;
                const f = { x: fb.x, y: fb.y, width: fb.width, height: fb.height };
                if (activeFilter === 'sunglasses') drawSunglasses(ctx, f);
                else if (activeFilter === 'crown') drawCrown(ctx, f);
                else if (activeFilter === 'dog') drawDogEars(ctx, f);
                else if (activeFilter === 'rainbow') drawRainbow(ctx, f);
                else if (activeFilter === 'fire') drawFire(ctx, f);
            });

            animRef.current = requestAnimationFrame(render);
        };

        animRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animRef.current);
    }, [activeFilter, videoRef]);

    return (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} />
    );
}

export { AR_FILTERS };