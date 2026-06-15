import React, { useState, useEffect } from "react";
import { Briefcase, Sparkles, LogOut, HelpCircle, Award, LayoutDashboard, UserCheck, Flame, BookOpen, User, Lock, AlertTriangle, ShieldCheck, Check } from "lucide-react";
import { UserProfile, JobListing, JobApplication } from "./types";
import { INITIAL_JOBS } from "./mockData";
import JobFeed from "./components/JobFeed";
import EmployerDashboard from "./components/EmployerDashboard";
import JobseekerDashboard from "./components/JobseekerDashboard";

// Default Demo Identity profiles to ease evaluation
const DEMO_EMPLOYER: UserProfile = {
  uid: "employer_demo_1",
  email: "employer@kazitz.com",
  name: "Zola Kabwe",
  role: "employer",
  companyName: "Kilimo Kwanza Group",
  phone: "+255754112233",
  plan: "free",
  createdAt: "2026-06-15T00:00:00.000Z",
};

const DEMO_SEEKER: UserProfile = {
  uid: "seeker_demo_1",
  email: "seeker@kazitz.com",
  name: "Iddy Ramadhani",
  role: "jobseeker",
  phone: "+255655443322",
  bio: "Nilihitimu Chuo Kikuu cha Sokoine (SUA) masuala ya Kilimo. Nina uzoefu wa miaka 2 katika utafiti na usimamizi wa mashamba vijijini.",
  skills: ["Agriculture", "Soil Science", "Farm Management", "Swahili", "Report Writing"],
  education: "Bachelor of Science in Agronomy - Sokoine University of Agriculture",
  experience: "Agronomy Intern at Morogoro Seed Co. (11 Months), Volunteer Farmer Educator (1 Year)",
  createdAt: "2026-06-15T00:00:00.000Z",
};

const INITIAL_APPLICATIONS: JobApplication[] = [
  {
    id: "app_demo_1",
    jobId: "demo_job_1",
    jobTitle: "Senior Agronomist (Mtaalamu wa Kilimo)",
    companyName: "Kilimo Kwanza Group",
    seekerId: "seeker_demo_1",
    seekerName: "Iddy Ramadhani",
    seekerEmail: "seeker@kazitz.com",
    seekerPhone: "+255655443322",
    bio: "Nilihitimu Chuo Kikuu cha Sokoine (SUA) masuala ya Kilimo. Nina uzoefu wa miaka 2 katika utafiti na usimamizi wa mashamba vijijini.",
    skills: ["Agriculture", "Soil Science", "Farm Management", "Swahili", "Report Writing"],
    education: "Bachelor of Science in Agronomy - Sokoine University of Agriculture",
    experience: "Agronomy Intern at Morogoro Seed Co. (11 Months), Volunteer Farmer Educator (1 Year)",
    appliedAt: "2026-06-15T02:00:00.000Z",
    status: "pending",
    aiScore: 91,
    aiSummary: "Ulinganifu dhabiti upo. Mgombea ana elimu inayostahili (Agriculture kutoka SUA) na ujuzi mzuri kulingana na mahitaji ya mradi hapa Morogoro.",
    aiMatchingPoints: [
      "Fani inatoka SUA na ipo sahihi",
      "Ujuzi wa lugha mbili upo",
      "Masuala ya mazao vijijini"
    ],
    aiGaps: [
      "Wasifu wake hauonyeshi leseni ya kuendesha pikipiki"
    ]
  }
];

