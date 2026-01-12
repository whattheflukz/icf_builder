// Main Application Entry Point - ICF Home Designer
import './style.css';
import * as THREE from 'three';
import { Scene3D } from './core/Scene3D';
import { blockFactory } from './elements/BlockFactory';
import { projectState } from './state/ProjectState';
import { calculateProjectCosts, formatCurrency } from './utils/CostCalculator';
import { snapBlockPosition, snapToGrid } from './utils/BlockSnapping';
import { ICF_BLOCK_CATALOG, CORE_THICKNESS_OPTIONS } from './data/icfCatalog';
import { EQUIPMENT_CATALOG, CABINET_CATALOG, WINDOW_CATALOG } from './data/materialsCatalog';
import { ICFBlockType, ICFCoreThickness, ElementCategory } from './types/project';

class ICFHomeDesigner {
  private scene3D!: Scene3D;
  private container!: HTMLElement;
  private ghostMesh: THREE.Mesh | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Create UI structure
    this.createUI();

    // Initialize 3D scene
    this.container = document.getElementById('viewport')!;
    this.scene3D = new Scene3D(this.container);

    // Set up event listeners
    this.setupEventListeners();

    // Subscribe to state changes
    projectState.onChange(() => this.onProjectChange());

    // Try to load saved project
    projectState.loadFromLocalStorage();

