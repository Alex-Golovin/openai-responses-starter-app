ТЗ: MVP «Нотаріальний AI-помічник» на базе openai-responses-starter-app

⚠️ Працюємо поетапно: після кожного завершеного етапу зупиняємося, вручну перевіряємо результат (UI, логи, консоль), узгоджуємо з командою і тільки потім рухаємось далі. Так темп буде трохи повільніший, зате зміни залишаться керованими, а ревʼю — підйомним.
ℹ️ Після завершення будь-якої задачі в чеклістах обовʼязково вручну змінюємо `[ ]` на `[x]`, щоб прогрес було видно у дифах.

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
	•	Аналіз стартує автоматично (без кнопки «Готово»): якщо всі обовʼязкові файли надійшли — починаємо відразу; якщо ні — чекаємо коротку «мʼяку» паузу (дефолт 45 c) і стартуємо з тим, що є
	•	Проміжні повідомлення прогресу: «✅ отримав паспорт…», «🕒 очікую нові файли 45 c…», «🔎 починаю аналіз…», «📄 обробка: текст довіреності (2/3)…», «⏸ перезапуск аналізу через новий файл…»

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
	•	POST /api/knowledge/reindex
Админ-действие: повна перебудова бази знань у Vector Store з Mongo (topics → чанки → аплоад)
	•	POST /api/knowledge/upsert-topic/:id
Точкове оновлення: перебудувати та оновити чанки лише для однієї теми

Если позже нужно несколько стора, в коде можно передать массив vector_store_ids (UI придётся расширить).  ￼

⸻

Синхронизация Vector Store с MongoDB

	•	Источник правды: MongoDB (Topics, Document Templates, Fields, Checks). У Vector Store хранится только текстовая база знаний (FAQ, чек-листы, правила/пояснения, анти-патерни) с metadata: { topicId, kind, title }.
	•	Стратегия на MVP:
		– Працюємо з одним Vector Store (`vs_68d58c14130081919fa83aeee14f6a7d`); id зберігаємо в конфігурації (env/константа).
		– Перебудова knowledge: `buildChunksFromMongo` формує чанки та одразу аплоудить їх у Vector Store через `POST /api/knowledge/reindex` (без проміжного knowledge.jsonl).
		– Чанкер: 300–800 токенів; без зайвого шуму; українською. Метадані кожного чанка: { topicId, kind: 'faq'|'checklist'|'rule'|'pattern', title }.
	•	Генерация чанков (buildChunksFromTopic):
		– FAQ: на каждую пару q/a → отдельный чанк kind:'faq'
		– Документы: из topic.documents собрать текстовый чек-лист → kind:'checklist'
		– Правила/пояснення: текстовые поля из админки → kind:'rule'
		– Антипатерни/правильні формулювання: отдельные записи → kind:'pattern'
		– НЕ включаем checks и JSON-схемы — они остаются в БД/коде и исполняются рантаймом.
	•	API синхронизации:
		– POST /api/knowledge/reindex → full rebuild
		– POST /api/knowledge/upsert-topic/:id → апсертом обновить чанки одной темы
		– (позже) DELETE /api/knowledge/remove-topic/:id
	•	Хранение связок (опционально):
		– В Topic держать service-поле knowledgeRefs: [{ chunkId, hashing }], чтобы делать дифф-апсерты
		– Для MVP можно без этого — только «Reindex»
	•	Мульти-store (позже): код уже умеет принимать массив vector_store_ids; UI-мультивыбор добавим после MVP.

⸻

