import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client to prevent startup crashes if API key is not yet set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please configure it in your Secrets setting in Google AI Studio.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
 });
 
 // In-memory database of simulated transactions
interface MpesaTransaction {
  id: string;
  phoneNumber: string;
  amount: number;
  status: "pending" | "success" | "failed";
  createdAt: number;
  referenceCode: string;
  companyName: string;
}

const mpesaTransactions: Record<string, MpesaTransaction> = {};

// Generator for a highly realistic Tanzanian M-Pesa reference code (e.g. RJ4589XJ12)
function generateMpesaReferenceCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  let code = "";
  // 2 letters, 4 digits, 2 letters, 2 digits
  for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 4; i++) code += digits.charAt(Math.floor(Math.random() * digits.length));
  for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 2; i++) code += digits.charAt(Math.floor(Math.random() * digits.length));
  return code;
}

// API: Init M-Pesa STK Push
app.post("/api/pay/mpesa-push", (req, res) => {
  const { phoneNumber, amount, companyName } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: "Namba ya simu inahitajika / Phone number is required" });
    return;
  }

  // Basic validation for Tanzanian phone numbers: 10 digits starting with 07, 06, 08 or 12 digits (255...)
  const trimmed = phoneNumber.trim().replace(/[\s\-\+]/g, "");
  const isValidTanzanianNumber = 
    (trimmed.length === 10 && (trimmed.startsWith("07") || trimmed.startsWith("06") || trimmed.startsWith("08"))) ||
    (trimmed.length === 12 && trimmed.startsWith("255"));

  if (!isValidTanzanianNumber) {
    res.status(400).json({ error: "Namba isiyo sahihi. Tafadhali weka namba halali ya Tanzania ya Vodacom/M-Pesa. (Mfano: 0754112233)" });
    return;
  }

  const txId = "MP_TX_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const mpesaCode = generateMpesaReferenceCode();

  mpesaTransactions[txId] = {
    id: txId,
    phoneNumber: trimmed,
    amount: amount || 15000,
    status: "pending",
    createdAt: Date.now(),
    referenceCode: mpesaCode,
    companyName: companyName || "KaziTZ Employer Client",
  };

  res.json({
    txId,
    status: "pending",
    message: "Tumepeleka ombi gusa M-Pesa kwenye simu yako! Tafadhali subiri PIN ya malipo...",
    instructions: "Piga *150*00# kama huoni ujumbe au thibitisha muamala kwenye simu yako ya Vodacom sasa.",
  });
});

// API: Check status of M-Pesa pushing transaction (simulates transition after 6 seconds)
app.get("/api/pay/status/:txId", (req, res) => {
  const { txId } = req.params;
  const tx = mpesaTransactions[txId];

  if (!tx) {
    res.status(404).json({ error: "Muamala haujalipwa au umefutwa." });
    return;
  }

  // If transaction is pending, let's simulate that if 6 seconds have elapsed, it completes successfully.
  if (tx.status === "pending") {
    const elapsed = Date.now() - tx.createdAt;
    if (elapsed > 6000) {
      tx.status = "success";
    }
  }

  res.json({
    txId: tx.id,
    status: tx.status,
    phoneNumber: tx.phoneNumber,
    amount: tx.amount,
    referenceCode: tx.referenceCode,
    smsReceipt: `Taarifa ya M-Pesa: Thamani ya muamala ${tx.referenceCode} ya TZS ${tx.amount.toLocaleString()} imelipwa kwa KaziTZ Ltd. Tarehe ${new Date(tx.createdAt).toLocaleDateString("sw-TZ")}`,
  });
});

// API: Verify manually inserted reference codes
app.post("/api/pay/verify-reference", (req, res) => {
  const { referenceCode, companyName } = req.body;

  if (!referenceCode) {
    res.status(400).json({ error: "Msimbo/Reference Code ya M-Pesa inahitajika kuendelea." });
    return;
  }

  const cleanCode = referenceCode.trim().toUpperCase();

  // Validate standard M-Pesa reference formats in Tz (typically 10 uppercase alphanumeric characters)
  if (cleanCode.length < 6) {
    res.status(400).json({ error: "Msimbo huo si sahihi au ni mfupi mno. Hakikisha namba yako ina mfano wa 'RG4589XJ12'." });
    return;
  }

  // Simulate lookup wait and respond positively
  const simulatedAmount = 15000;
  res.json({
    success: true,
    referenceCode: cleanCode,
    amount: simulatedAmount,
    message: "Malipo yamepatikana dhabiti kwenye mfumo wa LIPA kwa M-Pesa!",
    receipt: {
      merchant: "KaziTZ Limited Payments",
      amount: simulatedAmount,
      date: new Date().toISOString(),
      reference: cleanCode,
      payer: companyName || "Mwajiri KaziTZ",
    }
  });
});

