import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CommentsSheet({ post, isOpen, onClose, currentUser }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !post?.id) return;
        setIsLoading(true);
        base44.entities.Comment.filter({ post_id: String(post.id) }, 'created_date', 100)
            .then(data => { setComments(data || []); setIsLoading(false); })
            .catch(() => setIsLoading(false));

        const unsub = base44.entities.Comment.subscribe(event => {
            if (event.type === 'create' && event.data?.post_id === String(post.id)) {
                setComments(prev => {
                    if (prev.find(c => c.id === event.data.id)) return prev;
                    return [...prev, event.data];
                });
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
            }
        });
        return unsub;
    }, [isOpen, post?.id]);

    const submitComment = async () => {
        const text = newComment.trim();
        if (!text) return;
        setNewComment('');
        const optimistic = { id: Date.now(), post_id: String(post.id), username: currentUser?.full_name || 'Anonymous', text };
        setComments(prev => [...prev, optimistic]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        base44.entities.Comment.create({ post_id: String(post.id), text, username: currentUser?.full_name || 'Anonymous', avatar: currentUser?.avatar_url || '' }).catch(() => {});
        base44.entities.Post.update(post.id, { comments: (post.comments || 0) + 1 }).catch(() => {});
    };

    return (
        <div
            className={`fixed inset-x-0 bottom-0 z-[100] flex flex-col bg-[#111]/95 backdrop-blur-3xl rounded-t-3xl border-t border-white/10 transition-transform duration-500 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ height: '65vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
        >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/10 shrink-0">
                <h3 className="font-bold text-white text-base">{comments.length} Comments</h3>
                <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 rounded-full">
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>
                {isLoading && <p className="text-white/40 text-sm text-center">Loading...</p>}
                {!isLoading && comments.length === 0 && <p className="text-white/30 text-sm text-center py-8">No comments yet. Be the first!</p>}
                {comments.map(c => (
                    <div key={c.id} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-gradient-to-tr from-purple-500 to-blue-500">
                            {c.avatar && <img src={c.avatar} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <div>
                            <span className="text-xs font-bold text-white/80">{c.username}</span>
                            <p className="text-sm text-white mt-0.5">{c.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex gap-2 items-center shrink-0">
                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitComment()} placeholder="Add a comment..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/40 placeholder-white/40" />
                <button onClick={submitComment} className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white text-black rounded-full shrink-0">
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}