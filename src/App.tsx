import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/themes/prism-tomorrow.css';
import { 
  Settings, 
  ChevronLeft, 
  Plus, 
  Upload, 
  Send, 
  Folder, 
  FileCode, 
  Play, 
  Save,
  Home,
  Trash2,
  Edit2,
  FolderOpen,
  Box,
  Grid,
  Type,
  Square,
  MousePointer2,
  Layers,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Layout,
} from 'lucide-react';
import { EditorMode, EngineState, FileItem, ScreenItem, GameObject, Project } from './types';
import Viewport from './components/Viewport';

// --- Mock Data ---
const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Cyber Runner',
    packageName: 'com.elite.cyberrunner',
    versionName: '1.0.0',
    versionCode: 1,
    directory: '/projects/cyber-runner',
    lastModified: '2024-04-12',
    orientation: 'landscape',
    targetSdk: '34'
  },
  {
    id: 'p2',
    name: 'Space Explorer',
    packageName: 'com.elite.spaceexplorer',
    versionName: '0.5.2',
    versionCode: 5,
    directory: '/projects/space-explorer',
    lastModified: '2024-04-10',
    orientation: 'landscape',
    targetSdk: '33'
  }
];
const INITIAL_FILES: FileItem[] = [
  { id: '1', name: 'src', type: 'folder', isOpen: true },
  { id: '2', name: 'main.ts', type: 'file', parentId: '1', content: '// Main entry point\nconsole.log("Hello Engine");', relatedScreens: ['s1'] },
  { id: '3', name: 'utils.ts', type: 'file', parentId: '1', content: 'export const add = (a, b) => a + b;' },
  { id: '4', name: 'assets', type: 'folder', isOpen: false },
  { id: '5', name: 'player.png', type: 'file', parentId: '4' },
];

const INITIAL_SCREENS: ScreenItem[] = [
  { id: 's1', name: 'Main Menu', isSelected: false, isDefault: true },
  { id: 's2', name: 'Level 1', isSelected: false },
  { id: 's3', name: 'Game Over', isSelected: false },
];

const INITIAL_OBJECTS: GameObject[] = [
  { id: 'obj1', name: 'Player', type: 'sprite', x: 100, y: 150, width: 50, height: 50, rotation: 0, color: '#6366f1', opacity: 1, zIndex: 1, visible: true, screenId: 's1' },
  { id: 'obj2', name: 'Enemy', type: 'sprite', x: 400, y: 100, width: 40, height: 40, rotation: 0, color: '#ef4444', opacity: 1, zIndex: 1, visible: true, screenId: 's2' },
  { id: 'obj3', name: 'Title', type: 'text', x: 180, y: 40, width: 200, height: 40, rotation: 0, color: '#ffffff', opacity: 1, zIndex: 2, visible: true, screenId: 's1', text: 'Elite Engine', fontSize: 24 },
];

