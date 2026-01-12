// Block Snapping Utility - Edge-to-edge snapping for ICF blocks
import * as THREE from 'three';
import { ICFBlock, ICFBlockType, ICFCoreThickness } from '../types/project';
import { ICF_BLOCK_CATALOG } from '../data/icfCatalog';

interface BlockBounds {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    rotation: number;
}

interface SnapResult {
    position: THREE.Vector3;
    snappedToBlock: boolean;
    snappedBlockId?: string;
    snapEdge?: 'left' | 'right' | 'front' | 'back';
}

const SNAP_THRESHOLD = 150; // Snap when within 150 inches of another block edge (increased for isometric camera)

/**
 * Gets the bounding box of a block in world coordinates
 */
export function getBlockBounds(block: ICFBlock): BlockBounds {
    const spec = ICF_BLOCK_CATALOG[block.type];
    const width = spec.getWidth(block.coreThickness);
    const pos = block.position;
    const rotation = block.rotation;

    // For standard rectangular blocks
    if (block.type === 'standard' || block.type === 'taperTop' ||
        block.type === 'brickLedge' || block.type === 'heightAdjuster') {
        const halfLength = spec.length / 2;
        const halfWidth = width / 2;

        if (rotation === 0 || rotation === 180) {
            // Block aligned along X axis
            return {
                minX: pos.x - halfLength,
                maxX: pos.x + halfLength,
                minZ: pos.z - halfWidth,
                maxZ: pos.z + halfWidth,
                rotation
            };
        } else {
            // Block aligned along Z axis (rotated 90 or 270)
            return {
                minX: pos.x - halfWidth,
                maxX: pos.x + halfWidth,
                minZ: pos.z - halfLength,
                maxZ: pos.z + halfLength,
                rotation
            };
        }
    }

    // For 90° corner blocks - geometry is centered, NOT at outside corner
    // The geometry translate is: (-width/2, -height/2, -longLeg/2)
    // So the block position is at the CENTER of the L-shape's bounding box
    if (block.type === 'corner90') {
        const longLeg = spec.longLeg || 38.5;
        const shortLeg = spec.shortLeg || 22.5;

        // After rotation, the bounds change based on where the L-shape extends
        // The geometry extends: 
        // - In X from -width/2 to shortLeg - width/2 (i.e., shortLeg total in X)
        // - In Z from -longLeg/2 to longLeg/2 (i.e., longLeg total in Z, centered)
        // But wait, the shape is L-shaped, so it's not a simple rectangle

        // For bounds purposes, use the bounding box of the L-shape
        // The L-shape after translate extends:
        // X: from -width/2 to (shortLeg - width/2) 
        // Z: from -longLeg/2 to longLeg/2
        // But the actual shape doesn't fill the whole rectangle

        // For simple snapping, use the bounding rectangle of the L
        const halfWidth = width / 2;

        switch (rotation) {
            case 0:
                // L-shape: bottom-left corner at origin in local space
                // After geometry.translate(-width/2, -, -longLeg/2), the shape is:
                // X: -width/2 to shortLeg - width/2
                // Z: -longLeg/2 to longLeg/2
                return {
                    minX: pos.x - halfWidth,
                    maxX: pos.x + shortLeg - halfWidth,
                    minZ: pos.z - longLeg / 2,
                    maxZ: pos.z + longLeg / 2,
                    rotation
                };
            case 90:
                // Rotated 90° clockwise around Y
                return {
                    minX: pos.x - longLeg / 2,
                    maxX: pos.x + longLeg / 2,
                    minZ: pos.z - shortLeg + halfWidth,
                    maxZ: pos.z + halfWidth,
                    rotation
                };
            case 180:
                // Rotated 180°
                return {
                    minX: pos.x - shortLeg + halfWidth,
                    maxX: pos.x + halfWidth,
                    minZ: pos.z - longLeg / 2,
                    maxZ: pos.z + longLeg / 2,
                    rotation
                };
            case 270:
                // Rotated 270°
                return {
                    minX: pos.x - longLeg / 2,
                    maxX: pos.x + longLeg / 2,
                    minZ: pos.z - halfWidth,
                    maxZ: pos.z + shortLeg - halfWidth,
                    rotation
                };
            default:
                return {
                    minX: pos.x - halfWidth,
                    maxX: pos.x + shortLeg - halfWidth,
                    minZ: pos.z - longLeg / 2,
                    maxZ: pos.z + longLeg / 2,
                    rotation
                };
        }
    }

    // For 45° corner blocks
    if (block.type === 'corner45') {
        const legLength = spec.longLeg || 32;

        // Similar to 90° but with equal legs
        switch (rotation) {
            case 0:
                return {
                    minX: pos.x,
                    maxX: pos.x + legLength,
                    minZ: pos.z,
                    maxZ: pos.z + legLength,
                    rotation
                };
            case 90:
                return {
                    minX: pos.x,
                    maxX: pos.x + legLength,
                    minZ: pos.z - legLength,
                    maxZ: pos.z,
                    rotation
                };
            case 180:
                return {
                    minX: pos.x - legLength,
                    maxX: pos.x,
                    minZ: pos.z - legLength,
                    maxZ: pos.z,
                    rotation
                };
            case 270:
                return {
                    minX: pos.x - legLength,
                    maxX: pos.x,
                    minZ: pos.z,
                    maxZ: pos.z + legLength,
                    rotation
                };
            default:
                return {
                    minX: pos.x,
                    maxX: pos.x + legLength,
                    minZ: pos.z,
                    maxZ: pos.z + legLength,
                    rotation
                };
        }
    }

    // Fallback
    return {
        minX: pos.x - 24,
        maxX: pos.x + 24,
        minZ: pos.z - 7,
        maxZ: pos.z + 7,
        rotation
    };
}

