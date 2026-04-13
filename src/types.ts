export type EditorMode = 'Screens' | 'Level Editor' | 'Code Editor' | 'Preview';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parentId?: string;
  isOpen?: boolean;
  relatedScreens?: string[]; // For filtering
}

export interface ScreenItem {
  id: string;
  name: string;
  isSelected: boolean;
}

export interface GameObject {
  id: string;
  name: string;
  type: 'sprite' | 'text' | 'button' | 'container';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  opacity: number;
  zIndex: number;
  visible: boolean;
  text?: string;
  fontSize?: number;
}

export interface Project {
  id: string;
  name: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  directory: string;
  icon?: string;
  lastModified: string;
  orientation: 'landscape' | 'portrait' | 'auto';
  targetSdk: string;
}

export interface EngineState {
  view: 'home' | 'editor';
  currentProjectId: string | null;
  projects: Project[];
  mode: EditorMode;
  files: FileItem[];
  screens: ScreenItem[];
  selectedFileId: string | null;
  openFiles: string[];
  objects: GameObject[];
  selectedObjectId: string | null;
  chatHeight: number;
  gridSize: number;
  snapToGrid: boolean;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
}
