import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// Envoltorio con tope de escalado: sin él, la letra grande del sistema
// desbordaría la tarjeta. Ver la sección de accesibilidad del README.
import { Text } from './scaledText';
import { TOKENS } from '../theme/designTokens';

interface SelectableCardProps {
  label: string;
  /**
   * Nombre de un icono de MaterialCommunityIcons, no un emoji: el proyecto usa
   * iconos vectoriales en toda la interfaz. `getCatalogIcon()` lo resuelve a
   * partir del nombre de la opción.
   */
  icon?: string;
  /** Fondo y color del círculo del icono. Lo reparte `getCatalogTint()`. */
  tint?: { bg: string; fg: string };
  isSelected: boolean;
  onPress: () => void;
}

/**
 * Tarjeta seleccionable para gustos, objetivos y recursos.
 *
 * Elegida, la tarjeta se queda BLANCA con borde cian y un tilde en la esquina,
 * en vez de rellenarse de color. Así el círculo pastel del icono se sigue
 * viendo (con relleno pleno quedaba tapado) y, sobre todo, la selección no
 * depende solo del color: el tilde la marca también por forma, que es lo que
 * necesita quien no distingue bien el cian del gris.
 *
 * NO trae ancho propio a propósito. Crece para llenar la fila (`flexGrow`) con
 * un ancho mínimo, así que el contenedor decide cuántas columnas caben: dos en
 * un teléfono, más en pantallas anchas, y una sola opción suelta al final ocupa
 * la fila entera en vez de quedar a media pantalla.
 */
export const SelectableCard: React.FC<SelectableCardProps> = ({
  label,
  icon,
  tint,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
    // Una opción es un interruptor, no un botón: quien use lector de pantalla
    // necesita oír si está activada, no solo su nombre.
    accessibilityRole="switch"
    accessibilityState={{ checked: isSelected }}
    accessibilityLabel={label}
  >
    {isSelected ? (
      <View style={styles.check}>
        <MaterialCommunityIcons name="check" size={14} color={TOKENS.colors.white} />
      </View>
    ) : null}

    {icon ? (
      <View style={[styles.iconCircle, { backgroundColor: tint?.bg }]}>
        <MaterialCommunityIcons
          name={icon as never}
          size={28}
          color={tint?.fg ?? TOKENS.colors.inactiveText}
        />
      </View>
    ) : null}

    <Text style={[styles.label, isSelected ? styles.labelSelected : null]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    // flexBasis 0 + flexGrow 1: el corte de fila lo decide `minWidth`, y luego
    // las tarjetas de esa fila se reparten el ancho a partes iguales.
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 140,
    // Alto mínimo para que la rejilla llene la pantalla en vez de amontonarse
    // arriba dejando un hueco muerto sobre el botón.
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    gap: TOKENS.spacing.sm + 4,
    paddingVertical: TOKENS.spacing.lg,
    paddingHorizontal: TOKENS.spacing.sm + 2,
    borderRadius: TOKENS.radius.card,
    // El grosor es el MISMO en los dos estados y solo cambia el color: si
    // creciera al seleccionar, la tarjeta se movería medio píxel y la fila
    // entera daría un tirón al tocarla.
    borderWidth: 2,
  },
  cardUnselected: {
    backgroundColor: TOKENS.colors.inactiveBg,
    borderColor: TOKENS.colors.inactiveBorder,
  },
  cardSelected: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.active,
    shadowColor: TOKENS.colors.active,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  check: {
    position: 'absolute',
    top: TOKENS.spacing.sm,
    right: TOKENS.spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.active,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.inactiveText,
    textAlign: 'center',
  },
  labelSelected: {
    color: TOKENS.colors.textDark,
    fontWeight: '700',
  },
});
