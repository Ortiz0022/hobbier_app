import React from "react";
import { StyleSheet, TouchableOpacity, View, Platform } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
// Envoltorio con tope de escalado: sin él, la letra grande del sistema
// desbordaría la tarjeta. Ver la sección de accesibilidad del README.
import { Text } from "./scaledText";
import { TOKENS } from "../theme/designTokens";

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
 * Es una pastilla ALARGADA horizontal: icono a la izquierda, nombre al lado y
 * el tilde en la esquina derecha. Ocupa la fila entera, así que la lista se lee
 * como un formulario y no como una rejilla de cuadros.
 *
 * Elegida, la tarjeta se queda BLANCA con borde cian, en vez de rellenarse de
 * color. Así el círculo pastel del icono se sigue viendo y, sobre todo, la
 * selección no depende solo del color: el tilde la marca también por forma, que
 * es lo que necesita quien no distingue bien el cian del gris.
 *
 * Trae flexBasis '100%' a propósito: cada opción ocupa una fila completa y el
 * contenedor no decide cuántas columnas caben.
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
    style={[
      styles.card,
      isSelected ? styles.cardSelected : styles.cardUnselected,
    ]}
    // Una opción es un interruptor, no un botón: quien use lector de pantalla
    // necesita oír si está activada, no solo su nombre.
    accessibilityRole="switch"
    accessibilityState={{ checked: isSelected }}
    accessibilityLabel={label}
  >
    {isSelected ? (
      <View style={styles.check}>
        <MaterialCommunityIcons
          name="check"
          size={14}
          color={TOKENS.colors.white}
        />
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

    <Text style={[styles.label, isSelected ? styles.labelSelected : null]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    // Fila completa: una opción por renglón, en pastilla alargada.
    flexBasis: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.md,
    paddingRight: TOKENS.spacing.lg + 4,
    paddingLeft: TOKENS.spacing.md + 2,
    borderRadius: TOKENS.radius.full,
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
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: "0px 3px 8px rgba(12, 138, 166, 0.22)",
      },
      default: {
        shadowColor: TOKENS.colors.active,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
    }),
  },
  check: {
    position: "absolute",
    top: TOKENS.spacing.sm,
    right: TOKENS.spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TOKENS.colors.active,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: TOKENS.colors.inactiveText,
    textAlign: "left",
    flexShrink: 1,
  },
  labelSelected: {
    color: TOKENS.colors.textDark,
    fontWeight: "700",
  },
});
