import React, { useState, useEffect } from 'react';
import { 
  Truck, Users, Calendar, AlertTriangle, CheckCircle2, Wrench, Clock, Plus, 
  Trash2, Edit, FileSpreadsheet, UserCheck, MapPin, UserX, CalendarDays, Save, X, Info
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot 
} from 'firebase/firestore';
import { Driver, Lead } from '../types';

export interface TruckItem {
  id: string;
  type: 'flatbed' | 'crane' | 'hydraulic' | 'semitrailer';
  licensePlate: string;
  model: string;
  status: 'available' | 'in_transit' | 'maintenance';
  testDueDate: string;
  insuranceDueDate: string;
  craneCapacity?: number; // tons
  assignedDriverId?: string;
}

interface FleetManagementProps {
  drivers: Driver[];
  tenders: any[];
  onAddSystemLog: (category: 'system' | 'sync' | 'lead' | 'shipment' | 'driver', message: string) => void;
}

const SEED_TRUCKS: Omit<TruckItem, 'id'>[] = [
  { type: 'crane', model: 'וולוו FM 460 - מנוף פאלפינגר 50 טון/מטר', licensePlate: '12-345-67', status: 'available', testDueDate: '2026-10-15', insuranceDueDate: '2026-11-01', craneCapacity: 10, assignedDriverId: 'drv_1' },
  { type: 'semitrailer', model: 'סקאניה R-500 גרור פתוח להובלות כבדות', licensePlate: '98-765-43', status: 'in_transit', testDueDate: '2026-08-20', insuranceDueDate: '2026-09-01', assignedDriverId: 'drv_2' },
  { type: 'hydraulic', model: 'מרצדס אטגו 1523 - דופן הידראולית 2 טון', licensePlate: '55-666-77', status: 'available', testDueDate: '2026-12-05', insuranceDueDate: '2026-12-15', assignedDriverId: 'drv_3' },
  { type: 'flatbed', model: 'איסוזו סומו 12 טון משטח פתוח', licensePlate: '33-222-11', status: 'maintenance', testDueDate: '2026-07-29', insuranceDueDate: '2026-08-15', assignedDriverId: 'drv_4' }
];

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const SHIFT_TYPES = [
  { id: 'morning', label: 'משמרת בוקר (06:00-15:00)', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'evening', label: 'משמרת ערב (15:00-24:00)', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'rest', label: 'מנוחה / חופש', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { id: 'standby', label: 'כוננות בית', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
];

export default function FleetManagement({ drivers, tenders, onAddSystemLog }: FleetManagementProps) {
  const [trucks, setTrucks] = useState<TruckItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New truck form
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false);
  const [newTruck, setNewTruck] = useState({
    type: 'flatbed' as TruckItem['type'],
    model: '',
    licensePlate: '',
    status: 'available' as TruckItem['status'],
    testDueDate: '',
    insuranceDueDate: '',
    craneCapacity: 0,
    assignedDriverId: ''
  });

  // Shifts state (driverId -> dayIndex -> shiftId)
  const [shifts, setShifts] = useState<Record<string, Record<number, string>>>({});

  // Assignment states
  const [selectedTenderId, setSelectedTenderId] = useState<string>('');
  const [assignDriverId, setAssignDriverId] = useState<string>('');
  const [assignTruckId, setAssignTruckId] = useState<string>('');
  const [assignmentAlerts, setAssignmentAlerts] = useState<{ type: 'error' | 'warning' | 'info'; message: string }[]>([]);

  // 1. Subscribe to Trucks & seed if empty
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'trucks'), async (snapshot) => {
      const fetchedTrucks: TruckItem[] = [];
      snapshot.forEach((doc) => {
        fetchedTrucks.push({ id: doc.id, ...doc.data() } as TruckItem);
      });

      if (fetchedTrucks.length === 0) {
        // Seed database
        try {
          for (const truck of SEED_TRUCKS) {
            await addDoc(collection(db, 'trucks'), truck);
          }
          onAddSystemLog('system', 'בוצע אתחול וסיד לצי משאיות הלוגיסטיקה ב-Firestore');
        } catch (err) {
          console.error('Error seeding trucks:', err);
        }
      } else {
        setTrucks(fetchedTrucks);
      }
      setLoading(false);
    });

    // Load schedule shifts from localStorage or Firestore (we can save to localStorage for seamless immediate use)
    const savedShifts = localStorage.getItem('truk_deal_shifts');
    if (savedShifts) {
      try {
        setShifts(JSON.parse(savedShifts));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default initial schedule shifts
      const initial: Record<string, Record<number, string>> = {};
      drivers.forEach(d => {
        initial[d.id] = {
          0: 'morning',
          1: 'morning',
          2: 'evening',
          3: 'evening',
          4: 'standby',
          5: 'rest',
          6: 'rest'
        };
      });
      setShifts(initial);
    }

    return () => unsubscribe();
  }, [drivers]);

  // Save shifts helper
  const handleUpdateShift = (driverId: string, dayIndex: number, shiftId: string) => {
    const updated = {
      ...shifts,
      [driverId]: {
        ...(shifts[driverId] || {}),
        [dayIndex]: shiftId
      }
    };
    setShifts(updated);
    localStorage.setItem('truk_deal_shifts', JSON.stringify(updated));
    const driver = drivers.find(d => d.id === driverId);
    onAddSystemLog('driver', `עודכנה משמרת לנהג ${driver?.name || driverId} ביום ${DAYS_OF_WEEK[dayIndex]} ל-${SHIFT_TYPES.find(s => s.id === shiftId)?.label}`);
  };

  // Add new truck to database
  const handleCreateTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTruck.model || !newTruck.licensePlate || !newTruck.testDueDate || !newTruck.insuranceDueDate) {
      alert('נא למלא את כל שדות החובה למשאית');
      return;
    }

    try {
      await addDoc(collection(db, 'trucks'), {
        ...newTruck,
        craneCapacity: Number(newTruck.craneCapacity) || 0
      });
      onAddSystemLog('system', `משאית חדשה התווספה לצי: ${newTruck.model} [לוחית: ${newTruck.licensePlate}]`);
      setIsAddTruckOpen(false);
      setNewTruck({
        type: 'flatbed',
        model: '',
        licensePlate: '',
        status: 'available',
        testDueDate: '',
        insuranceDueDate: '',
        craneCapacity: 0,
        assignedDriverId: ''
      });
    } catch (err) {
      console.error('Error adding truck:', err);
    }
  };

  // Remove truck from database
  const handleDeleteTruck = async (id: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך להסיר משאית זו מצי הרכב הלוגיסטי?')) return;
    try {
      await deleteDoc(doc(db, 'trucks', id));
      onAddSystemLog('system', `משאית מזהה ${id} הוסרה מצי הרכב`);
    } catch (err) {
      console.error(err);
    }
  };

  // Run dynamic resource assignment validations
  useEffect(() => {
    const alerts: { type: 'error' | 'warning' | 'info'; message: string }[] = [];
    
    if (!selectedTenderId) {
      setAssignmentAlerts([]);
      return;
    }

    const selectedTender = tenders.find(t => t.id === selectedTenderId);
    const selectedDriver = drivers.find(d => d.id === assignDriverId);
    const selectedTruck = trucks.find(t => t.id === assignTruckId);

    if (selectedTender) {
      // 1. Crane requirement check
      const requiresCrane = selectedTender.needCrane || selectedTender.contentList?.includes('מנוף') || selectedTender.notes?.includes('מנוף');
      if (requiresCrane) {
        alerts.push({
          type: 'info',
          message: 'ההובלה המבוקשת סומנה כדורשת מנוף לפריקה/טעינה או שינוע קומות.'
        });

        if (selectedTruck && selectedTruck.type !== 'crane') {
          alerts.push({
            type: 'error',
            message: `שגיאת ציוד: המכרז דורש מנוף, אך המשאית שנבחרה (${selectedTruck.model}) אינה משאית מנוף!`
          });
        }
      }

      // 2. Weight limitation check
      const estWeight = selectedTender.shipmentType === 'apartment' ? 8 : selectedTender.shipmentType === 'office' ? 12 : 4;
      if (selectedTruck) {
        if (selectedTruck.type === 'flatbed' && estWeight > 12) {
          alerts.push({
            type: 'warning',
            message: `עומס יתר מתוכנן: משקל הציוד המשוער (${estWeight} טון) עלול לחרוג מהקיבולת הבטוחה של משאית משטח קלה.`
          });
        }
      }

      // 3. License Type Verification
      if (selectedDriver && selectedTruck) {
        // C1 up to 12 tons, C up to heavy, E semitrailer
        if (selectedTruck.type === 'semitrailer' && selectedDriver.licenseType !== 'E') {
          alerts.push({
            type: 'error',
            message: `חוסר התאמת רישיון: משאית סמיטריילר דורשת רישיון דרגה E, אך לנהג ${selectedDriver.name} יש רישיון ${selectedDriver.licenseType} בלבד.`
          });
        } else if (selectedTruck.type === 'crane' && selectedDriver.licenseType === 'C1') {
          alerts.push({
            type: 'error',
            message: `רישיון לא מתאים: משאית מנוף כבדה דורשת רישיון דרגה C לפחות. לנהג ${selectedDriver.name} יש רישיון C1 בלבד.`
          });
        }
      }

      // 4. Driver Status Notice
      if (selectedDriver) {
        if (selectedDriver.status === 'resting') {
          alerts.push({
            type: 'warning',
            message: `שים לב: הנהג ${selectedDriver.name} נמצא כעת במנוחה מוגדרת בחוק שעות עבודה ומנוחה.`
          });
        } else if (selectedDriver.status === 'on_duty') {
          alerts.push({
            type: 'warning',
            message: `שים לב: הנהג ${selectedDriver.name} כבר מועסק כעת בקו הובלה פעיל בשטח.`
          });
        }
      }

      // 5. Truck Status Notice
      if (selectedTruck) {
        if (selectedTruck.status === 'maintenance') {
          alerts.push({
            type: 'error',
            message: `רכב מושבת: המשאית הנבחרת נמצאת כעת בטיפול תקופתי במוסך ואינה כשירה לשינוע.`
          });
        }
      }
    }

    setAssignmentAlerts(alerts);
  }, [selectedTenderId, assignDriverId, assignTruckId, trucks, drivers, tenders]);

  // Execute smart allocation
  const handleExecuteAssignment = async () => {
    if (!selectedTenderId || !assignDriverId || !assignTruckId) {
      alert('נא לבחור מכרז, נהג ומשאית לצורך ביצוע השיוך');
      return;
    }

    const hasErrors = assignmentAlerts.some(a => a.type === 'error');
    if (hasErrors) {
      if (!window.confirm('המערכת מזהה שגיאות תפעוליות קריטיות (רישיון לא מתאים או משאית מושבתת). האם בכל זאת לאשר את השיוך בניגוד להנחיות הבטיחות?')) {
        return;
      }
    }

    const tender = tenders.find(t => t.id === selectedTenderId);
    const driver = drivers.find(d => d.id === assignDriverId);
    const truck = trucks.find(t => t.id === assignTruckId);

    try {
      // 1. Create a shipment automatically
      const trackingNumber = `TRK-FLEET-${Math.floor(1000 + Math.random() * 9000)}`;
      const shipmentPayload = {
        trackingNumber,
        customerName: tender.customerName,
        origin: tender.originCity,
        destination: tender.destinationCity,
        driverId: driver.id,
        driverName: driver.name,
        cargoType: tender.shipmentType === 'apartment' ? 'הובלת דירה' : tender.shipmentType === 'office' ? 'הובלת משרד' : 'מטען כללי',
        weight: tender.shipmentType === 'apartment' ? 8 : 12,
        status: 'pending',
        updatedAt: new Date().toLocaleString('he-IL')
      };

      await addDoc(collection(db, 'shipments'), shipmentPayload);

      // 2. Update Driver status
      const driverRef = doc(db, 'drivers', driver.id);
      await updateDoc(driverRef, {
        status: 'on_duty',
        vehicleNumber: `${truck.model} (${truck.licensePlate})`,
        currentCity: tender.originCity,
        destinationCity: tender.destinationCity,
        progress: 5
      });

      // 3. Update Truck status
      const truckRef = doc(db, 'trucks', truck.id);
      await updateDoc(truckRef, {
        status: 'in_transit'
      });

      // 4. Update Tender or remove it
      const tenderRef = doc(db, 'tenders', tender.id);
      await updateDoc(tenderRef, {
        isDispatched: true,
        assignedDriver: driver.name,
        assignedTruck: truck.model
      });

      onAddSystemLog('shipment', `שיוך משאבים חכם הושלם: משלוח ${trackingNumber} שוחרר לביצוע על ידי ${driver.name} עם המשאית ${truck.model}`);
      alert(`השיוך בוצע בהצלחה! משלוח ${trackingNumber} נוצר, והנהג והמשאית סומנו כעסוקים בשטח.`);

      // Reset assignment UI
      setSelectedTenderId('');
      setAssignDriverId('');
      setAssignTruckId('');
    } catch (e) {
      console.error(e);
      alert('חלה שגיאה בביצוע השיוך');
    }
  };

  const getTruckTypeLabel = (type: TruckItem['type']) => {
    switch (type) {
      case 'flatbed': return 'משאית משטח פתוח';
      case 'crane': return 'משאית עם מנוף כבד';
      case 'hydraulic': return 'משאית דופן הידראולית';
      case 'semitrailer': return 'סמיטריילר (גרור)';
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl" id="fleet-resource-root">
      
      {/* 1. FLEET & RESOURCE GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RIGHT: TRUCK FLEET LIST (7 COLS) */}
        <div className="lg:col-span-8 bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#ff7f00]" />
                ניהול צי משאיות וציוד כבד
              </h3>
              <p className="text-xs text-slate-400 mt-1">ניהול סטטוסים תפעוליים, מספרי רישוי ומועדי טסט קרובים לביקורת בטיחות</p>
            </div>
            
            <button
              onClick={() => setIsAddTruckOpen(true)}
              className="bg-[#ff7f00] hover:bg-[#e06f00] text-[#0a192f] font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              הוספת משאית לצי
            </button>
          </div>

          {/* TABLE OF TRUCKS */}
          {loading ? (
            <div className="py-12 text-center text-slate-400">טוען נתוני צי משאיות...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-extrabold bg-[#061121]/40">
                    <th className="p-3">סוג הרכב ודגם</th>
                    <th className="p-3">מספר רישוי</th>
                    <th className="p-3">סטטוס פעילות</th>
                    <th className="p-3">מועד טסט קרוב</th>
                    <th className="p-3">ביטוח חובה</th>
                    <th className="p-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {trucks.map((truck) => (
                    <tr key={truck.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-100">{truck.model}</div>
                        <span className="text-[10px] text-[#ff7f00] font-black bg-[#ff7f00]/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {getTruckTypeLabel(truck.type)} {truck.craneCapacity ? `(${truck.craneCapacity} טון)` : ''}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-300">{truck.licensePlate}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          truck.status === 'available' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : truck.status === 'in_transit'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {truck.status === 'available' ? '● פנוי' : truck.status === 'in_transit' ? '⚡ בדרך' : '⚙ בטיפול'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-bold ${
                          new Date(truck.testDueDate) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                            ? 'text-rose-400 animate-pulse'
                            : 'text-slate-300'
                        }`}>
                          {truck.testDueDate}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{truck.insuranceDueDate}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteTruck(truck.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded transition-colors"
                          title="הסר משאית"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LEFT: SMART ASSIGNMENT SYSTEM (4 COLS) */}
        <div className="lg:col-span-4 bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ff7f00]" />
              שיוך חכם של נהגים ומשאבים
            </h3>
            <p className="text-xs text-slate-400 mt-1">מערכת חכמה למניעת שיוך נהג או משאית שאינם תואמים למכרזי ההובלה הפעילים</p>
          </div>

          <div className="space-y-4 flex-1">
            
            {/* 1. Select active tender/leads */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">בחר מכרז הובלה פתוח *</label>
              <select
                value={selectedTenderId}
                onChange={(e) => {
                  setSelectedTenderId(e.target.value);
                  setAssignDriverId('');
                  setAssignTruckId('');
                }}
                className="w-full bg-[#061121] border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none"
              >
                <option value="">-- בחר מכרז הובלה --</option>
                {tenders.filter(t => !t.isDispatched).map((tender) => (
                  <option key={tender.id} value={tender.id}>
                    {tender.customerName} - {tender.originCity} אל {tender.destinationCity} ({tender.shipmentType === 'apartment' ? 'הובלת דירה' : 'הובלת משרד'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Driver */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">בחר נהג מוסמך *</label>
              <select
                value={assignDriverId}
                onChange={(e) => setAssignDriverId(e.target.value)}
                disabled={!selectedTenderId}
                className="w-full bg-[#061121] border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none disabled:opacity-50"
              >
                <option value="">-- בחר נהג להובלה --</option>
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.name} (רישיון {drv.licenseType} • סטטוס: {drv.status === 'available' ? 'פנוי' : 'עסוק/מנוחה'})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Select Truck */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">בחר משאית מתאימה מהצי *</label>
              <select
                value={assignTruckId}
                onChange={(e) => setAssignTruckId(e.target.value)}
                disabled={!selectedTenderId}
                className="w-full bg-[#061121] border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none disabled:opacity-50"
              >
                <option value="">-- בחר משאית מהצי --</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.model} ({truck.licensePlate} • {getTruckTypeLabel(truck.type)})
                  </option>
                ))}
              </select>
            </div>

            {/* AUTOMATIC SYSTEM ALERTS / PREVENTIONS */}
            {assignmentAlerts.length > 0 && (
              <div className="space-y-2 bg-[#061121] p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-black text-orange-400 block mb-1">התראות מערכת ובקרת בטיחות אוטומטית:</span>
                {assignmentAlerts.map((alert, idx) => (
                  <div key={idx} className={`text-[11px] font-medium flex items-start gap-1.5 p-1 rounded ${
                    alert.type === 'error' 
                      ? 'text-rose-400 bg-rose-500/5' 
                      : alert.type === 'warning'
                      ? 'text-amber-400 bg-amber-500/5'
                      : 'text-sky-400 bg-sky-500/5'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleExecuteAssignment}
            disabled={!selectedTenderId || !assignDriverId || !assignTruckId}
            className="w-full bg-[#ff7f00] hover:bg-[#e06f00] disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            בצע שיוך וייצר משלוח קו
          </button>
        </div>

      </section>

      {/* 2. DRIVER availability calendar & schedule shift manager */}
      <section className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#ff7f00]" />
            מעקב שגרת עבודה, משמרות וזמינות נהגים
          </h3>
          <p className="text-xs text-slate-400 mt-1">לוח שיבוץ משמרות שבועי דינמי עבור נהגי השטח. לחץ על המשמרת כדי לשנות את סוג הפעילות לנהג.</p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px] border border-slate-800 rounded-xl overflow-hidden bg-[#061121]/50">
            {/* Header days */}
            <div className="grid grid-cols-8 gap-1 border-b border-slate-800 bg-[#061121] p-3 text-xs font-black text-slate-300">
              <div className="p-1">שם הנהג מורשה</div>
              {DAYS_OF_WEEK.map((day, idx) => (
                <div key={idx} className="p-1 text-center">{day}</div>
              ))}
            </div>

            {/* Drivers list with editable schedules */}
            <div className="divide-y divide-slate-800">
              {drivers.map((driver) => (
                <div key={driver.id} className="grid grid-cols-8 gap-1 items-center p-3 hover:bg-slate-800/10 transition-colors">
                  
                  {/* Name column */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 bg-[#ff7f00]/10 text-[#ff7f00] rounded-full flex items-center justify-center font-extrabold text-[11px] border border-[#ff7f00]/20">
                      {driver.name.substring(0, 2)}
                    </div>
                    <div>
                      <strong className="text-slate-100 block">{driver.name}</strong>
                      <span className="text-[10px] text-slate-400">רישיון {driver.licenseType}</span>
                    </div>
                  </div>

                  {/* Day cells */}
                  {DAYS_OF_WEEK.map((_, dayIdx) => {
                    const currentShiftId = shifts[driver.id]?.[dayIdx] || 'morning';
                    const matchedType = SHIFT_TYPES.find(s => s.id === currentShiftId) || SHIFT_TYPES[0];
                    
                    return (
                      <div key={dayIdx} className="text-center p-1">
                        <select
                          value={currentShiftId}
                          onChange={(e) => handleUpdateShift(driver.id, dayIdx, e.target.value)}
                          className={`w-full text-[10px] font-bold py-1.5 px-2 rounded-lg border focus:outline-none bg-black/40 ${matchedType.bg}`}
                        >
                          {SHIFT_TYPES.map(type => (
                            <option key={type.id} value={type.id} className="bg-[#0e1e38] text-slate-200">
                              {type.label.split(' ')[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs font-bold pt-2">
          <span className="text-slate-400">מקרא משמרות:</span>
          {SHIFT_TYPES.map(type => (
            <div key={type.id} className={`px-2.5 py-1 rounded text-[10px] border ${type.bg}`}>
              {type.label}
            </div>
          ))}
        </div>
      </section>

      {/* 3. MODAL FOR ADDING NEW TRUCK */}
      {isAddTruckOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setIsAddTruckOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleCreateTruck} className="space-y-4 text-right">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="font-bold text-lg text-white">הוספת משאית חדשה לצי</h3>
                <p className="text-xs text-slate-400 mt-1">רישום רכב לוגיסטי חדש בפריסה הארצית</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">דגם הרכב ומפרט *</label>
                <input
                  type="text"
                  required
                  placeholder="לדוגמא: דאף XF 480 משאית סגורה"
                  value={newTruck.model}
                  onChange={(e) => setNewTruck({ ...newTruck, model: e.target.value })}
                  className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#ff7f00] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">מספר רישוי *</label>
                  <input
                    type="text"
                    required
                    placeholder="12-345-67"
                    value={newTruck.licensePlate}
                    onChange={(e) => setNewTruck({ ...newTruck, licensePlate: e.target.value })}
                    className="w-full bg-[#061121] border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">סוג משאית *</label>
                  <select
                    value={newTruck.type}
                    onChange={(e) => setNewTruck({ ...newTruck, type: e.target.value as TruckItem['type'] })}
                    className="w-full bg-[#061121] border border-slate-800 text-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none"
                  >
                    <option value="flatbed">משאית משטח פתוח</option>
                    <option value="crane">משאית מנוף כבד</option>
                    <option value="hydraulic">דופן הידראולית</option>
                    <option value="semitrailer">סמיטריילר</option>
                  </select>
                </div>
              </div>

              {newTruck.type === 'crane' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">כושר הרמה של המנוף (טון)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="לדוגמא: 10"
                    value={newTruck.craneCapacity}
                    onChange={(e) => setNewTruck({ ...newTruck, craneCapacity: Number(e.target.value) })}
                    className="w-full bg-[#061121] border border-slate-800 text-slate-100 rounded-xl px-4 py-2 text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">מועד טסט קרוב *</label>
                  <input
                    type="date"
                    required
                    value={newTruck.testDueDate}
                    onChange={(e) => setNewTruck({ ...newTruck, testDueDate: e.target.value })}
                    className="w-full bg-[#061121] border border-slate-800 text-slate-200 rounded-xl px-4 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">תפוגת ביטוח חובה *</label>
                  <input
                    type="date"
                    required
                    value={newTruck.insuranceDueDate}
                    onChange={(e) => setNewTruck({ ...newTruck, insuranceDueDate: e.target.value })}
                    className="w-full bg-[#061121] border border-slate-800 text-slate-200 rounded-xl px-4 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">סטטוס התחלתי</label>
                  <select
                    value={newTruck.status}
                    onChange={(e) => setNewTruck({ ...newTruck, status: e.target.value as TruckItem['status'] })}
                    className="w-full bg-[#061121] border border-slate-800 text-slate-300 rounded-xl px-4 py-2 text-xs"
                  >
                    <option value="available">פנוי</option>
                    <option value="in_transit">בדרך</option>
                    <option value="maintenance">בטיפול</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">נהג משויך קבוע</label>
                  <select
                    value={newTruck.assignedDriverId}
                    onChange={(e) => setNewTruck({ ...newTruck, assignedDriverId: e.target.value })}
                    className="w-full bg-[#061121] border border-slate-800 text-slate-300 rounded-xl px-4 py-2 text-xs"
                  >
                    <option value="">ללא נהג משויך</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#ff7f00] hover:bg-[#e06f00] text-white font-black text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Save className="w-4 h-4" />
                שמור משאית בצי הרכב
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
