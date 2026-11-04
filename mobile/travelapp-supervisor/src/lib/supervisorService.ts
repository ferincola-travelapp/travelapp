import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface SupervisorData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  supervisorCode: string;
  downloadUrl: string;
  qrImageUrl: string;
}

export interface FleetMetrics {
  totalRecruited: number;
  activeDriversToday: number;
  fleetRevenueMonth: number;
  companyFee: number;
  supervisorCommission: number;
}

export interface DriverItem {
  id: string;
  name: string;
  email?: string;
  phone: string;
  vehicle: string;
  plate: string;
  status: 'Activo' | 'En Ruta' | 'Inactivo';
  cashBalance: number;
  totalEarnings?: number;
  tripsMonth: number;
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  supervisorId?: string;
  supervisorCode?: string;
  registrationType?: 'supervisor' | 'direct';
  vehiclePhotoUrl?: string;
  profilePhotoUrl?: string;
  rating?: number;
  isApproved?: boolean;
  isSuspended?: boolean;
  insuranceExpiry?: string;
  licenseExpiry?: string;
  rtoExpiry?: string;
}

export const MASTER_ADMIN_EMAILS = [
  'fernando@travelapp.ar',
  'ferincola@gmail.com',
  'edgar@travelapp.ar',
  'carlos@travelapp.ar',
];

/**
 * Obtiene o inicializa el perfil y código único del supervisor en Firestore
 */
