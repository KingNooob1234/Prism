import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, User, MessageSquare, Gamepad2, Images, Video, X } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isCreatePage = currentPath.includes('Create');
  const [showMenu, setShowMenu] = useState(false);

  const go = (path) => { setShowMenu(false); navigate(path); };

  return (
    <div 
      className="bg-[#050505] min-h-screen w-full text-white font-sans overflow-hidden selection:bg-white/30"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {children}

      {/* Create menu backdrop */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      )}

      {!isCreatePage && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
          style={{
            bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
            width: 'min(20rem, 90vw)',
            userSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
        >
          {/* Create menu popup */}
          {showMenu && (
            <div className="mb-3 flex gap-3 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <button
                onClick={() => go(createPageUrl('Create'))}
                className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95 transition-all"
              >
                <Video className="w-5 h-5 text-white" />
                <span className="text-white text-[11px] font-semibold">Camera</span>
              </button>
              <button
                onClick={() => go(createPageUrl('Create') + '?mode=flip')}
                className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95 transition-all"
              >
                <Images className="w-5 h-5 text-white" />
                <span className="text-white text-[11px] font-semibold">Flips</span>
              </button>
            </div>
          )}

          {/* Plus button floats above the dock */}
          <button
            onClick={() => setShowMenu(m => !m)}
            className={`mb-[-26px] z-10 min-w-[44px] min-h-[44px] p-2.5 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] border active:scale-95 transition-all duration-300 flex items-center justify-center ${showMenu ? 'bg-black text-white border-white/30' : 'bg-white text-black border-white/50'}`}
          >
            {showMenu ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>

          {/* Dock pill */}
          <nav className="w-full bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2rem] px-3 pt-2 pb-2 flex items-end justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] gap-0.5">
            <Link
              to={createPageUrl('Home')}
              className={`min-w-[40px] min-h-[40px] self-center flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${currentPath.includes('Home') || currentPath === '/' ? 'bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'opacity-50'}`}
            >
              <Home className="w-6 h-6" />
            </Link>

            <Link
              to={createPageUrl('Flips')}
              className={`min-w-[40px] min-h-[40px] self-center flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${currentPath.includes('Flips') ? 'bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'opacity-50'}`}
            >
              <Images className="w-6 h-6" />
            </Link>

            {/* Games — bottom aligned */}
            <Link
              to={createPageUrl('Games')}
              className={`min-w-[40px] min-h-[40px] self-end flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${currentPath.includes('Games') ? 'bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'opacity-50'}`}
            >
              <Gamepad2 className="w-6 h-6" />
            </Link>

            <Link
              to={createPageUrl('Messages')}
              className={`min-w-[40px] min-h-[40px] self-center flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${currentPath.includes('Messages') ? 'bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'opacity-50'}`}
            >
              <MessageSquare className="w-6 h-6" />
            </Link>

            <Link
              to={createPageUrl('Profile')}
              className={`min-w-[40px] min-h-[40px] self-center flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${currentPath.includes('Profile') ? 'bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'opacity-50'}`}
            >
              <User className="w-6 h-6" />
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}