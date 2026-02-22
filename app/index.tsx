import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { ProjectMetadata, listProjects, createProject, deleteProject, getFramePath } from '../utils/storage';
import { formatTimeAgo } from '../utils/helpers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const BG_WARM = '#F7F3EF';

export default function HomeScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const breathAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const cardTranslateY = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

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

  function renderHeader() {
    return (
      <View style={styles.header}>
        <Text style={styles.logo}>
          <Text style={styles.logoToy}>Toy</Text>
          <Text style={styles.logoMotion}>Motion</Text>
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.settingsOuter}>
            <TouchableOpacity style={styles.settingsButton} activeOpacity={0.7}>
              <MaterialIcons name="settings" size={24} color="#A8A3AE" />
            </TouchableOpacity>
          </View>
          <View style={styles.addButtonOuter}>
            <TouchableOpacity style={styles.addButton} onPress={handleCreate} activeOpacity={0.8}>
              <MaterialIcons name="add" size={28} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}

        {/* Center content */}
        <View style={styles.emptyCenter}>
          <Animated.View style={[styles.illustrationCard, { transform: [{ translateY: cardTranslateY }, { rotate: '6deg' }] }]}>
            <View style={styles.sparkleBadge}>
              <Text style={styles.sparkleEmoji}>✨</Text>
            </View>
            <Image
              source={require('../assets/empty-state.jpg')}
              style={styles.emptyIllustration}
              resizeMode="cover"
            />
          </Animated.View>

          <Text style={styles.emptyTitle}>
            Create your first{'\n'}stop-motion movie!
          </Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to start making{'\n'}movie magic. It's super easy!
          </Text>
        </View>

        {/* Bottom CTA */}
        <View style={styles.createButtonWrapper}>
          <View style={styles.createButtonShadow}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreate}
              activeOpacity={0.9}
            >
              <MaterialIcons name="add" size={26} color={COLORS.white} />
              <Text style={styles.createButtonText}>Create New Animation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <Text style={styles.sectionTitle}>My Animations</Text>

      <FlatList
        data={projects}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.projectCard}
            onPress={() => handleProjectPress(item)}
            onLongPress={() => handleProjectLongPress(item)}
            activeOpacity={0.8}
          >
            <View style={styles.projectCardThumb}>
              {item.frameCount > 0 ? (
                <Image
                  source={{ uri: getFramePath(item.id, 1) }}
                  style={styles.projectCardImage}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="movie-creation" size={40} color={COLORS.textLight} />
              )}
              <View style={styles.frameBadge}>
                <Text style={styles.frameBadgeText}>{item.frameCount} frames</Text>
              </View>
            </View>
            <Text style={styles.projectCardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.projectCardMeta}>
              <MaterialIcons name="access-time" size={14} color={COLORS.textLight} />
              <Text style={styles.projectCardMetaText}>{formatTimeAgo(item.updatedAt)}</Text>
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
    backgroundColor: BG_WARM,
    paddingHorizontal: SIZES.padding,
  },

  /* ---- Header ---- */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  logo: {
    fontSize: 34,
    fontFamily: 'Nunito_900Black',
  },
  logoToy: { color: COLORS.primary },
  logoMotion: { color: COLORS.accent },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsOuter: {
    width: 48,
    height: 52,
    borderRadius: 24,
    backgroundColor: '#D4D0D8',
    paddingBottom: 4,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECEAF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonOuter: {
    width: 48,
    height: 52,
    borderRadius: 24,
    backgroundColor: '#C24040',
    paddingBottom: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ---- Empty State ---- */
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationCard: {
    width: width * 0.7,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 32,
  },
  sparkleBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sparkleEmoji: {
    fontSize: 18,
  },
  emptyIllustration: {
    width: width * 0.7 - 40,
    height: width * 0.7 - 40,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 30,
    fontFamily: 'Nunito_900Black',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createButtonWrapper: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  createButtonShadow: {
    borderRadius: 24,
    backgroundColor: '#C24848',
    paddingBottom: 6,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F07272',
    paddingVertical: 20,
    borderRadius: 24,
    gap: 10,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontFamily: 'Nunito_800ExtraBold',
  },

  /* ---- Projects List ---- */
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
  projectCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  projectCardThumb: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectCardImage: {
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
  projectCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  projectCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 4,
    gap: 4,
  },
  projectCardMetaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
