"""
Đọc GLTF/GLB và trích xuất vị trí ghế.

Hai chế độ:
1. named — node đặt tên seat_{ZONE}_{ROW}_{NUMBER}
2. sketchfab — model Sketchfab có khối seat_seat_0 (map grid theo zone)
"""
from __future__ import annotations

import re
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import numpy as np
from pygltflib import GLTF2

from .seat_grid import (
    DEFAULT_AISLE_AFTER,
    DEFAULT_ROW_COUNT,
    DEFAULT_SEATS_PER_ROW,
    DEFAULT_SEATS_PER_SIDE,
    default_row_labels,
    row_label_to_index,
    seat_x_in_section,
    seat_z_in_section,
)

# zone có thể chứa chữ/số; row là chữ; number là số
SEAT_NAME_RE = re.compile(
    r'^(?:seat[_-])?(?P<zone>[A-Za-z0-9]+)[_-](?P<row>[A-Za-z]+)[_-](?P<number>\d+)$',
    re.IGNORECASE,
)


@dataclass
class GltfSeatMarker:
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
        scale = np.diag([sx, sy, sz, 1.0])
        m = m @ scale
    return m


def _walk_nodes(
    gltf: GLTF2,
    node_index: int,
    parent: np.ndarray,
) -> Iterator[tuple[str, np.ndarray]]:
    node = gltf.nodes[node_index]
    world = parent @ _mat4_from_node(node)
    name = (node.name or '').strip()
    if name:
        yield name, world
    for child_index in node.children or []:
        yield from _walk_nodes(gltf, child_index, world)


def _world_position(matrix: np.ndarray) -> tuple[float, float, float]:
    x, y, z = matrix[0, 3], matrix[1, 3], matrix[2, 3]
    return float(x), float(y), float(z)


def parse_seat_name(name: str) -> tuple[str, str, int] | None:
    match = SEAT_NAME_RE.match(name.strip())
    if not match:
        return None
    return match.group('zone'), match.group('row').upper(), int(match.group('number'))


def extract_seat_markers(gltf_path: str | Path) -> list[GltfSeatMarker]:
    path = Path(gltf_path)
    if not path.exists():
        raise FileNotFoundError(f'Không tìm thấy file GLTF/GLB: {path}')

    gltf = GLTF2().load(str(path))
    if gltf.scene is None and gltf.scenes:
        scene_index = 0
    else:
        scene_index = gltf.scene or 0

    scene = gltf.scenes[scene_index]
    markers: list[GltfSeatMarker] = []
    seen: set[tuple[str, str, int]] = set()

    for root_index in scene.nodes or []:
        for name, world_matrix in _walk_nodes(gltf, root_index, np.eye(4)):
            parsed = parse_seat_name(name)
            if not parsed:
                continue
            zone, row, number = parsed
            key = (zone.upper(), row, number)
            if key in seen:
                continue
            seen.add(key)
            x, y, z = _world_position(world_matrix)
            markers.append(
                GltfSeatMarker(
                    zone=zone,
                    row=row,
                    number=number,
                    # Three.js / R3F: X ngang, Y cao, Z sâu
                    pos_x=x,
                    pos_y=z,
                    pos_z=y,
                    node_name=name,
                )
            )

    return sorted(markers, key=lambda m: (m.zone, m.row, m.number))


@dataclass
class SeatSection:
    mesh_index: int
    min_x: float
    max_x: float
    min_y: float
    max_y: float
    min_z: float
    max_z: float

    @property
    def center_z(self) -> float:
        return (self.min_z + self.max_z) / 2


