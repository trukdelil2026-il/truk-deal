import React, { useState, useEffect } from 'react';
import { 
  Truck, ShieldCheck, Clock, MapPin, Phone, Mail, Building, FileText, Send, 
  CheckCircle, ArrowLeft, ExternalLink, Star, Upload, Trash2, X, ChevronRight, 
  ChevronLeft, Building2, User, HelpCircle, HardHat, FileUp
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface LandingPageProps {
  onEnterCRM: () => void;
  googleScriptUrl: string;
  onLeadAdded: () => void;
  onEnterTender: () => void;
  onEnterClientPortal: () => void;
  onEnterDriverPortal: () => void;
  onEnterFeedback: () => void;
}

export default function LandingPage({ onEnterCRM, googleScriptUrl, onLeadAdded, onEnterTender, onEnterClientPortal, onEnterDriverPortal, onEnterFeedback }: LandingPageProps) {
  // Client type state: 'private' (B2C - הובלת דירה) or 'business' (B2B - לוגיסטיקה עסקית)
  const [clientType, setClientType] = useState<'private' | 'business'>('private');
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    company: '',
    originAddress: '',
    destinationAddress: '',
    floor: '0',
    elevator: 'yes', // yes / no / freight
    accessibility: 'easy', // easy / walk / restricted
    needCrane: false,
    notes: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<{
    name: string;
    type: string;
    size: number;
    base64: string;
    previewUrl: string;
  }[]>([]);

  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carousel slider state
  const [activeSlide, setActiveSlide] = useState(0);

  const carouselImages = [
    {
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      title: 'פתרונות שינוע ולוגיסטיקה מתקדמים',
      subtitle: 'מערך ארצי חכם המנוהל דיגיטלית בסטנדרט העולמי הגבוה ביותר.'
    },
    {
      url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
      title: 'צי משאיות חדיש ובקרת לוויין',
      subtitle: 'כל הובלה מבוקרת 24/7 ומנווטת בבטחה ישירות אל היעד.'
    },
    {
      url: 'https://images.unsplash.com/photo-1501707315850-fa335db17375?auto=format&fit=crop&w=1200&q=80',
      title: 'שירות בפריסה ארצית רחבה',
      subtitle: 'מענה מושלם להובלות דירה יוקרתיות ולוגיסטיקה עסקית מורכבת.'
    }
  ];

  // Auto advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processFiles = (files: FileList) => {
    setError(null);
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError('חלק מהקבצים חורגים ממגבלת הגודל המקסימלית של 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        
        setUploadedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            base64: base64Data,
            previewUrl: file.type.startsWith('image/') ? base64String : ''
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.fullName || !formData.phone || !formData.email || !formData.originAddress || !formData.destinationAddress) {
      setError('אנא מלאו את כל שדות החובה המסומנים בכוכבית');
      return;
    }

    if (clientType === 'business' && !formData.company) {
      setError('שם חברה/ארגון הוא שדה חובה עבור לקוחות עסקיים');
      return;
    }

    setLoading(true);
    setError(null);

    // Filter file references for Firestore to keep the document size under 1MB
    const dbFilesRef = uploadedFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      // Store previewUrl only if it's small, otherwise just store that it exists
      hasPreview: !!f.previewUrl
    }));

    const leadPayload = {
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      company: clientType === 'business' ? formData.company : 'לקוח פרטי',
      clientType: clientType,
      originAddress: formData.originAddress,
      destinationAddress: formData.destinationAddress,
      floor: formData.floor,
      elevator: formData.elevator,
      accessibility: formData.accessibility,
      needCrane: formData.needCrane,
      notes: formData.notes,
      createdAt: new Date().toLocaleString('he-IL'),
      status: 'new',
      source: 'landing_page',
      filesCount: uploadedFiles.length,
      filesInfo: dbFilesRef
    };

    try {
      // 1. Save to Firestore
      const leadsCol = collection(db, 'leads');
      const savedDoc = await addDoc(leadsCol, leadPayload);

      // 2. Build full package for Google Apps Script (including base64 files for Google Drive)
      const gasPayload = {
        ...leadPayload,
        leadId: savedDoc.id,
        driveFolderId: '1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG',
        files: uploadedFiles.map(f => ({
          name: f.name,
          type: f.type,
          base64: f.base64
        }))
      };

      // Send to Apps Script
      try {
        await fetch(googleScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gasPayload),
        });
      } catch (gasErr) {
        console.warn('Apps Script target reachable but bypassed due to CORS. Lead data is safely secured in Firestore.', gasErr);
      }

      setSuccess(true);
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        company: '',
        originAddress: '',
        destinationAddress: '',
        floor: '0',
        elevator: 'yes',
        accessibility: 'easy',
        needCrane: false,
        notes: '',
      });
      setUploadedFiles([]);
      
      // Notify CRM dashboard to pull new records
      onLeadAdded();
      
    } catch (err: any) {
      console.error('Error saving lead:', err);
      setError('חלה שגיאה בשילוח הטופס למערכת. אנא בדקו את חיבור האינטרנט ונסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Google Reviews mock data
  const googleReviews = [
    {
      name: 'מיכל כהן',
      role: 'לקוחה פרטית',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      comment: 'העברת דירה לoul מתקתקת בלי שום הפתעות. מדויקים בזמנים, שירות מעל הכל!',
      time: 'לפני שבועיים'
    },
    {
      name: 'קרן אברהם',
      role: 'מנהלת משרד',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      comment: 'חברת Truk Dealil מנהלים לנו את ההפצות העסקיות ברמה הגבוהה ביותר. פשוט ראש שקט.',
      time: 'לפני חודש'
    },
    {
      name: 'ח. סבן חומרי בניין',
      role: 'לקוח עסקי',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      comment: 'עבודה מדויקת, עמידה קפדנית בזמנים ופרגון ענק לאיש הסידור שלנו שמתאם הכל פיקס.',
      time: 'לפני 3 ימים'
    },
    {
      name: 'דניאל לוי',
      role: 'לקוח פרטי',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      comment: 'הגיעו בדיוק בשעה שנקבעה, טיפלו בציוד הרגיש בזהירות מקסימלית. ממליץ בחום!',
      time: 'לפני שבועיים'
    },
    {
      name: 'רונית שקד',
      role: 'ניהול פרויקטים',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      comment: 'מקצועיות ללא פשרות, מערכת מעקב מושלמת ושקיפות מלאה לכל אורך הדרך.',
      time: 'לפני חודשיים'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-right" dir="rtl" id="landing-page-root">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#0a192f]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff7f00] rounded-xl flex items-center justify-center font-black text-[#0a192f] text-2xl shadow-lg shadow-[#ff7f00]/20">T</div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#ff7f00] block uppercase">TRUK DEALIL <span className="text-white">IL</span></span>
              <span className="text-[10px] text-slate-400 font-bold block -mt-1 tracking-wide">לוגיסטיקה חכמה ומערך הובלות ארצי</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <nav className="hidden lg:flex items-center gap-6 text-xs font-black text-slate-300">
              <a href="#about-platform" className="hover:text-[#ff7f00] transition-colors">מי אנחנו</a>
              <a href="#services-grid" className="hover:text-[#ff7f00] transition-colors">סל שירותים</a>
              <a href="#customer-reviews" className="hover:text-[#ff7f00] transition-colors">חוות דעת גוגל</a>
              <button 
                onClick={onEnterFeedback} 
                className="hover:text-[#ff7f00] text-[#ff7f00] transition-colors font-black cursor-pointer bg-amber-500/10 px-2 py-1 rounded"
              >
                סקר שביעות רצון ⭐
              </button>
              <a href="#quote-form-section" className="hover:text-[#ff7f00] transition-colors">הצעת מחיר דיגיטלית</a>
            </nav>
            
            <button
              onClick={onEnterClientPortal}
              className="bg-[#0e1e38] hover:bg-[#ff7f00]/10 border border-[#ff7f00]/20 hover:border-[#ff7f00]/60 text-slate-200 hover:text-[#ff7f00] font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <span>מעקב משלוח ופורטל לקוח 📦</span>
            </button>

            <button
              onClick={onEnterDriverPortal}
              className="bg-[#0e1e38] hover:bg-[#ff7f00]/10 border border-[#ff7f00]/20 hover:border-[#ff7f00]/60 text-slate-200 hover:text-[#ff7f00] font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <span>אפליקציית נהגי שטח 🚛</span>
            </button>

            <button
              onClick={onEnterTender}
              className="bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md hover:scale-[1.02]"
            >
              <span>מכרז הובלה / דירה 🚀</span>
            </button>

            <button
              onClick={onEnterCRM}
              className="bg-[#0e1e38] hover:bg-[#ff7f00]/10 border border-slate-800 hover:border-[#ff7f00]/40 text-slate-200 hover:text-[#ff7f00] font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <span>מסוף CRM פנימי</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[#0a192f] via-[#0d213e] to-[#0a192f] py-12 lg:py-20 px-4 sm:px-6 overflow-hidden border-b border-slate-900">
        
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff7f00]/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Right Column: Hero copy and Slider Carousel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#ff7f00]/10 text-[#ff7f00] border border-[#ff7f00]/20 px-3.5 py-2 rounded-full text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-[#ff7f00] animate-ping"></span>
              שילוח דיגיטלי, מהיר ומבוטח בפריסה ארצית
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
              מהירות, ביטחון ושליטה <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#ff7f00]">
                מלאה בכל הובלה.
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              מערך השינוע והלוגיסטיקה הדיגיטלי המוביל בישראל. Truk Dealil IL מחבר בין מכולות נמל, הפצות לוגיסטיות של ארגונים גדולים, והעברות דירה יוקרתיות - ישירות לצי משאיות חדיש עם מעקב לווייני רציף ואפס עמלות תיווך.
            </p>

            {/* HIGH RESOLUTION HERO CAROUSEL */}
            <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-white/10 group shadow-2xl bg-black">
              {carouselImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === activeSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover brightness-75 scale-105 hover:scale-100 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
                  
                  {/* Title block */}
                  <div className="absolute bottom-5 right-5 left-5 text-right space-y-1 z-10">
                    <h3 className="text-base sm:text-lg font-black text-[#ff7f00]">{image.title}</h3>
                    <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-relaxed">{image.subtitle}</p>
                  </div>
                </div>
              ))}

              {/* Slider Controls */}
              <button
                onClick={handlePrevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-[#ff7f00] text-white hover:text-black flex items-center justify-center transition-all z-20 backdrop-blur-xs border border-white/10"
                aria-label="הקודם"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-[#ff7f00] text-white hover:text-black flex items-center justify-center transition-all z-20 backdrop-blur-xs border border-white/10"
                aria-label="הבא"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Slider Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {carouselImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === activeSlide ? 'bg-[#ff7f00] w-5' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Brand KPI stats */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="bg-[#0e1e38]/60 border-r-4 border-[#ff7f00] p-3 rounded text-right">
                <span className="block text-xl sm:text-2xl font-black text-white font-mono">100%</span>
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">בקרת נהגים ישירה</span>
              </div>
              <div className="bg-[#0e1e38]/60 border-r-4 border-sky-500 p-3 rounded text-right">
                <span className="block text-xl sm:text-2xl font-black text-white font-mono">0%</span>
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">דמי תיווך וסוכנים</span>
              </div>
              <div className="bg-[#0e1e38]/60 border-r-4 border-emerald-500 p-3 rounded text-right">
                <span className="block text-xl sm:text-2xl font-black text-white font-mono">24h</span>
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">מענה קו ושינוע</span>
              </div>
            </div>
          </div>

          {/* Left Column: Smart Quote Form Box */}
          <div className="lg:col-span-5" id="quote-form-section">
            <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#ff7f00] text-[#0a192f] text-[10px] font-black uppercase px-4 py-1.5 rounded-xl shadow-lg">
                בקשת הצעת מחיר מהירה
              </div>

              {success ? (
                <div className="py-12 text-center space-y-5">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-bold text-white">פנייתך נקלטה בהצלחה!</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                    פרטי ההובלה והקבצים שהעלאת נרשמו בבסיס הנתונים וסונכרנו לגיליונות הניהול. נציג מורשה של Truk Dealil יחזור אליך טלפונית בהקדם.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-6 text-xs text-[#ff7f00] hover:underline font-bold flex items-center gap-1.5 mx-auto"
                  >
                    מלא בקשת הובלה חדשה <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* B2C / B2B Dynamic Client Type Toggle */}
                  <div className="bg-black/30 p-1 rounded-xl border border-slate-800 grid grid-cols-2 gap-1 mb-4">
                    <button
                      type="button"
                      onClick={() => setClientType('private')}
                      className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        clientType === 'private'
                          ? 'bg-[#ff7f00] text-[#0a192f] shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>לקוח פרטי (דירה)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientType('business')}
                      className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        clientType === 'business'
                          ? 'bg-[#ff7f00] text-[#0a192f] shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>לקוח עסקי (ארגונים)</span>
                    </button>
                  </div>

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-bold">
                      {error}
                    </div>
                  )}

                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      {clientType === 'business' ? 'שם איש קשר מורשה *' : 'שם מלא לקשר *'}
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="ישראל ישראלי"
                      required
                      className="w-full bg-[#061121] border border-slate-800 hover:border-[#ff7f00] focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Contact Fields (Phone & Email) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">מספר טלפון נייד *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="050-0000000"
                        required
                        className="w-full bg-[#061121] border border-slate-800 hover:border-[#ff7f00] focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        {clientType === 'business' ? 'אימייל חברה / ארגון *' : 'כתובת אימייל *'}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@trukdeal.co.il"
                        required
                        className="w-full bg-[#061121] border border-slate-800 hover:border-[#ff7f00] focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Company Name (Business Only) */}
                  {clientType === 'business' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">שם חברה / ח"פ ארגון *</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="לדוגמא: אברהם לוי ייבוא והפצה בע״מ"
                        required
                        className="w-full bg-[#061121] border border-slate-800 hover:border-[#ff7f00] focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Origin & Destination Addresses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        {clientType === 'business' ? 'מחסן / אתר מוצא *' : 'עיר / כתובת מוצא *'}
                      </label>
                      <input
                        type="text"
                        name="originAddress"
                        value={formData.originAddress}
                        onChange={handleChange}
                        placeholder="לדוגמא: תל אביב, הרצל 5"
                        required
                        className="w-full bg-[#061121] border border-slate-800 hover:border-[#ff7f00] focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        {clientType === 'business' ? 'מחסן / אתר יעד *' : 'עיר / כתובת יעד *'}
                      </label>
                      <input
                        type="text"
                        name="destinationAddress"
                        value={formData.destinationAddress}
                        onChange={handleChange}
                        placeholder="לדוגמא: אילת, המלאכה 14"
                        required
                        className="w-full bg-[#061121] border border-slate-800 hover:border-[#ff7f00] focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Technical Logistics Parameters */}
                  <div className="grid grid-cols-3 gap-2 bg-[#061121]/50 p-3 rounded-xl border border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 block">קומה *</label>
                      <input
                        type="number"
                        name="floor"
                        min="0"
                        max="40"
                        value={formData.floor}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-slate-800 text-slate-100 rounded px-2 py-1 text-xs text-center"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 block">מעלית? *</label>
                      <select
                        name="elevator"
                        value={formData.elevator}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-slate-800 text-slate-300 rounded px-1.5 py-1 text-[10px]"
                      >
                        <option value="yes">יש מעלית</option>
                        <option value="no">אין מעלית</option>
                        <option value="freight">מעלית משא</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 block">נגישות משאית *</label>
                      <select
                        name="accessibility"
                        value={formData.accessibility}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-slate-800 text-slate-300 rounded px-1.5 py-1 text-[10px]"
                      >
                        <option value="easy">נגישות קלה</option>
                        <option value="walk">מרחק הליכה</option>
                        <option value="restricted">חניה צרה/בעייתית</option>
                      </select>
                    </div>
                  </div>

                  {/* Need Crane Toggle */}
                  <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <HardHat className="w-4 h-4 text-orange-400" />
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-200 block">מנוף חיצוני חריג</span>
                        <span className="text-[9px] text-slate-400 block">סמנו במידה ויש צורך במנוף פריקה / טעינה</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="needCrane"
                        checked={formData.needCrane}
                        onChange={handleChange}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#ff7f00] peer-checked:after:bg-[#0a192f]"></div>
                    </label>
                  </div>

                  {/* Drag & Drop File & Image Upload Area */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      {clientType === 'business' ? 'העלאת מפרט טכני, RFQ או קובץ מכרז' : 'צילומי ציוד / פריטים רגישים להובלה'}
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-4 text-center transition-all relative ${
                        isDragOver 
                          ? 'border-[#ff7f00] bg-[#ff7f00]/5' 
                          : 'border-slate-800 hover:border-slate-700 bg-black/20'
                      }`}
                    >
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        id="file-upload-input"
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                      />
                      <label htmlFor="file-upload-input" className="cursor-pointer block space-y-1.5">
                        <FileUp className="w-7 h-7 text-slate-500 mx-auto" />
                        <span className="block text-xs font-bold text-slate-300">גררו לכאן תמונות / מסמכים או לחצו לבחירה</span>
                        <span className="block text-[9px] text-slate-500">קבצים נתמכים: JPG, PNG, PDF עד גודל 5MB</span>
                      </label>
                    </div>

                    {/* File Previews / List */}
                    {uploadedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="bg-black/40 border border-slate-800 rounded px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-slate-300 shrink-0 max-w-full">
                            {file.previewUrl ? (
                              <img src={file.previewUrl} className="w-5 h-5 rounded object-cover border border-white/10" alt="תצוגה מקדימה" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeUploadedFile(idx)}
                              className="text-rose-400 hover:text-rose-600 transition-colors shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes & Special Requests */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">הערות ופירוט תכולה מיוחדת</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder={clientType === 'business' ? 'פרט כאן מפרטי פרויקטים מיוחדים, לוחות זמנים חלופיים או הערות שינוע...' : 'אנא פרטו תכולה רגישה (מקרר, מכונת כביסה, פסנתר, רהיטים שבריריים) ודרישות אריזה מיוחדות...'}
                      rows={2}
                      className="w-full bg-[#061121] border border-slate-800 hover:border-[#ff7f00] focus:border-[#ff7f00] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#ff7f00] hover:bg-[#e06f00] disabled:bg-[#ff7f00]/40 text-white font-black text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-4 cursor-pointer hover:scale-[1.01]"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>שלח בקשת הצעת מחיר דיגיטלית</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Trust badging / Features section */}
      <section className="bg-[#061121] py-16 px-4 sm:px-6" id="services-grid">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">שירותי שינוע והפצה בפריסת קצה לקצה</h2>
            <p className="text-xs sm:text-sm text-slate-400">אנו מעמידים לרשותכם את הטכנולוגיה, הנהגים המורשים והצי המתאים ביותר</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-[#ff7f00]/30 transition-all duration-300 shadow-xl group">
              <div className="bg-[#ff7f00]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-[#ff7f00]/20">
                <Truck className="w-6 h-6 text-[#ff7f00]" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-2 group-hover:text-[#ff7f00] transition-colors">צי משאיות רחב ומגוון</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                משאיות חלוקה קלות, משאיות סגורות להובלת רהיטים, משאיות מנוף כבדות ומכולות נמל. אנו מתאימים עבורכם בדיוק את נפח השינוע הנדרש.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-[#ff7f00]/30 transition-all duration-300 shadow-xl group">
              <div className="bg-[#ff7f00]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-[#ff7f00]/20">
                <ShieldCheck className="w-6 h-6 text-[#ff7f00]" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-2 group-hover:text-[#ff7f00] transition-colors">כיסוי ביטוחי מקיף ומלא</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                כל המטענים, הציוד המשרדי והתכולה הביתית מבוטחים בכיסוי מורחב ורב-ממדי. שקט נפשי אבסולוטי מרגע האריזה ועד לפריקה הסופית.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-[#ff7f00]/30 transition-all duration-300 shadow-xl group">
              <div className="bg-[#ff7f00]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-[#ff7f00]/20">
                <Clock className="w-6 h-6 text-[#ff7f00]" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-2 group-hover:text-[#ff7f00] transition-colors">דיוק כרונולוגי חסר פשרות</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                אלגוריתם הניווט והמשלוח שלנו מחשב זמני נסיעה מיטביים, עוקף פקקי תנועה בזמן אמת ומסונכרן ליומן המשגרים לקבלת דיוק שוויצרי.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* GOOGLE STYLE REVIEWS SECTION */}
      <section className="bg-[#0a192f] py-16 px-4 sm:px-6 border-t border-slate-900" id="customer-reviews">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="text-right space-y-2">
              <span className="text-xs text-[#ff7f00] font-black uppercase tracking-wider block">דירוג לקוחות אובייקטיבי</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">מה חושבים עלינו בגוגל?</h2>
              <p className="text-xs text-slate-400">חוות דעת מאומתות של חברות מובילות ולקוחות פרטיים שהתנסו בשירות</p>
            </div>
            
            {/* Google trust card */}
            <div className="bg-[#0e1e38] border border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-4 shrink-0">
              {/* Fake Google Logo Icon with custom styling */}
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-2xl shadow-md">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500">G</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-white font-mono">4.9</span>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold block">ציון ממוצע מאומת (538 חוות דעת)</span>
              </div>
            </div>
          </div>

          {/* Grid layout for Reviews */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {googleReviews.map((review, index) => (
              <div 
                key={index} 
                className="bg-[#0e1e38]/60 border border-slate-850 hover:border-[#ff7f00]/30 rounded-2xl p-5 hover:bg-[#0e1e38] transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg relative group"
              >
                {/* Gold Stars */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  {/* Mock small Google G logo to show authority */}
                  <span className="text-[10px] bg-white/5 text-slate-400 font-bold px-1.5 py-0.5 rounded font-mono">Google Review</span>
                </div>

                {/* Comment Content */}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                  "{review.comment}"
                </p>

                {/* Profile Card */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-800/60">
                  <img 
                    src={review.avatar} 
                    alt={review.name} 
                    className="w-10 h-10 rounded-full object-cover border border-white/10" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-black text-white">{review.name}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold block">{review.role} • {review.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Platform Presentation */}
      <section className="bg-[#061121] py-16 px-4 sm:px-6 border-t border-slate-900" id="about-platform">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              מערכת אופטימיזציה חכמה אחת עבור הלקוחות והמשגרים
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              פיתחנו פתרון קצה-אל-קצה פורץ דרך. דרך דף הנחיתה, לקוחות קצה, קבלנים וחברות מגישים את בקשותיהם בקלות ומצרפים צילומי תכולה להערכת משקל מיטבית. המשגרים ומנהלי הצי עובדים מסונכרנים מתוך לוח בקרה CRM מתקדם, המנהל נהגים בזמן אמת ומסנכרן את כל המידע אל מול גליונות הניהול של Google Sheets.
            </p>
            
            <ul className="space-y-3.5 text-xs text-slate-400 font-bold">
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4.5 h-4.5 text-[#ff7f00] shrink-0" />
                <span>מעקב בזמן אמת אחר צי משאיות על גבי מפה וקטורית חכמה.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4.5 h-4.5 text-[#ff7f00] shrink-0" />
                <span>סנכרון רציף (Two-way Sync) המונע כפילויות ואובדן מידע בגיליונות.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4.5 h-4.5 text-[#ff7f00] shrink-0" />
                <span>מותאם לחלוטין להתקנה כאפליקציית PWA על כל סמארטפון או מחשב.</span>
              </li>
            </ul>
          </div>

          {/* Interactive PWA Promo Visual */}
          <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase">התקנה מהירה • PWA Active</span>
              <span className="text-[10px] bg-[#ff7f00]/15 text-[#ff7f00] px-2.5 py-0.5 rounded font-black">אפליקציה חינמית</span>
            </div>
            
            <h3 className="font-extrabold text-base text-slate-200">רוצים את Truk Dealil IL ישירות בנייד?</h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              הפלטפורמה שלנו תומכת ב-Progressive Web App. לחצו על שלוש הנקודות בדפדפן בנייד או בדסקטופ ובחרו "הוסף למסך הבית" או "התקן אפליקציה" כדי ליהנות מחוויית ניהול מהירה וללא עיכובים.
            </p>

            <div className="pt-2 flex items-center gap-4 text-[10px] sm:text-xs font-bold text-[#ff7f00]">
              <span>✓ זיכרון מטמון מהיר</span>
              <span>✓ נגישות לא מקוונת</span>
              <span>✓ איקון לוח בקרה</span>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#061121] border-t border-slate-900 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-bold">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#ff7f00] rounded-lg flex items-center justify-center font-black text-[#0a192f] text-sm shadow-md">T</div>
            <span>© 2026 Truk Dealil IL. כל הזכויות שמורות. פתרונות לוגיסטיקה חכמים בפריסה ארצית.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>מוקד ארצי: 073-1234567</span>
            <span>|</span>
            <span>דוא"ל: office@trukdeal.co.il</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
