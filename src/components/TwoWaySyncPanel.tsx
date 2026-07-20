import React, { useState } from 'react';
import { Database, RefreshCw, Layers, CheckCircle2, AlertCircle, HelpCircle, FileSpreadsheet, Send, ArrowRightLeft, Terminal, Copy } from 'lucide-react';
import { SyncStatus, ActivityLog } from '../types';

interface TwoWaySyncPanelProps {
  syncStatus: SyncStatus;
  logs: ActivityLog[];
  onTriggerSync: () => Promise<void>;
  googleScriptUrl: string;
}

export default function TwoWaySyncPanel({ syncStatus, logs, onTriggerSync, googleScriptUrl }: TwoWaySyncPanelProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const copyToClipboard = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const sampleAppsScriptCode = `/**
 * Google Apps Script Web App for Truk Deal il
 * Handles Two-Way Sync between Firestore and Google Sheets.
 */

const SHEET_NAME = "Truk_Deal_Leads";

function doGet(e) {
  const sheet = getOrCreateSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    data.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    const timestamp = new Date();
    
    // Add new lead row
    sheet.appendRow([
      postData.id || generateId(),
      postData.fullName || "",
      postData.phone || "",
      postData.email || "",
      postData.company || "",
      postData.notes || "",
      postData.status || "new",
      postData.source || "landing_page",
      timestamp
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Lead synced successfully to Google Sheets"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Initialize headers
    sheet.appendRow(["id", "fullName", "phone", "email", "company", "notes", "status", "source", "createdAt"]);
  }
  return sheet;
}

function generateId() {
  return "gas_" + Math.random().toString(36).substr(2, 9);
}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="two-way-sync-panel">
      {/* Sync Status Card & Action Gate */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#ff7f00]" />
              סנכרון דו-כיווני (Two-Way)
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
              ערוץ פעיל
            </span>
          </div>

          <div className="space-y-4">
            <div className="bg-[#061121] rounded-xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">סטטוס סנכרון נוכחי:</span>
                <span className={`text-xs font-semibold flex items-center gap-1 ${
                  syncStatus.status === 'success' ? 'text-emerald-400' :
                  syncStatus.status === 'syncing' ? 'text-orange-400' : 'text-slate-300'
                }`}>
                  {syncStatus.status === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff7f00]" />}
                  {syncStatus.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {syncStatus.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                  {syncStatus.status === 'idle' && 'ממתין'}
                  {syncStatus.status === 'syncing' && 'מסתנכרן...'}
                  {syncStatus.status === 'success' && 'הושלם בהצלחה'}
                  {syncStatus.status === 'error' && 'שגיאת התחברות'}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <span className="text-xs text-slate-400">זמן עדכון אחרון:</span>
                <span className="text-xs font-mono text-slate-300">{syncStatus.lastSyncTime || 'לא בוצע סנכרון עדיין'}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <span className="text-xs text-slate-400">סה"כ לידים מסונכרנים:</span>
                <span className="text-xs font-bold font-mono text-[#ff7f00]">{syncStatus.totalLeadsSynced}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-2">
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-[#ff7f00] font-bold">●</span>
                כל ליד שנקלט בדף הנחיתה נרשם מיידית ב-Firestore ונשלח ב-POST ל-Google Sheets.
              </p>
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-[#ff7f00] font-bold">●</span>
                שינוי סטטוס, הערות או שמות של לקוחות בתוך ה-CRM יסונכרנו אוטומטית לקובץ הגיליון שלכם.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onTriggerSync}
          disabled={syncStatus.status === 'syncing'}
          className={`w-full mt-6 flex items-center justify-center gap-2 font-bold text-xs py-3 rounded-xl border transition-all ${
            syncStatus.status === 'syncing'
              ? 'bg-[#0e1e38] text-slate-500 border-slate-800 cursor-not-allowed'
              : 'bg-[#ff7f00] hover:bg-[#e06f00] text-white border-[#ff7f00] shadow-lg shadow-[#ff7f00]/10 hover:shadow-[#ff7f00]/20'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
          סנכרן נתונים ידנית כעת
        </button>
      </div>

      {/* Integration Guide */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-md lg:col-span-2 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              הוראות חיבור ל-Google Sheets
            </h3>
            <span className="text-xs text-slate-400 font-semibold">אפליקציה בטוחה</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            כתובת ה-Apps Script הוגדרה במערכת ותקבל כל הרשמה חדשה בזמן אמת. להלן הכתובת הפעילה:
          </p>

          <div className="bg-[#061121] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 overflow-hidden">
            <span className="font-mono text-[10px] text-slate-400 truncate direction-ltr select-all block w-full">
              {googleScriptUrl}
            </span>
            <button
              onClick={() => copyToClipboard(googleScriptUrl, true)}
              className="flex-shrink-0 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="העתק כתובת קישור"
            >
              {copiedUrl ? <span className="text-[10px] text-emerald-400 px-1 font-bold">הועתק!</span> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expanded Terminal Panel with Code to paste */}
          <div className="bg-[#061121] rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-orange-400" /> קוד ה-Google Apps Script המיועד
              </span>
              <button
                onClick={() => copyToClipboard(sampleAppsScriptCode, false)}
                className="text-[11px] text-[#ff7f00] hover:underline flex items-center gap-1 font-semibold"
              >
                {copiedScript ? 'הועתק בהצלחה!' : 'העתק קוד גיליון'}
              </button>
            </div>
            <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto max-h-[140px] p-2 bg-[#030a14] rounded border border-slate-900/50 direction-ltr text-left">
              {sampleAppsScriptCode}
            </pre>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-[#061121] p-3 rounded-xl border border-slate-850/80 mt-4">
          <span className="font-bold text-[#ff7f00]">כיצד ליישם?</span> פתחו קובץ Google Sheets חדש ← לחצו על Extensions ← בחרו ב-Apps Script ← הדביקו את הקוד למעלה ← בצעו Deploy כ-Web App עם גישת הכלל (Anyone).
        </div>
      </div>

      {/* Sync Logging Console */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-md lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7f00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff7f00]"></span>
            </span>
            <h3 className="font-bold text-slate-200 text-sm">קונסולת סנכרון ואירועי לוגיסטיקה (Live Sync Console)</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Log Streamer v1.0.4</span>
        </div>

        <div className="bg-[#061121] rounded-xl border border-slate-850 p-4 font-mono text-xs text-slate-300 min-h-[180px] max-h-[260px] overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <div className="text-slate-500 py-12 text-center text-xs">
              אין אירועים רשומים כרגע בקונסולה. התחל ברישום ליד חדש או עדכון נתונים.
            </div>
          ) : (
            logs.map((log) => {
              let categoryColor = 'text-sky-400';
              if (log.category === 'sync') categoryColor = 'text-emerald-400';
              if (log.category === 'lead') categoryColor = 'text-orange-400';
              if (log.category === 'shipment') categoryColor = 'text-purple-400';
              if (log.category === 'driver') categoryColor = 'text-amber-400';

              return (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 py-1.5 border-b border-slate-900 last:border-0 hover:bg-[#081729] px-2 rounded">
                  <span className="text-slate-500 font-semibold shrink-0 text-[10px]">{log.timestamp}</span>
                  <span className={`font-bold shrink-0 text-[10px] uppercase tracking-wide ${categoryColor}`}>
                    [{log.category}]
                  </span>
                  <span className="text-slate-300 text-xs flex-1 truncate">{log.message}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded italic shrink-0">
                    פעיל: {log.user}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