/**
 * Calculates the anchor offset for a block type (how much to offset from click point)
 */
export function getBlockAnchorOffset(
    type: ICFBlockType,
    core: ICFCoreThickness,
    rotation: number
): { x: number; z: number } {
    const spec = ICF_BLOCK_CATALOG[type];
    const width = spec.getWidth(core);

    // For standard rectangular blocks, anchor is at center (no offset needed for grid snapping)
    if (type === 'standard' || type === 'taperTop' ||
        type === 'brickLedge' || type === 'heightAdjuster') {
        return { x: 0, z: 0 };
    }

    // For corner blocks, we want to offset so the outside corner lands on the grid
    // But we keep the geometry at origin, so no offset needed
    return { x: 0, z: 0 };
}

/**
 * Defines a snap-able face on a block
 */
interface BlockFace {
    // Center position of the face in world coordinates
    centerX: number;
    centerZ: number;
    // Position of the face plane (constant coordinate)
    plane: number;
    // Orientation of the face (normal direction)
    orientation: 'minX' | 'maxX' | 'minZ' | 'maxZ';
    // Dimensions for validation (optional)
    width?: number;
}

/**
 * Defines a face offset for a new block (relative to block center)
 */
interface FaceOffset {
    // Offset of the face center from block center
    offsetX: number;
    offsetZ: number;
    // Offset of the face plane from block center
    planeOffset: number;
    orientation: 'minX' | 'maxX' | 'minZ' | 'maxZ';
}

/**
 * Get snap faces for an existing block in world coordinates
 */
