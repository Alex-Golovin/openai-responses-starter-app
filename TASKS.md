берём openai/openai-responses-starter-app за основу, добавляем MongoDB для админ-данных (topics, documents, fields, checks), подключаем File Search (векторное хранилище) из стартера, и дописываем свои server-side инструменты (parse_files, run_checks, render_response, book_consultation). Сессии и сообщения храним у OpenAI (стартер уже умеет multi-turn), у себя — только админ-модельки. Ниже — обновлённое ТЗ и пошаговый чеклист.

Примечания по платформе:
• Стартер — Next.js чат поверх Responses API с уже встроенным File Search (векторка) и веб-поиском.  ￼
• File Search работает поверх Vector Store; в API можно передавать массив vector_store_ids (UI старта по умолчанию держит один, но кодом можно расширить; в сообществе отмечают ограничение на кол-во — иногда 1–2 стора).  ￼
• Agents SDK — JS/TS библиотека для оркестрации агентов и тулов; можно встраивать в Next.js (route handlers/server actions).  ￼

⸻

ТЗ: MVP «Нотаріальний AI-помічник» на базе openai-responses-starter-app

Цель

Внутри стартера получить рабочий чат, где:
	•	пользователь задаёт вопрос → мы через File Search выбираем релевантную тему/знания и отвечаем,
	•	если тема требует документов → просим загрузить → извлекаем поля (Responses structured outputs) → прогоняем проверки → отдаём вывод и рекомендации,
	•	хранение диалога — у OpenAI; у нас — только админ-данные (темы/док-шаблоны/поля/чеки).

Стек
	•	Base: openai/openai-responses-starter-app (Next.js + Responses API + File Search)  ￼
	•	DB: MongoDB (Mongoose) — только админ сущности
	•	OpenAI: Responses API (+ встроенный File Search / Vector Store)  ￼
	•	(Опционально) Agents SDK для оркестрации и хэнд-оффов между тулзами  ￼

Что кладём в Vector Store (RAG)

Только текст знаний: FAQ, чек-листы документов, правила/пояснения, анти-паттерны (короткие чанки с metadata: { topicId, kind, title }). Логику (documents/fields/checks) не индексируем — она выполняется кодом.  ￼

Агент и инструменты
	•	File Search (встроенный) — ищет по нашему Vector Store
	•	parse_files — извлечение полей из загруженных файлов через Responses structured outputs
	•	run_checks — движок проверок по извлечённым полям
	•	render_response — сборка финального текста (и вставка 1–2 коротких цитат из File Search)
	•	book_consultation — заглушка под CRM (вызов API позже)
	•	choose_topic_via_search как отдельный тул не обязателен: делаем выбор темы по итогам File Search (по частоте topicId в top-k). Если неоднозначно — агент задаёт один уточняющий вопрос.

System Prompt (вставить в стартер)

(укр.)

Ти — цифровий помічник нотаріуса (м. Рівне). Працюй кроками, чемно, без вигадок.

1) Визнач тему: запусти File Search за текстом користувача; обери topicId з найбільшою кількістю збігів серед top-k. Якщо лідера нема — постав 1 уточнення і повтори.
2) Якщо тема без документів — дай відповідь з FAQ/чек-листом (2–6 речень). Якщо потрібні документи — коротко поясни перелік і попроси завантажити файли. Дозволь кілька файлів; коли користувач напише «готово» або мине пауза — переходь до аналізу.
3) Видобуток даних: витягни поля з файлів за схемою документів теми (parse_files).
4) Перевірки: застосуй правила теми (run_checks) і сформуй зауваження/дії.
5) Відповідь: якщо бракує — виведи список; якщо все гаразд — підтвердь; якщо є зауваження — коротко що не так і що робити. Додай 1–2 короткі цитати з File Search. Якщо питання поза межами знань — запропонуй залучити консультанта-людину.


⸻

Модели MongoDB (только админ-данные)

// models/Field.ts
import { Schema, model } from 'mongoose'

