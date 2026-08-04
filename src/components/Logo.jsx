// Знак бренда: отметка уровня на шкале. Вертикаль — сама шкала, три засечки —
// замеры, средняя акцентная и самая длинная: текущий уровень выделяется из ряда.
// Читается сразу двумя слоями: отметка прилива (Tide) и строки данных (лента).
// Букв нет намеренно — монограмма TW ничего не значила и не масштабировалась.
// Монохром плюс один акцент, живёт от 16px: годится и в фавикон, и в аватарку бота.
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
      {/* шкала */}
      <path d="M5.5 4 V30" stroke="currentColor" strokeWidth="3" strokeLinecap="butt" />
      {/* засечки: верхняя и нижняя — фон, средняя — текущий уровень */}
      <path d="M5.5 10 H19" stroke="currentColor" strokeWidth="3" strokeLinecap="butt" opacity="0.45" />
      <path d="M5.5 17 H30" stroke="var(--brand)" strokeWidth="3" strokeLinecap="butt" />
      <path d="M5.5 24 H15" stroke="currentColor" strokeWidth="3" strokeLinecap="butt" opacity="0.45" />
    </svg>
  )
}