export default function App() {
  const [screen, setScreen] = useState<"landing" | "feed" | "auth" | "dashboard" | "guide">("landing");
  
  // Database local states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Authentication form state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authRole, setAuthRole] = useState<"employer" | "jobseeker">("employer");
  const [emailStr, setEmailStr] = useState("");
  const [passwordStr, setPasswordStr] = useState("");
  const [nameStr, setNameStr] = useState("");
  const [companyStr, setCompanyStr] = useState("");
  const [phoneStr, setPhoneStr] = useState("");
  const [authError, setAuthError] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  // Load resources upon starting
  useEffect(() => {
    // 1. Load or prefill Users
    const cachedUsers = localStorage.getItem("kazitz_users");
    if (cachedUsers) {
      setUsers(JSON.parse(cachedUsers));
    } else {
      const initialUsers = [DEMO_EMPLOYER, DEMO_SEEKER];
      setUsers(initialUsers);
      localStorage.setItem("kazitz_users", JSON.stringify(initialUsers));
    }

    // 2. Load or prefill Jobs
    const cachedJobs = localStorage.getItem("kazitz_jobs");
    if (cachedJobs) {
      setJobs(JSON.parse(cachedJobs));
    } else {
      setJobs(INITIAL_JOBS);
      localStorage.setItem("kazitz_jobs", JSON.stringify(INITIAL_JOBS));
    }

    // 3. Load or prefill Applications
    const cachedApps = localStorage.getItem("kazitz_applications");
    if (cachedApps) {
      setApplications(JSON.parse(cachedApps));
    } else {
      setApplications(INITIAL_APPLICATIONS);
      localStorage.setItem("kazitz_applications", JSON.stringify(INITIAL_APPLICATIONS));
    }

    // Checking client-side AI support status
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => setAiAvailable(!!data.isAvailable))
      .catch(() => setAiAvailable(false));
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auth Operations
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!emailStr || !passwordStr) {
      setAuthError("Weka barua pepe na nywila yako.");
      return;
    }

    if (authMode === "login") {
      // Find matching user with simulated success (simplified demo mode)
      const matched = users.find((u) => u.email.toLowerCase() === emailStr.toLowerCase());
      if (matched) {
        setCurrentUser(matched);
        triggerToast(`Karibu tena, ${matched.name}!`);
        setScreen("dashboard");
      } else {
        setAuthError("Akaunti haijapatikana. Tumia akaunti za majaribio au sajili akaunti mpya.");
      }
    } else {
      // Register
      if (!nameStr) {
        setAuthError("Tafadhali ingiza jina lako kamili.");
        return;
      }

      if (users.some((u) => u.email.toLowerCase() === emailStr.toLowerCase())) {
        setAuthError("Barua pepe hii tayari imeshasajiliwa.");
        return;
      }

      const newUser: UserProfile = {
        uid: "user_" + Date.now(),
        email: emailStr,
        name: nameStr,
        role: authRole,
        phone: phoneStr,
        companyName: authRole === "employer" ? companyStr : undefined,
        plan: authRole === "employer" ? "free" : undefined,
        createdAt: new Date().toISOString(),
      };

      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem("kazitz_users", JSON.stringify(updatedUsers));
      setCurrentUser(newUser);
      triggerToast("Akaunti imesajiliwa vyema! Karibu KaziTZ.");
      setScreen("dashboard");
    }

    // Clean forms
    setEmailStr("");
    setPasswordStr("");
    setNameStr("");
    setCompanyStr("");
    setPhoneStr("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    triggerToast("Umetoka kwenye utaratibu salama.");
    setScreen("landing");
  };

  const handleShortcutLogin = (role: "employer" | "jobseeker") => {
    const target = role === "employer" ? DEMO_EMPLOYER : DEMO_SEEKER;
    
    // Ensure mock identity exists in users list
    if (!users.some((u) => u.email === target.email)) {
      const updated = [...users, target];
      setUsers(updated);
      localStorage.setItem("kazitz_users", JSON.stringify(updated));
    }

    setCurrentUser(target);
    triggerToast(`Kuingia kwa Majaribio kama ${target.name}!`);
    setScreen("dashboard");
  };

  // Employer Operations
  const handlePostJob = async (jobData: any) => {
    if (!currentUser) return;
    const newJob: JobListing = {
      id: "job_" + Date.now(),
      title: jobData.title,
      companyName: currentUser.companyName || currentUser.name,
      category: jobData.category,
      region: jobData.region,
      jobType: jobData.jobType,
      salaryMin: jobData.salaryMin,
      salaryMax: jobData.salaryMax,
      description: jobData.description,
      employerId: currentUser.uid,
      postedAt: new Date().toISOString(),
      status: "active",
      views: 0,
      applicationsCount: 0,
      deadline: jobData.deadline,
      contactEmail: jobData.contactEmail,
      contactPhone: jobData.contactPhone,
      featured: currentUser.plan === "premium",
    };

    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    localStorage.setItem("kazitz_jobs", JSON.stringify(updatedJobs));
    triggerToast("Tangazo limetumwa vyema!");
  };

  const handleDeleteJob = async (jobId: string) => {
    const updated = jobs.filter((j) => j.id !== jobId);
    setJobs(updated);
    localStorage.setItem("kazitz_jobs", JSON.stringify(updated));
    
    // Also remove applications associated with this job
    const updatedApps = applications.filter((app) => app.jobId !== jobId);
    setApplications(updatedApps);
    localStorage.setItem("kazitz_applications", JSON.stringify(updatedApps));

    triggerToast("Tangazo limefutwa kwa mafanikio.");
  };

  const handleUpdateJobStatus = (jobId: string, status: "active" | "closed") => {
    const updated = jobs.map((j) => (j.id === jobId ? { ...j, status } : j));
    setJobs(updated);
    localStorage.setItem("kazitz_jobs", JSON.stringify(updated));
    triggerToast(`Hali ya kazi imebadilishwa kuwa: ${status === "active" ? "Wazi" : "Imefungwa"}`);
  };

  const handleUpdateApplicationStatus = (appId: string, status: any) => {
    const updated = applications.map((app) => (app.id === appId ? { ...app, status } : app));
    setApplications(updated);
    localStorage.setItem("kazitz_applications", JSON.stringify(updated));
    triggerToast(`Hali ya ombi imebadilishwa!`);
  };

  const handleSaveAuditResult = (appId: string, score: number, summary: string, mp: string[], gp: string[]) => {
    const updated = applications.map((app) =>
      app.id === appId
        ? {
            ...app,
            aiScore: score,
            aiSummary: summary,
            aiMatchingPoints: mp,
            aiGaps: gp,
          }
        : app
    );
    setApplications(updated);
    localStorage.setItem("kazitz_applications", JSON.stringify(updated));
    triggerToast("Tathmini ya AI imekamilika na imesajiliwa!");
  };

  const handleUpgradePlan = (refCode: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, plan: "premium" as const };
    setCurrentUser(updatedUser);

    const updatedUsers = users.map((u) => (u.uid === currentUser.uid ? updatedUser : u));
    setUsers(updatedUsers);
    localStorage.setItem("kazitz_users", JSON.stringify(updatedUsers));
  };

  // Jobseeker Operations
  const handleApplyToJob = async (jobId: string, cvDetails: any) => {
    if (!currentUser) return;
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const newApp: JobApplication = {
      id: "app_" + Date.now(),
      jobId,
      jobTitle: targetJob.title,
      companyName: targetJob.companyName,
      seekerId: currentUser.uid,
      seekerName: currentUser.name,
      seekerEmail: currentUser.email,
      seekerPhone: cvDetails.phone || currentUser.phone || "",
      bio: cvDetails.bio,
      skills: cvDetails.skills,
      education: cvDetails.education,
      experience: cvDetails.experience,
      appliedAt: new Date().toISOString(),
      status: "pending",
    };

    // Update applications
    const updatedApps = [newApp, ...applications];
    setApplications(updatedApps);
    localStorage.setItem("kazitz_applications", JSON.stringify(updatedApps));

    // Increment job applications count
    const updatedJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, applicationsCount: (job.applicationsCount || 0) + 1 } : job
    );
    setJobs(updatedJobs);
    localStorage.setItem("kazitz_jobs", JSON.stringify(updatedJobs));
  };

  const handleUpdateSeekerProfile = (profileData: any) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      bio: profileData.bio,
      skills: profileData.skills,
      education: profileData.education,
      experience: profileData.experience,
      phone: profileData.phone,
    };
    setCurrentUser(updatedUser);

    const updatedUsers = users.map((u) => (u.uid === currentUser.uid ? updatedUser : u));
    setUsers(updatedUsers);
    localStorage.setItem("kazitz_users", JSON.stringify(updatedUsers));
  };

  const appliedJobIds = currentUser ? applications.filter((app) => app.seekerId === currentUser.uid).map((app) => app.jobId) : [];

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans selection:bg-emerald-100 selection:text-emerald-950 text-gray-900 bg-[#F9F7F3]">
      
      {/* Dynamic Header */}
      <nav className="bg-[#0B4D2E] text-white px-5 py-4 border-b border-emerald-950 sticky top-0 z-40 shadow-sm select-none">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center justify-between">
            <h1 
              onClick={() => setScreen("landing")}
              className="text-xl font-extrabold tracking-tight cursor-pointer font-sans"
            >
              Kazi<span className="text-[#F5A623]">TZ</span>
            </h1>
            <span className="text-[9px] bg-emerald-950 text-gold rounded ml-2 px-1.5 py-0.5 border border-emerald-800 font-mono tracking-widest font-bold">
              AI PLATFORM
            </span>
          </div>

          {/* Quick Menu Route Links */}
          <div className="flex items-center gap-2 flex-wrap text-xs md:text-sm">
            <button
              onClick={() => setScreen("landing")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                screen === "landing" ? "bg-emerald-950 text-gold" : "hover:bg-emerald-800 text-gray-100"
              }`}
            >
              Feed / Home
            </button>
            <button
              onClick={() => setScreen("guide")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                screen === "guide" ? "bg-emerald-950 text-gold" : "hover:bg-emerald-800 text-gray-100"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Firebase Guide / DB
            </button>

            {currentUser ? (
              <>
                <button
                  onClick={() => setScreen("dashboard")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                    screen === "dashboard" ? "bg-emerald-950 text-gold" : "hover:bg-emerald-800 text-gray-100"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </button>
                <div className="flex items-center gap-2 pl-3 ml-3 border-l border-emerald-700">
                  <span className="font-semibold text-emerald-300 hidden md:inline">
                    {currentUser.name} ({currentUser.role === "employer" ? "Mwajiri" : "Seeker"})
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 px-2 py-1.5 rounded text-red-400 font-bold hover:text-red-300 flex items-center gap-1 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Toka
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setScreen("auth");
                }}
                className="bg-[#F5A623] hover:bg-yellow-600 transition text-[#0B4D2E] px-4 py-1.5 rounded-lg font-extrabold text-xs shadow-xs"
              >
                Ingia / Register
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* Main Container Stage */}
      <main className="max-w-6xl mx-auto px-5 py-6 flex-1 w-full relative">
        
        {/* LANDING TAB */}
        {screen === "landing" && (
          <div className="space-y-6">
            
            {/* Elegant Hero Bento Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 select-none text-left">
              
              {/* Primary welcome pitch (8 columns) */}
              <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-xs relative overflow-hidden min-h-[240px]">
                <div>
                  <h2 className="text-[#0B4D2E] font-extrabold text-2xl md:text-3xl leading-snug tracking-tight">
                    Tafuta Nafasi Bora za Kazi nchini Tanzania ukitumia Akili Mnemba ya AI
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-2 leading-relaxed">
                    KaziTZ ni jukwaa la kisasa linalowaunganisha Waajiri na Wasaka Kazi nchini kote. Tunakusaidia kutengeneza matangazo ya kazi upesi kwa urahisi ukitumia AI, na kupima wasifu ulingane dharura.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setAuthRole("employer");
                      setScreen("auth");
                    }}
                    className="bg-[#0B4D2E] font-extrabold text-xs text-white px-5 py-3 rounded-xl hover:bg-[#1A7A4A] transition shadow-xs"
                  >
                    🏢 Mimi ni Mwajiri / Post Job
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setAuthRole("jobseeker");
                      setScreen("auth");
                    }}
                    className="bg-[#F5A623] text-[#0B4D2E] font-extrabold text-xs px-5 py-3 rounded-xl hover:bg-yellow-600 transition shadow-xs"
                  >
                    👤 Mimi ni Mtafuta Kazi / Apply
                  </button>
                </div>
              </div>

              {/* Fast 1-Click Demo Login shortcuts bento element (4 columns) */}
              <div className="lg:col-span-4 bg-emerald-950 text-white rounded-2xl p-6 flex flex-col justify-between shadow-xs text-left">
                <div>
                  <div className="flex items-center gap-1">
                    <Flame className="h-5 w-5 text-amber-400 fill-amber-400 animate-pulse" />
                    <h3 className="font-extrabold text-sm text-white font-mono uppercase tracking-wide">
                      1-CLICK QUICK DEMO ACCOUNTS
                    </h3>
                  </div>
                  <p className="text-[11px] text-emerald-300 mt-2 leading-relaxed">
                    Bonyeza hapa chini kuingia instantly kama Mwajiri au Msaka Kazi ili uone mifumo yote dhabiti inayojiendesha sasa hivi.
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <button
                    onClick={() => handleShortcutLogin("employer")}
                    className="w-full bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-between group transition"
                  >
                    <span className="flex items-center gap-1.5">🏢 Ingia kama Mwajiri (Zola)</span>
                    <span className="text-[10px] bg-emerald-950 font-mono text-gold px-1.5 py-0.5 rounded group-hover:scale-105 transition">Zola</span>
                  </button>
                  <button
                    onClick={() => handleShortcutLogin("jobseeker")}
                    className="w-full bg-[#F5A623] hover:bg-yellow-600 text-[#0B4D2E] text-xs font-extrabold py-2.5 px-3 rounded-xl flex items-center justify-between group transition"
                  >
                    <span className="flex items-center gap-1.5">👤 Ingia kama Msaka Kazi (Iddy)</span>
                    <span className="text-[10px] bg-[#0B4D2E] font-mono text-white px-1.5 py-0.5 rounded group-hover:scale-105 transition">Iddy</span>
                  </button>
                </div>
              </div>

            </div>

            {/* AI key warning if missing */}
            {!aiAvailable && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-start gap-2 text-left">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold block">Ujumbe wa Usalama wa AI/ Secrets API Key Alert:</span>
                  Utafiti mnemba au uzalishaji wa tangazo umesawazishwa kufanya kazi offline kwa wasifu wa kwanza kiofisi. Ili kuwezesha useleleshi halisi wa Gemini AI yetu, hakikisha umeweka siri ya <code>GEMINI_API_KEY</code> kwenye panel ya AI Studio Secrets (kama ilivyoelezwa kwenye mwongozo).
                </div>
              </div>
            )}

            {/* Title above core Feed list */}
            <div className="pt-4 text-left">
              <h3 className="text-[#0B4D2E] font-extrabold text-sm uppercase tracking-wider mb-1">Nafasi za Kazi zilizopo sasa / Active job opportunities</h3>
              <p className="text-xs text-gray-400">Tafuta, sokoa na u kague sifa za ajira dhabiti kote Tanzania</p>
            </div>

            {/* Search feed rendering inside Home */}
            <JobFeed
              jobs={jobs}
              currentUser={currentUser}
              onApply={handleApplyToJob}
              appliedJobIds={appliedJobIds}
              onOpenAuth={(role) => {
                setAuthRole(role);
                setAuthMode("register");
                setScreen("auth");
              }}
            />

          </div>
        )}

        {/* AUTHENTICATION SCREEN */}
        {screen === "auth" && (
          <div className="max-w-md mx-auto py-8 select-none">
            
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-left">
              
              <div className="text-center font-sans border-b border-gray-100 pb-4 mb-4">
                <h3 className="font-extrabold text-xl text-[#0B4D2E]">KaziTZ Portal</h3>
                <p className="text-xs text-gray-500 mt-1">Unda akaunti au ingia kuratibu matangazo yako ya ajira.</p>
              </div>

              {authError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs font-semibold mb-4 border border-rose-200">
                  ⚠️ {authError}
                </div>
              )}

              {/* Tab Mode (Login/Register) Selector */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl mb-4 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`text-xs py-2 font-bold rounded-lg transition ${
                    authMode === "login" ? "bg-white text-[#0B4D2E] shadow-xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Ingia / Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`text-xs py-2 font-bold rounded-lg transition ${
                    authMode === "register" ? "bg-white text-[#0B4D2E] shadow-xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Sajili / Register
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                
                {authMode === "register" && (
                  <>
                    {/* Role selecting toggle cards */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">Mimi ni nani? / Role *</label>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div
                          onClick={() => setAuthRole("employer")}
                          className={`border rounded-xl p-2.5 cursor-pointer flex flex-col items-center justify-center transition ${
                            authRole === "employer" ? "bg-emerald-50 border-emerald-700 text-emerald-950 font-bold" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <span>🏢 Mwajiri</span>
                          <span className="text-[9px] text-gray-400 font-normal">Natoa nafasi za kazi</span>
                        </div>
                        <div
                          onClick={() => setAuthRole("jobseeker")}
                          className={`border rounded-xl p-2.5 cursor-pointer flex flex-col items-center justify-center transition ${
                            authRole === "jobseeker" ? "bg-emerald-50 border-emerald-700 text-emerald-950 font-bold" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <span>👤 Msajili / Seeker</span>
                          <span className="text-[9px] text-gray-400 font-normal">Natafuta kazi / Apply</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Jina Kamili / Full Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="Kimarisho Juma"
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700"
                        value={nameStr}
                        onChange={(e) => setNameStr(e.target.value)}
                      />
                    </div>

                    {authRole === "employer" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Jina la Kampuni / Company Name *</label>
                        <input
                          required
                          type="text"
                          placeholder="Mf: Bongo Innovations Ltd"
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700"
                          value={companyStr}
                          onChange={(e) => setCompanyStr(e.target.value)}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Namba ya Simu / Contact Phone</label>
                      <input
                        type="text"
                        placeholder="Mf: +255 7..."
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700"
                        value={phoneStr}
                        onChange={(e) => setPhoneStr(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Anwani ya Barua Pepe / Email Address *</label>
                  <input
                    required
                    type="email"
                    placeholder="juma@kazitz.com"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700"
                    value={emailStr}
                    onChange={(e) => setEmailStr(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nywila ya Lango / password *</label>
                  <input
                    required
                    type="password"
                    placeholder="Weka nywila kuanzia herufi 6"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-700"
                    value={passwordStr}
                    onChange={(e) => setPasswordStr(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0B4D2E] hover:bg-[#1A7A4A] transition text-white px-4 py-3 rounded-lg text-xs font-bold shadow-xs text-center block"
                >
                  {authMode === "login" ? "Ingia Sasa / Sign In →" : "Sajili Akaunti / Create Account →"}
                </button>

                <div className="text-center pt-2 font-mono text-[10px] text-gray-400">
                  Demo login email for test: <code>seeker@kazitz.com</code> or <code>employer@kazitz.com</code>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DASHBOARD ROUTER */}
        {screen === "dashboard" && currentUser && (
          <div className="space-y-6">
            {currentUser.role === "employer" ? (
              <EmployerDashboard
                jobs={jobs}
                applications={applications}
                currentUser={currentUser}
                onPostJob={handlePostJob}
                onDeleteJob={handleDeleteJob}
                onUpdateJobStatus={handleUpdateJobStatus}
                onUpdateApplicationStatus={handleUpdateApplicationStatus}
                onUpgradePlan={handleUpgradePlan}
                onSaveAuditResult={handleSaveAuditResult}
              />
            ) : (
              <JobseekerDashboard
                applications={applications}
                currentUser={currentUser}
                onUpdateProfile={handleUpdateSeekerProfile}
              />
            )}
          </div>
        )}

        {/* ROADMAP & FIREBASE GUIDE SCREEN */}
        {screen === "guide" && (
          <div className="space-y-6 text-left select-none">
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-xs">
              <span className="text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-3 py-1">
                📖 FIREBASE DATA ARCHITECTURE GUIDE · STEP 2
              </span>
              <h2 className="text-[#0B4D2E] font-extrabold text-xl md:text-2xl tracking-tight mt-3">
                KaziTZ Data Modeling Blueprint
              </h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Platform imesanifiwa kwa usanifu dhabiti na tayari kuhamia cloud katika hifadhidata ya <strong>Firebase Firestore</strong> pamoja na <strong>Firebase Authentication</strong>. Zifuatazo ni match blueprints na collections halisi tulizosanifu hapa chini kwa hatua yako inayofuata:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                
                {/* Collection Blueprints */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm text-[#0B4D2E] uppercase tracking-wider border-b border-gray-100 pb-2">
                    Firestore Collections Schema
                  </h3>

                  {[
                    { path: "users/{uid}", desc: "Uandikishaji mkuu wa kimalipo, majukumu ('employer' | 'jobseeker'), herufi, mkoa na ujuzi." },
                    { path: "jobs/{jobId}", desc: "Uhifadhi wa matangazo ikiwemo kichwa cha kazi, sekta, mshahara wa chini/juu, data ya utoaji na hali na sifa zote." },
                    { path: "applications/{appId}", desc: "Mwasilisho wa wasifu wa wagombea unaounganishwa na jobId, ukiwa na alama ya uauditi wa AI (score na rationale list)." },
                    { path: "transactions/{txId}", desc: "Taarifa za malipo kamilifu ya mitandao ya simu (Lipa M-Pesa TZS 15,000) kuongeza sifa ya dhahabu." },
                  ].map((col) => (
                    <div key={col.path} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <code className="text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold block w-fit mb-1.5">
                        /{col.path}
                      </code>
                      <p className="text-xs text-gray-600 leading-relaxed">{col.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Firestore Security rules mockup */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm text-[#0B4D2E] uppercase tracking-wider border-b border-gray-100 pb-2">
                    Firestore Security Rules (Standard 2026)
                  </h3>

                  <div className="bg-emerald-950 p-4 rounded-xl border border-emerald-800 text-emerald-300 font-mono text-[10px] md:text-xs leading-relaxed max-h-[360px] overflow-y-auto">
                    <span className="text-gray-400 block pb-2">// firestore.rules</span>
                    rules_version = '2';<br/>
                    service cloud.firestore &#123;<br/>
                    &nbsp;&nbsp;match /databases/$(database)/documents &#123;<br/>
                    <br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">// Master gate - block shadow updates</span><br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;match /users/&#123;userId&#125; &#123;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read: if true;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow write: if request.auth != null && request.auth.uid == userId;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br/>
                    <br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;match /jobs/&#123;jobId&#125; &#123;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read: if true;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow create: if request.auth != null && request.resource.data.employerId == request.auth.uid;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow update, delete: if request.auth != null && resource.data.employerId == request.auth.uid;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br/>
                    <br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;match /applications/&#123;appId&#125; &#123;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow create: if request.auth != null;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read, update: if request.auth != null && (request.auth.uid == resource.data.seekerId || request.auth.uid == resource.data.employerId);<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br/>
                    &nbsp;&nbsp;&#125;<br/>
                    &#125;
                  </div>
                </div>

              </div>
              
              {/* Integration steps */}
              <div className="border-t border-gray-100 pt-5 mt-6">
                <h3 className="font-extrabold text-sm text-[#0B4D2E] uppercase tracking-wider mb-3">Hatua za Kujiunga na Cloud Firebase</h3>
                <div className="space-y-3 pl-1 text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="bg-emerald-800 text-white font-mono rounded-full h-5 w-5 flex items-center justify-center shrink-0">1</span>
                    <p className="leading-relaxed">Fungua mradi mpya kwenye <strong>Firebase Console</strong> (console.firebase.google.com) ukiupa jina la KaziTZ.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-emerald-800 text-white font-mono rounded-full h-5 w-5 flex items-center justify-center shrink-0">2</span>
                    <p className="leading-relaxed">Washa <strong>Firestore Database</strong> na uongeze anwani za mawasiliano katika <strong>Authentication Panel</strong> (Email provider na Google Login).</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-emerald-800 text-white font-mono rounded-full h-5 w-5 flex items-center justify-center shrink-0">3</span>
                    <p className="leading-relaxed">Copy msimbo wa <code>firebaseConfig</code> na uweke kwenye kadi ya maelezo ya mfumo wetu ili kupata ulinganifu na wasilisho moja kwa moja na cloud.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Dynamic Toast Alerts */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-950 text-white border border-emerald-800 px-5 py-3 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 z-50 animate-slide-up select-none whitespace-nowrap">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" /> {toastMessage}
        </div>
      )}

      {/* Elegant Foothold Footer */}
      <footer className="bg-[#0B4D2E] text-emerald-200 border-t border-emerald-950 select-none font-sans text-xs pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-8 text-left pb-8 border-b border-emerald-800">
          <div>
            <h3 className="font-extrabold text-[#F5A623] text-sm mb-3">KaziTZ</h3>
            <p className="text-[11px] opacity-75 leading-relaxed">
              Tanzania's modern recruiting board. Building high-performance connections between organizations and professionals using advanced automated screening.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-2">Kurasa Haraka / Quick Links</h4>
            <ul className="space-y-1.5 opacity-80 text-[11px]">
              <li className="hover:text-gold cursor-pointer" onClick={() => setScreen("landing")}>Tafuta Kazi</li>
              <li className="hover:text-gold cursor-pointer" onClick={() => { setAuthMode("register"); setScreen("auth"); }}>Sajili Kampuni</li>
              <li className="hover:text-gold cursor-pointer" onClick={() => setScreen("guide")}>Firestore DB Arch</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-2">Simulated Services</h4>
            <div className="space-y-2 text-[11px] opacity-80">
              <span className="block">🏢 Lipia Ankara via M-Pesa TZS 15,000</span>
              <span className="block">🤖 AI Grading Powered with Gemini 3.5</span>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 pt-6 text-center text-[10px] opacity-60">
          © {new Date().getFullYear()} KaziTZ. Haki zote zimehifadhiwa. Designed with custom bento layout patterns.
        </div>
      </footer>

    </div>
  );
}
