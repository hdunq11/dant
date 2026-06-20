"""Xuất tọa độ ghế GLTF cho organizer stage preview (FE static JSON)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'be'))

from app.seats.gltf_import import build_full_auditorium_grid  # noqa: E402
from app.seats.gltf_import_stage1 import (  # noqa: E402
    _filter_audience_centers,
    build_stage1_position_grid,
    detect_stage1_audience_bounds,
    extract_stage1_physical_centers,
)
from app.seats.seat_grid import default_row_labels  # noqa: E402
from app.seats.stage1_seat_grid import (  # noqa: E402
    STAGE1_ROW_COUNT,
    STAGE1_SEATS_PER_ROW,
    stage1_row_labels,
)

OUT_DIR = ROOT / 'FE/public/data/organizer'


def export_auditorium(gltf: Path) -> list[dict]:
    """Cùng lưới 12×28 như import concert 91 (map_sketchfab_zones_to_markers)."""
    rows = default_row_labels()
    grid = build_full_auditorium_grid(gltf)
    seats: list[dict] = []
    for ri, row in enumerate(rows):
        for num in range(1, 29):
            pos = grid.get((ri, num))
            if not pos:
                continue
            px, py, pz = pos
            seats.append({'row': row, 'number': num, 'pos_x': px, 'pos_y': py, 'pos_z': pz})
    return seats


def export_stage1(gltf: Path) -> list[dict]:
    bounds = detect_stage1_audience_bounds(gltf)
    if bounds is None:
        raise RuntimeError('stage_1 bounds not found')
    physical = _filter_audience_centers(extract_stage1_physical_centers(gltf))
    grid = build_stage1_position_grid(bounds, physical, row_count=STAGE1_ROW_COUNT)
    rows = stage1_row_labels()
    seats: list[dict] = []
    for ri, row in enumerate(rows):
        for num in range(1, STAGE1_SEATS_PER_ROW + 1):
            pos = grid.get((ri, num))
            if not pos:
                continue
            px, py, pz = pos
            # DB convention: pos_x=X, pos_y=Z(depth), pos_z=Y(height)
            seats.append({'row': row, 'number': num, 'pos_x': px, 'pos_y': py, 'pos_z': pz})
    return seats


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    auditorium_gltf = ROOT / 'FE/public/models/venue_stage_1/scene.gltf'
    stage1_gltf = ROOT / 'FE/public/models/stage_1/scene.gltf'

    auditorium = export_auditorium(auditorium_gltf)
    stage1 = export_stage1(stage1_gltf)

    (OUT_DIR / 'auditorium-seats.json').write_text(
        json.dumps({'seats': auditorium}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    (OUT_DIR / 'stage1-seats.json').write_text(
        json.dumps({'seats': stage1}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    print(f'auditorium: {len(auditorium)} seats -> {OUT_DIR / "auditorium-seats.json"}')
    print(f'stage1: {len(stage1)} seats -> {OUT_DIR / "stage1-seats.json"}')


if __name__ == '__main__':
    main()
