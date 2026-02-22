import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useVoiceCommands, VoiceCommand } from '../hooks/useVoiceCommands';
import {
  ProjectMetadata,
  loadProject,
  saveProjectMetadata,
  addFrame,
  deleteLastFrame,
  getFramePath,
} from '../utils/storage';
import FrameTimeline from '../components/FrameTimeline';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [lastFrameUri, setLastFrameUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  async function loadProjectData() {
    if (!projectId) return;
    const p = await loadProject(projectId);
    setProject(p);
    if (p && p.frameCount > 0) {
      setLastFrameUri(getFramePath(p.id, p.frameCount));
    } else {
      setLastFrameUri(null);
    }
  }

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !project || capturing || !cameraReady) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!photo) {
        setCapturing(false);
        return;
      }

      const newFrameNum = project.frameCount + 1;
      if (newFrameNum > 200) {
        Alert.alert('Maximum Frames', 'You\'ve reached the maximum of 200 frames!');
        setCapturing(false);
        return;
      }

      const framePath = await addFrame(project.id, photo.uri, newFrameNum);

      const updated = {
        ...project,
        frameCount: newFrameNum,
        updatedAt: new Date().toISOString(),
      };
      await saveProjectMetadata(updated);
      setProject(updated);
      setLastFrameUri(framePath);
    } catch (e) {
      console.error('Capture error:', e);
      Alert.alert('Error', 'Failed to capture frame');
    }
    setCapturing(false);
  }, [project, capturing, cameraReady]);

  const handleDeleteLast = useCallback(async () => {
    if (!project || project.frameCount === 0) return;

    await deleteLastFrame(project.id, project.frameCount);
    const updated = {
      ...project,
      frameCount: project.frameCount - 1,
      updatedAt: new Date().toISOString(),
    };
    await saveProjectMetadata(updated);
    setProject(updated);

    if (updated.frameCount > 0) {
      setLastFrameUri(getFramePath(updated.id, updated.frameCount));
    } else {
      setLastFrameUri(null);
    }
  }, [project]);

  const handlePlay = useCallback(() => {
    if (!project || project.frameCount < 2) {
      Alert.alert('Not Enough Frames', 'Capture at least 2 frames to play!');
      return;
    }
    router.push({ pathname: '/playback', params: { projectId: project.id } });
  }, [project]);

  const { isListening, isAvailable, lastCommand, toggleListening } = useVoiceCommands({
    onCapture: handleCapture,
    onDelete: handleDeleteLast,
    onPlay: handlePlay,
  });

  // Animate feedback overlay
  useEffect(() => {
    if (lastCommand) {
      Animated.sequence([
        Animated.timing(feedbackOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(feedbackOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [lastCommand]);

  const commandLabels: Record<VoiceCommand, string> = {
    capture: 'Taking photo...',
    delete: 'Deleting frame...',
    play: 'Playing...',
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <MaterialIcons name="camera-alt" size={64} color={COLORS.textLight} />
        <Text style={styles.permissionText}>Camera access needed to create animations</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const frameCount = project?.frameCount ?? 0;

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Onion Skin Overlay */}
      {lastFrameUri && (
        <Image
          source={{ uri: lastFrameUri }}
          style={styles.onionSkin}
          resizeMode="cover"
        />
      )}

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.topTitle}>
          <Text style={{ color: COLORS.primary }}>Toy</Text>
          <Text style={{ color: COLORS.accent }}>Motion</Text>
        </Text>

        <View style={styles.topBarRight}>
          {isAvailable && (
            <TouchableOpacity
              style={[styles.micButton, isListening && styles.micButtonActive]}
              onPress={toggleListening}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isListening ? 'mic' : 'mic-off'}
                size={22}
                color={COLORS.white}
              />
            </TouchableOpacity>
          )}
          <View style={styles.frameCountBadge}>
            <MaterialIcons name="photo-library" size={16} color={COLORS.white} />
            <Text style={styles.frameCountText}>Frames: {frameCount}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Listening Indicator */}
      {isListening && (
        <View style={styles.listeningPill}>
          <View style={styles.listeningDot} />
          <Text style={styles.listeningText}>Listening...</Text>
        </View>
      )}

      {/* Voice Command Feedback */}
      {lastCommand && (
        <Animated.View style={[styles.feedbackOverlay, { opacity: feedbackOpacity }]}>
          <Text style={styles.feedbackText}>{commandLabels[lastCommand]}</Text>
        </Animated.View>
      )}

      {/* Frame Timeline */}
      {frameCount > 0 && project && (
        <View style={styles.timelineContainer}>
          <FrameTimeline projectId={project.id} frameCount={frameCount} />
        </View>
      )}

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.controls}>
          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.sideButton, styles.deleteButton, frameCount === 0 && styles.buttonDisabled]}
            onPress={handleDeleteLast}
            disabled={frameCount === 0}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete" size={28} color={COLORS.white} />
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={[styles.captureButton, capturing && styles.capturingButton]}
            onPress={handleCapture}
            disabled={capturing}
            activeOpacity={0.7}
          >
            {capturing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialIcons name="camera" size={36} color={COLORS.white} />
            )}
          </TouchableOpacity>

          {/* Play Button */}
          <TouchableOpacity
            style={[styles.sideButton, styles.playButton, frameCount < 2 && styles.buttonDisabled]}
            onPress={handlePlay}
            disabled={frameCount < 2}
            activeOpacity={0.7}
          >
            <MaterialIcons name="play-arrow" size={32} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 16,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  onionSkin: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.accent,
  },
  frameCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  frameCountText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  timelineContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 16,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 8,
  },
  sideButton: {
    width: SIZES.buttonMin,
    height: SIZES.buttonMin,
    borderRadius: SIZES.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.primary,
  },
  playButton: {
    backgroundColor: COLORS.accent,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  capturingButton: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  permissionText: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: SIZES.borderRadius,
    marginTop: 8,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  listeningPill: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  listeningText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackOverlay: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  feedbackText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
