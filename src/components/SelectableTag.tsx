import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// Envoltorio con tope de escalado: sin él, la letra grande del sistema
// desbordaría los tags. Ver la sección de accesibilidad del README.
import { Text } from './scaledText';
import { TOKENS } from '../theme/designTokens';

interface SelectableTagProps {
  label: string;
  /**
   * Nombre de un icono de MaterialCommunityIcons, no un emoji: el proyecto
   * usa iconos vectoriales en toda la interfaz. `getCatalogIcon()` lo resuelve
   * a partir del nombre de la opción.
   */
  icon?: string;
  isSelected: boolean;
  onPress: () => void;
}

/**
 * Tag seleccionable único para gustos, intereses y recursos.
 *
 * Antes cada sección resolvía su propio aspecto y el usuario no podía saber si
 * dos elementos con distinto aspecto se comportaban igual. Con un solo
 * componente, seleccionado e inactivo significan lo mismo en toda la pantalla.
 */
export const SelectableTag: React.FC<SelectableTagProps> = ({
  label,
  icon,
  isSelected,
  onPress,
}) => {
  const contentColor = isSelected ? TOKENS.colors.activeText : TOKENS.colors.inactiveText;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.tag, isSelected ? styles.tagSelected : styles.tagUnselected]}
      // Un tag es un interruptor, no un botón: quien use lector de pantalla
      // necesita oír si está activado, no solo su nombre.
      accessibilityRole="switch"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={label}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon as never}
          size={15}
          color={contentColor}
          style={styles.icon}
        />
      ) : null}
      <Text style={[styles.label, isSelected ? styles.textSelected : styles.textUnselected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm + 2,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    // Sin márgenes propios: la separación la pone el `gap` del contenedor. Si
    // se mantuvieran, ambos se sumarían y quedarían 16 px en vez de 8.
    // Quien reutilice este tag debe darle `gap` a su contenedor.
    // Sin `transition`: es una propiedad de CSS. React Native la ignora en
    // nativo y solo tendría efecto en web, así que daría una animación que
    // existe en el navegador y no en el teléfono.
  },
  tagUnselected: {
    backgroundColor: TOKENS.colors.inactiveBg,
    borderColor: TOKENS.colors.inactiveBorder,
  },
  tagSelected: {
    backgroundColor: TOKENS.colors.active,
    borderColor: TOKENS.colors.active,
    // Sutil sombra para dar volumen al elemento activo
    shadowColor: TOKENS.colors.active,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    // Permite partir en dos líneas en vez de estirar el tag fuera de pantalla
    // cuando la etiqueta es larga ("Aprender cosas nuevas") o la letra del
    // sistema está agrandada.
    flexShrink: 1,
  },
  textUnselected: {
    color: TOKENS.colors.inactiveText,
  },
  textSelected: {
    color: TOKENS.colors.activeText,
    fontWeight: '600',
  },
});
