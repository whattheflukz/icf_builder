// Cost Calculator for ICF Home Designer
import { ICFProject } from '../types/project';
import { ICF_BLOCK_CATALOG, ADDITIONAL_MATERIALS } from '../data/icfCatalog';
import {
    FRAMING_CATALOG, PLUMBING_CATALOG, ELECTRICAL_CATALOG, ELECTRICAL_DEVICES,
    LOW_VOLTAGE_CATALOG, CABINET_CATALOG, EQUIPMENT_CATALOG, WINDOW_CATALOG, DOOR_CATALOG
} from '../data/materialsCatalog';

export interface CostBreakdown {
    category: string;
    items: CostItem[];
    subtotal: number;
}

export interface CostItem {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
}

export interface ProjectCosts {
    breakdowns: CostBreakdown[];
    grandTotal: number;
    multiplier: number;
}

export function calculateProjectCosts(project: ICFProject): ProjectCosts {
    const breakdowns: CostBreakdown[] = [];
    const multiplier = project.settings.costMultiplier;

    // ICF Blocks
    const icfItems: CostItem[] = [];
    const icfByType: Map<string, { count: number; price: number }> = new Map();

    for (const block of project.elements.icfBlocks) {
        const key = `${block.type}-${block.coreThickness}`;
        const spec = ICF_BLOCK_CATALOG[block.type];
        const price = spec.pricePerBlock(block.coreThickness);

        if (!icfByType.has(key)) {
            icfByType.set(key, { count: 0, price });
        }
        icfByType.get(key)!.count++;
    }

    icfByType.forEach((data, key) => {
        const [type, core] = key.split('-');
        const spec = ICF_BLOCK_CATALOG[type as keyof typeof ICF_BLOCK_CATALOG];
        icfItems.push({
            name: `${spec.name} (${core}" core)`,
            quantity: data.count,
            unit: 'blocks',
            unitPrice: data.price,
            total: data.count * data.price
        });
    });

    // Add concrete estimate for ICF
    const totalICFBlocks = project.elements.icfBlocks.length;
    if (totalICFBlocks > 0) {
        // Each block is ~5.3 sq ft of wall area, concrete is $10/sqft avg
        const sqFtWall = totalICFBlocks * 5.3;
        icfItems.push({
            name: 'Concrete Fill (estimated)',
            quantity: Math.round(sqFtWall),
            unit: 'sq ft',
            unitPrice: ADDITIONAL_MATERIALS.concretePerSqFtWall,
            total: sqFtWall * ADDITIONAL_MATERIALS.concretePerSqFtWall
        });
    }

    if (icfItems.length > 0) {
        breakdowns.push({
            category: 'ICF Blocks & Concrete',
            items: icfItems,
            subtotal: icfItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Framing
    const framingItems: CostItem[] = [];
    for (const wall of project.elements.framing) {
        const spec = FRAMING_CATALOG[wall.type];
        const length = Math.sqrt(
            Math.pow(wall.end.x - wall.start.x, 2) +
            Math.pow(wall.end.y - wall.start.y, 2) +
            Math.pow(wall.end.z - wall.start.z, 2)
        );
        const feet = length / 12;
        framingItems.push({
            name: spec.name,
            quantity: Math.ceil(feet),
            unit: 'linear ft',
            unitPrice: spec.pricePerFoot,
            total: feet * spec.pricePerFoot
        });
    }

    if (framingItems.length > 0) {
        breakdowns.push({
            category: 'Interior Framing',
            items: framingItems,
            subtotal: framingItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Plumbing
    const plumbingItems: CostItem[] = [];
    for (const pipe of project.elements.plumbing) {
        const spec = PLUMBING_CATALOG[pipe.type];
        let totalLength = 0;
        for (let i = 1; i < pipe.path.length; i++) {
            const p1 = pipe.path[i - 1];
            const p2 = pipe.path[i];
            totalLength += Math.sqrt(
                Math.pow(p2.x - p1.x, 2) +
                Math.pow(p2.y - p1.y, 2) +
                Math.pow(p2.z - p1.z, 2)
            );
        }
        const feet = totalLength / 12;
        plumbingItems.push({
            name: spec.name,
            quantity: Math.ceil(feet),
            unit: 'linear ft',
            unitPrice: spec.pricePerFoot,
            total: feet * spec.pricePerFoot
        });
    }

    if (plumbingItems.length > 0) {
        breakdowns.push({
            category: 'Plumbing',
            items: plumbingItems,
            subtotal: plumbingItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Electrical
    const elecItems: CostItem[] = [];

    // Wire runs
    for (const wire of project.elements.electrical.wires) {
        const spec = ELECTRICAL_CATALOG[wire.type];
        let totalLength = 0;
        for (let i = 1; i < wire.path.length; i++) {
            const p1 = wire.path[i - 1];
            const p2 = wire.path[i];
            totalLength += Math.sqrt(
                Math.pow(p2.x - p1.x, 2) +
                Math.pow(p2.y - p1.y, 2) +
                Math.pow(p2.z - p1.z, 2)
            );
        }
        const feet = totalLength / 12;
        elecItems.push({
            name: spec.name,
            quantity: Math.ceil(feet),
            unit: 'linear ft',
            unitPrice: spec.pricePerFoot,
            total: feet * spec.pricePerFoot
        });
    }

    // Outlets
    const outletCounts: Record<string, number> = {};
    for (const outlet of project.elements.electrical.outlets) {
        outletCounts[outlet.type] = (outletCounts[outlet.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(outletCounts)) {
        const price = ELECTRICAL_DEVICES.outlet[type as keyof typeof ELECTRICAL_DEVICES.outlet] || 5;
        elecItems.push({
            name: `${type.toUpperCase()} Outlet`,
            quantity: count,
            unit: 'each',
            unitPrice: price,
            total: count * price
        });
    }

    // Switches
    const switchCounts: Record<string, number> = {};
    for (const sw of project.elements.electrical.switches) {
        switchCounts[sw.type] = (switchCounts[sw.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(switchCounts)) {
        const price = ELECTRICAL_DEVICES.switch[type as keyof typeof ELECTRICAL_DEVICES.switch] || 5;
        elecItems.push({
            name: `${type} Switch`,
            quantity: count,
            unit: 'each',
            unitPrice: price,
            total: count * price
        });
    }

    if (elecItems.length > 0) {
        breakdowns.push({
            category: 'Electrical',
            items: elecItems,
            subtotal: elecItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Low Voltage
    const lvItems: CostItem[] = [];
    for (const run of project.elements.lowVoltage.runs) {
        const spec = LOW_VOLTAGE_CATALOG[run.type];
        let totalLength = 0;
        for (let i = 1; i < run.path.length; i++) {
            const p1 = run.path[i - 1];
            const p2 = run.path[i];
            totalLength += Math.sqrt(
                Math.pow(p2.x - p1.x, 2) +
                Math.pow(p2.y - p1.y, 2) +
                Math.pow(p2.z - p1.z, 2)
            );
        }
        const feet = totalLength / 12;
        lvItems.push({
            name: spec.name,
            quantity: Math.ceil(feet),
            unit: 'linear ft',
            unitPrice: spec.pricePerFoot,
            total: feet * spec.pricePerFoot
        });
    }

    if (lvItems.length > 0) {
        breakdowns.push({
            category: 'Low Voltage / Networking',
            items: lvItems,
            subtotal: lvItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Equipment
    const equipItems: CostItem[] = [];
    for (const equip of project.elements.equipment) {
        const spec = EQUIPMENT_CATALOG[equip.type];
        if (spec && spec.price > 0) {
            equipItems.push({
                name: spec.name,
                quantity: 1,
                unit: 'each',
                unitPrice: spec.price,
                total: spec.price
            });
        }
    }

    if (equipItems.length > 0) {
        breakdowns.push({
            category: 'Equipment',
            items: equipItems,
            subtotal: equipItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Cabinets
    const cabItems: CostItem[] = [];
    const cabCounts: Record<string, number> = {};
    for (const cab of project.elements.cabinets) {
        cabCounts[cab.type] = (cabCounts[cab.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(cabCounts)) {
        const spec = CABINET_CATALOG[type as keyof typeof CABINET_CATALOG];
        if (spec) {
            cabItems.push({
                name: spec.name,
                quantity: count,
                unit: 'each',
                unitPrice: spec.price,
                total: count * spec.price
            });
        }
    }

    if (cabItems.length > 0) {
        breakdowns.push({
            category: 'Cabinets',
            items: cabItems,
            subtotal: cabItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Windows & Doors
    const openingItems: CostItem[] = [];

    const winCounts: Record<string, number> = {};
    for (const win of project.elements.windows) {
        winCounts[win.type] = (winCounts[win.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(winCounts)) {
        const spec = WINDOW_CATALOG[type as keyof typeof WINDOW_CATALOG];
        if (spec) {
            openingItems.push({
                name: spec.name,
                quantity: count,
                unit: 'each',
                unitPrice: spec.price,
                total: count * spec.price
            });
        }
    }

    const doorCounts: Record<string, number> = {};
    for (const door of project.elements.doors) {
        doorCounts[door.type] = (doorCounts[door.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(doorCounts)) {
        const spec = DOOR_CATALOG[type as keyof typeof DOOR_CATALOG];
        if (spec) {
            openingItems.push({
                name: spec.name,
                quantity: count,
                unit: 'each',
                unitPrice: spec.price,
                total: count * spec.price
            });
        }
    }

    if (openingItems.length > 0) {
        breakdowns.push({
            category: 'Windows & Doors',
            items: openingItems,
            subtotal: openingItems.reduce((sum, item) => sum + item.total, 0)
        });
    }

    // Calculate grand total
    const rawTotal = breakdowns.reduce((sum, cat) => sum + cat.subtotal, 0);
    const grandTotal = rawTotal * multiplier;

    return {
        breakdowns,
        grandTotal,
        multiplier
    };
}

// Format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}
