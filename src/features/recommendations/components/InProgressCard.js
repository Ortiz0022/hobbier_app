import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { getCategoryLabel } from '../../../utils/category';

export const InProgressCard = ({ pendingActivity, onPress }) => {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>ACTIVIDAD EN PROGRESO</Text>
      </View>

      {pendingActivity ? (
        <TouchableOpacity
          style={styles.progressCard}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <View style={styles.progressCardTop}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>
                  {getCategoryLabel(pendingActivity.activity?.category)}
                </Text>
              </View>
              <View style={styles.missionActivePill}>
                <Text style={styles.missionActiveText}>Misión Activa</Text>
              </View>
            </View>
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleIconCircle}>
              <Feather name="compass" size={18} color="#00DBFF" />
            </View>
            <Text style={styles.progressTitle}>
              {pendingActivity.activity?.title || 'Actividad Asignada'}
            </Text>
          </View>
          <Text style={styles.progressDesc}>
            {pendingActivity.activity?.description || 'Completa esta tarea y sube una evidencia.'}
          </Text>

          <View style={styles.actionButtonRow}>
            <Text style={styles.actionButtonText}>¡Ir a la misión!</Text>
            <Feather name="arrow-right" size={16} color="#0C8AA6" />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyProgressCard}>
          <Feather name="clock" size={32} color="#8A908B" style={styles.emptyIcon} />
          <Text style={styles.emptyProgressTitle}>No tienes ninguna actividad en curso</Text>
          <Text style={styles.emptyProgressSub}>
            Toca "Sorpréndeme" arriba para que la app elija un nuevo hobby para ti.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#121B22',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  progressCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#F0F3F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryPillText: {
    color: '#121B22',
    fontSize: 12,
    fontWeight: '500',
  },
  missionActivePill: {
    backgroundColor: '#F0F8FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  missionActiveText: {
    color: '#0C8AA6',
    fontSize: 12,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  titleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121B22',
    flex: 1,
  },
  progressDesc: {
    fontSize: 13,
    color: '#666C67',
    marginBottom: 8,
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#0C8AA6',
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#EFEFEA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0C8AA6',
    borderRadius: 4,
  },
  emptyProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyProgressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#121B22',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyProgressSub: {
    fontSize: 12,
    color: '#727773',
    textAlign: 'center',
  },
});
