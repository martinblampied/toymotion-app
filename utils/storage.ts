import { File, Directory, Paths } from 'expo-file-system/next';
import { v4Style } from './helpers';

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  frameCount: number;
  fps: number;
}

const PROJECTS_DIR = new Directory(Paths.document, 'projects');

export async function ensureProjectsDir() {
  if (!PROJECTS_DIR.exists) {
    PROJECTS_DIR.create();
  }
}

export async function getProjectDir(projectId: string) {
  return new Directory(PROJECTS_DIR, projectId);
}

export async function getFramesDir(projectId: string) {
  return new Directory(PROJECTS_DIR, projectId, 'frames');
}

export async function createProject(name: string): Promise<ProjectMetadata> {
  await ensureProjectsDir();
  const id = v4Style();
  const projectDir = new Directory(PROJECTS_DIR, id);
  projectDir.create();
  const framesDir = new Directory(projectDir, 'frames');
  framesDir.create();

  const metadata: ProjectMetadata = {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    frameCount: 0,
    fps: 12,
  };

  const metaFile = new File(PROJECTS_DIR, id, 'metadata.json');
  metaFile.write(JSON.stringify(metadata));

  return metadata;
}

export async function loadProject(projectId: string): Promise<ProjectMetadata | null> {
  try {
    const metaFile = new File(PROJECTS_DIR, projectId, 'metadata.json');
    if (!metaFile.exists) return null;
    const data = metaFile.text();
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveProjectMetadata(metadata: ProjectMetadata) {
  const metaFile = new File(PROJECTS_DIR, metadata.id, 'metadata.json');
  metaFile.write(JSON.stringify(metadata));
}

export async function listProjects(): Promise<ProjectMetadata[]> {
  await ensureProjectsDir();
  try {
    const entries = PROJECTS_DIR.list();
    const projects: ProjectMetadata[] = [];
    for (const entry of entries) {
      if (entry instanceof Directory) {
        const meta = await loadProject(entry.name);
        if (meta) projects.push(meta);
      }
    }
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export async function deleteProject(projectId: string) {
  const dir = new Directory(PROJECTS_DIR, projectId);
  if (dir.exists) {
    dir.delete();
  }
}

export function getFramePath(projectId: string, frameNumber: number): string {
  const padded = String(frameNumber).padStart(3, '0');
  const file = new File(PROJECTS_DIR, projectId, 'frames', `frame_${padded}.jpg`);
  return file.uri;
}

export async function addFrame(projectId: string, sourceUri: string, frameNumber: number): Promise<string> {
  const padded = String(frameNumber).padStart(3, '0');
  const destFile = new File(PROJECTS_DIR, projectId, 'frames', `frame_${padded}.jpg`);
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destFile);
  return destFile.uri;
}

export async function deleteLastFrame(projectId: string, frameNumber: number) {
  const padded = String(frameNumber).padStart(3, '0');
  const file = new File(PROJECTS_DIR, projectId, 'frames', `frame_${padded}.jpg`);
  if (file.exists) {
    file.delete();
  }
}

export async function getFrameUri(projectId: string, frameNumber: number): Promise<string | null> {
  const padded = String(frameNumber).padStart(3, '0');
  const file = new File(PROJECTS_DIR, projectId, 'frames', `frame_${padded}.jpg`);
  return file.exists ? file.uri : null;
}

export async function getAllFrameUris(projectId: string, frameCount: number): Promise<string[]> {
  const uris: string[] = [];
  for (let i = 1; i <= frameCount; i++) {
    uris.push(getFramePath(projectId, i));
  }
  return uris;
}