function getBlockFaces(block: ICFBlock): BlockFace[] {
    const spec = ICF_BLOCK_CATALOG[block.type];
    const width = spec.getWidth(block.coreThickness);
    const halfWidth = width / 2;
    const pos = block.position;
    const faces: BlockFace[] = [];

    // Standard Blocks
    if (block.type === 'standard' || block.type === 'taperTop' ||
        block.type === 'brickLedge' || block.type === 'heightAdjuster') {
        const length = spec.length;
        const halfLength = length / 2;

        if (block.rotation === 0 || block.rotation === 180) {
            // X-aligned
            faces.push({ centerX: pos.x - halfLength, centerZ: pos.z, plane: pos.x - halfLength, orientation: 'minX' });
            faces.push({ centerX: pos.x + halfLength, centerZ: pos.z, plane: pos.x + halfLength, orientation: 'maxX' });
            faces.push({ centerX: pos.x, centerZ: pos.z - halfWidth, plane: pos.z - halfWidth, orientation: 'minZ' });
            faces.push({ centerX: pos.x, centerZ: pos.z + halfWidth, plane: pos.z + halfWidth, orientation: 'maxZ' });
        } else {
            // Z-aligned
            faces.push({ centerX: pos.x - halfWidth, centerZ: pos.z, plane: pos.x - halfWidth, orientation: 'minX' });
            faces.push({ centerX: pos.x + halfWidth, centerZ: pos.z, plane: pos.x + halfWidth, orientation: 'maxX' });
            faces.push({ centerX: pos.x, centerZ: pos.z - halfLength, plane: pos.z - halfLength, orientation: 'minZ' });
            faces.push({ centerX: pos.x, centerZ: pos.z + halfLength, plane: pos.z + halfLength, orientation: 'maxZ' });
        }
        return faces;
    }

    // Corner Blocks
    if (block.type === 'corner90') {
        const longLeg = spec.longLeg || 38.5;
        const shortLeg = spec.shortLeg || 22.5;
        const halfLongLeg = longLeg / 2;

        switch (block.rotation) {
            case 0:
                // Left Face (Long Leg Outer) - minX
                faces.push({
                    centerX: pos.x - halfWidth,
                    centerZ: pos.z,
                    plane: pos.x - halfWidth,
                    orientation: 'minX'
                });

                // Right Face (Short Leg End) - maxX
                faces.push({
                    centerX: pos.x + shortLeg - halfWidth,
                    centerZ: pos.z - halfLongLeg + halfWidth,
                    plane: pos.x + shortLeg - halfWidth,
                    orientation: 'maxX'
                });

                // Back Face (Short Leg Outer) - minZ
                faces.push({
                    centerX: pos.x - halfWidth + shortLeg / 2,
                    centerZ: pos.z - halfLongLeg,
                    plane: pos.z - halfLongLeg,
                    orientation: 'minZ'
                });

                // Front Face (Long Leg End) - maxZ
                faces.push({
                    centerX: pos.x,
                    centerZ: pos.z + halfLongLeg,
                    plane: pos.z + halfLongLeg,
                    orientation: 'maxZ'
                });
                break;

            case 90:
                faces.push({
                    centerX: pos.x - halfLongLeg,
                    centerZ: pos.z + halfWidth - shortLeg / 2,
                    plane: pos.x - halfLongLeg,
                    orientation: 'minX'
                });

                faces.push({
                    centerX: pos.x + halfLongLeg,
                    centerZ: pos.z,
                    plane: pos.x + halfLongLeg,
                    orientation: 'maxX'
                });

                faces.push({
                    centerX: pos.x - halfLongLeg + halfWidth,
                    centerZ: pos.z - shortLeg + halfWidth,
                    plane: pos.z - shortLeg + halfWidth,
                    orientation: 'minZ'
                });

                faces.push({
                    centerX: pos.x,
                    centerZ: pos.z + halfWidth,
                    plane: pos.z + halfWidth,
                    orientation: 'maxZ'
                });
                break;

            case 180:
                faces.push({
                    centerX: pos.x - shortLeg + halfWidth,
                    centerZ: pos.z + halfLongLeg - halfWidth,
                    plane: pos.x - shortLeg + halfWidth,
                    orientation: 'minX'
                });

                faces.push({
                    centerX: pos.x + halfWidth,
                    centerZ: pos.z,
                    plane: pos.x + halfWidth,
                    orientation: 'maxX'
                });

                faces.push({
                    centerX: pos.x,
                    centerZ: pos.z - halfLongLeg,
                    plane: pos.z - halfLongLeg,
                    orientation: 'minZ'
                });

                faces.push({
                    centerX: pos.x + halfWidth - shortLeg / 2,
                    centerZ: pos.z + halfLongLeg,
                    plane: pos.z + halfLongLeg,
                    orientation: 'maxZ'
                });
                break;

            case 270:
                faces.push({
                    centerX: pos.x - halfLongLeg,
                    centerZ: pos.z,
                    plane: pos.x - halfLongLeg,
                    orientation: 'minX'
                });

                faces.push({
                    centerX: pos.x + halfLongLeg,
                    centerZ: pos.z - halfWidth + shortLeg / 2,
                    plane: pos.x + halfLongLeg,
                    orientation: 'maxX'
                });

                faces.push({
                    centerX: pos.x,
                    centerZ: pos.z - halfWidth,
                    plane: pos.z - halfWidth,
                    orientation: 'minZ'
                });

                faces.push({
                    centerX: pos.x + halfLongLeg - halfWidth,
                    centerZ: pos.z + shortLeg - halfWidth,
                    plane: pos.z + shortLeg - halfWidth,
                    orientation: 'maxZ'
                });
                break;
        }
        return faces;
    }

    // Default Fallback
    const bounds = getBlockBounds(block);
    return [
        { centerX: bounds.minX, centerZ: (bounds.minZ + bounds.maxZ) / 2, plane: bounds.minX, orientation: 'minX' },
        { centerX: bounds.maxX, centerZ: (bounds.minZ + bounds.maxZ) / 2, plane: bounds.maxX, orientation: 'maxX' },
        { centerX: (bounds.minX + bounds.maxX) / 2, centerZ: bounds.minZ, plane: bounds.minZ, orientation: 'minZ' },
        { centerX: (bounds.minX + bounds.maxX) / 2, centerZ: bounds.maxZ, plane: bounds.maxZ, orientation: 'maxZ' }
    ];
}

