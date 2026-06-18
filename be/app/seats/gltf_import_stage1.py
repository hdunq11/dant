"""
Import tọa độ ghế từ model stage_1 (virtual fair).

Khác import Sketchfab (seat_seat_0): stage_1 không đặt tên ghế — quét đỉnh mesh
trong vùng khán đài, gom cụm theo (x, z) rồi map vào lưới ghế DB của venue.
"""
from __future__ import annotations

import struct
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from pygltflib import GLTF2

from app.seats.stage1_seat_grid import (
    STAGE1_ROW_COUNT,
    STAGE1_SEATS_PER_ROW,
    STAGE1_SEATS_PER_SIDE,
    stage1_row_index,
)
# GLTF world-space: chỉ lấy mặt ghế, loại khung/sàn/truss (Y cao)
SEAT_CUSHION_Y_MIN = 0.35
SEAT_CUSHION_Y_MAX = 2.65
SEAT_Z_MIN = 15.0
SEAT_Z_MAX = 38.0
SEAT_X_ABS_MAX = 14.5
# Mặt nệm khán giả ~0.79m; khung/speaker/sân khấu >= 1.4m
MAX_AUDIENCE_SEAT_HEIGHT = 1.05
SNAP_BIN_X = 0.15
SNAP_BIN_Z = 0.22
MIN_VERTS_PER_SLOT = 3
ROW_Z_BAND = 0.45
DEDUPE_MIN_DX = 0.20
COL_SNAP_DX = 0.42


@dataclass
class Stage1AudienceBounds:
    min_x: float
    max_x: float
    min_z: float
    max_z: float
    seat_y: float


@dataclass
class Stage1SeatMarker:
    zone: str
    row: str
    number: int
    pos_x: float
    pos_y: float
    pos_z: float
    node_name: str


