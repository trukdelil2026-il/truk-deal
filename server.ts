import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to allow base64 image transfers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API endpoint for AI Video/Photo Survey & volume estimation
  app.post("/api/ai/survey", async (req, res) => {
    try {
      const { images } = req.body;
      if (!images || (Array.isArray(images) && images.length === 0)) {
        return res.status(400).json({ error: "נא להעלות לפחות תמונה אחת לסריקה" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "מפתח ה-API של Gemini אינו מוגדר בשרת. נא להגדיר את GEMINI_API_KEY." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const imagesArray = Array.isArray(images) ? images : [images];
      const mediaParts = imagesArray.map((base64Str) => {
        let mimeType = "image/jpeg";
        let data = base64Str;
        const matches = base64Str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          data = matches[2];
        }
        return {
          inlineData: {
            mimeType,
            data
          }
        };
      });

      const textPart = {
        text: `אתה סוקר תכולת דירות מקצועי של חברת הובלות Truk Deal IL בישראל.
עליך לנתח את התמונות של החדרים או הציוד ולזהות רהיטים גדולים ומוצרי חשמל.
הערך את נפח התכולה הכולל במטרים מעוקבים (קוב), את כמות קרטוני האריזה המומלצת, והאם קיים צורך במנוף חיצוני במידה ויש ציוד חריג (כגון מקרר כפול, פסנתר, או ארונות ענקיים שלא ייכנסו במעלית).
ספק את התשובה בעברית מלאה ורשמית ובפורמט ה-JSON המדויק המבוקש בשדות הבאים.`
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [...mediaParts, textPart]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "רשימת פריטי ריהוט וחשמל שזוהו בתמונה בעברית (לדוגמה: ספה תלת מושבית, מקרר 4 דלתות, מכונת כביסה)."
              },
              estimatedVolume: {
                type: Type.NUMBER,
                description: "נפח כולל מוערך בקוב (מ\"ק)."
              },
              estimatedCartons: {
                type: Type.INTEGER,
                description: "מספר קרטונים וארגזים מומלץ למעבר."
              },
              needCrane: {
                type: Type.BOOLEAN,
                description: "האם מומלץ להשתמש במנוף חיצוני להובלה זו."
              },
              hasLivingRoom: {
                type: Type.BOOLEAN,
                description: "האם זוהתה מערכת ישיבה או סלון שלם."
              },
              hasFridge: {
                type: Type.BOOLEAN,
                description: "האם זוהה מקרר."
              },
              hasWashingMachine: {
                type: Type.BOOLEAN,
                description: "האם זוהתה מכונת כביסה או מייבש."
              },
              summaryHebrew: {
                type: Type.STRING,
                description: "סיכום מילולי קצר, מנומס ומקצועי בעברית המסביר ללקוח מה זוהה ומה המלצות ההובלה שלך."
              }
            },
            required: ["detectedItems", "estimatedVolume", "estimatedCartons", "needCrane", "hasLivingRoom", "hasFridge", "hasWashingMachine", "summaryHebrew"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("לא התקבלה תשובה משרת הבינה המלאכותית");
      }

      const surveyResult = JSON.parse(resultText);
      return res.json(surveyResult);

    } catch (error: any) {
      console.error("AI Video/Photo Survey Error:", error);
      return res.status(500).json({ 
        error: "שגיאה בניתוח החזותי: " + (error.message || error) 
      });
    }
  });

  // API endpoint for AI Pricing Optimization & Logistics Advice
  app.post("/api/ai/pricing-advice", async (req, res) => {
    try {
      const { distance, volume, needCrane, isRushHour, trafficLevel, origin, destination } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          advice: `[מצב הדגמה - מפתח API לא מוגדר] המלצה לוגיסטית להובלה מ-${origin || "מוצא"} ל-${destination || "יעד"} (${distance} ק"מ, ${volume} קוב): הובלה בנפח כזה דורשת משאית בינונית או כבדה. בשל שעות עומס מומלץ לתכנן יציאה מוקדמת ב-06:00 כדי להימנע מפקקים בכבישים מהירים, ולרתום משאית עם דופן הידראולית לצורך פריקה בטוחה.`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `אתה יועץ לוגיסטיקה בכיר ואנליסט תמחור של חברת ההובלות היוקרתית Truk Deal IL בישראל.
נתח את פרטי ההובלה הבאים והפק המלצה אופטימלית קצרה ומקצועית (3-4 שורות) בעברית מלאה:
- נקודת מוצא: ${origin || "לא מוגדר"}
- נקודת יעד: ${destination || "לא מוגדר"}
- מרחק: ${distance} ק"מ
- נפח תכולה: ${volume} מ"ק (קוב)
- צורך במנוף: ${needCrane ? "כן" : "לא"}
- שעות עומס בכבישים: ${isRushHour ? "כן" : "לא"}
- רמת פקקים צפויה: ${trafficLevel === "high" ? "גבוהה מאוד" : trafficLevel === "medium" ? "בינונית" : "נמוכה"}

הסבר בקצרה על כדאיות ההובלה, איזו משאית מומלצת מתוך הצי (מנוף, הידראולית, או סמיטריילר), והמלצה אופרטיבית קריטית לנסיעה בנתיב זה (לדוגמה מעבר דרך כביש 6 או כביש 2, הימנעות משעות ספציפיות, או היערכות לחניה). ספק את התשובה בעברית רהוטה ויוקרתית.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return res.json({ advice: response.text });
    } catch (err: any) {
      console.error("AI Pricing Advice Error:", err);
      return res.status(500).json({ error: "שגיאה בהפקת המלצה מה-AI" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", app: "Truk Deal IL" });
  });

  // Vite static/middleware binding
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
