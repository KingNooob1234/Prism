import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, X, Image as ImageIcon, Camera, Video, AlertCircle, Upload } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

// ─── FLIP CAMERA MODE ──────────────────────────────────────────────────────────
function FlipCameraMode() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [cameraState, setCameraState] = useState('loading');
    const [photos, setPhotos] = useState([]); // up to 4 URLs
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async (mode) => {
        setCameraState('loading');
        stopStream();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: mode } }, audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(() => {});
                    setCameraState('ready');
                };
            }
        } catch (err) {
            setCameraState(err.name === 'NotAllowedError' ? 'denied' : 'unavailable');
        }
    }, [stopStream]);

    useEffect(() => {
        startCamera(facingMode);
        return stopStream;
    }, [facingMode]);

    // Auto-proceed when 4 photos captured
    useEffect(() => {
        if (photos.length === 4) proceed(photos);
    }, [photos]);

    const takePhoto = async () => {
        if (cameraState !== 'ready' || isUploading || photos.length >= 4) return;
        const canvas = document.createElement('canvas');
        const v = videoRef.current;
        canvas.width = v.videoWidth || 1280;
        canvas.height = v.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(v, 0, 0);
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setIsUploading(true);
            const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([blob], 'photo.jpg', { type: 'image/jpeg' }) });
            setPhotos(p => [...p, file_url]);
            setIsUploading(false);
        }, 'image/jpeg', 0.92);
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []).slice(0, 4 - photos.length);
        if (!files.length) return;
        setIsUploading(true);
        const urls = [];
        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            urls.push(file_url);
        }
        const next = [...photos, ...urls].slice(0, 4);
        setPhotos(next);
        setIsUploading(false);
        e.target.value = '';
        if (next.length === 4) proceed(next);
    };

    const proceed = (photoList) => {
        stopStream();
        const params = new URLSearchParams();
        photoList.forEach((url, i) => params.set(`p${i}`, url));
        navigate(createPageUrl('NewFlip') + '?' + params.toString());
    };

    // Ring segments for 4 photos
    const ringSegments = [0, 1, 2, 3];
    const r = 44; // radius for the ring around 80px button
    const size = (r + 8) * 2;

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', display: cameraState === 'ready' ? 'block' : 'none' }} />

            {cameraState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
            {cameraState === 'denied' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] gap-4 p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                    <p className="text-white font-semibold">Camera Access Denied</p>
                    <button onClick={() => startCamera(facingMode)} className="px-6 py-3 bg-white text-black font-semibold rounded-2xl">Try Again</button>
                </div>
            )}

            {isUploading && (
                <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {/* Top bar */}
            <div className="absolute top-0 w-full px-5 flex justify-between items-center z-20 pt-14">
                <button onClick={() => navigate(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 backdrop-blur-2xl border border-white/20 rounded-full text-white">
                    <X className="w-5 h-5" />
                </button>
                <div className="bg-black/30 backdrop-blur-2xl border border-white/20 rounded-full px-4 py-2">
                    <span className="text-white text-sm font-semibold">{photos.length} / 4 photos</span>
                </div>
                <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} disabled={cameraState !== 'ready'}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 backdrop-blur-2xl border border-white/20 rounded-full text-white disabled:opacity-30">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Photo thumbnails strip */}
            {photos.length > 0 && (
                <div className="absolute top-28 left-0 right-0 z-20 flex justify-center gap-2 px-4">
                    {photos.map((url, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-white/40">
                            <img src={url} className="w-full h-full object-cover" alt="" />
                            <button
                                onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center"
                            >
                                <X className="w-2.5 h-2.5 text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 w-full z-20 flex items-center justify-center gap-8 px-8"
                style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>

                {/* Upload from gallery */}
                <button onClick={() => fileInputRef.current?.click()} disabled={photos.length >= 4 || isUploading}
                    className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all disabled:opacity-30">
                    <Upload className="w-5 h-5 text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

                {/* Shutter with 4-segment ring */}
                <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                        {ringSegments.map(i => {
                            const gap = 4;
                            const segAngle = 90 - gap;
                            const startAngle = i * 90 + gap / 2;
                            const filled = i < photos.length;
                            const sr = (startAngle * Math.PI) / 180;
                            const er = ((startAngle + segAngle) * Math.PI) / 180;
                            const cx = size / 2, cy = size / 2;
                            const x1 = cx + r * Math.cos(sr), y1 = cy + r * Math.sin(sr);
                            const x2 = cx + r * Math.cos(er), y2 = cy + r * Math.sin(er);
                            return (
                                <path key={i}
                                    d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                                    stroke={filled ? 'white' : 'rgba(255,255,255,0.25)'}
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            );
                        })}
                    </svg>
                    <button onClick={takePhoto} disabled={cameraState !== 'ready' || isUploading || photos.length >= 4}
                        className="w-20 h-20 rounded-full bg-white active:scale-95 transition-all disabled:opacity-40">
                    </button>
                </div>

                {/* Proceed manually if < 4 but > 0 */}
                <button
                    onClick={() => proceed(photos)}
                    disabled={photos.length === 0}
                    className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all disabled:opacity-30"
                >
                    <span className="text-white text-xs font-bold">Go</span>
                </button>
            </div>
        </div>
    );
}

// ─── MAIN CREATE PAGE ──────────────────────────────────────────────────────────
export default function Create() {
    const navigate = useNavigate();
    const location = useLocation();
    const isFlipMode = new URLSearchParams(location.search).get('mode') === 'flip';

    if (isFlipMode) return <FlipCameraMode />;

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const fileInputRef = useRef(null);

    const [cameraState, setCameraState] = useState('loading');
    const [facingMode, setFacingMode] = useState('user');
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [captureMode, setCaptureMode] = useState('video');
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const timerRef = useRef(null);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async (mode) => {
        setCameraState('loading');
        stopStream();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(() => {});
                    setCameraState('ready');
                };
            }
        } catch (err) {
            setCameraState(err.name === 'NotAllowedError' ? 'denied' : 'unavailable');
        }
    }, [stopStream]);

    useEffect(() => {
        if (!navigator.mediaDevices?.getUserMedia) { setCameraState('unavailable'); return; }
        startCamera(facingMode);
        return stopStream;
    }, [facingMode]);

    const goToEdit = (url, type) => {
        navigate(createPageUrl('EditMedia') + `?url=${encodeURIComponent(url)}&type=${type}`);
    };

    const takePhoto = () => {
        if (!videoRef.current || cameraState !== 'ready') return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 1280;
        canvas.height = videoRef.current.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setIsUploading(true);
            const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([blob], 'photo.jpg', { type: 'image/jpeg' }) });
            goToEdit(file_url, 'photo');
            setIsUploading(false);
        }, 'image/jpeg', 0.92);
    };

    const startRecording = useCallback(() => {
        if (!streamRef.current || isRecording || cameraState !== 'ready') return;
        chunksRef.current = [];
        const mimeType = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
        const mr = new MediaRecorder(streamRef.current, { mimeType });
        mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = async () => {
            clearInterval(timerRef.current);
            setRecordingSeconds(0);
            const blob = new Blob(chunksRef.current, { type: mimeType });
            if (blob.size < 1000) return;
            setIsUploading(true);
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([blob], `video.${ext}`, { type: mimeType }) });
            goToEdit(file_url, 'video');
            setIsUploading(false);
        };
        mediaRecorderRef.current = mr;
        mr.start(100);
        setIsRecording(true);
        timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    }, [isRecording, cameraState]);

    const stopRecording = useCallback(() => {
        if (!isRecording) return;
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        clearInterval(timerRef.current);
    }, [isRecording]);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        goToEdit(file_url, file.type.startsWith('image') ? 'photo' : 'video');
        setIsUploading(false);
        e.target.value = '';
    };

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', display: cameraState === 'ready' ? 'block' : 'none' }} />

            {cameraState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
            {cameraState === 'denied' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] gap-4 p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                    <p className="text-white font-semibold">Camera Access Denied</p>
                    <p className="text-white/50 text-sm">Allow camera access in your browser settings.</p>
                    <button onClick={() => startCamera(facingMode)} className="px-6 py-3 bg-white text-black font-semibold rounded-2xl">Try Again</button>
                </div>
            )}
            {cameraState === 'unavailable' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] gap-4 p-8 text-center">
                    <Camera className="w-12 h-12 text-white/40" />
                    <p className="text-white/60 text-sm">No camera found. Upload a file below.</p>
                </div>
            )}

            {isUploading && (
                <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-lg flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-white font-semibold">Uploading...</p>
                </div>
            )}

            {isRecording && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-sm font-mono font-bold">{formatTime(recordingSeconds)}</span>
                </div>
            )}

            {/* Top bar */}
            <div className="absolute top-0 w-full px-5 flex justify-between items-center z-20 pt-14">
                <Link to={createPageUrl('Home')} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 backdrop-blur-2xl border border-white/20 rounded-full text-white">
                    <X className="w-5 h-5" />
                </Link>
                <div className="flex gap-1 bg-black/30 backdrop-blur-2xl border border-white/20 rounded-full p-1">
                    <button onClick={() => setCaptureMode('video')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${captureMode === 'video' ? 'bg-white text-black' : 'text-white/70'}`}>
                        <Video className="w-3.5 h-3.5" /> Video
                    </button>
                    <button onClick={() => setCaptureMode('photo')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${captureMode === 'photo' ? 'bg-white text-black' : 'text-white/70'}`}>
                        <Camera className="w-3.5 h-3.5" /> Photo
                    </button>
                </div>
                <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} disabled={cameraState !== 'ready'}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 backdrop-blur-2xl border border-white/20 rounded-full text-white disabled:opacity-30">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 w-full z-20 flex items-center justify-center gap-10 px-8"
                style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>
                <button onClick={() => fileInputRef.current?.click()}
                    className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
                    <ImageIcon className="w-5 h-5 text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={handleFileUpload} />

                {captureMode === 'photo' ? (
                    <button onClick={takePhoto} disabled={cameraState !== 'ready' || isUploading}
                        className="relative w-20 h-20 rounded-full p-[5px] border-[3px] border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 transition-all disabled:opacity-40">
                        <div className="w-full h-full rounded-full bg-white" />
                    </button>
                ) : (
                    <button
                        onPointerDown={startRecording} onPointerUp={stopRecording} onPointerLeave={stopRecording}
                        disabled={cameraState !== 'ready' || isUploading}
                        className={`relative w-20 h-20 rounded-full p-[4px] border transition-all duration-300 disabled:opacity-40 ${isRecording ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}>
                        <div className={`w-full h-full rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 scale-[0.45] rounded-lg' : 'bg-white'}`} />
                    </button>
                )}
                <div className="w-12 h-12" />
            </div>
        </div>
    );
}