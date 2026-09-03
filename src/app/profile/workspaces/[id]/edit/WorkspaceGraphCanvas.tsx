"use client";

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  WorkspaceNodeWithTarget,
  WorkspaceEdgeWithLabels,
  ActivePackageOption,
} from "../../query";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { ExternalRepoLink } from "@/lib/workspaces/types";
import { computeLayout } from "@/lib/workspaces/graph-layout";
import {
  removeWorkspaceNode,
  setRootNode,
  addWorkspaceEdge,
  removeWorkspaceEdge,
  addWorkspaceNode,
  updateNodePosition,
  updateNodeRef,
  importManifestDependencies,
  checkManifestAvailable,
} from "../../actions";
import type { NodeRefType } from "@/lib/workspaces/types";
import { AddNodePopup } from "./AddNodePopup";
import { AddLinkPopup } from "./AddLinkPopup";
import { ManifestPopup } from "./ManifestPopup";
import { WorkspacePackageLibrary, PKG_DRAG_MIME } from "./WorkspacePackageLibrary";

type WorkspacesDict = Dictionary["workspaces"];
type GraphDict = WorkspacesDict["graph"];
type NodesDict = WorkspacesDict["nodes"];

type RefEditorLabels = {
  editRef: string;
  refSave: string;
  refDefault: string;
  refValuePlaceholder: string;
  branch: string;
  tag: string;
  version: string;
};

type WorkspaceNodeData = {
  label: string;
  kind: "pkg" | "ext";
  isRoot: boolean;
  refPin: string | null;
  refType: NodeRefType | null;
  refValue: string | null;
  rootLabel: string;
  defaultRefHint: string;
  onSetRoot: (nodeId: string) => void;
  onSaveRef: (nodeId: string, refType: NodeRefType | null, refValue: string) => void;
  onDelete: (nodeId: string) => void;
  setRootLabel: string;
  deleteLabel: string;
  refLabels: RefEditorLabels;
};

// Inline ref-pin editor (frente D) — click the pin to set/clear the node's git
// ref on the canvas. `nodrag` keeps ReactFlow from dragging the node while the
// controls are used. Empty value via "Default" clears the pin (default branch).
function RefPinEditor({
  id,
  refType,
  refValue,
  defaultRefHint,
  refPin,
  labels,
  onSaveRef,
}: {
  id: string;
  refType: NodeRefType | null;
  refValue: string | null;
  defaultRefHint: string;
  refPin: string | null;
  labels: RefEditorLabels;
  onSaveRef: (nodeId: string, refType: NodeRefType | null, refValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<NodeRefType>(refType ?? "branch");
  const [value, setValue] = useState(refValue ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        title={labels.editRef}
        onClick={(e) => {
          e.stopPropagation();
          setType(refType ?? "branch");
          setValue(refValue ?? "");
          setEditing(true);
        }}
        className="nodrag mt-0.5 block w-full truncate text-left text-[11px] text-slate-500 hover:text-brand-blue transition-colors"
      >
        {refPin ?? defaultRefHint}
      </button>
    );
  }

  return (
    <div className="nodrag mt-1 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as NodeRefType)}
        className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-200"
      >
        <option value="branch">{labels.branch}</option>
        <option value="tag">{labels.tag}</option>
        <option value="version">{labels.version}</option>
      </select>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={labels.refValuePlaceholder}
        className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-200 placeholder:text-slate-600"
      />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            onSaveRef(id, type, value.trim());
            setEditing(false);
          }}
          className="flex-1 rounded bg-brand-blue/80 px-1 py-0.5 text-[10px] font-semibold text-white hover:bg-brand-blue"
        >
          {labels.refSave}
        </button>
        <button
          type="button"
          onClick={() => {
            onSaveRef(id, null, "");
            setEditing(false);
          }}
          className="flex-1 rounded border border-slate-700 px-1 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
        >
          {labels.refDefault}
        </button>
      </div>
    </div>
  );
}

