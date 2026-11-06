import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ImageBackground,
    Linking,
    Animated,
    Platform,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dimensiones estilo Mercado Pago con tarjetas flotantes superpuestas (peek & overlap)
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.80);
const CARD_OVERLAP = -28; // Superposición flotante real entre tarjetas (efecto Mercado Pago)
const SNAP_INTERVAL = CARD_WIDTH + CARD_OVERLAP;

export interface NativeCardItem {
    id: string;
    title: string;
    subtitle: string;
    badge?: string;
    badgeColor?: string;
    imageUrl?: string;
    image?: string;
    actionType?: 'tab' | 'url' | 'whatsapp';
    actionTarget?: string;
    ctaText?: string;
    ctaLink?: string;
    price?: string;
    discount?: string;
    tag?: string;
    order?: number;
    active?: boolean;
}

const FALLBACK_CARDS: NativeCardItem[] = [
    {
        id: 'mp-buses',
        title: 'Pasajes en Micro a todo el País',
        subtitle: 'Boletería Oficial Central de Pasajes • Sumá Puntos Rewards con tu boleto',
        badge: 'BOLETERÍA OFICIAL',
        badgeColor: '#FF5A19',
        imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900&auto=format&fit=crop&q=80',
        actionType: 'tab',
        actionTarget: 'Buses',
        ctaText: 'Buscar Pasajes',
        order: 0,
        active: true,
    },
    {
        id: 'mp-1',
        title: 'Escapadas Luna Viajera',
        subtitle: 'Salidas confirmadas este fin de semana • Reservá con seña mínima',
        badge: 'TURISMO RECEPTIVO',
        badgeColor: '#10b981',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80',
        actionType: 'tab',
        actionTarget: 'Explore',
        order: 1,
        active: true,
    },
    {
        id: 'mp-2',
        title: 'Club TravelApp Rewards',
        subtitle: 'Sumá puntos en tus traslados y excursiones para canjear por viajes',
        badge: 'FIDELIZACIÓN',
        badgeColor: '#f59e0b',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&auto=format&fit=crop&q=80',
        actionType: 'tab',
        actionTarget: 'Rewards',
        order: 2,
        active: true,
    },
    {
        id: 'mp-3',
        title: 'Traslados Aeropuerto VIP',
        subtitle: 'Choferes verificados, tarifa transparente y seguimiento en tiempo real',
        badge: 'TRAVELCAB',
        badgeColor: '#3b82f6',
        imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=900&auto=format&fit=crop&q=80',
        actionType: 'tab',
        actionTarget: 'TravelCab',
        order: 3,
        active: true,
    },
];

interface Props {
    cards?: any[];
    title?: string;
    subtitle?: string;
    badgeColor?: string;
    onSeeMore?: () => void;
    onNavigateTab?: (tabName: string) => void;
    cardHeight?: number;
}

