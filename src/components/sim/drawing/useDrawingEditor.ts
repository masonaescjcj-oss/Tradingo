import { useRef, useState } from 'react';

import {
  defaultColor,
  drawingHandles,
  drawingShapes,
  expandPosition,
  findTool,
  hitShapes,
  newDrawingId,
  placeHint,
  shiftDrawing,
  thinStroke,
  timeIndex,
  type DrawMap,
  type DrawPoint,
  type Drawing,
  type ToolDef,
  type ToolId,
} from '@/lib/drawings';

import type { DrawnItem } from './DrawingLayer';

/** A press has to move this far (px) before it counts as a drag. */
const SLOP = 5;
/** How close (px) a press has to be to a handle to grab it; fingers are big. */
const HANDLE_REACH = 20;

type Press =
  | { kind: 'place'; x: number; y: number; index: number; moved: boolean; spawned: boolean; lastX: number; lastY: number }
  | { kind: 'handle'; x: number; y: number; index: number; moved: boolean; orig: Drawing }
  | { kind: 'body'; x: number; y: number; moved: boolean; orig: Drawing; start: DrawPoint }
  | { kind: 'tap'; x: number; y: number };

/** How the chart maps drawings to the screen right now. */
export type DrawingGeometry = {
  map: DrawMap;
  times: number[];
  /** The chart point under a screen position; `snap` puts it on the nearest candle. */
  pointAt: (x: number, y: number, snap: boolean) => DrawPoint;
  decimals: number;
  /** Stop distance for a new long/short position tool. */
  stopDistance: number;
};

const isPosition = (tool: ToolId) => tool === 'longPosition' || tool === 'shortPosition';

/**
 * Drawing on the chart, TradingView style: with a tool picked, taps (or a drag) place its
 * points; otherwise a tap selects a drawing, and a selected drawing can be dragged by a
 * handle or as a whole. The chart forwards its touches here and pans when they aren't used.
 */
