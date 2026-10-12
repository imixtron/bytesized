// Tree template (v1.9 proposal): a hierarchy. `tree` (default) lays levels down the whole stage;
// `radial` puts the root in the middle with rings of children (a mind map).
// stage: { variant?: tree | radial, root: { id, label, icon?, children?: [...] } }  (depth ≤ 3, ≤ 10 nodes)
// Verbs: reveal / appear (a node; the edge from its parent draws on), highlight (lights the path from the
// root to that node, the rest push back).
import { getLength } from "@remotion/paths";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { Arrow, HATCH, Svg, hatch } from "../parts/Diagram";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, localBeats, mixColor, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type TreeNode = { id: string; label: string; icon?: IconName; children?: TreeNode[] };
export type TreeStage = { variant?: "tree" | "radial"; root?: TreeNode };

const c = tokens.color;
const S = tokens.node.shadow;

export const Tree = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><TreeBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

type Placed = { n: TreeNode; depth: number; parent?: string; x: number; y: number };

/** Positions every node. Leaves take evenly spaced slots; a parent sits over the middle of its children. */
export function layoutTree(root: TreeNode, variant: "tree" | "radial", box: Pick<Box, "w" | "h">, size: { w: number; h: number }): Placed[] {
  const out: Placed[] = [];
  let leaf = 0;
  const leaves = (n: TreeNode): number => (n.children?.length ? n.children.reduce((a, ch) => a + leaves(ch), 0) : 1);
  const L = leaves(root);
  const maxDepth = (n: TreeNode): number => 1 + Math.max(0, ...(n.children ?? []).map(maxDepth));
  const D = maxDepth(root);
  const walk = (n: TreeNode, depth: number, parent?: string): number => {
    let u: number;
    if (!n.children?.length) u = (leaf++ + 0.5) / L;
    else {
      const us = n.children.map((ch) => walk(ch, depth + 1, n.id));
      u = (us[0] + us[us.length - 1]) / 2;
    }
    let x: number, y: number;
    if (variant === "radial") {
      // an ellipse that fills the stage; the first ring sits clear of the root, the last on the rim
      const rx = box.w / 2 - size.w / 2 - 10;
      const ry = box.h / 2 - size.h / 2 - 10;
      const ring = depth === 0 ? 0 : D <= 2 ? 1 : depth === D - 1 ? 1 : 0.7 + 0.15 * (depth - 1);
      const a = -Math.PI / 2 + u * 2 * Math.PI;
      x = box.w / 2 + Math.cos(a) * rx * ring;
      y = box.h / 2 + Math.sin(a) * ry * ring;
    } else {
      x = size.w / 2 + 10 + u * (box.w - size.w - 20);
      y = size.h / 2 + 20 + (D <= 1 ? 0 : (depth / (D - 1)) * (box.h - size.h - 40));
    }
    out.push({ n, depth, parent, x, y });
    return u;
  };
  walk(root, 0);
  return out;
}

export const TreeBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as TreeStage;
  const variant = stage.variant ?? "tree";
  const root = stage.root;
  if (!root) return null;
  const beats = localBeats(ctx.ts);
  const leafCount = (function lc(n: TreeNode): number { return n.children?.length ? n.children.reduce((a, ch) => a + lc(ch), 0) : 1; })(root);
  const size = variant === "radial" ? { w: 180, h: 96 } : { w: Math.max(120, Math.min(210, Math.floor((box.w - 20) / leafCount) - 14)), h: 110 };
  const placed = layoutTree(root, variant, box, size);
  const byId = new Map(placed.map((p) => [p.n.id, p]));
  const at = new Map(placed.map((p, i) => [p.n.id, firstAt(beats, ["reveal", "appear"], p.n.id) ?? p.depth * 26 + 8 + (i % 4) * 4]));
  // the highlighted node's root path is lit
  const hi = [...beats].reverse().find((b) => b.do === "highlight" && f >= b.at && b.targets.some((t) => byId.has(t)));
  const lit = new Set<string>();
  const litAt = hi?.at ?? 0;
  if (hi) for (let id: string | undefined = hi.targets.find((t) => byId.has(t)); id; id = byId.get(id)?.parent) lit.add(id);
  const g = hi ? tween(f, litAt, tokens.motion.standard.frames) : 0;

  const edge = (a: Placed, b: Placed) => {
    if (variant === "radial") return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    const sy = a.y + size.h / 2;
    const ey = b.y - size.h / 2 - 8;
    const my = (sy + ey) / 2;
    return `M ${a.x} ${sy} C ${a.x} ${my} ${b.x} ${my} ${b.x} ${ey}`;
  };

  return (
    <>
      <Svg>
        {placed.filter((p) => p.parent).map((p) => {
          const par = byId.get(p.parent!)!;
          const isLit = lit.has(p.n.id);
          const prog = tween(f, at.get(p.n.id)!, 16, ease.std);
          const col = isLit ? mixColor(c.cream3, c.orange, g) : hi ? mixColor(c.cream3, c.line, g) : c.cream3;
          return <Arrow key={p.n.id} d={edge(par, p)} progress={prog} color={col} head={false} width={isLit && g > 0.5 ? 8 : 6} />;
        })}
      </Svg>
      {placed.map((p) => {
        const k = pop(f, at.get(p.n.id)!);
        const root0 = p.depth === 0;
        const on = lit.has(p.n.id);
        const dim = hi && !on ? g : 0;
        const stroke = mixColor(mixColor(root0 ? c.orange : c.cream, c.orange, on ? g : 0), c.cream3, dim);
        if (k <= 0) return <div key={p.n.id} style={{ position: "absolute", left: p.x - size.w / 2, top: p.y - size.h / 2, width: size.w, height: size.h, borderRadius: 26, border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        return (
          <div key={p.n.id} style={{ position: "absolute", left: p.x - size.w / 2, top: p.y - size.h / 2, width: size.w, height: size.h, transform: `scale(${0.4 + 0.6 * k})`, opacity: Math.min(1, k * 1.6) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset * 0.8}px, ${S.offset * 0.8}px)`, borderRadius: 26, background: hatch(on && g > 0.5 || root0 ? HATCH.orange : dim > 0.5 ? HATCH.dim : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: root0 ? c.orange : c.surface, border: `${tokens.node.stroke}px solid ${root0 ? c.orange : stroke}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "0 10px", textAlign: "center" }}>
              {p.n.icon && <Icon name={p.n.icon} size={44} color={mixColor(c.cream, c.cream3, dim)} />}
              <div style={{ font: `800 ${size.w < 150 ? 26 : size.w >= 190 ? 36 : 32}px/1.05 ${fonts.text}`, color: root0 ? c.cream : mixColor(on && g > 0.5 ? c.ember : c.cream, c.cream3, dim) }}>{p.n.label}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};
