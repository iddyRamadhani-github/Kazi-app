import React, { useState } from "react";
import { Briefcase, MapPin, Search, Calendar, ChevronRight, CheckCircle, Clock, Building, Globe, ExternalLink, Sparkles } from "lucide-react";
import { JobListing, UserProfile } from "../types";

// Dynamic search lists
export const CATEGORIES = [
  "Agriculture / Kilimo",
  "NGO",
  "Technology / Teknolojia",
  "Health / Afya",
  "Finance / Fedha",
  "Education / Elimu",
  "Government / Serikali",
  "Retail / Biashara",
  "Other / Nyingine",
];

export const REGIONS = [
  "Dar es Salaam",
  "Mwanza",
  "Arusha",
  "Dodoma",
  "Mbeya",
  "Morogoro",
  "Tanga",
  "Zanzibar",
  "Mara",
  "Kagera",
  "Tabora",
  "Kigoma",
  "Lindi",
  "Mtwara",
];

interface JobFeedProps {
  jobs: JobListing[];
  currentUser: UserProfile | null;
  onApply: (
    jobId: string, 
    cvDetails: { bio: string; skills: string[]; education: string; experience: string }
  ) => Promise<void>;
  appliedJobIds: string[];
  onOpenAuth: (role: "jobseeker" | "employer") => void;
}

