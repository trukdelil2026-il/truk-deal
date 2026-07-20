import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  Star, 
  ArrowLeft, 
  CheckCircle2, 
  Calculator,
  ChevronRight,
  ChevronLeft,
  Building2,
  User,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onStartMove: (type: 'b2c' | 'b2b') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartMove }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c');

  const slides = [
    {
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80",
      title: "מהירות, ביטחון ושליטה מלאה בכל הובלה",
      subtitle: "פלטפורמת הלוגיסטיקה המתקדמת בישראל להובלות דירה, משרד והפצות עסקיות."
    },
    {
      image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1920&q=80",
      title: "צי משאיות מתקדם בפריסה ארצית",
      subtitle: "פתרונות מנוף, משאיות משטח וצוותים מוסמכים לכל משימה לוגיסטית."
    },
    {
      image: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1920&q=80",
      title: "מעקב דיגיטלי ושקיפות מלאה בזמן אמת",
      subtitle: "רואים בדיוק איפה המשאית, מנהלים הצעות מחיר וחותמים דיגיטלית בשטח."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const reviews = [
    {
      name: "מיכל כהן",
      role: "לקוחה פרטית",
      comment: "העברת דירה מתוקתקת בלי שום הפתעות. מדויקים בזמנים, שירות מעל הכל!",
      rating: 5
    },
    {
      name: "קרן אברהם",
      role: "מנהלת משרד",
      comment: "Truk Dealil מנהלים לנו את ההפצות העסקיות ברמה הגבוהה ביותר. פשוט ראש שקט.",
      rating: 5
    },
    {
      name: "ח. סבן חומרי בניין",
      role: "לקוח עסקי",
      comment: "עבודה מדויקת, עמידה קפדנית בזמנים ופרגון ענק למערכת הניהול שמתאמת הכל פיקס.",
      rating: 5
    },
    {
      name: "דניאל לוי",
      role: "לקוח פרטי",
      comment: "הגיעו בדיוק בשעה שנקבעה, טיפלו בציוד הרגיש בזהירות מקסימלית. ממליץ בחום!",
      rating: 5
    },
    {
      name: "רונית שקד",
      role: "ניהול פרויקטים",
      comment: "מקצועיות ללא פשרות, מערכת מעקב מושלמת ושקיפות מלאה לכל אורך הדרך.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a192f] text-white font-sans rtl" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#0a192f]/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#ff7f00] p-2 rounded-xl text-[#0a192f] shadow-lg shadow-[#ff7f00]/20">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Truk Dealil <span className="text-[#ff7f00]">IL</span></h1>
            <p className="text-xs text-slate-400">פלטפורמת לוגיסטיקה והובלות חכמה</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => onStartMove('b2c')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition"
          >
            <User className="w-4 h-4 text-[#ff7f00]" />
            הובלה פרטית
          </button>
          <button 
            onClick={() => onStartMove('b2b')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition"
          >
            <Building2 className="w-4 h-4 text-[#ff7f00]" />
            לוגיסטיקה עסקית
          </button>
          <button 
            onClick={() => onStartMove('b2c')}
            className="bg-[#ff7f00] hover:bg-[#ff7f00]/90 text-[#0a192f] font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-[#ff7f00]/20 transition flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            <span>התחל מכרז מהיר</span>
          </button>
        </div>
      </header>

      {/* Hero Section with Carousel */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === activeSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100 pointer-events-none'
            } transition-transform duration-700`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a192f] via-[#0a192f]/80 to-transparent z-10" />
            <img src={slide.image} alt="Hero slide" className="w-full h-full object-cover" />
          </div>
        ))}

        <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff7f00]/10 border border-[#ff7f00]/30 text-[#ff7f00] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              הדור הבא של עולם ההובלות בישראל
            </div>
            
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
              {slides[activeSlide].title}
            </h2>
            
            <p className="text-lg text-slate-300 max-w-xl">
              {slides[activeSlide].subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => onStartMove('b2c')}
                className="bg-[#ff7f00] hover:bg-[#ff7f00]/90 text-[#0a192f] font-bold px-8 py-4 rounded-xl shadow-xl shadow-[#ff7f00]/20 transition flex items-center justify-center gap-3 text-lg"
              >
                <span>קבל הצעת מחיר מיידית</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl">
                <div className="flex -space-x-2 space-x-reverse">
                  <div className="w-9 h-9 rounded-full bg-[#ff7f00] text-[#0a192f] font-bold flex items-center justify-center text-xs border-2 border-[#0a192f]">שס</div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs border-2 border-[#0a192f]">עא</div>
                  <div className="w-9 h-9 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-xs border-2 border-[#0a192f]">חכ</div>
                </div>
                <div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">מעל 1,200 לקוחות מרוצים</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === activeSlide ? 'w-8 bg-[#ff7f00]' : 'w-2.5 bg-slate-600'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Trust & Features Section */}
      <section className="py-20 px-6 lg:px-12 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-lg hover:border-[#ff7f00]/50 transition">
            <div className="w-12 h-12 bg-[#ff7f00]/10 rounded-xl flex items-center justify-center text-[#ff7f00] mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">שקיפות ובטחון מלא</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              מערכת תשלום מאובטחת, נעילת נתונים פיננסית וחשבוניות דיגיטליות מונפקות מיד עם סיום ההובלה.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-lg hover:border-[#ff7f00]/50 transition">
            <div className="w-12 h-12 bg-[#ff7f00]/10 rounded-xl flex items-center justify-center text-[#ff7f00] mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">זמינות ומהירות שיא</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              התאמת משאיות ונהגים בזמן אמת, כולל שירותי מנוף מתקדמים וניהול נתיבים חכם.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-lg hover:border-[#ff7f00]/50 transition">
            <div className="w-12 h-12 bg-[#ff7f00]/10 rounded-xl flex items-center justify-center text-[#ff7f00] mb-6">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">מעקב חסר פשרות</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              עקוב אחר סטטוס ההובלה שלך בכל רגע נתונים, צפה בפרטי הנהג וקבל שליטה מלאה מהנייד.
            </p>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 px-6 lg:px-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">מה הלקוחות שלנו אומרים</h2>
            <p className="text-slate-400">אמינות, דיוק ומקצועיות ללא פשרות בכל משלוח והעברה.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((rev, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex text-amber-400 mb-4">
                    {[...Array(rev.rating)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm italic mb-6">"{rev.comment}"</p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <div>
                    <h4 className="font-bold text-sm">{rev.name}</h4>
                    <p className="text-xs text-slate-400">{rev.role}</p>
                  </div>
                  <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    מאומת
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-6 lg:px-12 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© 2026 Truk Dealil IL. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
};
