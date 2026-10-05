import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from './scaledText';
import { useLanguage } from '../context/LanguageContext';
import { formatLongDate, toLocale } from '../utils/dateFormat';

const LABELS = {
  es: { placeholder: 'Selecciona una fecha', prev: 'Mes anterior', next: 'Mes siguiente', pickYear: 'Elegir año', close: 'Cerrar' },
  en: { placeholder: 'Select a date', prev: 'Previous month', next: 'Next month', pickYear: 'Choose year', close: 'Close' },
};

// Primer día de la semana según la convención local: lunes en español,
// domingo en inglés (EE. UU.). 0 = domingo, 1 = lunes.
const FIRST_DAY_OF_WEEK = { es: 1, en: 0 };

const YEAR_ROW_HEIGHT = 48;

// El valor viaja como "dd/mm/aaaa" (formato interno que ya entiende
// validateBirthDate / toISODate), nunca escrito a mano por el usuario.
const parseValue = (value) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value || '');
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
};

const toValue = (date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Campo de fecha con calendario. Funciona igual en web, Android e iOS.
 *
 * - Muestra la fecha elegida en palabras ("3 de abril de 2000"): sin ambigüedad.
 * - Nombres de mes y días de la semana, y el primer día de la semana, siguen el
 *   idioma de la app.
 * - Tocar "abril 2000" abre la lista de años, para no tener que retroceder mes
 *   a mes hasta una fecha de nacimiento.
 *
 * Props: value / onChange ("dd/mm/aaaa"), minDate, maxDate (Date),
 * initialDate (mes que se ve al abrir si aún no hay valor), invalid.
 */
export const CalendarDateField = ({ value, onChange, minDate, maxDate, initialDate, invalid = false }) => {
  const { language } = useLanguage();
  const labels = LABELS[language] || LABELS.es;
  const locale = toLocale(language);
  const firstDay = FIRST_DAY_OF_WEEK[language] ?? 1;

  const selected = parseValue(value);
  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('days'); // 'days' | 'years'
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const yearsScrollRef = useRef(null);

  const openCalendar = () => {
    const base = selected || initialDate || new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setMode('days');
    setOpen(true);
  };

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // ¿Hay algún día elegible en el mes anterior / siguiente?
  const canGoPrev = !min || new Date(viewYear, viewMonth, 0) >= min;
  const canGoNext = !max || new Date(viewYear, viewMonth + 1, 1) <= max;

  const isDisabled = (date) => (min && date < min) || (max && date > max);

  const pickDay = (day) => {
    const date = new Date(viewYear, viewMonth, day);
    if (isDisabled(date)) return;
    onChange(toValue(date));
    setOpen(false);
  };

  // ---- Encabezado: "abril 2000" ----
  // Solo la primera letra en mayúscula: "Enero de 2006", no "Enero De 2006".
  const rawMonthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
    .format(new Date(viewYear, viewMonth, 1));
  const monthYearLabel = rawMonthYear.charAt(0).toUpperCase() + rawMonthYear.slice(1);

  // ---- Cuadrícula de días ----
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  // 4 de enero de 2026 es domingo: base para generar los nombres en orden.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(new Date(2026, 0, 4 + ((i + firstDay) % 7)))
  );
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = (new Date(viewYear, viewMonth, 1).getDay() - firstDay + 7) % 7;
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const today = startOfDay(new Date());

  // ---- Lista de años (más reciente arriba) ----
  const maxYear = (max || new Date(today.getFullYear() + 10, 11, 31)).getFullYear();
  const minYear = (min || new Date(today.getFullYear() - 120, 0, 1)).getFullYear();
  const years = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);
  const YEARS_PER_ROW = 3;

  const scrollToViewYear = () => {
    const row = Math.floor(years.indexOf(viewYear) / YEARS_PER_ROW);
    yearsScrollRef.current?.scrollTo({ y: Math.max(0, (row - 2) * YEAR_ROW_HEIGHT), animated: false });
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, invalid && styles.fieldInvalid]}
        onPress={openCalendar}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={selected ? formatLongDate(selected, language) : labels.placeholder}
      >
        <Feather name="calendar" size={18} color={selected ? '#0C8AA6' : '#8A908B'} />
        <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? formatLongDate(selected, language) : labels.placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#8A908B" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            {/* Encabezado: mes anterior · "abril 2000" · mes siguiente */}
            <View style={styles.header}>
              {mode === 'days' ? (
                <TouchableOpacity
                  onPress={() => shiftMonth(-1)}
                  disabled={!canGoPrev}
                  style={styles.navBtn}
                  accessibilityLabel={labels.prev}
                >
                  <Feather name="chevron-left" size={22} color={canGoPrev ? '#121B22' : '#D0D5D9'} />
                </TouchableOpacity>
              ) : (
                <View style={styles.navBtn} />
              )}

              <TouchableOpacity
                style={styles.titleBtn}
                onPress={() => setMode(mode === 'days' ? 'years' : 'days')}
                accessibilityRole="button"
                accessibilityLabel={labels.pickYear}
              >
                <Text style={styles.title}>{monthYearLabel}</Text>
                <Feather name={mode === 'years' ? 'chevron-up' : 'chevron-down'} size={16} color="#0C8AA6" />
              </TouchableOpacity>

              {mode === 'days' ? (
                <TouchableOpacity
                  onPress={() => shiftMonth(1)}
                  disabled={!canGoNext}
                  style={styles.navBtn}
                  accessibilityLabel={labels.next}
                >
                  <Feather name="chevron-right" size={22} color={canGoNext ? '#121B22' : '#D0D5D9'} />
                </TouchableOpacity>
              ) : (
                <View style={styles.navBtn} />
              )}
            </View>

            {mode === 'days' ? (
              <>
                <View style={styles.weekRow}>
                  {weekdays.map((w, i) => (
                    <Text key={i} style={styles.weekday}>{w.toUpperCase()}</Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((day, i) => {
                    if (!day) return <View key={`b${i}`} style={styles.cell} />;
                    const date = new Date(viewYear, viewMonth, day);
                    const disabled = isDisabled(date);
                    const isSel = sameDay(date, selected);
                    const isToday = sameDay(date, today);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={styles.cell}
                        onPress={() => pickDay(day)}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={formatLongDate(date, language)}
                        accessibilityState={{ selected: isSel, disabled }}
                      >
                        <View style={[styles.dayCircle, isSel && styles.daySelected, !isSel && isToday && styles.dayToday]}>
                          <Text style={[styles.dayText, disabled && styles.dayDisabled, isSel && styles.dayTextSelected]}>
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <ScrollView
                ref={yearsScrollRef}
                style={styles.yearsScroll}
                onLayout={scrollToViewYear}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.yearsGrid}>
                  {years.map((y) => {
                    const isSel = y === viewYear;
                    return (
                      <TouchableOpacity
                        key={y}
                        style={styles.yearCell}
                        onPress={() => {
                          // Si el mes visto queda fuera del rango en ese año, se ajusta.
                          let m = viewMonth;
                          if (max && y === max.getFullYear() && m > max.getMonth()) m = max.getMonth();
                          if (min && y === min.getFullYear() && m < min.getMonth()) m = min.getMonth();
                          setViewYear(y);
                          setViewMonth(m);
                          setMode('days');
                        }}
                      >
                        <View style={[styles.yearPill, isSel && styles.yearPillSelected]}>
                          <Text style={[styles.yearText, isSel && styles.yearTextSelected]}>{y}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>{labels.close}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#F0F3F5',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  fieldInvalid: {
    borderColor: '#A94403',
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    color: '#121B22',
  },
  placeholder: {
    color: '#8A908B',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EAF7FA',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#053E4A',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#8A908B',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: '#0C8AA6',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: '#0C8AA6',
  },
  dayText: {
    fontSize: 14,
    color: '#121B22',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayDisabled: {
    color: '#D0D5D9',
  },
  yearsScroll: {
    height: YEAR_ROW_HEIGHT * 6,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  yearCell: {
    width: '33.333%',
    height: YEAR_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  yearPillSelected: {
    backgroundColor: '#0C8AA6',
  },
  yearText: {
    fontSize: 15,
    color: '#121B22',
  },
  yearTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C8AA6',
  },
});
