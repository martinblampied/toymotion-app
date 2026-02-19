import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { COLORS, SIZES } from '../constants/theme';
import { loadProject, getAllFrameUris, ProjectMetadata } from '../utils/storage';
import ExportModal from '../components/ExportModal';

const { width: SW, height: SH } = Dimensions.get('window');

export default function PlaybackScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    return () => stopPlayback();
  }, [projectId]);

  useEffect(() => {
    if (playing && frames.length > 0) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return () => stopPlayback();
  }, [playing, frames]);

  async function loadData() {
    if (!projectId) return;
    const p = await loadProject(projectId);
    if (!p) return;
    setProject(p);
    const uris = await getAllFrameUris(p.id, p.frameCount);
    setFrames(uris);
  }

  function startPlayback() {
    stopPlayback();
    const fps = project?.fps ?? 12;
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);
  }

  function stopPlayback() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function togglePlay() {
    setPlaying(!playing);
  }

  function skipBack() {
    setCurrentFrame(0);
  }

  function skipForward() {
    setCurrentFrame(frames.length - 1);
  }

  return (
    <View style={styles.container}>
      {/* Frame Display */}
      {frames.length > 0 && (
        <Image
          source={{ uri: frames[currentFrame] }}
          style={styles.frameImage}
          resizeMode="contain"
        />
      )}

      {/* Watermark */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>▶ ToyMotion</Text>
      </View>

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <MaterialIcons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.frameIndicator}>
          {currentFrame + 1} / {frames.length}
        </Text>
      </SafeAreaView>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${((currentFrame + 1) / Math.max(frames.length, 1)) * 100}%` },
          ]}
        />
      </View>

      {/* Controls */}
      <SafeAreaView style={styles.bottomArea} edges={['bottom']}>
        <View style={styles.playControls}>
          <TouchableOpacity onPress={skipBack} style={styles.skipButton}>
            <MaterialIcons name="skip-previous" size={32} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.playPauseButton}>
            <MaterialIcons
              name={playing ? 'pause' : 'play-arrow'}
              size={40}
              color={COLORS.white}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={skipForward} style={styles.skipButton}>
            <MaterialIcons name="skip-next" size={32} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setShowExport(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.exportButtonText}>Done - Export or Keep Editing</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Export Modal */}
      {showExport && project && (
        <ExportModal
          project={project}
          frames={frames}
          currentFrame={currentFrame}
          onClose={() => setShowExport(false)}
          onKeepEditing={() => {
            setShowExport(false);
            router.back();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  frameImage: {
    ...StyleSheet.absoluteFillObject,
  },
  watermark: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  watermarkText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameIndicator: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  skipButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: COLORS.warning,
    paddingVertical: 16,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    marginBottom: 8,
  },
  exportButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
});
