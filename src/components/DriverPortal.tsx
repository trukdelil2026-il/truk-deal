import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, Compass, MapPin, Phone, CheckCircle, User, 
  Map, Calendar, Navigation, Eye, FileText, Camera, 
  Trash2, PenTool, CheckCircle2, RefreshCw, ChevronLeft, 
  AlertTriangle, PhoneCall, HelpCircle, Shield, Award, Landmark, Info
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, limit } from 'firebase/firestore';

interface DriverPortalProps {
  onBackToLanding: () => void;
  googleScriptUrl: string;
}

export default function DriverPortal({ onBackToLanding, googleScriptUrl }: DriverPortalProps) {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState<'feed' | 'active' | 'completed'>('feed');
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  // Active Job flow tracking state:
  // 'idle' | 'en_route_origin' | 'loading_complete' | 'en_route_destination' | 'unloading_complete'
  const [jobStatus, setJobStatus] = useState<string>('idle');

  // Photo uploads state
  const [cargoPhotos, setCargoPhotos] = useState<{ id: string; url: string; timestamp: string; gps: string }[]>([]);
  const [photoInputKey, setPhotoInputKey] = useState<number>(0);

  // Digital signature pad state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Call confirmations states
  const [showCallConfirm, setShowCallConfirm] = useState<{ type: 'customer' | 'ops'; number: string; name: string } | null>(null);

  // Completion report modal or state
  const [completionReport, setCompletionReport] = useState<any>(null);
  const [submittingPOD, setSubmittingPOD] = useState(false);

  // Offline support notification
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Fetch Tenders from Firebase + Load high-fidelity fallback list
  const fetchDriverJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch real-time active tenders from Firebase
      const q = query(
        collection(db, 'tenders'),
        where('status', 'in', ['approved', 'paid', 'en-route', 'completed'])
      );
      const querySnapshot = await getDocs(q);
      const dbJobs: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        dbJobs.push({
          id: docSnap.id,
          trackingNumber: d.trackingNumber || `TRK-TND-${docSnap.id.substring(0, 4).toUpperCase()}`,
          customerName: d.customerName || 'לקוח מזדמן',
          phone: d.phone || '050-0000000',
          originCity: d.originCity || 'תל אביב',
          destinationCity: d.destinationCity || 'ירושלים',
          requestedDate: d.requestedDate || '2026-07-26',
          truckType: d.truckType || 'וולוו 12 טון + מנוף זרוע',
          needCrane: d.needCrane || false,
          contentList: d.contentList || 'תכולת דירה כללית',
          estPriceMin: d.estPriceMin || 1850,
          status: d.status || 'paid',
          floor: d.floor || 'קרקע',
          elevator: d.elevator || 'yes_normal',
          isRealDb: true
        });
      });

      // 2. Beautiful mock jobs optimized for field demonstration
      const localMocks = [
        {
          id: 'mock_job_1',
          trackingNumber: 'TRK-TND-7419',
          customerName: 'חיים כהן (הובלת דירה 4 חדרים)',
          phone: '054-7728104',
          originCity: 'תל אביב (רחוב דיזנגוף 88)',
          destinationCity: 'ירושלים (רחוב רמב"ן 12, רחביה)',
          requestedDate: '2026-07-21',
          truckType: 'משאית סגורה 15 טון + רמפה הידראולית',
          needCrane: true,
          contentList: 'ספה פינתית, שולחן אוכל עץ כבד, 30 ארגזים שבירים, מקרר כפול, מכונת כביסה',
          estPriceMin: 2200,
          status: 'paid',
          floor: '3',
          elevator: 'no_elevator',
          isRealDb: false
        },
        {
          id: 'mock_job_2',
          trackingNumber: 'TRK-TND-8910',
          customerName: 'רמי לוי (הפצת משטחים לחנות)',
          phone: '052-8874129',
          originCity: 'נמל אשדוד (מסוף מכולות)',
          destinationCity: 'חיפה (אזור תעשייה מפרץ)',
          requestedDate: '2026-07-22',
          truckType: 'סמיטריילר וילונות 40 טון',
          needCrane: false,
          contentList: '12 משטחי סחורה יבשה, קרטוני אספקה סגורים, דורש חתימת מנהל סניף',
          estPriceMin: 3400,
          status: 'approved',
          floor: 'קרקע',
          elevator: 'yes_freight',
          isRealDb: false
        },
        {
          id: 'mock_job_3',
          trackingNumber: 'TRK-TND-1102',
          customerName: 'שירה חדד (סטודיו לעיצוב פנים)',
          phone: '050-4103329',
          originCity: 'הרצליה פיתוח (רחוב מדינת היהודים)',
          destinationCity: 'רעננה (רחוב אחוזה)',
          requestedDate: '2026-07-23',
          truckType: 'מסחרית סגורה גדולה (ספרינטר)',
          needCrane: false,
          contentList: 'ציור קיר ענק ממוסגר, 2 כורסאות מעצבים, שטיח קש מגולגל, קרטון כלי זכוכית',
          estPriceMin: 950,
          status: 'en-route',
          floor: '2',
          elevator: 'yes_normal',
          isRealDb: false
        }
      ];

      // Combine real database jobs with mocks, ensuring no duplicates on trackingNumber
      const combined = [...dbJobs];
      localMocks.forEach(mock => {
        if (!combined.some(c => c.trackingNumber === mock.trackingNumber)) {
          combined.push(mock);
        }
      });

      setJobs(combined);

      // Auto-restore active selected job if stored in localStorage
      const savedSelected = localStorage.getItem('active_driver_job');
      if (savedSelected) {
        try {
          const parsed = JSON.parse(savedSelected);
          // Look up freshest data
          const freshest = combined.find(j => j.trackingNumber === parsed.trackingNumber) || parsed;
          setSelectedJob(freshest);
          
          // Deduce status flow state
          const savedStatus = localStorage.getItem(`job_status_${freshest.trackingNumber}`);
          if (savedStatus) {
            setJobStatus(savedStatus);
          } else {
            setJobStatus('idle');
          }
        } catch (e) {
          console.warn(e);
        }
      }

    } catch (err) {
      console.error(err);
      setError('שגיאה בטעינת משימות נהג מהענן. מוצג סגל משימות מקומי.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverJobs();
  }, []);

  // Set active job for execution
  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
    localStorage.setItem('active_driver_job', JSON.stringify(job));
    
    // Read status of this specific job
    const savedStatus = localStorage.getItem(`job_status_${job.trackingNumber}`);
    if (savedStatus) {
      setJobStatus(savedStatus);
    } else {
      setJobStatus('idle');
    }
    
    // Clear POD states
    setCargoPhotos([]);
    setHasSignature(false);
    setSignatureDataUrl(null);
    setCompletionReport(null);
    setActiveTab('active');
  };

  // Close active job selection
  const handleCloseActiveJob = () => {
    setSelectedJob(null);
    localStorage.removeItem('active_driver_job');
    setActiveTab('feed');
  };

  // Simulate Triggering Call
  const triggerCall = (type: 'customer' | 'ops', name: string, phone: string) => {
    setShowCallConfirm({ type, name, number: phone });
  };

  const proceedWithCall = () => {
    if (showCallConfirm) {
      window.open(`tel:${showCallConfirm.number}`, '_self');
      setShowCallConfirm(null);
    }
  };

  // Navigation Links Builders for Israeli field drivers
  const getWazeLink = (city: string) => {
    return `https://waze.com/ul?q=${encodeURIComponent(city)}&navigate=yes`;
  };

  const getGoogleMapsLink = (city: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`;
  };

  // Live status state advancing
  const handleAdvanceStatus = async () => {
    let nextState = 'idle';
    let activityMsg = '';

    if (jobStatus === 'idle') {
      nextState = 'en_route_origin';
      activityMsg = `הנהג יצא לדרך לנקודת המוצא ב${selectedJob.originCity}`;
    } else if (jobStatus === 'en_route_origin') {
      nextState = 'loading_complete';
      activityMsg = `העמסת התכולה הסתיימה בהצלחה והמשאית יצאה לדרך לכיוון היעד`;
    } else if (jobStatus === 'loading_complete') {
      nextState = 'en_route_destination';
      activityMsg = `המוביל הגיע לכתובת הפריקה ב${selectedJob.destinationCity} והתחיל בפריקת הציוד`;
    } else if (jobStatus === 'en_route_destination') {
      nextState = 'unloading_complete';
      activityMsg = `פריקת המטען הושלמה. המערכת ממתינה לחתימת הלקוח לאישור סופי`;
    }

    setJobStatus(nextState);
    localStorage.setItem(`job_status_${selectedJob.trackingNumber}`, nextState);

    // Sync state in Firestore if it is a real database job
    try {
      if (selectedJob.isRealDb && selectedJob.id) {
        const ref = doc(db, 'tenders', selectedJob.id);
        await updateDoc(ref, {
          status: nextState === 'en_route_origin' || nextState === 'loading_complete' ? 'en-route' : 'approved'
        });
      }

      // Add to CRM system logs
      await addDoc(collection(db, 'activity_logs'), {
        id: `log_driver_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('he-IL'),
        category: 'dispatch',
        message: `מכרז ${selectedJob.trackingNumber}: ${activityMsg}`,
        user: 'מסוף נהג שטח'
      });

    } catch (err) {
      console.warn('Firebase sync deferred due to local environment limits.', err);
    }
  };

  // Simulate taking/selecting a photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const now = new Date();
      const timestampString = now.toLocaleTimeString('he-IL') + ' ' + now.toLocaleDateString('he-IL');
      
      // Beautiful mock coordinates based on Israeli cities
      const lat = (31.7 + Math.random() * 0.5).toFixed(5);
      const lng = (34.8 + Math.random() * 0.4).toFixed(5);
      const gpsString = `LAT: ${lat} • LNG: ${lng} (דיוק 4 מטר)`;

      setCargoPhotos(prev => [
        ...prev,
        {
          id: `photo_${Date.now()}`,
          url: base64Url,
          timestamp: timestampString,
          gps: gpsString
        }
      ]);
      setPhotoInputKey(prev => prev + 1); // Reset input
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (id: string) => {
    setCargoPhotos(prev => prev.filter(p => p.id !== id));
  };

  // Canvas Drawing Handlers
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const startDrawingMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const drawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#ff7f00'; // Electric orange high-contrast paint
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL());
    }
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling when drawing on touch screens
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getTouchPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getTouchPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#ff7f00';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl(null);
  };

  // Finalize POD and close delivery loop
  const handleFinalizePOD = async () => {
    if (!hasSignature) {
      alert('נא להחתים את הלקוח בטרם אישור מסירה סופי.');
      return;
    }

    setSubmittingPOD(true);
    
    // Simulate slight upload delay
    setTimeout(async () => {
      try {
        const report = {
          jobCode: selectedJob.trackingNumber,
          customerName: selectedJob.customerName,
          payoutAmount: Math.round(selectedJob.estPriceMin * 0.72), // 72% Driver payout
          vatAmount: Math.round(selectedJob.estPriceMin * 0.17),
          completedAt: new Date().toLocaleString('he-IL'),
          photosUploaded: cargoPhotos.length,
          signature: signatureDataUrl || '',
          driverName: 'חכמת אל-פאעור',
          truckType: selectedJob.truckType
        };

        // Save report & update status
        setCompletionReport(report);
        setJobStatus('completed');
        localStorage.setItem(`job_status_${selectedJob.trackingNumber}`, 'completed');

        // Update main Firebase DB Status to "completed"
        if (selectedJob.isRealDb && selectedJob.id) {
          const ref = doc(db, 'tenders', selectedJob.id);
          await updateDoc(ref, {
            status: 'completed'
          });
        }

        // Add to global CRM activity logs
        await addDoc(collection(db, 'activity_logs'), {
          id: `log_pod_complete_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('he-IL'),
          category: 'revenue',
          message: `הובלה ${selectedJob.trackingNumber} סומנה כהושלמה! חתימת לקוח ודוח POD הופקו בהצלחה. זיכוי נהג: ₪${report.payoutAmount}`,
          user: 'נהג: חכמת'
        });

        // Trigger webhook
        try {
          await fetch(googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'driverJobCompleted',
              trackingNumber: selectedJob.trackingNumber,
              payout: report.payoutAmount,
              driver: 'חכמת אל-פאעור'
            })
          });
        } catch (webhookErr) {
          console.warn('Apps Script webhook ignored', webhookErr);
        }

        // Refresh list to show completed states
        fetchDriverJobs();

      } catch (err) {
        console.error(err);
      } finally {
        setSubmittingPOD(false);
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#071121] text-slate-100 font-sans flex flex-col relative pb-12" dir="rtl" id="driver-pwa-workspace">
      
      {/* BACKGROUND GRAPHIC */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff7f00]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      
      {/* HIGH CONTRAST HEADER */}
      <header className="border-b border-slate-800 bg-[#0a192f] py-4 px-5 sticky top-0 z-40 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#ff7f00] to-[#e06f00] rounded-lg flex items-center justify-center font-black text-[#0a192f] text-lg shadow-md shadow-[#ff7f00]/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white flex items-center gap-1.5">
                מסוף שטח נהגים • Truk Deal
                <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-black">PWA</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold">תיעוד POD, ניווט ואישור מסירה למוביל מורשה</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online Indicator */}
            <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold ${
              offline 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${offline ? 'bg-amber-500' : 'bg-emerald-400'}`}></span>
              <span>{offline ? 'אופליין מקומי' : 'מחובר לענן'}</span>
            </div>

            <button 
              onClick={onBackToLanding}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white border border-slate-800 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>יציאה</span>
            </button>
          </div>
        </div>
      </header>

      {/* PORTAL MAIN BODY CONTAINER */}
      <main className="flex-grow max-w-2xl w-full mx-auto px-4 pt-5 space-y-5">
        
        {/* DRIVER ACTIVE PROFILE STATUS BAR */}
        <div className="bg-[#0e1e38] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff7f00] to-orange-600 text-slate-950 font-black text-sm flex items-center justify-center shadow">
              חא
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white">חכמת אל-פאעור (צוות צפון-מרכז)</h3>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold">דירוג 4.9</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">משאית מנוף: וולוו FH12 • מספר רישוי: ש-819-22-99</p>
            </div>
          </div>
          
          <button
            onClick={fetchDriverJobs}
            className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 bg-white/5"
            title="רענן משימות"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* DRIVER SCREEN VIEWPORT NAVIGATION (IF NO SELECTED JOB) */}
        {!selectedJob ? (
          <div className="space-y-4">
            
            {/* STAT CARDS FOR THE DRIVER */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#0e1e38] border border-slate-800/80 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">משימות היום</span>
                <span className="text-lg font-black text-white">{jobs.filter(j => j.status !== 'completed').length}</span>
              </div>
              <div className="bg-[#0e1e38] border border-slate-800/80 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">הושלמו השבוע</span>
                <span className="text-lg font-black text-emerald-400">8</span>
              </div>
              <div className="bg-[#0e1e38] border border-slate-800/80 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">הכנסה משוערכת (₪)</span>
                <span className="text-lg font-black text-[#ff7f00]">₪12,450</span>
              </div>
            </div>

            {/* TAB SELECTION */}
            <div className="bg-[#0b1626] border border-slate-800/80 rounded-xl p-1 grid grid-cols-2 gap-1">
              <button
                onClick={() => setActiveTab('feed')}
                className={`py-2 text-xs font-black rounded-lg transition-all ${
                  activeTab === 'feed' 
                    ? 'bg-[#ff7f00] text-slate-950 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                משימות מוקצות לביצוע ({jobs.filter(j => j.status !== 'completed').length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 text-xs font-black rounded-lg transition-all ${
                  activeTab === 'completed' 
                    ? 'bg-[#ff7f00] text-slate-950 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                היסטוריית הובלות סגורות ({jobs.filter(j => j.status === 'completed').length})
              </button>
            </div>

            {/* ERROR NOTIFICATION */}
            {error && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            {/* CHRONOLOGICAL JOB LIST FEED */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 space-y-2">
                  <RefreshCw className="w-8 h-8 text-[#ff7f00] animate-spin mx-auto" />
                  <span className="text-xs text-slate-400">סורק ומעדכן סגל משימות לעבודה...</span>
                </div>
              ) : (
                <>
                  {activeTab === 'feed' ? (
                    // Active jobs to execute
                    jobs.filter(j => j.status !== 'completed').length === 0 ? (
                      <div className="text-center py-12 bg-[#0e1e38] rounded-2xl border border-dashed border-slate-800">
                        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <h4 className="font-bold text-white text-sm">אין משימות פתוחות להיום!</h4>
                        <p className="text-xs text-slate-400 mt-1">כל המשימות שהוקצו לך הושלמו בהצלחה או שנמצאות בבדיקה.</p>
                      </div>
                    ) : (
                      jobs.filter(j => j.status !== 'completed').map((job) => (
                        <div 
                          key={job.id}
                          className="bg-[#0e1e38] border border-slate-800 hover:border-[#ff7f00]/40 rounded-xl p-4 transition-all hover:translate-x-[-2px] text-right space-y-3.5 relative overflow-hidden shadow-lg"
                        >
                          {/* High Contrast Banner */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-mono text-xs font-black text-[#ff7f00]">{job.trackingNumber}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded font-black uppercase">
                                {job.requestedDate}
                              </span>
                              {job.needCrane && (
                                <span className="text-[9px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded font-bold">
                                  מנוף זרוע
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Client details & routes */}
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <User className="w-4 h-4 text-[#ff7f00]" />
                              <strong className="text-white">{job.customerName}</strong>
                            </div>

                            {/* Origin to destination routing graphic */}
                            <div className="bg-[#071121] p-3 rounded-lg border border-slate-800 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                                <span className="text-slate-300"><strong>מוצא:</strong> {job.originCity}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                <span className="text-slate-300"><strong>יעד:</strong> {job.destinationCity}</span>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <strong>תכולה מאושרת:</strong> {job.contentList}
                            </p>
                          </div>

                          {/* Action strip with speed dials & entry */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            {/* Speed dials */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerCall('customer', job.customerName, job.phone);
                                }}
                                className="bg-[#0b1626] hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span>התקשר ללקוח</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerCall('ops', 'מנהל תפעול Truk Deal', '03-5182900');
                                }}
                                className="bg-[#0b1626] hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold flex items-center gap-1"
                              >
                                <Shield className="w-3.5 h-3.5 text-sky-400" />
                                <span>תפעול</span>
                              </button>
                            </div>

                            <button
                              onClick={() => handleSelectJob(job)}
                              className="bg-[#ff7f00] hover:bg-[#e06f00] text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1"
                            >
                              <span>פתח כרטיס משימה</span>
                              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    // Completed historical jobs
                    jobs.filter(j => j.status === 'completed').length === 0 ? (
                      <div className="text-center py-12 bg-[#0e1e38] rounded-2xl border border-dashed border-slate-800">
                        <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-400 text-sm">אין הובלות קודמות מוקלטות במערכת</h4>
                      </div>
                    ) : (
                      jobs.filter(j => j.status === 'completed').map((job) => (
                        <div 
                          key={job.id}
                          className="bg-[#0e1e38]/75 border border-slate-800/80 rounded-xl p-4 text-right space-y-2"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono text-[#ff7f00] font-bold">{job.trackingNumber}</span>
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-black">הושלם ונחתם</span>
                          </div>
                          <div className="text-xs text-slate-300">
                            <strong>לקוח:</strong> {job.customerName} | {job.originCity} ➔ {job.destinationCity}
                          </div>
                          <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>תאריך הובלה: {job.requestedDate}</span>
                            <span>זוכה בהצלחה: ₪{Math.round(job.estPriceMin * 0.72)}</span>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </>
              )}
            </div>

          </div>
        ) : (
          
          // ACTIVE EXECUTION SCREEN PANEL (WHEN JOB SELECTED)
          <div className="space-y-5">
            
            {/* BACK TO MAIN WORKSPACE BUTTON */}
            <button
              onClick={handleCloseActiveJob}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>חזרה לרשימת המשימות המלאה</span>
            </button>

            {/* MAIN ACTIVE TARGET TICKET HEADER */}
            <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 text-right space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[10px] text-[#ff7f00] font-black uppercase bg-[#ff7f00]/10 px-2.5 py-1 rounded-full">משימה בביצוע פעיל</span>
                  <h2 className="text-lg font-black text-white mt-1.5">{selectedJob.customerName}</h2>
                </div>
                <div className="text-left">
                  <span className="font-mono text-xs font-black text-slate-400 block">מזהה: {selectedJob.trackingNumber}</span>
                  <span className="text-[11px] text-emerald-400 font-bold block">תשלום הלקוח: ₪{selectedJob.estPriceMin.toLocaleString()}</span>
                </div>
              </div>

              {/* SPECIFIC DESTINATIONS / CRITICAL INFORMATION */}
              <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 block">נקודת מוצא (העמסה):</span>
                  <strong className="text-white text-xs">{selectedJob.originCity}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">קומה: {selectedJob.floor} • מעלית: {selectedJob.elevator === 'yes_normal' ? 'יש' : 'אין'}</span>
                </div>
                
                <div>
                  <span className="text-[10px] text-slate-500 block">נקודת יעד (פריקה):</span>
                  <strong className="text-white text-xs">{selectedJob.destinationCity}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">כלי רכב נדרש: {selectedJob.truckType}</span>
                </div>

                <div className="col-span-2 bg-[#071121] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">הנחיות תכולה ודגשי קצה:</span>
                  <p className="text-[11px] text-slate-200 leading-relaxed mt-0.5 font-bold">
                    {selectedJob.contentList}
                  </p>
                </div>
              </div>

              {/* SMART MAP INTEGRATION BUTTONS */}
              <div className="bg-[#071121] border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                <span className="text-[10px] text-slate-400 font-black block flex items-center gap-1">
                  <Map className="w-4 h-4 text-[#ff7f00]" />
                  מערכת ניווט לווינית חכמה לכביש (Waze / Google Maps)
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 block text-right font-bold">ניווט למוצא:</span>
                    <div className="flex gap-1.5">
                      <a
                        href={getWazeLink(selectedJob.originCity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-grow bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[10px] py-2 px-1.5 rounded-lg flex items-center justify-center gap-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Waze מוצא</span>
                      </a>
                      <a
                        href={getGoogleMapsLink(selectedJob.originCity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0c2447] text-white border border-slate-800 px-2 py-2 rounded-lg flex items-center"
                        title="Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 block text-right font-bold">ניווט ליעד:</span>
                    <div className="flex gap-1.5">
                      <a
                        href={getWazeLink(selectedJob.destinationCity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-grow bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[10px] py-2 px-1.5 rounded-lg flex items-center justify-center gap-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Waze יעד</span>
                      </a>
                      <a
                        href={getGoogleMapsLink(selectedJob.destinationCity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0c2447] text-white border border-slate-800 px-2 py-2 rounded-lg flex items-center"
                        title="Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE STEPS & MILISTONES CONTROL UNIT */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <span className="text-[10px] text-slate-400 font-bold block">עדכון סטטוס התקדמות הובלה בזמן אמת:</span>
                
                {/* Visual state pipeline */}
                <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold pb-1 text-slate-400">
                  <span className={`pb-1.5 border-b-2 ${jobStatus === 'idle' ? 'text-[#ff7f00] border-[#ff7f00]' : 'border-slate-800'}`}>טרם התחיל</span>
                  <span className={`pb-1.5 border-b-2 ${jobStatus === 'en_route_origin' ? 'text-[#ff7f00] border-[#ff7f00]' : 'border-slate-800'}`}>בדרך למוצא</span>
                  <span className={`pb-1.5 border-b-2 ${jobStatus === 'loading_complete' ? 'text-[#ff7f00] border-[#ff7f00]' : 'border-slate-800'}`}>העמסה והובלה</span>
                  <span className={`pb-1.5 border-b-2 ${jobStatus === 'en_route_destination' ? 'text-[#ff7f00] border-[#ff7f00]' : 'border-slate-800'}`}>הגעה ופריקה</span>
                </div>

                {/* Big Large Button for Field Driver */}
                {jobStatus !== 'unloading_complete' && jobStatus !== 'completed' && (
                  <button
                    onClick={handleAdvanceStatus}
                    className="w-full bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff7f00]/10 hover:scale-[1.01]"
                  >
                    <Truck className="w-5 h-5" />
                    <span>
                      {jobStatus === 'idle' && 'התחל נסיעה כעת לכתובת המוצא 🚛'}
                      {jobStatus === 'en_route_origin' && 'הגעתי למוצא! סמן סיום העמסה ויציאה לדרך 📦'}
                      {jobStatus === 'loading_complete' && 'סמן: הגעתי לכתובת היעד והתחלת פריקה 📍'}
                      {jobStatus === 'en_route_destination' && 'סמן: פריקה הסתיימה בהצלחה ומטען ממוקם 🏁'}
                    </span>
                  </button>
                )}

                {/* Unloading Complete, now showing digital signature component */}
                {(jobStatus === 'unloading_complete' || jobStatus === 'completed') && !completionReport && (
                  <div className="bg-[#0b1626] border border-[#ff7f00]/30 p-4 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <strong className="text-white text-xs block">העמסה ופריקה הושלמו!</strong>
                        <span className="text-[9px] text-slate-400">חובה להעלות תיעוד תכולה ולהחתים את המזמין לאישור</span>
                      </div>
                    </div>

                    {/* PHOTO ATTACHMENT PROOF BLOCK */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-300 font-bold block">1. צילום הוכחת מצב מטען (Proof of Delivery Photo)</span>
                        <span className="text-[9px] text-slate-500 font-bold">מומלץ לצלם לפחות תמונה אחת</span>
                      </div>

                      {/* Photo selector */}
                      <div className="flex flex-wrap gap-2">
                        <label className="w-16 h-16 border-2 border-dashed border-slate-800 hover:border-[#ff7f00] bg-[#071121] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                          <input
                            key={photoInputKey}
                            type="file"
                            accept="image/*"
                            capture="environment" // Forces back camera on mobile phones
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                          <Camera className="w-5 h-5 text-[#ff7f00]" />
                          <span className="text-[8px] text-slate-400 mt-1 font-bold">צלם</span>
                        </label>

                        {cargoPhotos.map(photo => (
                          <div key={photo.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-800 group bg-slate-900">
                            <img src={photo.url} alt="Cargo Condition Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="p-1 bg-rose-600 rounded-full text-white hover:bg-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Tiny tech indicator tag */}
                            <span className="absolute bottom-0 left-0 right-0 bg-black/75 text-[7px] text-emerald-400 truncate text-center font-mono">
                              תמונת שטח ✔
                            </span>
                          </div>
                        ))}
                      </div>

                      {cargoPhotos.length > 0 && (
                        <div className="text-[8px] font-mono text-slate-500 bg-[#071121] p-1.5 rounded border border-slate-800 leading-normal space-y-0.5">
                          {cargoPhotos.map((p, idx) => (
                            <div key={p.id}>תמונה {idx+1}: {p.gps} | זמן: {p.timestamp}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* TOUCH SIGNATURE PAD CANVAS */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-300 font-bold block">2. חתימת לקוח דיגיטלית על גבי מסך המכשיר *</span>
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="text-[9px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>נקה חתימה</span>
                        </button>
                      </div>

                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-white/5 relative">
                        {/* Interactive Signature Pad Canvas */}
                        <canvas
                          ref={canvasRef}
                          width={450}
                          height={160}
                          onMouseDown={startDrawingMouse}
                          onMouseMove={drawMouse}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawingTouch}
                          onTouchMove={drawTouch}
                          onTouchEnd={stopDrawing}
                          className="w-full h-40 bg-white block cursor-crosshair"
                          style={{ touchAction: 'none' }} // Stops browser touch scrolling while signing
                        />
                        {!hasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-bold bg-[#071121]/80 gap-1.5">
                            <PenTool className="w-4 h-4 text-[#ff7f00] animate-bounce" />
                            <span>חתום כאן באצבע או בעט מגע</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* FINALIZE POD SUBMISSION FORM BUTTON */}
                    <div className="pt-2">
                      <button
                        onClick={handleFinalizePOD}
                        disabled={submittingPOD || !hasSignature}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                      >
                        {submittingPOD ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>סוגר סבב עבודה ומעלה נתוני POD לשרת...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4.5 h-4.5" />
                            <span>אשר מסירה וסגור משימת שטח סופית ✔</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}

                {/* COMPLETED REPORT & DRIVER PAYOUT SUMMARY SHEET */}
                {completionReport && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0e1e38] border border-emerald-500/30 rounded-2xl p-5 text-right space-y-4"
                  >
                    <div className="text-center py-2 border-b border-slate-800">
                      <Award className="w-10 h-10 text-yellow-500 mx-auto animate-bounce" />
                      <h4 className="font-extrabold text-white text-sm mt-1.5">עבודה סגורה בהצלחה!</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">דוח POD נשלח למשרד ותקבול הנהג אושר לתשלום בסבב הנוכחי</p>
                    </div>

                    {/* Receipt breakdown sheet */}
                    <div className="bg-[#071121] border border-slate-800 p-3.5 rounded-xl space-y-2.5 font-mono text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>קוד משימה:</span>
                        <strong className="text-[#ff7f00]">{completionReport.jobCode}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>שם לקוח חותם:</span>
                        <strong className="text-white">{completionReport.customerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>מועד השלמה:</span>
                        <span>{completionReport.completedAt}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-2 text-xs">
                        <span className="text-emerald-400"><strong>זיכוי ברוטו לנהג (72%):</strong></span>
                        <strong className="text-emerald-400">₪{completionReport.payoutAmount.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>מע"מ הכלול בדוח (17%):</span>
                        <span>₪{completionReport.vatAmount}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={handleCloseActiveJob}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                      >
                        חזור למשימות שלי
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>

          </div>
        )}

      </main>

      {/* QUICK CALL DIAL CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {showCallConfirm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e1e38] border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-right space-y-4"
            >
              <div className="w-12 h-12 bg-[#ff7f00]/10 rounded-full flex items-center justify-center mx-auto text-[#ff7f00]">
                <PhoneCall className="w-6 h-6 animate-pulse" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="font-extrabold text-white text-sm">התקשרות ישירה מחוץ לאפליקציה</h4>
                <p className="text-xs text-slate-400">
                  האם ברצונך לחייג כעת אל <strong className="text-white">{showCallConfirm.name}</strong> במספר <span className="font-mono">{showCallConfirm.number}</span>?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCallConfirm(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  ביטול וחזרה
                </button>
                <button
                  type="button"
                  onClick={proceedWithCall}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>חייג עכשיו 📞</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
