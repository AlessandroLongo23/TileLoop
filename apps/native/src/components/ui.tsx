import { type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, Easing } from 'react-native-reanimated';
import { alpha, type } from '../theme';
import { play, haptic } from '../feedback';

/** Anything tappable: it gives under the finger at once and springs back when let go. */
export function Press({
  onPress,
  children,
  style,
  outer,
  disabled,
  testID,
  label,
}: {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  outer?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
  label?: string;
}) {
  const k = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={outer}
      hitSlop={8}
      onPressIn={() => (k.value = withTiming(0.92, { duration: 70 }))}
      onPressOut={() => (k.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }))}
      onPress={() => {
        play('click', 0.5);
        haptic('soft');
        onPress?.();
      }}
    >
      <Animated.View style={[style, a, disabled && { opacity: 0.35 }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** A round icon button: no box, just the glyph on a faint disc. */
export function IconButton({ children, onPress, tint, testID, label, size = 44 }: { children: ReactNode; onPress: () => void; tint: string; testID?: string; label: string; size?: number }) {
  return (
    <Press onPress={onPress} testID={testID} label={label} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(tint, 0.07) }}>
      {children}
    </Press>
  );
}

/** Three dots for the score: filled ones were earned. They land one by one when `animate`. */
export function Dots({ count, color, size = 10, animate = false, delay = 0 }: { count: number; color: string; size?: number; animate?: boolean; delay?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.7 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} on={i < count} color={color} size={size} animate={animate} delay={delay + i * 140} />
      ))}
    </View>
  );
}

function Dot({ on, color, size, animate, delay }: { on: boolean; color: string; size: number; animate: boolean; delay: number }) {
  const k = useSharedValue(animate && on ? 0 : 1);
  useEffect(() => {
    if (animate && on) k.value = withDelay(delay, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [animate, on, delay, k]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(color, 0.18) }}>
      {on && <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color }, a]} />}
    </View>
  );
}

/** Breathes while `on`: marks the thing to do next. */
export function Pulse({ on, children, style }: { on: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const k = useSharedValue(1);
  useEffect(() => {
    k.value = on ? withRepeat(withSequence(withTiming(1.06, { duration: 800 }), withTiming(1, { duration: 800 })), -1) : withTiming(1);
  }, [on, k]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** A switch in the screen's own colours: an ink track when on, the knob cut from the background. */
export function Toggle({ label, value, onChange, color, back, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; color: string; back: string; testID?: string }) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }], backgroundColor: x.value > 0.5 ? back : alpha(color, 0.55) }));
  const track = useAnimatedStyle(() => ({ backgroundColor: x.value > 0.5 ? color : alpha(color, 0.18) }));
  return (
    <Press onPress={() => onChange(!value)} testID={testID} label={label} style={st.row}>
      <Text style={[type.heading, { fontSize: 18, color }]}>{label}</Text>
      <Animated.View style={[st.track, track]}>
        <Animated.View style={[st.knob, knob]} />
      </Animated.View>
    </Press>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  track: { width: 48, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11 },
});
