import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

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
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>
                {pendingActivity.activity?.category_id ? 'Recomendada' : 'Hobby'}
              </Text>
            </View>
            <View style={styles.progressIconCircle}>
              <Feather name="edit-3" size={16} color="#8A4234" />
            </View>
          </View>

          <Text style={styles.progressTitle}>
            {pendingActivity.activity?.title || 'Actividad Asignada'}
          </Text>
          <Text style={styles.progressDesc}>
            {pendingActivity.activity?.description || 'Completa esta tarea y sube una evidencia.'}
          </Text>

          <View style={styles.progressBarRow}>
            <Text style={styles.progressLabel}>Estado</Text>
            <Text style={styles.progressPercent}>Pendiente</Text>
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
    color: '#5C615D',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EBEBE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#F5DCD5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryPillText: {
    color: '#8A4234',
    fontSize: 12,
    fontWeight: '500',
  },
  progressIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9ECE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C201D',
    marginBottom: 4,
  },
  progressDesc: {
    fontSize: 13,
    color: '#666C67',
    marginBottom: 16,
  },
  progressBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666C67',
    fontWeight: '400',
  },
  progressPercent: {
    fontSize: 12,
    color: '#1C201D',
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#EFEFEA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#DF9C8E',
    borderRadius: 4,
  },
  emptyProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBE5',
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyProgressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C201D',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyProgressSub: {
    fontSize: 12,
    color: '#727773',
    textAlign: 'center',
  },
});
