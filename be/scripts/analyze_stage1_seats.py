"""Phân tích ghế stage_1: thiếu và lệch trong grid import."""
from __future__ import annotations

import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'be'))

from app.seats.gltf_import_stage1 import (  # noqa: E402
    _filter_audience_centers,
    build_stage1_position_grid,
    detect_stage1_audience_bounds,
    extract_stage1_physical_centers,
)
from app.seats.stage1_seat_grid import (  # noqa: E402
    STAGE1_ROW_COUNT,
    STAGE1_SEATS_PER_ROW,
    stage1_global_seat_number,
    stage1_row_labels,
)


def main() -> None:
    gltf = ROOT / 'FE/public/models/stage_1/scene.gltf'
    bounds = detect_stage1_audience_bounds(gltf)
    physical = _filter_audience_centers(extract_stage1_physical_centers(gltf))
    grid = build_stage1_position_grid(bounds, physical)
    rows = stage1_row_labels()
    total = STAGE1_ROW_COUNT * STAGE1_SEATS_PER_ROW

    missing: list[tuple[int, str, int]] = []
    for ri, row in enumerate(rows):
        for num in range(1, STAGE1_SEATS_PER_ROW + 1):
            if (ri, num) not in grid:
                g = stage1_global_seat_number(row, num)
                missing.append((g or 0, row, num))

    print('=== MISSING IN IMPORT GRID ===')
    print(f'Total missing: {len(missing)} / {total}')
    by_row: dict[str, list[int]] = {}
    for g, row, num in missing:
        by_row.setdefault(row, []).append(num)
    for row in rows:
        if row in by_row:
            nums = by_row[row]
            globals_ = [stage1_global_seat_number(row, n) for n in nums]
            print(f'  Row {row}: cols {nums} -> seat# {globals_}')

    print()
    print('=== MISALIGNED (outlier X/Z/H per row) ===')
    misaligned: list[tuple[int, str, int, list[str]]] = []
    for ri, row in enumerate(rows):
        pts = [(num, grid[(ri, num)]) for num in range(1, STAGE1_SEATS_PER_ROW + 1) if (ri, num) in grid]
        if len(pts) < 5:
            continue
        zs = [p[1][1] for p in pts]
        hs = [p[1][2] for p in pts]
        sorted_pts = sorted(pts, key=lambda t: t[1][0])
        steps = [
            sorted_pts[i + 1][1][0] - sorted_pts[i][1][0]
            for i in range(len(sorted_pts) - 1)
        ]
        step_med = statistics.median(steps) if steps else 0.0
        z_med = statistics.median(zs)
        h_max = max(hs)

        for num, (x, z, h) in pts:
            g = stage1_global_seat_number(row, num) or 0
            issues: list[str] = []
            if abs(z - z_med) > 0.02:
                issues.append(f'Z off {z - z_med:+.3f}m')
            if h < h_max - 0.15:
                issues.append(f'H low {h:.3f} (norm {h_max:.3f})')
            idx = next(i for i, t in enumerate(sorted_pts) if t[0] == num)
            if idx > 0:
                step = sorted_pts[idx][1][0] - sorted_pts[idx - 1][1][0]
                if abs(step - step_med) > 0.15:
                    issues.append(f'X step {step:.3f}m (norm {step_med:.3f}m)')
            if issues:
                misaligned.append((g, row, num, issues))

    print(f'Total misaligned: {len(misaligned)} / {total - len(missing)}')
    low_h = [m for m in misaligned if any('H low' in i for i in m[3])]
    z_off = [m for m in misaligned if any('Z off' in i for i in m[3])]
    x_off = [m for m in misaligned if any('X step' in i for i in m[3])]
    print(f'  - Low height: {len(low_h)}')
    print(f'  - Z off row: {len(z_off)}')
    print(f'  - X step anomaly: {len(x_off)}')

    print()
    print('Detail (max 50):')
    for g, row, num, issues in misaligned[:50]:
        label = f'#{g} {row}{num}'
        print(f'  {label}: {" | ".join(issues)}')
    if len(misaligned) > 50:
        print(f'  ... and {len(misaligned) - 50} more')


if __name__ == '__main__':
    main()
