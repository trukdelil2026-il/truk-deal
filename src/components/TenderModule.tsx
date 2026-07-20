import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Upload, X, Check, AlertCircle, FileText, 
  MapPin, Calendar, Truck, User, Phone, ShieldCheck, HelpCircle,
  Star, CheckCircle2, Sparkles, Smartphone, Layers, Compass, DollarSign,
  Clock, ArrowLeft, Info, RefreshCw, Camera, Video, Cpu
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface TenderModuleProps {
  onBackToLanding: () => void;
  googleScriptUrl: string;
  onEnterClientPortal?: () => void;
}

export default function TenderModule({ onBackToLanding, googleScriptUrl, onEnterClientPortal }: TenderModuleProps) {
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Wizard active step
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    originCity: '',
    destinationCity: '',
    requestedDate: '',
    
    // Technical parameters
    floor: '0',
    elevator: 'yes_spacious' as 'no' | 'yes_normal' | 'yes_spacious',
    parking: 'easy' as 'easy' | 'tight' | 'no_parking',
    needCrane: 'no' as 'no' | 'yes' | 'not_sure',

    // Content Selection
    hasLivingRoom: false,
    hasFridge: false,
    hasWashingMachine: false,
    cartonsCount: 15,
    additionalNotes: ''
  });

  // Photo uploads
  const [images, setImages] = useState<{ file: File; base64: string; preview: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Status & Tracking states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedTender, setSubmittedTender] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Dummy tracking state to simulate live carrier feedback in the tracking panel
  const [simulatedOffers, setSimulatedOffers] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Surveyor & Volume Estimator state variables
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [aiSurveyResult, setAiSurveyResult] = useState<{
    detectedItems: string[];
    estimatedVolume: number;
    estimatedCartons: number;
    needCrane: boolean;
    hasLivingRoom: boolean;
    hasFridge: boolean;
    hasWashingMachine: boolean;
    summaryHebrew: string;
  } | null>(null);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  const runAISurvey = async () => {
    if (images.length === 0) {
      setSurveyError('נא להעלות לפחות תמונה אחת או סרטון לסריקת ה-AI');
      return;
    }

    setIsAnalyzing(true);
    setSurveyError(null);
    setAiSurveyResult(null);

    const steps = [
      'קורא את קבצי המדיה שהעלית...',
      'מעלה ומכין תמונות לעיבוד...',
      'מתחבר למנוע הראייה הממוחשבת של Gemini 3.5-Flash...',
      'סורק רהיטים, מכשירי חשמל וזיהוי חפצים...',
      'מנתח עומסים ומחשב נפח כולל בקוב...',
      'קובע התאמה למשאית וצורך במנוף...',
      'מייצר המלצות ודגשים למעבר...'
    ];

    let stepIndex = 0;
    setAnalysisStep(steps[0]);
    const interval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setAnalysisStep(steps[stepIndex]);
      }
    }, 1200);

    try {
      const base64Images = images.map(img => img.base64);

      const response = await fetch('/api/ai/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images: base64Images })
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'חלה שגיאה בעיבוד הניתוח החזותי בשרת');
      }

      const result = await response.json();
      setAiSurveyResult(result);
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setSurveyError(err.message || 'חלה שגיאה לא צפויה בתהליך הניתוח החזותי.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAISurveyData = () => {
    if (!aiSurveyResult) return;
    
    setFormData((prev) => ({
      ...prev,
      cartonsCount: aiSurveyResult.estimatedCartons || prev.cartonsCount,
      needCrane: aiSurveyResult.needCrane ? 'yes' : 'no',
      hasLivingRoom: aiSurveyResult.hasLivingRoom,
      hasFridge: aiSurveyResult.hasFridge,
      hasWashingMachine: aiSurveyResult.hasWashingMachine,
      additionalNotes: `[סריקה חזותית מבוססת AI ⚡: זוהו הפריטים: ${aiSurveyResult.detectedItems?.join(', ')}. נפח כולל: ${aiSurveyResult.estimatedVolume} קוב. ${aiSurveyResult.summaryHebrew}]\n\n${prev.additionalNotes}`
    }));
  };

  // Listen to PWA installable prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePWAInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Field change helper
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const processFiles = async (files: FileList) => {
    const validImages: { file: File; base64: string; preview: string }[] = [];
    const maxFileSize = 4 * 1024 * 1024; // 4MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setError('ניתן להעלות קבצי תמונה בלבד');
        continue;
      }
      if (file.size > maxFileSize) {
        setError(`הקובץ ${file.name} גדול מדי. הגודל המקסימלי לתמונה הוא 4MB.`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        validImages.push({ file, base64, preview });
      } catch (err) {
        console.error('Failed to parse image file', err);
      }
    }

    if (validImages.length > 0) {
      setImages((prev) => [...prev, ...validImages]);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  // AI-Based Price Estimator Algorithm
  const calculatePriceEstimation = () => {
    let basePrice = 850; // base local moves fee

    // Route distance approximation
    if (formData.originCity && formData.destinationCity) {
      if (formData.originCity.trim() !== formData.destinationCity.trim()) {
        basePrice += 450; // intercity surcharge
      }
    }

    // Floor and elevator complexity
    const floorNum = Number(formData.floor) || 0;
    if (formData.elevator === 'no' && floorNum > 0) {
      basePrice += floorNum * 180; // heavy manual labor per floor
    } else if (formData.elevator === 'yes_normal') {
      basePrice += floorNum * 40; // small elevator delay fee
    }

    // Crane requirements
    if (formData.needCrane === 'yes') {
      basePrice += 500; // crane service
    }

    // Contents size index
    if (formData.hasLivingRoom) basePrice += 300;
    if (formData.hasFridge) basePrice += 150;
    if (formData.hasWashingMachine) basePrice += 120;
    
    const cartons = Number(formData.cartonsCount) || 0;
    basePrice += cartons * 8; // carton loading

    return {
      min: Math.floor(basePrice * 0.9),
      max: Math.ceil(basePrice * 1.1)
    };
  };

  const currentEst = calculatePriceEstimation();

  // Dynamic AI Logistical Tips based on user options
  const getLogisticalTips = () => {
    const tips: string[] = [];

    const floorNum = Number(formData.floor) || 0;
    if (formData.elevator === 'no' && floorNum >= 3) {
      tips.push('סבלות לקומה 3 ומעלה ללא מעלית היא מאומצת מאוד. מומלץ לאשר שיוך משאית מנוף בצעד הבא.');
    }

    if (formData.parking === 'tight' || formData.parking === 'no_parking') {
      tips.push('בחרתם רחוב צר או ללא חנייה קרובה. תיאום מקום עגינה עבור משאית 12 טון ערב קודם ימנע עיכוב של שעות.');
    }

    if (formData.needCrane === 'not_sure' && floorNum > 4) {
      tips.push('לפריקת קומות גבוהות (5+), לרוב מנוף חוסך 30% מעלות ההובלה ומגן על רהיטי יוקרה.');
    }

    if (formData.hasFridge && formData.hasWashingMachine) {
      tips.push('מומלץ לרוקן ולנתק את המקרר ומכונת הכביסה לפחות 4 שעות לפני הגעת צוות המובילים.');
    }

    // Default tip
    if (tips.length === 0) {
      tips.push('השאירו מעברים פנויים בבית ביום המעבר כדי להאיץ את עבודת הסבלים.');
    }

    return tips;
  };

  const activeTips = getLogisticalTips();

  // Validate current wizard steps
  const validateStep1 = () => {
    if (!formData.customerName.trim()) return 'נא להזין שם מלא';
    if (!formData.phone.trim()) return 'נא להזין מספר טלפון';
    
    const phoneClean = formData.phone.replace(/[- ]/g, '');
    const phoneRegex = /^(05\d{8}|0[23489]\d{7})$/;
    if (!phoneRegex.test(phoneClean)) {
      return 'נא להזין מספר טלפון ישראלי תקין (לדוגמה: 050-1234567)';
    }

    if (!formData.originCity.trim()) return 'נא להזין עיר מוצא';
    if (!formData.destinationCity.trim()) return 'נא להזין עיר יעד';
    if (!formData.requestedDate) return 'נא לבחור תאריך מבוקש';
    
    return null;
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      const step1Error = validateStep1();
      if (step1Error) {
        setError(step1Error);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  // Submit Tender form to firebase + sheet
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trackingNum = `TRK-TND-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Setup structured contents for lead notes
      const contentParts = [];
      if (formData.hasLivingRoom) contentParts.push('ריהוט סלון');
      if (formData.hasFridge) contentParts.push('מקרר');
      if (formData.hasWashingMachine) contentParts.push('מכונת כביסה');
      contentParts.push(`${formData.cartonsCount} קרטונים`);
      
      const contentSummary = contentParts.join(', ');

      const payload = {
        action: 'submitTender',
        customerName: formData.customerName,
        phone: formData.phone,
        originCity: formData.originCity,
        destinationCity: formData.destinationCity,
        requestedDate: formData.requestedDate,
        shipmentType: 'apartment',
        contentList: `סלון: ${formData.hasLivingRoom ? 'כן' : 'לא'}, מקרר: ${formData.hasFridge ? 'כן' : 'לא'}, מכונת כביסה: ${formData.hasWashingMachine ? 'כן' : 'לא'}, קרטונים: ${formData.cartonsCount}. הערות: ${formData.additionalNotes}`,
        images: images.map((img) => ({
          name: img.file.name,
          mimeType: img.file.type,
          data: img.base64
        }))
      };

      // Submit to sheet (non-blocking bypass)
      try {
        await fetch(googleScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (gasErr) {
        console.warn('Google sheets webhook bypassed', gasErr);
      }

      // 2. Write lead document
      const leadRef = await addDoc(collection(db, 'leads'), {
        fullName: formData.customerName,
        phone: formData.phone,
        email: `${formData.customerName.replace(/\s+/g, '').toLowerCase()}@trukdeal.tender`,
        company: 'מכרז: הובלת דירה (PWA)',
        notes: `מכרז דירה חכם ${trackingNum}.\nמ-${formData.originCity} ל-${formData.destinationCity}.\nתאריך מבוקש: ${formData.requestedDate}.\nקומה: ${formData.floor}, מעלית: ${formData.elevator}, חנייה: ${formData.parking}, מנוף: ${formData.needCrane}.\nתכולה: ${contentSummary}.\nתמונות: ${images.length}`,
        createdAt: new Date().toLocaleString('he-IL'),
        status: 'new',
        source: 'landing_page'
      });

      // 3. Write Tender document
      const tenderPayload = {
        trackingNumber: trackingNum,
        customerName: formData.customerName,
        phone: formData.phone,
        originCity: formData.originCity,
        destinationCity: formData.destinationCity,
        requestedDate: formData.requestedDate,
        shipmentType: 'apartment',
        contentList: contentSummary,
        floor: formData.floor,
        elevator: formData.elevator,
        parking: formData.parking,
        needCrane: formData.needCrane === 'yes',
        imagesCount: images.length,
        status: 'pending',
        estPriceMin: currentEst.min,
        estPriceMax: currentEst.max,
        createdAt: new Date().toLocaleString('he-IL'),
        leadId: leadRef.id,
        images: images.map(img => img.base64).slice(0, 3)
      };

      await addDoc(collection(db, 'tenders'), tenderPayload);

      // Save activity log
      await addDoc(collection(db, 'activity_logs'), {
        id: `log_tender_pwa_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('he-IL'),
        category: 'lead',
        message: `מכרז PWA חדש ${trackingNum} הוגש ע"י ${formData.customerName} מ-${formData.originCity}`,
        user: 'אפליקציית מובייל'
      });

      // Simulated real-time driver offers generator
      setTimeout(() => {
        setSimulatedOffers([
          { driverName: 'חכמת אל-פאעור', price: currentEst.min + 50, rating: 4.9, avatar: 'HF', truck: 'וולוו מנוף 10 טון' },
          { driverName: 'עאלי שילוח', price: currentEst.min - 30, rating: 4.8, avatar: 'AS', truck: 'משאית דופן הידראולית' }
        ]);
      }, 5000);

      setSubmittedTender(tenderPayload);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('חלה שגיאה בעיבוד הנתונים. נא לנסות שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Reset Form
  const resetTenderPortal = () => {
    setSuccess(false);
    setSubmittedTender(null);
    setStep(1);
    setImages([]);
    setFormData({
      customerName: '',
      phone: '',
      originCity: '',
      destinationCity: '',
      requestedDate: '',
      floor: '0',
      elevator: 'yes_spacious',
      parking: 'easy',
      needCrane: 'no',
      hasLivingRoom: false,
      hasFridge: false,
      hasWashingMachine: false,
      cartonsCount: 15,
      additionalNotes: ''
    });
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-slate-100 font-sans flex flex-col relative overflow-hidden pb-12" dir="rtl" id="tender-pwa-root">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-10 right-10 w-72 h-72 bg-[#ff7f00]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* PORTAL HEADER */}
      <header className="border-b border-slate-800/80 py-4 px-6 bg-[#0a192f]/90 backdrop-blur-md sticky top-0 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#ff7f00] to-[#e06f00] rounded-xl flex items-center justify-center font-black text-[#0a192f] text-xl shadow-lg shadow-[#ff7f00]/20">T</div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                Truk Deal IL
                <span className="text-[9px] bg-[#ff7f00]/20 text-[#ff7f00] px-1.5 py-0.5 rounded-full font-bold">PWA CLIENT</span>
              </h1>
              <p className="text-[10px] text-slate-400">אפליקציית הגשת מכרזי הובלה ודיור לצרכן הפרטי</p>
            </div>
          </div>

          <button 
            onClick={onBackToLanding}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all bg-white/5 font-semibold"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>חזרה</span>
          </button>
        </div>
      </header>

      {/* PWA INSTALLATION BANNER */}
      {isInstallable && (
        <div className="bg-gradient-to-r from-[#ff7f00]/20 to-[#0e1e38] border-b border-[#ff7f00]/30 py-3 px-6 text-right">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-[#ff7f00] animate-bounce" />
              <div className="text-xs">
                <span className="font-extrabold text-white block">התקן את Truk Deal בנייד שלך</span>
                <span className="text-slate-400 text-[10px]">מעקב קל אחרי המכרז בזמן אמת, קבלת הצעות וגישה לא מקוונת</span>
              </div>
            </div>
            <button
              onClick={handlePWAInstall}
              className="bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-4 py-1.5 rounded-lg transition-all shadow-md shrink-0"
            >
              התקן עכשיו ⚡
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-2xl w-full mx-auto px-4 pt-6">

        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="wizard-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* HERO AREA / VALUE FUNNEL */}
              <div className="text-center space-y-2 py-4">
                <span className="text-[10px] text-[#ff7f00] font-black tracking-widest uppercase bg-[#ff7f00]/10 px-2.5 py-1 rounded-full">
                  ללא דמי תיווך • מחיר מובטח
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  העבר דירה בראש שקט – בלי הפתעות ובמחיר מובטח
                </h2>
                
                {/* Trust Indicators */}
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-1.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#ff7f00] fill-[#ff7f00]" />
                    <span className="font-black text-slate-200">5.0</span>
                  </div>
                  <span>•</span>
                  <span>ביטוח תכולה מלא</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    98.7% זמינות היום
                  </span>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="bg-[#0e1e38] border border-slate-800/60 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-slate-400">שלב:</span>
                  <span className="text-[#ff7f00] font-black">{step} מתוך 3</span>
                </div>
                <div className="flex-1 max-w-[200px] mx-4 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#ff7f00] to-[#e06f00] h-full transition-all duration-300"
                    style={{ width: `${(step / 3) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {step === 1 && 'כתובת ופרטי קשר'}
                  {step === 2 && 'מפרט טכני וסבלות'}
                  {step === 3 && 'תכולה וצילומים'}
                </span>
              </div>

              {/* ACTIONABLE AI PRICE ESTIMATOR PREVIEW (STICKY HEADER TENTATIVE) */}
              <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-4 shadow-md flex items-center justify-between bg-gradient-to-l from-[#0e1e38] to-[#0d274c]/30">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#ff7f00]" />
                    אומדן מחיר חכם (AI):
                  </span>
                  <div className="text-lg font-black text-white flex items-baseline gap-1">
                    <span className="text-[#ff7f00]">₪{currentEst.min.toLocaleString()}</span>
                    <span className="text-slate-400 text-xs">-</span>
                    <span className="text-slate-300">₪{currentEst.max.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-left text-[10px] text-slate-400">
                  <span>מבוסס על {formData.cartonsCount} קרטונים </span>
                  <span className="block">{formData.needCrane === 'yes' ? '+ מנוף' : ''} {formData.elevator === 'no' ? ' • ללא מעלית' : ''}</span>
                </div>
              </div>

              {/* ERROR STATE */}
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* WIZARD FORM BODY */}
              <form onSubmit={handleFormSubmit} className="space-y-5">

                {/* STEP 1: ROUTE & INFO */}
                {step === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4"
                  >
                    <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <User className="w-4.5 h-4.5 text-[#ff7f00]" />
                      צעד 1: פרטי המזמין והנתיב
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">שם מלא שלכם *</label>
                        <input
                          type="text"
                          name="customerName"
                          required
                          value={formData.customerName}
                          onChange={handleInputChange}
                          placeholder="ישראל ישראלי"
                          className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#ff7f00]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">טלפון נייד לתיאום *</label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="050-1234567"
                          className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none text-right"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">עיר מוצא (מאיפה מובילים) *</label>
                        <input
                          type="text"
                          name="originCity"
                          required
                          value={formData.originCity}
                          onChange={handleInputChange}
                          placeholder="לדוגמא: תל אביב"
                          className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#ff7f00]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">עיר יעד (לאן פורקים) *</label>
                        <input
                          type="text"
                          name="destinationCity"
                          required
                          value={formData.destinationCity}
                          onChange={handleInputChange}
                          placeholder="לדוגמא: ירושלים"
                          className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#ff7f00]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">תאריך מבוקש להובלה *</label>
                      <input
                        type="date"
                        name="requestedDate"
                        required
                        value={formData.requestedDate}
                        onChange={handleInputChange}
                        className="w-full bg-[#061121] border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#ff7f00]"
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: TECHNICAL SPECIFICATIONS */}
                {step === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4"
                  >
                    <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <Layers className="w-4.5 h-4.5 text-[#ff7f00]" />
                      צעד 2: מפרט המבנה וסבלות
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">קומה בבניין (0 לקרקע)</label>
                        <select
                          name="floor"
                          value={formData.floor}
                          onChange={handleInputChange}
                          className="w-full bg-[#061121] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="0">קרקע / בית פרטי</option>
                          <option value="1">קומה 1</option>
                          <option value="2">קומה 2</option>
                          <option value="3">קומה 3</option>
                          <option value="4">קומה 4</option>
                          <option value="5">קומה 5 ומעלה</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">מעלית בבניין</label>
                        <select
                          name="elevator"
                          value={formData.elevator}
                          onChange={handleInputChange}
                          className="w-full bg-[#061121] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="yes_spacious">מעלית משא רחבה (מתאימה למקרר)</option>
                          <option value="yes_normal">מעלית נוסעים רגילה / קטנה</option>
                          <option value="no">אין מעלית (סבלות ידנית במדרגות)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">חנייה למשאית 12 טון</label>
                        <select
                          name="parking"
                          value={formData.parking}
                          onChange={handleInputChange}
                          className="w-full bg-[#061121] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="easy">חנייה קרובה בשפע (נוח לפריקה)</option>
                          <option value="tight">חנייה קשה ברחוב צר / חד סטרי</option>
                          <option value="no_parking">אין חנייה מוסדרת קרובה</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">האם נדרש מנוף חיצוני?</label>
                        <select
                          name="needCrane"
                          value={formData.needCrane}
                          onChange={handleInputChange}
                          className="w-full bg-[#061121] border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="no">לא נדרש מנוף (שימוש במעלית/סבלים)</option>
                          <option value="yes">כן, נדרש מנוף לקומות גבוהות</option>
                          <option value="not_sure">לא בטוח (צריך ייעוץ מוביל)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: CONTENT CHECKLIST & FAST UPLOAD */}
                {step === 3 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5"
                  >
                    <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#ff7f00]" />
                      צעד 3: תכולת הדירה ותמונות
                    </h3>

                    {/* סורק תכולה חזותי מבוסס AI - AI VISUAL SURVEYOR */}
                    <div className="bg-gradient-to-br from-[#0a192f] to-[#0d213e] border-2 border-[#ff7f00]/30 rounded-2xl p-5 relative overflow-hidden space-y-4">
                      {/* Decorative glowing lines */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff7f00] via-[#e06f00] to-cyan-400"></div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-right">
                          <div className="w-8 h-8 rounded-lg bg-[#ff7f00]/10 flex items-center justify-center text-[#ff7f00] shrink-0">
                            <Cpu className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-white font-extrabold text-sm flex items-center gap-1.5 flex-wrap">
                              סורק תכולה חזותי חכם • AI Vision
                              <span className="text-[9px] bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded font-black">Powered by Gemini</span>
                            </h4>
                            <p className="text-[10px] text-slate-400">צלמו או העלו סיור חזותי קצר, וה-AI יעריך עבורכם את נפח התכולה במדויק</p>
                          </div>
                        </div>
                        <Sparkles className="w-4 h-4 text-[#ff7f00] shrink-0" />
                      </div>

                      {/* Photo / Video upload triggers */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const cameraInput = document.getElementById('ai-camera-capture') as HTMLInputElement;
                            if (cameraInput) cameraInput.click();
                          }}
                          className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-[#ff7f00]/40 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
                        >
                          <Camera className="w-5 h-5 text-[#ff7f00] group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-200">צילום ישיר מהמצלמה 📸</span>
                          <span className="text-[9px] text-slate-500">עבור משתמשי מובייל / PWA</span>
                        </button>
                        <input
                          id="ai-camera-capture"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            if (e.target.files) processFiles(e.target.files);
                          }}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const videoInput = document.getElementById('ai-video-capture') as HTMLInputElement;
                            if (videoInput) videoInput.click();
                          }}
                          className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-[#ff7f00]/40 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
                        >
                          <Video className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-200">צילום סיור וידאו קצר 🎥</span>
                          <span className="text-[9px] text-slate-500">העלאת קובץ וידאו או הקלטה חיה</span>
                        </button>
                        <input
                          id="ai-video-capture"
                          type="file"
                          accept="video/*"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setError(null);
                              setSurveyError(null);
                              const preview = URL.createObjectURL(file);
                              // Add file with representation block
                              setImages(prev => [...prev, { file, base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", preview }]);
                            }
                          }}
                          className="hidden"
                        />
                      </div>

                      {/* Display warnings or list of media */}
                      {images.length > 0 && (
                        <div className="bg-[#061121] border border-slate-800 p-3 rounded-xl space-y-3 text-right">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold">מדיה טעונה לסריקה ({images.length} פריטים):</span>
                            <button
                              type="button"
                              onClick={() => {
                                setImages([]);
                                setAiSurveyResult(null);
                              }}
                              className="text-[9px] text-rose-400 hover:underline cursor-pointer"
                            >
                              נקה הכל
                            </button>
                          </div>

                          {/* Image preview strip with laser scanning beam if isAnalyzing */}
                          <div className="relative flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                            {images.map((img, index) => (
                              <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900">
                                <img src={img.preview} alt="Room" className="w-full h-full object-cover" />
                                {isAnalyzing && (
                                  <>
                                    <div className="absolute inset-0 scanner-overlay z-10 pointer-events-none"></div>
                                    <div className="absolute left-0 w-full h-0.5 bg-[#ff7f00] shadow-[0_0_8px_#ff7f00] z-20 animate-laser pointer-events-none"></div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Trigger analysis button */}
                          {!isAnalyzing && !aiSurveyResult && (
                            <button
                              type="button"
                              onClick={runAISurvey}
                              className="w-full bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs py-2.5 rounded-xl transition-all shadow-md shadow-[#ff7f00]/10 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                              נתח תכולה והערך נפח בקליק ✨
                            </button>
                          )}
                        </div>
                      )}

                      {/* Processing / Scan status */}
                      {isAnalyzing && (
                        <div className="bg-[#061121] border border-[#ff7f00]/20 p-4 rounded-xl text-center space-y-3">
                          <div className="relative w-12 h-12 mx-auto">
                            <div className="absolute inset-0 rounded-full border-2 border-[#ff7f00]/20 border-t-[#ff7f00] animate-spin"></div>
                            <Cpu className="w-5 h-5 text-[#ff7f00] absolute inset-0 m-auto animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-black text-white block">סורק ומנתח תכולה בזמן אמת...</span>
                            <span className="text-[10px] text-[#ff7f00] font-mono block animate-pulse" dir="rtl">{analysisStep}</span>
                          </div>
                        </div>
                      )}

                      {/* Survey Errors */}
                      {surveyError && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-[11px] text-rose-400 font-bold flex items-center gap-1.5 text-right" dir="rtl">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{surveyError}</span>
                        </div>
                      )}

                      {/* SMART VOLUME CARD - כרטיס נפח חכם */}
                      {aiSurveyResult && (
                        <div className="bg-[#061121] border-2 border-cyan-500/30 p-4 rounded-xl space-y-3.5 relative overflow-hidden bg-gradient-to-r from-[#061121] to-[#09223e] text-right" dir="rtl">
                          <div className="absolute -top-10 -left-10 w-24 h-24 bg-cyan-400/10 rounded-full blur-xl pointer-events-none"></div>

                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                              <strong className="text-xs font-black text-white">כרטיס נפח חכם (AI Vision Survey)</strong>
                            </div>
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-full">סריקה הושלמה</span>
                          </div>

                          {/* Major metrics */}
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="bg-[#0e1e38] border border-slate-800 p-2.5 rounded-xl text-center space-y-0.5">
                              <span className="text-[9px] text-slate-400 block font-bold">נפח תכולה (קוב)</span>
                              <div className="text-sm sm:text-base font-black text-cyan-400 flex items-center justify-center gap-0.5">
                                <span>{aiSurveyResult.estimatedVolume}</span>
                                <span className="text-[10px] text-slate-400">מ"ק</span>
                              </div>
                            </div>
                            <div className="bg-[#0e1e38] border border-slate-800 p-2.5 rounded-xl text-center space-y-0.5">
                              <span className="text-[9px] text-slate-400 block font-bold">קרטונים מומלצים</span>
                              <span className="text-sm sm:text-base font-black text-[#ff7f00] block">{aiSurveyResult.estimatedCartons}</span>
                            </div>
                            <div className="bg-[#0e1e38] border border-slate-800 p-2.5 rounded-xl text-center space-y-0.5 flex flex-col justify-center">
                              <span className="text-[9px] text-slate-400 block font-bold">צורך במנוף חיצוני</span>
                              <span className={`text-[10px] sm:text-[11px] font-black block mt-0.5 ${aiSurveyResult.needCrane ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {aiSurveyResult.needCrane ? 'כן, נדרש 🏗️' : 'לא נדרש'}
                              </span>
                            </div>
                          </div>

                          {/* Detected items pills */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold block">פריטים וציוד שזוהו בסריקה חזותית:</span>
                            <div className="flex flex-wrap gap-1 justify-start">
                              {aiSurveyResult.detectedItems && aiSurveyResult.detectedItems.length > 0 ? (
                                aiSurveyResult.detectedItems.map((item, i) => (
                                  <span key={i} className="text-[10px] bg-[#0e1e38] border border-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-bold">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-500">לא זוהו פריטים כבדים חריגים.</span>
                              )}
                            </div>
                          </div>

                          {/* AI Narrative recommendations */}
                          {aiSurveyResult.summaryHebrew && (
                            <div className="bg-cyan-500/5 border border-cyan-500/10 p-3 rounded-xl">
                              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                💡 <span className="text-cyan-400 font-bold">ניתוח המערכת:</span> {aiSurveyResult.summaryHebrew}
                              </p>
                            </div>
                          )}

                          {/* Apply / Auto-Fill Trigger */}
                          <button
                            type="button"
                            onClick={applyAISurveyData}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-blue-600 hover:to-cyan-500 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md shadow-cyan-500/15 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            אשר והזרק נתוני נפח לטופס המכרז 🚀
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Content quick checkmarks */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-300 block">סמנו את הפריטים העיקריים להעברה:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        
                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                          formData.hasLivingRoom 
                            ? 'bg-[#ff7f00]/10 border-[#ff7f00] text-white' 
                            : 'bg-[#061121] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <input
                            type="checkbox"
                            name="hasLivingRoom"
                            checked={formData.hasLivingRoom}
                            onChange={handleInputChange}
                            className="accent-[#ff7f00]"
                          />
                          <span className="text-xs font-bold">סלון קומפלט (מערכת ישיבה)</span>
                        </label>

                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                          formData.hasFridge 
                            ? 'bg-[#ff7f00]/10 border-[#ff7f00] text-white' 
                            : 'bg-[#061121] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <input
                            type="checkbox"
                            name="hasFridge"
                            checked={formData.hasFridge}
                            onChange={handleInputChange}
                            className="accent-[#ff7f00]"
                          />
                          <span className="text-xs font-bold">מקרר משפחתי כבד</span>
                        </label>

                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                          formData.hasWashingMachine 
                            ? 'bg-[#ff7f00]/10 border-[#ff7f00] text-white' 
                            : 'bg-[#061121] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <input
                            type="checkbox"
                            name="hasWashingMachine"
                            checked={formData.hasWashingMachine}
                            onChange={handleInputChange}
                            className="accent-[#ff7f00]"
                          />
                          <span className="text-xs font-bold">מכונת כביסה / מייבש</span>
                        </label>

                      </div>
                    </div>

                    {/* Cartons range */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-slate-300">מספר ארגזים וקרטונים משוער:</label>
                        <span className="text-[#ff7f00] font-black">{formData.cartonsCount} קרטונים</span>
                      </div>
                      <input
                        type="range"
                        name="cartonsCount"
                        min="5"
                        max="100"
                        step="5"
                        value={formData.cartonsCount}
                        onChange={handleInputChange}
                        className="w-full accent-[#ff7f00]"
                      />
                    </div>

                    {/* Image drag-and-drop / upload */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        העלאה מהירה של תמונות הציוד/דירה (מומלץ לקבלת מחיר סופי)
                      </label>

                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                          dragActive 
                            ? 'border-[#ff7f00] bg-[#ff7f00]/5 scale-[0.99]' 
                            : 'border-slate-800 hover:border-slate-700 bg-[#061121]'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files) processFiles(e.target.files);
                          }}
                          className="hidden"
                        />
                        <Upload className="w-7 h-7 text-slate-500 mb-1" />
                        <span className="text-xs font-bold text-slate-200">לחצו לבחירת תמונות מהגלריה או גררו לכאן</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">סריקה ישירה חוסכת 15 דקות שיחה עם נציג</span>
                      </div>

                      {images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 pt-1.5">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-[#061121]">
                              <img src={img.preview} alt="תצוגה" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-black/70 hover:bg-black/95 text-white rounded-full p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">דגשים מיוחדים למוביל:</label>
                      <textarea
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleInputChange}
                        placeholder="רשמו כאן פרטים נוספים (למשל: דרוש פירוק והרכבה של ארון בגדים גדול...)"
                        rows={2}
                        className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl p-3 text-xs focus:outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* AI LOGISTICAL ADVICE BOX */}
                {activeTips.length > 0 && (
                  <div className="bg-[#0e1e38]/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#ff7f00] shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="text-[10px] font-black text-[#ff7f00] uppercase block">טיפ לוגיסטי חכם למניעת עיכובים:</span>
                      <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1 mt-1 leading-relaxed">
                        {activeTips.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* NAVIGATION CONTROLS */}
                <div className="flex items-center justify-between pt-2">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep((prev) => (prev - 1) as any)}
                      className="border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>חזרה</span>
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-1 shadow-lg shadow-[#ff7f00]/10 cursor-pointer"
                    >
                      <span>המשך לצעד הבא</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-[#ff7f00] to-[#e06f00] hover:from-[#e06f00] hover:to-[#ff7f00] text-white font-black text-xs px-8 py-3.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#ff7f00]/20 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>משגר בקשה ל-CRM...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>שלח הצעה והפץ למכרז הארצי</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </form>

            </motion.div>
          ) : (
            // SUCCESS VISUAL & TRACING SYSTEM
            <motion.div
              key="success-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 pt-4"
            >
              {/* SUCCESS ANIMATION AND GREETING */}
              <div className="bg-[#0e1e38] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-md">
                  <Check className="w-8 h-8" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-white">המכרז שלך הופץ בהצלחה!</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    פרטי ההובלה ותמונות הציוד נקלטו ב-CRM של פלטפורמת Truk Deal. סיימת את הגשת הבקשה ללא פערי תיווך ובמחיר בטוח!
                  </p>
                </div>

                <div className="inline-block bg-[#061121] border border-slate-800 px-4 py-2 rounded-xl text-xs">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">קוד מעקב הובלה ייחודי (PWA):</span>
                  <span className="font-mono text-base font-black text-[#ff7f00]">{submittedTender?.trackingNumber}</span>
                </div>
              </div>

              {/* LIVE PERSONAL TRACKER PANEL */}
              <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#ff7f00]" />
                      לוח מעקב אישי - סטטוס המכרז בזמן אמת
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">צפו בעדכונים ובקבלת הצעות מחיר מבעלי משאיות מנוף ומובילים מורשים</p>
                  </div>
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></span>
                    מכרז פעיל
                  </span>
                </div>

                {/* Flow timeline */}
                <div className="space-y-4">
                  
                  {/* Event 1 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-black">
                        1
                      </div>
                      <div className="w-0.5 h-10 bg-emerald-500/20"></div>
                    </div>
                    <div className="text-right pb-1">
                      <strong className="text-slate-200 text-xs block">הגשת הבקשה וקליטה בשרת</strong>
                      <span className="text-[10px] text-slate-400">הסנכרון ל-CRM המרכזי ול-Google Sheets הושלם בהצלחה.</span>
                    </div>
                  </div>

                  {/* Event 2 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-xs font-black">
                        2
                      </div>
                      <div className="w-0.5 h-10 bg-slate-800"></div>
                    </div>
                    <div className="text-right pb-1">
                      <strong className="text-slate-200 text-xs block">ניתוח משקל וציוד מנוף (AI)</strong>
                      <span className="text-[10px] text-slate-400">
                        המערכת זיהתה: קומה {submittedTender?.floor} ({submittedTender?.elevator === 'no' ? 'ללא מעלית' : 'עם מעלית'}) • {submittedTender?.needCrane ? 'נדרש מנוף' : 'ללא מנוף'}.
                      </span>
                    </div>
                  </div>

                  {/* Event 3 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center text-xs font-black">
                        3
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="text-slate-200 text-xs block">שידור הנתונים לצי המשאיות</strong>
                      <span className="text-[10px] text-slate-400">הודעה נשלחה למסכי הנהגים התואמים לביצוע הצעות מחיר.</span>
                    </div>
                  </div>

                </div>

                {/* SIMULATED OFFERS FROM CARRIERS */}
                <div className="bg-[#061121] border border-slate-800 rounded-xl p-4 space-y-3.5">
                  <h5 className="text-[11px] font-black text-[#ff7f00] flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    הצעות מחיר נכנסות (ללא עמלות תיווך):
                  </h5>

                  {simulatedOffers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-[#ff7f00] animate-spin" />
                      <span>נהגי Truk Deal באזורך מנתחים כעת את התמונות והמפרט... הצעות ראשונות יופיעו כאן בקרוב.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {simulatedOffers.map((offer, idx) => (
                        <div key={idx} className="bg-[#0e1e38] border border-slate-800 p-3 rounded-lg flex items-center justify-between hover:border-[#ff7f00] transition-all">
                          <div className="flex items-center gap-2.5 text-right">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-[#ff7f00] font-black text-xs flex items-center justify-center">
                              {offer.avatar}
                            </div>
                            <div>
                              <strong className="text-white text-xs block">{offer.driverName}</strong>
                              <span className="text-[9px] text-slate-400 block">{offer.truck} • דירוג: ⭐ {offer.rating}</span>
                            </div>
                          </div>
                          
                          <div className="text-left">
                            <span className="text-xs font-extrabold text-emerald-400 block">₪{offer.price}</span>
                            <button 
                              onClick={() => {
                                alert(`תודה רבה! ההצעה של ${offer.driverName} על סך ₪${offer.price} אושרה. נציג מטעמנו ייצור איתך קשר בדקות הקרובות לתיאום סופי.`);
                              }}
                              className="text-[9px] bg-[#ff7f00] text-slate-900 font-bold px-2 py-1 rounded mt-1 hover:bg-[#e06f00] transition-colors"
                            >
                              אישור הזמנה
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
                {onEnterClientPortal && (
                  <button
                    onClick={onEnterClientPortal}
                    className="w-full sm:w-auto bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                  >
                    <span>המשך לפורטל מעקב ותשלום מאובטח 💳</span>
                  </button>
                )}
                <button
                  onClick={resetTenderPortal}
                  className="w-full sm:w-auto bg-white/5 border border-slate-800 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
                >
                  הגשת מכרז דירה חדש
                </button>
                <button
                  onClick={onBackToLanding}
                  className="w-full sm:w-auto bg-[#0e1e38] border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
                >
                  חזרה לדף הבית
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* PORTAL FOOTER */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-[10px] text-slate-500 mt-auto">
        <p>© 2026 Truk Deal IL • הגנה בטחונית וביטוחית מלאה • סנכרון CRM פתוח</p>
      </footer>

    </div>
  );
}
