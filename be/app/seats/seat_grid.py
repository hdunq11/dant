"""Lưới ghế venue kiểu hội trường: 12 hàng × 28 cột (14 + lối đi + 14)."""
from __future__ import annotations

DEFAULT_ROW_COUNT = 12
DEFAULT_SEATS_PER_SIDE = 14
DEFAULT_AISLE_AFTER = 14
DEFAULT_SEATS_PER_ROW = DEFAULT_SEATS_PER_SIDE * 2
DEFAULT_AISLE_RATIO = 0.14
AISLE_GAP_2D = 30.0

# Chia 12 hàng A–L vào 5 khu giá (tổng 336 ghế)
DEFAULT_ZONE_ROWS: dict[str, list[str]] = {
    'VIP': ['A', 'B'],
    'A': ['C', 'D', 'E'],
    'B': ['F', 'G', 'H'],
    'C': ['I', 'J', 'K'],
    'Standard': ['L'],
}


def default_row_labels(count: int = DEFAULT_ROW_COUNT) -> list[str]:
    return [chr(ord('A') + i) for i in range(count)]


def global_seat_number(row_label: str, seat_number: int) -> int:
    """Số ghế liên tục 1..336 theo layout bảng (hàng A ghế 1 = 1, B1 = 29, ...)."""
    idx = row_label_to_index(row_label)
    if idx is None or seat_number < 1 or seat_number > DEFAULT_SEATS_PER_ROW:
        raise ValueError(f'Invalid seat {row_label}{seat_number}')
    return idx * DEFAULT_SEATS_PER_ROW + seat_number


def seat_pos_2d(
    row_idx: int,
    seat_number: int,
    *,
    aisle_after: int = DEFAULT_AISLE_AFTER,
    step: float = 10.0,
) -> tuple[float, float]:
    """Tọa độ 2D cho sơ đồ — có khoảng trống lối đi giữa."""
    if seat_number <= aisle_after:
        x = seat_number * step
    else:
        x = aisle_after * step + AISLE_GAP_2D + (seat_number - aisle_after) * step
    return x, row_idx * step


def seat_x_in_section(
    section,
    seat_number: int,
    *,
    seats_per_side: int = DEFAULT_SEATS_PER_SIDE,
    aisle_ratio: float = DEFAULT_AISLE_RATIO,
) -> float:
    """Map số ghế 1..28 → trục X trong bounding box GLTF, bỏ qua lối đi giữa."""
    span_x = max(section.max_x - section.min_x, 0.01)
    aisle_w = span_x * aisle_ratio
    block_w = (span_x - aisle_w) / 2

    if seat_number <= seats_per_side:
        col_idx = seat_number - 1
        return section.min_x + (col_idx + 0.5) / seats_per_side * block_w

    col_idx = seat_number - seats_per_side - 1
    return section.min_x + block_w + aisle_w + (col_idx + 0.5) / seats_per_side * block_w


def seat_z_in_section(section, row_idx: int, row_count: int) -> float:
    span_z = max(section.max_z - section.min_z, 0.01)
    return section.min_z + (row_idx + 0.5) / max(row_count, 1) * span_z


def row_label_to_index(row_label: str) -> int | None:
    """Hàng A=0 … L=11. Hàng lạ (dữ liệu cũ) → None."""
    row = (row_label or '').strip().upper()
    if len(row) == 1 and 'A' <= row <= 'L':
        return ord(row) - ord('A')
    return None