export const Field = model('Field', new Schema({
  key: { type: String, required: true, unique: true }, // full_name, id_code...
  label: { type: String, required: true },
  type: { type: String, enum: ['string','number','boolean','date','enum'], required: true },
  options: [String],
  extractHint: String,
  validators: [Object] // { type:'regex'|'min_length'|'forbid_patterns'|'date_before', value:any }
}, { timestamps: true }))

// models/DocumentTemplate.ts
import { Schema, model, Types } from 'mongoose'

export const DocumentTemplate = model('DocumentTemplate', new Schema({
  name: { type: String, required: true, unique: true }, // Паспорт, Право власності...
  fieldIds: [{ type: Schema.Types.ObjectId, ref: 'Field', required: true }]
}, { timestamps: true }))

// models/Check.ts
import { Schema, model } from 'mongoose'

export const Check = model('Check', new Schema({
  description: { type: String, required: true },
  type: { type: String, enum: ['single_doc','cross_doc'], required: true },
  whenExpr: String,                       // "passport.marital_status == 'одружений/заміжня'"
  docTemplateId: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate' },
  rules: [{ type: Object, required: true }], // [{type:'forbid_patterns', field:'fld_powers_text', value:['з питань']}]
  severity: { type: String, enum: ['low','medium','high'], default: 'medium' },
  onFail: String
}, { timestamps: true }))

// models/Topic.ts
import { Schema, model } from 'mongoose'

export const Topic = model('Topic', new Schema({
  title: { type: String, required: true },
  tags: [String],
  faq: [{ q: String, a: String }],
  documents: [{
    templateId: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate', required: true },
    alias: { type: String, required: true },     // passport_seller, poa_text...
    required: { type: Boolean, default: true }
  }],
  checkIds: [{ type: Schema.Types.ObjectId, ref: 'Check' }],
  responses: { type: Object } // { missing_docs, analysis_ok, analysis_findings }
}, { timestamps: true }))


⸻

Изменения в стартере (структура и страницы)

Admin UI (простая страница)
	•	/admin — одна страница с секциями/вкладками:
	•	Topics: список + форма (title, tags, faq[], documents[], checkIds[], responses)
	•	Document Templates: имя + выбор Field
	•	Fields: key/label/type/validators
	•	Checks: description/type/whenExpr/docTemplateId/rules/severity/onFail
	•	Хранение — MongoDB через API-роуты (Next.js route handlers)

Chat UI
	•	оставляем штатный чат из стартера, включённый File Search

⸻

Серверные route handlers (Next.js /app/api)
	•	POST /api/admin/fields / GET … / PUT …/:id / DELETE …/:id
	•	POST /api/admin/document-templates …
	•	POST /api/admin/checks …
	•	POST /api/admin/topics …
	•	POST /api/runtime/choose-topic
Вход: { userText }
Действие: вызвать File Search (top-k=5), посчитать частоты metadata.topicId, вернуть лидера или 2–3 кандидата
	•	POST /api/runtime/parse-files
Вход: { files:[{openaiFileId, alias}], documentTemplateId }
Действие: Responses structured outputs по Field у шаблона → [{ fieldKey, value, confidence }]
	•	POST /api/runtime/run-checks
Вход: { topicId, extracted: [{alias, fieldKey, value}] }
Действие: исполняем правила → { findings:[], actions:[], missingDocs:[] }
	•	POST /api/runtime/render-response
Вход: { topicId, result, userQuestion }
Действие: собрать текст из Topic.responses + 1–2 коротких фрагмента из File Search (фильтр по topicId)

Если позже нужно несколько стора, в коде можно передать массив vector_store_ids (UI придётся расширить).  ￼

⸻