/**
 * Get the ACTUAL face positions for a corner block (the outer faces of the L-shape)
 * This is different from the bounding box because the L-shape has inner space
 */
/**
 * Get face offsets for a new block (relative to 0,0)
 */
function getBlockFaceOffsets(type: ICFBlockType, core: ICFCoreThickness, rotation: number): FaceOffset[] {
    const spec = ICF_BLOCK_CATALOG[type];
    const width = spec.getWidth(core);
    const halfWidth = width / 2;
    const offsets: FaceOffset[] = [];

    if (type === 'standard' || type === 'taperTop' || type === 'brickLedge' || type === 'heightAdjuster') {
        const halfLength = spec.length / 2;
        if (rotation === 0 || rotation === 180) {
            offsets.push({ offsetX: -halfLength, offsetZ: 0, planeOffset: -halfLength, orientation: 'minX' });
            offsets.push({ offsetX: halfLength, offsetZ: 0, planeOffset: halfLength, orientation: 'maxX' });
            offsets.push({ offsetX: 0, offsetZ: -halfWidth, planeOffset: -halfWidth, orientation: 'minZ' });
            offsets.push({ offsetX: 0, offsetZ: halfWidth, planeOffset: halfWidth, orientation: 'maxZ' });
        } else {
            offsets.push({ offsetX: -halfWidth, offsetZ: 0, planeOffset: -halfWidth, orientation: 'minX' });
            offsets.push({ offsetX: halfWidth, offsetZ: 0, planeOffset: halfWidth, orientation: 'maxX' });
            offsets.push({ offsetX: 0, offsetZ: -halfLength, planeOffset: -halfLength, orientation: 'minZ' });
            offsets.push({ offsetX: 0, offsetZ: halfLength, planeOffset: halfLength, orientation: 'maxZ' });
        }
        return offsets;
    }

    if (type === 'corner90') {
        const longLeg = spec.longLeg || 38.5;
        const shortLeg = spec.shortLeg || 22.5;
        const halfLongLeg = longLeg / 2;

        // Similar logic to getBlockFaces but centered at 0
        switch (rotation) {
            case 0:
                offsets.push({ offsetX: -halfWidth, offsetZ: 0, planeOffset: -halfWidth, orientation: 'minX' });
                offsets.push({ offsetX: shortLeg - halfWidth, offsetZ: -halfLongLeg + halfWidth, planeOffset: shortLeg - halfWidth, orientation: 'maxX' });
                offsets.push({ offsetX: -halfWidth + shortLeg / 2, offsetZ: -halfLongLeg, planeOffset: -halfLongLeg, orientation: 'minZ' });
                offsets.push({ offsetX: 0, offsetZ: halfLongLeg, planeOffset: halfLongLeg, orientation: 'maxZ' });
                break;
            case 90:
                offsets.push({ offsetX: -halfLongLeg, offsetZ: halfWidth - shortLeg / 2, planeOffset: -halfLongLeg, orientation: 'minX' });
                offsets.push({ offsetX: halfLongLeg, offsetZ: 0, planeOffset: halfLongLeg, orientation: 'maxX' });
                offsets.push({ offsetX: -halfLongLeg + halfWidth, offsetZ: -shortLeg + halfWidth, planeOffset: -shortLeg + halfWidth, orientation: 'minZ' });
                offsets.push({ offsetX: 0, offsetZ: halfWidth, planeOffset: halfWidth, orientation: 'maxZ' });
                break;
            case 180:
                offsets.push({ offsetX: -shortLeg + halfWidth, offsetZ: halfLongLeg - halfWidth, planeOffset: -shortLeg + halfWidth, orientation: 'minX' });
                offsets.push({ offsetX: halfWidth, offsetZ: 0, planeOffset: halfWidth, orientation: 'maxX' });
                offsets.push({ offsetX: 0, offsetZ: -halfLongLeg, planeOffset: -halfLongLeg, orientation: 'minZ' });
                offsets.push({ offsetX: halfWidth - shortLeg / 2, offsetZ: halfLongLeg, planeOffset: halfLongLeg, orientation: 'maxZ' });
                break;
            case 270:
                offsets.push({ offsetX: -halfLongLeg, offsetZ: 0, planeOffset: -halfLongLeg, orientation: 'minX' });
                offsets.push({ offsetX: halfLongLeg, offsetZ: -halfWidth + shortLeg / 2, planeOffset: halfLongLeg, orientation: 'maxX' });
                offsets.push({ offsetX: 0, offsetZ: -halfWidth, planeOffset: -halfWidth, orientation: 'minZ' });
                offsets.push({ offsetX: halfLongLeg - halfWidth, offsetZ: shortLeg - halfWidth, planeOffset: shortLeg - halfWidth, orientation: 'maxZ' });
                break;
        }
        return offsets;
    }

    // Fallback
    return [
        { offsetX: -24, offsetZ: 0, planeOffset: -24, orientation: 'minX' },
        { offsetX: 24, offsetZ: 0, planeOffset: 24, orientation: 'maxX' },
        { offsetX: 0, offsetZ: -7, planeOffset: -7, orientation: 'minZ' },
        { offsetX: 0, offsetZ: 7, planeOffset: 7, orientation: 'maxZ' }
    ];
}

