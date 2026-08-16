import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { InlineEvidenceUploader } from './InlineEvidenceUploader';

// Función para mapear categorías e iconos
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

  return { name, iconName };
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

  const catStyle = getCategoryStyle(activity.category, activity.title);
  const posts = item.posts || [];
  const totalRepetitions = posts.length > 0 ? posts.length : (isCompleted ? 1 : 0);
  const pts = activity.points_awarded || 10;

  return (
    <View style={[styles.cardContainer, isExpanded && styles.cardActive]}>
      <TouchableOpacity
        style={styles.cardHeaderArea}
        onPress={onToggleExpand}
        activeOpacity={0.85}
      >
        {/* FILA SUPERIOR: PÍLDORA DE CATEGORÍA LÚDICA + PUNTOS DORADOS + FLECHA INTERACTIVA */}
        <View style={styles.cardTopRow}>
          <View style={styles.categoryPill}>
            <Feather name={catStyle.iconName} size={12} color="#0C8AA6" style={{ marginRight: 4 }} />
            <Text style={styles.categoryText}>{catStyle.name}</Text>
          </View>

          <View style={styles.topRightRow}>
            <View style={styles.pointsBadge}>
              <Feather name="star" size={11} color="#08333D" />
              <Text style={styles.pointsText}>+{pts} pts</Text>
            </View>
            <Feather
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isExpanded ? '#00C9FD' : '#8A908B'}
              style={{ marginLeft: 6 }}
            />
          </View>
        </View>

        {/* TÍTULO PRINCIPAL DE LA ACTIVIDAD */}
        <Text style={styles.titleText}>{activity.title || 'Actividad'}</Text>

        {/* SUBTÍTULO DE APOYO: RACHA CON FLAMA NARANJA / ESTADO PENDIENTE */}
        {isCompleted ? (
          <View style={styles.streakRow}>
            <Feather name="zap" size={12} color="#FF5A00" style={{ marginRight: 4 }} />
            <Text style={styles.streakText}>
              Has completado este reto {totalRepetitions} {totalRepetitions === 1 ? 'vez' : 'veces'}
            </Text>
          </View>
        ) : (
          <Text style={styles.pendingSubtitle}>Pendiente por realizar</Text>
        )}

        {/* DESCRIPCIÓN COMPACTA */}
        {activity.description ? (
          <Text style={styles.descText} numberOfLines={isExpanded ? undefined : 2}>
            {activity.description}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* ZONA DE CARGA PARA ACTIVIDADES PENDIENTES */}
      {isPending && isExpanded && (
        <InlineEvidenceUploader
          imageUri={imageUri}
          completing={completing}
          onPickImage={onPickImage}
          onComplete={onComplete}
          buttonText="Completar actividad"
          placeholderText="Sube una foto de tu creación"
        />
      )}

      {/* ZONA DE CARGA DIRECTA Y LIMPIA PARA REPETICIONES */}
      {isCompleted && isExpanded && (
        <InlineEvidenceUploader
          imageUri={imageUri}
          completing={completing}
          onPickImage={onPickImage}
          onComplete={onComplete}
          buttonText={`Registrar nuevo avance (+${pts} pts)`}
          placeholderText="Sube la foto de tu repetición"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  cardActive: {
    borderColor: '#D4F1F9',
    shadowColor: '#08333D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderArea: {},
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 201, 253, 0.09)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(0, 201, 253, 0.22)',
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#08333D',
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB300',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3.5,
  },
  pointsText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#08333D',
  },
  titleText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#08333D',
    lineHeight: 21,
    marginBottom: 3,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pendingSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  descText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '400',
    lineHeight: 17,
  },
});
