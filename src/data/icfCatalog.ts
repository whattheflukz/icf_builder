// ICF Block Catalog - Based on ElementICF specifications
// All dimensions in inches
// Reference: https://elementicf.com/products/

import { ICFBlockType, ICFCoreThickness } from '../types/project';

export interface ICFBlockSpec {
    type: ICFBlockType;
    name: string;
    height: number;       // inches (all blocks are 16" except height adjuster)
    length: number;       // inches (for standard blocks: 48")
    longLeg?: number;     // inches (for corner blocks)
    shortLeg?: number;    // inches (for corner blocks)
    getWidth: (core: ICFCoreThickness) => number;
    pricePerBlock: (core: ICFCoreThickness) => number;
    description: string;
}

// Width calculation: 2 foam panels (2.75" each = 5.5") + core thickness
// 4" core = 9.5" total width
// 6" core = 11.5" total width  
// 8" core = 13.5" total width
// 10" core = 15.5" total width
// 12" core = 17.5" total width
const getStandardWidth = (core: ICFCoreThickness): number => 5.5 + core;

// Pricing based on research (~$24-26 per block)
const getStandardPrice = (core: ICFCoreThickness): number => {
    const basePrices: Record<ICFCoreThickness, number> = {
        4: 22,
        6: 24,
        8: 26,
        10: 28,
        12: 30
    };
    return basePrices[core];
};

export const ICF_BLOCK_CATALOG: Record<ICFBlockType, ICFBlockSpec> = {
    standard: {
        type: 'standard',
        name: 'Standard Block',
        height: 16,           // 16" height (406mm)
        length: 48,           // 48" length (1219mm)
        getWidth: getStandardWidth,
        pricePerBlock: getStandardPrice,
        description: '16" x 48" standard straight wall block'
    },
    corner90: {
        type: 'corner90',
        name: '90° Corner',
        height: 16,           // 16" height
        length: 38.5,         // Not used directly, use longLeg/shortLeg
        longLeg: 38.5,        // 38.5" long leg (978mm)
        shortLeg: 22.5,       // 22.5" short leg (571mm)
        getWidth: getStandardWidth,
        pricePerBlock: (core) => getStandardPrice(core) * 1.5,
        description: '90-degree corner block - Long leg 38.5", Short leg 22.5"'
    },
    corner45: {
        type: 'corner45',
        name: '45° Corner',
        height: 16,
        length: 32,           // Approximate - 45° corners are less common
        longLeg: 32,
        shortLeg: 32,
        getWidth: getStandardWidth,
        pricePerBlock: (core) => getStandardPrice(core) * 1.3,
        description: '45-degree angled corner block'
    },
    taperTop: {
        type: 'taperTop',
        name: 'Taper Top',
        height: 16,
        length: 48,
        getWidth: (core) => getStandardWidth(core) + 4, // Wider at top for bearing
        pricePerBlock: (core) => getStandardPrice(core) * 1.2,
        description: 'Top course block with increased bearing area for roof/floor'
    },
    brickLedge: {
        type: 'brickLedge',
        name: 'Brick Ledge',
        height: 16,
        length: 48,
        getWidth: () => 17.375, // Fixed width - 13.5" bottom, 17.375" top
        pricePerBlock: () => 35,
        description: 'Forms 4" ledge for brick veneer support'
    },
    heightAdjuster: {
        type: 'heightAdjuster',
        name: 'Height Adjuster',
        height: 4,            // 4" height for fine-tuning wall height
        length: 48,
        getWidth: getStandardWidth,
        pricePerBlock: (core) => getStandardPrice(core) * 0.4,
        description: '4" height adjuster for custom wall heights'
    }
};

// Additional materials for cost calculation
export const ADDITIONAL_MATERIALS = {
    concretePerCubicYard: 150, // $150 per cubic yard
    rebarPerFoot: 0.75,        // $0.75 per foot
    concretePerSqFtWall: 10,   // $9-11 average
};

// Core thickness options for UI
export const CORE_THICKNESS_OPTIONS: ICFCoreThickness[] = [4, 6, 8, 10, 12];

export const getCoreThicknessLabel = (core: ICFCoreThickness): string => `${core}"`;

// Helper to get wall area per block
export const getBlockWallArea = (type: ICFBlockType): number => {
    const spec = ICF_BLOCK_CATALOG[type];
    // Wall area in square feet
    return (spec.length * spec.height) / 144;
};
