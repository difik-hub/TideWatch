// Знак бренда: три столбца, средний акцентный и выше остальных — сигнал,
// поднявшийся над фоном. Читается как рынок с первого взгляда и не разваливается
// в 16px, в отличие от прежних попыток: волна была клише, монограмма TW ничего
// не значила, шкала с засечками не читалась, а «уровень в резервуаре» выглядел
// ведром. Треугольник-указатель отпал по смыслу: остриём вниз он значит падение.
export default function Logo({ size = 26, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="5" y="18" width="7" height="11" fill="currentColor" />
      <rect x="14" y="7" width="7" height="22" fill="var(--brand)" />
      <rect x="23" y="14" width="7" height="15" fill="currentColor" />
    </svg>
  )
}
