import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { fonts } from '../theme';

interface ShotProps {
  label: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function Shot({ label, style, children }: ShotProps) {
  return (
    <View style={[styles.container, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="hatch" patternUnits="userSpaceOnUse" width={16} height={16} patternTransform="rotate(135)">
            <Rect width={16} height={16} fill="#101d2b" />
            <Rect width={8} height={16} fill="rgba(184,147,90,0.07)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hatch)" />
      </Svg>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#101d2b',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    color: 'rgba(184,147,90,0.4)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