function WorkspaceNodeRenderer({
  id,
  data,
}: NodeProps<Node<WorkspaceNodeData>>) {
  const {
    label,
    kind,
    isRoot,
    refPin,
    refType,
    refValue,
    rootLabel,
    defaultRefHint,
    onSetRoot,
    onSaveRef,
    onDelete,
    setRootLabel,
    deleteLabel,
    refLabels,
  } = data as WorkspaceNodeData;

  return (
    <div
      className={[
        "relative rounded-lg border bg-brand-slate-light px-3 py-2 min-w-[160px] max-w-[200px] text-left",
        isRoot
          ? "border-brand-red ring-2 ring-brand-red/40"
          : "border-slate-700",
      ].join(" ")}
    >
      <button
        type="button"
        title={deleteLabel}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="nodrag absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs leading-none text-slate-400 hover:border-rose-500 hover:text-rose-400 transition-colors"
      >
        ×
      </button>

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={true}
        className="!bg-slate-600 !border-slate-500 !w-2 !h-2"
      />

      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={[
            "text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded",
            kind === "pkg"
              ? "bg-brand-blue/20 text-brand-blue"
              : "bg-slate-700 text-slate-400",
          ].join(" ")}
        >
          {kind}
        </span>
        {isRoot && (
          <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red">
            {rootLabel}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-white truncate leading-snug">
        {label}
      </p>

      <RefPinEditor
        id={id}
        refType={refType}
        refValue={refValue}
        defaultRefHint={defaultRefHint}
        refPin={refPin}
        labels={refLabels}
        onSaveRef={onSaveRef}
      />

      {!isRoot && (
        <button
          className="mt-1.5 w-full text-[10px] text-slate-400 hover:text-brand-red border border-slate-700 hover:border-brand-red/60 rounded px-1.5 py-0.5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSetRoot(id);
          }}
        >
          {setRootLabel}
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={true}
        className="!bg-slate-600 !border-slate-500 !w-2 !h-2"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workspaceNode: WorkspaceNodeRenderer as NodeTypes[string],
};

// Pure helpers — no Math.random / Date.now (BR6, AC-09)
function getNodeLabel(n: WorkspaceNodeWithTarget): string {
  if (n.external_link_id !== null) return n.external_link?.label ?? "—";
  return n.packages?.name ?? n.packages?.slug ?? "—";
}

function getRefPin(n: WorkspaceNodeWithTarget): string | null {
  if (n.ref_type === null || n.ref_value === null) return null;
  return `${n.ref_type}:${n.ref_value}`;
}

function toRfNodes(
  serverNodes: WorkspaceNodeWithTarget[],
  serverEdges: WorkspaceEdgeWithLabels[],
  gd: GraphDict,
  nd: NodesDict,
  onSetRoot: (id: string) => void,
  onSaveRef: (id: string, refType: NodeRefType | null, refValue: string) => void,
  onDelete: (id: string) => void,
): Node[] {
  // Auto-layout is the fallback for nodes that have no persisted position
  // (legacy rows, or added before drag-to-place).
  const positions = computeLayout(serverNodes, serverEdges);
  const refLabels: RefEditorLabels = {
    editRef: gd.editRef,
    refSave: gd.refSave,
    refDefault: gd.refDefault,
    refValuePlaceholder: gd.refValuePlaceholder,
    branch: gd.refTypeBranch,
    tag: gd.refTypeTag,
    version: gd.refTypeVersion,
  };
  return serverNodes.map((n): Node => ({
    id: n.id,
    type: "workspaceNode",
    position:
      n.position_x !== null && n.position_y !== null
        ? { x: n.position_x, y: n.position_y }
        : positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: getNodeLabel(n),
      kind: n.external_link_id !== null ? "ext" : "pkg",
      isRoot: n.is_root,
      refPin: getRefPin(n),
      refType: n.ref_type,
      refValue: n.ref_value,
      rootLabel: gd.rootLabel,
      defaultRefHint: gd.defaultRefHint,
      onSetRoot,
      onSaveRef,
      onDelete,
      setRootLabel: nd.setRootButton,
      deleteLabel: gd.deleteNode,
      refLabels,
    } as WorkspaceNodeData,
  }));
}

function toRfEdges(serverEdges: WorkspaceEdgeWithLabels[]): Edge[] {
  return serverEdges.map((e) => ({
    id: e.id,
    source: e.from_node_id,
    target: e.to_node_id,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
    style: { stroke: "#475569", strokeWidth: 1.5 },
  }));
}

type Props = {
  nodes: WorkspaceNodeWithTarget[];
  edges: WorkspaceEdgeWithLabels[];
  dict: WorkspacesDict;
  packages: ActivePackageOption[];
  links: ExternalRepoLink[];
  workspaceId: string;
};

export function WorkspaceGraphCanvas({
  nodes: propNodes,
  edges: propEdges,
  dict,
  packages,
  links,
  workspaceId,
}: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  // ReactFlow instance — captured on init so onDrop can map screen→flow coords.
  const rfRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  // Toolbar popup state — at most one popup open at a time (AC-04)
  const [openPopup, setOpenPopup] = useState<"node" | "link" | "manifest" | null>(null);

  // Stable set-root callback (AC-05, BR4)
  const handleSetRoot = useCallback(
    (nodeId: string) => {
      const fd = new FormData();
      fd.set("node_id", nodeId);
      fd.set("workspace_id", workspaceId);
      startTransition(async () => {
        await setRootNode(fd);
        router.refresh();
      });
    },
    [workspaceId, router],
  );

  // Inline ref re-pin (frente D). Empty refType+value clears to default branch.
  const handleSaveRef = useCallback(
    (nodeId: string, refType: NodeRefType | null, refValue: string) => {
      const fd = new FormData();
      fd.set("node_id", nodeId);
      fd.set("workspace_id", workspaceId);
      if (refType !== null && refValue.length > 0) {
        fd.set("ref_type", refType);
        fd.set("ref_value", refValue);
      }
      startTransition(async () => {
        await updateNodeRef(fd);
        router.refresh();
      });
    },
    [workspaceId, router],
  );

  // Delete a node via its ✕ button (same action as select + Delete key).
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const fd = new FormData();
      fd.set("node_id", nodeId);
      fd.set("workspace_id", workspaceId);
      startTransition(async () => {
        await removeWorkspaceNode(fd);
        router.refresh();
      });
    },
    [workspaceId, router],
  );

  // Import the root (PAI) repo's declared dependencies (pubpascal.json, else
  // boss.json) → nodes + edges.
  const handleImport = useCallback(() => {
    const gd = dict.graph;
    startTransition(async () => {
      const res = await importManifestDependencies(workspaceId);
      if (res.error === "no-root-package") setNotice(gd.bossNoRoot);
      else if (res.error === "no-boss") setNotice(gd.bossNoFile);
      else if (res.error) setNotice(gd.bossError);
      else
        setNotice(
          `✓ ${res.imported ?? 0} ${gd.bossNew} · ${res.alreadyPresent ?? 0} ${gd.bossExisting} · ${res.skipped ?? 0} ${gd.bossSkipped}`,
        );
      router.refresh();
    });
  }, [workspaceId, router, dict.graph]);

  // Gate the Import button: only enable it when the root (PAI) repo publishes a
  // manifest to import from (pubpascal.json, or boss.json during migration).
  // Re-checks when the root changes.
  const rootNodeId = propNodes.find((n) => n.is_root)?.id ?? null;
  const [manifestAvailable, setManifestAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    // No synchronous setState here (cascading-render lint rule) — the button just
    // keeps its prior state until the async check resolves.
    let cancelled = false;
    void checkManifestAvailable(workspaceId).then((ok) => {
      if (!cancelled) setManifestAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, rootNodeId]);

  // RF state seeded from server props; props are the single source of truth (ADR-070)
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(
    toRfNodes(propNodes, propEdges, dict.graph, dict.nodes, handleSetRoot, handleSaveRef, handleDeleteNode),
  );
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(
    toRfEdges(propEdges),
  );

  // Prop→state resync after router.refresh() (AC-08)
  useEffect(() => {
    setRfNodes(
      toRfNodes(propNodes, propEdges, dict.graph, dict.nodes, handleSetRoot, handleSaveRef, handleDeleteNode),
    );
    setRfEdges(toRfEdges(propEdges));
    // dict.graph / dict.nodes included so label changes propagate; stable in practice
  }, [propNodes, propEdges, handleSetRoot, handleSaveRef, handleDeleteNode, dict.graph, dict.nodes, setRfNodes, setRfEdges]);

  // Package ids already in the workspace — the library hides these so a drop
  // never hits the (workspace_id, package_id) unique constraint.
  const addedPackageIds = useMemo(
    () =>
      new Set(
        propNodes
          .map((n) => n.package_id)
          .filter((id): id is string => id !== null),
      ),
    [propNodes],
  );

  // Drop a package from the library onto the canvas → add it as a node with NO
  // ref pin (tracks the default branch; pin later). The drop position is not
  // persisted — layout stays auto-computed (coordinate-free model).
  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(PKG_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const packageId = event.dataTransfer.getData(PKG_DRAG_MIME);
      if (!packageId) return;
      event.preventDefault();
      const fd = new FormData();
      fd.set("workspace_id", workspaceId);
      fd.set("target_kind", "package");
      fd.set("package_id", packageId);
      // Drop at the cursor in flow coordinates so the node lands where released.
      const pos = rfRef.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (pos) {
        fd.set("position_x", String(pos.x));
        fd.set("position_y", String(pos.y));
      }
      // No ref_type / ref_value → default branch (action accepts a null ref).
      startTransition(async () => {
        const result = await addWorkspaceNode({}, fd);
        if (result.error) setNotice(result.error);
        router.refresh();
      });
    },
    [workspaceId, router],
  );

  // Persist a node's new position after a drag (UI-only; no router.refresh so the
  // drag isn't fought by a re-fetch).
  const handleNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      const fd = new FormData();
      fd.set("workspace_id", workspaceId);
      fd.set("node_id", node.id);
      fd.set("position_x", String(node.position.x));
      fd.set("position_y", String(node.position.y));
      startTransition(async () => {
        await updateNodePosition(fd);
      });
    },
    [workspaceId],
  );

  // Edge creation — source→target verbatim (BR2, AC-02)
  const handleConnect = useCallback(
    (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target) return;
      const fd = new FormData();
      fd.set("workspace_id", workspaceId);
      fd.set("from_node_id", source);
      fd.set("to_node_id", target);
      startTransition(async () => {
        const result = await addWorkspaceEdge({}, fd);
        if (result.error) setNotice(result.error);
        router.refresh();
      });
    },
    [workspaceId, router],
  );

  // Node deletion (AC-04, BR5 — DB cascade drops incident edges)
  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      startTransition(async () => {
        for (const node of deleted) {
          const fd = new FormData();
          fd.set("node_id", node.id);
          fd.set("workspace_id", workspaceId);
          await removeWorkspaceNode(fd);
        }
        router.refresh();
      });
    },
    [workspaceId, router],
  );

  // Edge deletion (AC-03)
  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      startTransition(async () => {
        for (const edge of deleted) {
          const fd = new FormData();
          fd.set("edge_id", edge.id);
          fd.set("workspace_id", workspaceId);
          await removeWorkspaceEdge(fd);
        }
        router.refresh();
      });
    },
    [workspaceId, router],
  );

  const gd = dict.graph;

  return (
    <>
    {/* resize-y → drag the bottom edge to grow the canvas; min/max keep it sane. */}
    <div className="flex h-[600px] min-h-[360px] max-h-[90vh] w-full resize-y rounded-lg border border-slate-800 overflow-hidden">
      <WorkspacePackageLibrary
        packages={packages}
        addedPackageIds={addedPackageIds}
        dict={gd.library}
      />
      <div
        className="relative flex-1"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onNodeDragStop={handleNodeDragStop}
        onInit={(instance) => {
          rfRef.current = instance;
        }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        colorMode="dark"
      >
        <Background color="#334155" gap={24} size={1} />
        <Controls />

        {/* Empty state (AC-10) */}
        {rfNodes.length === 0 && (
          <Panel position="top-center">
            <p className="text-sm text-slate-500 pointer-events-none select-none">
              {gd.emptyState}
            </p>
          </Panel>
        )}

        {/* Cycle / duplicate / error notice (AC-07) */}
        {notice && (
          <Panel position="top-right">
            <div className="flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 max-w-[260px] shadow-sm">
              <span className="flex-1">{notice}</span>
              <button
                onClick={() => setNotice(null)}
                className="shrink-0 text-rose-400 hover:text-rose-200 transition-colors"
              >
                {gd.noticeDismiss}
              </button>
            </div>
          </Panel>
        )}

        {/* Toolbar — two buttons opening individual popups (AC-01) */}
        <Panel position="top-left">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpenPopup("node")}
              className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-brand-red/90 transition-colors"
            >
              {gd.toolbarAddNode}
            </button>
            <button
              type="button"
              onClick={() => setOpenPopup("link")}
              className="rounded-md border border-slate-600 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-md hover:border-slate-400 transition-colors"
            >
              {gd.toolbarAddLink}
            </button>
            <button
              type="button"
              onClick={() => setOpenPopup("manifest")}
              className="rounded-md border border-slate-600 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-md hover:border-slate-400 transition-colors"
            >
              {gd.toolbarManifest}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={manifestAvailable !== true}
              title={manifestAvailable === false ? gd.bossUnavailable : gd.bossButton}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold shadow-md transition-colors ${
                manifestAvailable === true
                  ? "border-emerald-600/50 bg-emerald-900/30 text-emerald-300 hover:border-emerald-400"
                  : "cursor-not-allowed border-slate-700/50 bg-slate-900/50 text-slate-500"
              }`}
            >
              {gd.bossButton}
            </button>
          </div>
        </Panel>

        {/* Legend (AC-11) */}
        <Panel position="bottom-right">
          <div className="flex items-center gap-3 rounded border border-slate-700/60 bg-slate-900/80 px-2.5 py-1.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand-blue/40 border border-brand-blue/60 inline-block" />
              {gd.legendPkg}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 border border-slate-600 inline-block" />
              {gd.legendExt}
            </span>
          </div>
        </Panel>
      </ReactFlow>
      </div>
    </div>

      {openPopup === "node" && (
        <AddNodePopup
          packages={packages}
          links={links}
          workspaceId={workspaceId}
          dict={dict}
          onClose={() => setOpenPopup(null)}
        />
      )}

      {openPopup === "link" && (
        <AddLinkPopup
          links={links}
          workspaceId={workspaceId}
          dict={dict}
          onClose={() => setOpenPopup(null)}
        />
      )}

      {openPopup === "manifest" && (
        <ManifestPopup
          workspaceId={workspaceId}
          dict={gd}
          onClose={() => setOpenPopup(null)}
        />
      )}
    </>
  );
}
