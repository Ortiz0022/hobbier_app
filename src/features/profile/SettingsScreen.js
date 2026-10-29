import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '../../components/scaledText';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  User,
  KeyRound,
  Sliders,
  Languages,
  PlusCircle,
  Megaphone,
  ShieldCheck,
  Shield,
  FileText,
  LogOut,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeValues } from '../../context/ThemeContext';
import { createThemeStyles } from '../../theme/themeRuntime';

export const SettingsScreen = ({
  onBack,
  onNavigateToChangePassword,
  onEditProfile,
  onGoToPreferences,
  onOpenLanguage,
  onOpenCreateActivity,
  onOpenMyAds,
  onNavigateToAdmin,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  const { theme, COLORS, styles } = useThemeValues(getSettingsTheme);
  const { signOut, isAdmin } = useAuth();
  const { confirm } = useNotify();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    const accepted = await confirm({
      title: t('settings.logout_confirm_title') || '¿Cerrar sesión?',
      message: t('settings.logout_confirm_msg') || '¿Estás seguro de que deseas salir de tu cuenta?',
      confirmLabel: t('settings.logout_confirm_btn') || 'Sí, cerrar',
      confirmText: t('settings.logout_confirm_btn') || 'Sí, cerrar',
      cancelText: t('common.cancel') || 'Cancelar',
      cancelLabel: t('common.cancel') || 'Cancelar',
      destructive: true,
    });

    if (accepted) {
      await signOut();
    }
  };

  const sections = useMemo(() => {
    const list = [
      {
        id: 'account',
        title: t('settings.section_account') || 'Tu cuenta',
        items: [
          {
            id: 'edit_profile',
            title: t('profile.edit_profile') || 'Editar perfil',
            subtitle: t('settings.sub_edit_profile') || 'Nombre, foto de perfil y detalles',
            icon: User,
            iconColor: COLORS.cyanIcon,
            onPress: onEditProfile,
          },
          {
            id: 'change_password',
            title: t('settings.change_password') || 'Cambiar contraseña',
            subtitle: t('settings.sub_change_password') || 'Contraseña y seguridad de tu cuenta',
            icon: KeyRound,
            iconColor: COLORS.cyanIcon,
            onPress: onNavigateToChangePassword,
          },
        ],
      },
      {
        id: 'usage',
        title: t('settings.section_usage') || 'Cómo usas Hobbier',
        items: [
          {
            id: 'preferences',
            title: t('profile.config_preferences') || 'Tus gustos e intereses',
            subtitle: t('settings.sub_preferences') || 'Categorías y preferencias recomendadas',
            icon: Sliders,
            iconColor: COLORS.cyanIcon,
            onPress: onGoToPreferences,
          },
          {
            id: 'language',
            title: t('language.title') || 'Idioma',
            subtitle: language === 'es' ? 'Español' : 'English',
            icon: Languages,
            iconColor: COLORS.cyanIcon,
            onPress: onOpenLanguage,
          },
        ],
      },
      {
        id: 'community',
        title: t('settings.section_community') || 'Comunidad y creadores',
        items: [
          {
            id: 'create_activity',
            title: t('profile.create_own_activity') || 'Crear actividad propia',
            subtitle: t('settings.sub_create_activity') || 'Propón una actividad para la comunidad',
            icon: PlusCircle,
            iconColor: COLORS.orange,
            onPress: onOpenCreateActivity,
          },
          {
            id: 'my_ads',
            title: t('profile.my_ad_requests') || 'Mis solicitudes de anuncios',
            subtitle: t('settings.sub_my_ads') || 'Revisa el estado de tus promociones',
            icon: Megaphone,
            iconColor: COLORS.cyanIcon,
            onPress: onOpenMyAds,
          },
          ...(isAdmin
            ? [
                {
                  id: 'admin_panel',
                  title: t('settings.admin_panel') || 'Administrar aplicación',
                  subtitle: t('settings.sub_admin_panel') || 'Panel de administración y estadísticas',
                  icon: ShieldCheck,
                  iconColor: COLORS.orange,
                  onPress: onNavigateToAdmin,
                },
              ]
            : []),
        ],
      },
      {
        id: 'legal',
        title: t('settings.section_legal') || 'Más información y asistencia',
        items: [
          {
            id: 'privacy',
            title: t('legal.privacy_policy') || 'Política de privacidad',
            subtitle: t('settings.sub_privacy') || 'Conoce cómo protegemos tus datos personales',
            icon: Shield,
            iconColor: COLORS.textSecondary,
            onPress: onOpenPrivacy,
          },
          {
            id: 'terms',
            title: t('legal.terms_of_use') || 'Condiciones de uso',
            subtitle: t('settings.sub_terms') || 'Normas del servicio y uso de la comunidad',
            icon: FileText,
            iconColor: COLORS.textSecondary,
            onPress: onOpenTerms,
          },
        ],
      },
      {
        id: 'session',
        title: t('settings.section_session') || 'Sesión',
        items: [
          {
            id: 'logout',
            title: t('profile.logout') || 'Cerrar sesión',
            subtitle: t('settings.sub_logout') || 'Cierra tu sesión en este dispositivo',
            icon: LogOut,
            iconColor: COLORS.danger,
            isDestructive: true,
            onPress: handleSignOut,
          },
        ],
      },
    ];

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list
      .map((sec) => {
        const filteredItems = sec.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(q))
        );
        return {
          ...sec,
          items: filteredItems,
        };
      })
      .filter((sec) => sec.items.length > 0);
  }, [searchQuery, language, isAdmin, t, COLORS]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title') || 'Configuración y actividad'}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Search size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('settings.search_placeholder') || 'Buscar'}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.searchClearBtn}
              >
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* SECTIONS */}
          {sections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('settings.no_results', { query: searchQuery }) || `No se encontraron resultados para "${searchQuery}"`}
              </Text>
            </View>
          ) : (
            sections.map((sec) => (
              <View key={sec.id} style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
                <View style={styles.sectionCard}>
                  {sec.items.map((item, idx) => {
                    const IconComponent = item.icon;
                    const isLast = idx === sec.items.length - 1;
                    return (
                      <React.Fragment key={item.id}>
                        <TouchableOpacity
                          style={styles.itemRow}
                          onPress={item.onPress}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.itemIconWrap,
                              item.isDestructive && styles.destructiveIconWrap,
                            ]}
                          >
                            <IconComponent
                              size={20}
                              color={item.isDestructive ? COLORS.danger : item.iconColor}
                            />
                          </View>

                          <View style={styles.itemContentCol}>
                            <Text
                              style={[
                                styles.itemTitle,
                                item.isDestructive && styles.destructiveText,
                              ]}
                            >
                              {item.title}
                            </Text>
                            {Boolean(item.subtitle) && (
                              <Text style={styles.itemSubtitle} numberOfLines={1}>
                                {item.subtitle}
                              </Text>
                            )}
                          </View>

                          {!item.isDestructive && (
                            <ChevronRight size={18} color={COLORS.textMuted} />
                          )}
                        </TouchableOpacity>

                        {!isLast && <View style={styles.rowDivider} />}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const getSettingsTheme = createThemeStyles((theme) => {
  const isDark = theme.isDark;

  const COLORS = {
    bg: theme.color('#FFFFFF', 'background'),
    cardBg: isDark ? '#1C1C1E' : '#FFFFFF',
    border: theme.color('#E2E8F0', 'border'),
    divider: isDark ? '#2C2C2E' : '#F1F5F9',
    textPrimary: theme.color('#0F172A', 'text'),
    textSecondary: theme.color('#64748B', 'muted'),
    textMuted: theme.color('#94A3B8', 'muted'),
    searchBg: isDark ? '#2C2C2E' : '#F1F5F9',
    cyan: theme.color('#00C9FD', 'primary'),
    cyanIcon: isDark ? '#00C9FD' : '#0C8AA6',
    orange: theme.color('#FF5A00', 'accent'),
    danger: theme.color('#EF4444', 'danger'),
    dangerSoft: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 14 : 8,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    backBtn: {
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.textPrimary,
      letterSpacing: -0.2,
    },
    headerRightSpacer: {
      width: 32,
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    contentWrap: {
      width: '100%',
      maxWidth: 580,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.searchBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 20,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: COLORS.textPrimary,
      paddingVertical: 0,
    },
    searchClearBtn: {
      padding: 4,
    },
    sectionWrap: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionCard: {
      backgroundColor: COLORS.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        },
      }),
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    itemIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    destructiveIconWrap: {
      backgroundColor: COLORS.dangerSoft,
    },
    itemContentCol: {
      flex: 1,
      marginRight: 8,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: COLORS.textPrimary,
      letterSpacing: -0.2,
    },
    itemSubtitle: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    destructiveText: {
      color: COLORS.danger,
      fontWeight: '600',
    },
    rowDivider: {
      height: 1,
      backgroundColor: COLORS.divider,
      marginLeft: 66,
    },
    emptyContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: COLORS.textMuted,
    },
  });

  return { COLORS, styles };
});
