import { ThemeProvider, useThemeValues } from './src/context/ThemeContext';
import { createThemeStyles } from './src/theme/themeRuntime';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { Text } from './src/components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import {
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SuspendedScreen } from './src/features/auth/SuspendedScreen';
import { PresenceProvider } from './src/context/PresenceContext';
import { NotificationProvider, useNotify } from './src/context/NotificationContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { adminNotificationService } from './src/services/adminNotificationService';
import { AuthScreen } from './src/features/auth/AuthScreen';
import { SplashScreen } from './src/features/auth/SplashScreen';
import { ResetPasswordScreen } from './src/features/auth/ResetPasswordScreen';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { useNeedsOnboarding } from './src/features/onboarding/hooks/useNeedsOnboarding';
import { RecommendationScreen } from './src/features/recommendations/RecommendationScreen';
import { PendingActivityScreen } from './src/features/user_activities/PendingActivityScreen';
import { FeedScreen } from './src/features/feed/FeedScreen';
import { FriendsScreen } from './src/features/friends/FriendsScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';
import { AdminScreen } from './src/features/admin/AdminScreen';
import { CookieBanner } from './src/legal/CookieBanner';
import { pushService } from './src/services/pushService';
import { escucharDestino, recogerDestino } from './src/services/avisoDestino';
// Se importa con otro nombre a propósito: `SplashScreen` ya es la bienvenida
// de la propia app (la de los iconos), y esta es la del sistema operativo, la
// que se ve antes de que exista una sola vista de React.
import * as ArranqueNativo from 'expo-splash-screen';

// Con la app abierta, un aviso que llega se enseña igual; sin esto no se ve
// nada y parece que no llegó.
pushService.configurarAvisosEnPrimerPlano();

// El arranque del sistema se queda puesto hasta que la app tenga algo que
// enseñar. Sin esto se descubre en cuanto React monta la primera vista, que
// todavía es el "cargando" en blanco de las fuentes: justo el parpadeo blanco
// que no queremos. Se esconde a mano más abajo, cuando ya se sabe si hay
// sesión.
ArranqueNativo.preventAutoHideAsync().catch(() => {});

