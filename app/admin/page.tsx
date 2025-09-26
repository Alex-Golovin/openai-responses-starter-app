'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

type FieldRecord = {
  id: string;
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  options?: string[];
  extractHint?: string;
  validators?: Record<string, unknown>[];
};

type DocumentTemplateRecord = {
  id: string;
  name: string;
  fieldIds: string[];
};

type CheckRecord = {
  id: string;
  description: string;
  type: 'single_doc' | 'cross_doc';
  whenExpr?: string;
  docTemplateId?: string;
  rules: Record<string, unknown>[];
  severity: 'low' | 'medium' | 'high';
  onFail?: string;
};

type TopicFaq = { q: string; a: string };

type TopicDocumentRef = {
  templateId: string;
  alias: string;
  required: boolean;
};

type TopicResponseBlock = {
  kind: 'info' | 'checklist' | 'service' | 'script' | 'pricing';
  title: string;
  description?: string;
  items: string[];
};

type TopicResponses = {
  textBlocks: TopicResponseBlock[];
};

type TopicRecord = {
  id: string;
  title: string;
  tags?: string[];
  faq: TopicFaq[];
  documents: TopicDocumentRef[];
  checkIds: string[];
  responses?: TopicResponses | null;
};

const ADMIN_TABS = [
  { id: 'topics', label: 'Теми' },
  { id: 'documentTemplates', label: 'Шаблони документів' },
  { id: 'fields', label: 'Поля' },
  { id: 'checks', label: 'Перевірки' },
] as const;

type FieldFormState = {
  key: string;
  label: string;
  type: FieldRecord['type'];
  optionsText: string;
  extractHint: string;
  validatorsText: string;
};

type TemplateFormState = {
  name: string;
  fieldIds: string[];
};

type CheckFormState = {
  description: string;
  type: CheckRecord['type'];
  whenExpr: string;
  docTemplateId: string;
  rulesText: string;
  severity: CheckRecord['severity'];
  onFail: string;
};

type TopicResponseBlockDraft = {
  kind: TopicResponseBlock['kind'];
  title: string;
  description: string;
  itemsText: string;
};

type TopicFormState = {
  title: string;
  tagsInput: string;
  faq: TopicFaq[];
  faqDraft: TopicFaq;
  documents: TopicDocumentRef[];
  documentDraft: TopicDocumentRef;
  checkIds: string[];
  responses: TopicResponses;
  responseBlockDraft: TopicResponseBlockDraft;
};

const createEmptyFieldForm = (): FieldFormState => ({
  key: '',
  label: '',
  type: 'string',
  optionsText: '',
  extractHint: '',
  validatorsText: '[]',
});

const createEmptyTemplateForm = (): TemplateFormState => ({
  name: '',
  fieldIds: [],
});

const createEmptyCheckForm = (): CheckFormState => ({
  description: '',
  type: 'single_doc',
  whenExpr: '',
  docTemplateId: '',
  rulesText: '[]',
  severity: 'medium',
  onFail: '',
});

const createEmptyTopicForm = (): TopicFormState => ({
  title: '',
  tagsInput: '',
  faq: [],
  faqDraft: { q: '', a: '' },
  documents: [],
  documentDraft: { templateId: '', alias: '', required: true },
  checkIds: [],
  responses: { textBlocks: [] },
  responseBlockDraft: {
    kind: 'info',
    title: '',
    description: '',
    itemsText: '',
  },
});

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch (error) {
      console.error('Failed to parse error response', error);
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null as T;
  }
  return (await response.json()) as T;
}

