// Project State Management
import * as THREE from 'three';
import {
    ICFProject, ProjectElements, ICFBlock, FramingWall, Pipe,
    WireRun, Outlet, Switch, ElectricalPanel, LowVoltageRun,
    NetworkDrop, Equipment, Cabinet, Window, Door, Area,
    ICFBlockType, ICFCoreThickness, LayerState, ToolMode, ElementCategory
} from '../types/project';

// Generate unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create empty project
export const createEmptyProject = (): ICFProject => ({
    version: '1.0',
    name: 'Untitled Project',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    settings: {
        gridUnit: 'inches',
        costMultiplier: 1.0,
        showGrid: true,
        gridSize: 8
    },
    areas: [],
    elements: {
        icfBlocks: [],
        framing: [],
        plumbing: [],
        electrical: {
            wires: [],
            outlets: [],
            switches: [],
            panels: []
        },
        lowVoltage: {
            runs: [],
            drops: []
        },
        equipment: [],
        cabinets: [],
        windows: [],
        doors: []
    }
});

export class ProjectState {
    private project: ICFProject;
    private meshMap: Map<string, THREE.Object3D> = new Map();
    private history: ICFProject[] = [];
    private historyIndex: number = -1;
    private maxHistory: number = 50;

    // Current tool state
    public currentTool: ToolMode = 'place';
    public currentCategory: ElementCategory = 'icf';
    public currentBlockType: ICFBlockType = 'standard';
    public currentCoreThickness: ICFCoreThickness = 8;
    public currentRotation: number = 0;
    public selectedElementId: string | null = null;

    // Layer visibility
    public layers: LayerState = {
        icf: true,
        framing: true,
        'plumbing-cold': true,
        'plumbing-hot': true,
        'plumbing-drain': true,
        hvac: true,
        electrical: true,
        lowVoltage: true,
        equipment: true,
        cabinets: true,
        windows: true
    };

    // Change callbacks
    private onChangeCallbacks: (() => void)[] = [];

    constructor() {
        this.project = createEmptyProject();
        this.saveToHistory();
    }

    // Subscribe to changes
    onChange(callback: () => void): () => void {
        this.onChangeCallbacks.push(callback);
        return () => {
            const index = this.onChangeCallbacks.indexOf(callback);
            if (index > -1) this.onChangeCallbacks.splice(index, 1);
        };
    }

    private notifyChange(): void {
        this.project.modified = new Date().toISOString();
        this.onChangeCallbacks.forEach(cb => cb());
    }

    // History management
    private saveToHistory(): void {
        // Remove any future history if we're in the middle
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add current state
        this.history.push(JSON.parse(JSON.stringify(this.project)));

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.historyIndex = this.history.length - 1;
    }

