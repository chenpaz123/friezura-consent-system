export interface Customer {
  phone_number: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Dog {
  id: string;
  customer_phone: string;
  name: string;
  created_at: string;
}

export interface Consent {
  id: string;
  customer_phone: string;
  dog_id: string;
  has_medical_issue: boolean;
  medical_details: string | null;
  has_behavioral_issue: boolean;
  behavioral_details: string | null;
  agreed_to_terms: boolean;
  signature_data: string;
  created_at: string;
}

/** Consent row joined with the customer + dog it belongs to, as returned to the admin dashboard. */
export interface ConsentWithRelations extends Consent {
  customers: Pick<Customer, "full_name" | "phone_number"> | null;
  dogs: Pick<Dog, "name"> | null;
}

/** `/api/customers/lookup` returns nothing but the caller's dog names — see that route for why. */
export type LookupCustomerResponse = string[];

export interface QuestionnaireAnswers {
  hasMedicalIssue: boolean;
  medicalDetails: string;
  hasBehavioralIssue: boolean;
  behavioralDetails: string;
}

export interface CreateConsentPayload {
  customerPhone: string;
  fullName: string;
  /** Always the dog's name, whether picked from the phone's existing dogs or freshly typed — dogs are resolved/deduped by name, not id, since the lookup API never exposes ids. */
  dogName: string;
  hasMedicalIssue: boolean;
  medicalDetails: string;
  hasBehavioralIssue: boolean;
  behavioralDetails: string;
  agreedToTerms: boolean;
  signatureData: string;
}
