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


def layout_seats_in_section(
    zone_name: str,
    seats: list,
    section: SeatSection,
) -> list[GltfSeatMarker]:
    """Phân bố ghế DB theo lưới trong bounding box của một khối seat."""
    if not seats:
        return []

    rows = sorted({seat.row_label for seat in seats})
    row_map = {row: idx for idx, row in enumerate(rows)}
    max_col = max(seat.seat_number for seat in seats)
    row_count = max(len(rows), 1)
    col_count = max(max_col, 1)

    span_x = max(section.max_x - section.min_x, 0.01)
    span_z = max(section.max_z - section.min_z, 0.01)
    seat_y = section.max_y - 0.05

    markers: list[GltfSeatMarker] = []
    for seat in sorted(seats, key=lambda s: (s.row_label, s.seat_number)):
        row_idx = row_map[seat.row_label]
        col_idx = seat.seat_number - 1
        x = section.min_x + (col_idx + 0.5) / col_count * span_x
        z = section.min_z + (row_idx + 0.5) / row_count * span_z
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
    zone_seats: [(zone_name, [Seat, ...]), ...] theo thứ tự giá giảm dần (VIP trước).
    """
    sections = extract_sketchfab_seat_sections(gltf_path)
    if not sections:
        raise ValueError('Không tìm thấy khối seat_seat_0 trong GLTF')

    markers: list[GltfSeatMarker] = []
    for idx, (zone_name, seats) in enumerate(zone_seats):
        if idx >= len(sections):
            break
        markers.extend(layout_seats_in_section(zone_name, seats, sections[idx]))
    return markers
