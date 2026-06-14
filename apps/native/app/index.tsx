import { View, Text } from 'react-native';
import { CORE_VERSION } from '@tileloop/core';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-900">
      <Text className="text-2xl font-bold text-zinc-100">TileLoop</Text>
      <Text className="text-xs text-zinc-500">core {CORE_VERSION}</Text>
    </View>
  );
}