def _mat4_from_node(node) -> np.ndarray:
    if node.matrix:
        return np.array(node.matrix, dtype=np.float64).reshape(4, 4).T
    m = np.eye(4, dtype=np.float64)
    if node.translation:
        m[0, 3], m[1, 3], m[2, 3] = node.translation
    if node.rotation:
        qx, qy, qz, qw = node.rotation
        m[:3, :3] = np.array([
            [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
            [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
            [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
        ])
    if node.scale:
        sx, sy, sz = node.scale
        m = m @ np.diag([sx, sy, sz, 1.0])
    return m


def _walk_nodes(gltf: GLTF2, node_index: int, parent: np.ndarray):
    node = gltf.nodes[node_index]
    world = parent @ _mat4_from_node(node)
    yield node, world
    for child_index in node.children or []:
        yield from _walk_nodes(gltf, child_index, world)


def _is_seat_cushion_vertex(x: float, y: float, z: float) -> bool:
    return (
        SEAT_Z_MIN <= z <= SEAT_Z_MAX
        and abs(x) <= SEAT_X_ABS_MAX
        and SEAT_CUSHION_Y_MIN <= y <= SEAT_CUSHION_Y_MAX
    )


def _collect_seat_cushion_vertices(gltf_path: str | Path) -> np.ndarray:
    """Chỉ lấy đỉnh mặt ghế — bỏ truss, sân khấu, khung cao."""
    gltf = GLTF2().load(str(Path(gltf_path)))
    scene_index = gltf.scene if gltf.scene is not None else 0
    scene = gltf.scenes[scene_index]
    vertices: list[np.ndarray] = []

    for root_index in scene.nodes or []:
        for node, world in _walk_nodes(gltf, root_index, np.eye(4)):
            if node.mesh is None:
                continue
            mesh = gltf.meshes[node.mesh]
            for primitive in mesh.primitives:
                accessor = gltf.accessors[primitive.attributes.POSITION]
                buffer_view = gltf.bufferViews[accessor.bufferView]
                buffer = gltf.buffers[buffer_view.buffer]
                blob = gltf.get_data_from_buffer_uri(buffer.uri)
                start = (buffer_view.byteOffset or 0) + (accessor.byteOffset or 0)
                for i in range(0, accessor.count, 3):
                    local = struct.unpack_from('<3f', blob, start + i * 12)
                    wx, wy, wz = (world @ np.array([local[0], local[1], local[2], 1.0]))[:3]
                    if _is_seat_cushion_vertex(float(wx), float(wy), float(wz)):
                        vertices.append(np.array([wx, wy, wz], dtype=np.float64))

    if not vertices:
        return np.empty((0, 3))
    return np.vstack(vertices)


def detect_stage1_audience_bounds(gltf_path: str | Path) -> Stage1AudienceBounds | None:
    """Bounding box vùng ghế + độ cao mặt nệm (GLTF Y → Three.js pos_z)."""
    seats = _collect_seat_cushion_vertices(gltf_path)
    if len(seats) < 80:
        return None
    return Stage1AudienceBounds(
        min_x=float(seats[:, 0].min()),
        max_x=float(seats[:, 0].max()),
        min_z=float(seats[:, 2].min()),
        max_z=float(seats[:, 2].max()),
        seat_y=float(np.median(seats[:, 1])),
    )


def extract_stage1_physical_centers(gltf_path: str | Path) -> list[tuple[float, float, float]]:
    """
    Trích tâm ghế vật lý từ mặt nệm.
    Trả về (pos_x, pos_y_depth, pos_z_height) — hệ Three.js.
    """
    cushions = _collect_seat_cushion_vertices(gltf_path)
    if len(cushions) == 0:
        return []

    bins: dict[tuple[int, int], list[tuple[float, float, float]]] = defaultdict(list)
    for x, y, z in cushions:
        key = (round(x / SNAP_BIN_X), round(z / SNAP_BIN_Z))
        bins[key].append((float(x), float(y), float(z)))

    centers: list[tuple[float, float, float]] = []
    for points in bins.values():
        if len(points) < MIN_VERTS_PER_SLOT:
            continue
        ys = [p[1] for p in points]
        # Mặt ghế: lấy đỉnh nệm (Y cao trong cụm), không lấy chân ghế
        y_top = float(np.percentile(ys, 88))
        if y_top > SEAT_CUSHION_Y_MAX:
            continue
        near_top = [p for p in points if p[1] >= y_top - 0.25]
        cx = sum(p[0] for p in near_top) / len(near_top)
        cz = sum(p[2] for p in near_top) / len(near_top)
        cy = sum(p[1] for p in near_top) / len(near_top)
        centers.append((cx, cz, cy))

    return sorted(centers, key=lambda c: (c[1], c[0]))


def _filter_audience_centers(
    centers: list[tuple[float, float, float]],
) -> list[tuple[float, float, float]]:
    """Loại geometry sân khấu / loa / truss — chỉ giữ nệm ghế khán giả (~0.8m)."""
    return [p for p in centers if p[2] <= MAX_AUDIENCE_SEAT_HEIGHT]


def _dedupe_row_points(row_points: list[tuple[float, float, float]]) -> list[tuple[float, float, float]]:
    """Gộp chỉ mesh trùng cột (X gần nhau < 12cm), giữ nệm cao hơn."""
    sorted_pts = sorted(row_points, key=lambda p: p[0])
    out: list[tuple[float, float, float]] = []
    for p in sorted_pts:
        if not out or abs(p[0] - out[-1][0]) >= DEDUPE_MIN_DX:
            out.append(p)
        elif p[2] > out[-1][2]:
            out[-1] = p
    return out


def _find_global_aisle_x(physical: list[tuple[float, float, float]]) -> float:
    """Lối đi giữa 2 khối 500 ghế — khe X lớn nhất gần trục giữa."""
    if len(physical) < 4:
        return 0.0
    by_x = sorted(_dedupe_row_points(physical), key=lambda p: p[0])
    if len(by_x) < 2:
        return 0.0
    xs = [p[0] for p in by_x]
    span = max(xs) - min(xs)
    best_score = -1.0
    best_mid = 0.0
    for i in range(len(by_x) - 1):
        gap = by_x[i + 1][0] - by_x[i][0]
        mid = (by_x[i][0] + by_x[i + 1][0]) / 2
        center_weight = 1.0 - min(abs(mid) / max(span * 0.5, 0.01), 1.0)
        score = gap * (0.25 + 0.75 * center_weight)
        if score > best_score:
            best_score = score
            best_mid = mid
    return best_mid


def _split_left_right_blocks(
    physical: list[tuple[float, float, float]],
    aisle_x: float,
) -> tuple[list[tuple[float, float, float]], list[tuple[float, float, float]]]:
    """Tách mesh thành khối trái (1–500) và khối phải (501–1000)."""
    left = [p for p in physical if p[0] < aisle_x - 0.08]
    right = [p for p in physical if p[0] > aisle_x + 0.08]
    return left, right


def _block_x_bounds(pool: list[tuple[float, float, float]]) -> tuple[float, float]:
    """Biên X chuẩn của cả khối trái/phải — mọi hàng dùng chung."""
    if not pool:
        return -12.0, 12.0
    uniq = _dedupe_row_points(pool)
    xs = [p[0] for p in uniq]
    return float(min(xs)), float(max(xs))


def _block_row_z_targets(
    pool: list[tuple[float, float, float]],
    row_count: int,
) -> list[float]:
    zs = [p[1] for p in pool]
    z_min, z_max = min(zs), max(zs)
    span = max(z_max - z_min, 0.01)
    return [z_min + (i + 0.5) / row_count * span for i in range(row_count)]


def _points_in_row_band(
    pool: list[tuple[float, float, float]],
    target_z: float,
    band_half: float = 0.42,
) -> list[tuple[float, float, float]]:
    return [p for p in pool if abs(p[1] - target_z) <= band_half]


def _row_bands_by_z_interval(
    pool: list[tuple[float, float, float]],
    row_count: int,
) -> list[tuple[float, list[tuple[float, float, float]]]]:
    """Chia khối theo khoảng Z — mỗi ghế mesh thuộc đúng 1 hàng."""
    if not pool or row_count <= 0:
        return []
    zs = [p[1] for p in pool]
    z_min, z_max = min(zs), max(zs)
    span = max(z_max - z_min, 0.01)
    rows: list[tuple[float, list[tuple[float, float, float]]]] = []

    for row_idx in range(row_count):
        z_low = z_min + row_idx / row_count * span
        z_high = z_min + (row_idx + 1) / row_count * span
        if row_idx == row_count - 1:
            band = [p for p in pool if z_low <= p[1] <= z_high]
        else:
            band = [p for p in pool if z_low <= p[1] < z_high]
        if not band:
            target_z = z_min + (row_idx + 0.5) / row_count * span
            rows.append((target_z, []))
            continue
        target_z = float(np.median([p[1] for p in band]))
        rows.append((target_z, band))

    return rows


def _trim_row_outliers(
    points: list[tuple[float, float, float]],
) -> list[tuple[float, float, float]]:
    """Bỏ điểm lệch xa (truss/loa) trong hàng."""
    if len(points) < 8:
        return points
    xs = [p[0] for p in points]
    med = float(np.median(xs))
    span = max(max(xs) - med, med - min(xs), 0.01)
    limit = max(span * 0.52, 1.8)
    trimmed = [p for p in points if abs(p[0] - med) <= limit]
    return trimmed if len(trimmed) >= 4 else points


def _seat_mesh_key(p: tuple[float, float, float]) -> tuple[float, float]:
    return round(p[0], 2), round(p[1], 2)


def _row_seat_step(uniq: list[tuple[float, float, float]]) -> float:
    gaps = [uniq[i + 1][0] - uniq[i][0] for i in range(len(uniq) - 1)]
    real = [g for g in gaps if g >= 0.28]
    if real:
        return float(np.median(real))
    return 0.45


def _block_column_template(
    pool: list[tuple[float, float, float]],
    col_count: int,
) -> list[float]:
    """25 cột đều nhau giữa biên trái/phải khối — tránh gap đôi ở cột 8, 39."""
    xmin, xmax = _block_x_bounds(pool)
    if col_count <= 1:
        return [(xmin + xmax) / 2]
    step = (xmax - xmin) / (col_count - 1)
    return [xmin + col * step for col in range(col_count)]


def _map_row_seats(
    row_band: list[tuple[float, float, float]],
    col_count: int,
    target_z: float,
    fallback_h: float,
    column_template: list[float],
) -> list[tuple[float, float, float]]:
    """25 cột — X luôn theo template khối (thẳng hàng), chỉ lấy độ cao từ mesh."""
    if col_count <= 0:
        return []

    tight_band = [p for p in row_band if abs(p[1] - target_z) <= ROW_Z_BAND * 0.4]
    if len(tight_band) >= col_count // 2:
        row_band = tight_band

    uniq = _dedupe_row_points(row_band)
    row_h = float(np.median([p[2] for p in uniq])) if uniq else fallback_h
    template = column_template[:col_count]
    heights = [row_h] * col_count

    pairs: list[tuple[float, int, tuple[float, float, float]]] = []
    for col, tx in enumerate(template):
        for p in uniq:
            pairs.append((abs(p[0] - tx), col, p))

    used_mesh: set[tuple[float, float]] = set()
    used_cols: set[int] = set()
    for dist, col, p in sorted(pairs, key=lambda item: item[0]):
        mesh_key = _seat_mesh_key(p)
        if col in used_cols or mesh_key in used_mesh:
            continue
        if dist > COL_SNAP_DX + 0.18:
            continue
        used_cols.add(col)
        used_mesh.add(mesh_key)
        heights[col] = max(heights[col], p[2])

    return [(template[col], target_z, heights[col]) for col in range(col_count)]


def build_stage1_position_grid(
    bounds: Stage1AudienceBounds,
    physical: list[tuple[float, float, float]],
    *,
    row_count: int = STAGE1_ROW_COUNT,
    seats_per_side: int = STAGE1_SEATS_PER_SIDE,
) -> dict[tuple[int, int], tuple[float, float, float]]:
    """Map 2 khối 500 ghế — mỗi hàng bám mesh thật trong dải Z."""
    del bounds
    grid: dict[tuple[int, int], tuple[float, float, float]] = {}

    aisle_x = _find_global_aisle_x(physical)
    left_pool, right_pool = _split_left_right_blocks(physical, aisle_x)

    for pool, seat_from in ((left_pool, 1), (right_pool, STAGE1_SEATS_PER_SIDE + 1)):
        if not pool:
            continue

        row_bands = _row_bands_by_z_interval(pool, row_count)
        column_template = _block_column_template(pool, seats_per_side)
        default_h = float(np.median([p[2] for p in pool]))

        for row_idx, (target_z, row_band) in enumerate(row_bands):
            if not row_band:
                row_band = [p for p in pool if abs(p[1] - target_z) <= ROW_Z_BAND]
            positions = _map_row_seats(
                row_band,
                seats_per_side,
                target_z,
                default_h,
                column_template,
            )
            for offset, pos in enumerate(positions):
                grid[(row_idx, seat_from + offset)] = pos

    return grid


def _sorted_row_labels(seats: list) -> list[str]:
    labels = {seat.row_label for seat in seats}
    return sorted(labels, key=lambda row: stage1_row_index(row) if stage1_row_index(row) is not None else 999)


def map_stage1_venue_seats(
    seats: list,
    gltf_path: str | Path,
    **_,
) -> list[Stage1SeatMarker]:
    """
    Map ghế DB vào mesh stage_1 — 2 khối 500 (20×25 | lối đi | 20×25).
    `seats`: queryset/list Seat đã select_related zone.
    """
    bounds = detect_stage1_audience_bounds(gltf_path)
    if bounds is None:
        raise ValueError('Không đọc được vùng khán đài từ stage_1 GLTF')

    physical_centers = _filter_audience_centers(extract_stage1_physical_centers(gltf_path))
    if len(physical_centers) < 80:
        raise ValueError('Không đủ ghế khán giả sau lọc sân khấu — kiểm tra GLTF stage_1')
    row_labels = _sorted_row_labels(seats)
    row_index_map = {row: idx for idx, row in enumerate(row_labels)}
    position_grid = build_stage1_position_grid(
        bounds,
        physical_centers,
        row_count=len(row_labels),
    )

    markers: list[Stage1SeatMarker] = []
    for seat in sorted(seats, key=lambda s: (row_index_map.get(s.row_label, 0), s.seat_number)):
        row_idx = row_index_map.get(seat.row_label, 0)
        pos = position_grid.get((row_idx, seat.seat_number))
        if pos is None:
            continue
        x_three, z_three, height = pos

        markers.append(
            Stage1SeatMarker(
                zone=seat.zone.name,
                row=seat.row_label,
                number=seat.seat_number,
                pos_x=x_three,
                pos_y=z_three,
                pos_z=height,
                node_name=f'stage1_{seat.zone.name}_{seat.row_label}_{seat.seat_number}',
            )
        )

    return markers