def _mesh_world_bounds(gltf: GLTF2, mesh_index: int, world: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    mesh = gltf.meshes[mesh_index]
    vertices: list[np.ndarray] = []
    for primitive in mesh.primitives:
        accessor = gltf.accessors[primitive.attributes.POSITION]
        buffer_view = gltf.bufferViews[accessor.bufferView]
        buffer = gltf.buffers[buffer_view.buffer]
        blob = gltf.get_data_from_buffer_uri(buffer.uri)
        start = (buffer_view.byteOffset or 0) + (accessor.byteOffset or 0)
        for i in range(accessor.count):
            offset = start + i * 12
            local = struct.unpack_from('<3f', blob, offset)
            world_point = world @ np.array([local[0], local[1], local[2], 1.0])
            vertices.append(world_point[:3])
    arr = np.array(vertices, dtype=np.float64)
    return arr.min(axis=0), arr.max(axis=0)


def _walk_scene_nodes(
    gltf: GLTF2,
    node_index: int,
    parent: np.ndarray,
) -> Iterator[tuple[str | None, np.ndarray, int | None]]:
    node = gltf.nodes[node_index]
    world = parent @ _mat4_from_node(node)
    yield node.name, world, node.mesh
    for child_index in node.children or []:
        yield from _walk_scene_nodes(gltf, child_index, world)


def extract_sketchfab_seat_sections(gltf_path: str | Path) -> list[SeatSection]:
    """Lấy bounding box world-space của các khối seat_seat_0 trong model Sketchfab."""
    gltf = GLTF2().load(str(Path(gltf_path)))
    scene_index = gltf.scene if gltf.scene is not None else 0
    scene = gltf.scenes[scene_index]
    sections: list[SeatSection] = []

    for root_index in scene.nodes or []:
        for name, world, mesh_index in _walk_scene_nodes(gltf, root_index, np.eye(4)):
            if mesh_index is None or name != 'seat_seat_0':
                continue
            mn, mx = _mesh_world_bounds(gltf, mesh_index, world)
            sections.append(
                SeatSection(
                    mesh_index=mesh_index,
                    min_x=float(mn[0]),
                    max_x=float(mx[0]),
                    min_y=float(mn[1]),
                    max_y=float(mx[1]),
                    min_z=float(mn[2]),
                    max_z=float(mx[2]),
                )
            )

    # Gần sân khấu (z thấp) → VIP
    return sorted(sections, key=lambda s: s.center_z)


def _mesh_top_vertices(gltf: GLTF2, mesh_index: int, world: np.ndarray, sample_step: int = 2) -> np.ndarray:
    """Lấy đỉnh mặt ghế (Y cao) trong world space."""
    mesh = gltf.meshes[mesh_index]
    vertices: list[np.ndarray] = []
    for primitive in mesh.primitives:
        accessor = gltf.accessors[primitive.attributes.POSITION]
        buffer_view = gltf.bufferViews[accessor.bufferView]
        buffer = gltf.buffers[buffer_view.buffer]
        blob = gltf.get_data_from_buffer_uri(buffer.uri)
        start = (buffer_view.byteOffset or 0) + (accessor.byteOffset or 0)
        for i in range(0, accessor.count, sample_step):
            offset = start + i * 12
            local = struct.unpack_from('<3f', blob, offset)
            world_point = world @ np.array([local[0], local[1], local[2], 1.0])
            vertices.append(world_point[:3])
    if not vertices:
        return np.empty((0, 3))
    arr = np.array(vertices, dtype=np.float64)
    y_cut = np.percentile(arr[:, 1], 88)
    return arr[arr[:, 1] >= y_cut]


def _collect_auditorium_top_vertices(gltf: GLTF2) -> np.ndarray:
    scene_index = gltf.scene if gltf.scene is not None else 0
    scene = gltf.scenes[scene_index]
    chunks: list[np.ndarray] = []
    for root_index in scene.nodes or []:
        for name, world, mesh_index in _walk_scene_nodes(gltf, root_index, np.eye(4)):
            if mesh_index is None or name != 'seat_seat_0':
                continue
            top = _mesh_top_vertices(gltf, mesh_index, world)
            if len(top):
                chunks.append(top)
    if not chunks:
        return np.empty((0, 3))
    return np.vstack(chunks)


def _auditorium_bounds(gltf_path: str | Path) -> tuple[float, float, float, float, float] | None:
    """(min_x, max_x, min_z, max_z, seat_y) từ mesh ghế."""
    gltf = GLTF2().load(str(Path(gltf_path)))
    top = _collect_auditorium_top_vertices(gltf)
    if len(top) == 0:
        return None
    return (
        float(top[:, 0].min()),
        float(top[:, 0].max()),
        float(top[:, 2].min()),
        float(top[:, 2].max()),
        float(np.median(top[:, 1])),
    )


def _slot_center(
    ri: int,
    sn: int,
    *,
    min_x: float,
    max_x: float,
    min_z: float,
    max_z: float,
    seat_y: float,
    row_count: int,
    seats_per_side: int,
) -> tuple[float, float, float]:
    span_x = max(max_x - min_x, 0.01)
    span_z = max(max_z - min_z, 0.01)
    aisle_w = span_x * 0.14
    block_w = (span_x - aisle_w) / 2
    row_h = span_z / row_count
    if sn <= seats_per_side:
        cx = min_x + (sn - 0.5) / seats_per_side * block_w
    else:
        cx = min_x + block_w + aisle_w + (sn - seats_per_side - 0.5) / seats_per_side * block_w
    cz = min_z + (ri + 0.5) * row_h
    return float(cx), float(cz), seat_y


def build_full_auditorium_grid(
    gltf_path: str | Path,
    *,
    row_count: int = DEFAULT_ROW_COUNT,
    seats_per_row: int = DEFAULT_SEATS_PER_ROW,
    seats_per_side: int = DEFAULT_SEATS_PER_SIDE,
) -> dict[tuple[int, int], tuple[float, float, float]]:
    """
    Lưới đủ 12×28 = 336 ô — 14 trái + lối đi + 14 phải, căn theo mesh.
    Key: (row_idx 0..11, seat_number 1..28) → (pos_x, pos_y, pos_z) Three.js.
    """
    bounds = _auditorium_bounds(gltf_path)
    if bounds is None:
        return {}
    min_x, max_x, min_z, max_z, seat_y = bounds
    grid: dict[tuple[int, int], tuple[float, float, float]] = {}
    for ri in range(row_count):
        for sn in range(1, seats_per_row + 1):
            grid[(ri, sn)] = _slot_center(
                ri,
                sn,
                min_x=min_x,
                max_x=max_x,
                min_z=min_z,
                max_z=max_z,
                seat_y=seat_y,
                row_count=row_count,
                seats_per_side=seats_per_side,
            )
    return grid


def build_physical_seat_grid(
    gltf_path: str | Path,
    *,
    row_count: int = DEFAULT_ROW_COUNT,
    seats_per_row: int = DEFAULT_SEATS_PER_ROW,
    seats_per_side: int = DEFAULT_SEATS_PER_SIDE,
    min_vertex_ratio: float = 0.22,
) -> dict[tuple[int, int], tuple[float, float, float]]:
    """
    Quét mesh ghế 3D → chỉ giữ ô lưới có geometry thật (bỏ lối đi / sàn trống).
  """
    bounds = _auditorium_bounds(gltf_path)
    if bounds is None:
        return {}
    min_x, max_x, min_z, max_z, seat_y = bounds
    gltf = GLTF2().load(str(Path(gltf_path)))
    top = _collect_auditorium_top_vertices(gltf)
    span_x = max(max_x - min_x, 0.01)
    span_z = max(max_z - min_z, 0.01)
    aisle_w = span_x * 0.14
    block_w = (span_x - aisle_w) / 2
    row_h = span_z / row_count
    col_w = block_w / seats_per_side

    counts: dict[tuple[int, int], int] = {}
    for ri in range(row_count):
        cz = min_z + (ri + 0.5) * row_h
        for sn in range(1, seats_per_row + 1):
            if sn <= seats_per_side:
                cx = min_x + (sn - 0.5) / seats_per_side * block_w
            else:
                cx = min_x + block_w + aisle_w + (sn - seats_per_side - 0.5) / seats_per_side * block_w
            mask = (np.abs(top[:, 0] - cx) < col_w * 0.42) & (np.abs(top[:, 2] - cz) < row_h * 0.42)
            counts[(ri, sn)] = int(mask.sum())

    if not counts:
        return {}

    max_count = max(counts.values()) or 1
    threshold = max(12, int(max_count * min_vertex_ratio))
    grid: dict[tuple[int, int], tuple[float, float, float]] = {}

    for (ri, sn), cnt in counts.items():
        if cnt < threshold:
            continue
        grid[(ri, sn)] = _slot_center(
            ri,
            sn,
            min_x=min_x,
            max_x=max_x,
            min_z=min_z,
            max_z=max_z,
            seat_y=seat_y,
            row_count=row_count,
            seats_per_side=seats_per_side,
        )

    return grid


def layout_seats_in_section(
    zone_name: str,
    seats: list,
    section: SeatSection,
    *,
    aisle_after: int = DEFAULT_AISLE_AFTER,
    seats_per_side: int = DEFAULT_SEATS_PER_SIDE,
) -> list[GltfSeatMarker]:
    """Phân bố ghế DB trong bounding box — 14 trái, lối đi, 14 phải."""
    if not seats:
        return []

    rows = sorted({seat.row_label for seat in seats})
    row_map = {row: idx for idx, row in enumerate(rows)}
    row_count = max(len(rows), 1)
    seat_y = section.max_y - 0.05

    markers: list[GltfSeatMarker] = []
    for seat in sorted(seats, key=lambda s: (s.row_label, s.seat_number)):
        row_idx = row_map[seat.row_label]
        use_aisle = seat.seat_number > aisle_after or max(s.seat_number for s in seats) > seats_per_side
        if use_aisle:
            x = seat_x_in_section(section, seat.seat_number, seats_per_side=seats_per_side)
        else:
            max_col = max(s.seat_number for s in seats)
            span_x = max(section.max_x - section.min_x, 0.01)
            col_idx = seat.seat_number - 1
            x = section.min_x + (col_idx + 0.5) / max(max_col, 1) * span_x
        z = seat_z_in_section(section, row_idx, row_count)
        markers.append(
            GltfSeatMarker(
                zone=zone_name,
                row=seat.row_label,
                number=seat.seat_number,
                pos_x=x,
                pos_y=z,
                pos_z=seat_y,
                node_name=f'sketchfab_{zone_name}_{seat.row_label}_{seat.seat_number}',
            )
        )
    return markers


def map_sketchfab_zones_to_markers(
    gltf_path: str | Path,
    zone_seats: list[tuple[str, list]],
) -> list[GltfSeatMarker]:
    """
    Map ghế DB vào lưới 12×28 căn theo mesh — đủ 336 ô (14 + lối đi + 14).
    """
    physical = build_full_auditorium_grid(gltf_path)
    if not physical:
        sections = extract_sketchfab_seat_sections(gltf_path)
        if not sections:
            raise ValueError('Không tìm thấy khối seat_seat_0 trong GLTF')
        markers: list[GltfSeatMarker] = []
        for idx, (zone_name, seats) in enumerate(zone_seats):
            if idx >= len(sections):
                break
            markers.extend(layout_seats_in_section(zone_name, seats, sections[idx]))
        return markers

    markers: list[GltfSeatMarker] = []
    used_slots: set[tuple[int, int]] = set()

    for zone_name, seats in zone_seats:
        for seat in sorted(seats, key=lambda s: (s.row_label, s.seat_number)):
            ri = row_label_to_index(seat.row_label)
            if ri is None or ri >= DEFAULT_ROW_COUNT:
                continue
            sn = seat.seat_number
            if sn < 1 or sn > DEFAULT_SEATS_PER_ROW:
                continue
            slot = (ri, sn)
            if slot in used_slots:
                continue
            pos = physical.get(slot)
            if pos is None:
                continue
            used_slots.add(slot)
            px, py, pz = pos
            markers.append(
                GltfSeatMarker(
                    zone=zone_name,
                    row=seat.row_label,
                    number=sn,
                    pos_x=px,
                    pos_y=py,
                    pos_z=pz,
                    node_name=f'physical_{zone_name}_{seat.row_label}_{sn}',
                )
            )
    return markers
