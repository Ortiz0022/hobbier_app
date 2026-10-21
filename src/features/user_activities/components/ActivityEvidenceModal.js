import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { InlineEvidenceUploader } from './InlineEvidenceUploader';
import { useLanguage } from '../../../context/LanguageContext';

export const ActivityEvidenceModal = ({
  visible,
  item,
  isRepeating,
  imageUri,
  completing,
  onPickImage,
  onTakePhoto,
  onComplete,
  onClose,
}) => {
  const { theme, colors, styles } = useThemeValues(getActivityEvidenceModalTheme);

  const { t } = useLanguage();
  const activity = item?.activity || {};
  const points = activity.points_awarded || 10;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={completing}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('missions.close_registration')}
          >
            <Feather name="x" size={19} color={colors.textFaint} />
          </TouchableOpacity>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.eyebrowRow}>
              <Feather name={isRepeating ? 'refresh-cw' : 'zap'} size={12} color={colors.primary} />
              <Text style={styles.eyebrow}>
                {isRepeating ? t('missions.sum_new_advance') : t('missions.make_it_real')}
              </Text>
            </View>
            <Text style={styles.title}>{activity.title || t('recommendations.new_activity')}</Text>
            <Text style={styles.subtitle}>
              {isRepeating
                ? t('missions.repeat_activity_add_advance')
                : t('missions.register_last_step')}
            </Text>

            <InlineEvidenceUploader
              imageUri={imageUri}
              completing={completing}
              onPickImage={onPickImage}
              onTakePhoto={onTakePhoto}
              onComplete={onComplete}
              buttonText={isRepeating ? t('missions.record_another_advance', { points }) : t('missions.complete_mission')}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getActivityEvidenceModalTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: theme.color('rgba(5, 31, 37, 0.58)', "scrim"), justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%', maxWidth: 560, maxHeight: '92%', alignSelf: 'center',
    backgroundColor: colors.surface, borderTopLeftRadius: 34, borderTopRightRadius: 34,
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24,
  },
  grabber: {
    width: 42, height: 4, borderRadius: 2, backgroundColor: theme.color('#D9DEDC', 'card'),
    alignSelf: 'center', marginBottom: 8,
  },
  closeButton: {
    position: 'absolute', zIndex: 3, top: 17, right: 18,
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingTop: 24, paddingBottom: 4 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 42 },
  eyebrow: {
    color: colors.primary, fontSize: 9, fontWeight: '600', letterSpacing: 1,
  },
  title: {
    color: colors.text, fontSize: 23, lineHeight: 30,
    fontWeight: '600', letterSpacing: -0.4, marginTop: 9, paddingRight: 30,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 5 },
});
  return { theme, colors, styles };
});
