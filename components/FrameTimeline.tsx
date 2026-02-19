import React from 'react';
import { View, ScrollView, Image, StyleSheet } from 'react-native';
import { getFramePath } from '../utils/storage';

interface Props {
  projectId: string;
  frameCount: number;
}

export default function FrameTimeline({ projectId, frameCount }: Props) {
  const frames = Array.from({ length: frameCount }, (_, i) => i + 1);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {frames.map((num) => (
        <View key={num} style={styles.thumb}>
          <Image
            source={{ uri: getFramePath(projectId, num) }}
            style={styles.thumbImage}
            resizeMode="cover"
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    gap: 6,
  },
  thumb: {
    width: 56,
    height: 42,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});
