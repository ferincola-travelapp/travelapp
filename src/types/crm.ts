import { PointTransaction } from './rewards';

export type Source = 'WhatsApp' | 'Web' | 'IG' | 'Messenger' | 'whatsapp' | 'web' | 'instagram' | 'messenger';
export type Unit = 
  | 'TravelCab (Usuario)' 
  | 'TravelCab (Conductor)' 
  | 'TravelApp Experience' 
  | 'TravelApp Rewards' 
  | 'TravelApp Afiliados' 
  | 'TravelApp'
  | 'TravelCab' 
  | 'Experiencias' 
  | 'Experiences' 
  | 'Rewards' 
  | 'General';
export type LeadStatus = 'Nuevos' | 'Agendados' | 'En Negociación' | 'Ganados/Perdidos' | 'En Espera Operador';
export type CustomerLevel = 1 | 2;

export interface ChatMessage {
  sender: 'Travis' | 'Client';
  message: string;
  timestamp: number;
}

// ── Family Member / Travel Companion ─────────────────────────
export type FamilyRelationship = 'Cónyuge' | 'Hijo/a' | 'Padre/Madre' | 'Hermano/a' | 'Amigo/a' | 'Colega' | 'Otro';

export interface FamilyMember {
  id: string;
  fullName: string;
  relationship: FamilyRelationship;
  documentType: DocumentType;
  documentNumber: string;
  passportExpiryDate?: string;
  dob?: string;                 // ISO date YYYY-MM-DD
  gender?: 'M' | 'F' | 'X';
  dietaryRestrictions?: string;
  medicalNotes?: string;
}

// ── Tax / Billing Data (AFIP/ARCA) ───────────────────────────
export type TaxCondition = 'Consumidor Final' | 'Responsable Inscripto' | 'Monotributista' | 'Exento';

export interface TaxData {
  taxCondition: TaxCondition;
  cuitCuil: string;
  businessName?: string;
  fiscalAddress?: string;
}

// ── Traveler Preferences (VIP) ────────────────────────────────
export interface TravelerPreferences {
  seatPreference?: 'Ventana' | 'Pasillo' | 'Adelante' | 'Indistinto';
  roomPreference?: 'Matrimonial' | 'Camas Twin' | 'Familiar' | 'Piso Alto';
  frequentFlyerProgram?: string;  // e.g. 'Aerolíneas Plus', 'LATAM Pass'
  frequentFlyerNumber?: string;
}

// ── Medical & Safety Info ─────────────────────────────────────
export interface MedicalSafetyInfo {
  allergies?: string;
  dietaryRestrictions?: string;
  medicalConditions?: string;
  mobilityAssistance?: boolean;
  mobilityNotes?: string;
  hasTravelInsurance?: boolean;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
}

// ── Customer Identity Document ────────────────────────────────
export type DocumentType = 'DNI' | 'Pasaporte' | 'Otro';

export interface CustomerDocument {
  type: DocumentType;
  number: string;
  issueDate?: string;       // ISO date
  expiryDate?: string;      // ISO date
  nationality?: string;
  issueCountry?: string;
  frontUrl?: string;        // Storage URL
  backUrl?: string;         // Storage URL (for DNI)
}

// ── Emergency Contact (Level 2) ───────────────────────────────
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;    // e.g. 'Madre', 'Cónyuge'
  email?: string;
}

// ── Customer Address ──────────────────────────────────────────
export interface CustomerAddress {
  street: string;
  number: string;
  floor?: string;
  apartment?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
}

// ── Customer Wallet Transaction ───────────────────────────────
export interface CustomerWalletTransaction {
  id: string;
  date: number;             // Timestamp (ms)
  points: number;           // Positive = earned, Negative = spent
  description: string;
  ruleApplied?: string;
}

// ── Customer Wallet ───────────────────────────────────────────
export interface CustomerWallet {
  pointsBalance: number;
  cashCredit: number;       // ARS (promotional balance)
  transactions: CustomerWalletTransaction[];
}

// ── Lead / Customer ───────────────────────────────────────────
export interface Lead {
  id: string;               // Document ID

  // ─ Level 1 — Basic (all customers) ─────────────────────────
  customerName: string;
  phone?: string;
  email?: string;
  status: LeadStatus;
  customerStatus: 'Prospecto' | 'Cliente';
  customerLevel: CustomerLevel;  // 1 = Basic, 2 = VIP
  origin: Source;
  businessUnit: Unit;
  sector?: string;
  chatHistory: ChatMessage[];
  loyaltyPoints?: number;
  pointsHistory?: PointTransaction[];
  wallet?: CustomerWallet;

  // Calendar / Meetings
  googleEventId?: string;
  meetingLink?: string;
  meetingDate?: number;     // Timestamp

  // ─ Level 2 — VIP (extended profile) ─────────────────────────
  dob?: string;             // ISO date YYYY-MM-DD
  gender?: 'M' | 'F' | 'X';
  nationality?: string;
  occupation?: string;
  document?: CustomerDocument;
  address?: CustomerAddress;
  emergencyContact?: EmergencyContact;
  allergies?: string;       // Food allergies or dietary restrictions
  dietaryRestrictions?: string;
  medicalSafety?: MedicalSafetyInfo;
  taxData?: TaxData;
  preferences?: TravelerPreferences;
  familyMembers?: FamilyMember[];
  profileCompletedPercentage?: number;
}

export type CalendarEventType = 'Entrevista' | 'Llamada' | 'Videollamada';
export type CalendarEventStatus = 'Programada' | 'Completada' | 'Cancelada';

export interface CalendarEvent {
  id?: string;
  title: string;
  time: string;             // e.g., '09:00 AM'
  date: string;             // e.g., 'YYYY-MM-DD'
  type: string;
  eventType?: CalendarEventType;
  status?: CalendarEventStatus;
  duration: string;
  color: string;
  leadId?: string;
  businessUnit?: Unit;
  sector?: string;
  meetingLink?: string;
  phone?: string;
  assignedTo?: string;
  notes?: string;
}
