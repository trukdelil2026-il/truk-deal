export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'negotiation' | 'closed_won' | 'closed_lost';
  source: 'landing_page' | 'manual' | 'google_sheets';
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  customerName: string;
  origin: string;
  destination: string;
  driverId?: string;
  driverName?: string;
  cargoType: string;
  weight: number; // in tons
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed';
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseType: 'C1' | 'C' | 'E';
  status: 'available' | 'on_duty' | 'resting' | 'offline';
  currentCity: string;
  vehicleNumber: string;
  lat: number;
  lng: number;
  destinationCity?: string;
  progress?: number; // 0 to 100 for simulated tracking
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  category: 'system' | 'sync' | 'lead' | 'shipment' | 'driver';
  message: string;
  user: string;
}

export interface SyncStatus {
  lastSyncTime: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  totalLeadsSynced: number;
  errorDetails?: string;
}
