import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/constants';

export interface PassengerExpConfig {
  welcomePopup: {
    enabled: boolean;
    title: string;
    message: string;
    ctaText: string;
    skipText: string;
    bonusPoints: number;
  };
  searchingModal: {
    enabled: boolean;
    title: string;
    description: string;
    cancelText: string;
    lockMapInteraction: boolean;
  };
  driverAssignedModal: {
    enabled: boolean;
    title: string;
    subtitle: string;
    ctaText: string;
    maskPlateVisibleLastChars: number;
  };
  arrivingSoonAlert: {
    enabled: boolean;
    minutesBefore: number;
    title: string;
    message: string;
    recipients: 'passenger' | 'driver' | 'both';
  };
  routeDeviationProtocol: {
    enabled: boolean;
    distanceKm: number;
    durationSeconds: number;
    responseTimeoutSeconds: number;
    passengerTitle: string;
    passengerMessage: string;
    okButtonText: string;
    helpButtonText: string;
    dashboardAlertTitle: string;
    recipients: 'passenger' | 'driver' | 'both';
  };
  tripCompletedRating: {
    enabled: boolean;
    thankYouTitle: string;
    thankYouMessage: string;
    ratingTitle: string;
    ratingSubtitle: string;
    submitText: string;
    skipText: string;
    allowSkip: boolean;
    persistUntilRatedOrSkipped: boolean;
  };
}

export const DEFAULT_CLIENT_PASSENGER_EXP_CONFIG: PassengerExpConfig = {
  welcomePopup: {
    enabled: true,
    title: '¡Bienvenido a TravelApp! 🎉',
    message:
      'Completá tu perfil subiendo una foto y sumá +{puntos} Puntos Rewards de regalo para tus próximos viajes.',
    ctaText: 'Completar perfil y sumar puntos',
    skipText: 'Más tarde',
    bonusPoints: 500,
  },
  searchingModal: {
    enabled: true,
    title: 'Buscando tu conductor...',
    description:
      'Estamos conectando con los choferes habilitados más cercanos a tu ubicación. Aguardá un instante.',
    cancelText: 'Cancelar Búsqueda',
    lockMapInteraction: true,
  },
  driverAssignedModal: {
    enabled: true,
    title: '¡Tu conductor está en camino!',
    subtitle: 'Verificá los datos del vehículo antes de subir.',
    ctaText: 'Seguir viaje en el mapa',
    maskPlateVisibleLastChars: 3,
  },
  arrivingSoonAlert: {
    enabled: true,
    minutesBefore: 2,
    title: '⏱️ Tu móvil está por llegar',
    message:
      '¡Preparate {nombre}! {conductor} ({vehiculo}) llegará en aproximadamente {eta} minutos.',
    recipients: 'passenger',
  },
  routeDeviationProtocol: {
    enabled: true,
    distanceKm: 1.5,
    durationSeconds: 45,
    responseTimeoutSeconds: 60,
    passengerTitle: '⚠️ Desvío de recorrido detectado',
    passengerMessage:
      'Detectamos que el vehículo se apartó más de {km} km de la ruta recomendada. ¿Confirmás que está todo bien?',
    okButtonText: '✅ Estoy bien',
    helpButtonText: '🚨 Necesito ayuda',
    dashboardAlertTitle: 'ALERTA DE DESVÍO DE RECORRIDO',
    recipients: 'both',
  },
  tripCompletedRating: {
    enabled: true,
    thankYouTitle: '¡Gracias por viajar con nosotros!',
    thankYouMessage: 'Esperamos que hayas tenido una excelente experiencia con {conductor}.',
    ratingTitle: '¿Cómo estuvo tu viaje?',
    ratingSubtitle: 'Tu calificación ayuda a mantener la calidad y seguridad de TravelCab.',
    submitText: 'Enviar calificación',
    skipText: 'Omitir',
    allowSkip: true,
    persistUntilRatedOrSkipped: true,
  },
};