const MainApp = () => {
  const { theme, styles } = useThemeValues(getAppTheme);

  const { user, loading, isAdmin, passwordRecovery, suspension } = useAuth();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [currentScreen, setCurrentScreen] = useState('recommendations');
  const [navHistory, setNavHistory] = useState([]);
  const [autoExpandId, setAutoExpandId] = useState(null);
  // A qué pestaña volver si se sale de preferencias sin guardar. Se recuerda
  // porque a preferencias se entra desde dos sitios (Sugerencia y Perfil) y
  // devolver siempre al mismo dejaría al usuario en una pantalla que no pidió.
  const [volverA, setVolverA] = useState('recommendations');
  // Sección abierta dentro del panel de administración. Vive aquí y no dentro
  // de AdminScreen porque es la barra de navegación de abajo (que es de App)
  // la que cambia de sección cuando el admin está en el panel.
  const [adminSection, setAdminSection] = useState('overview');
  // La bienvenida se ve una sola vez por arranque de la app, antes del login.
  const [showSplash, setShowSplash] = useState(true);
  // A dónde lleva la notificación que se acaba de tocar, mientras la pantalla
  // de destino no lo haya atendido.
  const [destinoAviso, setDestinoAviso] = useState(null);
  // Lo que el escuchador de avisos necesita, siempre al día, sin que eso le
  // obligue a volver a suscribirse.
  const navegacionRef = useRef({ navegarA: () => {}, isAdmin: false });
  const { estado: estadoOnboarding, marcarCompletado } = useNeedsOnboarding(user?.id);

  const navegarA = useCallback((nuevaPantalla) => {
    if (nuevaPantalla === currentScreen) return;
    setNavHistory((prev) => [...prev.slice(-15), currentScreen]);
    setCurrentScreen(nuevaPantalla);
  }, [currentScreen]);

  // Manejo de retroceso físico / gestos de Android
  useEffect(() => {
    const onBackPress = () => {
      // 1. Panel de administración
      if (currentScreen === 'admin') {
        if (adminSection !== 'overview') {
          setAdminSection('overview');
          return true;
        }
        setCurrentScreen('profile');
        return true;
      }

      // 2. Preferencias
      if (currentScreen === 'preferences') {
        setCurrentScreen(volverA || 'recommendations');
        return true;
      }

      // 3. Amigos dentro del perfil
      if (currentScreen === 'profile_friends') {
        setCurrentScreen('profile');
        return true;
      }

      // 4. Historial de pestañas anteriores
      if (navHistory.length > 0) {
        const previo = navHistory[navHistory.length - 1];
        setNavHistory((prev) => prev.slice(0, -1));
        setCurrentScreen(previo);
        return true;
      }

      // 5. Si no está en recommendations y no hay historial, volver a recommendations
      if (currentScreen !== 'recommendations') {
        setCurrentScreen('recommendations');
        return true;
      }

      // 6. En inicio con historial vacío, salir de la app
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [currentScreen, adminSection, volverA, navHistory]);

  // Avisos push: se pide permiso y se guarda el token de este aparato una vez
  // por sesión. Si la persona dice que no, no se vuelve a insistir, y si la
  // dependencia no está instalada el servicio se queda callado.
  useEffect(() => {
    if (!user?.id) return;
    pushService.registrarDispositivo();
  }, [user?.id]);

  navegacionRef.current = { navegarA, isAdmin };

  // Tocar una notificación lleva a su sitio: un mensaje abre esa conversación,
  // uno de sala abre esa sala, una solicitud abre la pestaña de solicitudes.
  //
  // Aquí solo se cambia de sección. Lo fino —qué chat o qué sala— lo hace la
  // pantalla de Comunidad, que es quien sabe abrirlos; se le pasa el destino y
  // ella avisa cuando lo ha atendido.
  useEffect(() => {
    if (!user?.id) return undefined;

    const atender = () => {
      const pendiente = recogerDestino();
      if (!pendiente) return;
      // El panel es solo para administradores; si no lo es, se queda donde está.
      if (pendiente.seccion === 'admin' && !navegacionRef.current.isAdmin) return;
      setDestinoAviso(pendiente);
      if (pendiente.panel) setAdminSection(pendiente.panel);
      navegacionRef.current.navegarA(pendiente.seccion);
    };

    // Por si el toque llegó antes de que esta pantalla existiera (app cerrada).
    atender();
    const dejarDeEscuchar = escucharDestino(atender);
    const dejarDeEscucharToques = pushService.escucharToquesDeAviso();
    return () => { dejarDeEscuchar(); dejarDeEscucharToques(); };
    // Se registra UNA vez por sesión. Si dependiera de `navegarA` —que cambia
    // con cada pantalla— se volvería a suscribir sin parar, y al hacerlo se
    // volvería a preguntar por el último aviso tocado: la app saltaría sola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Se destapa la app cuando ya se sabe si hay sesión. Así lo primero que se
  // ve tras el logo es una pantalla de verdad (la bienvenida o el inicio) y no
  // un rueda girando sobre blanco.
  useEffect(() => {
    if (!loading) ArranqueNativo.hideAsync().catch(() => {});
  }, [loading]);
  const { notify } = useNotify();

  // Escuchar notificaciones de soporte para administradores en tiempo real
  React.useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = adminNotificationService.subscribeToNotifications((newNotif) => {
      notify(newNotif.body, {
        type: 'info',
        title: newNotif.title,
        duration: 5000,
      });
    });
    return unsubscribe;
  }, [isAdmin, notify]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color("#386756", 'success')} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Va ANTES de comprobar `user`: el enlace del correo abre la app con sesión ya
  // iniciada, así que sin este corte el usuario entraría directo al inicio y nunca
  // llegaría a escribir su contraseña nueva.
  if (passwordRecovery) {
    return <ResetPasswordScreen />;
  }

  // Cuenta suspendida por reporte: ocupa toda la app hasta que expire la fecha.
  // Va tras `passwordRecovery` para no tapar el flujo de recuperar contraseña.
  if (suspension) {
    return <SuspendedScreen />;
  }

  if (!user) {
    if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }
    return <AuthScreen />;
  }

  // Se espera a saber si faltan preferencias antes de pintar nada: entrar al
  // inicio y que la pantalla salte al asistente un segundo después parece un fallo.
  if (estadoOnboarding === 'comprobando') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color("#386756", 'success')} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Cuenta nueva: el asistente ocupa la pantalla entera y no tiene salida
  // (`onCancel` ausente). Al terminar se entra a la app sin volver a consultar.
  if (estadoOnboarding === 'falta') {
    return (
      <SafeAreaView style={[styles.safeArea, isDesktop && styles.safeAreaDesktop]}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.color("#ffffff", 'background')} />
        <OnboardingScreen
          obligatorio
          onComplete={() => {
            marcarCompletado();
            setCurrentScreen('recommendations');
          }}
        />
      </SafeAreaView>
    );
  }

  const irAPreferencias = (origen) => {
    setVolverA(origen);
    navegarA('preferences');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'recommendations':
        return (
          <RecommendationScreen
            onActivityAccepted={(userActivity) => {
              if (userActivity?.id) {
                setAutoExpandId(userActivity.id);
              }
              navegarA('my_activities');
            }}
            onGoToPreferences={() => irAPreferencias('recommendations')}
            onNavigateToFeed={() => navegarA('feed')}
            onNavigateToActivities={() => navegarA('my_activities')}
          />
        );
      case 'my_activities':
        return (
          <PendingActivityScreen
            initialExpandedId={autoExpandId}
            onNavigateToProfile={() => {
              setAutoExpandId(null);
              navegarA('profile');
            }}
            onNavigateToRecommendations={() => navegarA('recommendations')}
          />
        );
      case 'feed':
        return (
          <FeedScreen
            onActivityAccepted={(userActivity) => {
              if (userActivity?.id) {
                setAutoExpandId(userActivity.id);
              }
              navegarA('my_activities');
            }}
          />
        );
      case 'friends':
        return (
          <FriendsScreen
            destinoDeAviso={destinoAviso}
            onDestinoAtendido={() => setDestinoAviso(null)}
          />
        );
      case 'profile_friends':
        return <FriendsScreen isProfileView={true} onBack={() => {
          setNavHistory((prev) => prev.slice(0, -1));
          setCurrentScreen('profile');
        }} />;
      case 'profile':
        return (
          <ProfileScreen
            onGoToPreferences={() => irAPreferencias('profile')}
            onNavigateToFriends={() => navegarA('profile_friends')}
            onNavigateToAdmin={() => {
              setAdminSection('overview');
              navegarA('admin');
            }}
          />
        );
      case 'preferences':
        return (
          <OnboardingScreen
            onComplete={() => navegarA('recommendations')}
            // Sin barra de navegación abajo, la flecha del primer paso es la
            // ÚNICA salida: sin esto el usuario queda encerrado en el asistente
            // hasta terminarlo.
            onCancel={() => {
              setNavHistory((prev) => prev.slice(0, -1));
              setCurrentScreen(volverA);
            }}
          />
        );
      case 'admin':
        return (
          <AdminScreen
            section={adminSection}
            onNavigateSection={setAdminSection}
            // Cada pantalla del panel tiene su salida: se vuelve a Perfil, que
            // es de donde se entra al panel.
            onExit={() => {
              setNavHistory((prev) => prev.slice(0, -1));
              setCurrentScreen('profile');
            }}
          />
        );
      default:
        return <RecommendationScreen />;
    }
  };

  const navItemsUsuario = [
    { key: 'recommendations', label: t('nav.discover'), icon: 'gift' },
    { key: 'feed', label: t('nav.feed'), icon: 'rss' },
    { key: 'my_activities', label: t('nav.missions'), icon: 'target' },
    { key: 'friends', label: t('nav.community'), icon: 'users' },
    { key: 'profile', label: t('nav.profile'), icon: 'user' },
  ];

  // Dentro del panel, la misma barra pasa a ofrecer las secciones del panel:
  // moverse por la administración se siente igual que moverse por la app, y no
  // hace falta volver a Perfil para cambiar de sección.
  const navItemsAdmin = [
    { key: 'overview', label: t('admin.nav_overview'), icon: 'activity' },
    { key: 'support', label: t('admin.nav_support'), icon: 'message-circle' },
    { key: 'users', label: t('admin.nav_users'), icon: 'users' },
    { key: 'posts', label: t('admin.nav_posts'), icon: 'image' },
    { key: 'activities', label: t('admin.nav_activities'), icon: 'zap' },
    { key: 'ads', label: t('admin.nav_ads'), icon: 'speaker' },
  ];

  const enPanelAdmin = currentScreen === 'admin' && isAdmin;
  const navItems = enPanelAdmin ? navItemsAdmin : navItemsUsuario;
  const claveActiva = enPanelAdmin ? adminSection : currentScreen;
  const irA = (clave) => (enPanelAdmin ? setAdminSection(clave) : navegarA(clave));


  // El asistente de preferencias ocupa la pantalla entera: es un flujo con sus
  // propios pasos y su propia salida, y dejar las pestañas abajo invita a irse
  // a la mitad y perder lo elegido.
  const pantallaCompleta = currentScreen === 'preferences';

  return (
    <SafeAreaView style={[styles.safeArea, isDesktop && styles.safeAreaDesktop]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.color("#ffffff", 'background')} />

      <View style={[styles.rootContainer, isDesktop && styles.rootContainerDesktop]}>
        {/* BARRA LATERAL (SIDEBAR) TIPO INSTAGRAM PARA ESCRITORIO / WEB */}
        {isDesktop && !pantallaCompleta && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.brandTitle}>Hobbier</Text>
            </View>

            <View style={styles.sidebarNav}>
              {navItems.map((item) => {
                const isActive = claveActiva === item.key;
                const iconColor = isActive ? theme.color('#0C8AA6', 'primary') : theme.color('#64748b', "muted");

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                    onPress={() => irA(item.key)}
                    activeOpacity={0.7}
                  >
                    <Feather name={item.icon} size={22} color={iconColor} />
                    <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* CONTENEDOR PRINCIPAL: CENTRADO EN DESKTOP */}
        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          <View style={[styles.contentInner, isDesktop && styles.contentInnerDesktop]}>
            {renderScreen()}
          </View>
        </View>
      </View>

      {/* BARRA DE NAVEGACIÓN INFERIOR PARA MÓVIL */}
      {!isDesktop && !pantallaCompleta && (
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            {navItems.map((item) => {
              const isActive = claveActiva === item.key;
              const iconColor = isActive ? theme.color('#0C8AA6', 'primary') : theme.color('#121B22', 'text');

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.navItem, enPanelAdmin && styles.navItemAdmin]}
                  onPress={() => irA(item.key)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <Feather name={item.icon} size={20} color={iconColor} />
                  <Text
                    style={[styles.navLabel, enPanelAdmin && styles.navLabelAdmin, isActive && styles.navLabelActive]}
                    numberOfLines={enPanelAdmin ? 2 : undefined}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

function AppContent() {
  const [fontsLoaded, errorDeFuentes] = useFonts({
    'DynaPuff': require('./assets/fonts/DynaPuff.ttf'),
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Red de seguridad: si algo se atasca al arrancar, el logo no se puede
  // quedar puesto para siempre. Pasados unos segundos se destapa pase lo que
  // pase, aunque sea para enseñar el "cargando".
  useEffect(() => {
    const reloj = setTimeout(() => {
      ArranqueNativo.hideAsync().catch(() => {});
    }, 8000);
    return () => clearTimeout(reloj);
  }, []);

  // Mientras cargan las fuentes no se pinta nada: encima sigue el logo del
  // sistema, y poner aquí un fondo blanco con una rueda sería cambiar el logo
  // por una pantalla en blanco durante medio segundo. Si las fuentes fallan se
  // sigue igualmente, con las del sistema.
  if (!fontsLoaded && !errorDeFuentes) {
    return null;
  }

  return (
    <LanguageProvider>
      <NotificationProvider>
        <AuthProvider>
          <PresenceProvider>
            <MainApp />
            {/* Fuera de MainApp para que aparezca desde la primera pantalla,
                antes de iniciar sesión. Solo se muestra en web. */}
            <CookieBanner />
          </PresenceProvider>
        </AuthProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}




// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAppTheme = createThemeStyles((theme) => {
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.color('#ffffff', 'background'),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  safeAreaDesktop: {
    backgroundColor: theme.color('#f8fafc', 'background'),
  },
  rootContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  rootContainerDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: '100%',
  },
  sidebar: {
    width: 240,
    backgroundColor: theme.color('#ffffff', 'secondary'),
    borderRightWidth: 1,
    borderRightColor: theme.color('#f1f5f9', 'border'),
    paddingVertical: 28,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  sidebarHeader: {
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  brandTitle: {
    fontFamily: 'DynaPuff',
    fontSize: 26,
    color: theme.color('#0C8AA6', 'primary'),
    letterSpacing: 0.5,
  },
  sidebarNav: {
    gap: 6,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 14,
  },
  sidebarItemActive: {
    backgroundColor: theme.color('#f0fdfa', 'selected'),
  },
  sidebarLabel: {
    fontSize: 15,
    color: theme.color('#475569', 'muted'),
    fontWeight: '500',
  },
  sidebarLabelActive: {
    color: theme.color('#0C8AA6', 'primary'),
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
  },
  mainContentDesktop: {
    alignItems: 'center',
    backgroundColor: theme.color('#f8fafc', 'background'),
  },
  contentInner: {
    flex: 1,
    width: '100%',
  },
  contentInnerDesktop: {
    maxWidth: 640,
    backgroundColor: theme.color('#ffffff', 'background'),
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: theme.color('#f1f5f9', 'border'),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.color('#ffffff', 'background'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.color('#64748b', "muted"),
    marginTop: 12,
    fontSize: 14,
  },
  bottomNavContainer: {
    backgroundColor: theme.color('#ffffff', 'secondary'),
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.color('#ffffff', 'secondary'),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px -3px 10px rgba(0,0,0,0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
    }),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  navItemAdmin: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  navLabel: {
    fontSize: 11,
    color: theme.color('#121B22', 'text'),
    fontWeight: '500',
    marginTop: 3,
  },
  navLabelAdmin: {
    width: '100%',
    fontSize: 10,
    lineHeight: 14,
    minHeight: 28,
    textAlign: 'center',
  },
  navLabelActive: {
    color: theme.color('#0C8AA6', 'primary'),
    fontWeight: '600',
  },
});
  return { theme, styles };
});