// WHATSAPP ALERTS MANAGEMENT SYSTEM

interface WhatsAppSubscription {
  id: string;
  phoneNumber: string;
  categories: string[];
  regions: string[];
  createdAt: number;
}

interface WhatsAppLog {
  id: string;
  timestamp: number;
  recipient: string;
  jobId?: string;
  messageType: "template" | "broadcast_alert";
  payload: any;
  status: "sent" | "delivered" | "failed";
  body: string;
}

// Pre-populate with high fidelity Tanzanian sandbox job-seeker subscribers
let whatsappSubscriptions: WhatsAppSubscription[] = [
  {
    id: "sub_1",
    phoneNumber: "255754890123",
    categories: ["Teknolojia", "Utawala", "NGO & Maendeleo"],
    regions: ["Dar es Salaam", "Kazi za Mtandaoni (Remote)"],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3 // 3 days ago
  },
  {
    id: "sub_2",
    phoneNumber: "255768341256",
    categories: ["Elimu & Mafunzo", "Afya & Matibabu"],
    regions: ["Dodoma", "Arusha"],
    createdAt: Date.now() - 1000 * 60 * 60 * 12 // 12 hours ago
  },
  {
    id: "sub_3",
    phoneNumber: "255655410940",
    categories: ["Afya & Matibabu", "Mauzo & Masoko"],
    regions: ["Mwanza", "Dar es Salaam"],
    createdAt: Date.now() - 1000 * 60 * 60 * 48 // 2 days ago
  },
  {
    id: "sub_4",
    phoneNumber: "255784903322",
    categories: ["Teknolojia", "Uhandisi & Ujenzi", "Kilimo & Ufugaji"],
    regions: ["Dar es Salaam", "Kazi za Mtandaoni (Remote)", "Mbeya"],
    createdAt: Date.now() - 1000 * 60 * 30 // 30 mins ago
  },
  {
    id: "sub_5",
    phoneNumber: "255712555777",
    categories: ["Utawala", "NGO & Maendeleo", "Nyinginezo"],
    regions: ["Dodoma", "Dar es Salaam", "Arusha"],
    createdAt: Date.now() - 1000 * 60 * 5 // 5 mins ago
  }
];

let whatsappSendLogs: WhatsAppLog[] = [
  {
    id: "log_init_1",
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    recipient: "255754890123",
    messageType: "template",
    payload: {
      messaging_product: "whatsapp",
      to: "255754890123",
      type: "template",
      template: { name: "welcome_job_alerts_tz_v1", language: { code: "sw" } }
    },
    status: "delivered",
    body: "Habari! Usajili wako wa kazi mpya KaziTZ umezinduliwa kikamilifu! Utapokea fursa za 'Teknolojia', 'Utawala' na 'NGO & Maendeleo' zilizopo 'Dar es Salaam' pindi tu waajiri wanapoweka!"
  }
];

// Helper to normalize Tanzanian phone numbers to Meta WhatsApp Cloud API format (255xxxyyyyyy)
function normalizeTanzanianWhatsAppNumber(phone: string): string {
  let clean = phone.trim().replace(/[\s\-\+]/g, "");
  if (clean.startsWith("0")) {
    clean = "255" + clean.substring(1);
  } else if (!clean.startsWith("255") && clean.length === 9) {
    clean = "255" + clean;
  }
  return clean;
}

// API: Get List of Active WhatsApp Subscribers
app.get("/api/whatsapp/subscriptions", (req, res) => {
  res.json(whatsappSubscriptions);
});

