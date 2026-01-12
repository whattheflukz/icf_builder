// Block Factory - Creates 3D geometries for all ICF block types
// Based on ElementICF specifications
import * as THREE from 'three';
import { ICFBlockType, ICFCoreThickness, ICFBlock } from '../types/project';
import { ICF_BLOCK_CATALOG } from '../data/icfCatalog';

// Material presets
const FOAM_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0xe8e8e8, // Light gray EPS foam color
    roughness: 0.9,
    metalness: 0.0
});

const GHOST_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x4a90d9,
    transparent: true,
    opacity: 0.4,
    roughness: 0.5
});

const SELECTED_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x4a90d9,
    roughness: 0.6,
    metalness: 0.1,
    emissive: 0x1a4a7a,
    emissiveIntensity: 0.3
});

export class BlockFactory {
    private geometryCache: Map<string, THREE.BufferGeometry> = new Map();

    // Create an ICF block mesh
    createBlock(block: ICFBlock, isGhost = false, isSelected = false): THREE.Mesh {
        const spec = ICF_BLOCK_CATALOG[block.type];
        const width = spec.getWidth(block.coreThickness);
        const geometry = this.getOrCreateGeometry(block.type, block.coreThickness);

        let material: THREE.Material;
        if (isGhost) {
            material = GHOST_MATERIAL;
        } else if (isSelected) {
            material = SELECTED_MATERIAL;
        } else if (block.color) {
            material = new THREE.MeshStandardMaterial({
                color: block.color,
                roughness: 0.9,
                metalness: 0.0
            });
        } else {
            material = FOAM_MATERIAL.clone();
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(block.position.x, block.position.y + spec.height / 2, block.position.z);
        mesh.rotation.y = THREE.MathUtils.degToRad(block.rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'icfBlock', blockId: block.id, blockData: block };

        // Add web lines for visual detail (except for ghost)
        if (!isGhost) {
            this.addWebIndicators(mesh, block.type, block.coreThickness);
        }

        return mesh;
    }

    private getOrCreateGeometry(type: ICFBlockType, core: ICFCoreThickness): THREE.BufferGeometry {
        const key = `${type}-${core}`;

        if (this.geometryCache.has(key)) {
            return this.geometryCache.get(key)!;
        }

        const spec = ICF_BLOCK_CATALOG[type];
        const width = spec.getWidth(core);
        let geometry: THREE.BufferGeometry;

        switch (type) {
            case 'corner90':
                geometry = this.createCorner90Geometry(spec.height, spec.longLeg!, spec.shortLeg!, width);
                break;
            case 'corner45':
                geometry = this.createCorner45Geometry(spec.height, spec.longLeg!, width);
                break;
            case 'taperTop':
                geometry = this.createTaperTopGeometry(spec.height, spec.length, width);
                break;
            case 'brickLedge':
                geometry = this.createBrickLedgeGeometry(spec.height, spec.length, width);
                break;
            default:
                // Standard rectangular block: length x height x width
                geometry = new THREE.BoxGeometry(spec.length, spec.height, width);
        }

        this.geometryCache.set(key, geometry);
        return geometry;
    }

    /**
     * Creates accurate 90° corner block geometry
     * Based on ElementICF specs: Long leg 38.5", Short leg 22.5"
     * 
     * The L-shape viewed from above (looking down):
     * 
     *     shortLeg (22.5")
     *     ←─────────→
     *     ┌─────────┐ ↑
     *     │         │ │ width
     *     │    ┌────┘ ↓
     *     │    │      
     *     │    │  ↑
     *     │    │  │ longLeg (38.5")
     *     │    │  │
     *     │    │  ↓
     *     └────┘
     *     ←──→
     *     width
     */
    private createCorner90Geometry(
        height: number,
        longLeg: number,
        shortLeg: number,
        width: number
    ): THREE.BufferGeometry {
        // Create L-shape in XZ plane, then extrude upward
        const shape = new THREE.Shape();

        // Start at origin (bottom-left of the L)
        // Drawing the L-shape clockwise from bottom-left
        shape.moveTo(0, 0);
        shape.lineTo(width, 0);              // Bottom edge of short leg
        shape.lineTo(width, longLeg - width); // Up the inside of the long leg
        shape.lineTo(shortLeg, longLeg - width); // Across to the inside corner
        shape.lineTo(shortLeg, longLeg);      // Up to top of long leg
        shape.lineTo(0, longLeg);             // Across the top
        shape.closePath();

        const extrudeSettings = {
            depth: height,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Rotate so Y is up (extrusion was in Z, we want it in Y)
        geometry.rotateX(-Math.PI / 2);

        // Center the geometry vertically (Y axis) and at corner point (XZ)
        // Y: -height/2 centers the geometry so it goes from -height/2 to +height/2
        // Z: After rotation, Z range is [-longLeg, 0]. To center, we must ADD longLeg/2.
        geometry.translate(-width / 2, -height / 2, longLeg / 2);

        return geometry;
    }

    /**
     * Creates 45° corner block geometry
     */
    private createCorner45Geometry(
        height: number,
        legLength: number,
        width: number
    ): THREE.BufferGeometry {
        // Simple L-shape for 45 corner for now
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(legLength, 0);
        shape.lineTo(legLength, width);
        shape.lineTo(width, width);
        shape.lineTo(width, legLength);
        shape.lineTo(0, legLength);
        shape.closePath();

        const extrudeSettings = {
            depth: height,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);

        // Center vertically (Y) and horizontally (X, Z)
        // Z translation fixed to +legLength/2 to correct coordinate rotation offset
        geometry.translate(-legLength / 2, -height / 2, legLength / 2);

        return geometry;
    }

    /**
     * Creates Taper Top block - wider at top for floor/roof bearing
     */
    private createTaperTopGeometry(
        height: number,
        length: number,
        widthTop: number
    ): THREE.BufferGeometry {
        const widthBottom = widthTop - 4; // 4" narrower at bottom

        // Create trapezoid cross-section
        const shape = new THREE.Shape();
        shape.moveTo(-length / 2, -widthBottom / 2);
        shape.lineTo(length / 2, -widthBottom / 2);
        shape.lineTo(length / 2, widthBottom / 2);
        shape.lineTo(-length / 2, widthBottom / 2);
        shape.closePath();

        // For simplicity, use a box - can enhance later with actual taper
        const geometry = new THREE.BoxGeometry(length, height, widthTop);
        return geometry;
    }

    /**
     * Creates Brick Ledge block - has a ledge for brick veneer
     */
    private createBrickLedgeGeometry(
        height: number,
        length: number,
        width: number
    ): THREE.BufferGeometry {
        // Brick ledge has a step - 13.5" at bottom, 17.375" at top
        const bottomWidth = 13.5;
        const ledgeWidth = 4; // ~4" ledge for brick

        // Create stepped cross-section
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(bottomWidth, 0);
        shape.lineTo(bottomWidth, height * 0.75); // Ledge starts at 75% height
        shape.lineTo(bottomWidth + ledgeWidth, height * 0.75);
        shape.lineTo(bottomWidth + ledgeWidth, height);
        shape.lineTo(0, height);
        shape.closePath();

        const extrudeSettings = {
            depth: length,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateY(Math.PI / 2);
        geometry.translate(-length / 2, 0, -width / 2);

        return geometry;
    }

    /**
     * Add web indicator lines to show polypropylene web positions
     * Webs are spaced 8" horizontally in ElementICF blocks
     */
    private addWebIndicators(mesh: THREE.Mesh, type: ICFBlockType, core: ICFCoreThickness): void {
        const spec = ICF_BLOCK_CATALOG[type];
        const width = spec.getWidth(core);
        const height = spec.height;
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x999999, linewidth: 1 });

        if (type === 'standard' || type === 'heightAdjuster' || type === 'taperTop') {
            const length = spec.length;
            const webSpacing = 8;
            const numWebs = Math.floor(length / webSpacing) + 1;

            for (let i = 0; i < numWebs; i++) {
                const x = -length / 2 + i * webSpacing;

                // Front face web lines
                const pointsFront = [
                    new THREE.Vector3(x, -height / 2, width / 2 + 0.1),
                    new THREE.Vector3(x, height / 2, width / 2 + 0.1)
                ];
                const lineFront = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(pointsFront),
                    lineMaterial
                );
                mesh.add(lineFront);

                // Back face web lines
                const pointsBack = [
                    new THREE.Vector3(x, -height / 2, -width / 2 - 0.1),
                    new THREE.Vector3(x, height / 2, -width / 2 - 0.1)
                ];
                const lineBack = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(pointsBack),
                    lineMaterial
                );
                mesh.add(lineBack);
            }
        }
        // Corner blocks would need different web patterns - omitting for simplicity
    }

    // Create ghost preview block at position
    createGhostBlock(
        type: ICFBlockType,
        core: ICFCoreThickness,
        position: THREE.Vector3,
        rotation: number
    ): THREE.Mesh {
        const tempBlock: ICFBlock = {
            id: 'ghost',
            type,
            coreThickness: core,
            position: { x: position.x, y: position.y, z: position.z },
            rotation
        };
        return this.createBlock(tempBlock, true);
    }

    dispose(): void {
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
    }
}

// Singleton instance
export const blockFactory = new BlockFactory();