export default function JobFeed({ jobs, currentUser, onApply, appliedJobIds, onOpenAuth }: JobFeedProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [jobType, setJobType] = useState("all");

  const [selectedJob, setSelectedJob] = useState<JobListing | null>(jobs[0] || null);
  const [showApplyDrawer, setShowApplyDrawer] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyDone, setApplyDone] = useState(false);

  // Apply form state
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [skillsStr, setSkillsStr] = useState(currentUser?.skills?.join(", ") || "");
  const [education, setEducation] = useState(currentUser?.education || "");
  const [experience, setExperience] = useState(currentUser?.experience || "");

  // AI Web Search state
  const [mode, setMode] = useState<"portal" | "web">("portal");
  const [webJobs, setWebJobs] = useState<any[]>([]);
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [selectedWebJob, setSelectedWebJob] = useState<any | null>(null);
  const [groundingToken, setGroundingToken] = useState(false);
  const [webSearchError, setWebSearchError] = useState("");

  const handleWebSearch = async () => {
    setWebSearchLoading(true);
    setWebSearchError("");
    try {
      const response = await fetch("/api/jobs/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: search, category, region })
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.jobs)) {
        setWebJobs(data.jobs);
        setSelectedWebJob(data.jobs[0] || null);
        setGroundingToken(data.groundingUsed);
      } else {
        setWebSearchError(data.error || "Imeshindwa kupata matokeo.");
      }
    } catch (e) {
      setWebSearchError("Mawasiliano na server yameshindwa.");
    } finally {
      setWebSearchLoading(false);
    }
  };

  // Update profile inputs if user changes
  React.useEffect(() => {
    if (currentUser) {
      setBio(currentUser.bio || "");
      setSkillsStr(currentUser.skills?.join(", ") || "");
      setEducation(currentUser.education || "");
      setExperience(currentUser.experience || "");
    }
  }, [currentUser]);

  const isJobExpired = (job: JobListing) => {
    if (job.status === "closed") return true;
    if (!job.deadline) return false;
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    return job.deadline < todayStr;
  };

  // Filters logic
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.companyName.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = category === "all" || job.category === category;
    const matchesRegion = region === "all" || job.region === region;
    const matchesJobType = jobType === "all" || job.jobType.includes(jobType);
    const matchesStatus = job.status === "active";

    return matchesSearch && matchesCategory && matchesRegion && matchesJobType && matchesStatus;
  });

  // Safe renderer for simple markdown tags
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, index) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={index} className="text-sm font-bold text-emerald-950 mt-5 mb-2 uppercase tracking-wide">
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h4 key={index} className="text-xs font-bold text-gray-800 mt-4 mb-1.5 uppercase tracking-wide">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("* ") || line.startsWith("- ")) {
        return (
          <li key={index} className="text-xs text-gray-600 pl-4 list-disc marker:text-emerald-700 leading-relaxed mb-1">
            {line.substring(2)}
          </li>
        );
      }
      return (
        <p key={index} className="text-xs text-gray-700 leading-relaxed min-h-[8px] mb-2">
          {line}
        </p>
      );
    });
  };

  const currentJobApplied = selectedJob ? appliedJobIds.includes(selectedJob.id) : false;

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setApplyLoading(true);
    try {
      const skillsArray = skillsStr.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
      await onApply(selectedJob.id, {
        bio,
        skills: skillsArray,
        education,
        experience,
      });
      setApplyDone(true);
      setTimeout(() => {
        setApplyDone(false);
        setShowApplyDrawer(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none">
      
      {/* Search and Filters Sidebar (4 Columns) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-left">
          <h3 className="font-bold text-emerald-950 text-sm mb-3">Tafuta Nafasi / Search Options</h3>
          
          <div className="space-y-3">
            {/* Keyword Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Mfano: Agromonist, Mkoa, NGO..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-emerald-500 focus:border-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Sekta / Category</label>
              <select
                className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">Zote / All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Region selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Mkoa / Region</label>
              <select
                className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 outline-none"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="all">Tanzania Zote / All Regions</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Type filtering */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Aina ya Kazi / job type</label>
              <select
                className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 outline-none"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="all">Saa Yoyote / All Types</option>
                <option value="Full-time">Full-time / Wakati wote</option>
                <option value="Part-time">Part-time / Muda</option>
                <option value="Contract">Contract / Mkataba</option>
                <option value="Internship">Internship / Mafunzo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Small Stats Badge */}
        <div className="bg-gradient-to-tr from-[#0B4D2E] to-[#1A7A4A] rounded-xl p-4 text-white text-left relative overflow-hidden">
          <h4 className="text-xs uppercase opacity-75 font-bold mb-1">Hali ya Soko / Feed Market</h4>
          <span className="text-2xl font-extrabold font-mono tracking-tight">{filteredJobs.length}</span>
          <span className="text-xs ml-1.5 opacity-90">Nafasi zinazolingana / Matches active</span>
          <div className="absolute right-3 bottom-1.5 opacity-10">
            <Briefcase className="h-16 w-16" />
          </div>
        </div>
      </div>

      {/* Main listings bento feed list & detail side-panel splitting (8 Columns) */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* Toggle Mode Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
          <button
            onClick={() => setMode("portal")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              mode === "portal"
                ? "bg-white text-[#0B4D2E] shadow-xs font-extrabold"
                : "text-gray-500 hover:text-gray-855"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Nafasi za KaziTZ Portal ({filteredJobs.length})
          </button>
          
          <button
            onClick={() => {
              setMode("web");
              if (webJobs.length === 0) {
                handleWebSearch();
              }
            }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 relative ${
              mode === "web"
                ? "bg-white text-[#0B4D2E] shadow-xs font-extrabold"
                : "text-gray-500 hover:text-[#0B4D2E]"
            }`}
          >
            <Globe className="h-4 w-4 text-emerald-600" />
            Tafuta Mtandaoni (Google/LinkedIn Live)
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </button>
        </div>

        {/* Content Splitting Grid based on selected mode */}
        {mode === "portal" ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Left Side: Job Card listings list (5 columns on MD) */}
            <div className="md:col-span-5 space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredJobs.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm">
                  <span className="text-2xl block mb-2">📭</span>
                  <p className="text-xs font-semibold text-gray-600">Hakuna matokeo / No matches found</p>
                  <p className="text-[10px] text-gray-400 mt-1">Jaribu upya filters au neno kuu lingine.</p>
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const expired = isJobExpired(job);
                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`border text-left p-3.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        selectedJob?.id === job.id
                          ? "border-emerald-700 bg-emerald-50/50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 shadow-xs"
                      } ${expired ? "opacity-75 bg-gray-50/50" : ""}`}
                    >
                      <div className="flex justify-between items-start gap-1 pb-1">
                        <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{job.title}</h4>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {job.featured && (
                            <span className="bg-amber-100 text-amber-800 font-mono text-[8px] font-bold px-1 py-0.5 rounded uppercase flex-shrink-0">
                              Gold
                            </span>
                          )}
                          {expired && (
                            <span className="bg-rose-100 text-rose-800 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                              Muda Umeisha / Over
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] font-semibold text-emerald-800 line-clamp-1 flex items-center gap-1.5 mt-0.5">
                        <Building className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{job.companyName}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[10px] text-gray-500">
                        <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3 text-gray-400" /> {job.region}</span>
                        <span className="text-gray-300">|</span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{job.jobType.split(" / ")[0]}</span>
                        
                        {job.deadline && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className={`font-semibold ${expired ? "text-rose-600" : "text-gray-400"}`}>
                              Mwisho: {job.deadline}
                            </span>
                          </>
                        )}
                      </div>

                      {job.salaryMin && (
                        <p className="text-[11px] font-extrabold text-slate-800 mt-2 font-mono">
                          TZS {Number(job.salaryMin).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Side: Active Job Detail Display (7 columns on MD) */}
            <div className="md:col-span-7">
              {selectedJob ? (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[500px]">
                  <div>
                    {isJobExpired(selectedJob) && (
                      <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 animate-fadeIn">
                        <span className="text-base shrink-0 mt-0.5">⚠️</span>
                        <div>
                          <h4 className="font-extrabold uppercase text-[9px] tracking-wide text-rose-900">Muda wa Maombi Umeisha / Application Over</h4>
                          <p className="text-[11px] font-medium opacity-90 mt-0.5">
                            Nafasi hii imefungwa kwani tarehe ya mwisho ya kutuma maombi ({selectedJob.deadline || "Muda uliowekwa"}) imeshapita. Hatupokei maombi mapya kwa sasa.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-3 border-b border-gray-100 pb-3 mb-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#0B4D2E] leading-snug">{selectedJob.title}</h3>
                        <p className="text-xs font-bold text-emerald-800 mt-1.5 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 w-fit">
                          <Building className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          <span className="text-[9px] uppercase tracking-wide font-extrabold text-emerald-900">Mwajiri / Publisher:</span>
                          <span className="text-xs font-semibold text-emerald-950">{selectedJob.companyName}</span>
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                            <MapPin className="h-2.5 w-2.5 text-gray-400" /> {selectedJob.region}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                            <Clock className="h-2.5 w-2.5 text-gray-400" /> {selectedJob.jobType}
                          </span>
                        </div>
                      </div>
                      {selectedJob.featured && (
                        <span className="bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[10px] px-2 py-0.5 rounded-lg flex items-center shrink-0">
                          ⭐ Featured Post
                        </span>
                      )}
                    </div>

                    {selectedJob.salaryMin && (
                      <div className="mb-4 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase">Mshahara / Proposed Income:</span>
                        <span className="text-xs font-bold text-emerald-950 font-mono">
                          TZS {Number(selectedJob.salaryMin).toLocaleString()}
                          {selectedJob.salaryMax ? ` – TZS ${Number(selectedJob.salaryMax).toLocaleString()}` : "+"}
                        </span>
                      </div>
                    )}

                    {/* Main description viewer */}
                    <div className="prose prose-sm max-w-none pr-1 max-h-[340px] overflow-y-auto mt-2 select-text selection:bg-emerald-100 pb-5">
                      {renderMarkdownText(selectedJob.description)}
                      
                      {selectedJob.deadline && (
                        <div className={`mt-4 p-2 text-[10px] font-semibold rounded flex items-center gap-1.5 w-fit ${
                          isJobExpired(selectedJob) 
                            ? "bg-rose-50 text-rose-800 border border-rose-100" 
                            : "bg-amber-50 text-amber-800"
                        }`}>
                          <Calendar className="h-3.5 w-3.5" /> Tarehe ya Mwisho / Deadline: {selectedJob.deadline} {isJobExpired(selectedJob) ? "(Umeisha / Over)" : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Apply parameters */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    {currentUser?.role === "employer" ? (
                      <div className="p-3 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-lg text-center">
                        Akaunti yako ni ya Mwajiri. Toka ili kuomba kazi kama msajili mwingine.
                      </div>
                    ) : currentJobApplied ? (
                      <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1.5 border border-emerald-200">
                        <CheckCircle className="h-4 w-4" /> Ulishajaza maombi ya nafasi hii! / Applied Already
                      </div>
                    ) : isJobExpired(selectedJob) ? (
                      <div className="p-3 bg-red-50 text-red-800 text-xs font-extrabold rounded-lg text-center flex items-center justify-center gap-1.5 border border-red-200 select-none">
                        <Clock className="h-4 w-4 text-red-600 animate-pulse" /> Muda wa Maombi Umeisha / Application Over
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!currentUser) {
                            onOpenAuth("jobseeker");
                          } else {
                            setShowApplyDrawer(true);
                          }
                        }}
                        className="w-full bg-[#0B4D2E] hover:bg-[#1A7A4A] transition text-white text-xs font-bold py-3 rounded-lg text-center block shadow-xs"
                      >
                        {currentUser ? "Omba Kazi Sasa / Apply Now" : "Ingia kuomba kazi / Sign in to Apply"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500 shadow-sm min-h-[400px] flex items-center justify-center">
                  <div>
                    <p className="text-xs">Chagua tangazo kushoto ili kuona maelezo ya kazi</p>
                    <p className="text-[10px] text-gray-400 mt-1">Select a job post to view parameters & apply</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Left Side: Web Search Results List (5 columns on MD) */}
            <div className="md:col-span-5 space-y-2 max-h-[640px] overflow-y-auto pr-1">
              
              {/* Trigger manual search / status button */}
              <button
                onClick={handleWebSearch}
                disabled={webSearchLoading}
                className="w-full bg-[#0B4D2E] hover:bg-[#1A7A4A] text-white text-xs font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 transition duration-150 shadow-xs mb-2.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                {webSearchLoading ? "Inasaka sasa hivi mtandaoni..." : "Tafuta sasa mtandaoni / Search Web Now"}
              </button>

              {webSearchLoading ? (
                <div className="space-y-2.5 py-4 text-left">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse space-y-2.5">
                      <div className="h-3.5 bg-gray-200 rounded-md w-3/4"></div>
                      <div className="h-3 bg-gray-150 rounded-md w-1/2"></div>
                      <div className="h-2.5 bg-gray-100 rounded-md w-1/3"></div>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-500 text-center animate-bounce mt-3 font-semibold">
                    Inasaka kazi zote mpya za Tanzania, LinkedIn & Google kwa kutumia Google Search Grounding...
                  </p>
                </div>
              ) : webSearchError ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-xs">
                  <span className="text-xl block mb-1">⚠️</span>
                  <p className="text-xs font-bold text-gray-750">{webSearchError}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Hakikisha una mtandao na kisha ubonyeze tafuta tena upya.</p>
                </div>
              ) : webJobs.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm">
                  <span className="text-2xl block mb-2">🔍</span>
                  <p className="text-xs font-semibold text-gray-600">Hakuna matokeo ya mtandao kwa sasa</p>
                  <button
                    onClick={handleWebSearch}
                    className="text-xs text-[#0B4D2E] font-bold underline mt-2"
                  >
                    Bofya hapa kuanza kusaka na AI
                  </button>
                </div>
              ) : (
                webJobs.map((job, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedWebJob(job)}
                    className={`border text-left p-3.5 rounded-xl cursor-pointer transition-all duration-150 ${
                      selectedWebJob?.title === job.title && selectedWebJob?.company === job.company
                        ? "border-emerald-700 bg-emerald-50/50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-200 shadow-xs"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1 pb-1">
                      <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{job.title}</h4>
                      <span className="bg-emerald-100 text-emerald-900 font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                        {job.source || "Web"}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-800 line-clamp-1 flex items-center gap-1 mt-0.5">
                      <Building className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{job.company}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3 text-gray-400" /> {job.region}</span>
                      {job.datePosted && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="font-semibold text-gray-400">{job.datePosted}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right Side: Active Web Job Detail Display (7 columns on MD) */}
            <div className="md:col-span-7">
              {selectedWebJob ? (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[500px]">
                  <div>
                    <div className="flex justify-between items-start gap-3 border-b border-gray-100 pb-3 mb-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#0B4D2E] leading-snug">{selectedWebJob.title}</h3>
                        <p className="text-xs font-bold text-emerald-800 mt-1.5 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 w-fit">
                          <Building className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          <span className="text-[9px] uppercase tracking-wide font-extrabold text-emerald-900">Mwajiri / Brand:</span>
                          <span className="text-xs font-semibold text-emerald-950">{selectedWebJob.company}</span>
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                            <MapPin className="h-2.5 w-2.5 text-gray-400" /> {selectedWebJob.region}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-bold">
                            Source: {selectedWebJob.source}
                          </span>
                        </div>
                      </div>
                      
                      <span className="bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[10px] px-2 py-0.5 rounded-lg flex items-center shrink-0">
                        🌐 Web Live
                      </span>
                    </div>

                    {/* AI Grounding info ribbon */}
                    <div className="mb-4 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex items-start gap-2 text-[10px] text-emerald-900 leading-relaxed font-medium">
                      <span className="text-emerald-700 font-bold">✨ AI:</span>
                      <p>
                        {groundingToken ? (
                          "Kazi hii imepatikana hivi sasa kupitia Google Search Grounding AI kulingana na vigezo vya mkoa na sekta ulivyochagua hapa Tanzania."
                        ) : (
                          "Ili kupata sachi mubashara kutoka mitandao yote mipya ya kibiashara, weka Gemini API Key katika Secrets. Hivi sasa unaona fursa maarufu nchini."
                        )}
                      </p>
                    </div>

                    {/* Main description viewer */}
                    <div className="prose prose-sm max-w-none pr-1 max-h-[340px] overflow-y-auto mt-2 select-text selection:bg-emerald-100 pb-5">
                      {selectedWebJob.description ? (
                        selectedWebJob.description.split("\n").map((line: string, index: number) => (
                          <p key={index} className="text-xs text-gray-700 leading-relaxed mb-2.5">{line}</p>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic">Hakuna maelezo zaidi ya wasifu yaliyopatikana kwa ajira hii.</p>
                      )}
                    </div>
                  </div>

                  {/* Action Link Out parameters */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <a
                      href={selectedWebJob.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#0B4D2E] hover:bg-[#1A7A4A] transition text-white text-xs font-bold py-3 rounded-lg text-center flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span>Omba Kwenye Chanzo / View & Apply via {selectedWebJob.source || "LinkedIn"}</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
                      Utahamishiwa kwenye tovuti au chanzo cha ajira kukamilisha fomu husika.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500 shadow-sm min-h-[400px] flex items-center justify-center">
                  <div>
                    <p className="text-xs">Chagua tangazo la mtandaoni kushoto ili kulihakiki</p>
                    <p className="text-[10px] text-gray-400 mt-1">Select a web job to review full snippet & link</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Slide-Up Application Drawer */}
      {showApplyDrawer && selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-end select-none">
          <div className="bg-white w-full max-w-xl rounded-t-2xl p-6 shadow-xl max-h-[85vh] overflow-y-auto animate-slide-up text-left">
            
            <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-[#0B4D2E]">Kamilisha Maombi yako</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <span>{selectedJob.title}</span>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#0B4D2E]">
                    <Building className="h-3 w-3 text-emerald-700" />
                    {selectedJob.companyName}
                  </span>
                </p>
              </div>
              <button 
                onClick={() => setShowApplyDrawer(false)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1 bg-gray-50 rounded"
              >
                X
              </button>
            </div>

            {applyDone ? (
              <div className="p-8 text-center space-y-3">
                <div className="h-14 w-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 animate-bounce" />
                </div>
                <h4 className="font-bold text-[#0B4D2E] text-sm md:text-base">Hongera, Ombi Limesajiliwa!</h4>
                <p className="text-xs text-emerald-700">Maombi yako yametumwa na yakisindikizwa na Akili Mnemba yetu.</p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Maelezo yako Mafupi / Your Cover Pitch *
                  </label>
                  <textarea
                    required
                    placeholder="Mweleze mwajiri kwa ufupi kwanini unajiona unafaa kwa kazi hii..."
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 h-20"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ujuzi wako / Core Skills (zilizotengwa kwa alama ya mkato) *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Agronomy, Soils, Communication, Report Writing"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    value={skillsStr}
                    onChange={(e) => setSkillsStr(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Elimu / Education History *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Bachelor in Agronomy (SUA)"
                      className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Uzoefu / Work Summary *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Miaka 2 kama Afisa Vijijini"
                      className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={applyLoading}
                  className="w-full bg-[#0B4D2E] hover:bg-[#1A7A4A] transition text-white px-4 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {applyLoading ? "Inatuma ombi..." : "🚀 Tuma Maombi sasa / Submit Application"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
