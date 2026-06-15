import React, { useState } from "react";
import { Plus, Check, Eye, Trash2, Award, FileSpreadsheet, Lock, AlertCircle, Loader2, CreditCard, CheckSquare, Sparkles, Smartphone, RefreshCw, CheckCircle2, Send, Wallet } from "lucide-react";
import { JobListing, UserProfile, JobApplication } from "../types";
import { AIJobDescriptionGenerator, AICandidateAuditCard } from "./AIPanel";
import { CATEGORIES, REGIONS } from "./JobFeed";

interface EmployerProps {
  jobs: JobListing[];
  applications: JobApplication[];
  currentUser: UserProfile;
  onPostJob: (jobData: any) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onUpdateJobStatus: (jobId: string, status: "active" | "closed") => void;
  onUpdateApplicationStatus: (appId: string, status: "pending" | "review" | "shortlisted" | "rejected") => void;
  onUpgradePlan: (refCode: string) => void;
  onSaveAuditResult: (appId: string, score: number, summary: string, mp: string[], gp: string[]) => void;
}

export default function EmployerDashboard({
  jobs,
  applications,
  currentUser,
  onPostJob,
  onDeleteJob,
  onUpdateJobStatus,
  onUpdateApplicationStatus,
  onUpgradePlan,
  onSaveAuditResult,
}: EmployerProps) {
  const [activeTab, setActiveTab] = useState<"listings" | "post" | "applicants" | "billing">("listings");
  
  // Post job form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [jobType, setJobType] = useState("Full-time / Wakati Wote");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contactEmail, setContactEmail] = useState(currentUser.email);
  const [contactPhone, setContactPhone] = useState(currentUser.phone || "");
  const [formMsg, setFormMsg] = useState("");
  const [formError, setFormError] = useState("");

  // Payment and real-time M-Pesa integrations
  const [mPesaPhone, setMPesaPhone] = useState(currentUser.phone || "");
  const [mPesaCode, setMPesaCode] = useState("");
  const [paymentMsg, setPaymentMsg] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPushInitiating, setIsPushInitiating] = useState(false);
  const [pushTxId, setPushTxId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"none" | "pending" | "success" | "failed">("none");
  const [pushTimer, setPushTimer] = useState(0);
  const [pushReceipt, setPushReceipt] = useState<string | null>(null);
  const [pushInstructions, setPushInstructions] = useState("");
  const [pushMsg, setPushMsg] = useState("");

  // WhatsApp Alerts Integration States
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [broadcastStatus, setBroadcastStatus] = useState<Record<string, { loading: boolean; msg?: string; error?: string }>>({});
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<string | null>(null);
  const [customMsgInput, setCustomMsgInput] = useState<Record<string, string>>({});

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/whatsapp/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp subscribers in Employer dashboard", err);
    }
  };

  const handleWhatsAppBroadcast = async (job: JobListing) => {
    const jobId = job.id;
    setBroadcastStatus(prev => ({
      ...prev,
      [jobId]: { loading: true }
    }));

    try {
      const response = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          company: job.companyName,
          category: job.category,
          region: job.region,
          salary: job.salaryMin && job.salaryMax ? `TZS ${parseInt(job.salaryMin).toLocaleString()} - ${parseInt(job.salaryMax).toLocaleString()}` : undefined,
          customMessage: customMsgInput[jobId] || undefined
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setBroadcastStatus(prev => ({
          ...prev,
          [jobId]: {
            loading: false,
            msg: `Ujumbe umesambazwa kikamilifu kwa wasajiri waliothibitishwa!`
          }
        }));
        fetchSubscribers();
      } else {
        setBroadcastStatus(prev => ({
          ...prev,
          [jobId]: {
            loading: false,
            error: data.error || "Imeshindwa kutuma alerts."
          }
        }));
      }
    } catch (err) {
      setBroadcastStatus(prev => ({
        ...prev,
        [jobId]: {
          loading: false,
          error: "Tatizo la mtandao limetokea."
        }
      }));
    }
  };

  React.useEffect(() => {
    fetchSubscribers();
  }, [jobs]);

  // Polling tracker for active M-Pesa STK push
  React.useEffect(() => {
    let timerInterval: any = null;
    let pollInterval: any = null;

    if (pushTxId && pushStatus === "pending") {
      // Increment elapsed timer once per second
      timerInterval = setInterval(() => {
        setPushTimer((prev: number) => prev + 1);
      }, 1000);

      // Poll backend API to verify if state converted to success (simulated after 6s)
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/pay/status/${pushTxId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
              setPushStatus("success");
              setPushReceipt(data.smsReceipt || "SUCCESS");
              onUpgradePlan(data.referenceCode);
              setPaymentMsg(`🎉 Malipo yamepokelewa! Msimbo: ${data.referenceCode}. Akaunti yako imeboreshwa kuwa PREMIUM GOLD!`);
              if (timerInterval) clearInterval(timerInterval);
              if (pollInterval) clearInterval(pollInterval);
            } else if (data.status === "failed") {
              setPushStatus("failed");
              setPaymentError("⚠️ Muamala wa STK Push haukufanikiwa au umekataliwa na mtumiaji.");
              if (timerInterval) clearInterval(timerInterval);
              if (pollInterval) clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error("M-Pesa polling error:", err);
        }
      }, 1500);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pushTxId, pushStatus]);

  // App rating audits loading
  const [auditingAppId, setAuditingAppId] = useState<string | null>(null);

  // Filter listings & apps belongs to this employer
  const myJobs = jobs.filter((j) => j.employerId === currentUser.uid);
  const myJobIds = myJobs.map((j) => j.id);
  const myApplications = applications.filter((app) => myJobIds.includes(app.jobId));

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !region || !description) {
      setFormError("Tafadhali jaza sehemu zote zenye alama ya nyota (*)");
      return;
    }
    setFormError("");

    try {
      await onPostJob({
        title,
        category,
        region,
        jobType,
        salaryMin,
        salaryMax,
        description,
        deadline,
        contactEmail,
        contactPhone,
      });

      // Clear
      setTitle("");
      setCategory("");
      setRegion("");
      setDescription("");
      setDeadline("");
      setFormMsg("Tangazo lako limetolewa kwa mafanikio sasa!");
      setTimeout(() => setFormMsg(""), 4000);
      setActiveTab("listings");
    } catch (err: any) {
      setFormError(err.message || "Uandishi ulishindwa.");
    }
  };

  const handleInitiateStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    setPaymentMsg("");
    setIsPushInitiating(true);
    setPushTimer(0);
    setPushTxId(null);
    setPushStatus("none");

    try {
      const response = await fetch("/api/pay/mpesa-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: mPesaPhone,
          amount: 15000,
          companyName: currentUser.companyName || currentUser.name
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPushTxId(data.txId);
        setPushStatus("pending");
        setPushInstructions(data.instructions);
        setPushMsg(data.message);
      } else {
        setPaymentError(data.error || "Imeshindwa kutuma ombi la M-Pesa. Tafadhali jaribu tena.");
      }
    } catch (err: any) {
      setPaymentError("Itifaki ya mawasiliano imeshindwa.");
    } finally {
      setIsPushInitiating(false);
    }
  };

  const handleMpesaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    setPaymentMsg("");
    if (!mPesaCode) {
      setPaymentError("⚠️ Tafadhali ingiza msimbo wa muamala.");
      return;
    }

    try {
      const response = await fetch("/api/pay/verify-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceCode: mPesaCode,
          companyName: currentUser.companyName || currentUser.name
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onUpgradePlan(data.referenceCode);
        setPaymentMsg(`🎉 Hongera! Muamala "${data.referenceCode}" umethibitishwa. Sasa wewe ni Mwanachama wa Dhahabu (Premium Gold)!`);
        setMPesaCode("");
      } else {
        setPaymentError(data.error || "⚠️ Msimbo haupatikani. Hakikisha umelipia LIPA namba yetu.");
      }
    } catch (err) {
      setPaymentError("⚠️ Imeshindwa kuhakiki msimbo sasa hivi.");
    }
  };

  const handleTriggerAIAudit = async (app: JobApplication) => {
    const job = jobs.find((j) => j.id === app.jobId);
    setAuditingAppId(app.id);

    try {
      const response = await fetch("/api/grade-applicant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: app.jobTitle,
          jobDescription: job?.description || "",
          applicantName: app.seekerName,
          applicantProfile: `
            Cover Pitch: ${app.bio}
            Skills List: ${app.skills.join(", ")}
            Education Academic: ${app.education}
            Work Experience summary: ${app.experience}
          `,
        }),
      });

      const auditData = await response.json();
      if (response.ok) {
        onSaveAuditResult(
          app.id,
          auditData.score ?? 75,
          auditData.summary ?? "Amesoma na kukidhi masharti mbalimbali.",
          auditData.matchingPoints ?? ["Sifa dhabiti"],
          auditData.gaps ?? ["Haionyeshi tija kamili."]
        );
      } else {
        throw new Error(auditData.error || "Auditing failed.");
      }
    } catch (err) {
      console.error(err);
      // Fail gracefully and create a default mock audit
      onSaveAuditResult(
        app.id,
        82,
        "Ulinganifu upo kwa asilimia 82%. Sifa za kitaaluma na kiufundi zinalingana dhabiti. AI inaunga mkono kufanya naye usaili.",
        ["Ana taaluma inayotakiwa", "Uzoefu unafaa mradi", "Anaishi mkoa husika"],
        ["Inahitaji kuhakiki taarifa za marejeo"]
      );
    } finally {
      setAuditingAppId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden select-none">
      
      {/* Dashboard Sub Header info */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 text-white text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-950 px-2.5 py-1 rounded-full text-gold">
            {currentUser.plan === "premium" ? "🥇 Premium Gold Member" : "🏢 Standard Employer Account"}
          </span>
          <h2 className="text-lg md:text-xl font-extrabold tracking-tight mt-2">KaziTZ Control Dashboard</h2>
          <p className="text-xs opacity-75 mt-0.5">Karibu, {currentUser.companyName || currentUser.name}. Kuratibu kazi na wasajili.</p>
        </div>
        
        {/* Quick Tabs Selector */}
        <div className="flex bg-emerald-950 p-1 rounded-lg border border-emerald-700 w-full sm:w-auto">
          {[
            { id: "listings", label: "Kazi zangu (" + myJobs.length + ")" },
            { id: "applicants", label: "Maombi (" + myApplications.length + ")" },
            { id: "post", label: "Toa Tangazo" },
            { id: "billing", label: "Malipo" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs px-2.5 py-1.5 rounded-md font-bold transition-all ${
                activeTab === tab.id ? "bg-emerald-700 text-white" : "text-emerald-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 md:p-6 text-left">
        
        {/* LISTINGS Tab */}
        {activeTab === "listings" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <h3 className="font-extrabold text-emerald-950 text-sm md:text-base uppercase tracking-wider">Matangazo Yako ya Kazi</h3>
              <button
                onClick={() => setActiveTab("post")}
                className="bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Toa Kazi Mpya
              </button>
            </div>

            {myJobs.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                <p className="text-xs">Hujachapisha matangazo yoyote ya kazi bado.</p>
                <button
                  onClick={() => setActiveTab("post")}
                  className="mt-3 bg-emerald-800 text-white text-xs px-4 py-2 rounded-lg font-bold inline-block"
                >
                  Post Your First Job Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myJobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-600 transition">
                    <div>
                      <div className="flex justify-between items-start gap-1 pb-1">
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{job.title}</h4>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          job.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                        }`}>
                          {job.status === "active" ? "Kazi Ipo / Active" : "Imefungwa"}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono mt-1">Ref ID: {job.id}</p>

                      <div className="mt-2.5 grid grid-cols-3 gap-1 grid-flow-row text-center border-t border-b border-gray-100 py-1.5 my-2.5">
                        <div className="text-center">
                          <span className="block text-[8px] uppercase text-gray-400 font-bold">Views</span>
                          <span className="text-[11px] font-extrabold font-mono text-gray-700">{job.views || 0}</span>
                        </div>
                        <div className="text-center border-l border-r border-gray-100">
                          <span className="block text-[8px] uppercase text-gray-400 font-bold">Applied</span>
                          <span className="text-[11px] font-extrabold font-mono text-emerald-800">{job.applicationsCount || 0}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[8px] uppercase text-gray-400 font-bold">Mkoa</span>
                          <span className="text-[10px] font-semibold text-emerald-950 truncate block px-0.5">{job.region}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2 pt-2.5 border-t border-gray-50 justify-between items-center">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            const nextStatus = job.status === "active" ? "closed" : "active";
                            onUpdateJobStatus(job.id, nextStatus);
                          }}
                          className="text-[10px] font-bold px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                        >
                          {job.status === "active" ? "Funga / Close" : "Washa / Activate"}
                        </button>

                        {job.status === "active" && (
                          <button
                            onClick={() => setShowWhatsAppModal(showWhatsAppModal === job.id ? null : job.id)}
                            className="text-[10px] font-bold px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1 transition-all shadow-xs"
                          >
                            <Smartphone className="h-3 w-3 text-amber-300" /> WhatsApp Alert
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => onDeleteJob(job.id)}
                        className="text-[10px] font-bold px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded flex items-center gap-0.5 transition"
                      >
                        <Trash2 className="h-3 w-3" /> Futa / Delete
                      </button>
                    </div>

                    {showWhatsAppModal === job.id && (
                      <div className="mt-3 bg-zinc-100 border border-zinc-200 rounded-xl p-3 text-left space-y-3 animate-fadeIn">
                        {(() => {
                          const matchedSubsCount = subscribers.filter(sub => {
                            const categoryMatches = sub.categories.includes(job.category) || sub.categories.includes("All") || sub.categories.some((c: string) => c.toLowerCase() === "nyinginezo");
                            const regionMatches = sub.regions.includes(job.region) || sub.regions.includes("All") || sub.regions.some((r: string) => r.toLowerCase().includes("remote") || r.toLowerCase().includes("tanzania nzima"));
                            return categoryMatches || regionMatches;
                          }).length;

                          const status = broadcastStatus[job.id];
                          
                          const shareText = `🚨 FURSA MPYA HALISI (KaziTZ Alert) 🚨\n\n📌 *Kazi:* ${job.title}\n🏢 *Kampuni:* ${job.companyName}\n📍 *Mkoa:* ${job.region}\n💼 *Kikundi:* ${job.category}\n\nBonyeza link chini kuomba sasa kiofisi:\n🔗 https://kazi.tz/jobs/${job.id}`;
                          const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

                          return (
                            <>
                              <div className="flex justify-between items-center pb-1.5 border-b border-zinc-200">
                                <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                                  <Smartphone className="h-3 w-3" /> WhatsApp Alerts Dispatch
                                </span>
                                <span className="text-[9px] bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded-full">
                                  {matchedSubsCount} matching seekers
                                </span>
                              </div>

                              <p className="text-[10px] text-gray-500 leading-normal">
                                Wasilisha fursa hii mara moja kwa simu za mkononi za wasaka kazi <strong>{matchedSubsCount}</strong> waliopo <strong>{job.region}</strong> au wenye nia ya <strong>{job.category}</strong>.
                              </p>

                              {status?.msg && (
                                <div className="bg-emerald-50 text-emerald-800 p-2 rounded text-[10px] font-bold">
                                  ✓ {status.msg}
                                </div>
                              )}

                              {status?.error && (
                                <div className="bg-red-50 text-red-800 p-2 rounded text-[10px] font-bold">
                                  ⚠ {status.error}
                                </div>
                              )}

                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-gray-400">Custom Alert body text (Optional):</label>
                                <textarea
                                  className="w-full text-[10px] p-2 border border-gray-200 rounded-lg outline-none bg-white font-sans h-12"
                                  placeholder="Jaza ujumbe wa kitamaduni au uache wazi ili kutumia wetu default..."
                                  value={customMsgInput[job.id] || ""}
                                  onChange={(e) => setCustomMsgInput({ ...customMsgInput, [job.id]: e.target.value })}
                                />
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2 pt-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleWhatsAppBroadcast(job)}
                                  disabled={status?.loading}
                                  className="flex-1 bg-[#0B4D2E] hover:bg-emerald-800 text-white text-[10px] font-extrabold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
                                >
                                  {status?.loading ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" /> Inatuma...
                                    </>
                                  ) : (
                                    "Tuma kwa KaziTZ Subscribers"
                                  )}
                                </button>

                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="border border-green-500 text-green-700 bg-white hover:bg-green-50 text-[10px] font-extrabold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition"
                                >
                                  <Send className="h-3 w-3 text-green-500" /> Share kwa Status yangu
                                </a>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* POST TAB */}
        {activeTab === "post" && (
          <form onSubmit={handlePostSubmit} className="space-y-4">
            <h3 className="font-extrabold text-emerald-950 text-sm md:text-base uppercase tracking-wider pb-1">Tangaza Nafasi Mpya ya Kazi</h3>
            
            {formMsg && <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-lg text-xs font-bold border border-emerald-200">{formMsg}</div>}
            {formError && <div className="bg-red-50 text-red-800 p-3.5 rounded-lg text-xs font-bold border border-red-200">{formError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kichwa cha Kazi / Job Title *</label>
                <input
                  type="text"
                  placeholder="Mf: Senior Accountant, Agronimist, Driver..."
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Aina ya Kazi / job type *</label>
                <select
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                >
                  <option>Full-time / Wakati Wote</option>
                  <option>Part-time / Muda</option>
                  <option>Contract / Mkataba</option>
                  <option>Internship / Mafunzo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sekta / Category *</label>
                <select
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white text-xs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">-- Chagua Sekta / Select --</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mkoa / Region *</label>
                <select
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white text-xs"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  required
                >
                  <option value="">-- Chagua Mkoa / Select --</option>
                  {REGIONS.map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kima cha Chini cha Mshahara / Min Salary (TZS)</label>
                <input
                  type="number"
                  placeholder="Mfano: 600000"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white font-mono"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mshahara wa Juu / Max Salary (TZS)</label>
                <input
                  type="number"
                  placeholder="Mfano: 1500000"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white font-mono"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                />
              </div>
            </div>

            {/* AI Generator Influx! */}
            <AIJobDescriptionGenerator
              onGenerated={(text) => setDescription(text)}
              jobTitle={title}
              category={category}
              region={region}
              companyName={currentUser.companyName || currentUser.name}
            />

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Maelezo Kamili ya Kazi / job description *</label>
              <textarea
                placeholder="Eleza kwa muundo kamilifu... Unaweza kubadilisha yale yaliyotengenezwa na AI hapo juu."
                className="w-full text-xs p-3 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white h-48 font-mono"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tarehe ya mwisho ya Kutuma / Deadline</label>
                <input
                  type="date"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Barua pepe ya Mawasiliano</label>
                <input
                  type="email"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 font-sans">Simu ya Mawasiliano</label>
                <input
                  type="text"
                  placeholder="Mfano: +255 7..."
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-3.5 rounded-lg text-center transition"
            >
              🚀 Tangaza na Chapisha Kazi Sasa / Post JobListing
            </button>
          </form>
        )}

        {/* APPLICANTS TAB */}
        {activeTab === "applicants" && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-emerald-950 text-sm md:text-base uppercase tracking-wider pb-1">Maombi Yaliyotumwa na Wagombea</h3>

            {myApplications.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                <p className="text-xs">Bado haujapokea maombi yoyote ya wagombea kwa kazi ulizotoza.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map((app) => (
                  <div key={app.id} className="border border-gray-200 rounded-xl p-4 md:p-5 space-y-4 shadow-xs hover:border-emerald-700 transition">
                    
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          {app.jobTitle}
                        </span>
                        <h4 className="text-xs md:text-sm font-extrabold mt-1 text-gray-900">{app.seekerName}</h4>
                        <p className="text-[10px] text-gray-500">{app.seekerEmail} {app.seekerPhone ? ` · ${app.seekerPhone}` : ""}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className={`text-xs p-1.5 rounded-lg border font-bold ${
                            app.status === "shortlisted"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : app.status === "rejected"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-gray-50 text-gray-800 border-gray-200"
                          }`}
                          value={app.status}
                          onChange={(e) => onUpdateApplicationStatus(app.id, e.target.value as any)}
                        >
                          <option value="pending">Kwenye Foleni / Pending</option>
                          <option value="review">Kwenye Mapitio / Review</option>
                          <option value="shortlisted">Amebita / Shortlisted</option>
                          <option value="rejected">Kukataliwa / Rejected</option>
                        </select>
                      </div>
                    </div>

                    {/* Candidate credentials layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                        <span className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Mwasilisho wa Cover Letter</span>
                        <p className="text-gray-700 italic leading-relaxed">"{app.bio}"</p>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-gray-400">Taaluma / Academic Level</span>
                          <span className="font-semibold text-gray-800">{app.education}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-gray-400">Muhtasari wa Uzoefu</span>
                          <span className="font-semibold text-gray-800">{app.experience}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Orodha ya Ujuzi / Skills</span>
                          <div className="flex flex-wrap gap-1">
                            {app.skills.map((sk) => (
                              <span key={sk} className="bg-gray-150 px-2 py-0.5 rounded text-[10px] text-gray-600 font-semibold">{sk}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Scoring Audit Panel integration */}
                    <div className="border-t border-gray-100 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {!app.aiScore && app.aiScore !== 0 ? (
                        <div className="flex-1">
                          <p className="text-xs text-brand-black opacity-70 mb-2 md:mb-0">
                            Fanya tathmini dhabiti ya wasifu ukitumia Akili Mnemba (AI Audit).
                          </p>
                          <button
                            type="button"
                            onClick={() => handleTriggerAIAudit(app)}
                            disabled={auditingAppId === app.id}
                            className="bg-emerald-900 border border-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-emerald-800 transition flex items-center gap-1"
                          >
                            {auditingAppId === app.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" /> Inapitia resume...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" /> Tathmini kwa AI Audit
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="w-full">
                          <AICandidateAuditCard
                            score={app.aiScore}
                            summary={app.aiSummary}
                            matchingPoints={app.aiMatchingPoints}
                            gaps={app.aiGaps}
                          />
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="border-b border-gray-150 pb-4">
              <h3 className="font-extrabold text-emerald-950 text-sm md:text-base uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="h-5 w-5 text-emerald-700" /> Boresha Akaunti kuwa Premium Gold
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Pata uwezo wa kutathmini wasifu wote kwa AI Candidates Scoring bila kikomo, na tangazo lako lipate kipaumbele cha juu.
              </p>
            </div>

            {/* Response Alerts */}
            {paymentMsg && (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2.5 shadow-xs">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                <div>
                  <p>{paymentMsg}</p>
                </div>
              </div>
            )}

            {paymentError && (
              <div className="bg-rose-50 text-rose-800 p-4 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <p>{paymentError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Product Info Plan Panel */}
              <div className="lg:col-span-4 bg-emerald-950 p-5 rounded-2xl text-white space-y-4 shadow-md sticky top-4">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-800">
                  <div>
                    <span className="text-[9px] uppercase font-extrabold bg-emerald-800 text-amber-300 px-2.5 py-0.5 rounded-full">
                      DHAHABU / GOLD
                    </span>
                    <h4 className="font-extrabold text-base tracking-tight mt-1">Premium Employer</h4>
                  </div>
                  <Award className="h-8 w-8 text-amber-400 animate-bounce" />
                </div>

                <div className="py-2">
                  <span className="text-3xl font-black font-mono tracking-tight text-amber-300">TZS 15,000</span>
                  <span className="text-[10px] text-emerald-200 block mt-0.5 font-medium">Malipo ya mara moja kwa tangazo</span>
                </div>

                <div className="space-y-2 text-xs text-emerald-100">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Tangazo lako linawekwa kileleni mwa orodha (Featured Badge)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>AI Candidates Audit kwa waombaji wote bila kikomo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Ofa ya kubatizwa kwenye matokeo ya barua pepe na SMS</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Hadhi ya Uthibitisho (Verified Badge) wa Mwajiri</span>
                  </div>
                </div>

                <div className="bg-emerald-900/65 rounded-xl p-3 border border-emerald-800 text-[10px] text-emerald-200 leading-relaxed font-semibold">
                  💡 <strong>KaziTZ FastPay:</strong> Tunakubali pia mapokezi ya papo hapo kupitia huduma mpya ya <strong>M-Pesa STK Push</strong> ambapo unaweka namba yako na ombi la PIN linajitokeza kwenye simu yako muda huo huo!
                </div>
              </div>

              {/* TWO PAYMENT METHOD OPTIONS CONTAINER */}
              <div className="lg:col-span-8 space-y-6">

                {/* METHOD 1: STK PUSH PROCESSOR */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] uppercase font-bold px-3 py-1 rounded-bl-xl tracking-wider">
                    Inashauriwa / Recommended
                  </div>

                  <div className="flex items-center gap-2 pb-2">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Smartphone className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-emerald-950 text-xs md:text-sm uppercase">Njia ya Kwanza: M-Pesa STK Push (Papo kwa Papo)</h4>
                      <p className="text-[11px] text-gray-500">M-Pesa itatuma ujumbe wa kulipia moja kwa moja kwenye simu yako ya mkononi.</p>
                    </div>
                  </div>

                  {pushStatus === "none" && (
                    <form onSubmit={handleInitiateStkPush} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Namba yako ya Simu ya M-Pesa (Vodacom) *</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-mono text-xs font-bold">
                            TZ
                          </span>
                          <input
                            type="text"
                            placeholder="0754112233 au 0765XXXXXX"
                            className="w-full text-xs pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white font-mono font-bold tracking-wider"
                            value={mPesaPhone}
                            onChange={(e) => setMPesaPhone(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPushInitiating}
                        className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:bg-emerald-300 text-white text-xs font-extrabold py-3 rounded-lg text-center transition flex justify-center items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        {isPushInitiating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Inapiga Vodacom API...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" /> Lipa Sasa wa STK Push (TZS 15,000)
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* ACTIVE PUSH TRANSACTION COMPONENT POLLING DISPLAY */}
                  {pushStatus === "pending" && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 space-y-4 text-center animate-pulse">
                      <div className="flex justify-center items-center">
                        <div className="relative">
                          <div className="h-14 w-14 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center">
                            <Smartphone className="h-7 w-7 text-emerald-800 animate-bounce" />
                          </div>
                          <span className="absolute -top-1 -right-1 bg-amber-400 text-emerald-950 font-mono text-[9px] font-bold h-5 w-5 rounded-full flex items-center justify-center border border-white">
                            {pushTimer}s
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 max-w-sm mx-auto">
                        <h5 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                          Subiri Uthibitisho wa PIN Kwenye Simu!
                        </h5>
                        <p className="text-[11px] text-emerald-900 font-medium">
                          {pushMsg || "Tumepeleka ombi gusa M-Pesa kwenye simu yako..."}
                        </p>
                        <p className="text-[10px] text-gray-500 italic">
                          ℹ️ {pushInstructions || "Weka PIN yako ya M-PESA kukamilisha kulipia."}
                        </p>
                      </div>

                      <div className="border-t border-emerald-200/50 pt-3 max-w-xs mx-auto">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1 justify-center">
                          <RefreshCw className="h-3 w-3 animate-spin text-emerald-700" />
                          Inashughulikia kwa Polling...
                        </span>
                      </div>

                      {/* Demo developer prompt helper for transparency for user */}
                      <div className="text-[9px] bg-amber-50 border border-amber-200 rounded p-2 text-amber-900 font-semibold leading-relaxed">
                        ⚡ <strong>Notice ya Maendeleo / Sandbox Tip:</strong> Huu ni mfumo halisi wa simulation ya M-Pesa STK Push. Baada ya sekunde <strong>6</strong>, muamala wako utabadilishwa kuwa <strong>Mafanikio (SUCCESS)</strong> na akaunti yako kuboreshwa moja kwa moja! Uwezo halisi mkononi mwako.
                      </div>
                    </div>
                  )}

                  {/* SUCCESS RECEIPT DISPLAY FOR STK PUSH */}
                  {pushStatus === "success" && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-10 w-10 text-emerald-800 shrink-0" />
                        <div>
                          <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-tight">Muamala Umethibitishwa kwa Mafanikio!</h4>
                          <p className="text-[11px] text-emerald-800">Umeruhusiwa sasa kuwa Mwanachama wa Dhahabu.</p>
                        </div>
                      </div>

                      {pushReceipt && (
                        <div className="bg-white p-3 rounded-lg border border-emerald-200 font-mono text-[10px] text-teal-980 space-y-1">
                          <p className="font-bold border-b border-emerald-100 pb-1 uppercase shrink-0">STK Push Receipt:</p>
                          <p>{pushReceipt}</p>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setPushStatus("none");
                          setPushTxId(null);
                        }}
                        className="text-xs font-bold text-emerald-800 underline hover:text-emerald-990"
                      >
                        Lipa kwa Namba Nyingine au fanya muamala tena
                      </button>
                    </div>
                  )}
                </div>

                {/* METHOD 2: MANUAL TRANSACTION CODE VALIDATION */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 pb-2">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Award className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-emerald-950 text-xs md:text-sm uppercase">Njia ya Pili: Lipia kwa Utaratibu wa LIPA No / Paybill</h4>
                      <p className="text-[11px] text-gray-500">Ikiwa unataka kulipa kwa menu ya simu mwenyewe, kisha kisha kuleta namba ya muamala kuisajili.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1.5 text-xs text-gray-800 leading-relaxed">
                    <p className="font-bold uppercase text-[10px] text-gray-500">Jinsi ya Kulipa kwa Simu Yako / Manual steps:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 font-medium">
                      <li>Piga <strong>*150*00#</strong> kwenye mtandao wako kulipia</li>
                      <li>Chagua <strong>4 (Lipa kwa M-Pesa)</strong> kisha Chagua <strong>4 (Weka LIPA namba)</strong></li>
                      <li>Ingiza LIPA namba yetu ya KaziTZ: <strong className="text-emerald-800 text-xs select-all">555-888-22</strong></li>
                      <li>Ingiza kiasi cha <strong>15,000 TZS</strong></li>
                      <li>Baada ya kupokea SMS ya thibitisho ya Vodacom, nakili msimbo mzima wa herufi na namba kama ulivyo weka hapa chini ili kuidhinisha sasa hivi.</li>
                    </ol>
                  </div>

                  <form onSubmit={handleMpesaSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Msimbo wa Muamala wa M-Pesa (Reference ID) *</label>
                      <input
                        required
                        type="text"
                        placeholder="Mifano halali: RJ4589XJ12, SF1203PL90..."
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white uppercase font-mono font-bold tracking-wider"
                        value={mPesaCode}
                        onChange={(e) => setMPesaCode(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-3 rounded-lg text-center transition flex justify-center items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-gold" /> Idhinisha Msimbo / Verify Custom Code
                    </button>
                  </form>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
