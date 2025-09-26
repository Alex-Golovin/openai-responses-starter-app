description: Фото вклеєно 25/45 років
severity: medium
whenExpr: ''
rules:
- target:
    fieldKey: passport_number
  operator: is_present
  message: Якщо фото не вклеєно — попросіть оновити паспорт
onFail: Попросіть клієнта оновити паспорт або надати інший документ


