export type UserRole = "employer" | "jobseeker";
export type JobStatus = "active" | "closed";
export type ApplicationStatus = "pending" | "review" | "shortlisted" | "rejected";
export type PricingPlan = "free" | "premium";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  phone?: string;
  companyName?: string;
  plan?: PricingPlan;
  // Job seeker profiles
  bio?: string;
  skills?: string[];
  education?: string;
  experience?: string;
}

export interface JobListing {
  id: string;
  title: string;
  companyName: string;
  category: string;
  region: string;
  jobType: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  employerId: string;
  postedAt: string;
  status: JobStatus;
  views: number;
  applicationsCount: number;
  featured?: boolean;
  deadline?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  seekerId: string;
  seekerName: string;
  seekerEmail: string;
  seekerPhone: string;
  bio: string;
  skills: string[];
  education: string;
  experience: string;
  appliedAt: string;
  status: ApplicationStatus;
  
  // AI score evaluation
  aiScore?: number;
  aiSummary?: string;
  aiMatchingPoints?: string[];
  aiGaps?: string[];
}
