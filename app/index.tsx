import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { ProjectMetadata, listProjects, createProject, deleteProject, getFramePath } from '../utils/storage';
import { formatTimeAgo } from '../utils/helpers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function HomeScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  async function loadProjects() {
    const list = await listProjects();
    setProjects(list);
  }

  async function handleCreate() {
    const count = projects.length + 1;
    const project = await createProject(`My Animation ${count}`);
    router.push({ pathname: '/camera', params: { projectId: project.id } });
  }

  function handleProjectPress(project: ProjectMetadata) {
    router.push({ pathname: '/camera', params: { projectId: project.id } });
  }

  function handleProjectLongPress(project: ProjectMetadata) {
    Alert.alert(
      'Delete Project',
      `Delete "${project.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(project.id);
            loadProjects();
          },
        },
      ]
    );
  }

  if (projects.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.logo}>
          <Text style={styles.logoToy}>Toy</Text>
          <Text style={styles.logoMotion}>Motion</Text>
        </Text>

        <View style={styles.emptyState}>
          <View style={styles.emptyIllustration}>
            <MaterialIcons name="movie-creation" size={80} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Create your first{'\n'}stop-motion movie!</Text>
          <Text style={styles.emptySubtitle}>
            Take photos frame by frame and watch your toys come to life
          </Text>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreate} activeOpacity={0.8}>
          <MaterialIcons name="add" size={28} color={COLORS.white} />
          <Text style={styles.createButtonText}>Create New Animation</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          <Text style={styles.logoToy}>Toy</Text>
          <Text style={styles.logoMotion}>Motion</Text>
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate} activeOpacity={0.8}>
          <MaterialIcons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>My Animations</Text>

      <FlatList
        data={projects}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleProjectPress(item)}
            onLongPress={() => handleProjectLongPress(item)}
            activeOpacity={0.8}
          >
            <View style={styles.cardThumb}>
              {item.frameCount > 0 ? (
                <Image
                  source={{ uri: getFramePath(item.id, 1) }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="movie-creation" size={40} color={COLORS.textLight} />
              )}
              <View style={styles.frameBadge}>
                <Text style={styles.frameBadgeText}>{item.frameCount} frames</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.cardMeta}>
              <MaterialIcons name="access-time" size={14} color={COLORS.textLight} />
              <Text style={styles.cardMetaText}>{formatTimeAgo(item.updatedAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.padding,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  logoToy: { color: COLORS.primary },
  logoMotion: { color: COLORS.accent },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  grid: {
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardThumb: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  frameBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.dark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  frameBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyIllustration: {
    width: 200,
    height: 200,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: SIZES.headerFont,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: SIZES.bodyFont,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: SIZES.borderRadius,
    marginBottom: 24,
    gap: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: SIZES.buttonFont,
    fontWeight: '700',
  },
});
