"""Lưới stage_1: 2 khối 500 ghế — mỗi khối 20 hàng × 25 cột, lối đi giữa.



Đánh số Excel:

  Khối trái:  1–500   (hàng A–T, cột 1–25)

  Khối phải:  501–1000 (hàng A–T, cột 1–25)

"""

from __future__ import annotations



STAGE1_ROW_COUNT = 20

STAGE1_SEATS_PER_SIDE = 25

STAGE1_AISLE_AFTER = 25

STAGE1_SEATS_PER_ROW = STAGE1_SEATS_PER_SIDE * 2

STAGE1_SEATS_PER_BLOCK = STAGE1_ROW_COUNT * STAGE1_SEATS_PER_SIDE

STAGE1_TOTAL_SEATS = STAGE1_SEATS_PER_BLOCK * 2

STAGE1_AISLE_GAP_2D = 40.0



STAGE1_ZONE_ROWS: dict[str, list[str]] = {

    'VIP': ['A', 'B', 'C'],

    'A': ['D', 'E', 'F', 'G', 'H'],

    'B': ['I', 'J', 'K', 'L', 'M'],

    'C': ['N', 'O', 'P', 'Q'],

    'Standard': ['R', 'S', 'T'],

}





def stage1_row_labels() -> list[str]:

    return [chr(ord('A') + i) for i in range(STAGE1_ROW_COUNT)]





def stage1_row_index(row_label: str) -> int | None:

    row = (row_label or '').strip().upper()

    if len(row) == 1 and 'A' <= row <= 'T':

        return ord(row) - ord('A')

    return None





def stage1_block_side(seat_number: int) -> str | None:

    if 1 <= seat_number <= STAGE1_SEATS_PER_SIDE:

        return 'left'

    if STAGE1_SEATS_PER_SIDE < seat_number <= STAGE1_SEATS_PER_ROW:

        return 'right'

    return None





def stage1_block_column(seat_number: int) -> int | None:

    side = stage1_block_side(seat_number)

    if side == 'left':

        return seat_number

    if side == 'right':

        return seat_number - STAGE1_SEATS_PER_SIDE

    return None





def stage1_global_seat_number(row_label: str, seat_number: int) -> int | None:

    """Số ghế liên tục 1–1000 theo bảng Excel."""

    row_idx = stage1_row_index(row_label)

    col = stage1_block_column(seat_number)

    side = stage1_block_side(seat_number)

    if row_idx is None or col is None or side is None:

        return None

    if side == 'left':

        return row_idx * STAGE1_SEATS_PER_SIDE + col

    return STAGE1_SEATS_PER_BLOCK + row_idx * STAGE1_SEATS_PER_SIDE + col





def stage1_seat_pos_2d(

    row_idx: int,

    seat_number: int,

    *,

    step: float = 10.0,

) -> tuple[float, float]:

    """Tọa độ 2D: khối trái | lối đi | khối phải."""

    col = stage1_block_column(seat_number)

    side = stage1_block_side(seat_number)

    if col is None or side is None:

        return 0.0, row_idx * step



    y = row_idx * step

    if side == 'left':

        return (col - 1) * step, y



    left_w = STAGE1_SEATS_PER_SIDE * step

    return left_w + STAGE1_AISLE_GAP_2D + (col - 1) * step, y


def stage1_zone_for_row_label(row_label: str, zone_rows: dict[str, list[str]]) -> str:
    row = (row_label or '').strip().upper()
    for zone_name, labels in zone_rows.items():
        if row in [lb.strip().upper() for lb in labels]:
            return zone_name
    return list(zone_rows.keys())[-1]


def iter_stage1_seats_by_row(
    zone_rows: dict[str, list[str]],
    *,
    limit: int | None = None,
):
    """Từ sân khấu: mỗi hàng 50 ghế (25 trái + lối đi + 25 phải)."""
    created = 0
    for row_idx in range(STAGE1_ROW_COUNT):
        if limit is not None and created >= limit:
            break
        row_label = chr(ord('A') + row_idx)
        zone_name = stage1_zone_for_row_label(row_label, zone_rows)
        seats_in_row = STAGE1_SEATS_PER_ROW
        if limit is not None:
            remaining = limit - created
            if remaining <= 0:
                break
            seats_in_row = min(STAGE1_SEATS_PER_ROW, remaining)
        for seat_num in range(1, seats_in_row + 1):
            yield zone_name, row_label, row_idx, seat_num
            created += 1


def zones_used_for_stage1(zone_rows: dict[str, list[str]], limit: int | None) -> set[str]:
    return {item[0] for item in iter_stage1_seats_by_row(zone_rows, limit=limit)}