// API: Subscribe for alerts
app.post("/api/whatsapp/subscribe", (req, res) => {
  const { phoneNumber, categories, regions } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: "Namba ya Simu inahitajika / WhatsApp phone number is required" });
    return;
  }

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    res.status(400).json({ error: "Tafadhali chagua angalau kundi moja la kazi / Choose at least one job category" });
    return;
  }

  if (!regions || !Array.isArray(regions) || regions.length === 0) {
    res.status(400).json({ error: "Tafadhali chagua mkoa mmoja / Choose at least one region" });
    return;
  }

  const normalizedPhone = normalizeTanzanianWhatsAppNumber(phoneNumber);
  
  // High level validation
  if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith("255")) {
    res.status(400).json({ error: "Namba unayoingiza sio sahihi. Tafadhali weka namba sahihi ya WhatsApp (Mfano: 0754123456 au 255754123456)" });
    return;
  }

  // Check if already subscribed
  const existingIndex = whatsappSubscriptions.findIndex(sub => sub.phoneNumber === normalizedPhone);
  if (existingIndex > -1) {
    // Update interests
    whatsappSubscriptions[existingIndex].categories = categories;
    whatsappSubscriptions[existingIndex].regions = regions;
    
    // Add transaction log
    const logId = "wl_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    whatsappSendLogs.unshift({
      id: logId,
      timestamp: Date.now(),
      recipient: normalizedPhone,
      messageType: "template",
      payload: {
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "text",
        text: { body: `Habari, wasifu wako wa taarifa za WhatsApp umeratibiwa upya! Mapendeleo mapya: ${categories.join(", ")} nchini ${regions.join(", ")}.` }
      },
      status: "delivered",
      body: `Taarifa ya KaziTZ: Mapendeleo yako ya alerts yamesasishwa salama. Utapata taarifa za ${categories.slice(0, 3).join(", ")} kwa mikoa ya ${regions.slice(0, 3).join(", ")}.`
    });

    res.json({
      success: true,
      message: "Wasifu wa WhatsApp umesasishwa kwa mafanikio! Tumetuma muhtasari sasa hivi.",
      subscription: whatsappSubscriptions[existingIndex]
    });
    return;
  }

  // Register new subscription
  const newSub: WhatsAppSubscription = {
    id: "sub_" + Date.now(),
    phoneNumber: normalizedPhone,
    categories,
    regions,
    createdAt: Date.now()
  };

  whatsappSubscriptions.unshift(newSub);

  // Send onboarding template message trigger logger
  const logId = "wl_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  whatsappSendLogs.unshift({
    id: logId,
    timestamp: Date.now(),
    recipient: normalizedPhone,
    messageType: "template",
    payload: {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: "welcome_job_alerts_tz_v1",
        language: { code: "sw" },
        components: [
          { type: "header", parameters: [{ type: "text", text: "KaziTZ Alerts" }] },
          { type: "body", parameters: [
            { type: "text", text: categories.slice(0, 2).join(", ") },
            { type: "text", text: regions.slice(0, 2).join(", ") }
          ]}
        ]
      }
    },
    status: "delivered",
    body: `🟢 USALAMA KAZITZ: Namba yako imesajiliwa kikamilifu kwenye WhatsApp Job Alerts! Utakuwa wa kwanza kupata taarifa mpya za ${categories.join(", ")} katika mikoa ya ${regions.join(", ")}. Kupata msaada jibu 'USAIDILE' hapa au tembelea kazi.tz`
  });

  res.json({
    success: true,
    message: "Usajili umekamilika vizuri! Angalia simulator ya ujumbe kuona risiti iliyotumwa kwenda WhatsApp yako.",
    subscription: newSub
  });
});

// API: Unsubscribe
app.post("/api/whatsapp/unsubscribe", (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ error: "Namba ya simu inahitajika kuondoa usajili." });
    return;
  }

  const normalized = normalizeTanzanianWhatsAppNumber(phoneNumber);
  const initialLength = whatsappSubscriptions.length;
  whatsappSubscriptions = whatsappSubscriptions.filter(sub => sub.phoneNumber !== normalized);

  if (whatsappSubscriptions.length < initialLength) {
    const logId = "wl_" + Date.now();
    whatsappSendLogs.unshift({
      id: logId,
      timestamp: Date.now(),
      recipient: normalized,
      messageType: "template",
      payload: { action: "unsubscribe", status: "success" },
      status: "delivered",
      body: "Taarifa ya KaziTZ: Namba yako imeondolewa kikamilifu kutoka mfumo wa kupokea kazi za WhatsApp. Karibu tena wakati wowote."
    });
    res.json({ success: true, message: "Umeondolewa kwenye mfumo wa alerts kikamilifu!" });
  } else {
    res.status(404).json({ error: "Namba hii haijasajiliwa kwenye mfumo wa alerts." });
  }
});

