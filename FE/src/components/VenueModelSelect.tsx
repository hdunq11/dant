import { VENUE_MODEL_OPTIONS } from '../constants/venueModels';

interface VenueModelSelectProps {
  value: string;
  onChange: (path: string) => void;
  id?: string;
}

export function VenueModelSelect({ value, onChange, id }: VenueModelSelectProps) {
  const known = VENUE_MODEL_OPTIONS.some((m) => m.path === value);
  const selectValue = known ? value : value ? '__custom__' : '';

  const selected = VENUE_MODEL_OPTIONS.find((m) => m.path === value);

  return (
    <div className="venue-model-select">
      <select
        id={id}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') {
            if (!value || known) onChange('');
            return;
          }
          if (v === '') {
            onChange('');
            return;
          }
          onChange(v);
        }}
      >
        <option value="">— Chưa chọn model VR —</option>
        {VENUE_MODEL_OPTIONS.map((m) => (
          <option key={m.id} value={m.path}>
            {m.label}
          </option>
        ))}
        <option value="__custom__">Đường dẫn tùy chỉnh…</option>
      </select>
      {selected ? <p className="venue-model-select__hint">{selected.description}</p> : null}
      {selectValue === '__custom__' || (value && !known) ? (
        <input
          className="venue-model-select__custom"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="models/stage_2/scene.gltf"
        />
      ) : null}
    </div>
  );
}
