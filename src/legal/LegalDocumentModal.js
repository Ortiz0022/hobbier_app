import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '../components/scaledText';
import { useLanguage } from '../context/LanguageContext';
import { fonts } from "../theme";
import { getLegalDocument } from './legalContent';

/**
 * Muestra la Política de Privacidad, los Términos de Uso o las Condiciones de
 * Publicidad a pantalla completa.
 * `doc`: 'privacy' | 'terms' | 'ads' | null (null = cerrado).
 */
export const LegalDocumentModal = ({ doc, onClose }) => {
  const { theme, colors, styles } = useThemeValues(getLegalDocumentModalTheme);

  const { t, language } = useLanguage();
  const document = doc ? getLegalDocument(doc, language) : null;

  return (
    <Modal visible={!!doc} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>{document?.title}</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('legal.close')}
          >
            <Feather name="x" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {document && (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.updated}>{document.updated}</Text>
            {document.sections.map((section) => (
              <View key={section.heading} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getLegalDocumentModalTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color(colors.background, 'background'),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color(colors.surfaceMuted, 'border'),
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    marginRight: 12,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  updated: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
});
  return { theme, colors, styles };
});