// API: Broadcast Job Posting alerts to matching subscribers
app.post("/api/whatsapp/broadcast", (req, res) => {
  const { jobId, jobTitle, company, category, region, salary, customMessage } = req.body;

  if (!jobTitle || !category || !region) {
    res.status(400).json({ error: "Maelezo ya kazi yana upungufu (Title, Category, Region vinahitajika)." });
    return;
  }

  // Find all matching subscribers based on category OR region matches
  const targetSubscribers = whatsappSubscriptions.filter(sub => {
    const categoryMatches = sub.categories.includes(category) || sub.categories.includes("All") || sub.categories.some(c => c.toLowerCase() === "nyinginezo");
    const regionMatches = sub.regions.includes(region) || sub.regions.includes("All") || sub.regions.some(r => r.toLowerCase().includes("remote") || r.toLowerCase().includes("tanzania nzima"));
    return categoryMatches || regionMatches;
  });

  if (targetSubscribers.length === 0) {
    res.json({
      success: true,
      broadcastCount: 0,
      message: "Hakuna watumiaji waliopakana na kundi au mkoa huu kwa sasa."
    });
    return;
  }

  // Generate logs for each matching subscriber (simulating SMS/WhatsApp Cloud API Dispatch)
  const newlyDispatched: WhatsAppLog[] = [];
  const salaryStr = salary ? `Mshahara: ${salary}` : "Mshahara: Siri ya Mwajiri / Maelezo kwenye mtandao";
  
  targetSubscribers.forEach(sub => {
    const logId = "wl_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const bodyContent = customMessage || 
      `🚨 FURSA MPYA IA (WhatsApp Alert) 🚨\n\n📌 *Kazi:* ${jobTitle}\n🏢 *Kampuni:* ${company || "Mwajiri KaziTZ"}\n📍 *Mahali:* ${region}\n💼 *Kundi:* ${category}\n💰 *${salaryStr}*\n\nBonyeza link chini kufanya application sasa au kupata maelezo:\n🔗 https://kazi.tz/jobs/${jobId || "j_" + Date.now()}\n\n_KaziTZ Automated Notifications - Vodacom/Airtel/Tigo TZ Network_`;

    const singleMetaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: sub.phoneNumber,
      type: "interactive",
      interactive: {
        type: "button",
        header: { type: "text", text: "KaziTZ WhatsApp Dispatch" },
        body: { text: bodyContent },
        footer: { text: "Unsubscribe? Reply UNSUB" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "apply_now", title: "Omba Kazi Sasa" } },
            { type: "reply", reply: { id: "view_details", title: "Angalia Wasifu" } }
          ]
        }
      }
    };

    const newLog: WhatsAppLog = {
      id: logId,
      timestamp: Date.now(),
      recipient: sub.phoneNumber,
      jobId: jobId || "j_" + Date.now(),
      messageType: "broadcast_alert",
      payload: singleMetaPayload,
      status: "delivered",
      body: bodyContent
    };

    whatsappSendLogs.unshift(newLog);
    newlyDispatched.push(newLog);
  });

  res.json({
    success: true,
    broadcastCount: targetSubscribers.length,
    message: `Matangazo ${targetSubscribers.length} ya WhatsApp ya KaziTZ yameratibiwa na kusafirishwa dhabiti kwenye simu za wasajiri walio Dar/Mikoani!`,
    sentLogs: newlyDispatched
  });
});

// API: Get Live WhatsApp Alerts Logs (sorted by newest)
app.get("/api/whatsapp/logs", (req, res) => {
  res.json(whatsappSendLogs);
});

// API: Check if AI capability is configured
app.get("/api/ai/status", (req, res) => {
  const isAvailable = !!process.env.GEMINI_API_KEY;
  res.json({ isAvailable });
});

