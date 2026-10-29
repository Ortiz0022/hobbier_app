import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Text, TextInput } from '../../components/scaledText';
import { ArrowLeft, ChevronRight, Eye, EyeOff, KeyRound, Shield, Check, Info } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeValues } from '../../context/ThemeContext';
import { createThemeStyles } from '../../theme/themeRuntime';
import { supabase } from '../../config/supabase';

export const ChangePasswordScreen = ({ onBack }) => {
  const { theme, COLORS, styles } = useThemeValues(getChangePasswordTheme);
  const { user, profile, resetPassword, updatePassword } = useAuth();
  const { notify, confirm } = useNotify();
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);

  const userEmail = user?.email || profile?.email || '';
  const username = profile?.username || 'usuario';

  const handleForgotPassword = async () => {
    if (!userEmail) return;

    const accepted = await confirm({
      title: t('change_password.reset_title') || '¿Restablecer contraseña?',
      message: (t('change_password.reset_msg', { email: userEmail }) || `Enviaremos un enlace de recuperación a:\n${userEmail}`),
      confirmText: t('change_password.send_email') || 'Enviar correo',
      cancelText: t('common.cancel') || 'Cancelar',
    });

    if (!accepted) return;

    setSendingReset(true);
    try {
      const { error } = await resetPassword({ email: userEmail });
      if (error) {
        notify({
          type: 'error',
          message: error.message || t('change_password.reset_error') || 'No se pudo enviar el correo de recuperación.',
        });
      } else {
        notify({
          type: 'success',
          message: t('change_password.reset_sent') || 'Hemos enviado el enlace a tu correo electrónico.',
        });
      }
    } catch (err) {
      notify({
        type: 'error',
        message: 'Ocurrió un error inesperado al enviar el correo.',
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      notify({
        type: 'warning',
        message: t('change_password.current_required') || 'Por favor, ingresa tu contraseña actual.',
      });
      return;
    }

    if (newPassword.length < 6) {
      notify({
        type: 'warning',
        message: t('change_password.min_length') || 'La nueva contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }

    // Instagram requirement: letters and numbers
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      notify({
        type: 'warning',
        message: t('change_password.letters_and_numbers') || 'La nueva contraseña debe incluir al menos una letra y un número.',
      });
      return;
    }

    if (newPassword === currentPassword) {
      notify({
        type: 'warning',
        message: t('change_password.different_from_current') || 'La nueva contraseña no puede ser igual a la contraseña actual.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notify({
        type: 'warning',
        message: t('change_password.passwords_dont_match') || 'Las nuevas contraseñas no coinciden.',
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (verifyError) {
        notify({
          type: 'error',
          message: t('change_password.current_incorrect') || 'La contraseña actual es incorrecta.',
        });
        setLoading(false);
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await updatePassword(newPassword);
      if (updateError) {
        notify({
          type: 'error',
          message: updateError.message || 'No se pudo actualizar la contraseña.',
        });
      } else {
        notify({
          type: 'success',
          message: t('change_password.update_success') || 'Contraseña actualizada correctamente.',
        });
        if (onBack) onBack();
      }
    } catch (err) {
      notify({
        type: 'error',
        message: 'Error inesperado al cambiar la contraseña.',
      });
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>{t('change_password.title') || 'Cambiar contraseña'}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {/* EXPLANATORY TEXT */}
          <Text style={styles.descriptionText}>
            {t('change_password.description') || 'Usarás esta contraseña para iniciar sesión en tu cuenta de Hobbier. Crea una que tenga al menos 6 letras y números.'}
          </Text>

          <TouchableOpacity
            style={styles.secureTipsBtn}
            onPress={() => setShowTipsModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.secureTipsLink}>{t('change_password.tips_link') || 'Cómo crear una contraseña segura'}</Text>
          </TouchableOpacity>

          {/* ACCOUNT PILL CARD */}
          <View style={styles.accountCard}>
            <View style={styles.accountCardLeft}>
              <View style={styles.accountIconWrap}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.accountAvatar} />
                ) : (
                  <KeyRound size={20} color={COLORS.cyan} />
                )}
              </View>
              <View style={styles.accountInfoCol}>
                <Text style={styles.accountEmail} numberOfLines={1}>
                  {userEmail}
                </Text>
                <Text style={styles.accountSubtitle}>@{username}</Text>
              </View>
            </View>

            <View style={styles.accountCardRight}>
              {profile?.avatar_url && (
                <Image source={{ uri: profile.avatar_url }} style={styles.miniAvatarBadge} />
              )}
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </View>
          </View>

          {/* INPUTS CONTAINER */}
          <View style={styles.formContainer}>
            {/* CURRENT PASSWORD */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputField}
                placeholder={t('change_password.current_password') || 'Contraseña actual'}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowCurrent(!showCurrent)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showCurrent ? (
                  <EyeOff size={20} color={COLORS.textSecondary} />
                ) : (
                  <Eye size={20} color={COLORS.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* NEW PASSWORD */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputField}
                placeholder={t('change_password.new_password') || 'Contraseña nueva'}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowNew(!showNew)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showNew ? (
                  <EyeOff size={20} color={COLORS.textSecondary} />
                ) : (
                  <Eye size={20} color={COLORS.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* CONFIRM NEW PASSWORD */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputField}
                placeholder={t('change_password.confirm_password') || 'Repetir contraseña nueva'}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showConfirm ? (
                  <EyeOff size={20} color={COLORS.textSecondary} />
                ) : (
                  <Eye size={20} color={COLORS.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* FORGOT PASSWORD LINK */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={handleForgotPassword}
            disabled={sendingReset}
            activeOpacity={0.7}
          >
            {sendingReset ? (
              <ActivityIndicator size="small" color={COLORS.cyan} />
            ) : (
              <Text style={styles.forgotLink}>{t('change_password.forgot_password') || '¿Olvidaste tu contraseña?'}</Text>
            )}
          </TouchableOpacity>

          {/* SECURITY NOTE */}
          <Text style={styles.securityNote}>
            {t('change_password.security_note') || 'Si otra persona usó tu cuenta, te recomendamos cambiar la contraseña periódicamente y no compartirla.'}
          </Text>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!currentPassword || !newPassword || !confirmPassword || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{t('change_password.submit_btn') || 'Cambiar contraseña'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BOTTOM SHEET: CÓMO CREAR UNA CONTRASEÑA SEGURA */}
      <Modal
        visible={showTipsModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowTipsModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setShowTipsModal(false)}
          />
          <View style={styles.sheetContainer}>
            {/* Grabber indicator bar */}
            <View style={styles.sheetGrabber} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconWrap}>
                <Shield size={22} color={COLORS.cyan} />
              </View>
              <Text style={styles.sheetTitle}>{t('change_password.tips_title') || 'Contraseña segura'}</Text>
            </View>

            <Text style={styles.sheetSubtitle}>
              {t('change_password.tips_subtitle') || 'Recomendaciones para proteger tu cuenta de Hobbier:'}
            </Text>

            <View style={styles.tipsList}>
              <View style={styles.tipRow}>
                <View style={styles.tipCheckWrap}>
                  <Check size={14} color={COLORS.cyan} />
                </View>
                <Text style={styles.tipText}>
                  {t('change_password.tip_1') || 'Usa al menos 6 caracteres (recomendado 8 o más).'}
                </Text>
              </View>

              <View style={styles.tipRow}>
                <View style={styles.tipCheckWrap}>
                  <Check size={14} color={COLORS.cyan} />
                </View>
                <Text style={styles.tipText}>
                  {t('change_password.tip_2') || 'Combina letras mayúsculas, minúsculas y números.'}
                </Text>
              </View>

              <View style={styles.tipRow}>
                <View style={styles.tipCheckWrap}>
                  <Check size={14} color={COLORS.cyan} />
                </View>
                <Text style={styles.tipText}>
                  {t('change_password.tip_3') || 'Evita palabras comunes o secuencias numéricas (ej: 123456).'}
                </Text>
              </View>

              <View style={styles.tipRow}>
                <View style={styles.tipCheckWrap}>
                  <Check size={14} color={COLORS.cyan} />
                </View>
                <Text style={styles.tipText}>
                  {t('change_password.tip_4') || 'No uses información personal fácil de averiguar, como tu fecha de nacimiento.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setShowTipsModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetCloseBtnText}>{t('change_password.tips_close') || 'Entendido'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export const getChangePasswordTheme = createThemeStyles((theme) => {
  const isDark = theme.isDark;

  const COLORS = {
    bg: theme.color('#FFFFFF', 'background'),
    surface: theme.color('#FFFFFF', 'card'),
    inputBg: isDark ? '#1C1C1E' : '#F6F8FA',
    accountBg: isDark ? '#1C1C1E' : '#F1F5F9',
    border: theme.color('#E2E8F0', 'border'),
    inputBorder: isDark ? '#2C2C2E' : '#E2E8F0',
    textPrimary: theme.color('#0F172A', 'text'),
    textSecondary: theme.color('#64748B', 'muted'),
    textMuted: theme.color('#94A3B8', 'muted'),
    cyan: theme.color('#00C9FD', 'primary'),
    cyanLink: isDark ? '#00A3FF' : '#0284C7',
    primaryBtn: isDark ? '#0070F3' : '#00C9FD',
    primaryBtnText: '#FFFFFF',
    disabledBtn: isDark ? '#2C2C2E' : '#CBD5E1',
    disabledBtnText: isDark ? '#636366' : '#94A3B8',
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
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    cardContainer: {
      width: '100%',
      maxWidth: 520,
    },
    descriptionText: {
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.textSecondary,
      marginBottom: 6,
    },
    secureTipsBtn: {
      alignSelf: 'flex-start',
      marginBottom: 22,
    },
    secureTipsLink: {
      fontSize: 14,
      color: COLORS.cyanLink,
      fontWeight: '500',
    },
    accountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.accountBg,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: COLORS.inputBorder,
    },
    accountCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    accountIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark ? '#2C2C2E' : '#E2E8F0',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      marginRight: 12,
    },
    accountAvatar: {
      width: '100%',
      height: '100%',
    },
    accountInfoCol: {
      flex: 1,
    },
    accountEmail: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textPrimary,
      letterSpacing: -0.2,
    },
    accountSubtitle: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    accountCardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    miniAvatarBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: COLORS.accountBg,
    },
    formContainer: {
      gap: 14,
      marginBottom: 16,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.inputBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.inputBorder,
      paddingHorizontal: 16,
      height: 52,
    },
    inputField: {
      flex: 1,
      fontSize: 15,
      color: COLORS.textPrimary,
      paddingVertical: 0,
    },
    eyeBtn: {
      padding: 6,
      marginLeft: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    forgotBtn: {
      alignSelf: 'flex-start',
      marginTop: 2,
      marginBottom: 18,
    },
    forgotLink: {
      fontSize: 14,
      color: COLORS.cyanLink,
      fontWeight: '600',
    },
    securityNote: {
      fontSize: 13,
      lineHeight: 18,
      color: COLORS.textMuted,
      marginBottom: 28,
    },
    submitButton: {
      backgroundColor: COLORS.primaryBtn,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 12px rgba(0, 112, 243, 0.25)',
        },
        default: {
          shadowColor: COLORS.primaryBtn,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 3,
        },
      }),
    },
    submitButtonDisabled: {
      backgroundColor: COLORS.disabledBtn,
      opacity: 0.7,
      ...Platform.select({
        web: { boxShadow: 'none' },
        default: { shadowOpacity: 0, elevation: 0 },
      }),
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.primaryBtnText,
      letterSpacing: -0.2,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'flex-end',
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheetContainer: {
      width: '100%',
      maxWidth: 540,
      alignSelf: 'center',
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderBottomWidth: 0,
      ...Platform.select({
        web: {
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.25)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 12,
        },
      }),
    },
    sheetGrabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? '#3A3A3C' : '#CBD5E1',
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    },
    sheetIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(0, 201, 253, 0.12)' : 'rgba(0, 201, 253, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.textPrimary,
      letterSpacing: -0.2,
    },
    sheetSubtitle: {
      fontSize: 14,
      color: COLORS.textSecondary,
      marginBottom: 18,
      lineHeight: 20,
    },
    tipsList: {
      gap: 12,
      marginBottom: 20,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    tipCheckWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: isDark ? 'rgba(0, 201, 253, 0.15)' : 'rgba(0, 201, 253, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.textPrimary,
    },
    sheetCloseBtn: {
      backgroundColor: COLORS.primaryBtn,
      borderRadius: 22,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    sheetCloseBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  return { COLORS, styles };
});
