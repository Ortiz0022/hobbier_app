import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const HeroBanner = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.heroCard}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Feather name="star" size={34} color="#1C3A30" style={styles.heroIcon} />
      <Text style={styles.heroTitle}>Sorpréndeme</Text>
      <Text style={styles.heroSubtitle}>Descubre un nuevo hobby hoy</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#DF9C8E',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#DF9C8E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIcon: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1C3A30',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#2A4D41',
    fontWeight: '500',
  },
});