/**
 * Face-to-face snapping: searches specifically for face alignments including corner geometry 
 */
export function snapBlockPosition(
    rawPosition: THREE.Vector3,
    blockType: ICFBlockType,
    coreThickness: ICFCoreThickness,
    rotation: number,
    existingBlocks: ICFBlock[],
    gridSize: number = 8
): SnapResult {
    const newFaceOffsets = getBlockFaceOffsets(blockType, coreThickness, rotation);

    let bestSnapPosition = rawPosition.clone();
    let closestDistance = Infinity;
    let snappedToBlock = false;
    let snappedBlockId: string | undefined;
    let snapEdge: 'left' | 'right' | 'front' | 'back' | undefined;

    const y = rawPosition.y;

    for (const existingBlock of existingBlocks) {
        const exFaces = getBlockFaces(existingBlock);

        for (const exFace of exFaces) {
            for (const newFace of newFaceOffsets) {
                // Check if faces oppose each other (optional, but good for validity)
                // e.g. minX touches maxX
                let validPair = false;
                if (exFace.orientation === 'maxX' && newFace.orientation === 'minX') validPair = true;
                if (exFace.orientation === 'minX' && newFace.orientation === 'maxX') validPair = true;
                if (exFace.orientation === 'maxZ' && newFace.orientation === 'minZ') validPair = true;
                if (exFace.orientation === 'minZ' && newFace.orientation === 'maxZ') validPair = true;

                if (!validPair) continue;

                // Calculate where the new block center would be if these faces touched

                let snapX = rawPosition.x;
                let snapZ = rawPosition.z;

                // Case 1: X-plane targets (minX / maxX faces)
                if (exFace.orientation === 'minX' || exFace.orientation === 'maxX') {
                    // Logic: The FACES touch.
                    // C_new + D_new = P_ex => C_new = P_ex - D_new
                    snapX = exFace.plane - newFace.planeOffset;

                    // Z-alignment: Align the CENTERS of the touching faces.
                    // C_new_Z + Z_off_new = Z_ex => C_new_Z = Z_ex - Z_off_new
                    snapZ = exFace.centerZ - newFace.offsetZ;

                } else {
                    // Case 2: Z-plane targets (minZ / maxZ faces)
                    snapZ = exFace.plane - newFace.planeOffset;

                    // X-alignment
                    snapX = exFace.centerX - newFace.offsetX;
                }

                // Check distance from cursor
                const dist = Math.sqrt(
                    Math.pow(rawPosition.x - snapX, 2) +
                    Math.pow(rawPosition.z - snapZ, 2)
                );

                if (dist < SNAP_THRESHOLD && dist < closestDistance) {
                    closestDistance = dist;
                    bestSnapPosition = new THREE.Vector3(snapX, y, snapZ);
                    snappedToBlock = true;
                    snappedBlockId = existingBlock.id;

                    // Map orientation to edge name
                    if (newFace.orientation === 'minX') snapEdge = 'left';
                    else if (newFace.orientation === 'maxX') snapEdge = 'right';
                    else if (newFace.orientation === 'minZ') snapEdge = 'back';
                    else if (newFace.orientation === 'maxZ') snapEdge = 'front';
                }
            }
        }
    }

    // If we didn't snap to a block, snap to grid
    if (!snappedToBlock) {
        bestSnapPosition = new THREE.Vector3(
            Math.round(rawPosition.x / gridSize) * gridSize,
            Math.round(rawPosition.y / 16) * 16,
            Math.round(rawPosition.z / gridSize) * gridSize
        );
    }

    return {
        position: bestSnapPosition,
        snappedToBlock,
        snappedBlockId,
        snapEdge
    };
}



/**
 * Simple grid snap (fallback)
 */
export function snapToGrid(position: THREE.Vector3, gridSize: number = 8): THREE.Vector3 {
    return new THREE.Vector3(
        Math.round(position.x / gridSize) * gridSize,
        Math.round(position.y / 16) * 16,
        Math.round(position.z / gridSize) * gridSize
    );
}
