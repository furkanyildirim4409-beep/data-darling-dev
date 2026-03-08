// Shared data models synced between Coach Admin Panel and Student Mobile App

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  tier: "Pro" | "Elite" | "Standard";
  compliance: number;
  readiness: number;
  injuryRisk: "Low" | "Medium" | "High";
  checkInStatus: "completed" | "missed" | "pending";
  bloodworkStatus: "up-to-date" | "pending" | "overdue";
  subscriptionExpiry: string;
  currentCalories: number;
  currentProtein: number;
  currentProgram: string;
  currentDiet: string;
}

export interface DailyCheckIn {
  date: string;
  mood: number;       // 1-10
  sleep: number;      // 1-10
  soreness: number;   // 1-10
  stress: number;     // 1-10
  notes: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  date: string;
  dueDate?: string;
  serviceType?: string;
}

export interface ProgramExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rpe: number;
  notes?: string;
  category?: string;
}

export interface AssignedProgram {
  id: string;
  title: string;
  day: string;
  exercises: ProgramExercise[];
  coachNote?: string;
}

export interface CoachStory {
  id: string;
  title: string;
  thumbnail: string;
  category: "Değişimler" | "Soru-Cevap" | "Başarılar" | "Antrenman" | "Motivasyon";
  content: {
    image: string;
    text: string;
  };
  createdAt: string;
}

export interface CoachAdjustment {
  id: string;
  athleteId: string;
  type: "intensity" | "calories" | "volume";
  value: number;
  previousValue: number;
  message: string;
  appliedAt: string;
}

export interface Notification {
  id: string | number;
  type: "coach" | "system" | "achievement" | "health" | "payment" | "program" | "checkin" | "session";
  level?: "critical" | "warning" | "info";
  title: string;
  message: string;
  time: string;
  read?: boolean;
  athleteId?: string;
  coachId?: string;
}

// Extended Athlete interface for Admin Panel (extends UserProfile with admin-specific fields)
export interface Athlete extends UserProfile {
  sport: string;
  email: string;
  phone: string;
  joinDate: string;
  lastActive: string;
  latestCheckIn?: {
    mood: number;
    sleep: number;
    soreness: number;
    stress: number;
    notes: string;
  };
  riskType?: "injury" | "nutrition" | "compliance" | "general";
}

// Extended Invoice interface for Admin Panel
export interface InvoiceAdmin extends Invoice {
  breakdown?: {
    item: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  timeline?: {
    event: string;
    date: string;
    completed: boolean;
  }[];
}

export interface BloodworkEntry {
  month: string;
  testosterone: number;
  cortisol: number;
  ratio?: number;
}

export interface AssignedNutritionPlan {
  id: string;
  athleteId: string;
  meals: {
    id: string;
    name: string;
    time: string;
    foods: {
      id: string;
      name: string;
      portion: number;
      unit: "g" | "adet" | "ml";
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }[];
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}