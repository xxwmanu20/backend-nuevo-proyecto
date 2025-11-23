export interface ServiceCategoryInfo {
  id: number;
  name: string;
}

export interface ProfessionalSummary {
  id: number;
  email: string;
  bio?: string;
  hourlyRate?: number;
  rating?: number;
}

export interface ServiceOfferingInfo {
  id: number;
  price: number;
  isActive: boolean;
  professional: ProfessionalSummary;
}

export interface ServiceListItem {
  id: number;
  name: string;
  description?: string;
  basePrice: number;
  category: ServiceCategoryInfo;
  offerings: ServiceOfferingInfo[];
}