export function maskPlate(plate?: string, visibleLastChars = 3): string {
  if (!plate) return 'S/D';
  const clean = plate.trim().toUpperCase().replace(/\s+/g, '');
  if (clean.length <= visibleLastChars) return clean;
  const maskedLen = Math.max(2, clean.length - visibleLastChars);
  return `${'•'.repeat(maskedLen)}${clean.slice(-visibleLastChars)}`;
}

// -----------------------------------------------------------------------------
// 1. Push-Pop de Bienvenida (Primer Login -> Completar Perfil con Foto)
// -----------------------------------------------------------------------------
export function WelcomeFirstLoginModal({
  visible,
  config,
  onCompleteProfile,
  onDismiss,
}: {
  visible: boolean;
  config: PassengerExpConfig['welcomePopup'];
  onCompleteProfile: () => void;
  onDismiss: () => void;
}) {
  const renderedMsg = (config.message || '').replace(
    '{puntos}',
    String(config.bonusPoints || 500)
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircleAmber}>
            <Ionicons name="camera" size={38} color="#D97706" />
          </View>
          <View style={styles.bonusPill}>
            <Text style={styles.bonusPillText}>
              🎁 +{config.bonusPoints || 500} PTS REWARDS
            </Text>
          </View>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.body}>{renderedMsg}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onCompleteProfile}>
            <Text style={styles.primaryBtnText}>{config.ctaText}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss}>
            <Text style={styles.secondaryBtnText}>{config.skipText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// 2. Pop-up Promocional In-App
// -----------------------------------------------------------------------------
export function PromoPopupModal({
  visible,
  promo,
  onAction,
  onClose,
}: {
  visible: boolean;
  promo: { title: string; message: string; ctaLabel?: string; ctaTab?: string } | null;
  onAction: (tab?: string) => void;
  onClose: () => void;
}) {
  if (!promo) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircleBlue}>
            <Ionicons name="megaphone" size={34} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{promo.title}</Text>
          <Text style={styles.body}>{promo.message}</Text>

          {promo.ctaLabel ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => onAction(promo.ctaTab)}
            >
              <Text style={styles.primaryBtnText}>{promo.ctaLabel}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={promo.ctaLabel ? styles.secondaryBtn : styles.primaryBtn}
            onPress={onClose}
          >
            <Text style={promo.ctaLabel ? styles.secondaryBtnText : styles.primaryBtnText}>
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// 3. Modal al Aceptar el Viaje (Foto Auto, Nombre Pila, Patente 3 dígitos, Marca/Modelo/Color, Viajes, Estrellas)
// -----------------------------------------------------------------------------
export interface AcceptedDriverInfo {
  id: string;
  name: string;
  plate: string;
  brand?: string;
  vehicleModelName?: string;
  color?: string;
  model?: string;
  rating: string;
  totalTrips: number;
  avatar?: string;
  carPhoto?: string;
}

export function DriverAssignedModal({
  visible,
  driver,
  config,
  onClose,
}: {
  visible: boolean;
  driver: AcceptedDriverInfo | null;
  config: PassengerExpConfig['driverAssignedModal'];
  onClose: () => void;
}) {
  if (!driver) return null;

  const maskedPlate = maskPlate(driver.plate, config.maskPlateVisibleLastChars || 3);
  const formattedStars = Number(driver.rating || 5).toFixed(1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { padding: 20 }]}>
          <View style={styles.badgeSuccess}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.badgeSuccessText}>VIAJE CONFIRMADO</Text>
          </View>

          <Text style={[styles.title, { marginTop: 8 }]}>{config.title}</Text>
          <Text style={[styles.body, { marginBottom: 14 }]}>{config.subtitle}</Text>

          <View style={styles.heroMediaContainer}>
            {driver.carPhoto ? (
              <Image
                source={{ uri: driver.carPhoto }}
                style={styles.carHeroImg}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.carHeroImg, styles.carPlaceholder]}>
                <Ionicons name="car-sport" size={44} color={Colors.primary} />
                <Text style={styles.carPlaceholderText}>Vehículo verificado</Text>
              </View>
            )}

            <View style={styles.driverPortraitWrap}>
              {driver.avatar ? (
                <Image
                  source={{ uri: driver.avatar }}
                  style={styles.driverPortraitImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.driverPortraitImg, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                    {(driver.name || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.driverVerifiedBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <View style={styles.driverSummaryBox}>
            <View style={styles.driverRowTop}>
              <View style={{ flex: 1, paddingLeft: 76 }}>
                <Text style={styles.driverRoleCaption}>TU CONDUCTOR</Text>
                <Text style={styles.driverFirstName}>{driver.name}</Text>
                <Text style={styles.driverStats}>
                  ⭐ {formattedStars} · {driver.totalTrips ?? 0} viajes
                </Text>
              </View>
              <View style={styles.plateTag}>
                <Text style={styles.plateTagLabel}>DOMINIO</Text>
                <Text style={styles.plateTagValue}>{maskedPlate}</Text>
              </View>
            </View>

            <View style={styles.vehicleSpecsGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>MARCA</Text>
                <Text style={styles.specValue}>{driver.brand || 'Verificada'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>MODELO</Text>
                <Text style={styles.specValue}>
                  {driver.vehicleModelName || driver.model || 'Habilitado'}
                </Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>COLOR</Text>
                <Text style={styles.specValue}>{driver.color || 'Estándar'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>{config.ctaText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// 4. Modal Interactivo de Desvío de Camino Recomendado
// -----------------------------------------------------------------------------
export function RouteDeviationInteractiveModal({
  visible,
  deviationKm,
  secondsLeft,
  config,
  onConfirmOk,
  onRequestHelp,
}: {
  visible: boolean;
  deviationKm: number;
  secondsLeft: number;
  config: PassengerExpConfig['routeDeviationProtocol'];
  onConfirmOk: () => void;
  onRequestHelp: () => void;
}) {
  const renderedMsg = (config.passengerMessage || '').replace(
    '{km}',
    String(config.distanceKm || 1.5)
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(127, 29, 29, 0.72)' }]}>
        <View style={[styles.card, { borderColor: '#FCA5A5', borderWidth: 2 }]}>
          <View style={styles.iconCircleRed}>
            <Ionicons name="warning" size={40} color="#DC2626" />
          </View>
          <Text style={[styles.title, { color: '#991B1B' }]}>{config.passengerTitle}</Text>
          <Text style={styles.body}>{renderedMsg}</Text>

          <View style={styles.deviationMeter}>
            <Text style={styles.deviationMeterText}>
              Desvío actual: {deviationKm.toFixed(2)} km · Alerta automática en {secondsLeft}s
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#16A34A' }]}
            onPress={onConfirmOk}
          >
            <Text style={styles.primaryBtnText}>{config.okButtonText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#DC2626', marginTop: 10 }]}
            onPress={onRequestHelp}
          >
            <Text style={styles.primaryBtnText}>{config.helpButtonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// 5. Agradecimiento Final y Panel de Valoración Pendiente Estilo Uber
// -----------------------------------------------------------------------------
const RATING_TAGS = [
  'Auto impecable ✨',
  'Conducción suave 🚘',
  'Muy amable 😊',
  'Puntual ⏱️',
  'Ruta segura 🛡️',
];

export function TripCompletedRatingModal({
  visible,
  trip,
  earnedPoints,
  config,
  onSubmit,
  onSkip,
}: {
  visible: boolean;
  trip: any;
  earnedPoints: number;
  config: PassengerExpConfig['tripCompletedRating'];
  onSubmit: (payload: { rating: number; tags: string[]; tipAmount: number }) => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [tipAmount, setTipAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  const driverName = (trip.driverName || 'tu conductor').split(/\s+/)[0];
  const thankYouMsg = (config.thankYouMessage || '').replace('{conductor}', driverName);
  const isDigital = trip.paymentMethod && trip.paymentMethod !== 'Efectivo';

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ rating, tags, tipAmount: isDigital ? tipAmount : 0 });
      setRating(5);
      setTags([]);
      setTipAmount(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { maxHeight: '88%' }]}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
            <View style={{ alignItems: 'center' }}>
              <View style={styles.iconCircleAmber}>
                <Ionicons name="star" size={36} color="#F59E0B" />
              </View>
              <Text style={styles.title}>{config.thankYouTitle}</Text>
              <Text style={[styles.body, { marginBottom: 10 }]}>{thankYouMsg}</Text>

              {earnedPoints > 0 && (
                <View style={styles.pointsBanner}>
                  <Text style={styles.pointsBannerText}>
                    +{earnedPoints} PTS TravelRewards acreditados
                  </Text>
                </View>
              )}

              <Text style={styles.ratingQuestion}>{config.ratingTitle}</Text>
              <Text style={styles.ratingSub}>{config.ratingSubtitle}</Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setRating(s)}
                    style={{ paddingHorizontal: 5 }}
                  >
                    <Ionicons
                      name={s <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={s <= rating ? '#F59E0B' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tagsWrap}>
                {RATING_TAGS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => toggleTag(t)}
                      style={[styles.tagChip, active && styles.tagChipActive]}
                    >
                      <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isDigital && (
                <View style={{ width: '100%', marginTop: 12 }}>
                  <Text style={styles.tipTitle}>¿Sumar propina para {driverName}?</Text>
                  <View style={styles.tipRow}>
                    {[0, 300, 500, 1000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => setTipAmount(amt)}
                        style={[styles.tipBtn, tipAmount === amt && styles.tipBtnActive]}
                      >
                        <Text
                          style={[styles.tipBtnText, tipAmount === amt && styles.tipBtnTextActive]}
                        >
                          {amt === 0 ? 'Sin propina' : `+$${amt}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 18, opacity: submitting ? 0.6 : 1 }]}
                disabled={submitting}
                onPress={handleConfirm}
              >
                <Text style={styles.primaryBtnText}>
                  {submitting ? 'Enviando...' : config.submitText}
                </Text>
              </TouchableOpacity>

              {config.allowSkip && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  disabled={submitting}
                  onPress={onSkip}
                >
                  <Text style={styles.secondaryBtnText}>{config.skipText}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 25, 44, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircleAmber: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircleBlue: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircleRed: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bonusPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  bonusPillText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: '#B45309',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: '#15803D',
  },
  heroMediaContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 8,
    zIndex: 10,
  },
  carHeroImg: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  carPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  carPlaceholderText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textMuted,
  },
  driverPortraitWrap: {
    position: 'absolute',
    left: 14,
    bottom: -36,
    zIndex: 10,
  },
  driverPortraitImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.primary,
  },
  driverVerifiedBadge: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverRoleCaption: {
    fontSize: 9,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  driverSummaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    paddingTop: 10,
    marginBottom: 16,
  },
  driverRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    minHeight: 42,
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: Colors.white,
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
  },
  driverFirstName: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  driverStats: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textSecondary,
  },
  plateTag: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  plateTagLabel: {
    fontSize: 8,
    fontFamily: 'Quicksand-Bold',
    color: '#93C5FD',
  },
  plateTagValue: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
    letterSpacing: 1,
  },
  vehicleSpecsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    gap: 8,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 9,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textMuted,
  },
  specValue: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  deviationMeter: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    width: '100%',
  },
  deviationMeterText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#991B1B',
    textAlign: 'center',
  },
  pointsBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  pointsBannerText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#B45309',
  },
  ratingQuestion: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  ratingSub: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  tagChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagChipText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textSecondary,
  },
  tagChipTextActive: {
    color: Colors.white,
  },
  tipTitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  tipBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  tipBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: Colors.accent,
  },
  tipBtnText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textSecondary,
  },
  tipBtnTextActive: {
    color: Colors.accent,
  },
});
