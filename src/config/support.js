// Поддержка автора через TON. Впиши свой TON-адрес (кошелёк Tonkeeper и т.п.).
// Пока пусто — кнопка «Поддержать автора» не показывается.
export const TON_ADDRESS = '' // напр. 'UQAbc...xyz'

// Ссылка на перевод в кошелёк (Tonkeeper universal link — открывает кошелёк/Telegram)
export function tonDonateUrl(amountTon) {
  if (!TON_ADDRESS) return ''
  const amt = amountTon ? `?amount=${Math.round(amountTon * 1e9)}` : ''
  return `https://app.tonkeeper.com/transfer/${TON_ADDRESS}${amt}`
}
