import * as FileSystem from 'expo-file-system';
import { v4Style } from './helpers';

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  frameCount: number;
  fps: number;
}

const PROJECTS_DIR = `${FileSystem.documentDirectory}projects/`;

export async function ensureProjectsDir() {
  const info = await FileSystem.getInfoAsync(PROJECTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PROJECTS_DIR, { intermediates: true });
  }
}

export async function getProjectDir(projectId: string) {
  return `${PROJECTS_DIR}${projectId}/`;
}

export async function getFramesDir(projectId: string) {
  return `${PROJECTS_DIR}${projectId}/frames/`;
}

export async function createProject(name: string): Promise<ProjectMetadata> {
  await ensureProjectsDir();
  const id = v4Style();
  const projectDir = `${PROJECTS_DIR}${id}/`;
  const framesDir = `${projectDir}frames/`;

  await FileSystem.makeDirectoryAsync(framesDir, { intermediates: true });

  const metadata: ProjectMetadata = {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    frameCount: 0,
    fps: 12,
  };

  await FileSystem.writeAsStringAsync(
    `${projectDir}metadata.json`,
    JSON.stringify(metadata)
  );

  return metadata;
}

export async function loadProject(projectId: string): Promise<ProjectMetadata | null> {
  try {
    const metaPath = `${PROJECTS_DIR}${projectId}/metadata.json`;
    const data = await FileSystem.readAsStringAsync(metaPath);
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveProjectMetadata(metadata: ProjectMetadata) {
  const metaPath = `${PROJECTS_DIR}${metadata.id}/metadata.json`;
  await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(metadata));
}

export async function listProjects(): Promise<ProjectMetadata[]> {
  await ensureProjectsDir();
  try {
    const dirs = await FileSystem.readDirectoryAsync(PROJECTS_DIR);
    const projects: ProjectMetadata[] = [];
    for (const dir of dirs) {
      const meta = await loadProject(dir);
      if (meta) projects.push(meta);
    }
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export async function deleteProject(projectId: string) {
  const dir = `${PROJECTS_DIR}${projectId}/`;
  await FileSystem.deleteAsync(dir, { idempotent: true });
}

export function getFramePath(projectId: string, frameNumber: number): string {
  const padded = String(frameNumber).padStart(3, '0');
  return `${PROJECTS_DIR}${projectId}/frames/frame_${padded}.jpg`;
}

export async function addFrame(projectId: string, sourceUri: string, frameNumber: number): Promise<string> {
  const destPath = getFramePath(projectId, frameNumber);
  await FileSystem.copyAsync({ from: sourceUri, to: destPath });
  return destPath;
}

export async function deleteLastFrame(projectId: string, frameNumber: number) {
  const path = getFramePath(projectId, frameNumber);
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function getFrameUri(projectId: string, frameNumber: number): Promise<string | null> {
  const path = getFramePath(projectId, frameNumber);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

export async function getAllFrameUris(projectId: string, frameCount: number): Promise<string[]> {
  const uris: string[] = [];
  for (let i = 1; i <= frameCount; i++) {
    uris.push(getFramePath(projectId, i));
  }
  return uris;
}