Рабочий поток в чате (обновлённый — без кнопки «Готово», с промежуточными сообщениями)

	Конфиг
	```
	COLLECT_DEBOUNCE_MS = 45000   // «мʼяка» пауза очікування додаткових файлів; 0 — вимкнути
	PROGRESS_UPDATES = true       // показувати проміжні повідомлення
	RESTART_ON_NEW_FILE = true    // якщо під час аналізу прийшов новий файл — перезапускати
	```

	Стан машини
	```
	idle → topic_selected → collecting_files → analyzing → awaiting_followups
	```

	Події й переходи

	1) Перше повідомлення (text)
		• File Search → top-k → вибір topicId за домінуючим metadata.topicId
		• якщо лідера нема — 1 уточнення і повтор пошуку
		• якщо у теми немає документів → одразу відповідь (FAQ/чек-лист) + 1–2 цитати з File Search → phase=awaiting_followups
		• якщо документи є → вивести список alias+назв; phase=collecting_files
			– якщо PROGRESS_UPDATES: «Готовий приймати файли: …»

	2) Завантаження файлу
		• зберегти openaiFileId під відповідним alias
		• проміжне: «✅ отримав *паспорт довірителя*»
		• якщо всі required alias присутні → startAnalysis() через 1–2 сек
		• інакше, якщо COLLECT_DEBOUNCE_MS>0: перезапустити таймер очікування (45 с за замовчуванням)

	3) Текст під час collecting_files
		• не стартуємо аналіз одразу
		• якщо фраза типу «починай/перевіряй/готово» — startAnalysis() негайно
		• інакше відповідаємо коротко, залишаючись у collecting_files, та продовжуємо чекати файли

	4) Авто-старт аналізу (без кнопки)
		Умови:
			– усі обовʼязкові документи на місці; або
			– надійшов хоча б один релевантний файл і сплив COLLECT_DEBOUNCE_MS
		Кроки:
			– phase=analyzing
			– проміжне: «🔎 Починаю аналіз документів…»
			– parse_files для кожного alias → structured outputs
				• прогрес: «📄 Обробка: *текст довіреності* (2/3)…»
			– run_checks → findings/actions/missing
			– render_response → фінальний текст + короткі цитати File Search
			– phase=awaiting_followups

	5) Новий файл/повідомлення під час analyzing
		• якщо файл і RESTART_ON_NEW_FILE=true:
			– «⏸ Отримав новий файл — перезапускаю аналіз»
			– повернутись у collecting_files і запустити дебаунс
		• якщо текст-уточнення — зафіксувати та врахувати у наступній ітерації; за можливості відповісти коротко, не перериваючи аналіз

	6) Після відповіді
		• phase=awaiting_followups
		• нова тема → повернення до кроку (1)
		• додаткові файли по поточній темі → collecting_files → авто-цикл

	Формат проміжних повідомлень (приклади)
		• «✅ отримав *паспорт довірителя*»
		• «🕒 Очікую нові файли ще 45 с…»
		• «🔎 Починаю аналіз…»
		• «📄 Обробка: *текст довіреності* (2/3)…»
		• «⏸ Перезапуск аналізу через новий файл…»

⸻

Поетапний план (контроль після кожного етапу)

Статус оновлюємо вручну після ревʼю кожного етапу:
- Етап 0 — ✅ завершено
- Етап 1 — 🔄 у роботі
- Етап 2 — ✅ dev готовий, очікує ручної перевірки
- Етапи 3–7 — ще не стартували

Етап 0. Підготовка ✅
	•	[x] Клонувати openai/openai-responses-starter-app, завести .env з OPENAI_API_KEY
	•	[x] Підключити локальну MongoDB і виставити MONGODB_URI
	•	[x] Перевірити локальний запуск стартера та File Search панель

Етап 1. База знань та векторне сховище
	•	[x] Додати конфіг для Vector Store (`VECTOR_STORE_ID=vs_68d58c14130081919fa83aeee14f6a7d`) і прокинути id у File Search/рантайм
	•	[ ] Реалізувати `buildChunksFromMongo`: формуємо FAQ/чек-листи/правила/антипатерни з Mongo
	•	[ ] Реалізувати `POST /api/knowledge/reindex` — повний апдейт Vector Store з Mongo
	•	[ ] Реалізувати `POST /api/knowledge/upsert-topic/:id` — апдейт однієї теми
	•	[ ] Ручна перевірка: додати тестові записи в Mongo (через Compass/скрипт) і переконатися, що File Search повертає цитати після reindex

