// Helper to truncate text in SVG nodes to prevent overflow
function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Helper to escape HTML tags for SVG attributes
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Custom Silsilah (FamilyTree) Layout & Rendering Engine
 * Replaces Balkan App's FamilyTree.js with lightweight custom SVG visualizer.
 */
class FamilyTree {
  static templates = {
    base: { defs: "", node: "", link: "", size: [240, 112] },
    alamCard: {},
    alamCard_male: {},
    alamCard_female: {}
  };
  static action = {
    none: "none",
    zoom: "zoom"
  };
  static orientation = {
    left: "left"
  };
  static attr = {
    width: "data-width",
    control_node_menu_id: "data-ctrl-n-menu-id"
  };

  constructor(container, options) {
    this.container = container;
    this.options = options || {};
    this.nodes = [];
    this.nodeMap = new Map();
    this.onNodeClickCallback = null;

    // Zoom and pan state variables
    this.scale = options.scaleInitial || 0.68;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.dragged = false;
    this.dragStart = { x: 0, y: 0 };

    this.svg = null;
    this.viewport = null;

    this.initViewport();
  }

  onNodeClick(callback) {
    this.onNodeClickCallback = callback;
  }

  initViewport() {
    this.container.innerHTML = "";

    // Create container SVG
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.style.cursor = "grab";
    this.svg.style.userSelect = "none";
    this.svg.style.display = "block";

    // Append styles for transitions
    const style = document.createElement("style");
    style.innerHTML = `
      .viewport-transition {
        transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
    `;
    document.head.appendChild(style);

    // SVG definitions
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `<clipPath id="alam_card_img"><rect x="18" y="24" width="64" height="64" rx="16" ry="16"></rect></clipPath>`;
    this.svg.appendChild(defs);

    // Viewport group holding nodes & links
    this.viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(this.viewport);
    this.container.appendChild(this.svg);

    // Pointer-based Pan Events
    this.svg.addEventListener("pointerdown", (e) => {
      if (this.isPinching) return;
      this.isDragging = true;
      this.dragged = false;
      this.dragStart.x = e.clientX - this.translateX;
      this.dragStart.y = e.clientY - this.translateY;
      this.svg.style.cursor = "grabbing";
      this.svg.setPointerCapture(e.pointerId);
    });

    this.svg.addEventListener("pointermove", (e) => {
      if (this.isPinching) return;
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;

      if (Math.abs(dx - this.translateX) > 4 || Math.abs(dy - this.translateY) > 4) {
        this.dragged = true;
      }

      this.translateX = dx;
      this.translateY = dy;
      this.updateTransform();
    });

    const stopDragging = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.svg.style.cursor = "grab";
      try {
        this.svg.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };

    this.svg.addEventListener("pointerup", stopDragging);
    this.svg.addEventListener("pointercancel", stopDragging);

    // Node click via event delegation
    this.svg.addEventListener("click", (e) => {
      const nodeElement = e.target.closest("[data-n-id]");
      
      // If click hit SVG directly or empty area, find nearest node by proximity
      if (!nodeElement) {
        const rect = this.svg.getBoundingClientRect();
        const clickX = (e.clientX - rect.left - this.translateX) / this.scale;
        const clickY = (e.clientY - rect.top - this.translateY) / this.scale;
        
        let nearestNode = null;
        let nearestDist = Infinity;
        
        this.nodes.forEach(node => {
          const nodeCenterX = node.x + 120; // half card width
          const nodeCenterY = node.y + 56; // half card height
          const dist = Math.sqrt(
            Math.pow(clickX - nodeCenterX, 2) + 
            Math.pow(clickY - nodeCenterY, 2)
          );
          
          if (dist < nearestDist && dist < 200) { // within 200px radius
            nearestDist = dist;
            nearestNode = node;
          }
        });
        
        if (nearestNode && this.onNodeClickCallback) {
          const fullNode = this.nodeMap.get(String(nearestNode.id));
          this.onNodeClickCallback({ node: fullNode || nearestNode });
        }
        return;
      }
      
      if (this.dragged) return;
      
      if (this.onNodeClickCallback) {
        const nodeId = nodeElement.getAttribute("data-n-id");
        const fullNode = this.nodeMap.get(String(nodeId));
        this.onNodeClickCallback({ node: fullNode || nodeId });
      }
    });

    // Scroll Zoom
    this.svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = 1.15;
      let newScale = this.scale;

      if (e.deltaY < 0) {
        newScale *= zoomFactor;
      } else {
        newScale /= zoomFactor;
      }

      newScale = Math.max(0.15, Math.min(newScale, 3.0));

      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const pointX = (mouseX - this.translateX) / this.scale;
      const pointY = (mouseY - this.translateY) / this.scale;

      this.translateX = mouseX - pointX * newScale;
      this.translateY = mouseY - pointY * newScale;
      this.scale = newScale;

      this.updateTransform();
    }, { passive: false });

    // Pinch Zoom
    this.isPinching = false;
    this.pinchStartDist = 0;
    this.pinchStartScale = 1;
    this.pinchStartPointX = 0;
    this.pinchStartPointY = 0;

    const getTouchDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    this.svg.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        this.isPinching = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.pinchStartDist = getTouchDistance(t1, t2);
        this.pinchStartScale = this.scale;
        const rect = this.svg.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        this.pinchStartPointX = (midX - this.translateX) / this.scale;
        this.pinchStartPointY = (midY - this.translateY) / this.scale;
      }
    }, { passive: true });

    this.svg.addEventListener("touchmove", (e) => {
      if (this.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = getTouchDistance(t1, t2);
        const scaleRatio = currentDist / this.pinchStartDist;
        let newScale = this.pinchStartScale * scaleRatio;
        newScale = Math.max(0.15, Math.min(newScale, 3.0));

        const rect = this.svg.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

        this.translateX = midX - this.pinchStartPointX * newScale;
        this.translateY = midY - this.pinchStartPointY * newScale;
        this.scale = newScale;
        this.updateTransform();
      }
    }, { passive: false });

    this.svg.addEventListener("touchend", (e) => {
      if (this.isPinching && e.touches.length < 2) {
        this.isPinching = false;
      }
    });

    this.svg.addEventListener("touchcancel", () => {
      this.isPinching = false;
    });
  }

  updateTransform() {
    if (this.viewport) {
      this.viewport.setAttribute("transform", `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
    }
  }

  animateTransform() {
    if (this.viewport) {
      this.viewport.classList.add("viewport-transition");
      this.updateTransform();
      setTimeout(() => {
        this.viewport.classList.remove("viewport-transition");
      }, 250);
    }
  }

  zoom(zoomIn) {
    const factor = zoomIn ? 1.3 : 0.77;
    const newScale = Math.max(0.15, Math.min(this.scale * factor, 3.0));

    const rect = this.svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const pointX = (centerX - this.translateX) / this.scale;
    const pointY = (centerY - this.translateY) / this.scale;

    this.translateX = centerX - pointX * newScale;
    this.translateY = centerY - pointY * newScale;
    this.scale = newScale;

    this.animateTransform();
  }

  fit() {
    if (this.nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    this.nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    const w = (maxX - minX) + 240;
    const h = (maxY - minY) + 112;

    const rect = this.svg.getBoundingClientRect();
    const containerWidth = rect.width || window.innerWidth;
    const containerHeight = rect.height || window.innerHeight;

    const padding = 60;
    const scaleX = (containerWidth - padding * 2) / w;
    const scaleY = (containerHeight - padding * 2) / h;
    let newScale = Math.min(scaleX, scaleY);
    newScale = Math.max(0.2, Math.min(newScale, 1.2));

    const centerX = minX + w / 2;
    const centerY = minY + h / 2;

    this.translateX = containerWidth / 2 - centerX * newScale;
    this.translateY = containerHeight / 2 - centerY * newScale;
    this.scale = newScale;

    this.animateTransform();
  }

  center(nodeId, options = {}, callback) {
    const node = this.nodeMap.get(String(nodeId));
    if (!node) {
      if (callback) callback();
      return;
    }

    const horizontal = options.horizontal !== false;
    const vertical = options.vertical !== false;

    const rect = this.svg.getBoundingClientRect();
    const containerWidth = rect.width || window.innerWidth;
    const containerHeight = rect.height || window.innerHeight;

    const cardWidth = 240;
    const cardHeight = 112;
    const nodeCenterX = node.x + cardWidth / 2;
    const nodeCenterY = node.y + cardHeight / 2;

    if (horizontal) {
      this.translateX = containerWidth / 2 - nodeCenterX * this.scale;
    }
    if (vertical) {
      this.translateY = containerHeight / 2 - nodeCenterY * this.scale;
    }

    this.animateTransform();

    if (callback) {
      setTimeout(callback, 260);
    }
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.nodes = [];
    this.nodeMap.clear();
  }

  load(nodes) {
    this.nodes = JSON.parse(JSON.stringify(nodes));
    this.nodeMap.clear();
    this.nodes.forEach(n => this.nodeMap.set(String(n.id), n));

    this.calculateLayout();
    this.render();

    setTimeout(() => this.fit(), 50);
  }

  calculateLayout() {
    // Reset properties and links
    this.nodes.forEach(n => {
      n.generation = 0;
      n.children = [];
      n.spouses = [];
    });

    // Populate child/spouse relationships
    this.nodes.forEach(n => {
      if (n.fid && this.nodeMap.has(String(n.fid))) {
        this.nodeMap.get(String(n.fid)).children.push(n);
      }
      if (n.mid && this.nodeMap.has(String(n.mid))) {
        this.nodeMap.get(String(n.mid)).children.push(n);
      }
      if (n.pids) {
        n.pids.forEach(pid => {
          if (this.nodeMap.has(String(pid))) {
            const spouse = this.nodeMap.get(String(pid));
            if (!n.spouses.includes(spouse)) n.spouses.push(spouse);
          }
        });
      }
    });

    // Determine generation levels recursively (top-down)
    const roots = this.nodes.filter(n => {
      const hasFid = n.fid && this.nodeMap.has(String(n.fid));
      const hasMid = n.mid && this.nodeMap.has(String(n.mid));
      return !hasFid && !hasMid;
    });

    const visitedNodes = new Set();
    const assignGen = (node, level) => {
      if (visitedNodes.has(node.id)) return;
      visitedNodes.add(node.id);

      node.generation = Math.max(node.generation || 0, level);

      node.children.forEach(child => {
        assignGen(child, level + 1);
      });
      node.spouses.forEach(spouse => {
        spouse.generation = node.generation;
      });
    };

    roots.forEach(root => assignGen(root, 0));

    // Group spouses together into horizontal columns
    const groups = [];
    const groupMap = new Map();

    this.nodes.forEach(n => {
      if (groupMap.has(String(n.id))) return;

      let existingGroup = null;
      if (n.pids) {
        for (const pid of n.pids) {
          if (groupMap.has(String(pid))) {
            existingGroup = groupMap.get(String(pid));
            break;
          }
        }
      }

      if (existingGroup) {
        existingGroup.nodes.push(n);
        groupMap.set(String(n.id), existingGroup);
      } else {
        const newGroup = {
          id: "group_" + n.id,
          nodes: [n],
          childrenGroups: [],
          generation: n.generation || 0,
          y: 0,
          height: 0,
          subtreeHeight: 0
        };
        groups.push(newGroup);
        groupMap.set(String(n.id), newGroup);

        if (n.pids) {
          n.pids.forEach(pid => {
            if (this.nodeMap.has(String(pid)) && !groupMap.has(String(pid))) {
              const spouse = this.nodeMap.get(String(pid));
              newGroup.nodes.push(spouse);
              groupMap.set(String(spouse.id), newGroup);
            }
          });
        }
      }
    });

    // Make generation properties consistent & sort spouses within group (Male first, Female second)
    groups.forEach(g => {
      g.nodes.sort((a, b) => (a.gender === "female" ? 1 : -1));
      g.generation = Math.max(...g.nodes.map(node => node.generation || 0));
      g.nodes.forEach(node => { node.generation = g.generation; });
    });

    // Link parent-child groups
    groups.forEach(g => {
      g.nodes.forEach(parent => {
        parent.children.forEach(child => {
          const childGroup = groupMap.get(String(child.id));
          if (childGroup && childGroup !== g) {
            if (!g.childrenGroups.includes(childGroup)) {
              g.childrenGroups.push(childGroup);
            }
          }
        });
      });
    });

    // Find root groups
    const rootGroups = groups.filter(g => {
      return g.nodes.every(n => {
        const hasFid = n.fid && this.nodeMap.has(String(n.fid));
        const hasMid = n.mid && this.nodeMap.has(String(n.mid));
        return !hasFid && !hasMid;
      });
    });

    const cardHeight = 112;
    const spouseSpacingY = 16;
    const spacingY = 40;

    // Calculate vertical dimensions bottom-up
    groups.forEach(g => {
      g.height = g.nodes.length * cardHeight + (g.nodes.length - 1) * spouseSpacingY;
    });

    const calculateSubtreeHeights = (group, visited = new Set()) => {
      if (visited.has(group.id)) return;
      visited.add(group.id);

      group.childrenGroups.forEach(child => {
        calculateSubtreeHeights(child, visited);
      });

      if (group.childrenGroups.length === 0) {
        group.subtreeHeight = group.height;
      } else {
        const childrenHeight = group.childrenGroups.reduce((sum, child) => sum + child.subtreeHeight, 0) +
                               (group.childrenGroups.length - 1) * spacingY;
        group.subtreeHeight = Math.max(group.height, childrenHeight);
      }
    };

    rootGroups.forEach(g => calculateSubtreeHeights(g));

    // Calculate layout coordinates recursively (top-down)
    const layoutGroup = (group, startY, visited = new Set()) => {
      if (visited.has(group.id)) return;
      visited.add(group.id);

      group.startY = startY;
      group.y = startY + (group.subtreeHeight - group.height) / 2;

      let nodeY = group.y;
      group.nodes.forEach(node => {
        node.x = node.generation * 360; // 240px cardWidth + 120px horizontal space
        node.y = nodeY;
        nodeY += cardHeight + spouseSpacingY;
      });

      if (group.childrenGroups.length > 0) {
        const childrenTotalHeight = group.childrenGroups.reduce((sum, child) => sum + child.subtreeHeight, 0) +
                                   (group.childrenGroups.length - 1) * spacingY;

        const parentCenterY = group.y + group.height / 2;
        let childSliceY = parentCenterY - childrenTotalHeight / 2;

        group.childrenGroups.forEach(child => {
          layoutGroup(child, childSliceY, visited);
          childSliceY += child.subtreeHeight + spacingY;
        });
      }
    };

    // Place root families stacked vertically
    let currentY = 50;
    rootGroups.forEach(g => {
      layoutGroup(g, currentY);
      currentY += g.subtreeHeight + 120; // vertical margins between root families
    });

    this.groups = groups;

    // Copy coordinate mapping back to main nodes array
    this.nodes.forEach(n => {
      const orig = this.nodeMap.get(String(n.id));
      if (orig) {
        orig.x = n.x;
        orig.y = n.y;
        orig.generation = n.generation;
      }
    });
  }

  render() {
    this.viewport.innerHTML = "";

    const linksG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linksG.setAttribute("class", "links-group");
    this.viewport.appendChild(linksG);

    const nodesG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodesG.setAttribute("class", "nodes-group");
    this.viewport.appendChild(nodesG);

    const cardWidth = 240;
    const cardHeight = 112;

    // Render connection pathways
    this.groups.forEach(g => {
      if (g.childrenGroups.length > 0) {
        const xStart = g.nodes[0].x + cardWidth;
        const yStart = g.y + g.height / 2;
        const xSplit = xStart + 60;

        const childCenters = g.childrenGroups.map(cg => {
          const childNode = cg.nodes.find(node => {
            return g.nodes.some(parent => String(node.fid) === String(parent.id) || String(node.mid) === String(parent.id));
          }) || cg.nodes[0];
          return {
            x: childNode.x,
            y: childNode.y + cardHeight / 2
          };
        });

        const yMin = Math.min(...childCenters.map(c => c.y));
        const yMax = Math.max(...childCenters.map(c => c.y));

        let pathD = `M ${xStart} ${yStart} H ${xSplit}`;

        if (childCenters.length > 1) {
          pathD += ` M ${xSplit} ${yMin} V ${yMax}`;
        } else if (childCenters.length === 1 && yStart !== childCenters[0].y) {
          pathD += ` M ${xSplit} ${yStart} V ${childCenters[0].y}`;
        }

        childCenters.forEach(c => {
          pathD += ` M ${xSplit} ${c.y} H ${c.x}`;
        });

        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("d", pathD);
        pathElement.setAttribute("stroke", "#668071");
        pathElement.setAttribute("stroke-width", "2.5");
        pathElement.setAttribute("stroke-linecap", "round");
        pathElement.setAttribute("stroke-linejoin", "round");
        pathElement.setAttribute("fill", "none");
        pathElement.setAttribute("class", "tree-connector");
        linksG.appendChild(pathElement);
      }

      // Render dotted lines connecting spouses
      if (g.nodes.length > 1) {
        const xCenter = g.nodes[0].x + cardWidth / 2;
        const yTop = g.nodes[0].y + cardHeight;
        const yBottom = g.nodes[1].y;

        const spousePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        spousePath.setAttribute("d", `M ${xCenter} ${yTop} V ${yBottom}`);
        spousePath.setAttribute("stroke", "#2E8B57");
        spousePath.setAttribute("stroke-width", "2");
        spousePath.setAttribute("stroke-dasharray", "4,4");
        spousePath.setAttribute("fill", "none");
        linksG.appendChild(spousePath);
      }
    });

    // Render node cards
    this.nodes.forEach(node => {
      const nodeElement = this.renderNode(node);
      nodesG.appendChild(nodeElement);
    });
  }

  renderNode(node) {
    const genderClass = node.gender === "female" ? "female" : "male";
    const statusClass = typeof getStatusClass === "function" ? getStatusClass(node) : "is-alive";
    const initials = node.initials || (typeof getInitials === "function" ? getInitials(node.name) : "??");

    const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeG.setAttribute("class", `node ${genderClass} ${statusClass}`);
    nodeG.setAttribute("data-n-id", String(node.id));
    nodeG.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    nodeG.style.cursor = "pointer";

    const cardGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    cardGroup.setAttribute("class", "alam-card");

    const surface = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    surface.setAttribute("class", "alam-card-surface");
    surface.setAttribute("x", "0");
    surface.setAttribute("y", "0");
    surface.setAttribute("width", "240");
    surface.setAttribute("height", "112");
    surface.setAttribute("rx", "16");
    surface.setAttribute("ry", "16");
    surface.setAttribute("fill", "#FFFFFF");
    surface.setAttribute("stroke", "#DDEBE2");
    surface.setAttribute("stroke-width", "1.5");
    cardGroup.appendChild(surface);

    const accent = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    accent.setAttribute("class", "alam-card-accent");
    accent.setAttribute("x", "0");
    accent.setAttribute("y", "0");
    accent.setAttribute("width", "6");
    accent.setAttribute("height", "112");
    accent.setAttribute("rx", "3");
    accent.setAttribute("ry", "3");
    accent.setAttribute("fill", "#2E8B57");
    cardGroup.appendChild(accent);

    const avatarWell = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    avatarWell.setAttribute("class", "alam-card-avatar-well");
    avatarWell.setAttribute("x", "18");
    avatarWell.setAttribute("y", "24");
    avatarWell.setAttribute("width", "64");
    avatarWell.setAttribute("height", "64");
    avatarWell.setAttribute("rx", "16");
    avatarWell.setAttribute("ry", "16");
    avatarWell.setAttribute("fill", "#E6F3EA");
    cardGroup.appendChild(avatarWell);

    nodeG.appendChild(cardGroup);

    if (node.img) {
      const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
      image.setAttribute("class", "alam-card-avatar-image");
      image.setAttribute("preserveAspectRatio", "xMidYMid slice");
      image.setAttribute("clip-path", "url(#alam_card_img)");
      image.setAttribute("href", escapeHtml(node.img));
      image.setAttribute("x", "18");
      image.setAttribute("y", "24");
      image.setAttribute("width", "64");
      image.setAttribute("height", "64");
      nodeG.appendChild(image);
    } else {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "alam-card-initials");
      text.setAttribute("style", "font-family: Outfit, sans-serif;font-size:20px;font-weight:700;");
      text.setAttribute("fill", "#246B43");
      text.setAttribute("x", "50");
      text.setAttribute("y", "62");
      text.setAttribute("text-anchor", "middle");
      text.textContent = escapeHtml(initials);
      nodeG.appendChild(text);
    }

    const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameText.setAttribute("class", "alam-card-name");
    nameText.setAttribute("style", "font-family: Outfit, sans-serif;font-size:18px;font-weight:700;");
    nameText.setAttribute("fill", "#1F4933");
    nameText.setAttribute("x", "98");
    nameText.setAttribute("y", "43");
    nameText.setAttribute("text-anchor", "start");
    nameText.textContent = escapeHtml(truncateText(node.name, 14));
    nodeG.appendChild(nameText);

    const statusText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    statusText.setAttribute("class", "alam-card-status");
    statusText.setAttribute("style", "font-family: 'Atkinson Hyperlegible', sans-serif;font-size:12px;font-weight:700;");
    statusText.setAttribute("fill", "#246B43");
    statusText.setAttribute("x", "98");
    statusText.setAttribute("y", "66");
    statusText.setAttribute("text-anchor", "start");
    statusText.textContent = escapeHtml(truncateText(node.node_status, 20));
    nodeG.appendChild(statusText);

    const birthYear = node.tahun_lahir;
    const deathYear = node.tahun_wafat;
    let ageInfo = "Belum dicatat";
    if (birthYear) {
      if (deathYear) {
        const ageAtDeath = deathYear - birthYear;
        ageInfo = `${birthYear} - ${ageAtDeath} tahun`;
      } else if (node.usia_saat_ini !== null && node.usia_saat_ini !== undefined) {
        ageInfo = `${birthYear} - ${node.usia_saat_ini} tahun`;
      } else {
        ageInfo = `${birthYear} - Belum dicatat`;
      }
    }

    const metaText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    metaText.setAttribute("class", "alam-card-meta");
    metaText.setAttribute("style", "font-family: 'Atkinson Hyperlegible', sans-serif;font-size:14px;");
    metaText.setAttribute("fill", "#668071");
    metaText.setAttribute("x", "98");
    metaText.setAttribute("y", "89");
    metaText.setAttribute("text-anchor", "start");
    metaText.textContent = escapeHtml(truncateText(ageInfo, 18));
    nodeG.appendChild(metaText);

    nodeG.addEventListener("click", (e) => {
      if (this.dragged) return;
      e.stopPropagation();
      if (this.onNodeClickCallback) {
        const fullNode = this.nodeMap.get(String(node.id));
        this.onNodeClickCallback({ node: fullNode || node });
      }
    });

    return nodeG;
  }
}

// Global functions preserved for Trah Sukata visualizer page

function avatarMarkup(person, className = "profile-avatar") {
  const genderClass = person && person.gender === "female" ? `${className}--female` : "";
  const initials = escapeHtml(getInitials(getDisplayName(person)));
  const image = person && person.img
    ? `<img src="${escapeHtml(person.img)}" alt="" loading="lazy">`
    : initials;
  return `<div class="${className} ${genderClass}" aria-hidden="true">${image}</div>`;
}

function renderState(status, detail = "") {
  runtime.status = status;
  elements.stage.classList.toggle("is-loading", status === "loading");
  elements.stage.classList.toggle("is-empty", status === "empty");
  elements.stage.classList.toggle("is-error", status === "error");
  elements.tree.setAttribute("aria-hidden", status !== "ready" ? "true" : "false");
  elements.asyncNote.hidden = status !== "loading";

  if (status === "ready") {
    elements.treeState.hidden = true;
    elements.memberCount.textContent = `${runtime.nodes.length} anggota`;
    elements.lastUpdated.innerHTML = `<i class="ti ti-refresh" aria-hidden="true"></i><span>Terakhir diperbarui hari ini</span>`;
    elements.listButton.disabled = runtime.nodes.length === 0;
    return;
  }

  elements.treeState.hidden = false;
  elements.listButton.disabled = true;

  const states = {
    loading: {
      className: "state-card--loading",
      icon: "ti-tree",
      title: "Menyiapkan silsilah keluarga…",
      description: "Kami sedang membuka catatan keluarga. Data akan muncul sebentar lagi.",
      action: ""
    },
    empty: {
      className: "state-card--empty",
      icon: "ti-users-minus",
      title: "Data keluarga belum tersedia.",
      description: "Belum ada catatan keluarga yang dapat ditampilkan saat ini.",
      action: `<button class="state-action" type="button" data-state-action="retry"><i class="ti ti-refresh" aria-hidden="true"></i>Muat ulang</button>`
    },
    error: {
      className: "state-card--error",
      icon: "ti-wifi-off",
      title: "Koneksi terputus. Mari kita coba lagi.",
      description: detail || "Gagal memuat data keluarga. Periksa koneksi internet Anda lalu coba lagi.",
      action: `<button class="state-action" type="button" data-state-action="retry"><i class="ti ti-refresh" aria-hidden="true"></i>Muat ulang</button>`
    }
  }[status];

  elements.memberCount.textContent = status === "loading" ? "Menyiapkan data" : "Belum tersedia";
  elements.lastUpdated.innerHTML = `<i class="ti ti-refresh" aria-hidden="true"></i><span>${status === "loading" ? "Menyiapkan silsilah" : "Belum dapat diperbarui"}</span>`;

  const skeleton = status === "loading"
    ? `<div class="state-skeleton" aria-hidden="true"><span class="skeleton-node"></span><span class="skeleton-node"></span><span class="skeleton-node"></span></div>`
    : "";

  elements.treeState.innerHTML = `
    <div class="state-card ${states.className}">
      ${skeleton}
      <div class="state-icon" aria-hidden="true"><i class="ti ${states.icon}"></i></div>
      <h2 class="state-title">${states.title}</h2>
      <p class="state-description">${states.description}</p>
      ${states.action}
    </div>
  `;

  const retryButton = elements.treeState.querySelector('[data-state-action="retry"]');
  if (retryButton) retryButton.addEventListener("click", loadFamily);
}

function destroyFamilyTree() {
  if (runtime.statusObserver) {
    runtime.statusObserver.disconnect();
    runtime.statusObserver = null;
  }
  if (runtime.familyTree && typeof runtime.familyTree.destroy === "function") {
    try {
      runtime.familyTree.destroy();
    } catch (error) {
      console.warn("FamilyTree tidak dapat dibersihkan sepenuhnya.", error);
    }
  }
  runtime.familyTree = null;
  elements.tree.innerHTML = "";
}

function hideFamilyTreeChrome() {
  // Legacy method; custom engine does not add Balkan's control overlays.
  elements.tree.querySelectorAll('[class*="toolbar"], [class*="controlbar"], [class*="control-bar"]').forEach((element) => {
    element.setAttribute("aria-hidden", "true");
    element.style.display = "none";
  });
}

function applyStatusClasses() {
  const peopleById = new Map(runtime.nodes.map((person) => [String(person.id), person]));
  elements.tree.querySelectorAll("[data-n-id]").forEach((nodeElement) => {
    const person = peopleById.get(String(nodeElement.dataset.nId));
    if (person) {
      nodeElement.classList.remove("is-alive", "is-deceased", "is-unknown");
      nodeElement.classList.add(getStatusClass(person));
    }
  });
}

function observeStatusClasses() {
  if (runtime.statusObserver) runtime.statusObserver.disconnect();
  if (typeof MutationObserver === "undefined") return;
  runtime.statusObserver = new MutationObserver(() => applyStatusClasses());
  runtime.statusObserver.observe(elements.tree, { childList: true, subtree: true });
}

function registerAlamCardTemplate() {
  // Legacy stub; custom engine uses inline template rendering.
}

function initFamilyTree() {
  // Instantiate custom FamilyTree engine with options
  runtime.familyTree = new FamilyTree(elements.tree, {
    scaleInitial: window.innerWidth <= 640 ? 0.52 : 0.68
  });

  runtime.familyTree.onNodeClick((args) => {
    if (args && args.node) showDetailModal(args.node);
  });
}

function callTreeMethod(action, message) {
  if (!runtime.familyTree) {
    announce("Data keluarga belum siap dijelajahi.");
    return;
  }

  if (action === "zoom-in") {
    runtime.familyTree.zoom(true);
  } else if (action === "zoom-out") {
    runtime.familyTree.zoom(false);
  } else if (action === "fit") {
    runtime.familyTree.fit();
  } else {
    announce("Geser kanvas atau gunakan cubit layar untuk menjelajahi pohon.");
    return;
  }

  announce(message);
}