export const OverlappingNativeCarousel: React.FC<Props> = ({
    cards: propCards,
    title,
    subtitle,
    badgeColor = '#10b981',
    onSeeMore,
    onNavigateTab,
    cardHeight = 162,
}) => {
    const [firestoreCards, setFirestoreCards] = useState<NativeCardItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const ref = collection(db, 'home_native_cards');
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (!snap.empty) {
                    const loaded: NativeCardItem[] = [];
                    snap.forEach((docSnap) => {
                        const data = docSnap.data() as NativeCardItem;
                        if (data.active !== false) {
                            loaded.push({ ...data, id: docSnap.id });
                        }
                    });
                    loaded.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
                    if (loaded.length > 0) {
                        setFirestoreCards(loaded);
                    }
                }
            },
            () => {
                // Mantiene tarjetas cargadas por props o fallback si no hay conexión
            }
        );

        return () => unsub();
    }, []);

    // Normalizar tarjetas provenientes de Concorde 360 (cms_blocks o home_native_cards)
    const normalizedCards: NativeCardItem[] = React.useMemo(() => {
        const source =
            propCards && propCards.length > 0
                ? propCards
                : firestoreCards.length > 0
                ? firestoreCards
                : FALLBACK_CARDS;

        return source.map((item: any, idx: number) => ({
            id: item.id || `card-${idx}`,
            title: item.title || 'Experiencia Destacada',
            subtitle: item.subtitle || item.description || '',
            badge: item.badge || item.discount || item.tag || (item.price ? `$${item.price}` : 'DESTACADO'),
            badgeColor: item.badgeColor || badgeColor || '#10b981',
            imageUrl:
                item.imageUrl ||
                item.image ||
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80',
            actionType: item.actionType || (item.ctaLink || item.url ? 'url' : undefined),
            actionTarget: item.actionTarget || item.ctaLink || item.url || undefined,
            ctaText: item.ctaText || 'Ver más',
            price: item.price,
        }));
    }, [propCards, firestoreCards, badgeColor]);

    const handleCardPress = (card: NativeCardItem) => {
        if (
            (card.actionType === 'tab' && card.actionTarget && onNavigateTab) ||
            (card.actionTarget === 'Buses' && onNavigateTab)
        ) {
            onNavigateTab(card.actionTarget!);
            return;
        }
        if (card.actionType === 'whatsapp' && card.actionTarget) {
            const cleanPhone = card.actionTarget.replace(/\D/g, '');
            Linking.openURL(`https://wa.me/${cleanPhone}`);
            return;
        }
        if (card.actionTarget && (card.actionTarget.startsWith('http') || card.actionType === 'url')) {
            Linking.openURL(card.actionTarget);
            return;
        }
        if (onSeeMore) {
            onSeeMore();
        }
    };

    const getBadgeIcon = (color?: string) => {
        if (color === '#f59e0b' || color === '#F59E0B') return <Ionicons name="gift" color="#ffffff" size={11} />;
        if (color === '#3b82f6') return <Ionicons name="car-sport" color="#ffffff" size={11} />;
        if (color === '#10b981') return <Ionicons name="compass" color="#ffffff" size={11} />;
        return <Ionicons name="sparkles" color="#ffffff" size={11} />;
    };

    if (normalizedCards.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            {/* Encabezado de sección opcional (cuando se pasa desde HomeScreen) */}
            {(title || subtitle) && (
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
                        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
                    </View>
                    {onSeeMore && (
                        <TouchableOpacity style={styles.seeMoreBtn} onPress={onSeeMore} activeOpacity={0.8}>
                            <Text style={[styles.seeMoreText, { color: badgeColor }]}>Ver todo</Text>
                            <Ionicons name="chevron-forward" size={14} color={badgeColor} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <Animated.FlatList
                data={normalizedCards}
                keyExtractor={(item, idx) => item.id || String(idx)}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                bounces={false}
                contentContainerStyle={styles.listContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    {
                        useNativeDriver: true,
                        listener: (event: any) => {
                            const offsetX = event.nativeEvent.contentOffset.x;
                            const idx = Math.round(offsetX / SNAP_INTERVAL);
                            if (idx >= 0 && idx < normalizedCards.length && idx !== activeIndex) {
                                setActiveIndex(idx);
                            }
                        },
                    }
                )}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => {
                    const inputRange = [
                        (index - 1) * SNAP_INTERVAL,
                        index * SNAP_INTERVAL,
                        (index + 1) * SNAP_INTERVAL,
                    ];

                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.91, 1, 0.91],
                        extrapolate: 'clamp',
                    });

                    const translateY = scrollX.interpolate({
                        inputRange,
                        outputRange: [6, 0, 6],
                        extrapolate: 'clamp',
                    });

                    // Efecto de superposición flotante estilo Mercado Pago
                    const translateX = scrollX.interpolate({
                        inputRange,
                        outputRange: [14, 0, -14],
                        extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.88, 1, 0.88],
                        extrapolate: 'clamp',
                    });

                    const isActive = index === activeIndex;

                    return (
                        <Animated.View
                            style={[
                                styles.cardOuterContainer,
                                {
                                    width: CARD_WIDTH,
                                    height: cardHeight,
                                    marginRight: index === normalizedCards.length - 1 ? 24 : CARD_OVERLAP,
                                    zIndex: isActive ? 30 : 20 - index,
                                    elevation: isActive ? 16 : 8,
                                    opacity,
                                    transform: [{ scale }, { translateY }, { translateX }],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                activeOpacity={0.92}
                                onPress={() => handleCardPress(item)}
                                style={styles.touchable}
                            >
                                <ImageBackground
                                    source={{ uri: item.imageUrl }}
                                    style={styles.imageBg}
                                    imageStyle={styles.imageStyle}
                                    resizeMode="cover"
                                >
                                    {/* IMAGEN 100% LIMPIA — Sin cajas ni capas oscuras que tapen la foto */}
                                    <View style={styles.topRow}>
                                        <View
                                            style={[
                                                styles.badgePill,
                                                { backgroundColor: item.badgeColor || badgeColor || '#10b981' },
                                            ]}
                                        >
                                            {getBadgeIcon(item.badgeColor || badgeColor)}
                                            <Text style={styles.badgeText}>
                                                {(item.badge || 'DESTACADO').toUpperCase()}
                                            </Text>
                                        </View>

                                        <View style={styles.actionCircle}>
                                            <Ionicons name="arrow-forward" color="#ffffff" size={14} />
                                        </View>
                                    </View>

                                    {/* Texto directo sobre la imagen limpia con sombra intensa para máximo contraste */}
                                    <View style={styles.cardBottomContainer}>
                                        <Text numberOfLines={1} style={styles.cardTitle}>
                                            {item.title}
                                        </Text>
                                        {item.subtitle ? (
                                            <Text numberOfLines={2} style={styles.cardSubtitle}>
                                                {item.subtitle}
                                            </Text>
                                        ) : null}
                                        {item.price ? (
                                            <Text style={styles.cardPrice}>
                                                Desde ${Number(item.price).toLocaleString('es-AR')}
                                            </Text>
                                        ) : null}
                                    </View>
                                </ImageBackground>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }}
            />

            {/* Indicadores tipo píldora (estilo Mercado Pago) */}
            {normalizedCards.length > 1 && (
                <View style={styles.dotsRow}>
                    {normalizedCards.map((c, idx) => {
                        const active = idx === activeIndex;
                        return (
                            <View
                                key={c.id || idx}
                                style={[
                                    styles.dot,
                                    active && [styles.dotActive, { backgroundColor: badgeColor || '#10b981' }],
                                ]}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default OverlappingNativeCarousel;

const styles = StyleSheet.create({
    wrapper: {
        marginTop: 12,
        marginBottom: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        marginBottom: 10,
    },
    sectionTitle: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    sectionSubtitle: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    seeMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    seeMoreText: {
        fontSize: 12,
        fontWeight: '800',
    },
    listContent: {
        paddingLeft: 16,
        paddingRight: 16,
        paddingVertical: 10, // Espacio vertical para que la sombra flotante no se recorte
    },
    cardOuterContainer: {
        borderRadius: 20,
        backgroundColor: '#0f172a',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55,
        shadowRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.22)',
    },
    touchable: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    imageBg: {
        flex: 1,
        justifyContent: 'space-between',
    },
    imageStyle: {
        borderRadius: 19,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 12,
        backgroundColor: 'transparent',
    },
    badgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.65,
        shadowRadius: 5,
        elevation: 6,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    actionCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBottomContainer: {
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 12,
        // Totalmente transparente para mantener la imagen 100% limpia
        backgroundColor: 'transparent',
    },
    cardTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.2,
        // Sombra intensa multicapa para que el texto resalte nítidamente sobre cualquier foto limpia
        textShadowColor: 'rgba(0, 0, 0, 0.98)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    cardSubtitle: {
        color: '#f8fafc',
        fontSize: 12.5,
        fontWeight: '700',
        marginTop: 3,
        lineHeight: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.98)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    cardPrice: {
        color: '#fbbf24',
        fontSize: 13,
        fontWeight: '900',
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.98)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },
    dotActive: {
        width: 18,
        backgroundColor: '#10b981',
    },
});
