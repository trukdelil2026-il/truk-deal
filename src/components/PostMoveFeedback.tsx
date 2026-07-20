import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, MessageSquare, CheckCircle, AlertTriangle, ArrowLeft, Heart, 
  Send, ExternalLink, HelpCircle, PhoneCall, Sparkles, Truck, ShieldCheck, 
  ThumbsUp, MessageCircle, RefreshCw
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, limit } from 'firebase/firestore';

interface PostMoveFeedbackProps {
  onBackToLanding: () => void;
  prefilledTracking?: string;
  prefilledName?: string;
  prefilledPhone?: string;
}

export default function PostMoveFeedback({ 
  onBackToLanding, 
  prefilledTracking = '', 
  prefilledName = '', 
  prefilledPhone = '' 
}: PostMoveFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [customerName, setCustomerName] = useState(prefilledName);
  const [phone, setPhone] = useState(prefilledPhone);
  const [trackingNumber, setTrackingNumber] = useState(prefilledTracking);
  const [comment, setComment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto fill tracking details if we find something in localStorage
  useEffect(() => {
    if (!prefilledTracking) {
      const savedTender = localStorage.getItem('last_submitted_tender');
      if (savedTender) {
        try {
          const parsed = JSON.parse(savedTender);
          setTrackingNumber(parsed.trackingNumber || '');
          setCustomerName(parsed.customerName || '');
          setPhone(parsed.phone || '');
        } catch (e) {
          console.warn(e);
        }
      }
    }
  }, [prefilledTracking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMessage('נא לבחור דירוג כוכבים (1 עד 5)');
      return;
    }
    if (!customerName.trim() || !phone.trim()) {
      setErrorMessage('נא למלא שם מלא ומספר טלפון ליצירת קשר');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const reviewPayload = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      trackingNumber: trackingNumber.trim().toUpperCase() || 'TRK-GEN-' + Math.floor(1000 + Math.random() * 9000),
      rating,
      comment: comment.trim(),
      createdAt: new Date().toLocaleString('he-IL'),
      status: rating >= 4 ? 'google_review' : 'pending_admin', // Smart Routing
      notes: ''
    };

    try {
      // Write review to Firestore
      await addDoc(collection(db, 'reviews'), reviewPayload);

      // Write an automated notification alert to DB about the new review
      await addDoc(collection(db, 'notifications'), {
        id: `noti_${Date.now()}`,
        recipient: 'admin',
        recipientPhone: '052-0000000',
        type: 'sms',
        triggerPoint: 'feedback_received',
        title: rating >= 4 ? 'פידבק חיובי חדש קיבל דירוג גבוה!' : 'התראת משבר: התקבלה ביקורת נמוכה!',
        message: `הלקוח ${customerName} דירג ${rating} כוכבים עם חוות דעת: "${comment || 'ללא מלל'}". הובלה מספר: ${trackingNumber}`,
        timestamp: new Date().toLocaleString('he-IL'),
        read: false
      });

      // Write a log in activity logs
      await addDoc(collection(db, 'activity_logs'), {
        id: `log_fb_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('he-IL'),
        category: rating >= 4 ? 'system' : 'lead',
        message: `חוות דעת חדשה נקלטה במנוע המשוב: ${rating} כוכבים מאת ${customerName}`,
        user: 'מערכת משוב אוטומטית'
      });

      setSubmitted(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setErrorMessage('שגיאה בשמירת המשוב במערכת הענן. נא לנסות שנית.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-slate-100 font-sans py-12 px-4 relative overflow-hidden flex flex-col items-center justify-center text-right" dir="rtl" id="post-move-feedback-root">
      
      {/* Visual ambient gradients for premium aesthetic */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#ff7f00]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#002d62]/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="max-w-2xl w-full bg-[#0e1e38] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        
        {/* Brand Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-800/80 mb-8">
          <div className="flex justify-center items-center gap-3">
            <div className="w-12 h-12 bg-[#ff7f00] rounded-xl flex items-center justify-center font-black text-[#0a192f] text-3xl shadow-lg shadow-[#ff7f00]/10">T</div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block">Truk Dealil IL</span>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">מנוע איסוף ביקורות ומשוב לקוחות</span>
            </div>
          </div>
          <p className="text-xs text-[#ff7f00] font-bold">איך היה המעבר שלך עם Truk Deal?</p>
        </div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="feedback-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-white">אנו מעריכים את דעתך מאוד!</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
                  אנא הקדש חצי דקה כדי לדרג את חווית שירותי ההובלה, הסבלות והתקשורת שקיבלת מהמוביל ומנהל התיק ב-Truk Deal.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Star rating picker widget */}
                <div className="bg-[#061121] border border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-inner">
                  <span className="text-xs font-bold text-slate-300 block">דרג את ההובלה (לחץ על הכוכבים) *</span>
                  
                  <div className="flex items-center justify-center gap-3 py-2">
                    {[1, 2, 3, 4, 5].map((index) => {
                      const active = index <= (hoverRating || rating);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setRating(index)}
                          onMouseEnter={() => setHoverRating(index)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none transition-transform active:scale-125 cursor-pointer"
                          aria-label={`דירוג ${index} כוכבים`}
                        >
                          <Star
                            className={`w-10 h-10 ${
                              active 
                                ? 'text-[#ff7f00] fill-[#ff7f00] filter drop-shadow-[0_0_8px_rgba(255,127,0,0.5)]' 
                                : 'text-slate-600'
                            } transition-all duration-155`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-4">
                    <AnimatePresence mode="wait">
                      {(hoverRating || rating) > 0 && (
                        <motion.span
                          key={hoverRating || rating}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="text-xs font-black text-[#ff7f00]"
                        >
                          {(hoverRating || rating) === 1 && '👎 טעון שיפור משמעותי'}
                          {(hoverRating || rating) === 2 && '🙁 פחות מרוצה'}
                          {(hoverRating || rating) === 3 && '😐 שירות סביר / ממוצע'}
                          {(hoverRating || rating) === 4 && '😊 שירות מצוין ואיכותי'}
                          {(hoverRating || rating) === 5 && '👑 חוויה מדהימה ויוצאת דופן!'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">שם מלא *</label>
                    <input
                      type="text"
                      required
                      placeholder="ישראל ישראלי"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#061121] border border-slate-800 focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">מספר טלפון נייד *</label>
                    <input
                      type="tel"
                      required
                      placeholder="054-0000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#061121] border border-slate-800 focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">מספר מעקב הובלה (אם יש)</label>
                    <input
                      type="text"
                      placeholder="לדוגמה: TRK-2026-1044"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full bg-[#061121] border border-slate-800 focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">פרט על השירות וחוות דעתך</label>
                  <textarea
                    rows={4}
                    placeholder="איך עבר המעבר? פרט על הנהג, המשאית, דיוק בזמנים, שמירה על המוצרים, ומחיר..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-[#061121] border border-slate-800 focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#ff7f00] to-[#e06f00] hover:from-[#ff8f1a] hover:to-[#f07c0a] text-white font-black text-xs py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff7f00]/10 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>שומר את המשוב במערכת...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>שלח משוב דיגיטלי כעת</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* SUBMITTED SCREEN - Smart Routing outcome */
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 py-6"
            >
              {rating >= 4 ? (
                /* HIGH RATING ROUTING - GOOGLE REVIEWS REDIRECT */
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Heart className="w-8 h-8 fill-emerald-400/20" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white">תודה ענקית על הפרגון המדהים!</h2>
                    <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                      שמחנו לדעת שחווית שירות של <strong className="text-[#ff7f00]">{rating} כוכבים</strong> עם Truk Deal. הביקורת שלך נקלטה במערכת בהצלחה ותסייע לנו לתגמל את צוות הנהגים.
                    </p>
                  </div>

                  {/* Smart Redirect Card */}
                  <div className="bg-[#061121] border border-slate-800 p-5 rounded-2xl max-w-md mx-auto space-y-4 text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">עזור לנו לצמוח בגוגל! 🌟</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                          מכיוון שדירגת אותנו גבוה מאוד, נשמח אם תשתף את החוויה הנהדרת שלך גם בביקורות גוגל (Google Reviews). זה לוקח 10 שניות ויעזור ללקוחות אחרים למצוא אותנו!
                        </p>
                      </div>
                    </div>

                    <a
                      href="https://g.page/r/search"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#4285F4] hover:bg-[#357ae8] text-white font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4285F4]/10 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>פרסם כעת בגוגל (Google Reviews)</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* LOW RATING ROUTING - INTERNAL RESOLUTION */
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white">אנו מתנצלים מקרב לב</h2>
                    <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                      חווית שירות ברמה של <strong className="text-[#ff7f00]">{rating} כוכבים</strong> אינה עומדת בסטנדרטים המחמירים של Truk Deal IL. אנו לוקחים זאת ברצינות הגבוהה ביותר.
                    </p>
                  </div>

                  {/* Smart Redirect Card */}
                  <div className="bg-[#1f1315] border border-rose-950/40 p-5 rounded-2xl max-w-md mx-auto space-y-4 text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-rose-400 block">הפנייה שלך סומנה כדחופה! 🔥</span>
                        <p className="text-[10px] text-slate-300 mt-0.5 leading-normal">
                          פנייתך נשלחה ישירות לניהול הטיפול האישי של מנהל התפעול הראשי ב-Admin Dashboard. אנו בוחנים את לוג הנסיעה ומעקב ה-GPS של הנהג שלך, וניצור עמך קשר טלפוני תוך דקות ספורות לפתרון הבעיה לשביעות רצונך.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset / Go back buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onBackToLanding}
                  className="w-full sm:w-auto bg-[#0e1e38] hover:bg-slate-800 text-slate-300 font-bold text-xs px-6 py-2.5 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
                >
                  חזרה לדף הבית
                </button>
                
                <button
                  onClick={() => {
                    setRating(0);
                    setComment('');
                    setSubmitted(false);
                  }}
                  className="text-xs text-[#ff7f00] hover:underline"
                >
                  שלח חוות דעת נוספת
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <div className="mt-8 text-center text-[10px] text-slate-500">
        <p>© 2026 Truk Deal IL • מנוע משוב לקוחות דיגיטלי • סקר שביעות רצון פנימי מאובטח</p>
      </div>

    </div>
  );
}