Етап 2. Моделі MongoDB та адмін-UI
	•	[x] Додати моделі Field, DocumentTemplate, Check, Topic (схеми вище)
	•	[x] CRUD route handlers /api/admin/... для кожної сутності
	•	[x] /admin: одна сторінка з секціями (Topics, Document Templates, Fields, Checks)
	•	[x] /admin: кнопки «Reindex» і «Оновити тему» бʼють по `/api/knowledge/*` (без ручних файлів)
	•	[ ] Ручна перевірка: створити тестову тему і переконатися, що вона зберігається та підтягується у білдері знань

Етап 3. Runtime API для агента
	•	[ ] /api/runtime/choose-topic — підрахунок домінуючого topicId з File Search (k=5)
	•	[ ] /api/runtime/parse-files — Responses structured outputs → { fieldKey, value }
	•	[ ] /api/runtime/run-checks — мінімальний двигун правил
	•	[ ] /api/runtime/render-response — фінальний текст + короткі цитати з File Search (фільтр за topicId)
	•	[ ] Інтеграційні тести: прогнати сценарій вручну через Postman/console

Етап 4. Інтеграція з чат-UI стартера (dev-пісочниця)
	•	[ ] Перетворити чат-UI на внутрішню пісочницю: сховати перемикачі тулів, лишити мінімальні налаштування для тестів
	•	[ ] Перший юзер-меседж викликає /runtime/choose-topic (через агентний оркестратор) і показує перелік документів теми
	•	[ ] Авто-старт аналізу: всі required-файли або пауза COLLECT_DEBOUNCE_MS
	•	[ ] Проміжні повідомлення прогресу згідно з «Робочим потоком»
	•	[ ] Фінальна відповідь без стріму, з цитатами File Search і висновками
	•	[ ] smoke-тест: «Довіреність» + негативний кейс «файл нечитаемый»

Етап 5. Агентний рантайм і трейсинг
	•	[ ] Замінити прямі виклики Responses API на Agents SDK (оркестрація тулів, observability)
	•	[ ] Описати parse_files, run_checks, render_response, book_consultation як SDK tools
	•	[ ] Налаштувати зберігання session_id на стороні OpenAI та прокинути його в UI
	•	[ ] Переконатися, що Observability/Tracing показує всі кроки (AGENTS_TRACE=1)
	•	[ ] Ручна перевірка: сценарії «Довіреність» і «Квартира» через агентний рантайм

Етап 6. Продакшн-флоу з USPICY CRM та OpenAI API
	•	[ ] Винести чат-логіку в server-side endpoint, щоб UI стартера залишився внутрішнім інструментом розробки
	•	[ ] Підключити USPICY CRM: отримання повідомлень (вебхук/полінг) та мапінг у agent.session
	•	[ ] Відправляти відповіді назад у CRM після завершення агентом сценарію
	•	[ ] Керування файлами: завантаження документів з CRM у OpenAI Files API та синхронізація alias
	•	[ ] Авторизація й аудит: захистити продакшн endpoint і логувати активність
	•	[ ] End-to-end демо: реальний чат у CRM → агент → відповідь у тікеті

Етап 7. Після MVP (roadmap)
	•	[ ] Підтримка кількох Vector Store (UI-мультивибір + масив vector_store_ids)
	•	[ ] HITL-режим і інтеграція з календарем/CRM API (book_consultation → живе бронювання)
	•	[ ] Покращення rule-engine, версування тем та регрес-тести на бізнес-кейси

⸻


Мини-подсказки по интеграции
	•	Для продакшну чат працює всередині USPICY CRM; UI стартера тримаємо як внутрішній дев-інструмент для тестів і відладки.
	•	Где встраивать логику: оставляем чат/панель стартера для дев-запусків, а наши роуты — в /app/api/... (Next.js). Они вызываются из серверных действий/handlers, когда модель решает «вызвать инструмент».
	•	Выбор темы без отдельного тулза: это просто функция, которая, получив top-k из File Search, возвращает topicId с max частотой; если ничья — агент задаёт уточнение.
	•	Многократные вектор-хранилища: API принимает массив vector_store_ids, но UI стартера ориентирован на один; на старте держим один стор и размечаем чанки metadata.topicId. Позже — добавим мульти-стор (кодовой правкой).  ￼
