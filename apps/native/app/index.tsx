import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  getCurrentCampaignProgress,
  getCurrentModeProgress,
  startGameSession,
} from '@tileloop/core';

export default function Menu() {
  const router = useRouter();
  const campaign = getCurrentCampaignProgress();
  const zen = getCurrentModeProgress('zen');
  const timeAttack = getCurrentModeProgress('timeattack');
  const precision = getCurrentModeProgress('precision');

  const start = (mode: 'zen' | 'timeattack' | 'precision') => {
    startGameSession(mode);
    router.push('/play');
  };

  const ModeButton = ({
    label,
    sub,
    onPress,
    testID,
  }: {
    label: string;
    sub: string;
    onPress: () => void;
    testID: string;
  }) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="w-full rounded-xl border border-slate-600/40 bg-slate-800/70 px-8 py-4 active:opacity-80"
    >
      <Text className="text-center text-lg font-light tracking-wide text-slate-100">{label}</Text>
      <Text className="mt-1 text-center text-xs text-slate-400">{sub}</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 items-center justify-center bg-zinc-950 px-8">
      <Text className="mb-16 text-5xl font-light tracking-[12px] text-slate-100">LOOP</Text>

      <View className="w-full max-w-sm gap-4" style={{ gap: 16 }}>
        <ModeButton
          testID="mode-campaign"
          label="Campaign"
          sub={`Chapter ${campaign.currentChapter} • Level ${campaign.currentLevel}`}
          onPress={() => router.push('/campaign')}
        />
        <ModeButton
          testID="mode-timeattack"
          label="Time Attack"
          sub={`Level ${timeAttack.currentLevel}`}
          onPress={() => start('timeattack')}
        />
        <ModeButton
          testID="mode-precision"
          label="Precision"
          sub={`Level ${precision.currentLevel}`}
          onPress={() => start('precision')}
        />
        <ModeButton
          testID="mode-zen"
          label="Zen"
          sub={`Level ${zen.currentLevel}`}
          onPress={() => start('zen')}
        />
      </View>

      <Text className="mt-16 text-sm font-light tracking-wide text-slate-500">
        Connect the loops
      </Text>
    </View>
  );
}
