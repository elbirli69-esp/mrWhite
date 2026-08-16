import { Toggle } from '../../components/Toggle';

interface AdultModeToggleProps {
  checked: boolean;
  onChange: (enabled: boolean) => void;
}

/** Toggle compartido: pack malsonante / +18, apagado por defecto. */
export function AdultModeToggle({ checked, onChange }: AdultModeToggleProps) {
  return (
    <Toggle
      label="Versión adultos (+18)"
      description="Solo palabras malsonantes, sexo y humor gordo. Apágalo si hay menores o no apetece."
      checked={checked}
      onChange={onChange}
    />
  );
}
