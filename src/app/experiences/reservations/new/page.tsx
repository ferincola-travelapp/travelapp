'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Ticket, Save, ArrowLeft, CheckCircle2, RefreshCw, Sparkles, User,
  Landmark, Phone, Mail, CreditCard, DollarSign, Calendar, MapPin,
  Users, Plus, Trash2, ShieldCheck, UserPlus, AlertCircle, FileText,
  Clock, ArrowRight, ExternalLink, QrCode, Plane, Bus, Hotel,
  Briefcase, Percent, Award, ShoppingBag, X, Copy, Check, Smartphone
} from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Tour, OrganizedTripQuote, RoomCategory, calculateTimeToPayDeadline,
  IndependentSupplierService, CommercialAllocation, ServiceCategory,
  LiquidationPricingMode, IvaRate, OperatorCustomChargeItem
} from '@/types/experiences';

interface Customer {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  dni?: string;
  familyMembers?: {
    id: string;
    fullName: string;
    relationship: string;
    documentType: string;
    documentNumber: string;
    dob?: string;
  }[];
}

interface StaffOption {
  id: string;
  name: string;
  cargo: string;
  commissionPercent: number;
}

interface AffiliateOption {
  id: string;
  name: string;
  refCode: string;
  commissionPct: number;
}

interface PassengerEntry {
  fullName: string;
  dni: string;
  dob: string;
  dietaryRestrictions: string;
  isTitular: boolean;
}

function NewReservationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramQuoteId = searchParams.get('quoteId');
  const paramTitle = searchParams.get('title');
  const paramPrice = searchParams.get('price');
  const paramCurrency = searchParams.get('currency');

  // Firebase Realtime State
  const [tours, setTours] = useState<Tour[]>([]);
  const [quotes, setQuotes] = useState<OrganizedTripQuote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [affiliatesList, setAffiliatesList] = useState<AffiliateOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard Steps: 1: Viaje | 2: Cliente | 3: Pasajeros | 4: Pagos & Emisión
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Viaje / Cotización / Multi-Operador
  const [tripSource, setTripSource] = useState<'catalog' | 'quote' | 'multi_operator' | 'custom'>(
    paramQuoteId ? 'quote' : 'catalog'
  );
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(paramQuoteId || '');
  const [customTitle, setCustomTitle] = useState<string>(paramTitle || '');
  const [customDestination, setCustomDestination] = useState<string>('');
  const [customDates, setCustomDates] = useState<string>('2026-10-15 al 2026-10-20');
  const [selectedRoomCategory, setSelectedRoomCategory] = useState<RoomCategory>('doble');
  const [unitPrice, setUnitPrice] = useState<number>(paramPrice ? Number(paramPrice) : 150000);
  const [currency, setCurrency] = useState<'ARS' | 'USD'>((paramCurrency as any) || 'ARS');

  // Grilla de Servicios Independientes Multi-Operador
  const [independentServices, setIndependentServices] = useState<IndependentSupplierService[]>([
    {
      id: 'srv-1',
      category: 'Aereo',
      providerName: 'Logan Travel',
      bookingLocator: 'PNR-8921',
      description: 'Vuelo BUE - BRC - BUE con equipaje despachado',
      pricingMode: 'comision_mayorista',
      currency: 'USD',
      grossPrice: 450,
      operatorCommissionPercent: 10,
      operatorCommissionAmount: 45,
      adminFeeAmount: 15,
      bankTaxAmount: 5.4,
      ivaRate: '21',
      ivaAmount: 9.45,
      netToPayOperator: 434.85,
      agencyGrossProfit: 15.15,
      paymentDeadline: '2026-09-01',
      paymentStatus: 'Pendiente'
    },
    {
      id: 'srv-2',
      category: 'Hotel',
      providerName: 'Julia Tours',
      bookingLocator: 'HTL-449',
      description: 'Hotel Panamericano Bariloche 4 Noches con Desayuno',
      pricingMode: 'comision_mayorista',
      currency: 'USD',
      grossPrice: 600,
      operatorCommissionPercent: 12,
      operatorCommissionAmount: 72,
      adminFeeAmount: 12,
      bankTaxAmount: 7.2,
      ivaRate: '21',
      ivaAmount: 15.12,
      netToPayOperator: 562.32,
      agencyGrossProfit: 37.68,
      paymentDeadline: '2026-09-10',
      paymentStatus: 'Pendiente'
    }
  ]);

  // Step 2: Cliente
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerEmail, setPassengerEmail] = useState<string>('');
  const [passengerPhone, setPassengerPhone] = useState<string>('');
  const [passengerDni, setPassengerDni] = useState<string>('');

  // Modal Alta Rápida de Cliente
  const [showNewCustomerModal, setShowNewCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustDni, setNewCustDni] = useState<string>('');
  const [creatingCustomer, setCreatingCustomer] = useState<boolean>(false);

  // Step 3: Pasajeros
  const [paxCount, setPaxCount] = useState<number>(2);
  const [passengers, setPassengers] = useState<PassengerEntry[]>([
    { fullName: '', dni: '', dob: '', dietaryRestrictions: 'Ninguna', isTitular: true },
    { fullName: '', dni: '', dob: '', dietaryRestrictions: 'Ninguna', isTitular: false }
  ]);

  // Step 4: Comercial & Vendedor / Promotor
  const [sellerId, setSellerId] = useState<string>('');
  const [sellerName, setSellerName] = useState<string>('');
  const [sellerCommissionPercent, setSellerCommissionPercent] = useState<number>(3.0);

  const [promoterId, setPromoterId] = useState<string>('');
  const [promoterName, setPromoterName] = useState<string>('');
  const [promoterCommissionPercent, setPromoterCommissionPercent] = useState<number>(0);

  // Step 4: Pagos & Emisión
  const [branchId, setBranchId] = useState<string>('1');
  const [paymentPlan, setPaymentPlan] = useState<'total' | 'deposit' | 'installments'>('deposit');
  const [depositPercent, setDepositPercent] = useState<number>(30);
  const [paidNowAmount, setPaidNowAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferencia Bancaria');
  const [paymentNotes, setPaymentNotes] = useState<string>('Seña de confirmación de reserva');

  // Submission State & Nave Galicia Intent
  const [saving, setSaving] = useState<boolean>(false);
  const [successReservationId, setSuccessReservationId] = useState<string | null>(null);
  const [successFileNumber, setSuccessFileNumber] = useState<string>('');
  const [naveIntentLoading, setNaveIntentLoading] = useState<boolean>(false);
  const [generatedNaveUrl, setGeneratedNaveUrl] = useState<string | null>(null);
  const [generatedNaveQr, setGeneratedNaveQr] = useState<string | null>(null);
  const [copiedSuccessLink, setCopiedSuccessLink] = useState<boolean>(false);

  // Handler para invocar Nave Banco Galicia en el momento de crear el expediente
  const handleGenerateNavePayment = async (fileCode: string, amount: number, tripName: string) => {
    setNaveIntentLoading(true);
    setCopiedSuccessLink(false);
    try {
      const resp = await fetch('/api/checkout/nave-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalPaymentId: fileCode,
          amount: amount || 1,
          currency,
          productName: tripName,
          reservationId: fileCode,
          buyer: {
            name: passengerName,
            email: passengerEmail,
            phone: passengerPhone,
            docNumber: passengerDni
          }
        })
      });
      const data = await resp.json();
      if (data.success && data.checkoutUrl) {
        setGeneratedNaveUrl(data.checkoutUrl);
        setGeneratedNaveQr(data.qrData);
      } else {
        alert(`Error al generar cobro en Nave Galicia: ${data.error || 'Respuesta inválida'}`);
      }
    } catch (err: any) {
      console.error('Error invoking Nave intent:', err);
      alert(`Error de red al conectar con Nave Banco Galicia: ${err.message}`);
    } finally {
      setNaveIntentLoading(false);
    }
  };

  // 1. Sync Tours, Quotes, Customers, Staff (RRHH) & Affiliates
  useEffect(() => {
    // A. Sync experiences catalog (Receptivo) + ota_packages (Emisivo) en memoria para el ERP sin mezclar colecciones en Firestore
    let receptivoTours: Tour[] = [];
    let emisivoTours: Tour[] = [];
    const mergeErpTours = () => {
      const combined = [...receptivoTours, ...emisivoTours];
      setTours(combined);
      if (!selectedTourId && combined.length > 0 && !paramQuoteId) {
        setSelectedTourId(combined[0].id);
      }
    };

    const unsubTours = onSnapshot(collection(db, 'experiences'), (snap) => {
      receptivoTours = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tour));
      mergeErpTours();
    });

    const unsubOtaTours = onSnapshot(collection(db, 'ota_packages'), (snap) => {
      emisivoTours = snap.docs.map(d => {
        const pkg = d.data();
        return {
          id: d.id,
          title: pkg.title || d.id,
          location: `${pkg.destination || ''}, ${pkg.country || ''}`.replace(/^,\s*|,\s*$/g, ''),
          price: Number(pkg.price || 0),
          currency: pkg.currency || 'USD',
          priceRewards: Number(pkg.memberPrice || Math.round((pkg.price || 0) * 0.9)),
          pointsEarned: Number(pkg.rewardsPointsEarned || 500),
          tripType: pkg.modality === 'Salida Grupal Acompañada' ? 'Grupal' : 'Individual',
          scope: pkg.region === 'Nacional' ? 'Nacional' : 'Internacional',
          tourismVertical: 'emisivo',
          productType: pkg.type === 'crucero' ? 'crucero' : pkg.providerCategory === 'propio' ? 'salida_propia' : 'operador_mayorista',
          transportation: `${pkg.transportType || ''} ${pkg.airline || ''}`.trim(),
          departureDate: pkg.departureDates?.[0] || '2026-11-12',
          departureOrigin: pkg.departureOrigin || 'Buenos Aires',
          services: pkg.includedServices || [],
          imageUrl: pkg.imageUrl || '',
          description: pkg.description || '',
          availability: 'Disponible',
        } as Tour;
      });
      mergeErpTours();
    });

    // B. Sync experience_quotes
    const unsubQuotes = onSnapshot(collection(db, 'experience_quotes'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrganizedTripQuote));
      setQuotes(list);
    });

    // C. Sync ecosystem customers from BOTH crm_customers and users
    let usersList: Customer[] = [];
    let crmList: Customer[] = [];

    const mergeCustomers = () => {
      const mergedMap = new Map<string, Customer>();
      crmList.forEach(c => {
        const key = (c.email?.toLowerCase().trim() || c.dni || c.id);
        mergedMap.set(key, c);
      });
      usersList.forEach(u => {
        const key = (u.email?.toLowerCase().trim() || u.dni || u.id);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, u);
        } else {
          const existing = mergedMap.get(key)!;
          if (!existing.phone && u.phone) existing.phone = u.phone;
          if (!existing.dni && u.dni) existing.dni = u.dni;
        }
      });
      setCustomers(Array.from(mergedMap.values()));
      setLoading(false);
    };

    const unsubCrm = onSnapshot(collection(db, 'crm_customers'), (snap) => {
      crmList = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          displayName: data.displayName || data.customerName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Cliente CRM',
          email: data.email || '',
          phone: data.phone || data.mobilePhone || '',
          dni: data.dni || data.document?.number || data.documentNumber || '',
          familyMembers: data.familyMembers || []
        };
      });
      mergeCustomers();
    }, () => setLoading(false));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      usersList = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          displayName: data.displayName || data.customerName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Usuario App',
          email: data.email || '',
          phone: data.phone || '',
          dni: data.dni || data.documentNumber || '',
          familyMembers: data.familyMembers || []
        };
      });
      mergeCustomers();
    }, () => setLoading(false));

    // D. Sync HR Staff for Seller selection
    const unsubStaff = onSnapshot(collection(db, 'hr_staff'), (snap) => {
      if (!snap.empty) {
        const list: StaffOption[] = snap.docs.map(d => ({
          id: d.id,
          name: d.data().name || 'Empleado',
          cargo: d.data().cargo || 'Asesor Comercial',
          commissionPercent: Number(d.data().commissionPercent !== undefined ? d.data().commissionPercent : 3.0)
        }));
        setStaffList(list);
        if (list.length > 0 && !sellerId) {
          setSellerId(list[0].id);
          setSellerName(list[0].name);
          setSellerCommissionPercent(list[0].commissionPercent);
        }
      } else {
        const mockStaff: StaffOption[] = [
          { id: 'EMP-01', name: 'Federico Frinconi', cargo: 'Director Ejecutivo', commissionPercent: 3.5 },
          { id: 'EMP-02', name: 'Laura Gómez', cargo: 'Gerente de Experiencias', commissionPercent: 3.0 },
          { id: 'EMP-03', name: 'Martín Cardozo', cargo: 'Asesor de Ventas', commissionPercent: 2.5 }
        ];
        setStaffList(mockStaff);
        setSellerId(mockStaff[0].id);
        setSellerName(mockStaff[0].name);
        setSellerCommissionPercent(mockStaff[0].commissionPercent);
      }
    });

    // E. Sync Affiliates / Ambassadors
    const unsubAffiliates = onSnapshot(collection(db, 'affiliates'), (snap) => {
      if (!snap.empty) {
        const list: AffiliateOption[] = snap.docs.map(d => ({
          id: d.id,
          name: d.data().name || 'Afiliado',
          refCode: d.data().refCode || d.id,
          commissionPct: Number(d.data().commissionPct || 5.0)
        }));
        setAffiliatesList(list);
      } else {
        setAffiliatesList([
          { id: 'AFF-01', name: 'María Influencer Travel', refCode: 'MARIA_TRAVEL', commissionPct: 5.0 },
          { id: 'AFF-02', name: 'Agencia Aliada CBA', refCode: 'ALIADA_CBA', commissionPct: 7.0 }
        ]);
      }
    });

    return () => {
      unsubTours();
      unsubOtaTours();
      unsubQuotes();
      unsubCrm();
      unsubUsers();
      unsubStaff();
      unsubAffiliates();
    };
  }, []);

  // Update Trip Data based on selection
  useEffect(() => {
    if (tripSource === 'catalog') {
      const t = tours.find(item => item.id === selectedTourId);
      if (t) {
        setCurrency(t.currency || 'ARS');
        if (t.roomPricing && t.roomPricing[selectedRoomCategory]) {
          setUnitPrice(t.roomPricing[selectedRoomCategory]);
        } else {
          setUnitPrice(t.price || 150000);
        }
      }
    } else if (tripSource === 'quote') {
      const q = quotes.find(item => item.id === selectedQuoteId);
      if (q) {
        setCurrency(q.targetCurrency || 'ARS');
        const roomResult = q.matrixResults?.find(m => m.roomType === selectedRoomCategory && m.enabled);
        if (roomResult) {
          setUnitPrice(roomResult.pvpTargetCurrency);
        } else {
          const firstActive = q.matrixResults?.find(m => m.enabled);
          if (firstActive) setUnitPrice(firstActive.pvpTargetCurrency);
        }
      }
    }
  }, [tripSource, selectedTourId, selectedQuoteId, selectedRoomCategory, tours, quotes]);

  // Adjust Passengers Array length when paxCount changes
  useEffect(() => {
    setPassengers(prev => {
      const next = [...prev];
      if (next.length < paxCount) {
        for (let i = next.length; i < paxCount; i++) {
          next.push({
            fullName: '',
            dni: '',
            dob: '',
            dietaryRestrictions: 'Ninguna',
            isTitular: false
          });
        }
      } else if (next.length > paxCount) {
        return next.slice(0, paxCount);
      }
      return next;
    });
  }, [paxCount]);

  // Helper Recalcular Servicio Independiente
  const updateServiceField = (
    index: number,
    field: keyof IndependentSupplierService,
    value: any
  ) => {
    setIndependentServices(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      if (item.pricingMode === 'comision_mayorista') {
        const gross = Number(item.grossPrice || 0);
        let commAmount = 0;
        if (item.isManualAgencyCommission) {
          commAmount = Number(item.manualAgencyCommissionAmount || 0);
          item.operatorCommissionAmount = commAmount;
        } else {
          const commPct = Number(item.operatorCommissionPercent || 0);
          commAmount = (gross * commPct) / 100;
          item.operatorCommissionAmount = Number(commAmount.toFixed(2));
        }

        const fee = Number(item.adminFeeAmount || 0);
        const bankTax = Number(item.bankTaxAmount || (gross * 0.012)); // 1.2% Débito/Crédito

        let ivaRateNum = item.ivaRate === '21' ? 0.21 : item.ivaRate === '10.5' ? 0.105 : 0;
        const iva = (fee + bankTax) * ivaRateNum;

        // Suma de ítems adicionales cobrados por el operador
        const customChargesTotal = (item.customCharges || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);

        const netPay = gross - commAmount + fee + bankTax + iva + customChargesTotal;
        const profit = gross - netPay;

        item.bankTaxAmount = Number(bankTax.toFixed(2));
        item.ivaAmount = Number(iva.toFixed(2));
        item.netToPayOperator = Number(netPay.toFixed(2));
        item.agencyGrossProfit = Number(profit.toFixed(2));
      } else {
        // Modo Neto + Markup
        const netCost = Number(item.netToPayOperator || 0);
        const gross = Number(item.grossPrice || 0);
        item.agencyGrossProfit = Math.max(0, gross - netCost);
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleAddCustomCharge = (serviceIdx: number) => {
    const nextCharge: OperatorCustomChargeItem = {
      id: `chg-${Date.now()}`,
      name: 'Tax Aéreo Q / Percepción / Fee',
      amount: 25
    };
    setIndependentServices(prev => {
      const copy = [...prev];
      const srv = copy[serviceIdx];
      const charges = [...(srv.customCharges || []), nextCharge];
      const gross = Number(srv.grossPrice || 0);
      const commAmount = srv.isManualAgencyCommission
        ? Number(srv.manualAgencyCommissionAmount || 0)
        : (gross * (Number(srv.operatorCommissionPercent) || 0)) / 100;
      const fee = Number(srv.adminFeeAmount || 0);
      const bankTax = Number(srv.bankTaxAmount || 0);
      const iva = Number(srv.ivaAmount || 0);
      const customTotal = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
      const netPay = gross - commAmount + fee + bankTax + iva + customTotal;

      copy[serviceIdx] = {
        ...srv,
        customCharges: charges,
        netToPayOperator: Number(netPay.toFixed(2)),
        agencyGrossProfit: Number((gross - netPay).toFixed(2))
      };
      return copy;
    });
  };

  const handleRemoveCustomCharge = (serviceIdx: number, chargeId: string) => {
    setIndependentServices(prev => {
      const copy = [...prev];
      const srv = copy[serviceIdx];
      const charges = (srv.customCharges || []).filter(c => c.id !== chargeId);
      const gross = Number(srv.grossPrice || 0);
      const commAmount = srv.isManualAgencyCommission
        ? Number(srv.manualAgencyCommissionAmount || 0)
        : (gross * (Number(srv.operatorCommissionPercent) || 0)) / 100;
      const fee = Number(srv.adminFeeAmount || 0);
      const bankTax = Number(srv.bankTaxAmount || 0);
      const iva = Number(srv.ivaAmount || 0);
      const customTotal = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
      const netPay = gross - commAmount + fee + bankTax + iva + customTotal;

      copy[serviceIdx] = {
        ...srv,
        customCharges: charges,
        netToPayOperator: Number(netPay.toFixed(2)),
        agencyGrossProfit: Number((gross - netPay).toFixed(2))
      };
      return copy;
    });
  };

  const handleUpdateCustomCharge = (serviceIdx: number, chargeId: string, field: 'name' | 'amount', val: any) => {
    setIndependentServices(prev => {
      const copy = [...prev];
      const srv = copy[serviceIdx];
      const charges = (srv.customCharges || []).map(c => {
        if (c.id === chargeId) return { ...c, [field]: field === 'amount' ? Number(val) : val };
        return c;
      });
      const gross = Number(srv.grossPrice || 0);
      const commAmount = srv.isManualAgencyCommission
        ? Number(srv.manualAgencyCommissionAmount || 0)
        : (gross * (Number(srv.operatorCommissionPercent) || 0)) / 100;
      const fee = Number(srv.adminFeeAmount || 0);
      const bankTax = Number(srv.bankTaxAmount || 0);
      const iva = Number(srv.ivaAmount || 0);
      const customTotal = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
      const netPay = gross - commAmount + fee + bankTax + iva + customTotal;

      copy[serviceIdx] = {
        ...srv,
        customCharges: charges,
        netToPayOperator: Number(netPay.toFixed(2)),
        agencyGrossProfit: Number((gross - netPay).toFixed(2))
      };
      return copy;
    });
  };

  // Helper Agregar Servicio Independiente
  const handleAddIndependentService = () => {
    const nextItem: IndependentSupplierService = {
      id: `srv-${Date.now()}`,
      category: 'Traslados',
      providerName: 'Nuevo Operador',
      bookingLocator: 'LOC-000',
      description: 'Servicio independiente',
      pricingMode: 'comision_mayorista',
      currency,
      grossPrice: 100,
      operatorCommissionPercent: 10,
      operatorCommissionAmount: 10,
      adminFeeAmount: 5,
      bankTaxAmount: 1.2,
      ivaRate: '21',
      ivaAmount: 1.3,
      netToPayOperator: 97.5,
      agencyGrossProfit: 2.5,
      paymentDeadline: '2026-10-01',
      paymentStatus: 'Pendiente'
    };
    setIndependentServices([...independentServices, nextItem]);
  };

  // Helper Eliminar Servicio
  const handleRemoveIndependentService = (idx: number) => {
    setIndependentServices(independentServices.filter((_, i) => i !== idx));
  };

  // Financial Calculations
  const isMultiOperator = tripSource === 'multi_operator';
  const totalMultiPvp = independentServices.reduce((s, item) => s + (Number(item.grossPrice) || 0), 0);
  const totalMultiCostToOperators = independentServices.reduce((s, item) => s + (Number(item.netToPayOperator) || 0), 0);

  const totalPrice = isMultiOperator ? totalMultiPvp : unitPrice * paxCount;
  const totalCostSuppliers = isMultiOperator ? totalMultiCostToOperators : (totalPrice * 0.8); // 80% costo estimado en paquetes propios
  const agencyGrossProfit = Math.max(0, totalPrice - totalCostSuppliers);

  const sellerCommissionAmount = Number(((totalPrice * sellerCommissionPercent) / 100).toFixed(2));
  const promoterCommissionAmount = Number(((totalPrice * promoterCommissionPercent) / 100).toFixed(2));
  const totalCommissions = sellerCommissionAmount + promoterCommissionAmount;
  const netAgencyProfit = Number((agencyGrossProfit - totalCommissions).toFixed(2));

  const minDepositRequired = Math.round((totalPrice * depositPercent) / 100);
  const balanceDue = Math.max(0, totalPrice - paidNowAmount);

  // Filter Customers
  const filteredCustomers = customers.filter(c => {
    if (!customerSearchQuery) return true;
    const q = customerSearchQuery.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.dni && c.dni.toLowerCase().includes(q))
    );
  }).slice(0, 10);

  // Handle Quick Add Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail) {
      alert('Por favor completá al menos el nombre y el correo.');
      return;
    }
    setCreatingCustomer(true);
    try {
      const custId = `user_${Date.now()}`;
      const newCustData = {
        id: custId,
        displayName: newCustName,
        email: newCustEmail,
        phone: newCustPhone,
        dni: newCustDni,
        createdAt: new Date().toISOString(),
        role: 'client'
      };

      // Guardar en usuarios de la App y en la base unificada de clientes CRM del ecosistema
      await setDoc(doc(db, 'users', custId), newCustData);
      await setDoc(doc(db, 'crm_customers', custId), {
        ...newCustData,
        customerName: newCustName,
        customerStatus: 'Cliente',
        businessUnit: 'TravelApp Turismo Emisivo',
        origin: 'Alta Rápida Reserva',
        status: 'Nuevos'
      });

      setSelectedCustomerId(custId);
      setPassengerName(newCustName);
      setPassengerEmail(newCustEmail);
      setPassengerPhone(newCustPhone);
      setPassengerDni(newCustDni);
      setShowNewCustomerModal(false);
      setNewCustName('');
      setNewCustEmail('');
      setNewCustPhone('');
      setNewCustDni('');
    } catch (err: any) {
      console.error('Error creating customer:', err);
      alert(`Error al crear cliente: ${err.message}`);
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Handle Select Customer from List
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setPassengerName(c.displayName);
    setPassengerEmail(c.email);
    setPassengerPhone(c.phone);
    setPassengerDni(c.dni || '');
  };

  // Handle Submit Reservation
  const handleCreateReservation = async () => {
    if (!passengerName) {
      alert('Por favor seleccioná o cargá un cliente titular.');
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const fileNumber = `FILE-EMIS-${year}-${randomSuffix}`;
      const reservationId = fileNumber;
      const branchName = branchId === '2' ? 'Sucursal Pilar' : branchId === '3' ? 'Sucursal Tucumán' : 'Sucursal Retiro';

      let tripTitle = customTitle || 'Tour Personalizado';
      let tripDest = customDestination || 'Destino Nacional';
      let tripDates = customDates;
      let tripImg = 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?q=80&w=800&auto=format&fit=crop';
      let tripServices: string[] = ['Transporte Exclusivo', 'Alojamiento con Desayuno', 'Coordinador Permanente', 'Asistencia al Viajero'];

      if (tripSource === 'catalog') {
        const t = tours.find(item => item.id === selectedTourId);
        if (t) {
          tripTitle = t.title;
          tripDest = t.location;
          tripDates = t.departureDate ? `Salida: ${t.departureDate}` : 'Fecha a convenir';
          tripImg = t.imageUrl || tripImg;
          if (t.services && t.services.length > 0) tripServices = t.services;
        }
      } else if (tripSource === 'quote') {
        const q = quotes.find(item => item.id === selectedQuoteId);
        if (q) {
          tripTitle = q.title;
          tripDest = q.destination;
          tripDates = q.departureDate && q.returnDate ? `${q.departureDate} al ${q.returnDate}` : 'Fechas programadas';
          tripServices = [
            q.lodging?.hotelName || 'Alojamiento Premium',
            `Régimen: ${q.lodging?.foodPlan || 'Media Pensión'}`,
            q.transportType === 'Bus' ? 'Bus Chárter Ejecutivo' : 'Aéreo Comercial / Chárter',
            'Asistencia Médica',
            'Coordinación Permanente'
          ];
        }
      } else if (tripSource === 'multi_operator') {
        tripTitle = customTitle || `Viaje Multi-Operador (${independentServices.length} Servicios)`;
        tripDest = customDestination || 'Destino Combinado';
        tripDates = customDates;
        tripServices = independentServices.map(s => `${s.category}: ${s.providerName} (${s.bookingLocator})`);
      }

      const resStatus = paidNowAmount >= totalPrice ? 'Confirmada' : paidNowAmount > 0 ? 'Señada' : 'Presupuestada';
      const ttlInfo = calculateTimeToPayDeadline(tripDates);

      // Commercial Allocation Object
      const commercialAllocationPayload: CommercialAllocation = {
        sellerId,
        sellerName,
        sellerCommissionPercent,
        sellerCommissionAmount,
        promoterId,
        promoterName,
        promoterCommissionPercent,
        promoterCommissionAmount,
        totalPvpCharged: totalPrice,
        totalCostToSuppliers: totalCostSuppliers,
        totalCommercialCommissions: totalCommissions,
        netAgencyProfit
      };

      // 1. Guardar en experience_reservations
      const reservationPayload = {
        id: reservationId,
        fileNumber,
        reservationCode: fileNumber,
        tourismVertical: 'emisivo',
        productType: isMultiOperator ? 'operador_mayorista' : (tripSource === 'catalog' ? (tours.find(t => t.id === selectedTourId)?.productType || 'salida_propia') : 'salida_propia'),
        customerId: selectedCustomerId || `guest_${Date.now()}`,
        nombrePasajero: passengerName,
        emailPasajero: passengerEmail,
        telefonoPasajero: passengerPhone,
        dniPasajero: passengerDni,
        tourId: tripSource === 'catalog' ? selectedTourId : selectedQuoteId || 'multi_operator',
        tourTitle: tripTitle,
        destination: tripDest,
        roomCategory: selectedRoomCategory,
        cantidadPersonas: paxCount,
        passengersList: passengers,
        tripSource,
        independentServices: isMultiOperator ? independentServices : [],
        commercialAllocation: commercialAllocationPayload,
        expiresAt: resStatus !== 'Confirmada' ? ttlInfo.deadlineIso : null,
        timeToPayPolicy: resStatus !== 'Confirmada' ? ttlInfo.label : null,
        financials: {
          currency,
          unitPrice: isMultiOperator ? totalPrice : unitPrice,
          totalPrice,
          paidAmount: paidNowAmount,
          balanceDue,
          paymentPlan,
          paymentMethod,
          paymentNotes,
          paymentsHistory: [
            {
              date: new Date().toISOString(),
              amount: paidNowAmount,
              currency,
              method: paymentMethod,
              concept: paymentNotes || 'Pago Inicial de Reserva'
            }
          ]
        },
        estado: resStatus,
        branchId,
        branchName,
        amount: totalPrice,
        currency,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'experience_reservations', reservationId), reservationPayload);

      // 2. SINCRONIZAR VENCIMIENTOS DE PROVEEDORES (supplier_deadlines)
      if (isMultiOperator && independentServices.length > 0) {
        for (const srv of independentServices) {
          if (srv.paymentDeadline) {
            const deadlineDocId = `DEADLINE-${reservationId}-${srv.id}`;
            await setDoc(doc(db, 'supplier_deadlines', deadlineDocId), {
              id: deadlineDocId,
              reservationId,
              reservationCode: reservationId,
              passengerName,
              serviceId: srv.id,
              category: srv.category,
              providerName: srv.providerName,
              bookingLocator: srv.bookingLocator,
              description: srv.description,
              amountToPay: srv.netToPayOperator,
              currency: srv.currency,
              deadlineDate: srv.paymentDeadline,
              status: srv.paymentStatus || 'Pendiente',
              branchId,
              branchName,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 3. SINCRONIZAR CON LA APP MÓVIL DEL CLIENTE (Colección 'contracted_trips' y 'users')
      if (selectedCustomerId) {
        const contractedTripId = `TRIP-${reservationId}`;
        const contractedTripData = {
          id: contractedTripId,
          reservationId,
          fileNumber,
          reservationCode: fileNumber,
          tourCode: `TRV-${fileNumber}`,
          tourismVertical: 'emisivo',
          userId: selectedCustomerId,
          title: tripTitle,
          destination: tripDest,
          dates: tripDates,
          imageUrl: tripImg,
          services: tripServices,
          payment: {
            totalAmount: totalPrice,
            paidAmount: paidNowAmount,
            balanceDue,
            currency
          },
          coordinator: {
            name: sellerName || 'Equipo de Asesoría TravelApp',
            phone: '+5491155550000',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
          },
          status: resStatus === 'Confirmada' ? 'confirmed' : 'deposit_paid',
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'contracted_trips', contractedTripId), contractedTripData);

        await setDoc(doc(db, 'users', selectedCustomerId), {
          hasPurchasedOrganizedTrip: true,
          activeTripId: contractedTripId,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setSuccessReservationId(reservationId);
      setSuccessFileNumber(fileNumber);

      // Si el medio de pago elegido es NAVE Galicia, generar el intent de pago inmediatamente
      if (paymentMethod.toLowerCase().includes('nave')) {
        handleGenerateNavePayment(fileNumber, paidNowAmount > 0 ? paidNowAmount : totalPrice, tripTitle);
      }

      setSaving(false);
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      alert(`Error al generar la reserva: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6">
      {/* TOP HEADER */}
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/experiences/reservations"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="rounded-full bg-tech-blue/10 px-3 py-0.5 text-xs font-bold text-tech-blue uppercase tracking-wider">
              Asistente de Reservas
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-0.5">
              <Ticket className="h-7 w-7 text-tech-blue" />
              Nueva Reserva &amp; Expediente Multi-Operador
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Paso {step} de 4</span>
        </div>
      </div>

      {/* WIZARD STEPS TABS */}
      <div className="max-w-6xl mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2 text-xs font-bold">
        {[
          { num: 1, label: '1. Selección de Viaje / Operadores', icon: <MapPin className="h-4 w-4" /> },
          { num: 2, label: '2. Cliente Titular', icon: <User className="h-4 w-4" /> },
          { num: 3, label: '3. Manifiesto Pasajeros', icon: <Users className="h-4 w-4" /> },
          { num: 4, label: '4. Comercial, Comisiones & Pago', icon: <DollarSign className="h-4 w-4" /> }
        ].map(s => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl transition ${
              step === s.num
                ? 'bg-tech-blue text-white shadow-md shadow-tech-blue/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {s.icon}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: VIAJE / MULTI-OPERADOR */}
      {step === 1 && (
        <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Origen y Modo de Reserva</h2>
              <p className="text-xs text-slate-400">Seleccioná si la reserva corresponde a una salida propia o a servicios independientes con operadores.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTripSource('catalog')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  tripSource === 'catalog' ? 'bg-tech-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Catálogo Propio
              </button>
              <button
                type="button"
                onClick={() => setTripSource('multi_operator')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  tripSource === 'multi_operator' ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-50 text-purple-700'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Multi-Operador (A Medida)
              </button>
              <button
                type="button"
                onClick={() => setTripSource('quote')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  tripSource === 'quote' ? 'bg-tech-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Desde Cotizador
              </button>
            </div>
          </div>

          {/* VISTA MULTI-OPERADOR: GRILLA DE SERVICIOS */}
          {tripSource === 'multi_operator' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <div className="text-xs">
                  <span className="font-extrabold text-purple-900 block text-sm">Servicios Independientes Multi-Proveedor</span>
                  <p className="text-purple-700">Cargá aéreos, hoteles y traslados con sus costos netos, comisiones cedidas y plazos de vencimiento.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddIndependentService}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition flex items-center gap-1 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> + Agregar Servicio
                </button>
              </div>

              <div className="space-y-3">
                {independentServices.map((srv, idx) => (
                  <div key={srv.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-purple-700 uppercase">#{idx + 1}</span>
                        <select
                          value={srv.category}
                          onChange={e => updateServiceField(idx, 'category', e.target.value as ServiceCategory)}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                        >
                          <option value="Aereo">✈️ Aéreo</option>
                          <option value="Bus">🚍 Bus</option>
                          <option value="Hotel">🏨 Hotel</option>
                          <option value="Traslados">🚐 Traslados</option>
                          <option value="Excursiones">⛰️ Excursiones</option>
                          <option value="Seguro">🛡️ Asistencia Médica</option>
                          <option value="Crucero">🚢 Crucero</option>
                          <option value="Otro">📦 Otro</option>
                        </select>

                        <input
                          type="text"
                          value={srv.providerName}
                          onChange={e => updateServiceField(idx, 'providerName', e.target.value)}
                          placeholder="Operador / Proveedor (ej: Logan Travel)"
                          className="p-1 rounded-lg border border-slate-200 bg-white font-bold text-xs w-44"
                        />

                        <input
                          type="text"
                          value={srv.bookingLocator}
                          onChange={e => updateServiceField(idx, 'bookingLocator', e.target.value)}
                          placeholder="Localizador / PNR (ej: XZ901)"
                          className="p-1 rounded-lg border border-slate-200 bg-white font-mono text-xs w-36"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={srv.pricingMode}
                          onChange={e => updateServiceField(idx, 'pricingMode', e.target.value as LiquidationPricingMode)}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-tech-blue"
                        >
                          <option value="comision_mayorista">Comisión Cedida Operador</option>
                          <option value="neto_markup">Costo Neto + Margen Propio</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveIndependentService(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Eliminar este servicio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Desglose Financiero del Servicio */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">PVP / Tarifa Bruta ({currency})</span>
                        <input
                          type="number"
                          value={srv.grossPrice}
                          onChange={e => updateServiceField(idx, 'grossPrice', Number(e.target.value))}
                          className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-black text-slate-800"
                        />
                      </div>

                      {srv.pricingMode === 'comision_mayorista' ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold block">
                                {srv.isManualAgencyCommission ? 'Comis. Agencia ($)' : '% Comis. Operador'}
                              </span>
                              <label className="text-[9px] font-bold text-tech-blue cursor-pointer flex items-center gap-0.5">
                                <input
                                  type="checkbox"
                                  checked={!!srv.isManualAgencyCommission}
                                  onChange={e => updateServiceField(idx, 'isManualAgencyCommission', e.target.checked)}
                                  className="h-2.5 w-2.5 rounded"
                                />
                                Manual
                              </label>
                            </div>
                            {srv.isManualAgencyCommission ? (
                              <input
                                type="number"
                                value={srv.manualAgencyCommissionAmount || ''}
                                placeholder="Ej: 150"
                                onChange={e => updateServiceField(idx, 'manualAgencyCommissionAmount', Number(e.target.value))}
                                className="w-full p-1.5 rounded-lg border border-emerald-300 bg-emerald-50/50 font-black text-emerald-800"
                              />
                            ) : (
                              <input
                                type="number"
                                value={srv.operatorCommissionPercent}
                                onChange={e => updateServiceField(idx, 'operatorCommissionPercent', Number(e.target.value))}
                                className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-bold text-emerald-700"
                              />
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Gastos / Fee Adm.</span>
                            <input
                              type="number"
                              value={srv.adminFeeAmount}
                              onChange={e => updateServiceField(idx, 'adminFeeAmount', Number(e.target.value))}
                              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Imp. Déb/Créd (1.2%)</span>
                            <input
                              type="number"
                              value={srv.bankTaxAmount}
                              onChange={e => updateServiceField(idx, 'bankTaxAmount', Number(e.target.value))}
                              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="sm:col-span-3">
                          <span className="text-[10px] text-slate-400 font-bold block">Costo Neto a Pagar al Operador</span>
                          <input
                            type="number"
                            value={srv.netToPayOperator}
                            onChange={e => updateServiceField(idx, 'netToPayOperator', Number(e.target.value))}
                            className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-bold text-purple-800"
                          />
                        </div>
                      )}

                      <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-bold block">A Pagar Operador</span>
                        <span className="font-black text-xs text-emerald-900">${srv.netToPayOperator}</span>
                      </div>

                      <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-200">
                        <span className="text-[10px] text-blue-800 font-bold block">Margen Agencia</span>
                        <span className="font-black text-xs text-blue-900">${srv.agencyGrossProfit}</span>
                      </div>
                    </div>

                    {/* ÍTEMS EXTRA QUE COBRA EL OPERADOR EN LA LIQUIDACIÓN */}
                    {srv.pricingMode === 'comision_mayorista' && (
                      <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            📄 Ítems adicionales que cobra el operador (Tax aéreos, percepciones, seguros, emisión, etc.):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddCustomCharge(idx)}
                            className="px-2 py-0.5 bg-white border border-slate-300 text-purple-700 hover:bg-purple-50 rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="h-3 w-3" /> + Agregar Ítem de Cobro
                          </button>
                        </div>

                        {srv.customCharges && srv.customCharges.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {srv.customCharges.map((chg) => (
                              <div key={chg.id} className="flex items-center gap-1 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <input
                                  type="text"
                                  value={chg.name}
                                  onChange={e => handleUpdateCustomCharge(idx, chg.id, 'name', e.target.value)}
                                  placeholder="Concepto (ej: Q/Fuel Aéreo)"
                                  className="w-full text-xs font-medium border-0 focus:outline-none"
                                />
                                <div className="flex items-center gap-0.5">
                                  <span className="text-slate-400 font-bold text-xs">$</span>
                                  <input
                                    type="number"
                                    value={chg.amount}
                                    onChange={e => handleUpdateCustomCharge(idx, chg.id, 'amount', Number(e.target.value))}
                                    className="w-16 text-xs font-black border border-slate-200 rounded px-1 text-right"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomCharge(idx, chg.id)}
                                  className="text-slate-400 hover:text-red-600 p-0.5"
                                  title="Eliminar cargo"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vencimiento de Pago al Proveedor */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-slate-600 font-bold">Fecha Límite de Pago al Proveedor:</span>
                        <input
                          type="date"
                          value={srv.paymentDeadline}
                          onChange={e => updateServiceField(idx, 'paymentDeadline', e.target.value)}
                          className="p-1 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">Estado Pago Operador:</span>
                        <select
                          value={srv.paymentStatus}
                          onChange={e => updateServiceField(idx, 'paymentStatus', e.target.value as any)}
                          className="p-1 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Señado">Señado</option>
                          <option value="Pagado">Pagado 100%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA CATÁLOGO PROPIO */}
          {tripSource === 'catalog' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-600">Seleccionar Paquete / Salida Organizada</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tours.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTourId(t.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex gap-3 ${
                      selectedTourId === t.id
                        ? 'border-tech-blue bg-blue-50/40 ring-2 ring-tech-blue/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={t.imageUrl} alt={t.title} className="h-16 w-16 object-cover rounded-xl" />
                    <div>
                      <div className="font-extrabold text-sm text-slate-800">{t.title}</div>
                      <div className="text-xs text-slate-500">{t.location} · {t.departureDate}</div>
                      <div className="font-black text-emerald-700 text-xs mt-1">
                        ${t.price?.toLocaleString()} {t.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-tech-blue text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              Continuar a Datos del Cliente <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CLIENTE TITULAR */}
      {step === 2 && (
        <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Cliente Titular de la Reserva</h2>
              <p className="text-xs text-slate-400">Buscá un cliente existente en el CRM o realizá un alta rápida en el momento.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewCustomerModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
            >
              <UserPlus className="h-4 w-4" /> + Nuevo Cliente Rápido
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600">Buscar en CRM de Clientes</label>
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono o DNI..."
                value={customerSearchQuery}
                onChange={e => setCustomerSearchQuery(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2">
                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`p-3 rounded-xl border cursor-pointer text-xs transition ${
                      selectedCustomerId === c.id
                        ? 'border-tech-blue bg-blue-50 font-bold text-tech-blue'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold">{c.displayName}</div>
                    <div className="text-[10px] text-slate-500">{c.email} · {c.phone}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-700 block uppercase text-[10px]">Titular Asignado</span>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={e => setPassengerName(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={passengerEmail}
                    onChange={e => setPassengerEmail(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={passengerPhone}
                    onChange={e => setPassengerPhone(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-tech-blue text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              Continuar a Pasajeros <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PASAJEROS */}
      {step === 3 && (
        <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Manifiesto de Pasajeros</h2>
              <p className="text-xs text-slate-400">Ingresá los datos de los pasajeros que viajarán.</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Cantidad de Pax:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={paxCount}
                onChange={e => setPaxCount(Math.max(1, Number(e.target.value)))}
                className="w-16 p-1.5 bg-slate-100 rounded-lg border border-slate-200 font-bold text-center"
              />
            </div>
          </div>

          <div className="space-y-3">
            {passengers.map((pax, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold">Pasajero #{idx + 1} {pax.isTitular && '(Titular)'}</span>
                  <input
                    type="text"
                    value={pax.fullName}
                    onChange={e => {
                      const val = e.target.value;
                      setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, fullName: val } : p));
                    }}
                    placeholder="Nombre y Apellido"
                    className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold">DNI / Pasaporte</span>
                  <input
                    type="text"
                    value={pax.dni}
                    onChange={e => {
                      const val = e.target.value;
                      setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, dni: val } : p));
                    }}
                    placeholder="N° Documento"
                    className="w-full p-2 bg-white rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold">Fecha Nacimiento</span>
                  <input
                    type="date"
                    value={pax.dob}
                    onChange={e => {
                      const val = e.target.value;
                      setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, dob: val } : p));
                    }}
                    className="w-full p-2 bg-white rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold">Restricción Alimentaria / Salud</span>
                  <input
                    type="text"
                    value={pax.dietaryRestrictions}
                    onChange={e => {
                      const val = e.target.value;
                      setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, dietaryRestrictions: val } : p));
                    }}
                    placeholder="Ej: Celíaco, Vegetariano"
                    className="w-full p-2 bg-white rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-6 py-2.5 bg-tech-blue text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              Continuar a Comercial &amp; Pago <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: COMERCIAL, COMISIONES & PAGO */}
      {step === 4 && (
        <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Liquidación Comercial &amp; Registro de Pago</h2>
              <p className="text-xs text-slate-400">Asigná el vendedor y promotor/afiliado para calcular sus comisiones y la rentabilidad neta.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ASIGNACIÓN COMERCIAL */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <span className="font-black text-slate-800 block uppercase text-[10px] flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-tech-blue" />
                Asignación Comercial &amp; Comisiones Independientes
              </span>

              {/* VENDEDOR */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-slate-600 font-bold">Vendedor / Asesor Comercial (RRHH)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={sellerId}
                    onChange={e => {
                      const sid = e.target.value;
                      setSellerId(sid);
                      const emp = staffList.find(s => s.id === sid);
                      if (emp) {
                        setSellerName(emp.name);
                        setSellerCommissionPercent(emp.commissionPercent);
                      }
                    }}
                    className="col-span-2 p-2 rounded-lg border border-slate-200 font-bold bg-white"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.cargo} - {s.commissionPercent}%)</option>
                    ))}
                  </select>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      value={sellerCommissionPercent}
                      onChange={e => setSellerCommissionPercent(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 font-black text-emerald-700 bg-emerald-50/50"
                    />
                    <span className="ml-1 font-bold text-slate-500">%</span>
                  </div>
                </div>
                <div className="flex justify-between text-[11px] pt-1 text-slate-500 font-medium">
                  <span>Comisión a liquidar al Vendedor:</span>
                  <span className="font-black text-emerald-800">${sellerCommissionAmount} {currency}</span>
                </div>
              </div>

              {/* PROMOTOR / AFILIADO */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-slate-600 font-bold">Promotor / Afiliado Externo (Opcional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={promoterId}
                    onChange={e => {
                      const pid = e.target.value;
                      setPromoterId(pid);
                      const aff = affiliatesList.find(a => a.id === pid);
                      if (aff) {
                        setPromoterName(aff.name);
                        setPromoterCommissionPercent(aff.commissionPct);
                      } else {
                        setPromoterName('');
                        setPromoterCommissionPercent(0);
                      }
                    }}
                    className="col-span-2 p-2 rounded-lg border border-slate-200 font-bold bg-white"
                  >
                    <option value="">Ninguno (Venta Directa)</option>
                    {affiliatesList.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.refCode} - {a.commissionPct}%)</option>
                    ))}
                  </select>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      value={promoterCommissionPercent}
                      onChange={e => setPromoterCommissionPercent(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 font-black text-purple-700 bg-purple-50/50"
                    />
                    <span className="ml-1 font-bold text-slate-500">%</span>
                  </div>
                </div>
                {promoterId && (
                  <div className="flex justify-between text-[11px] pt-1 text-slate-500 font-medium">
                    <span>Comisión a liquidar al Afiliado:</span>
                    <span className="font-black text-purple-800">${promoterCommissionAmount} {currency}</span>
                  </div>
                )}
              </div>

              {/* BALANCE FINANCIERO */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">Rentabilidad del Expediente</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total PVP Cobrado al Cliente:</span>
                  <span className="font-bold text-slate-900">${totalPrice.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Costo Total a Proveedores:</span>
                  <span className="font-bold text-purple-700">${totalCostSuppliers.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Comisiones Comerciales:</span>
                  <span className="font-bold text-amber-700">${totalCommissions.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-700">Margen Neto Agencia:</span>
                  <span className="font-black text-emerald-700">${netAgencyProfit.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            {/* CONDICIONES DE PAGO */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <span className="font-black text-slate-800 block uppercase text-[10px] flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Cobro al Pasajero &amp; Seña Inicial
              </span>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Monto a Cobrar Hoy ({currency})</label>
                <input
                  type="number"
                  value={paidNowAmount}
                  onChange={e => setPaidNowAmount(Number(e.target.value))}
                  placeholder={`Mínimo sugerido: $${minDepositRequired}`}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-black text-base text-emerald-700"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
                  <span>Saldo Pendiente de Cobro:</span>
                  <span className="font-bold text-amber-700">${balanceDue.toLocaleString()} {currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Medio de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold"
                >
                  <option value="NAVE Galicia (Link de Pago + QR MODO)">NAVE Galicia (Link de Pago + QR MODO)</option>
                  <option value="Mercado Pago / Tarjeta">Mercado Pago / Tarjeta</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Efectivo en Sucursal">Efectivo en Sucursal</option>
                  <option value="Dólares Billete">Dólares Billete</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Sucursal Emisora</label>
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold"
                >
                  <option value="1">Sucursal Retiro</option>
                  <option value="2">Sucursal Pilar</option>
                  <option value="3">Sucursal Tucumán</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Notas / Observaciones del Pago</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleCreateReservation}
              disabled={saving}
              className="px-8 py-3 bg-tech-blue text-white rounded-2xl text-xs font-black hover:bg-blue-700 transition shadow-lg shadow-tech-blue/20 flex items-center gap-2"
            >
              {saving ? 'Emitiendo Reserva...' : (
                <>
                  <Save className="h-5 w-5" /> Confirmar &amp; Emitir Expediente de Reserva
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {successReservationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">¡Expediente de Viaje Emitido!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Expediente Corporativo:{' '}
                <strong className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  {successReservationId}
                </strong>
              </p>
            </div>

            {/* SECCIÓN NAVE GALICIA (LINK + QR) */}
            {naveIntentLoading ? (
              <div className="py-6 bg-orange-50/60 rounded-2xl border border-orange-200 text-center space-y-2">
                <RefreshCw className="h-7 w-7 text-orange-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-orange-950">
                  Generando link oficial de pago y código QR en NAVE Banco Galicia...
                </p>
              </div>
            ) : generatedNaveUrl ? (
              <div className="bg-orange-50/40 p-4 rounded-2xl border border-orange-200 space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-orange-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-black text-slate-800">Cobro con NAVE Banco Galicia / MODO</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                    Activo
                  </span>
                </div>

                {/* QR Display */}
                <div className="text-center py-1">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(generatedNaveUrl)}`}
                    alt="Código QR NAVE Galicia"
                    className="w-32 h-32 object-contain mx-auto rounded-lg shadow-sm border border-slate-200 bg-white p-1.5"
                  />
                  <span className="text-[10px] font-medium text-slate-500 mt-1 block">
                    Escaneá con Galicia, MODO o cualquier billetera virtual
                  </span>
                </div>

                {/* Input Link */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={generatedNaveUrl}
                    className="flex-1 p-2 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700 truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedNaveUrl);
                      setCopiedSuccessLink(true);
                      setTimeout(() => setCopiedSuccessLink(false), 2500);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    {copiedSuccessLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {copiedSuccessLink ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                {/* Acciones de Cobro */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`https://wa.me/${passengerPhone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `¡Hola ${passengerName}! Confirmamos la emisión de tu expediente de viaje (${successReservationId}). Podés abonar de forma segura con NAVE Banco Galicia (tarjetas o QR interoperable MODO) a través del siguiente enlace:\n\n${generatedNaveUrl}\n\n¡Muchas gracias por viajar con TravelApp!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Smartphone className="h-4 w-4" />
                    Enviar WhatsApp
                  </a>
                  <a
                    href={generatedNaveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir Checkout
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleGenerateNavePayment(successReservationId, paidNowAmount > 0 ? paidNowAmount : totalPrice, customTitle || 'Tour')}
                  className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-xl text-xs font-black transition border border-orange-200 flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  Emitir Link de Cobro &amp; QR NAVE Galicia Ahora
                </button>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <Link
                href="/experiences/reservations"
                className="flex-1 py-2.5 bg-tech-blue text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Ir al ERP de Expedientes &amp; Reservas
              </Link>
              <Link
                href="/experiences/my-trip-mgmt"
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                Ver en App Mi Viaje
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALTA RÁPIDA DE CLIENTE */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Alta Rápida de Cliente en CRM
            </h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newCustEmail}
                  onChange={e => setNewCustEmail(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">DNI</label>
                  <input
                    type="text"
                    value={newCustDni}
                    onChange={e => setNewCustDni(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-sm"
                >
                  {creatingCustomer ? 'Creando...' : 'Guardar y Seleccionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewReservationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando formulario...</div>}>
      <NewReservationForm />
    </Suspense>
  );
}
