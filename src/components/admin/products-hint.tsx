// What the buttons over the list do, on demand. Shown by itself on a selection it would push the
// table down under the cursor between two checkboxes.
const ProductsHint = () => (
  <details className="products-hint">
    <summary>Що роблять кнопки над вибраними товарами</summary>
    <ul>
      <li>
        <strong>Редагувати</strong>: змінює вибрані поля в усіх цих товарах.
        «Зберегти чернетку» лишає їх чернетками, «Опублікувати зміни» публікує.
      </li>
      <li>
        <strong>Опублікувати</strong>: лише публікує, поля не змінює. Товар без
        «Наявності» чи без позначки «Перевірено» не пройде, і адмінка напише
        «Наступне поле невірне».
      </li>
      <li>
        <strong>Скасувати публікацію</strong>: прибирає товар із сайту, він стає
        чернеткою.
      </li>
      <li>
        <strong>Видалити</strong>: видаляє назавжди.
      </li>
    </ul>
  </details>
);

export default ProductsHint;
