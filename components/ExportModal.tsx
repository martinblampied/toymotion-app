import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { COLORS, SIZES } from '../constants/theme';
import { ProjectMetadata } from '../utils/storage';

type WatermarkStyle = 'text' | 'text-icon' | 'badge';

interface Props {
  project: ProjectMetadata;
  frames: string[];
  currentFrame: number;
  onClose: () => void;
  onKeepEditing: () => void;
}

export default function ExportModal({ project, frames, currentFrame, onClose, onKeepEditing }: Props) {
  const [watermarkStyle, setWatermarkStyle] = useState<WatermarkStyle>('badge');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to save.');
        setSaving(false);
        return;
      }

      // Save all frames as individual photos (since we can't easily create video without native module)
      // For MVP, save frames as a GIF-like collection
      for (const frame of frames) {
        await MediaLibrary.createAssetAsync(frame);
      }

      Alert.alert('Saved!', `${frames.length} frames saved to your photo library.`);
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
    setSaving(false);
  }

  async function handleShare() {
    try {
      if (frames.length > 0) {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(frames[0], {
            mimeType: 'image/jpeg',
            dialogTitle: 'Share your ToyMotion animation',
          });
        }
      }
    } catch (e) {
      console.error('Share error:', e);
    }
  }

  const watermarkOptions: { key: WatermarkStyle; label: string }[] = [
    { key: 'text', label: 'Text Only' },
    { key: 'text-icon', label: 'Text + Icon' },
    { key: 'badge', label: 'Badge' },
  ];

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Icon */}
            <View style={styles.headerIcon}>
              <MaterialIcons name="movie-filter" size={40} color={COLORS.warning} />
            </View>

            <Text style={styles.title}>Your Animation is Ready!</Text>
            <Text style={styles.subtitle}>
              {project.frameCount} frames at {project.fps} fps
            </Text>

            {/* Preview */}
            <View style={styles.previewContainer}>
              {frames.length > 0 && (
                <Image
                  source={{ uri: frames[Math.min(currentFrame, frames.length - 1)] }}
                  style={styles.preview}
                  resizeMode="contain"
                />
              )}
              {/* Watermark overlay */}
              <View style={[
                styles.watermarkOverlay,
                watermarkStyle === 'badge' && styles.watermarkBadge,
              ]}>
                {watermarkStyle === 'text-icon' && (
                  <MaterialIcons name="movie-filter" size={14} color={COLORS.white} />
                )}
                {watermarkStyle === 'badge' && (
                  <MaterialIcons name="movie-filter" size={14} color={COLORS.white} />
                )}
                <Text style={styles.watermarkText}>ToyMotion</Text>
              </View>
            </View>

            {/* Watermark Style Picker */}
            <Text style={styles.sectionLabel}>Watermark Style</Text>
            <View style={styles.watermarkPicker}>
              {watermarkOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.watermarkOption,
                    watermarkStyle === opt.key && styles.watermarkOptionActive,
                  ]}
                  onPress={() => setWatermarkStyle(opt.key)}
                >
                  <Text
                    style={[
                      styles.watermarkOptionText,
                      watermarkStyle === opt.key && styles.watermarkOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MaterialIcons name="save-alt" size={22} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>Save to Device</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
              <MaterialIcons name="share" size={22} color={COLORS.white} />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>

            {/* Keep Editing */}
            <TouchableOpacity style={styles.keepEditingButton} onPress={onKeepEditing} activeOpacity={0.8}>
              <MaterialIcons name="arrow-back" size={20} color={COLORS.textLight} />
              <Text style={styles.keepEditingText}>Keep Editing</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  watermarkBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  watermarkText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  watermarkPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  watermarkOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  watermarkOptionActive: {
    backgroundColor: COLORS.primary,
  },
  watermarkOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  watermarkOptionTextActive: {
    color: COLORS.white,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.borderRadius,
    marginBottom: 10,
    gap: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: SIZES.borderRadius,
    marginBottom: 10,
    gap: 8,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  keepEditingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: SIZES.borderRadius,
    gap: 6,
  },
  keepEditingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
