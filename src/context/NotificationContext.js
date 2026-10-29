import { useThemeValues } from './ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '../components/scaledText';
import Feather from '@expo/vector-icons/Feather';

// Reemplaza alert()/Alert.alert()/window.confirm(): en web, Alert.alert de
// react-native-web no se muestra, y alert()/confirm() nativos salen con el
// feo prefijo "localhost dice". Este toast + modal de confirmación usan la
// misma identidad visual del resto de la app (tarjetas redondeadas, acento
// cian/naranja) y no bloquean la pantalla como un alert nativo.

const NotificationContext = createContext(null);

export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotify debe usarse dentro de NotificationProvider');
  }
  return ctx;
};



const DURATIONS = {
  success: 2800,
  info: 2800,
  warning: 3600,
  error: 4200,
};

let toastIdSeq = 0;

const ToastItem = ({ toast, onDismiss }) => {
  const { theme, TYPE_STYLES, toastStyles, confirmStyles } = useThemeValues(getNotificationContextTheme);

  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => handleDismiss(), toast.duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -16,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View
      style={[
        toastStyles.card,
        { borderLeftColor: config.accent, opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity
        style={toastStyles.touchable}
        onPress={handleDismiss}
        activeOpacity={0.85}
      >
        <View style={[toastStyles.iconWrap, { backgroundColor: `${config.accent}1A` }]}>
          <Feather name={config.icon} size={16} color={config.iconColor} />
        </View>
        <View style={toastStyles.textCol}>
          {!!toast.title && <Text style={toastStyles.title}>{toast.title}</Text>}
          <Text style={toastStyles.message} numberOfLines={3}>{toast.message}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ConfirmDialog = ({ state, onResolve }) => {
  const { theme, TYPE_STYLES, toastStyles, confirmStyles } = useThemeValues(getNotificationContextTheme);

  if (!state) return null;
  const destructive = !!state.destructive;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => onResolve(false)}>
      <Pressable style={confirmStyles.overlay} onPress={() => onResolve(false)}>
        <Pressable style={confirmStyles.card} onPress={() => {}}>
          {destructive && (
            <View style={confirmStyles.iconWrap}>
              <Feather name="alert-triangle" size={22} color={theme.color("#E53E3E", 'danger')} />
            </View>
          )}
          <Text style={confirmStyles.title}>{state.title}</Text>
          {!!state.message && <Text style={confirmStyles.message}>{state.message}</Text>}

          <View style={confirmStyles.actions}>
            <TouchableOpacity
              style={[confirmStyles.confirmBtn, destructive && confirmStyles.confirmBtnDestructive]}
              onPress={() => onResolve(true)}
              activeOpacity={0.8}
            >
              <Text style={confirmStyles.confirmText}>
                {state.confirmLabel || state.confirmText || (destructive ? 'Sí, eliminar' : 'Confirmar')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={confirmStyles.cancelBtn}
              onPress={() => onResolve(false)}
              activeOpacity={0.8}
            >
              <Text style={confirmStyles.cancelText}>{state.cancelLabel || state.cancelText || 'Cancelar'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const NotificationProvider = ({ children }) => {
  const { theme, TYPE_STYLES, toastStyles, confirmStyles } = useThemeValues(getNotificationContextTheme);

  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolverRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message, options = {}) => {
    const type = options.type || 'info';
    const id = ++toastIdSeq;
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        title: options.title,
        type,
        duration: options.duration || DURATIONS[type] || 3000,
      },
    ]);
    return id;
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState(typeof options === 'string' ? { title: options } : options);
    });
  }, []);

  const handleResolveConfirm = useCallback((result) => {
    setConfirmState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}

      <SafeAreaView style={[toastStyles.overlay, { pointerEvents: 'box-none' }]}>
        <View style={[toastStyles.stack, { pointerEvents: 'box-none' }]}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </View>
      </SafeAreaView>

      <ConfirmDialog state={confirmState} onResolve={handleResolveConfirm} />
    </NotificationContext.Provider>
  );
};





// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getNotificationContextTheme = createThemeStyles((theme) => {
const TYPE_STYLES = {
  success: { icon: 'check-circle', iconColor: theme.color('#0C8AA6', 'primary'), bg: theme.color('#FFFFFF', 'card'), accent: theme.color('#00C9FD', 'primary') },
  error: { icon: 'alert-circle', iconColor: theme.color('#E53E3E', 'danger'), bg: theme.color('#FFFFFF', 'card'), accent: theme.color('#E53E3E', 'danger') },
  warning: { icon: 'alert-triangle', iconColor: theme.color('#C2530A', 'accent'), bg: theme.color('#FFFFFF', 'card'), accent: theme.color('#FF9D3D', 'accent') },
  info: { icon: 'info', iconColor: theme.color('#0C8AA6', 'primary'), bg: theme.color('#FFFFFF', 'card'), accent: theme.color('#00C9FD', 'primary') },
};
const toastStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  stack: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 4,
    gap: 8,
  },
  card: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 16,
    borderLeftWidth: 4,
    elevation: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 20px rgba(8, 51, 61, 0.14)',
      },
      default: {
        shadowColor: '#08333D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
      },
    }),
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: theme.color('#08333D', 'text'),
    marginBottom: 1,
  },
  message: {
    fontSize: 13,
    color: theme.color('#4A5568', 'muted'),
    lineHeight: 18,
  },
});
const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.color('rgba(8, 51, 61, 0.45)', "scrim"),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    elevation: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(8, 51, 61, 0.25)',
      },
      default: {
        shadowColor: '#08333D',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
    }),
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.color('#FFF5F5', 'card'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16.5,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: theme.color('#08333D', 'text'),
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13.5,
    color: theme.color('#64748B', "muted"),
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: theme.color('#F1F3F5', 'card'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: theme.color('#4A5568', 'muted'),
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: theme.color('#0C8AA6', 'primary'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: theme.color('#E53E3E', 'dangerSurface'),
  },
  confirmText: {
    color: theme.color('#FFFFFF', 'onAccent'),
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
});
  return { theme, TYPE_STYLES, toastStyles, confirmStyles };
});
