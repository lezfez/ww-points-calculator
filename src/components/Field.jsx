import Input from './ui/Input';

export default function Field({ id, def, value, onChange }) {
  return (
    <Input
      id={id}
      label={def.label}
      type="number"
      min={0}
      step={def.step}
      value={value}
      placeholder="0"
      onChange={e => onChange(id, e.target.value)}
    />
  );
}