// API: AI Job Description Generator
app.post("/api/generate-description", async (req, res) => {
  try {
    const { title, company, category, region, keyDetails, language } = req.body;
    
    if (!title || !category || !region) {
      res.status(400).json({ error: "Missing required fields (title, category, region)" });
      return;
    }

    const ai = getGeminiClient();
    
    const prompt = `You are a professional HR assistant and recruiting specialist in Tanzania.
Create a comprehensive, visually stunning, professional job description in markdown format for the following position:
- Job Title: ${title}
- Company: ${company || "A leading company/institution"}
- Category: ${category}
- Region/Location/Mkoa: ${region}
- Specific requirements/responsibilities mentioned: ${keyDetails || "Provide a generally comprehensive overview for this standard role"}
- Language Requirement: ${language || "bilingual"} (If swahili: write in prime professional Swahili; if english: write in perfect formal English; if bilingual: write headings in both and descriptions elegantly paired)

Structure the response beautifully, incorporating:
1. Kuhusu Mwajiri / About the Employer (professional introduction)
2. Maelezo ya Kazi / Position Overview (summarized role context)
3. Wajibu na Majukumu / Key Responsibilities (clear, actionable bullet points)
4. Sifa na Vigezo / Requirements & Qualifications (education, necessary experience, native skills)
5. Faida na Marupurupu / Benefits & Perks (competitive advantages of joining)

Write in a compelling, authoritative, yet inviting tone suitable for top-performing Tanzanian professionals. Always format using structured markdown with clear headings (##) and neat bullet points (* or -).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const generatedText = response.text || "Failed to generate description text.";
    res.json({ description: generatedText });
  } catch (error: any) {
    console.error("Gemini description generation error:", error);
    res.status(500).json({ 
      error: error.message || "Something went wrong during description generation.",
      needsApiKey: !process.env.GEMINI_API_KEY
    });
  }
});

// API: AI Applicant Fit Scorer (Grading)
app.post("/api/grade-applicant", async (req, res) => {
  try {
    const { jobTitle, jobDescription, applicantName, applicantProfile } = req.body;
    
    if (!jobTitle || !applicantName || !applicantProfile) {
      res.status(400).json({ error: "Missing candidate profile or job title info" });
      return;
    }

    const ai = getGeminiClient();
    
    const prompt = `You are an advanced AI Recruitment Auditor operating in East Africa.
Compare the following Job description/title with the Candidate's profile details. Evaluate how suitable they are for this role.

Job Title: ${jobTitle}
Job Description Overview: ${jobDescription || "Standard " + jobTitle + " role"}

Candidate Name: ${applicantName}
Candidate Profile details (Skills, Education, Experience):
${applicantProfile}

Provide an objective assessment in JSON format with exactly the following fields:
1. score: an integer between 0 and 100 representing their suitability rating.
2. summary: a concise, professional 2-3 sentence paragraph explaining the evaluation in a helpful manner.
3. matchingPoints: a list of up to 4 strong matches (e.g. specific skills, certifications, or location matches).
4. gaps: a list of up to 3 gaps or areas of improvement (e.g. missing years of experience, specific skills).

Keep the review extremely realistic and constructive.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "Matching score out of 100",
            },
            summary: {
              type: Type.STRING,
              description: "A friendly and professional explanation of the score",
            },
            matchingPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Matching highlights",
            },
            gaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Vulnerabilities or missing parameters",
            },
          },
          required: ["score", "summary", "matchingPoints", "gaps"],
        },
      },
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText);
    res.json(resultJson);
  } catch (error: any) {
    console.error("Gemini applicant grading error:", error);
    res.status(500).json({
      error: error.message || "Failed to analyze candidate profile.",
      score: 70, // Fallback score
      summary: "Evaluated offline. Full AI compatibility requires an active Gemini API key in Secrets.",
      matchingPoints: ["Matches standard criteria"],
      gaps: ["Advanced AI evaluation offline"],
      needsApiKey: !process.env.GEMINI_API_KEY
    });
  }
});

