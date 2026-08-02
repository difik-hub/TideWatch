// Знак бренда: монограмма T+W. T обычная (перекладина и вертикаль по центру),
// W из четырёх штрихов акцентом — её зигзаг читается ещё и как ход цены.
// Монохром + один акцент, работает от 16px: годится и как фавикон, и как аватарка бота.
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
      <path d="M3.5 6 H15.5 M9.5 6 V28" stroke="currentColor" strokeWidth="3" strokeLinecap="butt" />
      <path d="M18.5 6 L21.5 28 L24.75 15 L28 28 L31 6" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="miter" />
    </svg>
  )
}
