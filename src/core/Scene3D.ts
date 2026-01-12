// 3D Scene Management for ICF Home Designer
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Scene3D {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;
    public raycaster: THREE.Raycaster;
    public mouse: THREE.Vector2;

    private gridHelper: THREE.GridHelper;
    private groundPlane: THREE.Mesh;

    constructor(container: HTMLElement) {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            1,
            10000
        );
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 2000;

        // Raycaster for picking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Lighting
        this.setupLighting();

        // Grid and ground
        this.gridHelper = this.createGrid();
        this.groundPlane = this.createGroundPlane();

        // Handle resize
        window.addEventListener('resize', () => this.onResize(container));

        // Start animation loop
        this.animate();
    }

    private setupLighting(): void {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Main directional light (sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 100);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        this.scene.add(dirLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-100, 100, -100);
        this.scene.add(fillLight);

        // Hemisphere light for sky/ground color
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d3d3d, 0.3);
        this.scene.add(hemiLight);
    }

    private createGrid(): THREE.GridHelper {
        // Grid in inches, 8" spacing (matches ICF web spacing)
        const gridSize = 800; // 800 inches = ~66 feet
        const divisions = gridSize / 8;
        const grid = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x333333);
        grid.position.y = 0.1;
        this.scene.add(grid);
        return grid;
    }

    private createGroundPlane(): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(2000, 2000);
        const material = new THREE.MeshStandardMaterial({
            color: 0x2d2d44,
            roughness: 0.9,
            metalness: 0.1
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0;
        plane.receiveShadow = true;
        plane.name = 'ground';
        this.scene.add(plane);
        return plane;
    }

    private onResize(container: HTMLElement): void {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Get mouse position in 3D space on the ground plane
    public getGroundIntersection(event: MouseEvent, container: HTMLElement): THREE.Vector3 | null {
        const rect = container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundPlane);

        if (intersects.length > 0) {
            return intersects[0].point;
        }
        return null;
    }

    // Snap position to grid (8" increments for X/Z, 16" for Y)
    public snapToGrid(position: THREE.Vector3): THREE.Vector3 {
        return new THREE.Vector3(
            Math.round(position.x / 8) * 8,
            Math.round(position.y / 16) * 16,
            Math.round(position.z / 8) * 8
        );
    }

    // Get all intersected objects (for selection)
    public getIntersectedObjects(event: MouseEvent, container: HTMLElement, objects: THREE.Object3D[]): THREE.Intersection[] {
        const rect = container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true);
    }

    public dispose(): void {
        this.renderer.dispose();
        this.controls.dispose();
    }
}
