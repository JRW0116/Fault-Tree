const state = {
  nodes: [],
  topEventId: null,
};

const sampleProject = {
  topEventId: "gate-loss-of-cooling",
  nodes: [
    { id: "gate-loss-of-cooling", type: "gate", name: "Loss of Cooling Function", gateType: "OR", children: ["gate-primary-chain", "event-control-failure"] },
    { id: "gate-primary-chain", type: "gate", name: "Primary Cooling Chain Fails", gateType: "AND", children: ["event-pump-failure", "event-valve-stuck"] },
    { id: "event-control-failure", type: "event", name: "Control logic unavailable", probability: 0.015, children: [] },
    { id: "event-pump-failure", type: "event", name: "Cooling pump fails to start", probability: 0.02, children: [] },
    { id: "event-valve-stuck", type: "event", name: "Isolation valve stuck closed", probability: 0.03, children: [] },
  ],
};

const elements = {
  itemForm: document.querySelector("#itemForm"),
  itemType: document.querySelector("#itemType"),
  itemName: document.querySelector("#itemName"),
  itemProbability: document.querySelector("#itemProbability"),
  itemGateType: document.querySelector("#itemGateType"),
  probabilityField: document.querySelector("#probabilityField"),
  gateField: document.querySelector("#gateField"),
  resetFormButton: document.querySelector("#resetFormButton"),
  linkForm: document.querySelector("#linkForm"),
  parentId: document.querySelector("#parentId"),
  childId: document.querySelector("#childId"),
  topEventSelect: document.querySelector("#topEventSelect"),
  nodeCountLabel: document.querySelector("#nodeCountLabel"),
  treeCanvas: document.querySelector("#treeCanvas"),
  analyzeButton: document.querySelector("#analyzeButton"),
  topProbability: document.querySelector("#topProbability"),
  cutSetCount: document.querySelector("#cutSetCount"),
  analysisNotes: document.querySelector("#analysisNotes"),
  cutSetList: document.querySelector("#cutSetList"),
  nodeCardTemplate: document.querySelector("#nodeCardTemplate"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function createId(type, name) {
  const base = `${type}-${slugify(name) || "node"}`;
  let candidate = base;
  let counter = 2;

  while (state.nodes.some((node) => node.id === candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function getNodeById(id) {
  return state.nodes.find((node) => node.id === id);
}

function setProject(project) {
  state.nodes = structuredClone(project.nodes);
  state.topEventId = project.topEventId ?? project.nodes[0]?.id ?? null;
  render();
}

function updateTypeFields() {
  const isEvent = elements.itemType.value === "event";
  elements.probabilityField.classList.toggle("hidden", !isEvent);
  elements.gateField.classList.toggle("hidden", isEvent);
}

function addNode(event) {
  event.preventDefault();

  const type = elements.itemType.value;
  const name = elements.itemName.value.trim();
  if (!name) {
    return;
  }

  const node = {
    id: createId(type, name),
    type,
    name,
    children: [],
  };

  if (type === "event") {
    const probability = Number(elements.itemProbability.value);
    node.probability = Number.isFinite(probability) ? Math.min(Math.max(probability, 0), 1) : 0;
  } else {
    node.gateType = elements.itemGateType.value;
  }

  state.nodes.push(node);
  if (!state.topEventId) {
    state.topEventId = node.id;
  }

  elements.itemForm.reset();
  elements.itemProbability.value = "0.01";
  elements.itemGateType.value = "OR";
  elements.itemType.value = "event";
  updateTypeFields();
  render();
}

function addLink(event) {
  event.preventDefault();
  const parent = getNodeById(elements.parentId.value);
  const childId = elements.childId.value;

  if (!parent || parent.type !== "gate" || !childId) {
    return;
  }

  if (parent.id === childId) {
    window.alert("A node cannot connect to itself.");
    return;
  }

  if (createsCycle(parent.id, childId)) {
    window.alert("This link would create a cycle. Fault trees must stay acyclic.");
    return;
  }

  if (!parent.children.includes(childId)) {
    parent.children.push(childId);
  }

  render();
}

function createsCycle(parentId, childId) {
  const child = getNodeById(childId);
  if (!child) {
    return false;
  }

  const stack = [...child.children];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId === parentId) {
      return true;
    }

    const current = getNodeById(currentId);
    if (current) {
      stack.push(...current.children);
    }
  }

  return false;
}

function removeNode(nodeId) {
  state.nodes = state.nodes.filter((node) => node.id !== nodeId);
  state.nodes.forEach((node) => {
    node.children = node.children.filter((childId) => childId !== nodeId);
  });

  if (state.topEventId === nodeId) {
    state.topEventId = state.nodes[0]?.id ?? null;
  }

  render();
}

function renderSelectors() {
  const gateNodes = state.nodes.filter((node) => node.type === "gate");
  const allNodes = state.nodes;

  elements.parentId.innerHTML = gateNodes.map((node) => `<option value="${node.id}">${node.name}</option>`).join("");
  elements.childId.innerHTML = allNodes.map((node) => `<option value="${node.id}">${node.name}</option>`).join("");
  elements.topEventSelect.innerHTML = allNodes.map((node) => `<option value="${node.id}">${node.name}</option>`).join("");

  if (state.topEventId) {
    elements.topEventSelect.value = state.topEventId;
  }
}

function renderTree() {
  elements.treeCanvas.innerHTML = "";

  if (state.nodes.length === 0) {
    elements.treeCanvas.innerHTML = `<div class="form-card empty-state">No nodes yet. Add a basic event or gate to begin.</div>`;
    return;
  }

  state.nodes.forEach((node) => {
    const card = elements.nodeCardTemplate.content.firstElementChild.cloneNode(true);
    const detail = node.type === "event"
      ? `Basic event probability: ${formatProbability(node.probability)}`
      : `${node.gateType} gate with ${node.children.length} input${node.children.length === 1 ? "" : "s"}`;

    card.querySelector(".node-kind").textContent = node.type === "event" ? "Basic Event" : "Gate";
    card.querySelector(".node-title").textContent = node.name;
    card.querySelector(".node-detail").textContent = detail;

    const chipRow = card.querySelector(".chip-row");
    chipRow.innerHTML = "";

    if (node.id === state.topEventId) {
      chipRow.append(createChip("Top Event"));
    }

    node.children.forEach((childId) => {
      const child = getNodeById(childId);
      if (child) {
        chipRow.append(createChip(`Input: ${child.name}`));
      }
    });

    card.querySelector(".delete-node-button").addEventListener("click", () => removeNode(node.id));
    elements.treeCanvas.append(card);
  });
}

function createChip(text) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = text;
  return chip;
}

function render() {
  renderSelectors();
  renderTree();
  elements.nodeCountLabel.textContent = `${state.nodes.length} node${state.nodes.length === 1 ? "" : "s"}`;
}

function analyzeTree() {
  const topId = elements.topEventSelect.value;
  state.topEventId = topId;
  const topNode = getNodeById(topId);

  if (!topNode) {
    showEmptyResults("Choose a top event and run the analysis.");
    return;
  }

  try {
    const probability = calculateProbability(topNode.id, new Set());
    const cutSets = minimizeCutSets(buildCutSets(topNode.id, new Set()));

    elements.topProbability.textContent = formatProbability(probability);
    elements.cutSetCount.textContent = String(cutSets.length);
    elements.analysisNotes.classList.remove("empty-state");
    elements.analysisNotes.innerHTML = [
      `Top event <strong>${topNode.name}</strong> evaluates to <strong>${formatProbability(probability)}</strong>.`,
      topNode.type === "event"
        ? "The selected top event is a basic event, so the analysis reflects its direct probability."
        : `The tree combines child events through ${topNode.gateType} logic and assumes independent basic event probabilities.`,
    ].join(" ");

    renderCutSets(cutSets);
  } catch (error) {
    showEmptyResults(error.message);
  }
}

function calculateProbability(nodeId, activePath) {
  if (activePath.has(nodeId)) {
    throw new Error("Cycle detected during analysis.");
  }

  const node = getNodeById(nodeId);
  if (!node) {
    throw new Error(`Missing node: ${nodeId}`);
  }

  if (node.type === "event") {
    return node.probability ?? 0;
  }

  if (node.children.length === 0) {
    throw new Error(`Gate "${node.name}" has no inputs.`);
  }

  const nextPath = new Set(activePath);
  nextPath.add(nodeId);
  const probabilities = node.children.map((childId) => calculateProbability(childId, nextPath));

  if (node.gateType === "AND") {
    return probabilities.reduce((product, value) => product * value, 1);
  }

  return 1 - probabilities.reduce((product, value) => product * (1 - value), 1);
}

function buildCutSets(nodeId, activePath) {
  if (activePath.has(nodeId)) {
    throw new Error("Cycle detected during cut set generation.");
  }

  const node = getNodeById(nodeId);
  if (!node) {
    throw new Error(`Missing node: ${nodeId}`);
  }

  if (node.type === "event") {
    return [[node.name]];
  }

  if (node.children.length === 0) {
    throw new Error(`Gate "${node.name}" has no inputs.`);
  }

  const nextPath = new Set(activePath);
  nextPath.add(nodeId);
  const childCutSets = node.children.map((childId) => buildCutSets(childId, nextPath));

  if (node.gateType === "OR") {
    return childCutSets.flat();
  }

  return childCutSets.reduce((accumulator, sets) => {
    if (accumulator.length === 0) {
      return sets;
    }

    const combined = [];
    accumulator.forEach((left) => {
      sets.forEach((right) => {
        combined.push([...new Set([...left, ...right])].sort());
      });
    });
    return combined;
  }, []);
}

function minimizeCutSets(cutSets) {
  const normalized = cutSets
    .map((set) => [...new Set(set)].sort())
    .sort((a, b) => a.length - b.length || a.join("|").localeCompare(b.join("|")));

  const unique = [];
  normalized.forEach((candidate) => {
    const alreadyCovered = unique.some((known) => known.every((item) => candidate.includes(item)));
    if (!alreadyCovered) {
      unique.push(candidate);
    }
  });
  return unique;
}

function renderCutSets(cutSets) {
  if (cutSets.length === 0) {
    elements.cutSetList.className = "results-block empty-state";
    elements.cutSetList.textContent = "No cut sets were produced.";
    return;
  }

  elements.cutSetList.className = "results-block";
  elements.cutSetList.innerHTML = "";
  cutSets.forEach((set, index) => {
    const div = document.createElement("div");
    div.className = "cut-set";
    div.textContent = `#${index + 1}: ${set.join(" + ")}`;
    elements.cutSetList.append(div);
  });
}

function showEmptyResults(message) {
  elements.topProbability.textContent = "-";
  elements.cutSetCount.textContent = "-";
  elements.analysisNotes.className = "results-block empty-state";
  elements.analysisNotes.textContent = message;
  elements.cutSetList.className = "results-block empty-state";
  elements.cutSetList.textContent = "No cut sets yet.";
}

function exportProject() {
  const payload = JSON.stringify({ topEventId: state.topEventId, nodes: state.nodes }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fault-tree-project.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importProject(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    validateProject(parsed);
    setProject(parsed);
    showEmptyResults("Project imported. Run the analysis when you're ready.");
  } catch (error) {
    window.alert(`Import failed: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function validateProject(project) {
  if (!project || !Array.isArray(project.nodes)) {
    throw new Error("The JSON file must include a nodes array.");
  }

  project.nodes.forEach((node) => {
    if (!node.id || !node.type || !node.name || !Array.isArray(node.children)) {
      throw new Error("Each node must include id, type, name, and children fields.");
    }
    if (node.type === "event" && typeof node.probability !== "number") {
      throw new Error(`Event "${node.name}" is missing a numeric probability.`);
    }
    if (node.type === "gate" && !["AND", "OR"].includes(node.gateType)) {
      throw new Error(`Gate "${node.name}" must specify AND or OR.`);
    }
  });
}

elements.itemType.addEventListener("change", updateTypeFields);
elements.itemForm.addEventListener("submit", addNode);
elements.resetFormButton.addEventListener("click", () => {
  elements.itemForm.reset();
  elements.itemProbability.value = "0.01";
  elements.itemType.value = "event";
  updateTypeFields();
});
elements.linkForm.addEventListener("submit", addLink);
elements.topEventSelect.addEventListener("change", (event) => {
  state.topEventId = event.target.value;
  render();
});
elements.analyzeButton.addEventListener("click", analyzeTree);
elements.exportButton.addEventListener("click", exportProject);
elements.importInput.addEventListener("change", importProject);
elements.loadSampleButton.addEventListener("click", () => {
  setProject(sampleProject);
  showEmptyResults("Sample project loaded. Run the analysis to see the calculated result.");
});

function formatProbability(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value === 0) {
    return "0";
  }
  if (value < 0.0001) {
    return value.toExponential(3);
  }
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

updateTypeFields();
setProject(sampleProject);
showEmptyResults("Sample project loaded. Run the analysis to see the calculated result.");
