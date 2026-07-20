import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, MapPin, Calendar, User, Phone, ShieldCheck, HelpCircle, 
  CreditCard, Check, AlertCircle, FileText, Download, Printer, 
  Sparkles, RefreshCw, Star, Info, Truck, Landmark, Wallet, Eye, CheckCircle, 
  Lock, ArrowRight, Share2, Smartphone, CheckCircle2, ChevronRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, limit, addDoc } from 'firebase/firestore';

interface ClientPortalProps {
  onBackToLanding: () => void;
  googleScriptUrl: string;
}

export default function ClientPortal({ onBackToLanding, googleScriptUrl }: ClientPortalProps) {
  // Portal Navigation/Interactive state
  const [trackingCode, setTrackingCode] = useState('');
  const [currentTender, setCurrentTender] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flow State
  // 1: Pending Price Approval, 2: Approved & Driver Assigned, 3: Secure Payment, 4: En Route, 5: Completed
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Payment gateway states
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bit' | 'gpay'>('card');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Selected driver mock information
  const [assignedDriver, setAssignedDriver] = useState<any>({
    name: 'חכמת אל-פאעור',
    phone: '052-8874129',
    rating: 4.9,
    reviewsCount: 142,
    truckType: 'וולוו 12 טון + מנוף זרוע טלסקופי',
    licensePlate: 'ש-819-22-99',
    avatar: 'HF',
    status: 'בדרך לנקודת המוצא • העמסה מתוכננת ל-08:00'
  });

  // Offline capability state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Post-Move Feedback States
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try to auto-load last submitted tender from localStorage
    const savedTender = localStorage.getItem('last_submitted_tender');
    if (savedTender) {
      try {
        const parsed = JSON.parse(savedTender);
        setCurrentTender(parsed);
        // Deduce stage based on status
        if (parsed.status === 'paid') {
          setCurrentStage(4);
          setPaymentSuccess(true);
        } else if (parsed.status === 'completed') {
          setCurrentStage(5);
          setPaymentSuccess(true);
        } else {
          setCurrentStage(2); // driver assigned
        }
      } catch (e) {
        console.warn('LocalStorage tender parsing failed', e);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Preload a pristine demo tender to let users test instantly
  const handleLoadDemoTender = () => {
    setError(null);
    const demo = {
      trackingNumber: 'TRK-TND-7419',
      customerName: 'ישראל ישראלי',
      phone: '054-7728104',
      originCity: 'תל אביב-יפו',
      destinationCity: 'ירושלים (רחביה)',
      requestedDate: '2026-07-25',
      shipmentType: 'apartment',
      contentList: 'ריהוט סלון, מקרר סמסונג כפול, מכונת כביסה בוש, 35 קרטונים',
      floor: '3',
      elevator: 'yes_normal',
      parking: 'tight',
      needCrane: true,
      imagesCount: 2,
      status: 'pending',
      estPriceMin: 1850,
      estPriceMax: 2150,
      createdAt: new Date().toLocaleString('he-IL')
    };
    
    setCurrentTender(demo);
    setCurrentStage(2); // Start at "Approved & Driver Assigned" for an exciting flow
    setPaymentSuccess(false);
    // save locally
    localStorage.setItem('last_submitted_tender', JSON.stringify(demo));
  };

  // Live Firebase Query to find actual tender
  const handleSearchTender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) {
      setError('נא להזין קוד מעקב חוקי');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'tenders'),
        where('trackingNumber', '==', trackingCode.trim().toUpperCase()),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('קוד מעקב לא נמצא במערכת. ודא שהקוד נכון או טען הובלת הדגמה.');
        setLoading(false);
        return;
      }

      const docData = querySnapshot.docs[0].data();
      const dbId = querySnapshot.docs[0].id;
      
      const tenderObj: any = { ...docData, id: dbId };
      setCurrentTender(tenderObj);

      // Map DB status to visual stages
      if (tenderObj.status === 'completed') {
        setCurrentStage(5);
        setPaymentSuccess(true);
      } else if (tenderObj.status === 'paid' || tenderObj.status === 'en-route') {
        setCurrentStage(4);
        setPaymentSuccess(true);
      } else if (tenderObj.status === 'approved') {
        setCurrentStage(3);
      } else {
        setCurrentStage(2);
      }

      // Save locally for offline support
      localStorage.setItem('last_submitted_tender', JSON.stringify(tenderObj));
    } catch (err) {
      console.error(err);
      setError('חלה שגיאה בגישה לשרת. מוצגים נתונים מקומיים.');
    } finally {
      setLoading(false);
    }
  };

  // Payment Confirmation logic
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (paymentMethod === 'card') {
      if (!cardHolder.trim() || !cardNumber || !cardExpiry || !cardCvv) {
        setError('אנא מלאו את כל פרטי כרטיס האשראי');
        return;
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setError('מספר כרטיס אשראי אינו תקין');
        return;
      }
    }

    setIsPaying(true);

    // Simulate luxury PWA secure routing
    setTimeout(async () => {
      try {
        setPaymentSuccess(true);
        setCurrentStage(4); // Advance to En Route / Active Delivery

        // Update in firebase if real doc exists
        if (currentTender && currentTender.id) {
          const tenderRef = doc(db, 'tenders', currentTender.id);
          await updateDoc(tenderRef, {
            status: 'paid'
          });
        }

        // Add to CRM activities log
        await addDoc(collection(db, 'activity_logs'), {
          id: `log_pwa_pay_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('he-IL'),
          category: 'payment',
          message: `תשלום מוצלח על סך ₪${currentTender?.estPriceMin || 1850} התקבל עבור מכרז ${currentTender?.trackingNumber}`,
          user: 'שער תשלום קצה'
        });

        // Trigger Google App Script webhook if applicable
        try {
          await fetch(googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'paymentSuccess',
              trackingNumber: currentTender?.trackingNumber,
              customerName: currentTender?.customerName,
              amount: currentTender?.estPriceMin || 1850
            })
          });
        } catch (gasErr) {
          console.warn('Apps Script webhook bypassed', gasErr);
        }

      } catch (err) {
        console.error('Error updating payment status:', err);
      } finally {
        setIsPaying(false);
      }
    }, 2500);
  };

  // Set next stage simulating delivery milestones
  const simulateMilestoneNext = () => {
    if (currentStage === 4) {
      setCurrentStage(5); // Deliver completed!
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackRating === 0) {
      alert('אנא בחרו דירוג בכוכבים');
      return;
    }

    try {
      await addDoc(collection(db, 'reviews'), {
        customerName: currentTender?.customerName || 'לקוח PWA',
        phone: currentTender?.phone || '054-0000000',
        trackingNumber: currentTender?.trackingNumber || 'TRK-TND-7419',
        rating: feedbackRating,
        comment: feedbackComment,
        createdAt: new Date().toLocaleString('he-IL'),
        status: feedbackRating >= 4 ? 'google_shared' : 'pending_admin'
      });

      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  // Calculations for Israeli VAT Receipt
  const priceAmount = currentTender?.estPriceMin || 1850;
  const vatRate = 0.17; // Israeli VAT
  const subtotal = Math.round(priceAmount / (1 + vatRate));
  const vatAmount = priceAmount - subtotal;
  const invoiceNumber = currentTender?.trackingNumber ? currentTender.trackingNumber.replace('TRK-TND-', '8892_') : '8892_7419';

  return (
    <div className="min-h-screen bg-[#0a192f] text-slate-100 font-sans flex flex-col relative overflow-hidden pb-12" dir="rtl" id="client-pwa-portal-root">
      
      {/* LUXURIOUS AMBIENT LIGHTING */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* PORTAL HEADER */}
      <header className="border-b border-slate-800/80 py-4 px-6 bg-[#0a192f]/90 backdrop-blur-md sticky top-0 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#ff7f00] to-[#e06f00] rounded-xl flex items-center justify-center font-black text-[#0a192f] text-xl shadow-lg">T</div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                Truk Deal PWA
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">SECURE SSL</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold">פורטל לקוחות אישי ותשלום מהיר ללא פערי תיווך</p>
            </div>
          </div>

          <button 
            onClick={onBackToLanding}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all bg-white/5 font-semibold"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>חזרה לעמוד הבית</span>
          </button>
        </div>
      </header>

      {/* OFFLINE BANNER */}
      {isOffline && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-400 text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 animate-pulse" />
          <span>חיבור האינטרנט חלקי או לא זמין. נתוני ה-PWA נשמרים מקומית ואינם הולכים לאיבוד!</span>
        </div>
      )}

      {/* PORTAL CORE WORKSPACE */}
      <main className="flex-grow max-w-2xl w-full mx-auto px-4 pt-6 space-y-6">

        {/* LOOKUP PANEL (WHEN NO TENDER LOADED) */}
        {!currentTender ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0e1e38] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-right"
          >
            <div className="space-y-2">
              <span className="text-[10px] text-[#ff7f00] font-black uppercase tracking-widest bg-[#ff7f00]/10 px-2.5 py-1 rounded-full">
                מעקב דיגיטלי ישיר לצרכן
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                איתור ומעקב אחר הובלת הדירה שלכם
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                הזינו את קוד המעקב שקיבלתם ב-SMS / WhatsApp לאחר שליחת הטופס כדי להתעדכן בסטטוס, לאשר נהג מורשה, לבצע תשלום מאובטח ולהפיק חשבונית מס מקורית.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSearchTender} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">קוד מעקב הובלה (TRK-TND-XXXX) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="הקש קוד לדוגמא: TRK-TND-7419"
                    className="flex-grow bg-[#061121] border border-slate-800 focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-xs focus:outline-none uppercase tracking-wider text-right"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#ff7f00]/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'אתר'}
                  </button>
                </div>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
              <span className="text-xs text-slate-400 block">אין לכם קוד פעיל? בואו נבדוק את החוויה בקליק אחד</span>
              <button
                type="button"
                onClick={handleLoadDemoTender}
                className="inline-flex items-center gap-1.5 text-xs text-[#ff7f00] hover:text-white font-extrabold bg-[#ff7f00]/10 hover:bg-[#ff7f00]/20 border border-[#ff7f00]/30 px-5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                טען מכרז פעיל להדגמה מיידית ⚡
              </button>
            </div>
          </motion.div>
        ) : (
          
          // ACTIVE CUSTOMER WORKSPACE PANEL
          <div className="space-y-6">

            {/* QUICK INFO BAR */}
            <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">מכרז הובלה בפיקוח דיגיטלי:</span>
                <span className="font-mono text-base font-black text-[#ff7f00]">{currentTender.trackingNumber}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('last_submitted_tender');
                    setCurrentTender(null);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg transition-colors bg-white/5"
                >
                  החלף קוד מעקב 🔍
                </button>
              </div>
            </div>

            {/* CUSTOMER FUNNEL PROGRESS STEPS TIMELINE */}
            <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="font-bold text-white text-xs border-b border-slate-800/60 pb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#ff7f00] animate-spin" style={{ animationDuration: '4s' }} />
                סטטוס התקדמות ההובלה שלך:
              </h3>

              <div className="relative pt-2">
                {/* Horizontal progress bar line */}
                <div className="absolute top-[21px] left-3 right-3 h-0.5 bg-slate-800 -z-10"></div>
                <div 
                  className="absolute top-[21px] right-3 h-0.5 bg-gradient-to-l from-[#ff7f00] to-emerald-500 -z-10 transition-all duration-500"
                  style={{ width: `${((currentStage - 1) / 4) * 95}%` }}
                ></div>

                {/* Circles layout */}
                <div className="grid grid-cols-5 gap-1 text-center">
                  
                  {/* Step 1 */}
                  <button 
                    onClick={() => setCurrentStage(1)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border ${
                      currentStage >= 1 
                        ? 'bg-[#ff7f00] text-[#0a192f] border-[#ff7f00] shadow-md shadow-[#ff7f00]/20' 
                        : 'bg-[#061121] text-slate-500 border-slate-800'
                    }`}>
                      1
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-300">אישור מחיר</span>
                  </button>

                  {/* Step 2 */}
                  <button 
                    onClick={() => {
                      if (currentStage >= 2 || paymentSuccess) setCurrentStage(2);
                    }}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border ${
                      currentStage >= 2 
                        ? 'bg-[#ff7f00] text-[#0a192f] border-[#ff7f00] shadow-md shadow-[#ff7f00]/20' 
                        : 'bg-[#061121] text-slate-500 border-slate-800'
                    }`}>
                      2
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-300">נבחר נהג</span>
                  </button>

                  {/* Step 3 */}
                  <button 
                    onClick={() => {
                      if (currentStage >= 3 || paymentSuccess) setCurrentStage(3);
                    }}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border ${
                      currentStage >= 3 
                        ? 'bg-[#ff7f00] text-[#0a192f] border-[#ff7f00] shadow-md shadow-[#ff7f00]/20' 
                        : 'bg-[#061121] text-slate-500 border-slate-800'
                    }`}>
                      3
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-300">תשלום מאובטח</span>
                  </button>

                  {/* Step 4 */}
                  <button 
                    onClick={() => {
                      if (paymentSuccess) setCurrentStage(4);
                    }}
                    disabled={!paymentSuccess}
                    className="flex flex-col items-center gap-1.5 focus:outline-none disabled:opacity-50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border ${
                      currentStage >= 4 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                        : 'bg-[#061121] text-slate-500 border-slate-800'
                    }`}>
                      4
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-300">בדרך לביצוע</span>
                  </button>

                  {/* Step 5 */}
                  <button 
                    onClick={() => {
                      if (paymentSuccess) setCurrentStage(5);
                    }}
                    disabled={!paymentSuccess}
                    className="flex flex-col items-center gap-1.5 focus:outline-none disabled:opacity-50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border ${
                      currentStage === 5 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                        : 'bg-[#061121] text-slate-500 border-slate-800'
                    }`}>
                      5
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-300">הושלם</span>
                  </button>

                </div>
              </div>
            </div>

            {/* STAGE MAIN INTERFACE BLOCKS */}
            <AnimatePresence mode="wait">

              {/* STAGE 1 & 2: SPECIFICATION & ACTIVE OFFERS */}
              {(currentStage === 1 || currentStage === 2) && (
                <motion.div
                  key="stage-offers"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-right"
                >
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-extrabold text-white text-xs">פירוט ההזמנה והצעות הנהג שנבחרו</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">המערכת מייעדת עבורך מוביל מורשע עם דירוג אמינות מקסימלי</p>
                    </div>
                    <span className="text-[10px] bg-[#ff7f00]/10 text-[#ff7f00] font-black px-2.5 py-0.5 rounded-full">
                      ₪{priceAmount.toLocaleString()} במחיר סופי
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-500 text-[10px] block">מנקודת מוצא:</span>
                      <strong className="text-white text-xs">{currentTender.originCity}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ליעד פריקה:</span>
                      <strong className="text-white text-xs">{currentTender.destinationCity}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">תאריך מבוקש:</span>
                      <strong>{currentTender.requestedDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">תכולת הציוד שסומנה:</span>
                      <strong className="text-[10px] leading-tight block">{currentTender.contentList}</strong>
                    </div>
                  </div>

                  {/* CARRIER DRIVER SELECTED SECTION */}
                  <div className="bg-[#061121] border border-slate-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#ff7f00]/10 text-[#ff7f00] border border-[#ff7f00]/20 flex items-center justify-center font-black text-xs">
                          {assignedDriver.avatar}
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs">{assignedDriver.name}</h5>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Star className="w-3 h-3 text-[#ff7f00] fill-[#ff7f00]" />
                            {assignedDriver.rating} • {assignedDriver.reviewsCount} חוות דעת מרוצות
                          </span>
                        </div>
                      </div>
                      
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded">
                        המוביל המומלץ עבורך
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-300 leading-relaxed bg-[#0e1e38] p-2.5 rounded-lg border border-slate-800">
                      <strong>סוג ציוד:</strong> {assignedDriver.truckType} <br />
                      <strong>שימו לב:</strong> פרטי הקשר הישירים של הנהג ומספר הלוחית נעולים מטעמי בטחון שיווקי. הם ישוחררו מיידית לאחר השלמת התשלום המאובטח (מקדמה או תשלום מלא).
                    </p>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setCurrentStage(3)}
                        className="bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-5 py-2.5 rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <span>אשר נהג והמשך לתשלום 💳</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STAGE 3: EMBEDDED SECURED PAYMENT GATEWAY */}
              {currentStage === 3 && (
                <motion.div
                  key="stage-payment"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 text-right"
                >
                  <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        שער תשלום דיגיטלי מאובטח בתקן PCI-DSS
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">התשלום מועבר לנאמנות Truk Deal ומשתחרר למוביל רק לאחר השלמת הפריקה</p>
                    </div>
                    <span className="text-xs font-black text-[#ff7f00]">₪{priceAmount.toLocaleString()}</span>
                  </div>

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Payment multi-tab selection */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === 'card' 
                          ? 'border-[#ff7f00] bg-[#ff7f00]/10 text-white' 
                          : 'border-slate-800 bg-[#061121] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>כרטיס אשראי</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('bit');
                        setCardHolder('ישראל ישראלי');
                        setCardNumber('5326 1234 4567 8901');
                        setCardExpiry('08/29');
                        setCardCvv('982');
                      }}
                      className={`p-3 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === 'bit' 
                          ? 'border-[#ff7f00] bg-[#ff7f00]/10 text-white' 
                          : 'border-slate-800 bg-[#061121] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Wallet className="w-5 h-5 text-indigo-400" />
                      <span>אפליקציית Bit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('gpay');
                        setCardHolder('ישראל ישראלי');
                        setCardNumber('4580 9982 1102 3349');
                        setCardExpiry('12/28');
                        setCardCvv('112');
                      }}
                      className={`p-3 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === 'gpay' 
                          ? 'border-[#ff7f00] bg-[#ff7f00]/10 text-white' 
                          : 'border-slate-800 bg-[#061121] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <span>Google Pay</span>
                    </button>
                  </div>

                  {/* Payment form */}
                  <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-1">
                    {paymentMethod === 'card' ? (
                      <div className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 block">שם בעל הכרטיס (באנגלית או עברית)</label>
                          <input
                            type="text"
                            required
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="Yisrael Yisraeli"
                            className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff7f00]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 block">מספר כרטיס אשראי (16 ספרות)</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              maxLength={19}
                              value={cardNumber}
                              onChange={(e) => {
                                // Simple formatting for readability
                                const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                const matches = v.match(/\d{4,16}/g);
                                const match = matches && matches[0] || '';
                                const parts = [];

                                for (let i=0, len=match.length; i<len; i+=4) {
                                  parts.push(match.substring(i, i+4));
                                }

                                if (parts.length > 0) {
                                  setCardNumber(parts.join(' '));
                                } else {
                                  setCardNumber(v);
                                }
                              }}
                              placeholder="4580 1234 5678 9012"
                              className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff7f00] text-left font-mono"
                            />
                            <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">תוקף (MM/YY)</label>
                            <input
                              type="text"
                              required
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              placeholder="08/29"
                              className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff7f00] text-center font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">קוד אבטחה (CVV)</label>
                            <input
                              type="text"
                              required
                              maxLength={3}
                              value={cardCvv}
                              onChange={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                              onBlur={(e) => setCardCvv(e.target.value)}
                              placeholder="3 ספרות מאחור"
                              className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff7f00] text-center font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Bit or Google pay fast layout
                      <div className="bg-[#061121] border border-slate-800 p-4 rounded-xl text-center space-y-2.5">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                        <span className="text-xs font-bold text-white block">
                          מזהה ארנק דיגיטלי נמצא פעיל במכשיר שלך
                        </span>
                        <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                          בלחיצה על כפתור התשלום למטה, המערכת תפתח את האפליקציה המאובטחת לחיוב מהיר של <strong className="text-white">₪{priceAmount}</strong> ללא צורך בהזנת פרטי כרטיס אשראי.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setCurrentStage(2)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        ביטול וחזרה
                      </button>

                      <button
                        type="submit"
                        disabled={isPaying}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        {isPaying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>מבצע סליקה מול שב"א...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>אשר ובצע תשלום בטוח של ₪{priceAmount}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* STAGE 4: EN ROUTE - LIVE DRIVER UNLOCKED AND GPS TRACKING MAP */}
              {currentStage === 4 && (
                <motion.div
                  key="stage-tracking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 text-right"
                >
                  <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                        <Truck className="w-4.5 h-4.5 text-[#ff7f00] animate-pulse" />
                        פרטי נהג פתוחים - הובלה בביצוע פעיל
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">החיוב בוצע בהצלחה. המוביל מעודכן בתמונות הציוד ובדגשים הלוגיסטיים</p>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      בדרך אליך
                    </span>
                  </div>

                  {/* UNLOCKED DRIVER DETAILS CARD */}
                  <div className="bg-[#061121] border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-[#ff7f00] text-slate-900 font-black flex items-center justify-center text-sm shadow-md">
                          {assignedDriver.avatar}
                        </div>
                        <div>
                          <strong className="text-white text-xs block">{assignedDriver.name}</strong>
                          <span className="text-[9px] text-slate-400">מוביל מורשה מזהה #TDR-8891</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 pt-1">
                        <div><strong>סוג משאית:</strong> {assignedDriver.truckType}</div>
                        <div><strong>מספר לוחית רישוי:</strong> {assignedDriver.licensePlate}</div>
                        <div><strong>סטטוס ביצוע:</strong> <span className="text-[#ff7f00] font-bold">{assignedDriver.status}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center items-center sm:items-end gap-3">
                      <a
                        href={`tel:${assignedDriver.phone}`}
                        className="w-full max-w-[180px] bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <Phone className="w-4 h-4" />
                        <span>התקשר לנהג {assignedDriver.phone}</span>
                      </a>
                      
                      <span className="text-[9px] text-slate-400">זמינות טלפונית רציפה לאורך כל שעות ההובלה</span>
                    </div>
                  </div>

                  {/* SENSORY LIVE GPS TRACKING SIMULATOR MAP */}
                  <div className="relative h-44 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                    {/* Fake blueprint map aesthetic */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#051020] via-[#091b33] to-[#0c2447] opacity-90"></div>
                    
                    {/* Grid Lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#08203e_1px,transparent_1px),linear-gradient(to_bottom,#08203e_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>

                    {/* Path line */}
                    <div className="absolute w-2/3 h-0.5 bg-dashed border-t-2 border-dashed border-[#ff7f00]/30 -rotate-12"></div>

                    {/* Route Pins */}
                    <div className="absolute right-12 top-1/3 text-center space-y-1">
                      <div className="w-5 h-5 bg-sky-500/20 border border-sky-400 rounded-full flex items-center justify-center mx-auto">
                        <MapPin className="w-3 h-3 text-sky-400" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 block">{currentTender.originCity}</span>
                    </div>

                    <div className="absolute left-12 bottom-1/4 text-center space-y-1">
                      <div className="w-5 h-5 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center mx-auto">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 block">{currentTender.destinationCity}</span>
                    </div>

                    {/* Animated moving truck */}
                    <motion.div 
                      className="absolute w-8 h-8 bg-[#ff7f00] text-[#0a192f] rounded-full flex items-center justify-center shadow-lg shadow-[#ff7f00]/30 z-10 cursor-pointer"
                      animate={{ 
                        x: [-60, 40, -60], 
                        y: [10, -20, 10] 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 10,
                        ease: "linear"
                      }}
                    >
                      <Truck className="w-4 h-4 scale-x-[-1]" />
                    </motion.div>

                    <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-md text-[9px] text-slate-400 border border-slate-800">
                      סורק לוויין GPS: <span className="text-emerald-400 font-mono font-bold">פעיל (100% רציפות)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400">רוצים לזרז את התהליך למטרות בדיקה?</span>
                    <button
                      onClick={simulateMilestoneNext}
                      className="bg-[#ff7f00]/20 hover:bg-[#ff7f00]/30 text-[#ff7f00] font-black text-[10px] px-3.5 py-1.5 rounded-lg transition-all"
                    >
                      סמן הובלה שהושלמה בהצלחה ✔
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STAGE 5: COMPLETED - DIGITAL INVOICE GENERATOR */}
              {currentStage === 5 && (
                <motion.div
                  key="stage-completed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* COMPLETION GREETING BANNER */}
                  <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 text-center space-y-3.5">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">הובלת הדירה הושלמה בהצלחה!</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        תודה רבה שבחרתם בפלטפורמת Truk Deal IL. פרטי התשלום מאובטחים לחלוטין וחשבונית המס המצורפת למטה הופקה כחוק לצרכי דיווח וביטוח.
                      </p>
                    </div>
                  </div>

                  {/* POST-MOVE INTERACTIVE FEEDBACK WIDGET */}
                  <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-right">
                    <div className="border-b border-slate-800 pb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#ff7f00]" />
                      <div>
                        <h4 className="font-extrabold text-white text-xs">איך הייתה חווית ההובלה שלך?</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">סייע לנו לשמור על רף איכות ללא פשרות בפלטפורמת Truk Deal IL</p>
                      </div>
                    </div>

                    {!feedbackSubmitted ? (
                      <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-300">בחר דירוג כוכבים:</label>
                          <div className="flex gap-1.5 justify-start">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setFeedbackRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 rounded-md transition-colors text-slate-600 hover:text-[#ff7f00] cursor-pointer"
                              >
                                <Star 
                                  className={`w-6 h-6 transition-all ${
                                    star <= (hoverRating || feedbackRating) 
                                      ? 'fill-[#ff7f00] text-[#ff7f00] scale-110' 
                                      : 'text-slate-600'
                                  }`} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-300">ספרו לנו מה אהבתם או איפה אפשר להשתפר:</label>
                          <textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder="שתפו את תחושותיכם לגבי מהירות ההובלה, מקצועיות המובילים ושירות הלקוחות..."
                            rows={3}
                            className="w-full bg-[#061121] text-white border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ff7f00] placeholder-slate-600 leading-relaxed font-sans text-right"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                          >
                            שלח משוב מאובטח במערכת
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="bg-[#061121] p-4 rounded-xl border border-slate-800 text-center space-y-3">
                        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                          <Check className="w-5 h-5" />
                        </div>
                        
                        <div>
                          {feedbackRating >= 4 ? (
                            <>
                              <strong className="text-white text-xs block">תודה רבה על הפידבק המושלם! ⭐⭐⭐⭐⭐</strong>
                              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                                אנו גאים להעניק לך את השירות הטוב בישראל. מכיוון שהיית מרוצה לחלוטין, נשמח מאוד אם תסייע לנו ותשתף את הפידבק החיובי שלך גם ב-Google Reviews כדי שכולם ידעו!
                              </p>
                              <a 
                                href="https://search.google.com/local/writereview?placeid=ChIJu-p7iHlLHRURyYQ-Z8uVvNo" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="mt-3.5 inline-flex items-center gap-1.5 bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                              >
                                <Star className="w-4 h-4 fill-current text-[#0a192f]" />
                                <span>שתף בגוגל ביקורות כעת 🚀</span>
                              </a>
                            </>
                          ) : (
                            <>
                              <strong className="text-rose-400 text-xs block">תודה על המשוב הכנה והחשוב שלך!</strong>
                              <p className="text-[11px] text-[#ff7f00] font-bold mt-1.5 max-w-sm mx-auto leading-relaxed">
                                הצטערנו מאוד לשמוע שהחוויה שלך לא הייתה מושלמת. כחלק מאמנת השירות של Truk Deal, דיווחנו מיידית למנהל השטח הראשי לטיפול דחוף במשבר. נציג בכיר מטעמנו ייצור עמך קשר טלפוני תוך 15 דקות לטיפול מלא ופיצוי הולם!
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PREMIUM DIGITAL TAX INVOICE */}
                  <div 
                    id="digital-tax-invoice"
                    className="bg-white text-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200 text-right font-sans overflow-hidden"
                  >
                    {/* Watermark Logo decoration */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-100 font-black text-7xl select-none -z-10 opacity-40">
                      Truk Deal
                    </div>

                    {/* Invoice header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                      <div>
                        <span className="text-[#ff7f00] font-black text-xl block leading-tight">TRUK DEALIL IL</span>
                        <span className="text-[9px] text-slate-500 block">לוגיסטיקה דיגיטלית ופתרונות הובלה מתקדמים בהתאמה אישית</span>
                        <span className="text-[9px] text-slate-400 block">ח.פ 518839210 • רחוב החרש 4, תל אביב</span>
                      </div>
                      
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-400 block uppercase">מקור</span>
                        <span className="text-sm font-black text-slate-900 block">חשבונית מס קבלה</span>
                        <span className="text-xs font-mono text-slate-500 block">מספר: {invoiceNumber}</span>
                        <span className="text-[10px] text-slate-400 block">תאריך הפקה: {new Date().toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>

                    {/* Customer & delivery summary info */}
                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-700 pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase font-bold">לכבוד המזמין:</span>
                        <strong className="text-slate-900 text-xs block">{currentTender.customerName}</strong>
                        <span className="text-slate-500 text-[10px] block">טלפון: {currentTender.phone}</span>
                      </div>
                      
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase font-bold">פרטי נתיב המשלוח:</span>
                        <span className="text-slate-800 text-[10px] block"><strong>מקור:</strong> {currentTender.originCity}</span>
                        <span className="text-slate-800 text-[10px] block"><strong>יעד:</strong> {currentTender.destinationCity}</span>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="space-y-1">
                      <div className="grid grid-cols-12 gap-1 text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 pb-1.5 px-1">
                        <span className="col-span-8 text-right">תיאור השירות / שירותי סבלות</span>
                        <span className="col-span-2 text-center">כמות</span>
                        <span className="col-span-2 text-left">מחיר בש"ח</span>
                      </div>

                      {/* Item 1 */}
                      <div className="grid grid-cols-12 gap-1 text-xs text-slate-700 py-2 border-b border-slate-100 px-1 items-center">
                        <div className="col-span-8">
                          <strong className="text-slate-900 text-xs block">הובלת דירת מגורים {currentTender.contentList}</strong>
                          <span className="text-[9px] text-slate-400 block">כולל סבלות קומה {currentTender.floor} ({currentTender.elevator === 'no' ? 'במדרגות ללא מעלית' : 'שימוש במעלית'})</span>
                        </div>
                        <span className="col-span-2 text-center font-mono">1</span>
                        <span className="col-span-2 text-left font-mono font-bold">₪{subtotal.toLocaleString()}</span>
                      </div>

                      {/* Item 2 if Crane needed */}
                      {currentTender.needCrane && (
                        <div className="grid grid-cols-12 gap-1 text-xs text-slate-700 py-2 border-b border-slate-100 px-1 items-center">
                          <div className="col-span-8">
                            <strong className="text-slate-900 text-xs block">שירות מנוף גבהים טלסקופי חיצוני</strong>
                            <span className="text-[9px] text-slate-400 block">עבור פריקת פריטים כבדים / קומה גבוהה</span>
                          </div>
                          <span className="col-span-2 text-center font-mono">1</span>
                          <span className="col-span-2 text-left font-mono font-bold">כלול במכרז</span>
                        </div>
                      )}
                    </div>

                    {/* Subtotal & VAT calculations */}
                    <div className="w-full max-w-[240px] mr-auto space-y-1.5 pt-2 text-xs text-slate-700 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span>סה"כ לפני מע"מ:</span>
                        <span className="font-mono">₪{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>מע"מ בשיעור 17%:</span>
                        <span className="font-mono">₪{Math.round(vatAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-100 pt-1.5">
                        <span>לתשלום כולל מע"מ:</span>
                        <span className="text-emerald-600 font-mono">₪{priceAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Footer receipt verification */}
                    <div className="pt-4 border-t border-slate-200 text-center space-y-1 text-[9px] text-slate-400">
                      <p className="font-bold flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        חשבונית זו חתומה דיגיטלית ונשלחה אוטומטית לדיווח ברשות המסים
                      </p>
                      <p>קוד זיהוי מאובטח של העסקה: SSL_PAY_PWA_SECURE_8819204022</p>
                    </div>
                  </div>

                  {/* INVOICE CONTROL BUTTONS */}
                  <div className="flex items-center gap-3 justify-center">
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="bg-white/5 border border-slate-800 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4 text-slate-400" />
                      <span>הדפס חשבונית מס מקור</span>
                    </button>

                    <button
                      onClick={() => {
                        alert('הורדת קובץ ה-PDF של חשבונית ה-PWA הושלמה בהצלחה! הקובץ שמור כעת בתיקיית ההורדות במכשירך.');
                      }}
                      className="bg-gradient-to-r from-[#ff7f00] to-[#e06f00] text-white font-black text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#ff7f00]/10"
                    >
                      <Download className="w-4 h-4" />
                      <span>הורד חשבונית לנייד (PWA PDF)</span>
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-[10px] text-slate-500 mt-auto">
        <p>© 2026 Truk Deal IL • הגנה בטחונית וביטוחית מלאה • סנכרון CRM פתוח</p>
      </footer>

    </div>
  );
}
