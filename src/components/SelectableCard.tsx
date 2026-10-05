import React from "react";
import { StyleSheet, TouchableOpacity, View, Platform } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
// Envoltorio con tope de escalado: sin él, la letra grande del sistema
// desbordaría la tarjeta. Ver la sección de accesibilidad del README.
import { Text } from "./scaledText";
import { TOKENS } from "../theme/designTokens";
// Los nombres se guardan tal como vienen del catálogo y se MUESTRAN con cada
// palabra en mayúscula: cambiarlos en la base rompería los cruces por nombre
// exacto (el import de mockapi y las claves de traducción).
import { capitalizarTitulo } from "../utils/titleCase";

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
  /**
   * Modo compacto: chip pequeño de ancho auto, ideal para la pantalla de
   * edición donde las tres secciones se ven juntas y las pastillas de fila
   * completa ocupaban demasiado.
   */
  compact?: boolean;
}

/**
 * Tarjeta seleccionable para gustos, objetivos y recursos.
 *
 * **Modo normal** — pastilla ALARGADA horizontal: icono a la izquierda, nombre
 * al lado y el tilde en la esquina derecha. Ocupa la fila entera, así que la
 * lista se lee como un formulario y no como una rejilla de cuadros.
 *
 * **Modo compacto** (`compact`) — chip pequeño de ancho auto que se acomoda en
 * filas como un tag-cloud. Tiene icono reducido (28 px → 22 px), padding más
 * ceñido y el check es una bolita inline al final en vez de flotar en la
 * esquina. Pensado para que en edición de preferencias quepan muchas opciones
 * sin tener que desplazarse tanto.
 *
 * Elegida, la tarjeta se queda BLANCA con borde cian, en vez de rellenarse de
 * color. Así el círculo pastel del icono se sigue viendo y, sobre todo, la
 * selección no depende solo del color: el tilde la marca también por forma, que
 * es lo que necesita quien no distingue bien el cian del gris.
 */
export const SelectableCard: React.FC<SelectableCardProps> = ({
  label,
  icon,
  tint,
  isSelected,
  onPress,
  compact = false,
}) => {
  if (compact) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[
          compactStyles.chip,
          isSelected ? compactStyles.chipSelected : compactStyles.chipUnselected,
        ]}
        accessibilityRole="switch"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={label}
      >
        {icon ? (
          <View
            style={[compactStyles.iconCircle, { backgroundColor: tint?.bg }]}
          >
            <MaterialCommunityIcons
              name={icon as never}
              size={14}
              color={tint?.fg ?? TOKENS.colors.inactiveText}
            />
          </View>
        ) : null}

        <Text
          style={[
            compactStyles.label,
            isSelected ? compactStyles.labelSelected : null,
          ]}
        >
          {capitalizarTitulo(label)}
        </Text>

        {isSelected ? (
          <View style={compactStyles.check}>
            <MaterialCommunityIcons
              name="check"
              size={10}
              color={TOKENS.colors.white}
            />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
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
        {capitalizarTitulo(label)}
      </Text>
    </TouchableOpacity>
  );
};

/* ─── Estilos del modo compacto (chips) ─── */

const compactStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1.5,
  },
  chipUnselected: {
    backgroundColor: TOKENS.colors.inactiveBg,
    borderColor: TOKENS.colors.inactiveBorder,
  },
  chipSelected: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.active,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: "0px 2px 6px rgba(12, 138, 166, 0.18)",
      },
      default: {
        shadowColor: TOKENS.colors.active,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
    }),
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: TOKENS.colors.inactiveText,
  },
  labelSelected: {
    color: TOKENS.colors.textDark,
  },
  check: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TOKENS.colors.active,
    marginLeft: 2,
  },
});

/* ─── Estilos del modo normal (pastillas de fila completa) ─── */

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
  },
});
