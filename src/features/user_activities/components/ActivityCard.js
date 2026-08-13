import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { InlineEvidenceUploader } from './InlineEvidenceUploader';

// Función para mapear colores dinámicos por categoría (Arte, Tecnología, Naturaleza, Música, etc.)
const getCategoryStyle = (categoryObj, title = '') => {
  const catName = categoryObj?.name || '';
  const searchKey = `${catName} ${title}`.toLowerCase();

  if (searchKey.includes('arte') || searchKey.includes('pint') || searchKey.includes('cerám')) {
    return {
      name: catName || 'Arte',
      pillBg: '#FFCCC2',
      textColor: '#865046',
      blobBg: 'rgba(231, 163, 150, 0.22)',
    };
  }
  if (searchKey.includes('tecno') || searchKey.includes('python') || searchKey.includes('idioma') || searchKey.includes('program')) {
    return {
      name: catName || 'Tecnología',
      pillBg: '#BDD4F6',
      textColor: '#4A607D',
      blobBg: 'rgba(189, 212, 246, 0.35)',
    };
  }
  if (searchKey.includes('natura') || searchKey.includes('botán') || searchKey.includes('deport') || searchKey.includes('paseo') || searchKey.includes('camin')) {
    return {
      name: catName || 'Naturaleza',
      pillBg: '#C5E6D6',
      textColor: '#2A5243',
      blobBg: 'rgba(197, 230, 214, 0.35)',
    };
  }
  if (searchKey.includes('músic') || searchKey.includes('canc') || searchKey.includes('jam') || searchKey.includes('instrum')) {
    return {
      name: catName || 'Música',
      pillBg: '#E2E4E8',
      textColor: '#4A4D52',
      blobBg: 'rgba(226, 228, 232, 0.4)',
    };
  }

  return {
    name: catName || 'Hobby',
    pillBg: '#F5DCD5',
    textColor: '#8A4234',
    blobBg: 'rgba(245, 220, 213, 0.3)',
  };
};

export const ActivityCard = ({
  item,
  isPending,
  isExpanded,
  onToggleExpand,
  imageUri,
  completing,
  onPickImage,
  onComplete,
}) => {
  const activity = item.activity || {};
  const isCompleted = item.status === 'COMPLETED';

  // Obtener estilo y color personalizado según la categoría real de la actividad
  const catStyle = getCategoryStyle(activity.category, activity.title);

  const dateFormatted = isCompleted
    ? `Completado ${new Date(item.completed_at || Date.now()).toLocaleDateString()}`
    : 'Hoy, 10:00 AM';

  const pts = activity.points_awarded || item.points_awarded || 10;

  return (
    <View style={styles.cardContainer}>
      {/* CÍRCULO PASTEL PERSONALIZADO EN LA ESQUINA SEGÚN LA CATEGORÍA */}
      <View style={[styles.cornerBlob, { backgroundColor: catStyle.blobBg }]} />

      <TouchableOpacity
        style={styles.cardHeaderArea}
        onPress={isPending ? onToggleExpand : undefined}
        activeOpacity={isPending ? 0.85 : 1}
      >
        {/* FILA SUPERIOR: ETIQUETA DE CATEGORÍA CON SU COLOR Y FECHA */}
        <View style={styles.cardTopRow}>
          <View style={[styles.categoryPill, { backgroundColor: catStyle.pillBg }]}>
            <Text style={[styles.categoryText, { color: catStyle.textColor }]}>
              {catStyle.name}
            </Text>
          </View>
          <Text style={styles.timeText}>{dateFormatted}</Text>
        </View>

        {/* FILA TÍTULO Y PUNTOS */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{activity.title || 'Actividad Asignada'}</Text>
          <View style={styles.pointsBadge}>
            <Feather name="target" size={12} color="#865046" />
            <Text style={styles.pointsText}>+{pts} pts</Text>
          </View>
        </View>

        {/* DESCRIPCIÓN DE LA TAREA */}
        {activity.description ? (
          <Text style={styles.descText}>{activity.description}</Text>
        ) : null}
      </TouchableOpacity>

      {/* CARGA DE EVIDENCIA DESPLEGABLE DEBAJO DE ESTA ACTIVIDAD */}
      {isPending && isExpanded && (
        <InlineEvidenceUploader
          imageUri={imageUri}
          completing={completing}
          onPickImage={onPickImage}
          onComplete={onComplete}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE8E4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerBlob: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cardHeaderArea: {},
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#8A908B',
    fontWeight: '400',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C201D',
    flex: 1,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEEEA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#865046',
  },
  descText: {
    fontSize: 13,
    color: '#666C67',
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
});