export async function getOrInitSupervisorProfile(): Promise<SupervisorData | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const uid = currentUser.uid;
  const email = (currentUser.email || '').toLowerCase().trim();
  const displayName = currentUser.displayName || (email.includes('@') ? email.split('@')[0] : 'Supervisor');

  try {
    const userDocRef = doc(db, 'users', uid);
    const supDocRef = doc(db, 'supervisors', uid);
    const [snap, supSnap] = await Promise.all([getDoc(userDocRef), getDoc(supDocRef)]);
    let supervisorCode = '';
    let phone = currentUser.phoneNumber || '';

    const isMaster = MASTER_ADMIN_EMAILS.includes(email);
    const userData = snap.exists() ? snap.data() : null;
    const supData = supSnap.exists() ? supSnap.data() : null;
    const isAuthorizedRole =
      isMaster ||
      supSnap.exists() ||
      userData?.role === 'supervisor' ||
      userData?.role === 'admin';

    if (!isAuthorizedRole) {
      throw new Error('UNAUTHORIZED_ROLE');
    }

    if (userData) {
      supervisorCode = userData.supervisorCode || userData.referralCode || '';
      if (userData.phone) phone = userData.phone;
    }
    if (!supervisorCode && supData?.supervisorCode) {
      supervisorCode = supData.supervisorCode;
    }

    // Si aún no tiene código único generado, generamos uno permanente y formal
    if (!supervisorCode) {
      let cleanPrefix = (email.split('@')[0] || displayName).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanPrefix.length < 3) cleanPrefix = 'SUP';
      const cleanSuffix = uid.substring(0, 4).toUpperCase();
      supervisorCode = `SUP-${cleanPrefix.slice(0, 8)}-${cleanSuffix}`;

      await setDoc(userDocRef, {
        supervisorCode,
        email,
        name: displayName,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});

      // Guardar también en colección supervisores para indexación rápida
      await setDoc(supDocRef, {
        uid,
        name: displayName,
        email,
        phone,
        supervisorCode,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }

    const downloadUrl = `https://travelapp.ar/descargas/conductor?ref=${supervisorCode}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=12&data=${encodeURIComponent(downloadUrl)}`;

    return {
      uid,
      name: displayName,
      email,
      phone,
      supervisorCode,
      downloadUrl,
      qrImageUrl,
    };
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED_ROLE') {
      throw err;
    }
    console.warn('Error al obtener o inicializar perfil de supervisor:', err);
    // Fallback seguro en memoria con UID real
    const fallbackCode = `SUP-${uid.substring(0, 6).toUpperCase()}`;
    const downloadUrl = `https://travelapp.ar/descargas/conductor?ref=${fallbackCode}`;
    return {
      uid,
      name: displayName,
      email,
      phone: currentUser.phoneNumber || '',
      supervisorCode: fallbackCode,
      downloadUrl,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=12&data=${encodeURIComponent(downloadUrl)}`,
    };
  }
}

/**
 * Actualiza vencimientos de documentación y estado operativo de un conductor en tiempo real
 */
export async function updateDriverComplianceAndDocs(
  driverId: string,
  updates: {
    insuranceExpiry?: string;
    licenseExpiry?: string;
    rtoExpiry?: string;
    isApproved?: boolean;
    isSuspended?: boolean;
  }
): Promise<void> {
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.insuranceExpiry !== undefined) payload.insuranceExpiry = updates.insuranceExpiry;
  if (updates.licenseExpiry !== undefined) payload.licenseExpiry = updates.licenseExpiry;
  if (updates.rtoExpiry !== undefined) payload.rtoExpiry = updates.rtoExpiry;
  if (updates.isApproved !== undefined) payload.isApproved = updates.isApproved;
  if (updates.isSuspended !== undefined) {
    payload.isSuspended = updates.isSuspended;
    if (updates.isSuspended) {
      payload.isOnline = false;
    }
  }

  await setDoc(doc(db, 'drivers', driverId), payload, { merge: true });
  await setDoc(doc(db, 'users', driverId), payload, { merge: true }).catch(() => {});

  // Registro inmutable en audit_logs
  await addDoc(collection(db, 'audit_logs'), {
    action: 'driver_compliance_update',
    supervisorId: auth.currentUser?.uid || 'unknown',
    supervisorEmail: auth.currentUser?.email || '',
    targetDriverId: driverId,
    changes: updates,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}

/**
 * Escucha conductores reales de Firestore y computa métricas
 */
export function subscribeToRealFleet(
  supervisorUid: string,
  onDriversUpdate: (drivers: DriverItem[], metrics: FleetMetrics) => void
) {
  const currentUser = auth.currentUser;
  const email = (currentUser?.email || '').toLowerCase().trim();
  const displayName = currentUser?.displayName || (email.includes('@') ? email.split('@')[0] : 'SUP');
  const isMaster = MASTER_ADMIN_EMAILS.includes(email);

  let cleanPrefix = (email.split('@')[0] || displayName).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanPrefix.length < 3) cleanPrefix = 'SUP';
  const cleanSuffix = (supervisorUid || '').substring(0, 4).toUpperCase();
  const deterministicCode = supervisorUid ? `SUP-${cleanPrefix.slice(0, 8)}-${cleanSuffix}` : '';

  let customSupervisorCode = deterministicCode;
  let lastSnapshot: any = null;

  const processSnapshot = (snapshot: any) => {
    if (!snapshot) return;
    const allList: DriverItem[] = [];

    snapshot.forEach((docSnap: any) => {
      const d = docSnap.data();

      const drvSupId = (d.supervisorId || '').trim();
      const drvSupCode = (d.supervisorCode || '').toUpperCase().trim();
      const regType: 'supervisor' | 'direct' =
        d.registrationType === 'direct' || (!drvSupId && !drvSupCode)
          ? 'direct'
          : 'supervisor';

      // Si es Master Admin ve toda la flota (vinculados + alta directa);
      // Si es Supervisor de flota, ve únicamente los choferes vinculados a su UID o a su Código Único
      const matchesSupervisor =
        (supervisorUid && drvSupId === supervisorUid) ||
        (customSupervisorCode && drvSupCode === customSupervisorCode) ||
        (deterministicCode && drvSupCode === deterministicCode);

      const isAssigned = isMaster || matchesSupervisor;
      if (!isAssigned) return;

      const isOnline = Boolean(d.isOnline) && !Boolean(d.isSuspended);
      const hasActiveTrip = Boolean(d.currentTripId);
      let status: 'Activo' | 'En Ruta' | 'Inactivo' = 'Inactivo';
      if (isOnline) {
        status = hasActiveTrip ? 'En Ruta' : 'Activo';
      }

      const vehicleObj = d.activeVehicle || d.vehicle || {};
      const vehicleModel = vehicleObj.model
        ? `${vehicleObj.brand || ''} ${vehicleObj.model}`.trim()
        : (d.vehicleModel || 'Vehículo no registrado');
      const plate = (vehicleObj.plate || d.licensePlate || d.plate || 'Sin Patente').toUpperCase();
      const vehiclePhotoUrl =
        d.vehiclePhotoUrl ||
        d.carPhoto ||
        vehicleObj.photoUrl ||
        vehicleObj.carPhoto ||
        d.docs?.vehiclePhoto ||
        '';
      const profilePhotoUrl = d.profilePhoto || d.photoURL || d.avatarUrl || '';
      const loc =
        d.location ||
        (typeof d.latitude === 'number' && typeof d.longitude === 'number'
          ? { latitude: d.latitude, longitude: d.longitude }
          : undefined);

      const cashBalance = Number(d.currentCommissionBalance ?? d.walletBalance ?? d.cashBalance ?? 0);
      const totalEarnings = Number(
        d.monthlyEarnings || d.totalEarnings || d.grossEarnings || 0
      );

      allList.push({
        id: docSnap.id,
        name:
          d.name ||
          d.displayName ||
          `${d.firstName || 'Conductor'} ${d.lastName || ''}`.trim() ||
          'Conductor Registrado',
        email: d.email || '',
        phone: d.phone || d.phoneNumber || '',
        vehicle: `${vehicleModel} (${plate})`,
        plate,
        status,
        cashBalance,
        totalEarnings,
        tripsMonth: Number(d.tripsCompleted || d.tripsCount || d.tripsMonth || d.totalTrips || 0),
        isOnline,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        speed: typeof d.speed === 'number' ? d.speed : 0,
        heading: typeof d.heading === 'number' ? d.heading : 0,
        supervisorId: drvSupId,
        supervisorCode: drvSupCode,
        registrationType: regType,
        vehiclePhotoUrl,
        profilePhotoUrl,
        rating: typeof d.rating === 'number' ? d.rating : 5.0,
        isApproved: d.isApproved !== false,
        isSuspended: Boolean(d.isSuspended),
        insuranceExpiry: d.insuranceExpiry || d.docs?.insuranceExpiry || '',
        licenseExpiry: d.licenseExpiry || d.docs?.licenseExpiry || '',
        rtoExpiry: d.rtoExpiry || d.docs?.rtoExpiry || '',
      });
    });

    const totalRecruited = allList.length;
    const activeDriversToday = allList.filter((x) => x.status === 'Activo' || x.status === 'En Ruta').length;

    // Calcular recaudación bruta mensual real de los móviles asignados (sin mezclar con saldo negativo/positivo de billetera)
    let fleetRevenueMonth = 0;
    allList.forEach((drv) => {
      const rev = drv.totalEarnings && drv.totalEarnings > 0 ? drv.totalEarnings : 0;
      fleetRevenueMonth += rev;
    });

    const companyFee = Math.round(fleetRevenueMonth * 0.15); // 15% Fee Empresa real
    const supervisorCommission = Math.round(companyFee * 0.10); // 10% del Fee para el supervisor

    onDriversUpdate(allList, {
      totalRecruited,
      activeDriversToday,
      fleetRevenueMonth,
      companyFee,
      supervisorCommission,
    });
  };

  if (supervisorUid) {
    getDoc(doc(db, 'users', supervisorUid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.supervisorCode || data.referralCode) {
            const resolvedCode = (data.supervisorCode || data.referralCode).toUpperCase().trim();
            if (resolvedCode && resolvedCode !== customSupervisorCode) {
              customSupervisorCode = resolvedCode;
              if (lastSnapshot) {
                processSnapshot(lastSnapshot);
              }
            }
          }
        }
      })
      .catch(() => {});
  }

  const driversRef = collection(db, 'drivers');

  const unsubscribe = onSnapshot(
    driversRef,
    (snapshot) => {
      lastSnapshot = snapshot;
      processSnapshot(snapshot);
    },
    (err) => {
      console.warn('Error escuchando conductores reales en Firestore:', err);
      onDriversUpdate([], {
        totalRecruited: 0,
        activeDriversToday: 0,
        fleetRevenueMonth: 0,
        companyFee: 0,
        supervisorCommission: 0,
      });
    }
  );

  return unsubscribe;
}
