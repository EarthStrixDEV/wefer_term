import { useState, useEffect, useRef } from 'react';
import aiCafeMascot from './assets/ai_cafe_mascot.png';
import claudeMascot from './assets/claude_mascot.png';
import geminiMascot from './assets/gemini_mascot.png';
import codexMascot from './assets/codex_mascot.png';
import {
  LayoutDashboard,
  Terminal,
  Cpu,
  Activity,
  Database,
  Play,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  X,
  Info,
  CheckCircle2,
  Sliders,
  Code2,
  Sparkles,
  Zap,
  Globe,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  Settings,
  RotateCcw
} from 'lucide-react';
import TerminalView from './TerminalView';

// Pure helper functions to satisfy React Compiler purity linter
const getTimestampId = () => Date.now();
const DEFAULT_GRID_SLOTS = ['claude-code', 'antigravity-cli', 'codex-cli', 'npm-server'];

// Reusable CSS-only toggle switch (controlled).
function ToggleSwitch({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Custom Window Controls (for Frameless Electron Window)
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  // Live Digital Clock State
  const [timeStr, setTimeStr] = useState('00:00:00');
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // System Stats — real-time OS data pushed from main process every 3s
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    activeTasks: 2,
    commandsCount: 15
  });

  useEffect(() => {
    if (!window.electronAPI?.onSystemStats) return;
    const unsub = window.electronAPI.onSystemStats(({ cpu, memUsedGB }) => {
      setSystemStats(prev => ({ ...prev, cpu, memory: memUsedGB }));
    });
    return unsub;
  }, []);

  // Application Settings — persisted in main process (wefer-settings.json)
  const [appSettings, setAppSettings] = useState({
    hardwareAcceleration: true,
    alwaysOnTop: false,
    persistWorkspace: true,
    workspacePath: null
  });
  const [restartHint, setRestartHint] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.getSettings) return;
    window.electronAPI.getSettings().then(setAppSettings);
  }, []);

  const updateSetting = (patch, needsRestart = false) => {
    setAppSettings(prev => ({ ...prev, ...patch }));
    if (window.electronAPI?.setSettings) {
      window.electronAPI.setSettings(patch).then(setAppSettings);
    }
    if (needsRestart) setRestartHint(true);
  };

  // Agents list
  const [agents, setAgents] = useState([
    {
      id: 'claude-code',
      name: 'Claude Code (V1.2)',
      platform: 'Anthropic CLI',
      status: 'working',
      rpm: 45,
      tpm: 80000,
      contextLimit: 200000,
      contextUsed: 64200,
      totalTokens: 1245000,
      tasksRun: 28,
      apiKeySet: true,
      lastActive: 'Just now'
    },
    {
      id: 'antigravity-cli',
      name: 'Antigravity CLI (v2.0)',
      platform: 'Google Gemini',
      status: 'working',
      rpm: 15,
      tpm: 120000,
      contextLimit: 1000000,
      contextUsed: 312500,
      totalTokens: 4890000,
      tasksRun: 84,
      apiKeySet: true,
      lastActive: '2 min ago'
    },
    {
      id: 'codex-cli',
      name: 'Codex CLI',
      platform: 'OpenAI Developer',
      status: 'idle',
      rpm: 30,
      tpm: 40000,
      contextLimit: 128000,
      contextUsed: 12400,
      totalTokens: 980000,
      tasksRun: 12,
      apiKeySet: true,
      lastActive: '1 hr ago'
    },
    {
      id: 'npm-server',
      name: 'NPM Web Server',
      platform: 'Node.js / npm',
      status: 'idle',
      rpm: 0,
      tpm: 0,
      contextLimit: 0,
      contextUsed: 0,
      totalTokens: 0,
      tasksRun: 0,
      apiKeySet: true,
      lastActive: 'Never'
    },
    {
      id: 'dotnet-env',
      name: 'Dotnet Core Dev',
      platform: '.NET CLI',
      status: 'idle',
      rpm: 0,
      tpm: 0,
      contextLimit: 0,
      contextUsed: 0,
      totalTokens: 0,
      tasksRun: 0,
      apiKeySet: true,
      lastActive: 'Never'
    }
  ]);

  // Terminal log storage by agent
  const [agentLogs, setAgentLogs] = useState({
    'claude-code': [
      { id: 1, type: 'info', text: 'Anthropic Claude Code service started. Listening on workspace port 4880.', timestamp: '14:32:01' },
      { id: 2, type: 'command', text: 'claude commit --auto-message', timestamp: '14:32:15' },
      { id: 3, type: 'info', text: 'Analyzing modified files in workspace...', timestamp: '14:32:16' },
      { id: 4, type: 'info', text: 'Detected 2 changed files: src/auth/helper.js, src/auth/route.js', timestamp: '14:32:17' },
      { id: 5, type: 'success', text: 'Successfully generated commit message: "refactor(auth): simplify JWT validation flow"', timestamp: '14:32:20' },
      { id: 6, type: 'info', text: 'Awaiting next instruction...', timestamp: '14:32:21' }
    ],
    'antigravity-cli': [
      { id: 1, type: 'info', text: 'Antigravity CLI daemon initialised. Model: gemini-1.5-pro-latest', timestamp: '14:30:10' },
      { id: 2, type: 'command', text: 'antigravity audit --security', timestamp: '14:30:22' },
      { id: 3, type: 'warning', text: 'Warning: 3 packages in node_modules have known vulnerabilities.', timestamp: '14:30:25' },
      { id: 4, type: 'info', text: 'Scanning local repository for hardcoded secrets...', timestamp: '14:30:26' },
      { id: 5, type: 'success', text: 'Audit complete. Zero secrets found in repository source.', timestamp: '14:30:30' }
    ],
    'codex-cli': [
      { id: 1, type: 'info', text: 'Codex API Client initialized.', timestamp: '11:15:00' },
      { id: 2, type: 'success', text: 'Connection verified with model: gpt-4o-mini', timestamp: '11:15:01' },
      { id: 3, type: 'info', text: 'System state: Idle. Standing by.', timestamp: '11:15:02' }
    ],
    'npm-server': [
      { id: 1, type: 'info', text: 'NPM Task Environment initialized.', timestamp: '12:00:00' },
      { id: 2, type: 'info', text: 'Ready to run `npm run dev`, `npm install`, or start servers.', timestamp: '12:00:01' }
    ],
    'dotnet-env': [
      { id: 1, type: 'info', text: '.NET Task Environment initialized.', timestamp: '12:00:00' },
      { id: 2, type: 'info', text: 'Ready to run `dotnet build`, `dotnet run`, or package commands.', timestamp: '12:00:01' }
    ]
  });

  const [selectedAgentId, setSelectedAgentId] = useState('claude-code');

  // Real PTY terminal: workspace path, CLI availability, and a ref to the active xterm view.
  const [workspace, setWorkspace] = useState(() => {
    const saved = localStorage.getItem('wefer_recent_workspaces');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].path;
      }
    } catch {
      /* ignore */
    }
    return '';
  });
  const [cliAvail, setCliAvail] = useState({});

  // Customize Workspace States
  const [terminalFontSize, setTerminalFontSize] = useState(() => {
    const saved = localStorage.getItem('wefer_terminal_font_size');
    return saved ? Number(saved) : 13;
  });

  const [terminalFontFamily, setTerminalFontFamily] = useState(() => {
    const saved = localStorage.getItem('wefer_terminal_font_family');
    return saved || 'Fira Code';
  });

  const [terminalTheme, setTerminalTheme] = useState(() => {
    const saved = localStorage.getItem('wefer_terminal_theme');
    return saved || 'dark-teal';
  });

  // Drag and Drop Grid Slots States
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [draggedWsId, setDraggedWsId] = useState(null);

  // Sidebar & Dashboard collapsing states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);

  // Auto-collapse based on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1100) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
      if (width < 1300) {
        setIsDashboardCollapsed(true);
      } else {
        setIsDashboardCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // check on mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Multi-workspace management states
  const [workspaces, setWorkspaces] = useState(() => {
    const saved = localStorage.getItem('wefer_recent_workspaces');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    const saved = localStorage.getItem('wefer_recent_workspaces');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch {
      /* ignore */
    }
    return '';
  });

  // Track which workspaces have been activated at least once so we only mount
  // their terminal grids after the user visits them (lazy init).
  const [visitedWorkspaces, setVisitedWorkspaces] = useState(() => {
    const saved = localStorage.getItem('wefer_recent_workspaces');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return new Set([parsed[0].id]);
      }
    } catch {
      /* ignore */
    }
    return new Set();
  });

  // Workspace Switcher Dropdown visibility
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const wsDropdownRef = useRef(null);

  // Click outside listener for Workspace Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(event.target)) {
        setIsWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Per-workspace grid slots and shell preferences.
  // Shape: { [wsId]: string[] } and { [wsId]: { [agentId]: 'cmd'|'powershell' } }
  const [gridSlotsByWs, setGridSlotsByWs] = useState(() => {
    const saved = localStorage.getItem('wefer_recent_workspaces');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const slots = {};
          parsed.forEach(ws => {
            slots[ws.id] = [...DEFAULT_GRID_SLOTS];
          });
          return slots;
        }
      }
    } catch {
      /* ignore */
    }
    return {};
  });

  const [agentShellsByWs, setAgentShellsByWs] = useState(() => {
    const saved = localStorage.getItem('wefer_recent_workspaces');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const shells = {};
          parsed.forEach(ws => {
            shells[ws.id] = {};
          });
          return shells;
        }
      }
    } catch {
      /* ignore */
    }
    return {};
  });

  const slotsOf = (wsId) => gridSlotsByWs[wsId] ?? DEFAULT_GRID_SLOTS;
  const shellOfWs = (wsId, agentId) => agentShellsByWs[wsId]?.[agentId] ?? 'cmd';
  const swapShellWs = (wsId, agentId) => setAgentShellsByWs(prev => ({
    ...prev,
    [wsId]: { ...(prev[wsId] ?? {}), [agentId]: (prev[wsId]?.[agentId] ?? 'cmd') === 'cmd' ? 'powershell' : 'cmd' },
  }));

  const selectAndLaunchWorkspace = (ws) => {
    // Kill old sessions if we are switching from a different workspace
    if (activeWorkspaceId && activeWorkspaceId !== ws.id) {
      const oldSlots = gridSlotsByWs[activeWorkspaceId] ?? DEFAULT_GRID_SLOTS;
      oldSlots.forEach(agentId => {
        if (window.electronAPI) {
          window.electronAPI.killSession(`${activeWorkspaceId}:${agentId}`);
        }
      });
      // Clear live outputs for the closed sessions to reclaim memory
      setLiveTerminalOutputs(prev => {
        const next = { ...prev };
        oldSlots.forEach(agentId => {
          delete next[`${activeWorkspaceId}:${agentId}`];
        });
        return next;
      });
    }

    setWorkspace(ws.path);
    setActiveWorkspaceId(ws.id);
    setVisitedWorkspaces(prev => new Set([...prev, ws.id]));
    setIsWsDropdownOpen(false);

    if (window.electronAPI) {
      window.electronAPI.setWorkspace(ws.path);
    }

    // Save/Rearrange workspaces to place the chosen one at the top of the history
    setWorkspaces(prev => {
      const filtered = prev.filter(w => w.id !== ws.id);
      const updated = [ws, ...filtered].slice(0, 5);
      localStorage.setItem('wefer_recent_workspaces', JSON.stringify(updated));
      return updated;
    });

    setActiveTab('terminal');
  };

  const handleAddWorkspace = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.chooseWorkspace();
    if (!result.canceled) {
      const path = result.path;
      // Prevent duplicate workspace paths
      const exists = workspaces.find(ws => ws.path === path);
      if (exists) {
        selectAndLaunchWorkspace(exists);
        return;
      }
      const name = path.split(/[\\/]/).pop() || path;
      const newWs = { id: `ws-${getTimestampId()}`, name, path };
      
      // Initialize slots before selecting
      setGridSlotsByWs(prev => ({ ...prev, [newWs.id]: [...DEFAULT_GRID_SLOTS] }));
      setAgentShellsByWs(prev => ({ ...prev, [newWs.id]: {} }));
      
      selectAndLaunchWorkspace(newWs);
    }
  };

  // Remove a workspace and kill all its PTY sessions.
  const handleRemoveWorkspace = (wsId, e) => {
    if (e) e.stopPropagation();
    // Kill each session for this workspace before removing.
    const slots = gridSlotsByWs[wsId] ?? DEFAULT_GRID_SLOTS;
    slots.forEach(agentId => {
      window.electronAPI?.killSession(`${wsId}:${agentId}`);
    });
    
    const remaining = workspaces.filter(w => w.id !== wsId);
    setWorkspaces(remaining);
    localStorage.setItem('wefer_recent_workspaces', JSON.stringify(remaining));

    setVisitedWorkspaces(prev => { const s = new Set(prev); s.delete(wsId); return s; });
    setGridSlotsByWs(prev => { const n = { ...prev }; delete n[wsId]; return n; });
    setAgentShellsByWs(prev => { const n = { ...prev }; delete n[wsId]; return n; });
    
    if (activeWorkspaceId === wsId) {
      if (remaining.length > 0) {
        selectAndLaunchWorkspace(remaining[0]);
      } else {
        setActiveWorkspaceId('');
        setWorkspace('');
      }
    }
  };

  // Add a new terminal slot to the dynamic grid (up to 6)
  const handleAddTerminalSlot = (wsId) => {
    setGridSlotsByWs(prev => {
      const currentSlots = prev[wsId] ?? [...DEFAULT_GRID_SLOTS];
      if (currentSlots.length >= 6) {
        alert("สามารถเพิ่มช่อง Terminal ได้สูงสุด 6 ช่องค่ะ!");
        return prev;
      }
      // Add first available or default to claude-code
      const newSlots = [...currentSlots, 'claude-code'];
      return { ...prev, [wsId]: newSlots };
    });
  };

  // Remove terminal slot at specific index and kill session
  const handleKillTerminalSlot = (wsId, index) => {
    setGridSlotsByWs(prev => {
      const currentSlots = prev[wsId] ?? [...DEFAULT_GRID_SLOTS];
      if (currentSlots.length <= 1) {
        alert("ต้องมีอย่างน้อย 1 ช่อง Terminal นะคะ!");
        return prev;
      }
      const agentId = currentSlots[index];
      if (window.electronAPI) {
        window.electronAPI.killSession(`${wsId}:${agentId}`);
      }
      
      const newSlots = currentSlots.filter((_, i) => i !== index);
      return { ...prev, [wsId]: newSlots };
    });
  };

  // Swap slots position in grid layout
  const swapTerminalSlots = (wsId, indexA, indexB) => {
    if (indexA === indexB) return;
    setGridSlotsByWs(prev => {
      const slots = [...(prev[wsId] ?? DEFAULT_GRID_SLOTS)];
      const temp = slots[indexA];
      slots[indexA] = slots[indexB];
      slots[indexB] = temp;
      return { ...prev, [wsId]: slots };
    });
    setDraggedIndex(null);
    setDraggedWsId(null);
  };

  // Grid terminal layout states
  // eslint-disable-next-line no-unused-vars
  const [terminalLayout, setTerminalLayout] = useState('single');
  // gridTerminalRefs keyed by sessionId (`${wsId}:${agentId}`) so each workspace's
  // terminals are independently addressable for clear/resize.
  const gridTerminalRefs = useRef({});

  // Live retrieved output from PTY sessions, keyed by sessionId (`${wsId}:${agentId}`).
  const [liveTerminalOutputs, setLiveTerminalOutputs] = useState({});

  useEffect(() => {
    if (!window.electronAPI) return;
    const offData = window.electronAPI.onPtyData(({ sessionId, data }) => {
      // Clean up ANSI escape codes
      const cleanPattern = "[" + String.fromCharCode(27) + String.fromCharCode(155) + "][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]";
      const cleanData = data.replace(new RegExp(cleanPattern, 'g'), '');
      if (cleanData.trim()) {
        setLiveTerminalOutputs(prev => ({
          ...prev,
          [sessionId]: cleanData.trim().split('\n').filter(line => line.trim()).pop() || prev[sessionId]
        }));
      }
    });
    return () => offData();
  }, []);

  // Central command execution helper. sessionId = `${wsId}:${agentId}`.
  const executePtyCommand = (agentId, sessionId, cmdText) => {
    if (!cmdText.trim()) return;

    // Set working status, increment tasksRun count
    setAgents(prev => prev.map(a => a.id === agentId ? {
      ...a,
      status: 'working',
      tasksRun: a.tasksRun + 1,
      lastActive: 'Just now'
    } : a));

    // Update global system commands count
    setSystemStats(prev => ({
      ...prev,
      commandsCount: prev.commandsCount + 1
    }));

    if (window.electronAPI) {
      window.electronAPI.sendInput(sessionId, cmdText + '\r');
    }
  };

  useEffect(() => {
    if (!window.electronAPI) return;
    
    if (workspaces.length > 0) {
      // Sync initial active workspace to Electron process CWD
      const activeWs = workspaces[0];
      window.electronAPI.setWorkspace(activeWs.path);
    } else {
      // Auto-create a default workspace from the system home dir if no history exists
      window.electronAPI.getWorkspace().then(({ path }) => {
        setWorkspace(path);
        const name = path.split(/[\\/]/).pop() || path;
        const defaultWs = { id: 'ws-default', name, path };
        setWorkspaces([defaultWs]);
        setGridSlotsByWs({ 'ws-default': [...DEFAULT_GRID_SLOTS] });
        setAgentShellsByWs({ 'ws-default': {} });
        setActiveWorkspaceId('ws-default');
        setVisitedWorkspaces(new Set(['ws-default']));
        localStorage.setItem('wefer_recent_workspaces', JSON.stringify([defaultWs]));
      });
    }
    
    window.electronAPI.checkCliAvailability().then(setCliAvail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect a Session's live state on its Agent card (busy is per-agent).
  const handleSessionStatus = (agentId, status) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status } : a));
  };



  // Handle active simulation task runs
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);
  const simTimeoutRef = useRef(null);

  // New Agent Form state
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPlatform, setNewAgentPlatform] = useState('Anthropic CLI');
  const [newAgentContext, setNewAgentContext] = useState(128000);
  const [newAgentModel, setNewAgentModel] = useState('claude-3-5-sonnet');
  const [newAgentRpm, setNewAgentRpm] = useState(50);

  const handleCreateAgent = (e) => {
    e.preventDefault();
    if (!newAgentName) return;

    const id = newAgentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newAgent = {
      id,
      name: newAgentName,
      platform: newAgentPlatform,
      status: 'idle',
      rpm: newAgentRpm,
      tpm: newAgentRpm * 1500,
      contextLimit: Number(newAgentContext),
      contextUsed: 0,
      totalTokens: 0,
      tasksRun: 0,
      apiKeySet: true,
      lastActive: 'Created just now'
    };

    setAgents([...agents, newAgent]);
    setAgentLogs({
      ...agentLogs,
      [id]: [
        { id: 1, type: 'info', text: `Agent ${newAgentName} registered successfully.`, timestamp: new Date().toLocaleTimeString() },
        { id: 2, type: 'success', text: `Platform ${newAgentPlatform} connected. Model selected: ${newAgentModel}`, timestamp: new Date().toLocaleTimeString() }
      ]
    });

    setNewAgentName('');
    setNewAgentContext(128000);
    setNewAgentRpm(50);
    setActiveTab('dashboard');
  };

  const handleDeleteAgent = (id, e) => {
    e.stopPropagation();
    if (agents.length <= 1) {
      alert("You need at least one agent profile in the orchestrator!");
      return;
    }
    setAgents(agents.filter(a => a.id !== id));
    if (selectedAgentId === id) {
      const firstLeft = agents.find(a => a.id !== id);
      setSelectedAgentId(firstLeft.id);
    }
  };

  // Helper to switch agent and IMMEDIATELY trigger the startup command for that platform daemon
  const selectAndLaunchAgent = (id) => {
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    setIsRunningSimulation(false);
    
    setSelectedAgentId(id);
    setActiveTab('terminal');
    
    // Formulate daemon run startup commands
    let startupCmd = '';
    if (id === 'claude-code') {
      startupCmd = 'claude start';
    } else if (id === 'antigravity-cli') {
      startupCmd = 'antigravity init --provider=gemini';
    } else if (id === 'codex-cli') {
      startupCmd = 'codex-cli connect';
    } else {
      startupCmd = `${id} init --run-daemon`;
    }

    // Proactively run the command in the terminal
    setTimeout(() => {
      runTerminalCommand(startupCmd);
    }, 100);
  };

  // Simulate terminal command execution
  const runTerminalCommand = (cmdText) => {
    if (!cmdText.trim()) return;

    const now = new Date();
    const timestampStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Add command line to current agent
    const newCommandLog = {
      id: getTimestampId(),
      type: 'command',
      text: cmdText,
      timestamp: timestampStr
    };

    setAgentLogs(prev => ({
      ...prev,
      [selectedAgentId]: [...(prev[selectedAgentId] || []), newCommandLog]
    }));

    const cleanCmd = cmdText.trim().toLowerCase();
    setIsRunningSimulation(true);
    
    // Update Agent status to working
    setAgents(prev => prev.map(a => a.id === selectedAgentId ? { ...a, status: 'working' } : a));

    // Simulation steps generator
    let steps = [];

    // CLI Startup Daemons (Launch/Connect) Simulation
    if (cleanCmd === 'claude start') {
      steps = [
        { type: 'info', text: 'Spawning Claude Code CLI process...' },
        { type: 'info', text: 'Workspace directory bound: D:/dev_test/wefer_term' },
        { type: 'info', text: 'Authenticating with Anthropic API key...' },
        { type: 'success', text: 'Claude Code daemon fully active. Listening on localhost TCP port 4880.' }
      ];
    } else if (cleanCmd === 'antigravity init --provider=gemini') {
      steps = [
        { type: 'info', text: 'Launching Antigravity CLI orchestrator v2.0...' },
        { type: 'info', text: 'Connecting local workspace to Google Gemini API...' },
        { type: 'info', text: 'Indexing files: 45 files mapped to workspace context.' },
        { type: 'success', text: 'Antigravity local agent activated. Standing by for input.' }
      ];
    } else if (cleanCmd === 'codex-cli connect') {
      steps = [
        { type: 'info', text: 'Handshaking with OpenAI Codex endpoints...' },
        { type: 'info', text: 'Configuration loaded: model=gpt-4o-mini' },
        { type: 'success', text: 'Codex CLI connection established successfully. Secure tunnel open.' }
      ];
    } else if (cleanCmd.endsWith('init --run-daemon')) {
      steps = [
        { type: 'info', text: 'Spawning custom agent plugin process...' },
        { type: 'success', text: 'Plugin active. Hooked CLI daemon socket.' }
      ];
    }
    // Workspace commands
    else if (cleanCmd.includes('audit') || cleanCmd.includes('check')) {
      steps = [
        { type: 'info', text: 'Scanning local workspace: D:/dev_test/wefer_term...' },
        { type: 'info', text: 'Ingesting codebase index...' },
        { type: 'warning', text: 'Warning: 2 files failed strict TypeScript type-checking (src/utils/crypto.ts)' },
        { type: 'success', text: 'Audit finalized. Clean codebase report generated. Total tokens processed: 4,520.' }
      ];
    } else if (cleanCmd.includes('test') || cleanCmd.includes('run')) {
      steps = [
        { type: 'info', text: 'Executing test runner: npm run test' },
        { type: 'info', text: '✓ auth.spec.js - Passed' },
        { type: 'info', text: '✓ database.spec.js - Passed' },
        { type: 'success', text: 'All tests passed. System status returns Green (0).' }
      ];
    } else if (cleanCmd.includes('commit')) {
      steps = [
        { type: 'info', text: 'git status' },
        { type: 'info', text: 'Detected 2 changed files: src/auth/helper.js, src/auth/route.js' },
        { type: 'info', text: 'Generating smart commit description...' },
        { type: 'success', text: 'Successfully generated commit: "refactor(auth): simplify JWT validation flow"' }
      ];
    } else if (cleanCmd.includes('refactor')) {
      steps = [
        { type: 'info', text: 'Analyzing code architecture pattern...' },
        { type: 'info', text: 'Suggested modification: Extract validation middleware' },
        { type: 'success', text: 'Refactored file successfully.' }
      ];
    } else if (cleanCmd.includes('doctor')) {
      steps = [
        { type: 'info', text: 'Running environment checks...' },
        { type: 'info', text: 'Node: v22.11.0 | Platform: win32 | Electron: v41.7.1' },
        { type: 'success', text: 'All CLI connections are responsive and functional.' }
      ];
    } else if (cleanCmd.includes('doc')) {
      steps = [
        { type: 'info', text: 'Analyzing file modules...' },
        { type: 'info', text: 'Writing output: docs/API_SPEC.md' },
        { type: 'success', text: 'Documentation generation complete.' }
      ];
    } else if (cleanCmd.includes('explain')) {
      steps = [
        { type: 'info', text: 'Loading code content...' },
        { type: 'info', text: 'Parsing AST representation...' },
        { type: 'success', text: 'File explained: Handles main Electron IPC and browser window creation.' }
      ];
    } else if (cleanCmd.includes('boilerplate')) {
      steps = [
        { type: 'info', text: 'Scaffolding template structure...' },
        { type: 'success', text: 'Successfully created boilerplate directories.' }
      ];
    } else if (cleanCmd.startsWith('help')) {
      steps = [
        { type: 'info', text: 'AI Agent Console Commands:' },
        { type: 'info', text: '  audit            Run static analysis on workspace' },
        { type: 'info', text: '  run test         Execute workspace test suites' },
        { type: 'info', text: '  generate <task>  Spawn new sub-task for code generation' },
        { type: 'info', text: '  clear            Clear terminal history logs' },
        { type: 'info', text: '  status           Report active agent limit & context details' }
      ];
    } else if (cleanCmd === 'clear') {
      setIsRunningSimulation(false);
      setAgentLogs(prev => ({
        ...prev,
        [selectedAgentId]: []
      }));
      setAgents(prev => prev.map(a => a.id === selectedAgentId ? { ...a, status: 'idle' } : a));
      return;
    } else if (cleanCmd.startsWith('status')) {
      const activeAgentObj = agents.find(a => a.id === selectedAgentId);
      steps = [
        { type: 'info', text: `Agent Name   : ${activeAgentObj.name}` },
        { type: 'info', text: `Platform     : ${activeAgentObj.platform}` },
        { type: 'info', text: `Context Cap  : ${activeAgentObj.contextLimit.toLocaleString()} tokens` },
        { type: 'info', text: `Used Context : ${activeAgentObj.contextUsed.toLocaleString()} tokens (${Math.round((activeAgentObj.contextUsed / activeAgentObj.contextLimit) * 100)}%)` },
        { type: 'info', text: `Limit Specs  : ${activeAgentObj.rpm} RPM, ${activeAgentObj.tpm.toLocaleString()} TPM` },
        { type: 'success', text: 'Status check complete.' }
      ];
    } else {
      steps = [
        { type: 'info', text: 'Initializing task analyzer...' },
        { type: 'info', text: 'Processing...' },
        { type: 'success', text: 'Code generation completed.' },
        { type: 'success', text: 'Successfully applied code patches to local directory.' }
      ];
    }

    // Process simulation step-by-step
    let currentStep = 0;
    const runNextStep = () => {
      if (currentStep >= steps.length) {
        setIsRunningSimulation(false);
        setAgents(prev => prev.map(a => {
          if (a.id === selectedAgentId) {
            return { ...a, status: 'idle', tasksRun: a.tasksRun + 1 };
          }
          return a;
        }));
        
        // Add global system commands count update
        setSystemStats(prev => ({
          ...prev,
          commandsCount: prev.commandsCount + 1
        }));
        return;
      }

      const step = steps[currentStep];
      const stepTime = new Date();
      const stepTimeStr = `${String(stepTime.getHours()).padStart(2, '0')}:${String(stepTime.getMinutes()).padStart(2, '0')}:${String(stepTime.getSeconds()).padStart(2, '0')}`;
      
      setAgentLogs(prev => ({
        ...prev,
        [selectedAgentId]: [
          ...(prev[selectedAgentId] || []),
          {
            id: Date.now() + currentStep,
            type: step.type,
            text: step.text,
            timestamp: stepTimeStr
          }
        ]
      }));

      currentStep++;
      simTimeoutRef.current = setTimeout(runNextStep, 1000 + Math.random() * 800);
    };

    simTimeoutRef.current = setTimeout(runNextStep, 800);
  };

  useEffect(() => {
    return () => {
      if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    };
  }, []);

  const triggerTaskShortcut = (taskPrompt) => {
    setActiveTab('terminal');
    runTerminalCommand(taskPrompt);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Custom Title Bar */}
      <div className="titlebar">
        <div className="titlebar-logo">
          <Cpu size={16} />
          <span>Wefer AI Orchestrator</span>
        </div>
        <div className="titlebar-title">Local Daemon CLI Manager</div>
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize}>
            <Minimize2 size={12} />
          </button>
          <button className="titlebar-btn" onClick={handleMaximize}>
            <Maximize2 size={12} />
          </button>
          <button className="titlebar-btn close" onClick={handleClose}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="app-container">
        
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-top" style={{ width: '100%' }}>
            <div className="sidebar-brand" style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: isSidebarCollapsed ? 'center' : 'stretch',
              position: 'relative',
              width: '100%',
              padding: isSidebarCollapsed ? '16px 0' : '16px 16px'
            }}>
              {!isSidebarCollapsed ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div className="sidebar-brand-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} className="text-mint" style={{ color: 'var(--accent-mint)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 'bold' }}>Wefer Panel</span>
                    </div>
                    <button 
                      className="sidebar-toggler-hamberger"
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      title="Collapse Sidebar"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-mint)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                    >
                      <Menu size={16} />
                    </button>
                  </div>
                  <div className="sidebar-brand-sub" style={{ marginTop: '2px', paddingLeft: '26px' }}>AI ORCHESTRATION HUB</div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <button 
                    className="sidebar-toggler-hamberger wefer-tooltip tooltip-right"
                    data-tooltip="Expand Sidebar"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-mint)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Menu size={18} />
                  </button>
                  <div 
                    className="wefer-tooltip tooltip-right" 
                    data-tooltip="Local System Time"
                    style={{ 
                      fontSize: '10px', 
                      color: 'var(--accent-mint)', 
                      fontWeight: 'bold', 
                      fontFamily: 'var(--font-mono)', 
                      background: 'rgba(10, 147, 150, 0.15)', 
                      border: '1px solid rgba(10, 147, 150, 0.3)',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      textAlign: 'center',
                      cursor: 'default'
                    }}
                  >
                    {timeStr.slice(0, 5)}
                  </div>
                </div>
              )}
            </div>

            <nav className="nav-group">
              <div 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''} ${isSidebarCollapsed ? 'wefer-tooltip tooltip-right' : ''}`}
                data-tooltip={isSidebarCollapsed ? "Dashboard Matrix" : undefined}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={16} />
                {!isSidebarCollapsed && <span>Dashboard Matrix</span>}
              </div>
              
              <div 
                className={`nav-item ${activeTab === 'agents' ? 'active' : ''} ${isSidebarCollapsed ? 'wefer-tooltip tooltip-right' : ''}`}
                data-tooltip={isSidebarCollapsed ? "Agent Profiles" : undefined}
                onClick={() => setActiveTab('agents')}
              >
                <Code2 size={16} />
                {!isSidebarCollapsed && <span>Agent Profiles</span>}
              </div>

              <div 
                className={`nav-item ${activeTab === 'customization' ? 'active' : ''} ${isSidebarCollapsed ? 'wefer-tooltip tooltip-right' : ''}`}
                data-tooltip={isSidebarCollapsed ? "Workspace Customization" : undefined}
                onClick={() => setActiveTab('customization')}
              >
                <Sliders size={16} />
                {!isSidebarCollapsed && <span>Workspace Customization</span>}
              </div>

              <div
                className={`nav-item ${activeTab === 'terminal' ? 'active' : ''} ${isSidebarCollapsed ? 'wefer-tooltip tooltip-right' : ''}`}
                data-tooltip={isSidebarCollapsed ? "Terminal Workspace" : undefined}
                onClick={() => setActiveTab('terminal')}
              >
                <Terminal size={16} />
                {!isSidebarCollapsed && <span>Terminal Workspace</span>}
              </div>

              <div
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''} ${isSidebarCollapsed ? 'wefer-tooltip tooltip-right' : ''}`}
                data-tooltip={isSidebarCollapsed ? "Application Settings" : undefined}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={16} />
                {!isSidebarCollapsed && <span>Settings</span>}
              </div>
            </nav>

            {/* WORKSPACES SECTION */}
            <div style={{ marginTop: '24px', width: '100%' }}>
              {!isSidebarCollapsed ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px 8px', borderBottom: '1px solid rgba(10, 147, 150, 0.15)', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Workspaces
                  </span>
                  <button 
                    className="btn secondary" 
                    style={{ padding: '2px 6px', height: '18px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(148, 210, 189, 0.15)', border: '1px solid rgba(148, 210, 189, 0.3)', color: 'var(--accent-mint)' }}
                    onClick={handleAddWorkspace}
                    title="Add local directory as workspace"
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>
              ) : (
                <div style={{ borderBottom: '1px solid rgba(10, 147, 150, 0.15)', marginBottom: '10px' }}></div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {workspaces.map(ws => (
                  <div 
                    key={ws.id}
                    className={`nav-item ${activeWorkspaceId === ws.id && activeTab === 'terminal' && terminalLayout === 'grid' ? 'active' : ''} ${isSidebarCollapsed ? 'wefer-tooltip tooltip-right' : ''}`}
                    data-tooltip={isSidebarCollapsed ? ws.name : undefined}
                    style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => selectAndLaunchWorkspace(ws)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      <FolderOpen size={14} style={{ color: activeWorkspaceId === ws.id ? 'var(--accent-mint)' : 'var(--text-secondary)' }} />
                      {!isSidebarCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.name}</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <button
                        className="btn danger"
                        style={{ flexShrink: 0, padding: '2px 5px', height: '18px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center' }}
                        onClick={(e) => handleRemoveWorkspace(ws.id, e)}
                        title={`Remove workspace "${ws.name}"`}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
                {workspaces.length === 0 && !isSidebarCollapsed && (
                  <div style={{ padding: '8px 14px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No workspaces. Click Add.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sidebar-footer" style={{ width: '100%', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
            {/* Clock Widget */}
            {!isSidebarCollapsed && (
              <div className="digital-clock-container">
                <div className="digital-clock-label">Local System Time</div>
                <div className="digital-clock">
                  {timeStr}
                </div>
              </div>
            )}
            
            {/* Tiny Core Status */}
            {!isSidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={10} /> Online
                </span>
                <span>v1.0.0</span>
              </div>
            )}

          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          
          {/* Header */}
          <header className="page-header">
            <div className="page-title-group">
              <h1>
                {activeTab === 'dashboard' && 'Operations Dashboard'}
                {activeTab === 'agents' && 'Configure AI Agents'}
                {activeTab === 'terminal' && 'Terminal Task Console'}
                {activeTab === 'settings' && 'Application Settings'}
              </h1>
              <p>
                {activeTab === 'dashboard' && 'Overview of active agents, context memory capacity, and CLI task metrics.'}
                {activeTab === 'agents' && 'Configure presets and custom local agents for Multi-platform.'}
                {activeTab === 'terminal' && 'Live action logs, command trigger inputs, and CLI output streams.'}
                {activeTab === 'settings' && 'Manage application-level preferences — performance, window behavior, and workspace persistence.'}
              </p>
            </div>
            
            <div className="header-status">
              {/* Workspace Switcher Dropdown */}
              <div className="workspace-switcher-container" ref={wsDropdownRef}>
                <div 
                  className="workspace-switcher-trigger"
                  onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
                  title="Switch or add local workspace"
                >
                  <FolderOpen size={13} style={{ color: 'var(--accent-mint)' }} />
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {workspace ? workspace.split(/[\\/]/).pop() : 'Select Workspace'}
                  </span>
                  <span style={{ fontSize: '9px', opacity: 0.6 }}>▼</span>
                </div>

                {isWsDropdownOpen && (
                  <div className="workspace-switcher-dropdown">
                    <div className="dropdown-header">Active Workspace</div>
                    {workspaces.find(w => w.id === activeWorkspaceId) ? (
                      <div className="dropdown-item active">
                        <div className="dropdown-item-details">
                          <div className="dropdown-item-header">
                            <span className="status-dot active" style={{ width: '6px', height: '6px', margin: 0 }}></span>
                            <span className="dropdown-item-name">{workspaces.find(w => w.id === activeWorkspaceId).name}</span>
                          </div>
                          <span className="dropdown-item-path" title={workspace}>{workspace}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '8px 14px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No active workspace bound.
                      </div>
                    )}

                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-header">Recent Workspaces</div>
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      {workspaces.filter(w => w.id !== activeWorkspaceId).map(ws => (
                        <div 
                          key={ws.id}
                          className="dropdown-item"
                          onClick={() => selectAndLaunchWorkspace(ws)}
                        >
                          <div className="dropdown-item-details">
                            <span className="dropdown-item-name">{ws.name}</span>
                            <span className="dropdown-item-path" title={ws.path}>{ws.path}</span>
                          </div>
                          <button
                            className="dropdown-item-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveWorkspace(ws.id);
                            }}
                            title={`Remove from history`}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {workspaces.filter(w => w.id !== activeWorkspaceId).length === 0 && (
                        <div style={{ padding: '8px 14px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No other recent history.
                        </div>
                      )}
                    </div>

                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-action-btn"
                      onClick={handleAddWorkspace}
                    >
                      <Plus size={12} />
                      <span>Add Workspace...</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="status-badge">
                <Activity size={13} className="text-secondary" style={{ color: 'var(--accent-cyan)' }} />
                <span>System CPU: {systemStats.cpu}%</span>
              </div>
              <div className="status-badge">
                <Database size={13} className="text-secondary" style={{ color: 'var(--accent-mint)' }} />
                <span>RAM: {systemStats.memory} GB</span>
              </div>
              <div className="status-badge">
                <span className="status-dot active"></span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Orchestrator Active</span>
              </div>
            </div>
          </header>

          {/* Page Body Scroll Container */}
          <div className="page-body">
            
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Welcome & Mascot Card */}
                <div className="section-card welcome-mascot-card" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'center', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(0, 30, 41, 0.9) 0%, rgba(0, 45, 61, 0.9) 100%)', border: '1px solid rgba(148, 210, 189, 0.25)', position: 'relative', overflow: 'hidden' }}>
                  {/* Subtle Background Glows */}
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'var(--accent-mint)', opacity: '0.05', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
                  <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '150px', height: '150px', borderRadius: '50%', background: 'var(--accent-cyan)', opacity: '0.05', filter: 'blur(30px)', pointerEvents: 'none' }}></div>
                  
                  <div style={{ zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span className="status-badge" style={{ background: 'rgba(148, 210, 189, 0.1)', color: 'var(--accent-mint)', border: '1px solid rgba(148, 210, 189, 0.2)', padding: '4px 10px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ☕ AI Cafe Mascot Active
                      </span>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '10px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Wefer AI Cafe Orchestrator</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                      ยินดีต้อนรับสู่ระบบสั่งการ AI CLI คาเฟ่ค่ะ! มาสคอตบาริสต้า Chibi สุดน่ารักกำลังรันกระบวนการของแต่ละ CLI อยู่เบื้องหลังอย่างขยันขันแข็งเลยนะคะ~
                    </p>
                    
                    {/* Process steps display */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-orange)' }}>
                        <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', width: '90px', display: 'inline-block' }}>Claude Code:</span>
                        <span style={{ color: 'var(--text-primary)' }}>Read Context → Plan Step → Refactor → Verify</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-mint)' }}>
                        <span style={{ color: 'var(--accent-mint)', fontWeight: 'bold', width: '90px', display: 'inline-block' }}>Gemini CLI:</span>
                        <span style={{ color: 'var(--text-primary)' }}>Massive Ingestion → Parallel Analysis → Run CLI</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-gold)' }}>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', width: '90px', display: 'inline-block' }}>Codex CLI:</span>
                        <span style={{ color: 'var(--text-primary)' }}>Prompt Parse → Boilerplate Gen → Execute</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1, height: '100%', minHeight: '220px' }}>
                    <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(148, 210, 189, 0.2)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                      <img 
                        src={aiCafeMascot} 
                        alt="AI Cafe Mascot Barista" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="dashboard-grid">
                  <div className="metric-card cyan">
                    <div className="metric-header">
                      <span className="metric-title">CLI Tasks Run</span>
                      <Terminal size={16} style={{ color: 'var(--accent-cyan)' }} />
                    </div>
                    <div className="metric-value">{systemStats.commandsCount} operations</div>
                    <div className="metric-subtext">
                      <span>Daemon Tunnel: Active</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: '100%', background: 'var(--accent-cyan)' }}
                      ></div>
                    </div>
                  </div>

                  <div className="metric-card mint">
                    <div className="metric-header">
                      <span className="metric-title">Active AI Agents</span>
                      <Cpu size={16} style={{ color: 'var(--accent-mint)' }} />
                    </div>
                    <div className="metric-value">
                      {agents.filter(a => a.status === 'working').length} / {agents.length}
                    </div>
                    <div className="metric-subtext">
                      <span style={{ color: 'var(--accent-mint)' }}>● {agents.filter(a => a.status === 'working').length} running</span>
                      <span style={{ marginLeft: '8px' }}>○ {agents.filter(a => a.status === 'idle').length} idle</span>
                    </div>
                  </div>

                  <div className="metric-card gold">
                    <div className="metric-header">
                      <span className="metric-title">Gemini Context Memory</span>
                      <Zap size={16} style={{ color: 'var(--accent-mint)' }} />
                    </div>
                    <div className="metric-value">
                      {Math.round((agents.find(a => a.id === 'antigravity-cli')?.contextUsed || 0) / 1000)}k / 1,000k
                    </div>
                    <div className="metric-subtext">
                      <span>Max limit: 1M Tokens (Gemini 1.5 Pro)</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${((agents.find(a => a.id === 'antigravity-cli')?.contextUsed || 0) / 1000000) * 100}%`, 
                          background: 'var(--accent-mint)' 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="metric-card orange">
                    <div className="metric-header">
                      <span className="metric-title">Claude Code Context</span>
                      <Code2 size={16} style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <div className="metric-value">
                      {Math.round((agents.find(a => a.id === 'claude-code')?.contextUsed || 0) / 1000)}k / 200k
                    </div>
                    <div className="metric-subtext">
                      <span>Used: {Math.round(((agents.find(a => a.id === 'claude-code')?.contextUsed || 0) / 200000) * 100)}% of limit</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${((agents.find(a => a.id === 'claude-code')?.contextUsed || 0) / 200000) * 100}%`, 
                          background: 'var(--accent-gold)' 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Section: Agentic AI Mascots */}
                <div className="section-card">
                  <div className="section-header" style={{ marginBottom: '20px' }}>
                    <h2 className="section-title">
                      <Sparkles size={18} style={{ color: 'var(--accent-mint)' }} />
                      <span>Agentic AI Mascots (Core CLIs)</span>
                    </h2>
                    <button className="btn" onClick={() => setActiveTab('agents')}>
                      <Plus size={14} /> Create Profile
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    {[
                      { id: 'claude-code', mascot: claudeMascot, color: 'var(--accent-orange)' },
                      { id: 'antigravity-cli', mascot: geminiMascot, color: 'var(--accent-mint)' },
                      { id: 'codex-cli', mascot: codexMascot, color: 'var(--accent-gold)' }
                    ].map(({ id, mascot, color }) => {
                      const agent = agents.find(a => a.id === id);
                      if (!agent) return null;
                      
                      return (
                        <div 
                          key={agent.id}
                          className={`agent-card ${selectedAgentId === agent.id ? 'active' : ''}`}
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            padding: '20px', 
                            background: 'rgba(0, 30, 41, 0.4)', 
                            border: `1px solid ${selectedAgentId === agent.id ? color : 'var(--border-color)'}`,
                            borderRadius: '12px',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                          }}
                        >
                          {/* Inner glowing color accent */}
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: color }}></div>
                          
                          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${color}40`, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                              <img src={mascot} alt={`${agent.name} Mascot`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>{agent.name}</h3>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{agent.platform}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className={`status-dot ${agent.status === 'working' ? 'active' : ''}`} style={{ width: '6px', height: '6px' }}></span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{agent.status}</span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tasks Executed</div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: color, fontFamily: 'var(--font-mono)' }}>{agent.tasksRun} runs</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Context Memory</div>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                                {agent.contextLimit > 0 && (
                                  <div style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                                      <span>Context</span>
                                      <span>{(agent.contextUsed / 1000).toFixed(0)}k/{(agent.contextLimit / 1000).toFixed(0)}k</span>
                                    </div>
                                    <div className="progress-bar-container" style={{ height: '3px', margin: 0 }}>
                                      <div 
                                        className="progress-bar" 
                                        style={{ 
                                          width: `${((agent.contextUsed) / agent.contextLimit) * 100}%`, 
                                          background: color 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Retrieved Live Output Display */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#000b0f', border: '1px solid rgba(10, 147, 150, 0.15)', borderRadius: '4px', padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: '9px', minHeight: '30px', maxHeight: '40px', overflow: 'hidden' }}>
                            <div style={{ color: agent.status === 'working' ? color : 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              &gt; {liveTerminalOutputs[`${activeWorkspaceId}:${agent.id}`] || 'Awaiting first command...'}
                            </div>
                          </div>

                          {/* Card Action Buttons */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                            <button 
                              className="btn" 
                              style={{ flex: 1, padding: '6px 12px', fontSize: '11px', justifyContent: 'center', background: color, color: '#001219' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAgentId(agent.id);
                                selectAndLaunchAgent(agent.id);
                                setActiveTab('terminal');
                              }}
                            >
                              <Terminal size={12} />
                              <span>Open Console</span>
                            </button>
                            <button 
                              className="btn danger" 
                              style={{ padding: '6px 10px', borderRadius: '4px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAgent(agent.id, e);
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section: Dev Servers & Environments */}
                <div className="section-card">
                  <div className="section-header" style={{ marginBottom: '16px' }}>
                    <h2 className="section-title">
                      <Cpu size={18} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Active Dev Servers & Environments</span>
                    </h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    {agents.filter(a => a.id === 'npm-server' || a.id === 'dotnet-env' || (!['claude-code', 'antigravity-cli', 'codex-cli', 'npm-server', 'dotnet-env'].includes(a.id))).map((agent) => {
                      const isServer = agent.id === 'npm-server' || agent.id === 'dotnet-env';
                      const color = agent.id === 'npm-server' ? 'var(--accent-cyan)' : 'var(--accent-gold)';
                      
                      return (
                        <div 
                          key={agent.id}
                          className={`agent-card ${selectedAgentId === agent.id ? 'active' : ''}`}
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            padding: '16px', 
                            background: 'rgba(0, 30, 41, 0.3)', 
                            border: `1px solid ${selectedAgentId === agent.id ? color : 'var(--border-color)'}`,
                            borderRadius: '10px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setSelectedAgentId(agent.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>{agent.name}</h3>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Platform: {agent.platform}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className={`status-dot ${agent.status === 'working' ? 'active' : ''}`} style={{ width: '6px', height: '6px' }}></span>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{agent.status}</span>
                            </div>
                          </div>

                          {/* Live Console Output */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#000b0f', border: '1px solid rgba(10, 147, 150, 0.15)', borderRadius: '6px', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px', minHeight: '50px', maxHeight: '70px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Stdout Output Stream
                            </div>
                            <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {liveTerminalOutputs[`${activeWorkspaceId}:${agent.id}`] || 'Awaiting task execution...'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tasks Run: {agent.tasksRun}</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button 
                                className="btn secondary" 
                                style={{ padding: '4px 10px', fontSize: '10px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAgentId(agent.id);
                                  selectAndLaunchAgent(agent.id);
                                  setActiveTab('terminal');
                                }}
                              >
                                <Terminal size={10} />
                                <span>Open Console</span>
                              </button>
                              {!isServer && (
                                <button 
                                  className="btn danger" 
                                  style={{ padding: '4px 8px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAgent(agent.id, e);
                                  }}
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-section: Quick Action Commands */}
                <div className="section-card" style={{ marginBottom: 0 }}>
                  <h2 className="section-title" style={{ marginBottom: '16px' }}>
                    <Play size={18} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Quick Tasks Orchestration Shortcuts</span>
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Click to dispatch automated tasks directly to the active agent ({agents.find(a => a.id === selectedAgentId)?.name}).
                  </p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <button 
                      className="btn secondary" 
                      onClick={() => triggerTaskShortcut('audit --security')}
                      disabled={isRunningSimulation}
                    >
                      <Zap size={13} style={{ color: 'var(--accent-gold)' }} />
                      <span>Security Audit Workspace</span>
                    </button>
                    <button 
                      className="btn secondary" 
                      onClick={() => triggerTaskShortcut('run tests')}
                      disabled={isRunningSimulation}
                    >
                      <CheckCircle2 size={13} style={{ color: 'var(--accent-mint)' }} />
                      <span>Execute Node Test Suites</span>
                    </button>
                    <button 
                      className="btn secondary" 
                      onClick={() => triggerTaskShortcut('status')}
                      disabled={isRunningSimulation}
                    >
                      <Info size={13} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Fetch Agent Capacity Info</span>
                    </button>
                    <button 
                      className="btn secondary" 
                      onClick={() => triggerTaskShortcut('claude commit')}
                      disabled={isRunningSimulation}
                    >
                      <Sparkles size={13} style={{ color: 'var(--accent-mint)' }} />
                      <span>Commit Changed Code</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AGENT PROFILES */}
            {activeTab === 'agents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Agent Provider Selector (Launch Immediately) */}
                <div className="section-card">
                  <h2 className="section-title" style={{ marginBottom: '16px' }}>
                    <Cpu size={18} style={{ color: 'var(--accent-mint)' }} />
                    <span>Launch AI Provider Daemon Immediately</span>
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Select an AI Provider to boot up its local agent CLI environment. Selecting a provider immediately fires its daemon connection startup script in the Terminal.
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {agents.map(p => (
                      <div 
                        key={p.id}
                        className="agent-card"
                        style={{ border: selectedAgentId === p.id ? '1px solid var(--accent-mint)' : '1px solid var(--border-color)', background: selectedAgentId === p.id ? 'rgba(148, 210, 189, 0.05)' : 'rgba(0, 18, 25, 0.4)' }}
                        onClick={() => selectAndLaunchAgent(p.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{p.name}</span>
                          <span className={`agent-status-badge ${p.status}`}>{p.status}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 10px' }}>
                          Platform: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', color: 'var(--accent-cyan)' }}>{p.platform}</code>
                        </div>
                        
                        <button 
                          className="btn" 
                          style={{ width: '100%', justifyContent: 'center', background: selectedAgentId === p.id ? 'var(--accent-mint)' : 'var(--accent-teal)', color: selectedAgentId === p.id ? '#001219' : '#fff' }}
                        >
                          <Zap size={13} />
                          <span>Select & Launch Daemon</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section-card" style={{ maxWidth: '650px', margin: '0 auto', width: '100%' }}>
                  <h2 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
                    <Plus size={20} style={{ color: 'var(--accent-mint)' }} />
                    <span>Create Custom CLI Profile</span>
                  </h2>

                  <form onSubmit={handleCreateAgent}>
                    <div className="form-group">
                      <label className="form-label">Profile / Agent Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Codex Refactor Bot, Claude Dev Tool"
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        required 
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">CLI Target Platform</label>
                        <select 
                          className="form-control"
                          value={newAgentPlatform}
                          onChange={(e) => setNewAgentPlatform(e.target.value)}
                        >
                          <option value="Anthropic CLI">Anthropic CLI (Claude Code)</option>
                          <option value="Google Gemini">Google Gemini (Antigravity CLI)</option>
                          <option value="OpenAI Developer">OpenAI Developer (Codex CLI)</option>
                          <option value="Custom CLI Plugin">Custom CLI Daemon / Plugin</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Assigned Model</label>
                        <select 
                          className="form-control"
                          value={newAgentModel}
                          onChange={(e) => setNewAgentModel(e.target.value)}
                        >
                          <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                          <option value="gemini-1.5-pro">gemini-1.5-pro-latest</option>
                          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                          <option value="gpt-4o">gpt-4o-latest</option>
                          <option value="gpt-4o-mini">gpt-4o-mini</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Context Window Size (Tokens)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={newAgentContext}
                          onChange={(e) => setNewAgentContext(e.target.value)}
                          min={4096}
                          max={2000000}
                          step={1000}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Max Rate Limit (RPM)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={newAgentRpm}
                          onChange={(e) => setNewAgentRpm(e.target.value)}
                          min={1}
                          max={200}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button 
                        type="button" 
                        className="btn secondary"
                        onClick={() => setActiveTab('dashboard')}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn primary"
                      >
                        Create Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: WORKSPACE CUSTOMIZATION */}
            {activeTab === 'customization' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
                <div className="section-card">
                  <h2 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
                    <Sliders size={20} style={{ color: 'var(--accent-mint)' }} />
                    <span>Terminal Style & Theme Customization</span>
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                    {/* Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Font Size</span>
                          <span style={{ color: 'var(--accent-mint)', fontWeight: 'bold' }}>{terminalFontSize}px</span>
                        </label>
                        <input 
                          type="range" 
                          min="11" 
                          max="20" 
                          value={terminalFontSize}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTerminalFontSize(val);
                            localStorage.setItem('wefer_terminal_font_size', val);
                          }}
                          style={{ width: '100%', accentColor: 'var(--accent-mint)', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>11px</span>
                          <span>13px (Default)</span>
                          <span>20px</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Font Family</label>
                        <select 
                          className="form-control"
                          value={terminalFontFamily}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTerminalFontFamily(val);
                            localStorage.setItem('wefer_terminal_font_family', val);
                          }}
                        >
                          <option value="Fira Code">Fira Code (Monospace with ligatures)</option>
                          <option value="Cascadia Mono">Cascadia Mono (Clean sans-serif monospace)</option>
                          <option value="Cascadia Code">Cascadia Code (Cascadia with coding ligatures)</option>
                          <option value="Source Code Pro">Source Code Pro (Clean coding font)</option>
                          <option value="Courier New">Courier New (Classic typewriter style)</option>
                          <option value="Consolas">Consolas (Windows developer font)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Color Theme</label>
                        <select 
                          className="form-control"
                          value={terminalTheme}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTerminalTheme(val);
                            localStorage.setItem('wefer_terminal_theme', val);
                          }}
                        >
                          <option value="dark-teal">Dark Teal (Wefer Default)</option>
                          <option value="obsidian">Obsidian Black (Minimalist matte black)</option>
                          <option value="cyberpunk">Cyberpunk Violet (Vibrant neon colors)</option>
                          <option value="matrix">Matrix Console (Classic hacker neon green)</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span className="form-label">Live Preview Console</span>
                      <div 
                        style={{ 
                          flexGrow: 1, 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          fontFamily: terminalFontFamily === 'Fira Code' ? "'Fira Code', monospace" : 
                                      terminalFontFamily === 'Cascadia Mono' ? "'Cascadia Mono', monospace" : 
                                      terminalFontFamily === 'Cascadia Code' ? "'Cascadia Code', monospace" : 
                                      terminalFontFamily === 'Source Code Pro' ? "'Source Code Pro', monospace" :
                                      terminalFontFamily === 'Courier New' ? "'Courier New', monospace" : "'Consolas', monospace",
                          fontSize: `${terminalFontSize}px`,
                          lineHeight: '1.4',
                          background: terminalTheme === 'dark-teal' ? '#000b0f' : 
                                      terminalTheme === 'obsidian' ? '#121212' : 
                                      terminalTheme === 'cyberpunk' ? '#1a0826' : '#020a02',
                          color: terminalTheme === 'dark-teal' ? '#c5d7df' : 
                                 terminalTheme === 'obsidian' ? '#e0e0e0' : 
                                 terminalTheme === 'cyberpunk' ? '#f0e6f5' : '#33ff33',
                          minHeight: '220px',
                          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          Simulated Preview Output
                        </div>
                        <div>
                          <span style={{ color: terminalTheme === 'cyberpunk' ? '#ff79c6' : terminalTheme === 'matrix' ? '#00ff00' : 'var(--accent-mint)' }}>wefer-system</span>:~$ agy init --gemini
                        </div>
                        <div style={{ margin: '4px 0 10px', opacity: 0.8 }}>
                          [wefer] Initializing Antigravity CLI Daemon v2.0...<br />
                          [wefer] Reading local workspace index: 45 files mapped.<br />
                          [wefer] Connected successfully to Google Gemini models.
                        </div>
                        <div>
                          <span style={{ color: terminalTheme === 'cyberpunk' ? '#ff79c6' : terminalTheme === 'matrix' ? '#00ff00' : 'var(--accent-mint)' }}>wefer-system</span>:~$ <span style={{ background: terminalTheme === 'cyberpunk' ? '#ff79c6' : terminalTheme === 'matrix' ? '#00ff00' : 'var(--accent-mint)', color: '#000', width: '8px', display: 'inline-block' }}>&nbsp;</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button 
                      className="btn primary"
                      onClick={() => setActiveTab('terminal')}
                    >
                      Apply & Open Terminal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: APPLICATION SETTINGS */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '850px', margin: '0 auto', width: '100%' }}>

                {/* Card 1: Performance & Display */}
                <div className="section-card">
                  <h2 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '4px' }}>
                    <Zap size={20} style={{ color: 'var(--accent-mint)' }} />
                    <span>Performance & Display</span>
                  </h2>

                  {/* Hardware Acceleration */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Cpu size={18} style={{ color: 'var(--accent-cyan)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          Hardware Acceleration
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)', borderRadius: '4px', padding: '1px 6px' }}>
                            Restart
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Use the GPU to render the interface. Disable if you experience graphical glitches. Requires a restart.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={appSettings.hardwareAcceleration}
                      onChange={(val) => updateSetting({ hardwareAcceleration: val }, true)}
                    />
                  </div>

                  {/* Always on Top */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Maximize2 size={18} style={{ color: 'var(--accent-cyan)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Always on Top</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Keep the Wefer window above all other windows. Applies instantly.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={appSettings.alwaysOnTop}
                      onChange={(val) => updateSetting({ alwaysOnTop: val })}
                    />
                  </div>
                </div>

                {/* Card 2: Workspace */}
                <div className="section-card">
                  <h2 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '4px' }}>
                    <FolderOpen size={20} style={{ color: 'var(--accent-mint)' }} />
                    <span>Workspace</span>
                  </h2>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Database size={18} style={{ color: 'var(--accent-cyan)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Remember Last Workspace</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Restore the last selected workspace folder on launch instead of resetting to the home directory.
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-mint)', marginTop: '6px', wordBreak: 'break-all' }}>
                          {appSettings.persistWorkspace ? (appSettings.workspacePath || 'Not saved yet') : 'Disabled'}
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={appSettings.persistWorkspace}
                      onChange={(val) => updateSetting({ persistWorkspace: val })}
                    />
                  </div>
                </div>

                {/* Card 3: Maintenance */}
                <div className="section-card">
                  <h2 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
                    <RotateCcw size={20} style={{ color: 'var(--accent-mint)' }} />
                    <span>Maintenance</span>
                  </h2>

                  {restartHint && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(238, 155, 0, 0.1)', border: '1px solid var(--accent-orange)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--accent-gold)' }}>
                      <Info size={16} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
                      <span>Restart required to apply hardware acceleration changes.</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Relaunch the application to apply restart-required settings.
                    </div>
                    <button
                      className="btn"
                      onClick={() => window.electronAPI?.restartApp?.()}
                      style={{ flexShrink: 0 }}
                    >
                      <RotateCcw size={14} />
                      Restart Application
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: TERMINAL WORKSPACE */}
            {activeTab === 'terminal' && (
              <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 180px)', width: '100%' }}>
                {/* Left Section: Workspace Info & 4-grid terminals */}
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, height: '100%' }}>
                  
                  {/* Top Summary Bar */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: 'linear-gradient(90deg, rgba(0, 30, 41, 0.85) 0%, rgba(0, 45, 61, 0.85) 100%)',
                    border: '1px solid rgba(148, 210, 189, 0.2)',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    marginBottom: '16px',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      <FolderOpen size={16} style={{ color: 'var(--accent-mint)', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                            {workspace ? workspace.split(/[\\/]/).pop() : 'No Workspace Selected'}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>|</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={workspace}>
                            {workspace || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="status-dot active" style={{ width: '6px', height: '6px', margin: 0 }}></span>
                        Workspace Bound
                      </span>
                      {activeWorkspaceId && (
                        <button 
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: '11px', height: '26px', background: 'rgba(148, 210, 189, 0.15)', border: '1px solid rgba(148, 210, 189, 0.3)', color: 'var(--accent-mint)' }}
                          onClick={() => handleAddTerminalSlot(activeWorkspaceId)}
                          title="Add new terminal window to grid (Max 6)"
                        >
                          <Plus size={12} /> Add Terminal
                        </button>
                      )}
                      <button 
                        className="btn secondary"
                        style={{ padding: '4px 10px', fontSize: '11px', height: '26px' }}
                        onClick={handleAddWorkspace}
                      >
                        Browse Folder
                      </button>
                    </div>
                  </div>

                  {/* Per-workspace dynamic grid. Each workspace's grid is
                      mounted once on first visit and then hidden/shown via CSS —
                      no remounting means no PTY restarts when switching workspaces. */}
                  {workspaces.length === 0 && (
                    <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No workspace selected — click "Add" or "Browse Folder" to get started.
                    </div>
                  )}
                  {workspaces.map(ws => {
                    const wsSlots = slotsOf(ws.id);
                    const isActive = ws.id === activeWorkspaceId;
                    
                    // Responsive CSS grids sizing based on slot counts
                    const slotsCount = wsSlots.length;
                    const gridCols = slotsCount === 1 ? '1fr' : slotsCount === 2 ? '1fr 1fr' : (slotsCount === 3 || slotsCount === 5 || slotsCount === 6) ? '1fr 1fr 1fr' : '1fr 1fr';
                    const gridRows = slotsCount <= 3 ? '1fr' : '1fr 1fr';

                    // Only render after first activation (lazy init avoids opening xterm in display:none).
                    if (!visitedWorkspaces.has(ws.id)) return null;
                    return (
                      <div
                        key={ws.id}
                        style={{
                          display: isActive ? 'grid' : 'none',
                          gridTemplateColumns: gridCols,
                          gridTemplateRows: gridRows,
                          gap: '16px',
                          flexGrow: 1,
                          minHeight: 0,
                          height: '100%'
                        }}
                      >
                        {wsSlots.map((agentId, index) => {
                          const sessionId = `${ws.id}:${agentId}`;
                          const agentObj = agents.find(a => a.id === agentId) || agents[0];
                          const shell = shellOfWs(ws.id, agentId);

                          // Preset options based on agent CLI platform
                          let presets;
                          if (agentId === 'claude-code') {
                            presets = [
                              { label: 'commit', cmd: 'claude commit --auto-message' },
                              { label: 'test', cmd: 'claude test' },
                              { label: 'doctor', cmd: 'claude doctor' }
                            ];
                          } else if (agentId === 'antigravity-cli') {
                            presets = [
                              { label: 'audit', cmd: 'antigravity audit --security' },
                              { label: 'refactor', cmd: 'antigravity refactor --strict' },
                              { label: 'doc', cmd: 'antigravity doc --generate' }
                            ];
                          } else if (agentId === 'codex-cli') {
                            presets = [
                              { label: 'explain', cmd: 'codex explain --file=src/App.jsx' },
                              { label: 'template', cmd: 'codex boilerplate --template=react' },
                              { label: 'status', cmd: 'codex status --details' }
                            ];
                          } else if (agentId === 'npm-server') {
                            presets = [
                              { label: 'install', cmd: 'npm install' },
                              { label: 'run dev', cmd: 'npm run dev' },
                              { label: 'start', cmd: 'npm start' }
                            ];
                          } else if (agentId === 'dotnet-env') {
                            presets = [
                              { label: 'build', cmd: 'dotnet build' },
                              { label: 'run', cmd: 'dotnet run' },
                              { label: 'watch', cmd: 'dotnet watch' }
                            ];
                          } else {
                            presets = [
                              { label: 'Task', cmd: `${agentId} run-task` },
                              { label: 'Status', cmd: `${agentId} status` }
                            ];
                          }

                          return (
                            <div
                              key={index}
                              className="terminal-container"
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={(e) => { e.preventDefault(); e.currentTarget.classList.add('drop-target'); }}
                              onDragLeave={(e) => e.currentTarget.classList.remove('drop-target')}
                              onDrop={(e) => {
                                e.currentTarget.classList.remove('drop-target');
                                if (draggedWsId === ws.id && draggedIndex !== null) {
                                  swapTerminalSlots(ws.id, draggedIndex, index);
                                }
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                minWidth: 0,
                                border: '1px solid var(--border-color)',
                                background: '#000b0f',
                                borderRadius: '10px',
                                overflow: 'hidden'
                              }}
                            >
                              {/* Grid Cell Header (Drag Handle) */}
                              <div
                                className="terminal-header"
                                draggable="true"
                                onDragStart={() => {
                                  setDraggedIndex(index);
                                  setDraggedWsId(ws.id);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  background: '#001219',
                                  borderBottom: '1px solid var(--border-color)',
                                  flexShrink: 0,
                                  cursor: 'grab',
                                  height: 'auto'
                                }}
                              >
                                <div className="terminal-title-group" style={{ gap: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span className={`status-dot ${agentObj.status === 'working' ? 'active' : ''}`} style={{ width: '6px', height: '6px' }}></span>

                                  {/* Animated Mascot in Grid Cell */}
                                  {['claude-code', 'antigravity-cli', 'codex-cli'].includes(agentId) && (
                                    <div
                                      className={`mascot-avatar ${agentObj.status === 'working' ? 'animate-mascot-working' : ''}`}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '1.5px solid var(--border-color)',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        background: 'var(--bg-base)',
                                        flexShrink: 0,
                                        '--accent-color': agentId === 'claude-code' ? 'var(--accent-orange)' : agentId === 'antigravity-cli' ? 'var(--accent-mint)' : 'var(--accent-gold)'
                                      }}
                                    >
                                      <img
                                        src={agentId === 'claude-code' ? claudeMascot : agentId === 'antigravity-cli' ? geminiMascot : codexMascot}
                                        alt="Mascot Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    </div>
                                  )}

                                  <select
                                    className="form-control"
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      height: '24px',
                                      width: '130px',
                                      background: 'rgba(0, 18, 25, 0.6)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-primary)'
                                    }}
                                    value={agentId}
                                    onChange={(e) => {
                                      setGridSlotsByWs(prev => {
                                        const slots = [...(prev[ws.id] ?? DEFAULT_GRID_SLOTS)];
                                        slots[index] = e.target.value;
                                        return { ...prev, [ws.id]: slots };
                                      });
                                    }}
                                  >
                                    {agents.map(a => (
                                      <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Preset Buttons Tray */}
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {presets.map((p, pIdx) => (
                                    <button
                                      key={pIdx}
                                      className="btn secondary"
                                      style={{ padding: '2px 6px', fontSize: '9px', height: '20px', borderRadius: '4px' }}
                                      onClick={() => executePtyCommand(agentId, sessionId, p.cmd)}
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>

                                <div className="terminal-controls-right" style={{ gap: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn secondary"
                                    style={{ padding: '2px 6px', fontSize: '9px', height: '20px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--accent-cyan)' }}
                                    title={`Shell: ${shell === 'powershell' ? 'PowerShell' : 'Command Prompt'} — click to swap`}
                                    onClick={() => swapShellWs(ws.id, agentId)}
                                  >
                                    {shell === 'powershell' ? 'PS' : 'CMD'}
                                  </button>
                                  <button
                                    className="btn secondary"
                                    style={{ padding: '2px 6px', fontSize: '9px', height: '20px', borderRadius: '4px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                                    onClick={() => gridTerminalRefs.current[sessionId]?.clear()}
                                  >
                                    Clear
                                  </button>
                                  <button
                                    className="btn secondary"
                                    style={{ padding: '2px 6px', fontSize: '9px', height: '20px', borderRadius: '4px' }}
                                    onClick={() => window.electronAPI?.killSession(sessionId)}
                                    title="Kill session"
                                  >
                                    Kill
                                  </button>
                                  <button
                                    className="btn danger"
                                    style={{ padding: '2px 5px', height: '20px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => handleKillTerminalSlot(ws.id, index)}
                                    title="Close terminal window"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>

                              {/* Grid Cell Terminal PTY View */}
                              <div style={{ flexGrow: 1, minHeight: 0 }}>
                                <TerminalView
                                  key={`${sessionId}:${shell}`}
                                  ref={el => { gridTerminalRefs.current[sessionId] = el; }}
                                  sessionId={sessionId}
                                  agentId={agentId}
                                  shell={shell}
                                  cwd={ws.path}
                                  cliAvailability={cliAvail}
                                  onStatusChange={handleSessionStatus}
                                  fontSize={terminalFontSize}
                                  fontFamily={terminalFontFamily}
                                  themeName={terminalTheme}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Right Section: Dashboard Sidebar (Context, metrics, and mascots) */}
                <div style={{ 
                  width: isDashboardCollapsed ? '75px' : '320px', 
                  flexShrink: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px', 
                  background: 'rgba(0, 18, 25, 0.4)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  padding: isDashboardCollapsed ? '16px 8px' : '16px', 
                  overflowY: isDashboardCollapsed ? 'visible' : 'auto',
                  position: 'relative',
                  zIndex: 50,
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease',
                  alignItems: isDashboardCollapsed ? 'center' : 'stretch'
                }}>
                  {/* Sidebar Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10, 147, 150, 0.15)', paddingBottom: '10px', marginBottom: '4px', width: '100%' }}>
                    {!isDashboardCollapsed ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={16} style={{ color: 'var(--accent-mint)' }} />
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Dashboard Context
                          </span>
                        </div>
                        <button 
                          className="btn secondary"
                          style={{ padding: '2px 4px', height: '18px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                          onClick={() => setIsDashboardCollapsed(true)}
                          title="Collapse Panel"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn secondary wefer-tooltip tooltip-left"
                        data-tooltip="Expand Dashboard"
                        style={{ padding: '4px', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: 'transparent', border: 'none', color: 'var(--accent-mint)' }}
                        onClick={() => setIsDashboardCollapsed(false)}
                      >
                        <ChevronLeft size={16} />
                      </button>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  {!isDashboardCollapsed ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ background: 'rgba(0, 30, 41, 0.6)', border: '1px solid rgba(10, 147, 150, 0.15)', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>Tasks Run</span>
                          <Terminal size={12} style={{ color: 'var(--accent-cyan)' }} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-mono)' }}>{systemStats.commandsCount} runs</div>
                      </div>

                      <div style={{ background: 'rgba(0, 30, 41, 0.6)', border: '1px solid rgba(10, 147, 150, 0.15)', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>Active Agents</span>
                          <Cpu size={12} style={{ color: 'var(--accent-mint)' }} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-mint)' }}>
                          {agents.filter(a => a.status === 'working').length} / {agents.length}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                      <div 
                        className="wefer-tooltip tooltip-left"
                        data-tooltip={`Tasks Run: ${systemStats.commandsCount} operations`}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0, 30, 41, 0.6)', border: '1px solid rgba(10, 147, 150, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}
                      >
                        <Terminal size={16} />
                      </div>
                      <div 
                        className="wefer-tooltip tooltip-left"
                        data-tooltip={`Active Agents: ${agents.filter(a => a.status === 'working').length} / ${agents.length}`}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0, 30, 41, 0.6)', border: '1px solid rgba(10, 147, 150, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-mint)' }}
                      >
                        <Cpu size={16} />
                      </div>
                    </div>
                  )}

                  {/* CPU & Memory load stats */}
                  {!isDashboardCollapsed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0, 30, 41, 0.3)', border: '1px solid rgba(10, 147, 150, 0.15)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>CPU Load</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{systemStats.cpu}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>RAM Usage</span>
                        <span style={{ color: 'var(--accent-mint)' }}>{systemStats.memory} GB</span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="wefer-tooltip tooltip-left"
                      data-tooltip={`CPU: ${systemStats.cpu}% | RAM: ${systemStats.memory} GB`}
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0, 30, 41, 0.3)', border: '1px solid rgba(10, 147, 150, 0.15)', borderRadius: '8px', padding: '8px', alignItems: 'center', color: 'var(--accent-cyan)' }}
                    >
                      <Database size={16} />
                    </div>
                  )}

                  {/* Mascot cards list */}
                  {!isDashboardCollapsed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { id: 'claude-code', mascot: claudeMascot, color: 'var(--accent-orange)' },
                        { id: 'antigravity-cli', mascot: geminiMascot, color: 'var(--accent-mint)' },
                        { id: 'codex-cli', mascot: codexMascot, color: 'var(--accent-gold)' }
                      ].map(({ id, mascot, color }) => {
                        const agent = agents.find(a => a.id === id);
                        if (!agent) return null;
                        
                        return (
                          <div 
                            key={agent.id}
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              padding: '10px', 
                              background: 'rgba(0, 30, 41, 0.4)', 
                              border: `1px solid ${selectedAgentId === agent.id ? color : 'var(--border-color)'}`,
                              borderRadius: '8px',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2.5px', background: color }}></div>
                            
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                              <div 
                                className={`mascot-avatar ${agent.status === 'working' ? 'animate-mascot-working' : ''}`}
                                style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '50%', 
                                  overflow: 'hidden', 
                                  border: `1.5px solid ${color}`, 
                                  flexShrink: 0,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  background: 'var(--bg-surface)',
                                  '--accent-color': color
                                }}
                              >
                                <img src={mascot} alt={`${agent.name} Mascot`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</h3>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{agent.platform}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className={`status-dot ${agent.status === 'working' ? 'active' : ''}`} style={{ width: '4px', height: '4px', margin: 0 }}></span>
                                <span style={{ fontSize: '8px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{agent.status}</span>
                              </div>
                            </div>

                          {agent.contextLimit > 0 && (
                            <div style={{ marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                                <span>Context</span>
                                <span>{(agent.contextUsed / 1000).toFixed(0)}k/{(agent.contextLimit / 1000).toFixed(0)}k</span>
                              </div>
                              <div className="progress-bar-container" style={{ height: '3px', margin: 0 }}>
                                <div 
                                  className="progress-bar" 
                                  style={{ 
                                    width: `${((agent.contextUsed) / agent.contextLimit) * 100}%`, 
                                    background: color 
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#000b0f', border: '1px solid rgba(10, 147, 150, 0.1)', borderRadius: '4px', padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: '9px', minHeight: '30px', maxHeight: '40px', overflow: 'hidden' }}>
                            <div style={{ color: agent.status === 'working' ? color : 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              &gt; {liveTerminalOutputs[`${activeWorkspaceId}:${agent.id}`] || 'Awaiting first run...'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                      {[
                        { id: 'claude-code', mascot: claudeMascot, color: 'var(--accent-orange)' },
                        { id: 'antigravity-cli', mascot: geminiMascot, color: 'var(--accent-mint)' },
                        { id: 'codex-cli', mascot: codexMascot, color: 'var(--accent-gold)' }
                      ].map(({ id, mascot, color }) => {
                        const agent = agents.find(a => a.id === id);
                        if (!agent) return null;
                        
                        return (
                          <div 
                            key={agent.id}
                            className="wefer-tooltip tooltip-left"
                            data-tooltip={`${agent.name} (${agent.platform}) — ${agent.status.toUpperCase()}`}
                            style={{ 
                              position: 'relative',
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              border: `1.5px solid ${selectedAgentId === agent.id ? color : 'var(--border-color)'}`,
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              background: 'var(--bg-surface)',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedAgentId(agent.id)}
                          >
                            <img src={mascot} alt={`${agent.name} Mascot`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            <span 
                              className={`status-dot ${agent.status === 'working' ? 'active' : ''}`} 
                              style={{ 
                                position: 'absolute', 
                                bottom: '-1px', 
                                right: '-1px', 
                                width: '6px', 
                                height: '6px', 
                                margin: 0, 
                                border: '1px solid var(--bg-base)' 
                              }}
                            ></span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}

export default App;