export default function AdminPage() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [fieldForm, setFieldForm] = useState<FieldFormState>(() =>
    createEmptyFieldForm()
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldSubmitting, setFieldSubmitting] = useState(false);

  const [templates, setTemplates] = useState<DocumentTemplateRecord[]>([]);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(() =>
    createEmptyTemplateForm()
  );
  const [editingTemplateId, setEditingTemplateId] =
    useState<string | null>(null);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [checkForm, setCheckForm] = useState<CheckFormState>(() =>
    createEmptyCheckForm()
  );
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [checkSubmitting, setCheckSubmitting] = useState(false);

  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [topicForm, setTopicForm] = useState<TopicFormState>(() =>
    createEmptyTopicForm()
  );
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicSubmitting, setTopicSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<
    (typeof ADMIN_TABS)[number]['id']
  >('topics');

  const [reindexing, setReindexing] = useState(false);
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null);

  const clearFeedback = () => setFeedback(null);

  const showSuccess = (message: string) => setFeedback({ type: 'success', message });
  const showError = (message: string) => setFeedback({ type: 'error', message });

  const loadFields = async () => {
    const data = await fetchJson<FieldRecord[]>('/api/admin/fields', {
      cache: 'no-store',
    });
    setFields(data);
  };

  const loadTemplates = async () => {
    const data = await fetchJson<DocumentTemplateRecord[]>(
      '/api/admin/document-templates',
      { cache: 'no-store' }
    );
    setTemplates(data);
  };

  const loadChecks = async () => {
    const data = await fetchJson<CheckRecord[]>('/api/admin/checks', {
      cache: 'no-store',
    });
    setChecks(data);
  };

  const loadTopics = async () => {
    const data = await fetchJson<TopicRecord[]>('/api/admin/topics', {
      cache: 'no-store',
    });
    setTopics(data);
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadFields(), loadTemplates(), loadChecks(), loadTopics()]);
      } catch (error) {
        showError((error as Error).message);
      }
    })();
  }, []);

  const fieldTypeOptions: FieldRecord['type'][] = useMemo(
    () => ['string', 'number', 'boolean', 'date', 'enum'],
    []
  );

  const checkTypeOptions: CheckRecord['type'][] = useMemo(
    () => ['single_doc', 'cross_doc'],
    []
  );

  const checkSeverityOptions: CheckRecord['severity'][] = useMemo(
    () => ['low', 'medium', 'high'],
    []
  );

  const handleFieldSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    let validators: Record<string, unknown>[] = [];
    if (fieldForm.validatorsText.trim()) {
      try {
        validators = JSON.parse(fieldForm.validatorsText);
        if (!Array.isArray(validators)) {
          throw new Error('Validators should be an array');
        }
      } catch (error) {
        showError(`Помилка парсингу validators: ${(error as Error).message}`);
        return;
      }
    }

    const options = fieldForm.optionsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      key: fieldForm.key.trim(),
      label: fieldForm.label.trim(),
      type: fieldForm.type,
      options: options.length > 0 ? options : undefined,
      extractHint: fieldForm.extractHint.trim() || undefined,
      validators: validators.length > 0 ? validators : undefined,
    };

    setFieldSubmitting(true);
    try {
      if (editingFieldId) {
        await fetchJson(`/api/admin/fields/${editingFieldId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Поле оновлено');
      } else {
        await fetchJson('/api/admin/fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Поле створено');
      }
      await loadFields();
      setFieldForm(createEmptyFieldForm());
      setEditingFieldId(null);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setFieldSubmitting(false);
    }
  };

  const handleFieldEdit = (field: FieldRecord) => {
    clearFeedback();
    setEditingFieldId(field.id);
    setFieldForm({
      key: field.key,
      label: field.label,
      type: field.type,
      optionsText: (field.options || []).join('\n'),
      extractHint: field.extractHint || '',
      validatorsText: JSON.stringify(field.validators || [], null, 2),
    });
  };

  const handleFieldDelete = async (id: string) => {
    clearFeedback();
    try {
      await fetchJson(`/api/admin/fields/${id}`, { method: 'DELETE' });
      showSuccess('Поле видалено');
      await loadFields();
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const toggleTemplateField = (fieldId: string) => {
    setTemplateForm((prev) => {
      const exists = prev.fieldIds.includes(fieldId);
      return {
        ...prev,
        fieldIds: exists
          ? prev.fieldIds.filter((id) => id !== fieldId)
          : [...prev.fieldIds, fieldId],
      };
    });
  };

  const handleTemplateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    const payload = {
      name: templateForm.name.trim(),
      fieldIds: templateForm.fieldIds,
    };

    setTemplateSubmitting(true);
    try {
      if (editingTemplateId) {
        await fetchJson(`/api/admin/document-templates/${editingTemplateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Шаблон документа оновлено');
      } else {
        await fetchJson('/api/admin/document-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Шаблон документа створено');
      }
      await Promise.all([loadTemplates(), loadFields()]);
      setTemplateForm(createEmptyTemplateForm());
      setEditingTemplateId(null);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const handleTemplateEdit = (template: DocumentTemplateRecord) => {
    clearFeedback();
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      fieldIds: template.fieldIds || [],
    });
  };

  const handleTemplateDelete = async (id: string) => {
    clearFeedback();
    try {
      await fetchJson(`/api/admin/document-templates/${id}`, {
        method: 'DELETE',
      });
      showSuccess('Шаблон документа видалено');
      await Promise.all([loadTemplates(), loadTopics()]);
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleCheckSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    let rules: Record<string, unknown>[] = [];
    if (checkForm.rulesText.trim()) {
      try {
        rules = JSON.parse(checkForm.rulesText);
        if (!Array.isArray(rules)) {
          throw new Error('Rules should be an array');
        }
      } catch (error) {
        showError(`Помилка парсингу rules: ${(error as Error).message}`);
        return;
      }
    }

    const payload = {
      description: checkForm.description.trim(),
      type: checkForm.type,
      whenExpr: checkForm.whenExpr.trim() || undefined,
      docTemplateId: checkForm.docTemplateId || undefined,
      rules,
      severity: checkForm.severity,
      onFail: checkForm.onFail.trim() || undefined,
    };

    setCheckSubmitting(true);
    try {
      if (editingCheckId) {
        await fetchJson(`/api/admin/checks/${editingCheckId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Перевірку оновлено');
      } else {
        await fetchJson('/api/admin/checks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Перевірку створено');
      }
      await Promise.all([loadChecks(), loadTopics()]);
      setCheckForm(createEmptyCheckForm());
      setEditingCheckId(null);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setCheckSubmitting(false);
    }
  };

  const handleCheckEdit = (check: CheckRecord) => {
    clearFeedback();
    setEditingCheckId(check.id);
    setCheckForm({
      description: check.description,
      type: check.type,
      whenExpr: check.whenExpr || '',
      docTemplateId: check.docTemplateId || '',
      rulesText: JSON.stringify(check.rules || [], null, 2),
      severity: check.severity,
      onFail: check.onFail || '',
    });
  };

  const handleCheckDelete = async (id: string) => {
    clearFeedback();
    try {
      await fetchJson(`/api/admin/checks/${id}`, {
        method: 'DELETE',
      });
      showSuccess('Перевірку видалено');
      await Promise.all([loadChecks(), loadTopics()]);
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleTopicSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    const payload = {
      title: topicForm.title.trim(),
      tags: topicForm.tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      faq: topicForm.faq,
      documents: topicForm.documents.map((doc) => ({
        templateId: doc.templateId,
        alias: doc.alias.trim(),
        required: doc.required,
      })),
      checkIds: topicForm.checkIds,
      responses:
        topicForm.responses.textBlocks.length > 0
          ? {
              textBlocks: topicForm.responses.textBlocks.map((block) => ({
                ...block,
                items: block.items.filter((item) => item.trim().length > 0),
              })),
            }
          : undefined,
    };

    setTopicSubmitting(true);
    try {
      if (editingTopicId) {
        await fetchJson(`/api/admin/topics/${editingTopicId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Тему оновлено');
      } else {
        await fetchJson('/api/admin/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Тему створено');
      }
      await loadTopics();
      setTopicForm(createEmptyTopicForm());
      setEditingTopicId(null);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleTopicEdit = (topic: TopicRecord) => {
    clearFeedback();
    setEditingTopicId(topic.id);
    setTopicForm({
      title: topic.title,
      tagsInput: (topic.tags || []).join(', '),
      faq: topic.faq || [],
      faqDraft: { q: '', a: '' },
      documents: topic.documents || [],
      documentDraft: { templateId: '', alias: '', required: true },
      checkIds: topic.checkIds || [],
      responses: {
        textBlocks: (topic.responses?.textBlocks ?? []).map((block) => ({
          ...block,
          items: [...(block.items ?? [])],
        })),
      },
      responseBlockDraft: {
        kind: 'info',
        title: '',
        description: '',
        itemsText: '',
      },
    });
  };

  const handleTopicDelete = async (id: string) => {
    clearFeedback();
    try {
      await fetchJson(`/api/admin/topics/${id}`, { method: 'DELETE' });
      showSuccess('Тему видалено');
      await loadTopics();
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const addFaqEntry = () => {
    clearFeedback();
    if (!topicForm.faqDraft.q.trim() || !topicForm.faqDraft.a.trim()) {
      showError('Заповніть питання та відповідь перед додаванням FAQ');
      return;
    }
    setTopicForm((prev) => ({
      ...prev,
      faq: [...prev.faq, { ...prev.faqDraft }],
      faqDraft: { q: '', a: '' },
    }));
  };

  const removeFaqEntry = (index: number) => {
    clearFeedback();
    setTopicForm((prev) => ({
      ...prev,
      faq: prev.faq.filter((_, idx) => idx !== index),
    }));
  };

  const addDocumentEntry = () => {
    clearFeedback();
    if (!topicForm.documentDraft.templateId || !topicForm.documentDraft.alias.trim()) {
      showError('Оберіть шаблон документа та вкажіть alias');
      return;
    }
    setTopicForm((prev) => ({
      ...prev,
      documents: [...prev.documents, { ...prev.documentDraft, alias: prev.documentDraft.alias.trim() }],
      documentDraft: { templateId: '', alias: '', required: true },
    }));
  };

  const removeDocumentEntry = (index: number) => {
    clearFeedback();
    setTopicForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== index),
    }));
  };

  const addResponseBlock = () => {
    clearFeedback();
    const { title, itemsText, description, kind } = topicForm.responseBlockDraft;
    if (!title.trim()) {
      showError('Вкажіть назву блоку');
      return;
    }

    const items = itemsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length === 0) {
      showError('Додайте хоча б один пункт для блоку');
      return;
    }

    setTopicForm((prev) => ({
      ...prev,
      responses: {
        textBlocks: [
          ...prev.responses.textBlocks,
          {
            kind,
            title: title.trim(),
            description: description.trim() || undefined,
            items,
          },
        ],
      },
      responseBlockDraft: {
        kind: 'info',
        title: '',
        description: '',
        itemsText: '',
      },
    }));
  };

  const removeResponseBlock = (index: number) => {
    clearFeedback();
    setTopicForm((prev) => ({
      ...prev,
      responses: {
        textBlocks: prev.responses.textBlocks.filter((_, idx) => idx !== index),
      },
    }));
  };

  const editResponseBlock = (index: number) => {
    clearFeedback();
    setTopicForm((prev) => {
      const block = prev.responses.textBlocks[index];
      if (!block) {
        return prev;
      }
      return {
        ...prev,
        responses: {
          textBlocks: prev.responses.textBlocks.filter((_, idx) => idx !== index),
        },
        responseBlockDraft: {
          kind: block.kind,
          title: block.title,
          description: block.description ?? '',
          itemsText: Array.isArray(block.items) ? block.items.join('\n') : '',
        },
      };
    });
  };

  const toggleTopicCheck = (checkId: string) => {
    setTopicForm((prev) => ({
      ...prev,
      checkIds: prev.checkIds.includes(checkId)
        ? prev.checkIds.filter((id) => id !== checkId)
        : [...prev.checkIds, checkId],
    }));
  };

  const handleReindex = async () => {
    clearFeedback();
    setReindexing(true);
    try {
      const result = await fetchJson<{ message?: string }>(
        '/api/knowledge/reindex',
        { method: 'POST' }
      );
      showSuccess(result?.message || 'Reindex запущено');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setReindexing(false);
    }
  };

  const handleTopicReindex = async (topicId: string) => {
    clearFeedback();
    setUpdatingTopicId(topicId);
    try {
      const result = await fetchJson<{ message?: string }>(
        `/api/knowledge/upsert-topic/${topicId}`,
        { method: 'POST' }
      );
      showSuccess(result?.message || 'Оновлення теми запущено');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setUpdatingTopicId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Адмін-панель</h1>
          <p className="text-sm text-muted-foreground">
            Керуйте полями, шаблонами документів, перевірками та темами
          </p>
        </div>
        <button
          type="button"
          onClick={handleReindex}
          disabled={reindexing}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reindexing ? 'Запуск…' : 'Reindex knowledge'}
        </button>
      </header>

      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <nav className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section
        className={`space-y-4 rounded-lg border bg-white p-6 shadow-sm ${
          activeTab === 'fields' ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Fields</h2>
          {editingFieldId && (
            <button
              type="button"
              onClick={() => {
                setEditingFieldId(null);
                setFieldForm(createEmptyFieldForm());
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Скасувати редагування
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Key</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Label</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Validators</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((field) => (
                <tr key={field.id}>
                  <td className="px-3 py-2 font-mono text-xs">{field.key}</td>
                  <td className="px-3 py-2">{field.label}</td>
                  <td className="px-3 py-2 capitalize">{field.type}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {field.validators && field.validators.length > 0
                      ? `${field.validators.length} rules`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleFieldEdit(field)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Редагувати
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldDelete(field.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleFieldSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Key</label>
            <input
              required
              value={fieldForm.key}
              onChange={(event) =>
                setFieldForm((prev) => ({ ...prev, key: event.target.value }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="passport_number"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Label</label>
            <input
              required
              value={fieldForm.label}
              onChange={(event) =>
                setFieldForm((prev) => ({ ...prev, label: event.target.value }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Номер паспорта"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <select
              value={fieldForm.type}
              onChange={(event) =>
                setFieldForm((prev) => ({
                  ...prev,
                  type: event.target.value as FieldRecord['type'],
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {fieldTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Extract hint</label>
            <input
              value={fieldForm.extractHint}
              onChange={(event) =>
                setFieldForm((prev) => ({
                  ...prev,
                  extractHint: event.target.value,
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Підказка для моделі"
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium">Options (по рядку)</label>
            <textarea
              value={fieldForm.optionsText}
              onChange={(event) =>
                setFieldForm((prev) => ({
                  ...prev,
                  optionsText: event.target.value,
                }))
              }
              className="h-24 w-full rounded-md border px-3 py-2 text-sm"
              placeholder={'варіант 1\nваріант 2'}
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium">Validators (JSON)</label>
            <textarea
              value={fieldForm.validatorsText}
              onChange={(event) =>
                setFieldForm((prev) => ({
                  ...prev,
                  validatorsText: event.target.value,
                }))
              }
              className="h-24 w-full rounded-md border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={fieldSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fieldSubmitting
                ? 'Збереження…'
                : editingFieldId
                ? 'Оновити поле'
                : 'Створити поле'}
            </button>
          </div>
        </form>
      </section>

      <section
        className={`space-y-4 rounded-lg border bg-white p-6 shadow-sm ${
          activeTab === 'documentTemplates' ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Document Templates</h2>
          {editingTemplateId && (
            <button
              type="button"
              onClick={() => {
                setEditingTemplateId(null);
                setTemplateForm(createEmptyTemplateForm());
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Скасувати редагування
            </button>
          )}
        </div>
        <div className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Шаблонів поки немає</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="flex items-start justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Поля: {template.fieldIds.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleTemplateEdit(template)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Редагувати
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateDelete(template.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Видалити
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleTemplateSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Назва шаблону</label>
            <input
              required
              value={templateForm.name}
              onChange={(event) =>
                setTemplateForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Паспорт громадянина України"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Оберіть поля</p>
            <div className="flex flex-wrap gap-2">
              {fields.map((field) => {
                const checked = templateForm.fieldIds.includes(field.id);
                return (
                  <label
                    key={field.id}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                      checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={checked}
                      onChange={() => toggleTemplateField(field.id)}
                    />
                    {field.label}
                  </label>
                );
              })}
            </div>
          </div>
          <button
            type="submit"
            disabled={templateSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {templateSubmitting
              ? 'Збереження…'
              : editingTemplateId
              ? 'Оновити шаблон'
              : 'Створити шаблон'}
          </button>
        </form>
      </section>

      <section
        className={`space-y-4 rounded-lg border bg-white p-6 shadow-sm ${
          activeTab === 'checks' ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Checks</h2>
          {editingCheckId && (
            <button
              type="button"
              onClick={() => {
                setEditingCheckId(null);
                setCheckForm(createEmptyCheckForm());
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Скасувати редагування
            </button>
          )}
        </div>
        <div className="space-y-2">
          {checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Перевірок поки немає</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {checks.map((check) => (
                <li
                  key={check.id}
                  className="flex items-start justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{check.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {check.type} · severity: {check.severity}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckEdit(check)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Редагувати
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckDelete(check.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Видалити
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleCheckSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Опис</label>
            <input
              required
              value={checkForm.description}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Перевірити збіг дати народження"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Тип</label>
            <select
              value={checkForm.type}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  type: event.target.value as CheckRecord['type'],
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {checkTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Severity</label>
            <select
              value={checkForm.severity}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  severity: event.target.value as CheckRecord['severity'],
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {checkSeverityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Умова (whenExpr)</label>
            <input
              value={checkForm.whenExpr}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  whenExpr: event.target.value,
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="passport.marital_status == 'одружений'"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Документ (опціонально)</label>
            <select
              value={checkForm.docTemplateId}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  docTemplateId: event.target.value,
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium">Rules (JSON)</label>
            <textarea
              value={checkForm.rulesText}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  rulesText: event.target.value,
                }))
              }
              className="h-32 w-full rounded-md border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium">Дія при помилці (onFail)</label>
            <textarea
              value={checkForm.onFail}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  onFail: event.target.value,
                }))
              }
              className="h-32 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={checkSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkSubmitting
                ? 'Збереження…'
                : editingCheckId
                ? 'Оновити перевірку'
                : 'Створити перевірку'}
            </button>
          </div>
        </form>
      </section>

      <section
        className={`space-y-4 rounded-lg border bg-white p-6 shadow-sm ${
          activeTab === 'topics' ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Topics</h2>
          {editingTopicId && (
            <button
              type="button"
              onClick={() => {
                setEditingTopicId(null);
                setTopicForm(createEmptyTopicForm());
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Скасувати редагування
            </button>
          )}
        </div>
        <div className="space-y-3">
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Тем поки немає</p>
          ) : (
            <ul className="space-y-3">
              {topics.map((topic) => (
                <li
                  key={topic.id}
                  className="rounded-md border px-4 py-3 text-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{topic.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {topic.tags && topic.tags.length > 0
                          ? topic.tags.join(', ')
                          : 'Без тегів'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleTopicReindex(topic.id)}
                        disabled={updatingTopicId === topic.id}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-60"
                      >
                        {updatingTopicId === topic.id
                          ? 'Оновлення…'
                          : 'Оновити тему у Vector Store'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTopicEdit(topic)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Редагувати
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTopicDelete(topic.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                    <div>FAQ: {topic.faq?.length || 0}</div>
                    <div>Документи: {topic.documents?.length || 0}</div>
                    <div>Перевірки: {topic.checkIds?.length || 0}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleTopicSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Назва теми</label>
              <input
                required
                value={topicForm.title}
                onChange={(event) =>
                  setTopicForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Продаж квартири"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Теги (через кому)</label>
              <input
                value={topicForm.tagsInput}
                onChange={(event) =>
                  setTopicForm((prev) => ({
                    ...prev,
                    tagsInput: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="sale, квартира"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">FAQ</h3>
                <button
                  type="button"
                  onClick={addFaqEntry}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Додати
                </button>
              </div>
              <div className="space-y-2">
                {topicForm.faq.map((item, index) => (
                  <div
                    key={`${item.q}-${index}`}
                    className="rounded-md border px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.q}</p>
                        <p className="text-xs text-muted-foreground">{item.a}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFaqEntry(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 rounded-md border px-3 py-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Питання</label>
                  <input
                    value={topicForm.faqDraft.q}
                    onChange={(event) =>
                      setTopicForm((prev) => ({
                        ...prev,
                        faqDraft: { ...prev.faqDraft, q: event.target.value },
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Відповідь</label>
                  <textarea
                    value={topicForm.faqDraft.a}
                    onChange={(event) =>
                      setTopicForm((prev) => ({
                        ...prev,
                        faqDraft: { ...prev.faqDraft, a: event.target.value },
                      }))
                    }
                    className="h-24 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Документи</h3>
                <button
                  type="button"
                  onClick={addDocumentEntry}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Додати
                </button>
              </div>
              <div className="space-y-2">
                {topicForm.documents.map((doc, index) => {
                  const templateName = templates.find(
                    (template) => template.id === doc.templateId
                  )?.name;
                  return (
                    <div
                      key={`${doc.templateId}-${doc.alias}-${index}`}
                      className="rounded-md border px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{templateName || doc.templateId}</p>
                          <p className="text-xs text-muted-foreground">
                            Alias: {doc.alias} · {doc.required ? 'обовʼязково' : 'необовʼязково'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocumentEntry(index)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Видалити
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 rounded-md border px-3 py-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Шаблон документа</label>
                  <select
                    value={topicForm.documentDraft.templateId}
                    onChange={(event) =>
                      setTopicForm((prev) => ({
                        ...prev,
                        documentDraft: {
                          ...prev.documentDraft,
                          templateId: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Alias</label>
                  <input
                    value={topicForm.documentDraft.alias}
                    onChange={(event) =>
                      setTopicForm((prev) => ({
                        ...prev,
                        documentDraft: {
                          ...prev.documentDraft,
                          alias: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="passport_seller"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="document-required-draft"
                    type="checkbox"
                    checked={topicForm.documentDraft.required}
                    onChange={(event) =>
                      setTopicForm((prev) => ({
                        ...prev,
                        documentDraft: {
                          ...prev.documentDraft,
                          required: event.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <label htmlFor="document-required-draft" className="text-xs">
                    Обовʼязковий документ
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Перевірки</h3>
            <div className="flex flex-wrap gap-2">
              {checks.map((check) => {
                const checked = topicForm.checkIds.includes(check.id);
                return (
                  <label
                    key={check.id}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                      checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={checked}
                      onChange={() => toggleTopicCheck(check.id)}
                    />
                    {check.description}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Текстові блоки</h3>
              <p className="text-xs text-muted-foreground">
                Використовуйте для інструкцій, шаблонів, службових повідомлень
              </p>
            </div>

            <div className="space-y-2">
              {topicForm.responses.textBlocks.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Поки що немає блоків. Додайте перший нижче.
                </p>
              )}
              {topicForm.responses.textBlocks.map((block, index) => (
                <div
                  key={`${block.title}-${index}`}
                  className="space-y-2 rounded-md border px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-600">
                          {block.kind}
                        </span>
                        <h4 className="text-sm font-semibold">{block.title}</h4>
                      </div>
                      {block.description && (
                        <p className="mt-1 text-xs text-gray-600">
                          {block.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editResponseBlock(index)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Редагувати
                      </button>
                      <button
                        type="button"
                        onClick={() => removeResponseBlock(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-gray-700">
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-md border px-3 py-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Тип</label>
                  <select
                    value={topicForm.responseBlockDraft.kind}
                    onChange={(event) =>
                      setTopicForm((prev) => ({
                        ...prev,
                        responseBlockDraft: {
                          ...prev.responseBlockDraft,
                          kind: event.target.value as TopicResponseBlock['kind'],
                        },
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="info">Інформація</option>
                    <option value="checklist">Чекліст</option>
                    <option value="service">Сервіс</option>
                    <option value="script">Скрипт</option>
                    <option value="pricing">Вартість</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Заголовок</label>
                  <input
                    value={topicForm.responseBlockDraft.title}
                    onChange={(event) =>
                      setTopicForm((prev) => ({
                        ...prev,
                        responseBlockDraft: {
                          ...prev.responseBlockDraft,
                          title: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Наприклад: Класичні відповіді"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Опис (необов’язково)</label>
                <input
                  value={topicForm.responseBlockDraft.description}
                  onChange={(event) =>
                    setTopicForm((prev) => ({
                      ...prev,
                      responseBlockDraft: {
                        ...prev.responseBlockDraft,
                        description: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Коротке пояснення або контекст"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Пункти (по одному в рядку)
                </label>
                <textarea
                  value={topicForm.responseBlockDraft.itemsText}
                  onChange={(event) =>
                    setTopicForm((prev) => ({
                      ...prev,
                      responseBlockDraft: {
                        ...prev.responseBlockDraft,
                        itemsText: event.target.value,
                      },
                    }))
                  }
                  className="h-32 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder={'Відповідь 1\nВідповідь 2'}
                />
              </div>
              <button
                type="button"
                onClick={addResponseBlock}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Додати блок
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={topicSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {topicSubmitting
              ? 'Збереження…'
              : editingTopicId
              ? 'Оновити тему'
              : 'Створити тему'}
          </button>
        </form>
      </section>
    </div>
  );
}