// API: AI-Powered Real-time Web & LinkedIn Job Search (Google Search Grounding)
app.post("/api/jobs/web-search", async (req, res) => {
  try {
    const { keyword, category, region } = req.body;
    
    // Construct search term for Tanzania vacancies
    let searchQuery = "latest active job openings vacancies Tanzania";
    if (keyword && keyword.trim().length > 0) searchQuery += ` "${keyword}"`;
    if (category && category !== "all") searchQuery += ` "${category}"`;
    if (region && region !== "all") searchQuery += ` "${region}"`;

    let realJobs: any[] = [];
    let isGroundingUsed = false;

    // Check if Gemini API Key is available
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      
      const prompt = `Search the web for the absolute latest, active real-world job vacancies and postings in Tanzania matching: ${searchQuery}.
Focus on actual job posts published on LinkedIn, BrighterMonday, ZoomTanzania, company websites, or public boards in Tanzania.
Ensure these jobs are actually active and open for applications.
Return a list of exactly 5 to 7 live openings.
For each job, extract the actual apply/reference URL (such as a link to view or apply on LinkedIn, BrighterMonday, company career page). This URL MUST be stored inside the "applyUrl" field.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              jobs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    company: { type: Type.STRING },
                    region: { type: Type.STRING },
                    description: { type: Type.STRING, description: "A detailed summary of responsibilities, requirements, and information from the job posting in elegant Swahili or English." },
                    applyUrl: { type: Type.STRING, description: "Direct valid link to apply, e.g. a LinkedIn / BrighterMonday job post or company portal link" },
                    source: { type: Type.STRING, description: "The name of the website this was found on (e.g. LinkedIn, BrighterMonday, ZoomTanzania, UN Careers)" },
                    datePosted: { type: Type.STRING, description: "e.g., 2 days ago, June 14 2026, etc." }
                  },
                  required: ["title", "company", "region", "description", "applyUrl", "source"],
                }
              }
            },
            required: ["jobs"]
          }
        }
      });

      const textResult = response.text || "{}";
      const parsed = JSON.parse(textResult);
      if (parsed && Array.isArray(parsed.jobs)) {
        realJobs = parsed.jobs;
        isGroundingUsed = true;
      }
    }

    // Fallback/Mock listings if no API key or no results found
    if (realJobs.length === 0) {
      realJobs = [
        {
          title: "Senior Software Engineer (FinTech & Mobile Money)",
          company: "Vodacom Tanzania Plc",
          region: "Dar es Salaam",
          description: "Nafasi ya uandishi wa mifumo ya miamala ya M-Pesa. Inahitaji uzoefu wa miaka 5, maarifa ya Node.js, Spring Boot na Cloud Infrastructure. Hii ni nafasi ya kudumu katika makao makuu Dar es Salaam.",
          applyUrl: "https://www.linkedin.com/company/vodacom-tanzania/jobs/",
          source: "LinkedIn",
          datePosted: "Leo (Simulated)"
        },
        {
          title: "Agricultural Extension Officer & Agronomist",
          company: "One Acre Fund Tanzania",
          region: "Iringa",
          description: "Kusaidia wakulima wadogo wadogo kuongeza tija kwenye kilimo cha mahindi na alizeti. Inahitaji stashahada/shahada ya kilimo kutoka SUA au chuo chochote kinachotambulika na Serikali.",
          applyUrl: "https://oneacrefund.org/work-with-us/job-openings/",
          source: "Company Website",
          datePosted: "Masaa 12 yaliyopita (Simulated)"
        },
        {
          title: "Graduate Management Trainee (Finance & Retail)",
          company: "NMB Bank Plc",
          region: "Dodoma",
          description: "Mpango maalum kwa wahitimu wapya wa vyuo vikuu wenye ufaulu wa juu katika fani za Uhasibu, Uchumi na Usimamizi wa Biashara. Mafunzo yatatolewa Dodoma na mikoa mingine kote nchini.",
          applyUrl: "https://www.nmbbank.co.tz/careers",
          source: "NMB Portal",
          datePosted: "Siku 2 zilizopita (Simulated)"
        },
        {
          title: "Senior NGO Program Coordinator",
          company: "Pathfinder International",
          region: "Tabora",
          description: "Kusimamia miradi ya afya ya jamii na usafi wa mazingira vijijini. Uzoefu wa miaka 3 kwenye usimamizi wa miradi ya wafadhili (USAID/Global Fund) unahitajika sana.",
          applyUrl: "https://www.brightermonday.co.tz/jobs",
          source: "BrighterMonday",
          datePosted: "Siku 3 zilizopita (Simulated)"
        },
        {
          title: "Node.js Backend Developer",
          company: "Halotel Tanzania",
          region: "Dar es Salaam",
          description: "Kusimamai na kuboresha mifumo ya mawasiliano na API za Halopesa. Maarifa makubwa ya Javascript/Typescript, MySQL, Redis, na Linux server management ni lazima.",
          applyUrl: "https://halotel.co.tz/",
          source: "Company Portal",
          datePosted: "Siku 4 zilizopita (Simulated)"
        }
      ];
    }

    res.json({
      success: true,
      query: searchQuery,
      groundingUsed: isGroundingUsed,
      jobs: realJobs
    });

  } catch (error: any) {
    console.error("Web Search Grounding job search error:", error);
    res.status(500).json({
      error: error.message || "Failed to search jobs using Gemini Search Grounding",
      jobs: []
    });
  }
});

// Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback route
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KaziTZ Server running at http://0.0.0.0:${PORT} in env: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