export function useDrawingEditor({
  drawings,
  onChange,
  tool,
  onToolDone,
  geo,
}: {
  drawings: Drawing[];
  /** Saves the symbol's drawings; false means there's no room for more. */
  onChange?: (next: Drawing[]) => boolean | void;
  tool: ToolId | null;
  onToolDone?: () => void;
  geo: DrawingGeometry | null;
}) {
  const enabled = !!onChange && !!geo;
  const [draftState, setDraftState] = useState<Drawing | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<Drawing | null>(null);
  const [text, setText] = useState<{ drawing: Drawing; isNew: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Touch events can come faster than renders, so the handlers work on refs.
  const press = useRef<Press | null>(null);
  const draftRef = useRef<Drawing | null>(null);
  const liveRef = useRef<Drawing | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placing: ToolDef | null = enabled && tool ? (findTool(tool) ?? null) : null;
  const draft = placing && draftState?.tool === placing.id ? draftState : null;
  const selected = enabled && !placing && selectedId ? (drawings.find((d) => d.id === selectedId) ?? null) : null;

  const setDraft = (d: Drawing | null) => {
    draftRef.current = d;
    setDraftState(d);
  };
  const setLive = (d: Drawing | null) => {
    liveRef.current = d;
    setLiveState(d);
  };
  const flash = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  };
  const save = (next: Drawing[]) => {
    if (!onChange) return false;
    const ok = onChange(next) !== false;
    if (!ok) flash('جای رسم تازه نیست؛ چندتا از رسم‌های قبلی رو پاک کن.');
    return ok;
  };

  const finish = (d: Drawing) => {
    const def = findTool(d.tool);
    if (!def || !geo) return;
    let out = d;
    if (isPosition(d.tool)) out = expandPosition(d, geo.times, geo.stopDistance, geo.decimals);
    if (def.place === 'brush') out = { ...out, points: thinStroke(out.points) };
    setDraft(null);
    press.current = null;
    onToolDone?.();
    if (def.text) {
      setText({ drawing: out, isNew: true });
      return;
    }
    if (save([...drawings, out])) setSelectedId(out.id);
  };

  /** A finger went down at (x, y); true if drawing uses the touch (so the chart shouldn't pan). */
  const down = (x: number, y: number): boolean => {
    if (!enabled || !geo || text) return false;
    if (placing) {
      const current = draftRef.current?.tool === placing.id ? draftRef.current : null;
      const points = [...(current?.points ?? []), geo.pointAt(x, y, placing.place !== 'brush')];
      setDraft({ id: current?.id ?? newDrawingId(), tool: placing.id, color: defaultColor(placing.id), points });
      press.current = { kind: 'place', x, y, index: points.length - 1, moved: false, spawned: false, lastX: x, lastY: y };
      return true;
    }
    if (selected) {
      let best = -1;
      let bestDist = HANDLE_REACH;
      drawingHandles(selected, geo.map).forEach((h, i) => {
        const dist = Math.hypot(h.x - x, h.y - y);
        if (dist <= bestDist) {
          best = i;
          bestDist = dist;
        }
      });
      if (best >= 0) {
        press.current = { kind: 'handle', x, y, index: best, moved: false, orig: selected };
        return true;
      }
      if (hitShapes(drawingShapes(selected, geo.map), x, y, 12)) {
        press.current = { kind: 'body', x, y, moved: false, orig: selected, start: geo.pointAt(x, y, false) };
        return true;
      }
    }
    press.current = { kind: 'tap', x, y };
    return false;
  };

  const move = (x: number, y: number) => {
    const p = press.current;
    if (!p || p.kind === 'tap' || !geo) return;
    if (!p.moved) {
      if (Math.hypot(x - p.x, y - p.y) < SLOP) return;
      p.moved = true;
    }
    if (p.kind === 'place') {
      const d = draftRef.current;
      const def = d && findTool(d.tool);
      if (!d || !def) return;
      let points = d.points;
      if (def.place === 'brush') {
        if (Math.hypot(x - p.lastX, y - p.lastY) < 3) return;
        p.lastX = x;
        p.lastY = y;
        points = [...points, geo.pointAt(x, y, false)];
      } else {
        const pt = geo.pointAt(x, y, true);
        const need = def.place === 'multi' ? Infinity : def.place;
        // Dragging from a new point draws out the next one, like TradingView; otherwise it moves the point.
        if (!p.spawned && p.index === points.length - 1 && points.length < need) {
          p.spawned = true;
          p.index += 1;
          points = [...points, pt];
        } else points = points.map((q, i) => (i === p.index ? pt : q));
      }
      setDraft({ ...d, points });
      return;
    }
    if (p.kind === 'handle') {
      const pt = geo.pointAt(x, y, true);
      const o = p.orig.points;
      // A position's stop handle sits on the box's right edge: it sets the stop price and the width.
      const points =
        isPosition(p.orig.tool) && p.index === 2
          ? o.map((q, i) => (i === 2 ? { t: q.t, p: pt.p } : i === 1 ? { t: pt.t, p: q.p } : q))
          : o.map((q, i) => (i === p.index ? pt : q));
      setLive({ ...p.orig, points });
      return;
    }
    const cur = geo.pointAt(x, y, false);
    const bars = Math.round(timeIndex(geo.times, cur.t) - timeIndex(geo.times, p.start.t));
    setLive(shiftDrawing(p.orig, geo.times, bars, cur.p - p.start.p, geo.decimals));
  };

  /** The finger lifted; `tapped` is false when the chart panned instead. */
  const up = (tapped: boolean) => {
    const p = press.current;
    press.current = null;
    if (!p || !geo) return;
    if (p.kind === 'place') {
      const d = draftRef.current;
      const def = d && findTool(d.tool);
      if (!d || !def) return;
      if (def.place === 'brush') {
        if (d.points.length >= 2) finish(d);
        else setDraft(null);
      } else if (def.place !== 'multi' && d.points.length >= def.place) finish(d);
      return;
    }
    if (p.kind === 'handle' || p.kind === 'body') {
      const moved = liveRef.current;
      setLive(null);
      if (p.moved && moved) save(drawings.map((d) => (d.id === moved.id ? moved : d)));
      return;
    }
    if (tapped) {
      // Lines win over shaded zones, and newer drawings over older ones.
      const top = [...drawings].reverse().map((d) => ({ d, shapes: drawingShapes(d, geo.map) }));
      const hit = top.find((o) => hitShapes(o.shapes, p.x, p.y, 10, false)) ?? top.find((o) => hitShapes(o.shapes, p.x, p.y, 10));
      setSelectedId(hit?.d.id ?? null);
    }
  };

  const cancel = () => {
    setDraft(null);
    press.current = null;
    onToolDone?.();
  };
  /** Finishes an open-ended tool (path, polyline). */
  const done = () => {
    const d = draftRef.current;
    if (d && d.points.length >= 2) finish(d);
    else cancel();
  };
  /** Drops a half-placed drawing, e.g. before picking another tool. */
  const reset = () => {
    setDraft(null);
    press.current = null;
  };

  const recolor = (color: string) => {
    if (selected) save(drawings.map((d) => (d.id === selected.id ? { ...d, color } : d)));
  };
  const remove = () => {
    if (!selected) return;
    save(drawings.filter((d) => d.id !== selected.id));
    setSelectedId(null);
  };
  const editText = () => {
    if (selected) setText({ drawing: selected, isNew: false });
  };
  const submitText = (value: string) => {
    if (!text) return;
    const d = { ...text.drawing, text: value };
    setText(null);
    if (!text.isNew) save(drawings.map((x) => (x.id === d.id ? d : x)));
    else if (save([...drawings, d])) setSelectedId(d.id);
  };

  // What to draw: saved drawings (one maybe mid-drag), then the one being placed or named.
  const live = liveState && selected && liveState.id === selected.id ? liveState : null;
  const shown = drawings.map((d) => (live && d.id === live.id ? live : d));
  const extra = draft ?? (text?.isNew ? text.drawing : null);
  const items: DrawnItem[] = geo
    ? [...shown, ...(extra ? [extra] : [])].map((d) => {
        const isSelected = !!selected && d.id === selected.id;
        return { d, shapes: drawingShapes(d, geo.map), handles: isSelected || d === draft ? drawingHandles(d, geo.map) : [], selected: isSelected };
      })
    : [];

  return {
    items,
    placing,
    hint: placing ? placeHint(placing, draft?.points.length ?? 0) : null,
    canFinish: placing?.place === 'multi' && (draft?.points.length ?? 0) >= 2,
    selected,
    text,
    notice,
    /** Touches should go to drawing rather than scroll the page. */
    grabsTouch: !!placing || !!selected,
    /** A drag on a drawing is under way, so the chart must keep the touch. */
    holding: () => !!press.current && press.current.kind !== 'tap',
    down,
    move,
    up,
    cancel,
    done,
    reset,
    recolor,
    remove,
    editText,
    submitText,
    cancelText: () => setText(null),
    deselect: () => setSelectedId(null),
  };
}
