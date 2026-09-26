// Pure deterministic layered layout for workspace DAGs.
// No React, no server-only, no Math.random, no Date.now (BR6, ADR-067).
// Algorithm: depth = longest path from layout roots (is_root, else no-in-edge,
// else all); rows sorted by created_at; cycle-safe DFS visited-path guard (R5).

export interface LayoutNode {
  id: string;
  is_root: boolean;
  created_at: string;
}

export interface LayoutEdge {
  from_node_id: string;
  to_node_id: string;
}

export interface Position {
  x: number;
  y: number;
}

const H_GAP = 220; // horizontal distance between node centres
const V_GAP = 130; // vertical distance between layers

export function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Map<string, Position> {
  if (nodes.length === 0) return new Map();

  const allIds = nodes.map((n) => n.id);

  // Build outgoing adjacency and in-degree (only edges whose both endpoints exist)
  const outgoing = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const id of allIds) {
    outgoing.set(id, []);
    inDegree.set(id, 0);
  }
  for (const edge of edges) {
    if (!outgoing.has(edge.from_node_id) || !outgoing.has(edge.to_node_id))
      continue;
    outgoing.get(edge.from_node_id)!.push(edge.to_node_id);
    inDegree.set(
      edge.to_node_id,
      (inDegree.get(edge.to_node_id) ?? 0) + 1,
    );
  }

  // Layout roots: explicit is_root > no-incoming-edge > all (full-cycle fallback)
  const isRootIds = nodes.filter((n) => n.is_root).map((n) => n.id);
  const sourceIds = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  const roots =
    isRootIds.length > 0
      ? isRootIds
      : sourceIds.length > 0
        ? sourceIds
        : allIds;

  // Longest-path depth via DFS; cycle edges skipped via path-tracking visited set
  const depth = new Map<string, number>();

  function dfs(id: string, d: number, path: Set<string>): void {
    if (path.has(id)) return; // cycle edge — best-effort: skip
    const prev = depth.get(id) ?? -1;
    if (d <= prev) return; // not deeper than already recorded
    depth.set(id, d);
    path.add(id);
    for (const nbr of outgoing.get(id) ?? []) {
      dfs(nbr, d + 1, path);
    }
    path.delete(id);
  }

  for (const root of roots) {
    dfs(root, 0, new Set());
  }

  // Nodes unreachable from any root → depth 0
  for (const id of allIds) {
    if (!depth.has(id)) depth.set(id, 0);
  }

  // Group by depth; within each row sort by created_at (stable, deterministic)
  const rows = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const d = depth.get(node.id) ?? 0;
    if (!rows.has(d)) rows.set(d, []);
    rows.get(d)!.push(node);
  }
  for (const row of rows.values()) {
    row.sort((a, b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
    );
  }

  // Assign positions: row centred horizontally, y = depth × V_GAP
  const positions = new Map<string, Position>();
  for (const [d, row] of rows) {
    const n = row.length;
    for (let i = 0; i < n; i++) {
      positions.set(row[i].id, {
        x: (i - (n - 1) / 2) * H_GAP,
        y: d * V_GAP,
      });
    }
  }

  return positions;
}
