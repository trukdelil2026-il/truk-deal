import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, LogIn, ChevronLeft, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';
import LandingPage from './components/LandingPage';
import CRMDashboard from './components/CRMDashboard';
import TenderModule from './components/TenderModule';
import ClientPortal from './components/ClientPortal';
import DriverPortal from './components/DriverPortal';
import PostMoveFeedback from './components/PostMoveFeedback';

// Official Apps Script endpoint supplied by the user
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzfzwyCakn7M5id7RDLxmSw1CqfkEKIewIPdsPJKSDPxEXx2kYs_sDkRnSxbspgF85lOQ/exec";

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'crm' | 'tender' | 'client-portal' | 'driver-portal' | 'customer-feedback'>('landing');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Quick callback counter to notify the CRM that leads count has changed
  const [leadsChangeTrigger, setLeadsChangeTrigger] = useState(0);

  const handleLeadAdded = () => {
    setLeadsChangeTrigger((prev) => prev + 1);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setLoginError('נא להזין סיסמת גישה למערכת');
      return;
    }

    // Demo/Admin Password check
    // We allow "1234" or "admin" or simply clicking the bypass demo login
    if (password.toLowerCase() === 'admin' || password === '1234' || password === 'trukdeal') {
      setLoginError(null);
      setView('crm');
      setPassword('');
    } else {
      setLoginError('סיסמת אבטחה שגויה. השתמש בסיסמת ברירת המחדל "1234" או "admin" למטרות הדגמה.');
    }
  };

  const handleDemoBypass = () => {
    setLoginError(null);
    setView('crm');
    setPassword('');
  };

  return (
    <div className="bg-[#0a192f] text-slate-100 min-h-screen selection:bg-[#ff7f00] selection:text-white relative overflow-x-hidden">
      
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: LANDING PAGE */}
        {view === 'landing' && (
          <motion.div
            key="landing-page"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <LandingPage 
              onEnterCRM={() => setView('login')} 
              googleScriptUrl={GOOGLE_SCRIPT_URL}
              onLeadAdded={handleLeadAdded}
              onEnterTender={() => setView('tender')}
              onEnterClientPortal={() => setView('client-portal')}
              onEnterDriverPortal={() => setView('driver-portal')}
              onEnterFeedback={() => setView('customer-feedback')}
            />
          </motion.div>
        )}

        {/* VIEW 2: CRM LOGIN GATE */}
        {view === 'login' && (
          <motion.div
            key="login-gate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-tr from-[#061121] via-[#0a192f] to-[#0d213e]"
          >
            {/* Background elements */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#ff7f00]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="max-w-md w-full bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative text-right">
              
              {/* Header */}
              <div className="text-center space-y-3 pb-4 border-b border-slate-800/80 mb-6">
                <img 
                  src="https://i.ibb.co/Ldb5GCxF/logo.png" 
                  alt="Truk Deal logo" 
                  className="w-12 h-12 object-contain mx-auto animate-pulse"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-extrabold text-lg text-white">שער אבטחה - Truk Deal il</h3>
                  <p className="text-xs text-slate-400">לוח משלוחים ו-CRM מיועד למורשי גישה ומשגרים בלבד</p>
                </div>
              </div>

              {loginError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold mb-4 leading-relaxed">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Username placeholder for design completeness */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">מזהה אופרטור / אימייל</label>
                  <input
                    type="text"
                    disabled
                    value="truk.delil2026@gmail.com"
                    className="w-full bg-[#061121]/50 border border-slate-800 text-slate-400 rounded-xl px-4 py-2.5 text-xs focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* Password field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">סיסמת אבטחה פנימית</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="הקש סיסמה (ברירת מחדל: 1234)"
                      className="w-full bg-[#061121] border border-slate-800 focus:border-[#ff7f00] text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#ff7f00] hover:bg-[#e06f00] text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-lg shadow-[#ff7f00]/10 flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  אימות כניסה למערכת
                </button>
              </form>

              {/* Sandbox Bypass Option */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                <button
                  onClick={handleDemoBypass}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <ShieldCheck className="w-4 h-4 text-[#ff7f00]" />
                  כניסה מהירה למטרת הדגמה (Bypass)
                </button>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  הזן <span className="font-bold text-slate-400">1234</span> או לחץ על לחצן המעקף המהיר למעלה כדי לבחון את ה-CRM המלא, מפת ה-GPS והסנכרון הדו-כיווני.
                </p>
              </div>

              {/* Back to landing link */}
              <button
                onClick={() => setView('landing')}
                className="w-full mt-4 text-center text-xs text-slate-400 hover:text-white hover:underline transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                חזרה לדף הנחיתה של Truk Deal
              </button>

            </div>
          </motion.div>
        )}

        {/* VIEW 3: SECURED CRM DASHBOARD */}
        {view === 'crm' && (
          <motion.div
            key="crm-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <CRMDashboard 
              onBackToLanding={() => setView('landing')}
              googleScriptUrl={GOOGLE_SCRIPT_URL}
            />
          </motion.div>
        )}

        {/* VIEW 4: TENDER MODULE PORTAL */}
        {view === 'tender' && (
          <motion.div
            key="tender-portal"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <TenderModule 
              onBackToLanding={() => setView('landing')}
              googleScriptUrl={GOOGLE_SCRIPT_URL}
              onEnterClientPortal={() => setView('client-portal')}
            />
          </motion.div>
        )}

        {/* VIEW 5: CLIENT PERSONAL PWA PORTAL */}
        {view === 'client-portal' && (
          <motion.div
            key="client-portal-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <ClientPortal 
              onBackToLanding={() => setView('landing')}
              googleScriptUrl={GOOGLE_SCRIPT_URL}
            />
          </motion.div>
        )}

        {/* VIEW 6: DRIVER FIELD PWA WORKSPACE */}
        {view === 'driver-portal' && (
          <motion.div
            key="driver-portal-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <DriverPortal 
              onBackToLanding={() => setView('landing')}
              googleScriptUrl={GOOGLE_SCRIPT_URL}
            />
          </motion.div>
        )}

        {/* VIEW 7: POST-MOVE FEEDBACK PAGE */}
        {view === 'customer-feedback' && (
          <motion.div
            key="customer-feedback-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <PostMoveFeedback 
              onBackToLanding={() => setView('landing')}
            />
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