    // Initial render
    this.rebuildScene();
    this.updateUI();
  }

  private createUI(): void {
    document.body.innerHTML = `
      <div id="app">
        <header id="header">
          <div class="logo">
            <span class="logo-icon">🏠</span>
            <span class="logo-text">ICF Home Designer</span>
          </div>
          <div class="header-actions">
            <button id="btn-new" class="btn btn-secondary">New</button>
            <button id="btn-save" class="btn btn-secondary">Save</button>
            <button id="btn-load" class="btn btn-secondary">Load</button>
            <button id="btn-export-json" class="btn btn-primary">Export JSON</button>
            <button id="btn-import-json" class="btn btn-primary">Import JSON</button>
          </div>
        </header>
        
        <div id="main-content">
          <aside id="left-panel">
            <div class="panel-section">
              <h3>Tools</h3>
              <div class="tool-buttons">
                <button class="tool-btn active" data-tool="place" title="Place (P)">
                  <span>➕</span> Place
                </button>
                <button class="tool-btn" data-tool="select" title="Select (V)">
                  <span>👆</span> Select
                </button>
                <button class="tool-btn" data-tool="delete" title="Delete (X)">
                  <span>🗑️</span> Delete
                </button>
              </div>
            </div>
            
            <div class="panel-section">
              <h3>Category</h3>
              <div class="category-tabs">
                <button class="cat-btn active" data-category="icf">ICF</button>
                <button class="cat-btn" data-category="equipment">Equip</button>
                <button class="cat-btn" data-category="cabinets">Cabs</button>
                <button class="cat-btn" data-category="openings">Open</button>
              </div>
            </div>
            
            <div class="panel-section" id="icf-options">
              <h3>ICF Block Type</h3>
              <div class="block-types" id="block-types"></div>
              
              <h3>Core Thickness</h3>
              <div class="core-options" id="core-options"></div>
            </div>
            
            <div class="panel-section hidden" id="equipment-options">
              <h3>Equipment</h3>
              <div class="element-list" id="equipment-list"></div>
            </div>
            
            <div class="panel-section hidden" id="cabinet-options">
              <h3>Cabinets</h3>
              <div class="element-list" id="cabinet-list"></div>
            </div>
            
            <div class="panel-section hidden" id="opening-options">
              <h3>Windows & Doors</h3>
              <div class="element-list" id="opening-list"></div>
            </div>
            
            <div class="panel-section">
              <h3>Rotation</h3>
              <button id="btn-rotate" class="btn btn-full">Rotate 90° (R)</button>
              <div class="rotation-display">Current: <span id="rotation-value">0°</span></div>
            </div>
          </aside>
          
          <main id="viewport"></main>
          
          <aside id="right-panel">
            <div class="panel-section">
              <h3>Project Info</h3>
              <div class="info-grid">
                <label>ICF Blocks:</label>
                <span id="stat-blocks">0</span>
                <label>Wall Area:</label>
                <span id="stat-area">0 sq ft</span>
              </div>
            </div>
            
            <div class="panel-section">
              <h3>Cost Estimate</h3>
              <div class="cost-multiplier">
                <label>Price Multiplier:</label>
                <input type="number" id="cost-multiplier" value="1.0" min="0.5" max="3" step="0.1">
              </div>
              <div id="cost-breakdown"></div>
              <div class="cost-total">
                <strong>Total:</strong>
                <span id="cost-total">$0</span>
              </div>
            </div>
            
            <div class="panel-section">
              <h3>Layers</h3>
              <div id="layer-toggles"></div>
            </div>
          </aside>
        </div>
        
        <div id="status-bar">
          <span id="status-text">Ready - Click to place blocks</span>
          <span id="position-display">X: 0 Y: 0 Z: 0</span>
        </div>
      </div>
      
      <!-- Hidden file input for import -->
      <input type="file" id="file-input" accept=".json" style="display: none;">
    `;

    // Populate ICF block types
    const blockTypesContainer = document.getElementById('block-types')!;
    Object.entries(ICF_BLOCK_CATALOG).forEach(([type, spec]) => {
      const btn = document.createElement('button');
      btn.className = `block-type-btn ${type === 'standard' ? 'active' : ''}`;
      btn.dataset.type = type;
      btn.innerHTML = `<span class="block-icon">${this.getBlockIcon(type as ICFBlockType)}</span>${spec.name}`;
      blockTypesContainer.appendChild(btn);
    });

    // Populate core thickness options
    const coreContainer = document.getElementById('core-options')!;
    CORE_THICKNESS_OPTIONS.forEach(core => {
      const btn = document.createElement('button');
      btn.className = `core-btn ${core === 8 ? 'active' : ''}`;
      btn.dataset.core = core.toString();
      btn.textContent = `${core}"`;
      coreContainer.appendChild(btn);
    });

    // Populate equipment list
    const equipList = document.getElementById('equipment-list')!;
    Object.entries(EQUIPMENT_CATALOG).forEach(([type, spec]) => {
      const btn = document.createElement('button');
      btn.className = 'element-btn';
      btn.dataset.type = type;
      btn.dataset.category = 'equipment';
      btn.textContent = spec.name;
      equipList.appendChild(btn);
    });

    // Populate cabinet list
    const cabList = document.getElementById('cabinet-list')!;
    Object.entries(CABINET_CATALOG).forEach(([type, spec]) => {
      const btn = document.createElement('button');
      btn.className = 'element-btn';
      btn.dataset.type = type;
      btn.dataset.category = 'cabinets';
      btn.textContent = spec.name;
      cabList.appendChild(btn);
    });

    // Populate windows list
    const openList = document.getElementById('opening-list')!;
    Object.entries(WINDOW_CATALOG).forEach(([type, spec]) => {
      const btn = document.createElement('button');
      btn.className = 'element-btn';
      btn.dataset.type = type;
      btn.dataset.category = 'windows';
      btn.textContent = spec.name;
      openList.appendChild(btn);
    });

    // Populate layer toggles
    const layerContainer = document.getElementById('layer-toggles')!;
    const layers = [
      { id: 'icf', name: 'ICF Walls', color: '#cccccc' },
      { id: 'framing', name: 'Framing', color: '#d4a574' },
      { id: 'plumbing-cold', name: 'Cold Water', color: '#3498db' },
      { id: 'plumbing-hot', name: 'Hot Water', color: '#e74c3c' },
      { id: 'electrical', name: 'Electrical', color: '#f1c40f' },
      { id: 'lowVoltage', name: 'Low Voltage', color: '#e67e22' },
      { id: 'equipment', name: 'Equipment', color: '#8e44ad' },
      { id: 'cabinets', name: 'Cabinets', color: '#795548' },
      { id: 'windows', name: 'Windows', color: '#00bcd4' }
    ];

    layers.forEach(layer => {
      const label = document.createElement('label');
      label.className = 'layer-toggle';
      label.innerHTML = `
        <input type="checkbox" data-layer="${layer.id}" checked>
        <span class="layer-color" style="background: ${layer.color}"></span>
        ${layer.name}
      `;
      layerContainer.appendChild(label);
    });
  }

  private getBlockIcon(type: ICFBlockType): string {
    const icons: Record<ICFBlockType, string> = {
      standard: '▬',
      corner90: '⌐',
      corner45: '∠',
      taperTop: '⌂',
      brickLedge: '⊏',
      heightAdjuster: '▭'
    };
    return icons[type] || '▬';
  }

  private setupEventListeners(): void {
    const viewport = this.container;

    // Mouse move for ghost preview
    viewport.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Click to place/select
    viewport.addEventListener('click', (e) => this.onClick(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    // Tool buttons
    document.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        projectState.currentTool = btn.dataset.tool as any;
        this.updateGhost();
      });
    });

    // Category tabs
    document.querySelectorAll<HTMLButtonElement>('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        projectState.currentCategory = btn.dataset.category as ElementCategory;
        this.showCategoryOptions(btn.dataset.category as string);
      });
    });

    // Block type buttons
    document.querySelectorAll<HTMLButtonElement>('.block-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.block-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        projectState.currentBlockType = btn.dataset.type as ICFBlockType;
        this.updateGhost();
      });
    });

    // Core thickness buttons
    document.querySelectorAll<HTMLButtonElement>('.core-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.core-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        projectState.currentCoreThickness = parseInt(btn.dataset.core!) as ICFCoreThickness;
        this.updateGhost();
      });
    });

    // Rotate button
    document.getElementById('btn-rotate')?.addEventListener('click', () => {
      projectState.rotateSelection();
      this.updateGhost();
    });

    // Layer toggles
    document.querySelectorAll('[data-layer]').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        projectState.layers[target.dataset.layer!] = target.checked;
        this.rebuildScene();
      });
    });

    // Cost multiplier
    document.getElementById('cost-multiplier')?.addEventListener('change', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      const project = projectState.getProject();
      project.settings.costMultiplier = value;
      this.updateCosts();
    });

    // File buttons
    document.getElementById('btn-new')?.addEventListener('click', () => {
      if (confirm('Start a new project? Unsaved changes will be lost.')) {
        projectState.newProject();
        this.rebuildScene();
      }
    });

    document.getElementById('btn-save')?.addEventListener('click', () => {
      projectState.saveToLocalStorage();
      this.setStatus('Project saved to browser storage');
    });

    document.getElementById('btn-load')?.addEventListener('click', () => {
      if (projectState.loadFromLocalStorage()) {
        this.rebuildScene();
        this.setStatus('Project loaded from browser storage');
      } else {
        this.setStatus('No saved project found');
      }
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      this.exportJSON();
    });

    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      document.getElementById('file-input')?.click();
    });

    document.getElementById('file-input')?.addEventListener('change', (e) => {
      this.importJSON(e);
    });
  }

  private showCategoryOptions(category: string): void {
    // Hide all option panels
    document.getElementById('icf-options')?.classList.add('hidden');
    document.getElementById('equipment-options')?.classList.add('hidden');
    document.getElementById('cabinet-options')?.classList.add('hidden');
    document.getElementById('opening-options')?.classList.add('hidden');

    // Show selected
    switch (category) {
      case 'icf':
        document.getElementById('icf-options')?.classList.remove('hidden');
        break;
      case 'equipment':
        document.getElementById('equipment-options')?.classList.remove('hidden');
        break;
      case 'cabinets':
        document.getElementById('cabinet-options')?.classList.remove('hidden');
        break;
      case 'openings':
        document.getElementById('opening-options')?.classList.remove('hidden');
        break;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (projectState.currentTool !== 'place') {
      this.removeGhost();
      return;
    }

    const intersection = this.scene3D.getGroundIntersection(e, this.container);
    if (!intersection) {
      this.removeGhost();
      return;
    }

    // Use smart snapping that considers existing blocks
    const existingBlocks = projectState.getICFBlocks();
    const snapResult = snapBlockPosition(
      intersection,
      projectState.currentBlockType,
      projectState.currentCoreThickness,
      projectState.currentRotation,
      existingBlocks
    );
    const snapped = snapResult.position;

    // Update position display with snap indicator
    const snapIndicator = snapResult.snappedToBlock ? ' [SNAP]' : '';
    document.getElementById('position-display')!.textContent =
      `X: ${snapped.x}" Y: ${snapped.y}" Z: ${snapped.z}"${snapIndicator}`;

    // Update or create ghost
    this.updateGhostPosition(snapped);
  }

  private updateGhostPosition(position: THREE.Vector3): void {
    if (projectState.currentCategory !== 'icf') {
      this.removeGhost();
      return;
    }

    if (this.ghostMesh) {
      const spec = ICF_BLOCK_CATALOG[projectState.currentBlockType];
      this.ghostMesh.position.set(position.x, position.y + spec.height / 2, position.z);
      this.ghostMesh.rotation.y = THREE.MathUtils.degToRad(projectState.currentRotation);
    } else {
      this.createGhost(position);
    }
  }

  private createGhost(position: THREE.Vector3): void {
    this.removeGhost();
    this.ghostMesh = blockFactory.createGhostBlock(
      projectState.currentBlockType,
      projectState.currentCoreThickness,
      position,
      projectState.currentRotation
    );
    this.scene3D.scene.add(this.ghostMesh);
  }

  private removeGhost(): void {
    if (this.ghostMesh) {
      this.scene3D.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
  }

  private updateGhost(): void {
    if (this.ghostMesh && projectState.currentTool === 'place' && projectState.currentCategory === 'icf') {
      const pos = this.ghostMesh.position.clone();
      this.removeGhost();
      this.createGhost(pos);
    }
    document.getElementById('rotation-value')!.textContent = `${projectState.currentRotation}°`;
  }

  private onClick(e: MouseEvent): void {
    const intersection = this.scene3D.getGroundIntersection(e, this.container);
    if (!intersection) return;

    switch (projectState.currentTool) {
      case 'place':
        // Use smart snapping when placing blocks
        const existingBlocks = projectState.getICFBlocks();
        const snapResult = snapBlockPosition(
          intersection,
          projectState.currentBlockType,
          projectState.currentCoreThickness,
          projectState.currentRotation,
          existingBlocks
        );
        this.placeElement(snapResult.position);
        break;
      case 'select':
        this.selectElement(e);
        break;
      case 'delete':
        this.deleteElement(e);
        break;
    }
  }

  private placeElement(position: THREE.Vector3): void {
    if (projectState.currentCategory === 'icf') {
      const block = projectState.addICFBlock(position);
      this.setStatus(`Placed ${ICF_BLOCK_CATALOG[block.type].name}`);
    }
    // Add other categories as needed
  }

  private selectElement(e: MouseEvent): void {
    const meshes = projectState.getAllMeshes();
    const intersects = this.scene3D.getIntersectedObjects(e, this.container, meshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const id = mesh.userData.blockId;
      if (id) {
        projectState.selectedElementId = id;
        this.setStatus(`Selected element: ${id}`);
        this.rebuildScene();
      }
    } else {
      projectState.selectedElementId = null;
      this.rebuildScene();
    }
  }

  private deleteElement(e: MouseEvent): void {
    const meshes = projectState.getAllMeshes();
    const intersects = this.scene3D.getIntersectedObjects(e, this.container, meshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const id = mesh.userData.blockId;
      if (id && projectState.deleteElement(id)) {
        this.setStatus('Element deleted');
      }
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key.toLowerCase()) {
      case 'p':
        this.selectTool('place');
        break;
      case 'v':
        this.selectTool('select');
        break;
      case 'x':
        this.selectTool('delete');
        break;
      case 'r':
        projectState.rotateSelection();
        this.updateGhost();
        break;
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          if (e.shiftKey) {
            projectState.redo();
          } else {
            projectState.undo();
          }
        }
        break;
      case 'delete':
      case 'backspace':
        if (projectState.selectedElementId) {
          projectState.deleteElement(projectState.selectedElementId);
          projectState.selectedElementId = null;
        }
        break;
    }
  }

  private selectTool(tool: string): void {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    projectState.currentTool = tool as any;
    this.updateGhost();
  }

  private onProjectChange(): void {
    this.rebuildScene();
    this.updateUI();
  }

  private rebuildScene(): void {
    // Remove all existing block meshes
    projectState.getAllMeshes().forEach(mesh => {
      this.scene3D.scene.remove(mesh);
    });

    // Clear mesh map
    const blocks = projectState.getICFBlocks();

    // Rebuild ICF blocks
    if (projectState.layers.icf) {
      blocks.forEach(block => {
        const isSelected = block.id === projectState.selectedElementId;
        const mesh = blockFactory.createBlock(block, false, isSelected);
        this.scene3D.scene.add(mesh);
        projectState.registerMesh(block.id, mesh);
      });
    }

    // Add other element types based on layer visibility...
  }

  private updateUI(): void {
    const project = projectState.getProject();
    const blocks = projectState.getICFBlocks();

    // Stats
    document.getElementById('stat-blocks')!.textContent = blocks.length.toString();
    const sqFt = Math.round(blocks.length * 5.3);
    document.getElementById('stat-area')!.textContent = `${sqFt} sq ft`;

    // Costs
    this.updateCosts();
  }

  private updateCosts(): void {
    const project = projectState.getProject();
    const costs = calculateProjectCosts(project);

    const breakdown = document.getElementById('cost-breakdown')!;
    breakdown.innerHTML = '';

    costs.breakdowns.forEach(cat => {
      const catDiv = document.createElement('div');
      catDiv.className = 'cost-category';
      catDiv.innerHTML = `
        <div class="cost-category-header">
          <span>${cat.category}</span>
          <span>${formatCurrency(cat.subtotal)}</span>
        </div>
      `;
      breakdown.appendChild(catDiv);
    });

    document.getElementById('cost-total')!.textContent = formatCurrency(costs.grandTotal);
  }

  private setStatus(text: string): void {
    document.getElementById('status-text')!.textContent = text;
  }

  private exportJSON(): void {
    const json = projectState.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectState.getProject().name.replace(/\s+/g, '_')}.json`;
    a.click();

    URL.revokeObjectURL(url);
    this.setStatus('Project exported as JSON');
  }

  private importJSON(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        projectState.importJSON(json);
        this.rebuildScene();
        this.setStatus('Project imported successfully');
      } catch (err) {
        alert('Failed to import project: ' + err);
      }
    };
    reader.readAsText(file);

    // Reset input
    input.value = '';
  }
}

// Start the application
new ICFHomeDesigner();