    undo(): boolean {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.project = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.notifyChange();
            return true;
        }
        return false;
    }

    redo(): boolean {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.project = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.notifyChange();
            return true;
        }
        return false;
    }

    // ICF Block operations
    addICFBlock(position: THREE.Vector3): ICFBlock {
        const block: ICFBlock = {
            id: generateId(),
            type: this.currentBlockType,
            coreThickness: this.currentCoreThickness,
            position: { x: position.x, y: position.y, z: position.z },
            rotation: this.currentRotation
        };

        this.project.elements.icfBlocks.push(block);
        this.saveToHistory();
        this.notifyChange();
        return block;
    }

    removeICFBlock(id: string): boolean {
        const index = this.project.elements.icfBlocks.findIndex(b => b.id === id);
        if (index > -1) {
            this.project.elements.icfBlocks.splice(index, 1);
            this.saveToHistory();
            this.notifyChange();
            return true;
        }
        return false;
    }

    updateICFBlock(id: string, updates: Partial<ICFBlock>): boolean {
        const block = this.project.elements.icfBlocks.find(b => b.id === id);
        if (block) {
            Object.assign(block, updates);
            this.saveToHistory();
            this.notifyChange();
            return true;
        }
        return false;
    }

    // Equipment operations
    addEquipment(type: string, position: THREE.Vector3): Equipment {
        const equipment: Equipment = {
            id: generateId(),
            type: type as any,
            position: { x: position.x, y: position.y, z: position.z },
            rotation: this.currentRotation,
            dimensions: { x: 24, y: 48, z: 24 }
        };

        this.project.elements.equipment.push(equipment);
        this.saveToHistory();
        this.notifyChange();
        return equipment;
    }

    // Cabinet operations
    addCabinet(type: string, position: THREE.Vector3): Cabinet {
        const cabinet: Cabinet = {
            id: generateId(),
            type: type as any,
            position: { x: position.x, y: position.y, z: position.z },
            rotation: this.currentRotation
        };

        this.project.elements.cabinets.push(cabinet);
        this.saveToHistory();
        this.notifyChange();
        return cabinet;
    }

    // Window operations  
    addWindow(type: string, position: THREE.Vector3): Window {
        const window: Window = {
            id: generateId(),
            type: type as any,
            position: { x: position.x, y: position.y, z: position.z },
            rotation: this.currentRotation
        };

        this.project.elements.windows.push(window);
        this.saveToHistory();
        this.notifyChange();
        return window;
    }

    // Generic delete
    deleteElement(id: string): boolean {
        const elements = this.project.elements;

        // Check all arrays
        const arrays = [
            elements.icfBlocks,
            elements.framing,
            elements.plumbing,
            elements.electrical.wires,
            elements.electrical.outlets,
            elements.electrical.switches,
            elements.electrical.panels,
            elements.lowVoltage.runs,
            elements.lowVoltage.drops,
            elements.equipment,
            elements.cabinets,
            elements.windows,
            elements.doors
        ];

        for (const arr of arrays) {
            const index = arr.findIndex((el: any) => el.id === id);
            if (index > -1) {
                arr.splice(index, 1);
                this.saveToHistory();
                this.notifyChange();
                return true;
            }
        }
        return false;
    }

    // Rotation
    rotateSelection(): void {
        this.currentRotation = (this.currentRotation + 90) % 360;

        if (this.selectedElementId) {
            this.updateICFBlock(this.selectedElementId, { rotation: this.currentRotation });
        }

        this.notifyChange();
    }

    // Mesh tracking
    registerMesh(id: string, mesh: THREE.Object3D): void {
        this.meshMap.set(id, mesh);
    }

    unregisterMesh(id: string): void {
        this.meshMap.delete(id);
    }

    getMesh(id: string): THREE.Object3D | undefined {
        return this.meshMap.get(id);
    }

    getAllMeshes(): THREE.Object3D[] {
        return Array.from(this.meshMap.values());
    }

    // Project getters
    getProject(): ICFProject {
        return this.project;
    }

    getICFBlocks(): ICFBlock[] {
        return this.project.elements.icfBlocks;
    }

    getAreas(): Area[] {
        return this.project.areas;
    }

    // JSON Import/Export
    exportJSON(): string {
        return JSON.stringify(this.project, null, 2);
    }

    importJSON(json: string): void {
        try {
            const parsed = JSON.parse(json) as ICFProject;
            // Validate basic structure
            if (!parsed.version || !parsed.elements) {
                throw new Error('Invalid project format');
            }
            this.project = parsed;
            this.saveToHistory();
            this.notifyChange();
        } catch (e) {
            throw new Error(`Failed to import project: ${e}`);
        }
    }

    // Save/Load from localStorage
    saveToLocalStorage(): void {
        localStorage.setItem('icf-project', this.exportJSON());
    }

    loadFromLocalStorage(): boolean {
        const saved = localStorage.getItem('icf-project');
        if (saved) {
            try {
                this.importJSON(saved);
                return true;
            } catch (e) {
                console.error('Failed to load saved project:', e);
            }
        }
        return false;
    }

    // New project  
    newProject(): void {
        this.project = createEmptyProject();
        this.history = [];
        this.historyIndex = -1;
        this.saveToHistory();
        this.meshMap.clear();
        this.selectedElementId = null;
        this.notifyChange();
    }
}

// Singleton
export const projectState = new ProjectState();
