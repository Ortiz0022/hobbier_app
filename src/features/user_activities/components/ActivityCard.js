import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { InlineEvidenceUploader } from './InlineEvidenceUploader';

// Función para mapear categorías, ahora unificada con la nueva paleta minimalista y soporte de iconos
const getCategoryStyle = (categoryObj, title = '') => {
  const catName = categoryObj?.name || '';
  const searchKey = `${catName} ${title}`.toLowerCase();

  let name = catName || 'Hobby';
  let iconName = 'star';

  if (searchKey.includes('arte') || searchKey.includes('pint') || searchKey.includes('cerám')) {
    name = catName || 'Arte';
    iconName = 'edit-2';
  } else if (searchKey.includes('tecno') || searchKey.includes('python') || searchKey.includes('idioma') || searchKey.includes('program')) {
    name = catName || 'Tecnología';
    iconName = 'monitor';
  } else if (searchKey.includes('natura') || searchKey.includes('botán') || searchKey.includes('deport') || searchKey.includes('paseo') || searchKey.includes('camin')) {
    name = catName || 'Naturaleza';
    iconName = 'map';
  } else if (searchKey.includes('músic') || searchKey.includes('canc') || searchKey.includes('jam') || searchKey.includes('instrum')) {
    name = catName || 'Música';
    iconName = 'music';
  } else if (searchKey.includes('juego') || searchKey.includes('ajedrez')) {
    name = catName || 'Juegos';
    iconName = 'award';
  } else if (searchKey.includes('leer') || searchKey.includes('libro')) {
    name = catName || 'Lectura';
    iconName = 'book-open';
  }

  return {
    name,
    iconName,
    pillBg: '#F0F3F5',
    textColor: '#121B22',
    blobBg: 'transparent',
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
    <View style={[styles.cardContainer, isExpanded && styles.cardActive]}>
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
          <View style={styles.titleIconRow}>
            <Feather name={catStyle.iconName} size={16} color="#0C8AA6" />
            <Text style={styles.titleText}>{activity.title || 'Actividad Asignada'}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Feather name="star" size={12} color="#FFFFFF" />
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
    position: 'relative',
    overflow: 'hidden',
  },
  cardActive: {
    shadowColor: '#0C8AA6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
    zIndex: 10,
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
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#121B22',
    flexShrink: 1,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8F21',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  descText: {
    fontSize: 13,
    color: '#666C67',
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
});