Рабочий поток в чате
	1.	Пользователь пишет вопрос → backend вызывает /runtime/choose-topic
	•	если есть явный topicId → продолжаем
	•	если несколько кандидатов → бот задаёт 1 уточнение и повторяет шаг
	2.	Для темы без документов → ответ из faq/чек-листа (подмешиваем 1–2 цитаты из File Search)
	3.	Для темы с документами → бот выдаёт список alias + названий и просит загрузить файлы
	•	загрузка файлов — через штатный UI стартера (Files → попадают в OpenAI Files, не индексируются), если его нет в коде - то добавить, чтоб юзер мог грузить файлы
	4.	Пользователь жмёт «Готово» → фронт вызывает:
	•	/runtime/parse-files для каждого alias/шаблона
	•	/runtime/run-checks по результатам извлечения
	•	/runtime/render-response для финального текста
	5.	Ответ показывается в чате (единым сообщением, без стриминга). Если что-то не так с файлами/чтением — агент сам попросит перезалить или уточнить (доп. инструмент качества не используем).

⸻

Чеклист задач (внутри стартера)

0. [x] Подготовка
	•	[x] Клонировать openai/openai-responses-starter-app, завести .env c OPENAI_API_KEY
	•	[x] Подключить локальную MongoDB и переменные MONGODB_URI
	•	[x] Запуск стартера локально, убедиться в работе File Search панели

1. База знаний (Vector Store)
	•	Собрать knowledge.jsonl (10–20 чанков: FAQ, чек-листы, правила, анти-паттерны)
	•	Загрузить в Vector Store через панель стартера (или через небольшой скрипт)
	•	Проверить поиск по нескольким запросам (чатом) — приходят релевантные цитаты  ￼

2. Модели MongoDB
	•	Добавить Field, DocumentTemplate, Check, Topic (как выше)
	•	REST API-роуты /api/admin/... (CRUD)
	•	Простейшая админ-страница /admin с формами (одна страница, секции/вкладки)

3. Runtime endpoints
	•	/api/runtime/choose-topic — подсчёт лидирующего topicId по результатам File Search (k=5)
	•	/api/runtime/parse-files — связка Responses structured outputs → список { fieldKey, value }
	•	/api/runtime/run-checks — минимальный движок правил
	•	/api/runtime/render-response — текст + короткие цитаты File Search (фильтр по metadata.topicId)

4. Интеграция с чатом
	•	В обработчике первого юзер-сообщения — вызов /runtime/choose-topic
	•	Если нужны документы — вывести список alias и подсказки по загрузке
	•	Кнопка «Готово» запускает последовательные вызовы parse → checks → render
	•	Отрендерить итоговый ответ (и, если есть findings, компактный список)

5. Финальный прогон
	•	Демка «Довіреність»: обнаружение анти-паттерна «з питань…» в текстовом файле довіреності, корректная рекомендация
	•	Демка «Квартира»: список документов без анализа (если так решишь для MVP)
	•	Негативные кейсы: «файл нечитаемый» → вежливое «перезалейте, будь ласка»

6. Дорожная карта (после MVP)
	•	Добавить поддержку нескольких Vector Store (кодом — массив vector_store_ids, UI — мультивыбор)  ￼
	•	Добавить Agents SDK для роли «оркестратора» (handoffs, guardrails, трейсинг)  ￼
	•	Интеграции CRM (Uspacy), календарь, HITL-режим

⸻

Мини-подсказки по интеграции
	•	Где встраивать логику: оставляем чат/панель стартера, а наши роуты — в /app/api/... (Next.js). Они вызываются из серверных действий/handlers, когда модель решает «вызвать инструмент».
	•	Выбор темы без отдельного тулза: это просто функция, которая, получив top-k из File Search, возвращает topicId с max частотой; если ничья — агент задаёт уточнение.
	•	Многократные вектор-хранилища: API принимает массив vector_store_ids, но UI стартера ориентирован на один; на старте держим один стор и размечаем чанки metadata.topicId. Позже — добавим мульти-стор (кодовой правкой).  ￼

⸻

если ок — дальше могу накинуть:
	•	образец knowledge.jsonl на 6–8 чанков под «Довіреність» и «Квартира»,
	•	минимальные типы validators/rules и пример /runtime/run-checks (TS без точек с запятой),
	•	где именно в стартере вставить System Prompt и как подвязать наши /api к встроенным tool-вызовам.