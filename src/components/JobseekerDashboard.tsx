import React, { useState, useEffect } from "react";
import { User, CheckCircle2, Loader2, Award, Clock, ArrowRight, ShieldCheck, Smartphone, Bell, RefreshCw, Terminal, Check, Info, Trash2, SlidersHorizontal, ExternalLink, HelpCircle } from "lucide-react";
import { UserProfile, JobApplication } from "../types";
import { CATEGORIES, REGIONS } from "./JobFeed";

interface JobseekerProps {
  applications: JobApplication[];
  currentUser: UserProfile;
  onUpdateProfile: (profileData: { bio: string; skills: string[]; education: string; experience: string; phone?: string }) => void;
}

export default function JobseekerDashboard({ applications, currentUser, onUpdateProfile }: JobseekerProps) {
  const [activeTab, setActiveTab] = useState<"applications" | "profile" | "whatsapp">("applications");
  
  // Profile edit states
  const [bio, setBio] = useState(currentUser.bio || "");
  const [skillsStr, setSkillsStr] = useState(currentUser.skills?.join(", ") || "");
  const [education, setEducation] = useState(currentUser.education || "");
  const [experience, setExperience] = useState(currentUser.experience || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [msg, setMsg] = useState("");

  // WhatsApp alerts states
  const [whatsappPhone, setWhatsappPhone] = useState(currentUser.phone || "");
  const [whatsappCategories, setWhatsappCategories] = useState<string[]>(["Technology / Teknolojia", "NGO"]);
  const [whatsappRegions, setWhatsappRegions] = useState<string[]>(["Dar es Salaam", "Dodoma"]);
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [isSubmittingAlerts, setIsSubmittingAlerts] = useState(false);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);

  const myApplications = applications.filter((app) => app.seekerId === currentUser.uid);

  // Poll logs for real-time visualization of Meta API output
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/whatsapp/logs");
      if (res.ok) {
        const data = await res.json();
        setWhatsappLogs(data);
      }
    } catch (err) {
      console.error("WhatsApp logs fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArray = skillsStr.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    onUpdateProfile({
      bio,
      skills: skillsArray,
      education,
      experience,
      phone,
    });
    setMsg("Profaili yako imeboreshwa barabara!");
    setTimeout(() => setMsg(""), 3500);
  };

  const handleAlertsSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappMsg("");
    setWhatsappError("");
    setIsSubmittingAlerts(true);

    try {
      const response = await fetch("/api/whatsapp/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: whatsappPhone,
          categories: whatsappCategories,
          regions: whatsappRegions
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setWhatsappMsg(data.message);
        fetchLogs();
      } else {
        setWhatsappError(data.error || "Imeshindwa kufanya usajili. Jaribu tena.");
      }
    } catch (err) {
      setWhatsappError("Mawasiliano na server yameshindwa.");
    } finally {
      setIsSubmittingAlerts(false);
    }
  };

  const handleUnsubscribeAlerts = async () => {
    if (!window.confirm("Je una uhakika unataka kuondoa namba yako kwenye taarifa za WhatsApp?")) return;
    setWhatsappMsg("");
    setWhatsappError("");
    setIsSubmittingAlerts(true);

    try {
      const response = await fetch("/api/whatsapp/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: whatsappPhone })
      });

      const data = await response.json();
      if (response.ok) {
        setWhatsappMsg(data.message);
        fetchLogs();
      } else {
        setWhatsappError(data.error || "Imeshindwa kujiondoa kwenye mfumo.");
      }
    } catch (err) {
      setWhatsappError("Mawasiliano na server yameshindwa.");
    } finally {
      setIsSubmittingAlerts(false);
    }
  };

  const toggleCategory = (cat: string) => {
    if (whatsappCategories.includes(cat)) {
      setWhatsappCategories(whatsappCategories.filter(c => c !== cat));
    } else {
      setWhatsappCategories([...whatsappCategories, cat]);
    }
  };

  const toggleRegion = (reg: string) => {
    if (whatsappRegions.includes(reg)) {
      setWhatsappRegions(whatsappRegions.filter(r => r !== reg));
    } else {
      setWhatsappRegions([...whatsappRegions, reg]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "shortlisted":
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Congratulations / Shortlisted</span>;
      case "rejected":
        return <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Rejected / Kufungwa</span>;
      case "review":
        return <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-tight">Under Review</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono">Pending / Mapitio</span>;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden select-none">
      
      {/* Jobseeker Hub sub-header banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-[#1A7A4A] p-6 text-white text-left flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-950 px-2.5 py-1 rounded-full text-gold">
            👤 MSALIO WA KAZI / JOB SEEKER HUB
          </span>
          <h2 className="text-lg md:text-xl font-extrabold tracking-tight mt-2">{currentUser.name} (Candidate Portfolio)</h2>
          <p className="text-xs opacity-75 mt-0.5">Tafuta nafasi, weka alerts za WhatsApp na kagua ulichotuma hapa chini.</p>
        </div>

        {/* Dashboard sub tabs selector */}
        <div className="flex bg-emerald-950 p-1 rounded-lg border border-emerald-700 w-full lg:w-auto flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("applications")}
            className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === "applications" ? "bg-emerald-700 text-white" : "text-emerald-300 hover:text-white"
            }`}
          >
            Maombi Yangu ({myApplications.length})
          </button>
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1 ${
              activeTab === "whatsapp" ? "bg-amber-500 text-emerald-950" : "text-amber-300 hover:text-white"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 animate-pulse" /> Custom WhatsApp Alerts
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === "profile" ? "bg-emerald-700 text-white" : "text-emerald-300 hover:text-white"
            }`}
          >
            Badili Profaili / Edit Portrait
          </button>
        </div>
      </div>

      <div className="p-5 md:p-6 text-left">
        
        {/* APPLICATIONS TAB */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-emerald-950 text-sm uppercase tracking-wider">Lango Kuu la Maombi Yako</h3>

            {myApplications.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                <p className="text-xs">Bado hujajaza maombi ya kazi yoyote.</p>
                <p className="text-[10px] text-gray-400 mt-1">Chunguza orodha zilizopo kujaza sasa!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myApplications.map((app) => (
                  <div key={app.id} className="border border-gray-200 rounded-xl p-4 hover:border-emerald-600 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-500">Applied At: {new Date(app.appliedAt).toLocaleDateString("sw-TZ")}</span>
                      <h4 className="text-xs md:text-sm font-extrabold text-[#0B4D2E] mt-0.5">{app.jobTitle}</h4>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">{app.companyName}</p>
                      
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Hali ya Ombi:</span>
                        {getStatusBadge(app.status)}
                      </div>
                    </div>

                    {/* Show AI match scorecard preview directly to candidates if scored! */}
                    {app.aiScore && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 w-full md:w-56 text-left">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-900">AI MATCH INTEGRATION</span>
                          <span className="font-mono text-xs font-extrabold text-emerald-800">{app.aiScore}% Match</span>
                        </div>
                        <p className="text-[10px] text-emerald-700 line-clamp-2 italic">
                          "{app.aiSummary}"
                        </p>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CUSTOM WHATSAPP ALERTS TAB */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            <div className="border-b border-gray-150 pb-4">
              <h3 className="font-extrabold text-emerald-950 text-base uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-5 w-5 text-emerald-700" /> WhatsApp Job Alerts Center
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Kupokea nafasi mpya za kazi zinazoendana na ujuzi na mkoa wako moja kwa moja kwenye simu yako ya mkononi (Via WhatsApp Business Api).
              </p>
            </div>

            {/* Notifications alerts feedback */}
            {whatsappMsg && (
              <div className="bg-green-50 text-green-800 border border-green-200 p-4 rounded-xl text-xs font-bold flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <p>{whatsappMsg}</p>
              </div>
            )}

            {whatsappError && (
              <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl text-xs font-bold flex items-start gap-2">
                <Info className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <p>{whatsappError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* Form Configurator Column */}
              <div className="xl:col-span-7 bg-white border border-gray-200 rounded-2xl p-5 md:p-6 space-y-6 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded-lg">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-950">Mapendeleo yako / Preference Filters</h4>
                    <p className="text-[10px] text-gray-400">Chagua makundi na mikoa ili uendane na tangazo thabiti.</p>
                  </div>
                </div>

                <form onSubmit={handleAlertsSubscribe} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Namba ya Simu ya WhatsApp (Tanzania) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-mono text-xs font-extrabold">
                        TZ
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Mfano: 0754123456 au 255754123456"
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white font-mono font-bold tracking-wider"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Tutakutumia msimbo wa uthibitisho kupitia WhatsApp mara baada ya kubofya kujisajili.</p>
                  </div>

                  {/* Categories Selector */}
                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-gray-700">Chagua Makundi ya Kazi (Select Categories)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => {
                        const isChecked = whatsappCategories.includes(cat);
                        return (
                          <div
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`border text-[11px] p-2 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                              isChecked 
                                ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold" 
                                : "bg-gray-50/50 border-gray-200 hover:bg-gray-50 text-gray-600"
                            }`}
                          >
                            <span className="truncate">{cat.split(" / ")[0]}</span>
                            {isChecked && <Check className="h-3 w-3 text-emerald-700 shrink-0 ml-1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Regions Selector */}
                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-gray-700">Chagua Mikoa Unaopendelea (Select Regions)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-150 p-2.5 rounded-xl bg-gray-50/30">
                      {REGIONS.map((reg) => {
                        const isChecked = whatsappRegions.includes(reg);
                        return (
                          <div
                            key={reg}
                            onClick={() => toggleRegion(reg)}
                            className={`border text-[11px] p-2 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                              isChecked 
                                ? "bg-teal-50 border-teal-500 text-teal-900 font-bold" 
                                : "bg-white border-gray-100 hover:bg-gray-50 text-gray-600"
                            }`}
                          >
                            <span className="truncate">{reg}</span>
                            {isChecked && <Check className="h-2.5 w-2.5 text-teal-700 shrink-0 ml-1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingAlerts}
                      className="flex-1 bg-[#0B4D2E] hover:bg-[#156e43] text-white text-xs font-bold py-3 px-4 rounded-xl transition flex justify-center items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {isSubmittingAlerts ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Inahifadhi profile...
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4" /> Washa alerts za WhatsApp Sasa
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleUnsubscribeAlerts}
                      disabled={isSubmittingAlerts}
                      className="border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold py-3 px-4 rounded-xl transition flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" /> Ghairi alerts
                    </button>
                  </div>
                </form>

                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[10px] text-amber-900 leading-relaxed font-semibold">
                  💡 <strong>KaziTZ Webhook Engine:</strong> Ikiwa mwajiri atapandisha kazi inayofanana na sifa ulizochagua hapa, utaona payload na ujumbe halisi ukiwekwa dhabiti kwenye simulator yetu ya kulia kwa sekunde chache!
                </div>
              </div>

              {/* Live Sandbox Telegram/WhatsApp Meta API logs */}
              <div className="xl:col-span-5 space-y-4">
                
                {/* Visual phone shell of live simulation alerts */}
                <div className="bg-zinc-900 border-4 border-zinc-700 rounded-[2.5rem] p-4 font-mono shadow-xl relative overflow-hidden min-h-[460px] max-w-sm mx-auto">
                  {/* Speaker and Camera notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-zinc-800 h-5 w-28 rounded-b-xl z-20 flex justify-center items-center gap-1">
                    <div className="h-1 w-8 bg-zinc-650 rounded-full"></div>
                    <div className="h-2 w-2 bg-emerald-900 rounded-full"></div>
                  </div>

                  <div className="h-full flex flex-col bg-[#0b141a] text-zinc-300 rounded-[2rem] p-2.5 pt-6 text-left selection:bg-teal-900">
                    
                    {/* Fake WhatsApp Header */}
                    <div className="bg-[#1f2c34] p-2.5 -mx-2.5 -mt-2.5 rounded-t-[2rem] flex items-center justify-between border-b border-teal-950">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[8px] text-white">
                          K
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black text-white leading-tight flex items-center gap-1">
                            KaziTZ Alerts <Check className="h-2.5 w-2.5 text-blue-400 bg-white rounded-full p-0.5" />
                          </h5>
                          <span className="text-[7px] text-emerald-400 block tracking-tight">online · Sandbox dispatch Active</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={fetchLogs} className="p-1 hover:bg-zinc-700 rounded text-teal-400">
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto py-3 space-y-3 max-h-[300px] text-[10px] leading-relaxed select-all">
                      {whatsappLogs.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                          <Smartphone className="h-8 w-8 mx-auto opacity-30 mb-2 text-zinc-400" />
                          <p className="text-[9px] uppercase tracking-wider font-extrabold font-mono">Hamna Ujumbe Bado</p>
                          <p className="text-[8px] opacity-75 mt-1">Jiunge upande wa kushoto au subiri Mwajiri atume tangazo.</p>
                        </div>
                      ) : (
                        whatsappLogs.map((log) => {
                          const formattedTime = new Date(log.timestamp).toLocaleTimeString();
                          return (
                            <div key={log.id} className="space-y-1">
                              <div className="flex justify-center">
                                <span className="bg-[#121b22] text-[#8696a0] text-[7px] px-2 py-0.5 rounded-full font-sans tracking-wide">
                                  {formattedTime} · TO: {log.recipient}
                                </span>
                              </div>

                              <div className="bg-[#202c33] border-l-2 border-emerald-500 rounded-lg p-2.5 max-w-[90%] text-[#e9edef] relative shadow-md">
                                <div className="text-[9px] font-extrabold text-amber-400 mb-1 border-b border-zinc-800 pb-0.5 flex items-center justify-between uppercase">
                                  <span>{log.messageType === "template" ? "Welcome Template" : "BroadCast Alert"}</span>
                                  <span className="text-[7px] bg-green-900/40 text-green-400 border border-green-900 px-1 rounded">
                                    {log.status === "delivered" ? "delivered" : "sent"}
                                  </span>
                                </div>
                                <p className="whitespace-pre-line text-[9px] leading-normal">{log.body}</p>
                                <span className="absolute bottom-1 right-2 text-[7px] text-[#8696a0]">
                                  ✔✔
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Terminal details log snippet of network package */}
                    <div className="border-t border-zinc-800 pt-2.5 mt-2 font-mono text-[7px] text-emerald-400 leading-tight">
                      <div className="flex items-center gap-1.5 uppercase font-black text-white text-[8px] mb-1.5 text-left">
                        <Terminal className="h-3 w-3 text-emerald-500" /> Meta API Engine Payload logs:
                      </div>
                      <div className="bg-black/80 rounded p-2 text-left h-[100px] overflow-y-auto border border-zinc-800 select-all">
                        {whatsappLogs.length > 0 ? (
                          <pre className="text-zinc-400">{JSON.stringify(whatsappLogs[0].payload, null, 2)}</pre>
                        ) : (
                          <p className="text-zinc-650 italic font-medium">// Waiting for API cloud payload execution...</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-[11px] text-gray-500 space-y-2 shadow-xs">
                  <h5 className="font-bold text-gray-800 flex items-center gap-1 text-[11px] uppercase">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-600 shrink-0" /> Real API integration FAQ
                  </h5>
                  <p className="leading-relaxed">
                    Huu ni mfumo thabiti wa sandbox wa <strong>Vodacom / Airtel WhatsApp Alerts</strong>. Unapojisajili, ujumbe utatumwa na kuonyeshwa katika simu/console sasa hivi. 
                  </p>
                  <p className="leading-relaxed font-semibold text-[#0B4D2E]">
                    Sifa kuu: KaziTZ inachanganya Swahili and English kuandaa templates zinazokubalika na kupitishwa na Meta Cloud Policy nchini Tanzania.
                  </p>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <h3 className="font-extrabold text-emerald-950 text-sm uppercase tracking-wider">Taarifa za Profaili ya Wasafiri</h3>
            <p className="text-xs text-gray-500">Sasisha sehemu hizi ili kurahisisha na kuwezesha kujaza fomu za maombi upesi.</p>

            {msg && <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-lg text-xs font-bold border border-emerald-200">{msg}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Simu yako *</label>
                <input
                  type="text"
                  placeholder="Mfano: +255 712 345 678"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Historia ya Elimu / Academy *</label>
                <input
                  type="text"
                  placeholder="Mf: Advanced Diploma in Accounting (IFM), BSA in Agronomy (SUA)"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Orodha ya Ujuzi / Core Skills (Zilizotengwa kwa alama ya mkato) *</label>
                <input
                  type="text"
                  placeholder="Mf: QuickBooks, Tax planning, Soil Science, Communication"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Muhtasari wa Uzoefu / Work Experience *</label>
                <input
                  type="text"
                  placeholder="Mf: Miaka 2 kama Mtaalamu wa Kilimo, Miezi 6 kama Msaidizi"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Cover letter ya Wasifu wako / Profile Bio *</label>
              <textarea
                placeholder="Eleza kwanini upo huru kupokea fursa..."
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700 bg-gray-50 focus:bg-white h-24"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs py-3 px-6 rounded-lg transition shrink-0 cursor-pointer"
            >
              💾 Sasisha Profaili Halisi
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
