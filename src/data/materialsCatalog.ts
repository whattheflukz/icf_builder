// Catalog for all non-ICF building elements with pricing

import {
    FramingType, PipeType, WireType, CabinetType,
    EquipmentType, WindowType, DoorType, LowVoltageType
} from '../types/project';

// Framing lumber
export const FRAMING_CATALOG: Record<FramingType, { name: string; width: number; depth: number; pricePerFoot: number }> = {
    '2x4': { name: '2x4 Stud', width: 1.5, depth: 3.5, pricePerFoot: 0.50 },
    '2x6': { name: '2x6 Stud', width: 1.5, depth: 5.5, pricePerFoot: 0.85 }
};

// Plumbing pipes
export const PLUMBING_CATALOG: Record<PipeType, { name: string; diameter: number; pricePerFoot: number; color: string }> = {
    'pex-1/2': { name: '1/2" PEX', diameter: 0.5, pricePerFoot: 0.50, color: '#3498db' },
    'pex-3/4': { name: '3/4" PEX', diameter: 0.75, pricePerFoot: 0.75, color: '#3498db' },
    'pex-1': { name: '1" PEX', diameter: 1, pricePerFoot: 1.00, color: '#3498db' },
    'pvc-2': { name: '2" PVC Drain', diameter: 2, pricePerFoot: 2.00, color: '#7f8c8d' },
    'pvc-3': { name: '3" PVC Drain', diameter: 3, pricePerFoot: 3.50, color: '#7f8c8d' },
    'pvc-4': { name: '4" PVC Drain', diameter: 4, pricePerFoot: 5.00, color: '#7f8c8d' }
};

// Electrical wire
export const ELECTRICAL_CATALOG: Record<WireType, { name: string; pricePerFoot: number; color: string }> = {
    '14-2': { name: '14/2 Romex (15A)', pricePerFoot: 0.80, color: '#f1c40f' },
    '12-2': { name: '12/2 Romex (20A)', pricePerFoot: 1.00, color: '#f1c40f' },
    '10-2': { name: '10/2 Romex (30A)', pricePerFoot: 1.50, color: '#e67e22' },
    '8-3': { name: '8/3 (40A)', pricePerFoot: 3.00, color: '#e67e22' },
    '6-3': { name: '6/3 (50A)', pricePerFoot: 4.50, color: '#e67e22' }
};

export const ELECTRICAL_DEVICES = {
    outlet: { duplex: 3, gfci: 18, usb: 25, '240v': 15 },
    switch: { single: 3, 'three-way': 8, dimmer: 25 },
    panel: { '100A': 150, '200A': 300 }
};

// Low voltage
export const LOW_VOLTAGE_CATALOG: Record<LowVoltageType, { name: string; pricePerFoot: number; color: string }> = {
    'cat6': { name: 'Cat6 Ethernet', pricePerFoot: 0.30, color: '#e67e22' },
    'cat6a': { name: 'Cat6a Ethernet', pricePerFoot: 0.50, color: '#e67e22' },
    'coax': { name: 'RG6 Coax', pricePerFoot: 0.25, color: '#2c3e50' },
    'speaker': { name: 'Speaker Wire', pricePerFoot: 0.40, color: '#9b59b6' },
    'security': { name: 'Security Cable', pricePerFoot: 0.35, color: '#27ae60' }
};

// Cabinets
export const CABINET_CATALOG: Record<CabinetType, { name: string; width: number; height: number; depth: number; price: number }> = {
    'base-12': { name: '12" Base Cabinet', width: 12, height: 34.5, depth: 24, price: 150 },
    'base-18': { name: '18" Base Cabinet', width: 18, height: 34.5, depth: 24, price: 200 },
    'base-24': { name: '24" Base Cabinet', width: 24, height: 34.5, depth: 24, price: 250 },
    'base-30': { name: '30" Base Cabinet', width: 30, height: 34.5, depth: 24, price: 300 },
    'base-36': { name: '36" Base Cabinet', width: 36, height: 34.5, depth: 24, price: 350 },
    'wall-12': { name: '12" Wall Cabinet', width: 12, height: 30, depth: 12, price: 100 },
    'wall-18': { name: '18" Wall Cabinet', width: 18, height: 30, depth: 12, price: 130 },
    'wall-24': { name: '24" Wall Cabinet', width: 24, height: 30, depth: 12, price: 160 },
    'wall-30': { name: '30" Wall Cabinet', width: 30, height: 30, depth: 12, price: 190 },
    'wall-36': { name: '36" Wall Cabinet', width: 36, height: 30, depth: 12, price: 220 },
    'tall-24': { name: '24" Tall Cabinet', width: 24, height: 84, depth: 24, price: 400 },
    'tall-36': { name: '36" Tall Cabinet', width: 36, height: 84, depth: 24, price: 500 }
};

// Equipment
export const EQUIPMENT_CATALOG: Record<EquipmentType, { name: string; width: number; height: number; depth: number; price: number; color: string }> = {
    'hvac-furnace': { name: 'Furnace', width: 24, height: 48, depth: 30, price: 2500, color: '#8e44ad' },
    'hvac-condenser': { name: 'AC Condenser', width: 30, height: 30, depth: 30, price: 2000, color: '#8e44ad' },
    'hvac-air-handler': { name: 'Air Handler', width: 24, height: 48, depth: 24, price: 1500, color: '#8e44ad' },
    'heat-pump-mini-split': { name: 'Mini Split', width: 32, height: 12, depth: 8, price: 1200, color: '#8e44ad' },
    'water-heater-tank': { name: 'Tank Water Heater', width: 22, height: 60, depth: 22, price: 800, color: '#3498db' },
    'water-heater-tankless': { name: 'Tankless Water Heater', width: 14, height: 24, depth: 10, price: 1500, color: '#3498db' },
    'electrical-panel': { name: 'Main Panel', width: 14, height: 30, depth: 4, price: 300, color: '#f39c12' },
    'sub-panel': { name: 'Sub Panel', width: 12, height: 18, depth: 4, price: 150, color: '#f39c12' },
    'washer': { name: 'Washer', width: 27, height: 38, depth: 30, price: 0, color: '#ecf0f1' },
    'dryer': { name: 'Dryer', width: 27, height: 38, depth: 30, price: 0, color: '#ecf0f1' }
};

// Windows
export const WINDOW_CATALOG: Record<WindowType, { name: string; width: number; height: number; price: number }> = {
    '24x24': { name: '24x24 Window', width: 24, height: 24, price: 150 },
    '24x36': { name: '24x36 Window', width: 24, height: 36, price: 200 },
    '36x36': { name: '36x36 Window', width: 36, height: 36, price: 250 },
    '36x48': { name: '36x48 Window', width: 36, height: 48, price: 300 },
    '48x48': { name: '48x48 Window', width: 48, height: 48, price: 400 },
    '60x48': { name: '60x48 Window', width: 60, height: 48, price: 500 }
};

// Doors
export const DOOR_CATALOG: Record<DoorType, { name: string; width: number; height: number; price: number }> = {
    '30x80': { name: '30x80 Door', width: 30, height: 80, price: 150 },
    '32x80': { name: '32x80 Door', width: 32, height: 80, price: 175 },
    '36x80': { name: '36x80 Door', width: 36, height: 80, price: 200 },
    'sliding-72': { name: '72" Sliding Door', width: 72, height: 80, price: 800 },
    'sliding-96': { name: '96" Sliding Door', width: 96, height: 80, price: 1200 }
};