export default function App() {
  const [state, setState] = useState<EngineState>({
    view: 'home',
    currentProjectId: null,
    projects: MOCK_PROJECTS,
    mode: 'Level Editor',
    files: INITIAL_FILES,
    screens: INITIAL_SCREENS,
    selectedFileId: null,
    openFiles: [],
    objects: INITIAL_OBJECTS,
    selectedObjectId: null,
    chatHeight: 120,
    gridSize: 20,
    snapToGrid: true,
    showGrid: true,
    gridOpacity: 0.5,
    zoom: 1,
    viewportWidth: 667,
    viewportHeight: 375,
  });

  const [leftPanelTab, setLeftPanelTab] = useState<'files' | 'hierarchy'>('files');

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState<Partial<Project>>({
    name: '',
    packageName: 'com.elite.',
    versionName: '1.0.0',
    versionCode: 1,
    directory: '/projects/',
    orientation: 'landscape',
    targetSdk: '34'
  });

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Welcome to Elite Engine. How can I help you build today?' }
  ]);
  const [aiMode, setAiMode] = useState<'chat' | 'command'>('chat');
  const [chatInput, setChatInput] = useState('');

  const addObject = (type: 'sprite' | 'text' = 'sprite') => {
    const activeScreen = state.screens.find(s => s.isSelected) || state.screens.find(s => s.isDefault) || state.screens[0];
    const colors = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa'];
    const newObj: GameObject = {
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'text' ? `Text ${state.objects.length + 1}` : `Sprite ${state.objects.length + 1}`,
      type,
      x: 80 + Math.random() * 400,
      y: 60 + Math.random() * 200,
      width: type === 'text' ? 140 : 44,
      height: type === 'text' ? 32 : 44,
      rotation: 0,
      color: type === 'text' ? '#ffffff' : colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      zIndex: state.objects.length + 1,
      visible: true,
      screenId: activeScreen?.id,
      text: type === 'text' ? 'New Text' : undefined,
      fontSize: type === 'text' ? 16 : undefined,
    };
    setState(prev => ({ ...prev, objects: [...prev.objects, newObj], selectedObjectId: newObj.id }));
  };

  // Filtering logic for files
  const selectedScreenIds = state.screens.filter(s => s.isSelected).map(s => s.id);
  const filteredFiles = state.files.filter(file => {
    if (selectedScreenIds.length === 0) return true;
    if (file.type === 'folder') return true; // Keep folders for structure
    return file.relatedScreens?.some(id => selectedScreenIds.includes(id)) ?? false;
  });

  const handleTabChange = (mode: EditorMode) => {
    setState(prev => ({ ...prev, mode }));
  };

  const toggleScreen = (id: string) => {
    setState(prev => ({
      ...prev,
      screens: prev.screens.map(s => s.id === id ? { ...s, isSelected: !s.isSelected } : s)
    }));
  };

  const selectFile = (id: string) => {
    setState(prev => ({
      ...prev,
      selectedFileId: id,
      openFiles: prev.openFiles.includes(id) ? prev.openFiles : [...prev.openFiles, id],
      mode: prev.mode === 'Screens' ? 'Code Editor' : prev.mode
    }));
  };

  const addFile = () => {
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `new_file_${state.files.length}.ts`,
      type: 'file',
      content: '// New file content',
      parentId: '1'
    };
    setState(prev => ({ ...prev, files: [...prev.files, newFile] }));
  };

  const deleteFile = (id: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== id),
      openFiles: prev.openFiles.filter(fid => fid !== id),
      selectedFileId: prev.selectedFileId === id ? null : prev.selectedFileId
    }));
  };

  const renameFile = (id: string) => {
    const newName = window.prompt('Enter new file name:');
    if (!newName) return;
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => f.id === id ? { ...f, name: newName } : f)
    }));
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    setChatInput('');
    // Mock AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'ai', text: "I'm processing your request to modify the game logic..." }]);
    }, 1000);
  };
  const createProject = () => {
    if (!newProjectData.name) return;
    const project: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: newProjectData.name,
      packageName: newProjectData.packageName || 'com.elite.newproject',
      versionName: newProjectData.versionName || '1.0.0',
      versionCode: newProjectData.versionCode || 1,
      directory: newProjectData.directory || '/projects/new',
      lastModified: new Date().toISOString().split('T')[0],
      orientation: newProjectData.orientation || 'landscape',
      targetSdk: newProjectData.targetSdk || '34',
    };
    setState(prev => ({
      ...prev,
      projects: [project, ...prev.projects]
    }));
    setIsNewProjectModalOpen(false);
  };

  const openProject = (id: string) => {
    setState(prev => ({
      ...prev,
      view: 'editor',
      currentProjectId: id
    }));
  };

  const deleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== id)
      }));
    }
  };

  const updateSelectedObject = (updates: Partial<GameObject>) => {
    if (!state.selectedObjectId) return;
    setState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => obj.id === prev.selectedObjectId ? { ...obj, ...updates } : obj)
    }));
  };

  const updateFileContent = (id: string, content: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => f.id === id ? { ...f, content } : f)
    }));
  };

  if (state.view === 'home') {
    return (
      <div className="flex flex-col h-screen w-screen bg-engine-bg text-engine-text overflow-hidden font-sans">
        {/* Home Header */}
        <header className="h-16 border-b border-engine-border flex items-center justify-between px-8 bg-engine-panel shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-engine-accent rounded-xl flex items-center justify-center shadow-lg shadow-engine-accent/20">
              <Box className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Elite Engine</h1>
              <p className="text-[10px] text-engine-text-muted uppercase tracking-widest font-bold">Project Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-engine-border rounded-full transition-colors text-engine-text-muted hover:text-engine-text">
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-engine-accent hover:bg-opacity-90 text-white rounded-xl text-sm font-bold shadow-lg shadow-engine-accent/20 transition-all active:scale-95"
            >
              <Plus size={18} />
              Create New Project
            </button>
          </div>
        </header>

        {/* Project List */}
        <main className="flex-1 overflow-y-auto p-8 bg-black/20">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Recent Projects</h2>
              <div className="flex items-center gap-2 bg-engine-panel p-1 rounded-lg border border-engine-border">
                <button className="px-3 py-1.5 bg-engine-border rounded-md text-xs font-bold">Grid</button>
                <button className="px-3 py-1.5 text-engine-text-muted text-xs font-bold">List</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.projects.map(project => (
                <motion.div 
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="bg-engine-panel border border-engine-border rounded-2xl overflow-hidden group cursor-pointer shadow-xl hover:shadow-engine-accent/5 transition-all"
                  onClick={() => openProject(project.id)}
                >
                  <div className="aspect-video bg-gradient-to-br from-engine-accent/20 to-black/40 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:16px_16px]" />
                    <Box size={48} className="text-engine-accent/40 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                        className="p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-lg backdrop-blur-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-lg group-hover:text-engine-accent transition-colors">{project.name}</h3>
                      <span className="text-[10px] bg-engine-border px-2 py-0.5 rounded text-engine-text-muted font-bold uppercase tracking-wider">v{project.versionName}</span>
                    </div>
                    <p className="text-xs text-engine-text-muted mb-4 font-mono truncate">{project.packageName}</p>
                    <div className="flex items-center justify-between text-[10px] text-engine-text-muted font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <FolderOpen size={12} />
                        {project.directory.split('/').pop()}
                      </div>
                      <span>Modified {project.lastModified}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {state.projects.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-engine-border rounded-3xl">
                <Box size={48} className="text-engine-text-muted opacity-20" />
                <div>
                  <p className="text-engine-text-muted font-medium">No projects found</p>
                  <p className="text-xs text-engine-text-muted/60">Start by creating your first game project</p>
                </div>
                <button 
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="px-6 py-2 bg-engine-border hover:bg-engine-accent hover:text-white rounded-xl text-sm font-bold transition-all"
                >
                  Create Project
                </button>
              </div>
            )}
          </div>
        </main>

        {/* New Project Modal */}
        <AnimatePresence>
          {isNewProjectModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsNewProjectModalOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-engine-panel border border-engine-border w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-engine-border flex items-center justify-between bg-engine-bg/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-engine-accent/10 rounded-xl flex items-center justify-center">
                      <Plus className="text-engine-accent" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Create New Project</h2>
                      <p className="text-xs text-engine-text-muted">Configure your game engine workspace</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="p-2 hover:bg-engine-border rounded-full transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">App Name</label>
                      <input 
                        type="text" 
                        placeholder="My Awesome Game"
                        value={newProjectData.name}
                        onChange={e => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-engine-bg border border-engine-border rounded-xl px-4 py-3 text-sm outline-none focus:border-engine-accent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">Package Name</label>
                      <input 
                        type="text" 
                        placeholder="com.example.game"
                        value={newProjectData.packageName}
                        onChange={e => setNewProjectData(prev => ({ ...prev, packageName: e.target.value }))}
                        className="w-full bg-engine-bg border border-engine-border rounded-xl px-4 py-3 text-sm outline-none focus:border-engine-accent transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Versioning */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">Version Name</label>
                      <input 
                        type="text" 
                        placeholder="1.0.0"
                        value={newProjectData.versionName}
                        onChange={e => setNewProjectData(prev => ({ ...prev, versionName: e.target.value }))}
                        className="w-full bg-engine-bg border border-engine-border rounded-xl px-4 py-3 text-sm outline-none focus:border-engine-accent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">Version Code</label>
                      <input 
                        type="number" 
                        value={newProjectData.versionCode}
                        onChange={e => setNewProjectData(prev => ({ ...prev, versionCode: parseInt(e.target.value) }))}
                        className="w-full bg-engine-bg border border-engine-border rounded-xl px-4 py-3 text-sm outline-none focus:border-engine-accent transition-all"
                      />
                    </div>
                  </div>

                  {/* Directory & SDK */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">Project Directory</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newProjectData.directory}
                          onChange={e => setNewProjectData(prev => ({ ...prev, directory: e.target.value }))}
                          className="flex-1 bg-engine-bg border border-engine-border rounded-xl px-4 py-3 text-sm outline-none focus:border-engine-accent transition-all font-mono"
                        />
                        <button className="p-3 bg-engine-border rounded-xl hover:bg-engine-text-muted/20 transition-all">
                          <FolderOpen size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">Target SDK</label>
                      <select 
                        value={newProjectData.targetSdk}
                        onChange={e => setNewProjectData(prev => ({ ...prev, targetSdk: e.target.value }))}
                        className="w-full bg-engine-bg border border-engine-border rounded-xl px-4 py-3 text-sm outline-none focus:border-engine-accent transition-all appearance-none"
                      >
                        <option value="34">Android 14 (API 34)</option>
                        <option value="33">Android 13 (API 33)</option>
                        <option value="32">Android 12L (API 32)</option>
                      </select>
                    </div>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">Default Orientation</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['landscape', 'portrait', 'auto'].map(o => (
                        <button 
                          key={o}
                          onClick={() => setNewProjectData(prev => ({ ...prev, orientation: o as any }))}
                          className={`py-3 rounded-xl border-2 text-xs font-bold capitalize transition-all ${
                            newProjectData.orientation === o 
                              ? 'border-engine-accent bg-engine-accent/10 text-engine-accent' 
                              : 'border-engine-border bg-engine-bg hover:border-engine-text-muted'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-engine-border bg-engine-bg/50 flex gap-4">
                  <button 
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="flex-1 py-3 bg-engine-border hover:bg-engine-text-muted/20 rounded-xl text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createProject}
                    disabled={!newProjectData.name}
                    className="flex-1 py-3 bg-engine-accent hover:bg-opacity-90 text-white rounded-xl text-sm font-bold shadow-lg shadow-engine-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Project
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-engine-bg text-engine-text overflow-hidden">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="h-12 border-b border-engine-border flex items-center justify-between px-4 bg-engine-panel shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setState(prev => ({ ...prev, view: 'home' }))}
            className="p-1 hover:bg-engine-border rounded-md transition-colors text-engine-text-muted hover:text-engine-text"
            title="Back to Home"
          >
            <Home size={20} />
          </button>
          <div className="h-4 w-[1px] bg-engine-border mx-1" />
          <button className="p-1 hover:bg-engine-border rounded-md transition-colors">
            <Settings size={20} />
          </button>
        </div>

        <nav className="flex items-center bg-engine-bg rounded-lg p-1 gap-1 overflow-x-auto no-scrollbar max-w-[50%]">
          {(['Screens', 'Level Editor', 'Code Editor', 'Preview'] as EditorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleTabChange(m)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                state.mode === m 
                  ? 'bg-engine-accent text-white shadow-lg' 
                  : 'text-engine-text-muted hover:text-engine-text hover:bg-engine-border'
              }`}
            >
              {m}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-engine-border hover:bg-opacity-80 rounded-md text-xs font-medium transition-all">
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-md text-xs font-medium transition-all">
            <Play size={14} />
            <span className="hidden sm:inline">Run</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* 2. LEFT PANEL (FILE MANAGEMENT / HIERARCHY) */}
        <aside className="w-56 border-r border-engine-border bg-engine-panel flex flex-col shrink-0">
          <div className="flex border-b border-engine-border">
            <button 
              onClick={() => setLeftPanelTab('files')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${leftPanelTab === 'files' ? 'text-engine-accent border-b-2 border-engine-accent' : 'text-engine-text-muted hover:text-engine-text'}`}
            >
              Files
            </button>
            <button 
              onClick={() => setLeftPanelTab('hierarchy')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${leftPanelTab === 'hierarchy' ? 'text-engine-accent border-b-2 border-engine-accent' : 'text-engine-text-muted hover:text-engine-text'}`}
            >
              Hierarchy
            </button>
          </div>

          {leftPanelTab === 'files' ? (
            <>
              <div className="p-3 grid grid-cols-2 gap-2 border-b border-engine-border">
                <button 
                  onClick={addFile}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-engine-border rounded-md text-[10px] font-bold hover:bg-opacity-80 transition-all uppercase tracking-wider"
                >
                  <Plus size={12} /> New
                </button>
                <button className="flex items-center justify-center gap-1 px-2 py-2 bg-engine-border rounded-md text-[10px] font-bold hover:bg-opacity-80 transition-all uppercase tracking-wider">
                  <Upload size={12} /> Import
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredFiles.map(file => (
                  <div 
                    key={file.id}
                    onClick={() => file.type === 'file' && selectFile(file.id)}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors ${
                      state.selectedFileId === file.id ? 'bg-engine-accent/20 text-engine-accent' : 'hover:bg-engine-border/50'
                    }`}
                    style={{ paddingLeft: file.parentId ? '1.5rem' : '0.5rem' }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {file.type === 'folder' ? <Folder size={14} className="text-yellow-500 shrink-0" /> : <FileCode size={14} className="text-blue-400 shrink-0" />}
                      <span className="text-xs truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          renameFile(file.id);
                        }}
                        className="p-1 hover:bg-engine-border rounded transition-all text-engine-text-muted hover:text-engine-text"
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.id);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded transition-all text-engine-text-muted hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-engine-border space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => addObject('sprite')}
                    className="flex items-center justify-center gap-1 py-1.5 bg-engine-border rounded-md text-[10px] font-bold hover:bg-engine-accent hover:text-white transition-all uppercase tracking-wider"
                  >
                    <Square size={11} /> Sprite
                  </button>
                  <button
                    onClick={() => addObject('text')}
                    className="flex items-center justify-center gap-1 py-1.5 bg-engine-border rounded-md text-[10px] font-bold hover:bg-engine-accent hover:text-white transition-all uppercase tracking-wider"
                  >
                    <Type size={11} /> Text
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {state.objects.sort((a, b) => b.zIndex - a.zIndex).map(obj => (
                  <div 
                    key={obj.id}
                    onClick={() => setState(prev => ({ ...prev, selectedObjectId: obj.id }))}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors ${
                      state.selectedObjectId === obj.id ? 'bg-engine-accent/20 text-engine-accent' : 'hover:bg-engine-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Layers size={12} className={obj.visible ? 'text-engine-accent' : 'text-engine-text-muted'} />
                      <span className={`text-xs truncate ${!obj.visible && 'opacity-50'}`}>{obj.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setState(prev => ({
                            ...prev,
                            objects: prev.objects.map(o => o.id === obj.id ? { ...o, visible: !o.visible } : o)
                          }));
                        }}
                        className="p-1 hover:bg-engine-border rounded transition-all text-engine-text-muted hover:text-engine-text"
                      >
                        {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 3. CENTER WORKSPACE */}
        <section className="flex-1 flex flex-col bg-black overflow-hidden relative">
          {/* EDITOR DISPLAY AREA */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="aspect-video w-full max-w-4xl bg-engine-bg rounded-lg border border-engine-border shadow-2xl relative overflow-hidden">
              <AnimatePresence mode="wait">
                {state.mode === 'Screens' && (
                  <motion.div 
                    key="screens"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 p-6 overflow-y-auto"
                  >
                    <h2 className="text-lg font-bold mb-4">Project Screens</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {state.screens.map(screen => (
                        <div 
                          key={screen.id}
                          onClick={() => toggleScreen(screen.id)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                            screen.isSelected 
                              ? 'border-engine-accent bg-engine-accent/10' 
                              : 'border-engine-border bg-engine-panel hover:border-engine-text-muted'
                          }`}
                        >
                          <div className="aspect-video bg-black/40 rounded-lg border border-engine-border flex items-center justify-center">
                            <span className="text-[10px] text-engine-text-muted">Preview</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{screen.name}</span>
                            <div className={`w-4 h-4 rounded-full border-2 ${screen.isSelected ? 'bg-engine-accent border-engine-accent' : 'border-engine-border'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {state.mode === 'Level Editor' && (
                  <motion.div 
                    key="level"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <Viewport
                      objects={state.objects}
                      selectedObjectId={state.selectedObjectId}
                      screens={state.screens}
                      gridSize={state.gridSize}
                      showGrid={state.showGrid}
                      gridOpacity={state.gridOpacity}
                      snapToGrid={state.snapToGrid}
                      onSelectObject={(id) => setState(prev => ({ ...prev, selectedObjectId: id }))}
                      onUpdateObject={(id, updates) => setState(prev => ({
                        ...prev,
                        objects: prev.objects.map(o => o.id === id ? { ...o, ...updates } : o)
                      }))}
                    />
                  </motion.div>
                )}

                {state.mode === 'Code Editor' && (
                  <motion.div 
                    key="code"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col bg-[#1e1e1e]"
                  >
                    <div className="flex bg-engine-panel border-b border-engine-border overflow-x-auto no-scrollbar">
                      {state.openFiles.map(id => {
                        const file = state.files.find(f => f.id === id);
                        return (
                          <div 
                            key={id}
                            onClick={() => setState(prev => ({ ...prev, selectedFileId: id }))}
                            className={`px-4 py-2 text-xs border-r border-engine-border cursor-pointer whitespace-nowrap flex items-center gap-2 transition-all ${
                              state.selectedFileId === id ? 'bg-[#1e1e1e] border-t-2 border-t-engine-accent text-white' : 'text-engine-text-muted hover:bg-engine-border/30'
                            }`}
                          >
                            <FileCode size={12} className={state.selectedFileId === id ? 'text-engine-accent' : ''} />
                            {file?.name}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex-1 overflow-auto p-4 custom-editor-container">
                      {state.selectedFileId ? (
                        <Editor
                          value={state.files.find(f => f.id === state.selectedFileId)?.content || ''}
                          onValueChange={code => updateFileContent(state.selectedFileId!, code)}
                          highlight={code => highlight(code, languages.typescript, 'typescript')}
                          padding={10}
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: 14,
                            minHeight: '100%',
                            outline: 'none'
                          }}
                          className="prism-editor"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-engine-text-muted opacity-40">
                          <FileCode size={48} className="mb-4" />
                          <p>Select a file to edit</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {state.mode === 'Preview' && (
                  <motion.div 
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black flex items-center justify-center"
                  >
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-engine-accent rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Play size={32} fill="white" />
                      </div>
                      <p className="text-sm text-engine-text-muted font-medium">Running Game Preview...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 5. AI CHAT SYSTEM (BOTTOM PANEL) */}
          <motion.div 
            style={{ height: state.chatHeight }}
            className="bg-engine-panel border-t border-engine-border flex flex-col shrink-0 relative"
          >
            {/* Resize Handle */}
            <div 
              className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize z-20 hover:bg-engine-accent/50 transition-colors"
              onMouseDown={(e) => {
                const startY = e.clientY;
                const startHeight = state.chatHeight;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = startY - moveEvent.clientY;
                  setState(prev => ({ ...prev, chatHeight: Math.max(80, Math.min(300, startHeight + delta)) }));
                };
                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                };
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
            />

            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-engine-accent text-white rounded-tr-none' 
                      : 'bg-engine-border text-engine-text rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-engine-panel border-t border-engine-border">
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => setAiMode('chat')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${aiMode === 'chat' ? 'bg-engine-accent text-white' : 'bg-engine-border text-engine-text-muted'}`}
                >
                  CHAT
                </button>
                <button 
                  onClick={() => setAiMode('command')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${aiMode === 'command' ? 'bg-engine-accent text-white' : 'bg-engine-border text-engine-text-muted'}`}
                >
                  COMMAND
                </button>
              </div>
              <div className="flex items-center gap-2 bg-engine-bg rounded-xl border border-engine-border p-1.5 focus-within:border-engine-accent transition-all">
                <button className="p-1.5 text-engine-text-muted hover:text-engine-text transition-colors">
                  <Plus size={18} />
                </button>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask AI to generate code or assets..."
                  className="flex-1 bg-transparent border-none outline-none text-xs px-1"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-1.5 bg-engine-accent text-white rounded-lg hover:bg-opacity-90 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 4. RIGHT PANEL (INSPECTOR) */}
        <aside className="w-64 border-l border-engine-border bg-engine-panel flex flex-col shrink-0">
          <div className="p-3 border-b border-engine-border flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted">Inspector</h3>
            <Layers size={14} className="text-engine-text-muted" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {state.selectedObjectId ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold">Name</label>
                    <input 
                      type="text" 
                      value={state.objects.find(o => o.id === state.selectedObjectId)?.name || ''}
                      onChange={(e) => updateSelectedObject({ name: e.target.value })}
                      className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs outline-none focus:border-engine-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold">Type</label>
                    <select 
                      value={state.objects.find(o => o.id === state.selectedObjectId)?.type}
                      onChange={(e) => updateSelectedObject({ type: e.target.value as any })}
                      className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs outline-none focus:border-engine-accent appearance-none"
                    >
                      <option value="sprite">Sprite</option>
                      <option value="text">Text</option>
                      <option value="button">Button</option>
                      <option value="container">Container</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-engine-text-muted uppercase font-bold">X Pos</label>
                      <input 
                        type="number" 
                        value={Math.round(state.objects.find(o => o.id === state.selectedObjectId)?.x || 0)} 
                        onChange={(e) => updateSelectedObject({ x: parseInt(e.target.value) || 0 })}
                        className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-engine-text-muted uppercase font-bold">Y Pos</label>
                      <input 
                        type="number" 
                        value={Math.round(state.objects.find(o => o.id === state.selectedObjectId)?.y || 0)} 
                        onChange={(e) => updateSelectedObject({ y: parseInt(e.target.value) || 0 })}
                        className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-engine-text-muted uppercase font-bold">Width</label>
                      <input 
                        type="number" 
                        value={Math.round(state.objects.find(o => o.id === state.selectedObjectId)?.width || 0)} 
                        onChange={(e) => updateSelectedObject({ width: parseInt(e.target.value) || 0 })}
                        className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-engine-text-muted uppercase font-bold">Height</label>
                      <input 
                        type="number" 
                        value={Math.round(state.objects.find(o => o.id === state.selectedObjectId)?.height || 0)} 
                        onChange={(e) => updateSelectedObject({ height: parseInt(e.target.value) || 0 })}
                        className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold flex items-center justify-between">
                      Rotation <span>{state.objects.find(o => o.id === state.selectedObjectId)?.rotation}°</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360"
                      value={state.objects.find(o => o.id === state.selectedObjectId)?.rotation || 0}
                      onChange={(e) => updateSelectedObject({ rotation: parseInt(e.target.value) })}
                      className="w-full accent-engine-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold flex items-center justify-between">
                      Opacity 
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={Math.round((state.objects.find(o => o.id === state.selectedObjectId)?.opacity || 0) * 100)}
                        onChange={(e) => updateSelectedObject({ opacity: parseInt(e.target.value) / 100 })}
                        className="w-12 bg-engine-bg border border-engine-border rounded px-1 text-right text-[10px] outline-none focus:border-engine-accent"
                      />
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1"
                      step="0.01"
                      value={state.objects.find(o => o.id === state.selectedObjectId)?.opacity || 0}
                      onChange={(e) => updateSelectedObject({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-engine-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold flex items-center justify-between">
                      Z-Index / Layer <span>{state.objects.find(o => o.id === state.selectedObjectId)?.zIndex}</span>
                    </label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const current = state.objects.find(o => o.id === state.selectedObjectId)?.zIndex || 0;
                          updateSelectedObject({ zIndex: Math.max(0, current - 1) });
                        }}
                        className="flex-1 py-1.5 bg-engine-border hover:bg-engine-text-muted/20 rounded-lg flex items-center justify-center transition-all"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          const current = state.objects.find(o => o.id === state.selectedObjectId)?.zIndex || 0;
                          updateSelectedObject({ zIndex: current + 1 });
                        }}
                        className="flex-1 py-1.5 bg-engine-border hover:bg-engine-text-muted/20 rounded-lg flex items-center justify-center transition-all"
                      >
                        <ArrowUp size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold">Assign to Screen</label>
                    <select
                      value={state.objects.find(o => o.id === state.selectedObjectId)?.screenId || ''}
                      onChange={(e) => updateSelectedObject({ screenId: e.target.value || undefined })}
                      className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs outline-none focus:border-engine-accent appearance-none"
                    >
                      <option value="">— All Screens —</option>
                      {state.screens.map(s => (
                        <option key={s.id} value={s.id}>{s.name}{s.isDefault ? ' (Default)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold">Visibility</label>
                    <button 
                      onClick={() => {
                        const current = state.objects.find(o => o.id === state.selectedObjectId)?.visible;
                        updateSelectedObject({ visible: !current });
                      }}
                      className={`w-full py-2 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        state.objects.find(o => o.id === state.selectedObjectId)?.visible
                          ? 'border-engine-accent bg-engine-accent/10 text-engine-accent'
                          : 'border-engine-border bg-engine-bg text-engine-text-muted'
                      }`}
                    >
                      {state.objects.find(o => o.id === state.selectedObjectId)?.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      {state.objects.find(o => o.id === state.selectedObjectId)?.visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>

                  {state.objects.find(o => o.id === state.selectedObjectId)?.type === 'text' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] text-engine-text-muted uppercase font-bold">Text Content</label>
                        <textarea 
                          value={state.objects.find(o => o.id === state.selectedObjectId)?.text || ''}
                          onChange={(e) => updateSelectedObject({ text: e.target.value })}
                          className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs outline-none focus:border-engine-accent h-20 resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-engine-text-muted uppercase font-bold">Font Size</label>
                        <input 
                          type="number" 
                          value={state.objects.find(o => o.id === state.selectedObjectId)?.fontSize || 16} 
                          onChange={(e) => updateSelectedObject({ fontSize: parseInt(e.target.value) || 12 })}
                          className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs" 
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] text-engine-text-muted uppercase font-bold">Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={state.objects.find(o => o.id === state.selectedObjectId)?.color} 
                        onChange={(e) => updateSelectedObject({ color: e.target.value })}
                        className="w-8 h-8 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={state.objects.find(o => o.id === state.selectedObjectId)?.color || ''} 
                        onChange={(e) => updateSelectedObject({ color: e.target.value })}
                        className="flex-1 bg-engine-bg border border-engine-border rounded px-2 py-1.5 text-xs font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-engine-border">
                  <button 
                    onClick={() => {
                      if (state.selectedObjectId) {
                        setState(prev => ({
                          ...prev,
                          objects: prev.objects.filter(o => o.id !== prev.selectedObjectId),
                          selectedObjectId: null
                        }));
                      }
                    }}
                    className="w-full py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
                  >
                    Delete Object
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-engine-bg/50 p-4 rounded-2xl border border-engine-border space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted flex items-center gap-2">
                    <Layout size={12} /> Viewport Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase text-engine-text-muted">Width</label>
                      <input 
                        type="number" 
                        value={state.viewportWidth}
                        onChange={(e) => setState(prev => ({ ...prev, viewportWidth: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1 text-xs outline-none focus:border-engine-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase text-engine-text-muted">Height</label>
                      <input 
                        type="number" 
                        value={state.viewportHeight}
                        onChange={(e) => setState(prev => ({ ...prev, viewportHeight: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-engine-bg border border-engine-border rounded px-2 py-1 text-xs outline-none focus:border-engine-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-engine-bg/50 p-4 rounded-2xl border border-engine-border space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-engine-text-muted flex items-center gap-2">
                    <Grid size={12} /> Grid Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Show Grid</span>
                      <button
                        onClick={() => setState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                        className={`w-10 h-5 rounded-full transition-all relative ${state.showGrid ? 'bg-engine-accent' : 'bg-engine-border'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${state.showGrid ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Snap to Grid</span>
                      <button 
                        onClick={() => setState(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
                        className={`w-10 h-5 rounded-full transition-all relative ${state.snapToGrid ? 'bg-engine-accent' : 'bg-engine-border'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${state.snapToGrid ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-engine-text-muted font-bold uppercase">
                        <span>Grid Size</span>
                        <span>{state.gridSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="4" 
                        max="100" 
                        step="4"
                        value={state.gridSize}
                        onChange={(e) => setState(prev => ({ ...prev, gridSize: parseInt(e.target.value) }))}
                        className="w-full accent-engine-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-engine-text-muted font-bold uppercase">
                        <span>Grid Opacity</span>
                        <span>{Math.round(state.gridOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={state.gridOpacity}
                        onChange={(e) => setState(prev => ({ ...prev, gridOpacity: parseFloat(e.target.value) }))}
                        className="w-full accent-engine-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 opacity-40">
                  <MousePointer2 size={32} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Select an object</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
