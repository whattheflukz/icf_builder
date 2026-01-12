// Project Types for ICF Home Designer
// All element types that can be placed in the 3D scene

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Area {
  id: string;
  name: string;
  color: string;
}

// ICF Block Types
export type ICFBlockType = 'standard' | 'corner90' | 'corner45' | 'taperTop' | 'brickLedge' | 'heightAdjuster';
export type ICFCoreThickness = 4 | 6 | 8 | 10 | 12;

export interface ICFBlock {
  id: string;
  type: ICFBlockType;
  coreThickness: ICFCoreThickness;
  position: Vector3;
  rotation: number; // degrees, 0/90/180/270
  areaId?: string;
  color?: string;
}

// Interior Framing
export type FramingType = '2x4' | '2x6';

export interface FramingWall {
  id: string;
  type: FramingType;
  start: Vector3;
  end: Vector3;
  height: number;
  areaId?: string;
}

// Plumbing
export type PipeType = 'pex-1/2' | 'pex-3/4' | 'pex-1' | 'pvc-2' | 'pvc-3' | 'pvc-4';
export type PlumbingSystem = 'water-cold' | 'water-hot' | 'drain' | 'vent';

export interface Pipe {
  id: string;
  type: PipeType;
  system: PlumbingSystem;
  path: Vector3[];
  color?: string;
}

// Electrical
export type WireType = '14-2' | '12-2' | '10-2' | '8-3' | '6-3';
export type CircuitType = 'general' | 'kitchen' | 'bathroom' | 'dedicated' | 'hvac';
export type OutletType = 'duplex' | 'gfci' | 'usb' | '240v';
export type SwitchType = 'single' | 'three-way' | 'dimmer';

export interface WireRun {
  id: string;
  type: WireType;
  circuit: CircuitType;
  path: Vector3[];
}

export interface Outlet {
  id: string;
  type: OutletType;
  position: Vector3;
  rotation: number;
  circuitId?: string;
}

export interface Switch {
  id: string;
  type: SwitchType;
  position: Vector3;
  rotation: number;
}

export interface ElectricalPanel {
  id: string;
  position: Vector3;
  rotation: number;
  circuits: number;
}

// Low Voltage
export type LowVoltageType = 'cat6' | 'cat6a' | 'coax' | 'speaker' | 'security';

export interface LowVoltageRun {
  id: string;
  type: LowVoltageType;
  path: Vector3[];
}

export interface NetworkDrop {
  id: string;
  type: 'ethernet' | 'coax';
  position: Vector3;
  rotation: number;
}

// Equipment
export type EquipmentType = 
  | 'hvac-furnace' | 'hvac-condenser' | 'hvac-air-handler' | 'heat-pump-mini-split'
  | 'water-heater-tank' | 'water-heater-tankless'
  | 'electrical-panel' | 'sub-panel'
  | 'washer' | 'dryer';

export interface Equipment {
  id: string;
  type: EquipmentType;
  position: Vector3;
  rotation: number;
  dimensions: Vector3; // custom size override
  label?: string;
}

// Cabinets
export type CabinetType = 
  | 'base-12' | 'base-18' | 'base-24' | 'base-30' | 'base-36'
  | 'wall-12' | 'wall-18' | 'wall-24' | 'wall-30' | 'wall-36'
  | 'tall-24' | 'tall-36';

export interface Cabinet {
  id: string;
  type: CabinetType;
  position: Vector3;
  rotation: number;
  color?: string;
}

// Windows and Doors
export type WindowType = '24x24' | '24x36' | '36x36' | '36x48' | '48x48' | '60x48';
export type DoorType = '30x80' | '32x80' | '36x80' | 'sliding-72' | 'sliding-96';

export interface Window {
  id: string;
  type: WindowType;
  position: Vector3;
  rotation: number;
  wallId?: string;
}

export interface Door {
  id: string;
  type: DoorType;
  position: Vector3;
  rotation: number;
  wallId?: string;
}

// Complete Project
export interface ProjectElements {
  icfBlocks: ICFBlock[];
  framing: FramingWall[];
  plumbing: Pipe[];
  electrical: {
    wires: WireRun[];
    outlets: Outlet[];
    switches: Switch[];
    panels: ElectricalPanel[];
  };
  lowVoltage: {
    runs: LowVoltageRun[];
    drops: NetworkDrop[];
  };
  equipment: Equipment[];
  cabinets: Cabinet[];
  windows: Window[];
  doors: Door[];
}

export interface ProjectSettings {
  gridUnit: 'inches' | 'feet' | 'mm';
  costMultiplier: number;
  showGrid: boolean;
  gridSize: number;
}

export interface ICFProject {
  version: string;
  name: string;
  created: string;
  modified: string;
  settings: ProjectSettings;
  areas: Area[];
  elements: ProjectElements;
}

// Layer visibility
export type LayerType = 
  | 'icf' | 'framing' | 'plumbing-cold' | 'plumbing-hot' | 'plumbing-drain'
  | 'hvac' | 'electrical' | 'lowVoltage' | 'equipment' | 'cabinets' | 'windows';

export interface LayerState {
  [key: string]: boolean;
}

// Tool modes
export type ToolMode = 'select' | 'place' | 'delete' | 'measure';
export type ElementCategory = 'icf' | 'framing' | 'plumbing' | 'electrical' | 'lowVoltage' | 'equipment' | 'cabinets' | 'openings';
