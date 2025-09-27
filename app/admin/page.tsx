'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

// Field validators removed — all rules are handled within Checks

type FieldOptionRecord = {
  label: string;
  value: string;
};

type FieldRecord = {
  id: string;
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  options?: FieldOptionRecord[];
  extractHint?: string;
};

type TemplateCheckMode = 'single_doc' | 'multi_doc';

type DocumentTemplateCheckRecord = {
  checkId: string;
  mode: TemplateCheckMode;
};

type DocumentTemplateRecord = {
  id: string;
  name: string;
  fieldIds: string[];
  checks: DocumentTemplateCheckRecord[];
};

type CheckRecord = {
  id: string;
  description: string;
  whenExpr?: string;
  rules: CheckRuleRecord[];
  severity: 'low' | 'medium' | 'high';
  onFail?: string;
};

type CheckRuleRecord = {
  target: {
    fieldKey: string;
  };
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'greater_or_equal'
    | 'less_than'
    | 'less_or_equal'
    | 'is_present'
    | 'is_missing';
  value?: unknown;
  message?: string;
};

type CheckRuleForm = {
  id: string;
  fieldKey: string;
  operator: CheckRuleRecord['operator'];
  value: string;
  message: string;
};

type CheckRuleDraft = Omit<CheckRuleForm, 'id'>;

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
  { id: 'checks', label: 'Перевірки' },
  { id: 'fields', label: 'Поля' },
] as const;

const CHECK_RULE_OPERATORS: { value: CheckRuleRecord['operator']; label: string }[] = [
  { value: 'equals', label: 'Дорівнює' },
  { value: 'not_equals', label: 'Не дорівнює' },
  { value: 'contains', label: 'Містить' },
  { value: 'not_contains', label: 'Не містить' },
  { value: 'greater_than', label: 'Більше' },
  { value: 'greater_or_equal', label: 'Більше або дорівнює' },
  { value: 'less_than', label: 'Менше' },
  { value: 'less_or_equal', label: 'Менше або дорівнює' },
  { value: 'is_present', label: 'Заповнено' },
  { value: 'is_missing', label: 'Порожнє' },
];

const OPERATORS_WITHOUT_VALUE: ReadonlyArray<CheckRuleRecord['operator']> = [
  'is_present',
  'is_missing',
];

const FIELD_TYPE_LABELS: Record<FieldRecord['type'], string> = {
  string: 'Текст',
  number: 'Число',
  boolean: 'Так/ні',
  date: 'Дата',
  enum: 'Список значень',
};

const TEMPLATE_CHECK_MODE_LABELS: Record<TemplateCheckMode, string> = {
  single_doc: 'Один документ',
  multi_doc: 'Кілька документів',
};

const CHECK_SEVERITY_LABELS: Record<CheckRecord['severity'], string> = {
  low: 'Низька',
  medium: 'Середня',
  high: 'Висока',
};

// Field validator options removed

type FieldFormState = {
  key: string;
  label: string;
  type: FieldRecord['type'];
  options: FieldOptionForm[];
  extractHint: string;
};

type TemplateFormState = {
  name: string;
  fieldIds: string[];
  checks: DocumentTemplateCheckRecord[];
  checkDraft: {
    checkId: string;
    mode: TemplateCheckMode;
  };
};

type CheckFormState = {
  description: string;
  whenExpr: string;
  severity: CheckRecord['severity'];
  onFail: string;
  rules: CheckRuleForm[];
  ruleDraft: CheckRuleDraft;
};

type FieldOptionForm = {
  id: string;
  label: string;
  value: string;
  isEditable: boolean;
};

// FieldValidatorForm removed

type TopicResponseBlockDraft = {
  kind: TopicResponseBlock['kind'];
  title: string;
  description: string;
  itemsText: string;
};

type TopicFormState = {
  title: string;
  tags: string[];
  tagInput: string;
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
  options: [],
  extractHint: '',
});

const createEmptyTemplateForm = (): TemplateFormState => ({
  name: '',
  fieldIds: [],
  checks: [],
  checkDraft: { checkId: '', mode: 'single_doc' },
});

const createEmptyCheckForm = (): CheckFormState => ({
  description: '',
  whenExpr: '',
  severity: 'medium',
  onFail: '',
  rules: [],
  ruleDraft: createEmptyRuleDraft(),
});

const createEmptyRuleDraft = (): CheckRuleDraft => ({
  fieldKey: '',
  operator: 'equals',
  value: '',
  message: '',
});

const createEmptyResponseBlockDraft = (): TopicResponseBlockDraft => ({
  kind: 'info',
  title: '',
  description: '',
  itemsText: '',
});

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
};

const slugify = (input: string): string => {
  const lower = input.trim().toLowerCase();
  let result = '';
  for (const char of lower) {
    if (/[a-z0-9]/.test(char)) {
      result += char;
    } else if (CYRILLIC_TO_LATIN_MAP[char]) {
      result += CYRILLIC_TO_LATIN_MAP[char];
    } else if (char === ' ' || char === '-' || char === '_') {
      result += '-';
    }
  }
  result = result.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return result || 'item';
};

const makeUniqueSlug = (base: string, existing: Set<string>): string => {
  let candidate = base;
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
};

const createEmptyTopicForm = (): TopicFormState => ({
  title: '',
  tags: [],
  tagInput: '',
  faq: [],
  faqDraft: { q: '', a: '' },
  documents: [],
  documentDraft: { templateId: '', alias: '', required: true },
  checkIds: [],
  responses: { textBlocks: [] },
  responseBlockDraft: createEmptyResponseBlockDraft(),
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

function AdminPageContent() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [fieldForm, setFieldForm] = useState<FieldFormState>(() =>
    createEmptyFieldForm()
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldSubmitting, setFieldSubmitting] = useState(false);
  const [fieldFormVisible, setFieldFormVisible] = useState(false);

  const [templates, setTemplates] = useState<DocumentTemplateRecord[]>([]);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(() =>
    createEmptyTemplateForm()
  );
  const [editingTemplateId, setEditingTemplateId] =
    useState<string | null>(null);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templateFormVisible, setTemplateFormVisible] = useState(false);

  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [checkForm, setCheckForm] = useState<CheckFormState>(() =>
    createEmptyCheckForm()
  );
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [checkSubmitting, setCheckSubmitting] = useState(false);
  const [checkFormVisible, setCheckFormVisible] = useState(false);
  const [ruleDraftVisible, setRuleDraftVisible] = useState(false);

  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [topicForm, setTopicForm] = useState<TopicFormState>(() =>
    createEmptyTopicForm()
  );
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicSubmitting, setTopicSubmitting] = useState(false);
  const [topicFormVisible, setTopicFormVisible] = useState(false);
  const [faqDraftVisible, setFaqDraftVisible] = useState(false);
  const [documentDraftVisible, setDocumentDraftVisible] = useState(false);
  const [responseDraftVisible, setResponseDraftVisible] = useState(false);
  const [editingResponseBlockIndex, setEditingResponseBlockIndex] =
    useState<number | null>(null);
  const [responseBlockTitleError, setResponseBlockTitleError] =
    useState(false);

  const [activeTab, setActiveTab] = useState<
    (typeof ADMIN_TABS)[number]['id']
  >('topics');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ADMIN_TABS.some((t) => t.id === tab)) {
      setActiveTab(tab as (typeof ADMIN_TABS)[number]['id']);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: (typeof ADMIN_TABS)[number]['id']) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('tab', tabId);
    router.replace(`?${params.toString()}`);
  };

  const [reindexing, setReindexing] = useState(false);
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null);

  const clearFeedback = () => setFeedback(null);

  const showSuccess = (message: string) => setFeedback({ type: 'success', message });
  const showError = (message: string) => setFeedback({ type: 'error', message });

  const resetFieldFormState = () => {
    setFieldForm(createEmptyFieldForm());
    setEditingFieldId(null);
  };

  const resetTemplateFormState = () => {
    setTemplateForm(createEmptyTemplateForm());
    setEditingTemplateId(null);
  };

  const resetCheckFormState = () => {
    setCheckForm(createEmptyCheckForm());
    setEditingCheckId(null);
    setRuleDraftVisible(false);
  };

  const resetRuleDraft = () => {
    setCheckForm((prev) => ({
      ...prev,
      ruleDraft: createEmptyRuleDraft(),
    }));
  };

  const resetTopicFormState = () => {
    setTopicForm(createEmptyTopicForm());
    setEditingTopicId(null);
    setResponseDraftVisible(false);
    setEditingResponseBlockIndex(null);
    setResponseBlockTitleError(false);
  };

  const loadFields = async () => {
    const data = await fetchJson<FieldRecord[]>('/api/admin/fields', {
      cache: 'no-store',
    });
    const normalized = data.map((field) => ({
      ...field,
      options: field.options
        ? field.options.map((option) =>
            typeof option === 'string'
              ? { label: option, value: option }
              : option
          )
        : undefined,
    }));
    setFields(normalized);
  };

  const loadTemplates = async () => {
    const data = await fetchJson<DocumentTemplateRecord[]>(
      '/api/admin/document-templates',
      { cache: 'no-store' }
    );
    const normalized: DocumentTemplateRecord[] = data.map((template) => ({
      ...template,
      fieldIds: template.fieldIds || [],
      checks: Array.isArray(template.checks)
        ? (template.checks.map((ref) => ({
            checkId: ref.checkId,
            mode: (ref.mode === 'multi_doc' ? 'multi_doc' : 'single_doc') as TemplateCheckMode,
          })) as DocumentTemplateCheckRecord[])
        : ([] as DocumentTemplateCheckRecord[]),
    }));
    setTemplates(normalized);
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

  const checkSeverityOptions: CheckRecord['severity'][] = useMemo(
    () => ['low', 'medium', 'high'],
    []
  );

  const fieldsByKey = useMemo(() => {
    const map = new Map<string, FieldRecord>();
    fields.forEach((field) => {
      map.set(field.key, field);
    });
    return map;
  }, [fields]);


  const operatorRequiresValue = (operator: CheckRuleRecord['operator']) =>
    !OPERATORS_WITHOUT_VALUE.includes(operator);

  const formatRuleValueForInput = (rule: CheckRuleRecord) => {
    if (!operatorRequiresValue(rule.operator)) {
      return '';
    }
    const rawValue = rule.value;
    if (rawValue === undefined || rawValue === null) {
      return '';
    }
    if (typeof rawValue === 'boolean') {
      return rawValue ? 'true' : 'false';
    }
    if (typeof rawValue === 'number') {
      return Number.isFinite(rawValue) ? String(rawValue) : '';
    }
    if (typeof rawValue === 'string') {
      return rawValue;
    }
    try {
      return JSON.stringify(rawValue);
    } catch (error) {
      console.error('Failed to stringify rule value', error);
      return '';
    }
  };

  const parseRuleValue = (
    value: string,
    fieldType: FieldRecord['type']
  ): unknown => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return '';
    }
    switch (fieldType) {
      case 'number': {
        const parsed = Number(trimmed.replace(',', '.'));
        if (Number.isNaN(parsed)) {
          throw new Error('Значення має бути числом');
        }
        return parsed;
      }
      case 'boolean': {
        if (trimmed === 'true') {
          return true;
        }
        if (trimmed === 'false') {
          return false;
        }
        throw new Error('Для булевого поля оберіть "Так" або "Ні"');
      }
      default:
        return trimmed;
    }
  };

  const generateRuleId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const formatRuleValueForDisplay = (
    value: unknown,
    field?: FieldRecord
  ) => {
    if (value === undefined || value === null || value === '') {
      return '—';
    }
    if (field?.type === 'boolean') {
      if (value === true || value === 'true') {
        return 'Так';
      }
      if (value === false || value === 'false') {
        return 'Ні';
      }
    }
    if (field?.type === 'enum' && field.options) {
      const match = field.options.find(
        (option) => option.value === value || option.label === value
      );
      if (match) {
        return match.label;
      }
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Так' : 'Ні';
    }
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('Failed to stringify rule value for display', error);
      return '—';
    }
  };

  // Validators removed

  const handleFieldSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    const isEditing = Boolean(editingFieldId);

    if (!fieldForm.label.trim()) {
      showError('Вкажіть назву поля');
      return;
    }

    const existingKeys = new Set(fields.map((field) => field.key));
    if (isEditing && editingFieldId) {
      const current = fields.find((field) => field.id === editingFieldId);
      if (current) {
        existingKeys.delete(current.key);
      }
    }

    if (!fieldForm.key) {
      showError('Не вдалося згенерувати ключ поля');
      return;
    }

    if (existingKeys.has(fieldForm.key)) {
      showError('Поле з таким ключем вже існує. Змініть назву.');
      return;
    }

    let optionsPayload: FieldOptionRecord[] | undefined;
    if (fieldForm.type === 'enum') {
      const prepared = fieldForm.options
        .map((option) => ({
          label: option.label.trim(),
          value: option.value,
          isEditable: option.isEditable,
        }))
        .filter((option) => option.label.length > 0);

      if (prepared.length === 0) {
        showError('Додайте принаймні один варіант для списку значень');
        return;
      }

      const valueSet = new Set<string>();
      for (const option of prepared) {
        if (!option.value) {
          showError('Не вдалося згенерувати ідентифікатор для варіанту');
          return;
        }
        if (valueSet.has(option.value)) {
          showError('Варіанти списку мають бути унікальними');
          return;
        }
        valueSet.add(option.value);
      }

      optionsPayload = prepared.map(({ label, value }) => ({ label, value }));
    }

    const payload = {
      key: fieldForm.key.trim(),
      label: fieldForm.label.trim(),
      type: fieldForm.type,
      options: optionsPayload,
      extractHint: fieldForm.extractHint.trim() || undefined,
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
      resetFieldFormState();
      setFieldFormVisible(false);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setFieldSubmitting(false);
    }
  };

  const handleFieldEdit = (field: FieldRecord) => {
    clearFeedback();
    setEditingFieldId(field.id);
    setFieldFormVisible(true);
    setFieldForm({
      key: field.key,
      label: field.label,
      type: field.type,
      options: (field.options || []).map((option) => ({
        id: `${field.id}-${typeof option === 'string' ? option : option.value}`,
        label: typeof option === 'string' ? option : option.label,
        value: typeof option === 'string' ? option : option.value,
        isEditable: false,
      })),
      extractHint: field.extractHint || '',
    });
  };

  const handleFieldDelete = async (id: string) => {
    const field = fields.find((item) => item.id === id);
    const fieldName = field?.label || field?.key || 'це поле';
    const confirmed = window.confirm(
      `Ви впевнені, що хочете видалити поле «${fieldName}»?`
    );
    if (!confirmed) {
      return;
    }
    clearFeedback();
    try {
      await fetchJson(`/api/admin/fields/${id}`, { method: 'DELETE' });
      showSuccess('Поле видалено');
      await loadFields();
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const addFieldOption = () => {
    setFieldForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: generateRuleId(),
          label: '',
          value: '',
          isEditable: true,
        },
      ],
    }));
  };

  const updateFieldOption = (index: number, value: string) => {
    const trimmed = value;
    setFieldForm((prev) => ({
      ...prev,
      options: prev.options.map((option, idx) => {
        if (idx !== index) {
          return option;
        }
        if (!option.isEditable) {
          return option;
        }

        const baseSlug = slugify(trimmed);
        const existingValues = new Set(
          prev.options
            .filter((_, optionIdx) => optionIdx !== index)
            .map((opt) => opt.value)
        );
        const uniqueSlug = baseSlug ? makeUniqueSlug(baseSlug, existingValues) : '';

        return {
          ...option,
          label: trimmed,
          value: uniqueSlug,
        };
      }),
    }));
  };

  const removeFieldOption = (index: number) => {
    setFieldForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== index),
    }));
  };

  // Validators removed

  // Validators removed

  // Validators removed

  // Validators removed

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

  const addTemplateCheck = () => {
    const { checkId } = templateForm.checkDraft;
    if (!checkId) {
      showError('Оберіть перевірку, щоб додати її до шаблону');
      return;
    }
    if (templateForm.checks.some((ref) => ref.checkId === checkId)) {
      showError('Ця перевірка вже додана до шаблону');
      setTemplateForm((prev) => ({
        ...prev,
        checkDraft: { checkId: '', mode: 'single_doc' },
      }));
      return;
    }
    setTemplateForm((prev) => ({
      ...prev,
      checks: [
        ...prev.checks,
        { checkId: prev.checkDraft.checkId, mode: prev.checkDraft.mode },
      ],
      checkDraft: { checkId: '', mode: 'single_doc' },
    }));
  };

  const updateTemplateCheckMode = (index: number, mode: TemplateCheckMode) => {
    setTemplateForm((prev) => ({
      ...prev,
      checks: prev.checks.map((ref, idx) =>
        idx === index
          ? {
              ...ref,
              mode,
            }
          : ref
      ),
    }));
  };

  const removeTemplateCheck = (index: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      checks: prev.checks.filter((_, idx) => idx !== index),
    }));
  };

  const handleTemplateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    const payload = {
      name: templateForm.name.trim(),
      fieldIds: Array.from(new Set(templateForm.fieldIds)),
      checks: templateForm.checks.map((ref) => ({
        checkId: ref.checkId,
        mode: ref.mode,
      })),
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
      resetTemplateFormState();
      setTemplateFormVisible(false);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const handleTemplateEdit = (template: DocumentTemplateRecord) => {
    clearFeedback();
    setEditingTemplateId(template.id);
    setTemplateFormVisible(true);
    setTemplateForm({
      name: template.name,
      fieldIds: template.fieldIds || [],
      checks: (template.checks || []).map((ref) => ({ ...ref })),
      checkDraft: { checkId: '', mode: 'single_doc' },
    });
  };

  const handleTemplateDelete = async (id: string) => {
    const template = templates.find((item) => item.id === id);
    const templateName = template?.name || 'цей шаблон';
    const confirmed = window.confirm(
      `Ви впевнені, що хочете видалити шаблон «${templateName}»?`
    );
    if (!confirmed) {
      return;
    }
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

    if (checkForm.rules.length === 0) {
      showError('Додайте принаймні одне правило');
      return;
    }

    const rules = [] as CheckRuleRecord[];

    for (let index = 0; index < checkForm.rules.length; index += 1) {
      const rule = checkForm.rules[index];
      if (!rule.fieldKey) {
        showError(`Правило ${index + 1}: оберіть поле для перевірки`);
        return;
      }

      const field = fieldsByKey.get(rule.fieldKey);
      if (!field) {
        showError(`Правило ${index + 1}: поле не знайдено — оновіть сторінку`);
        return;
      }

      const requiresValue = operatorRequiresValue(rule.operator);
      let value: unknown;
      if (requiresValue) {
        if (!rule.value.trim()) {
          showError(`Правило ${index + 1}: вкажіть значення для порівняння`);
          return;
        }
        try {
          value = parseRuleValue(rule.value, field.type);
        } catch (error) {
          showError(`Правило ${index + 1}: ${(error as Error).message}`);
          return;
        }
      }

      const message = rule.message.trim();
      if (!message) {
        showError(`Правило ${index + 1}: додайте текст дії при помилці`);
        return;
      }

      rules.push({
        target: {
          fieldKey: rule.fieldKey,
        },
        operator: rule.operator,
        value: requiresValue ? value : undefined,
        message,
      });
    }

    const payload = {
      description: checkForm.description.trim(),
      whenExpr: checkForm.whenExpr.trim() || undefined,
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
      resetCheckFormState();
      setCheckFormVisible(false);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setCheckSubmitting(false);
    }
  };

  const handleCheckEdit = (check: CheckRecord) => {
    clearFeedback();
    setEditingCheckId(check.id);
    setCheckFormVisible(true);
    setRuleDraftVisible(false);
    setCheckForm({
      description: check.description,
      whenExpr: check.whenExpr || '',
      severity: check.severity,
      onFail: check.onFail || '',
      rules: (check.rules || []).map((rule) => ({
        id: generateRuleId(),
        fieldKey: rule.target?.fieldKey || '',
        operator: rule.operator,
        value: formatRuleValueForInput(rule),
        message: rule.message || '',
      })),
      ruleDraft: createEmptyRuleDraft(),
    });
  };

  const handleCheckDelete = async (id: string) => {
    const check = checks.find((item) => item.id === id);
    const checkName = check?.description || 'цю перевірку';
    const confirmed = window.confirm(
      `Ви впевнені, що хочете видалити перевірку «${checkName}»?`
    );
    if (!confirmed) {
      return;
    }
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
      tags: Array.from(new Set(topicForm.tags.map((tag) => tag.trim()).filter(Boolean))),
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
      resetTopicFormState();
      setTopicFormVisible(false);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleTopicEdit = (topic: TopicRecord) => {
    clearFeedback();
    setEditingTopicId(topic.id);
    setTopicFormVisible(true);
    setResponseDraftVisible(false);
    setEditingResponseBlockIndex(null);
    setResponseBlockTitleError(false);
    setTopicForm({
      title: topic.title,
      tags: [...(topic.tags || [])],
      tagInput: '',
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
      responseBlockDraft: createEmptyResponseBlockDraft(),
    });
  };

  const handleTopicDelete = async (id: string) => {
    const topic = topics.find((item) => item.id === id);
    const topicTitle = topic?.title || 'цю тему';
    const confirmed = window.confirm(
      `Ви впевнені, що хочете видалити тему «${topicTitle}»?`
    );
    if (!confirmed) {
      return;
    }
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
    setFaqDraftVisible(false);
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
    if (!topicForm.documentDraft.templateId) {
      showError('Оберіть шаблон документа');
      return;
    }
    setTopicForm((prev) => ({
      ...prev,
      documents: [...prev.documents, { ...prev.documentDraft, alias: prev.documentDraft.alias.trim() }],
      documentDraft: { templateId: '', alias: '', required: true },
    }));
    setDocumentDraftVisible(false);
  };

  const removeDocumentEntry = (index: number) => {
    clearFeedback();
    setTopicForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== index),
    }));
  };

  const addCheckRule = () => {
    clearFeedback();

    const draft = checkForm.ruleDraft;
    if (!draft.fieldKey) {
      showError('Оберіть поле, яке потрібно перевірити');
      return;
    }

    const field = fieldsByKey.get(draft.fieldKey);
    if (!field) {
      showError('Поле не знайдено — можливо, його видалили. Оновіть сторінку.');
      return;
    }

    const requiresValue = operatorRequiresValue(draft.operator);
    if (requiresValue) {
      if (!draft.value.trim()) {
        showError('Вкажіть значення для правила');
        return;
      }
      try {
        parseRuleValue(draft.value, field.type);
      } catch (error) {
        showError((error as Error).message);
        return;
      }
    }

    if (!draft.message.trim()) {
      showError('Опишіть, що робити при невдалому результаті перевірки');
      return;
    }

    setCheckForm((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          id: generateRuleId(),
          fieldKey: prev.ruleDraft.fieldKey,
          operator: prev.ruleDraft.operator,
          value: requiresValue ? prev.ruleDraft.value.trim() : '',
          message: prev.ruleDraft.message.trim(),
        },
      ],
      ruleDraft: createEmptyRuleDraft(),
    }));
    setRuleDraftVisible(false);
  };

  const removeCheckRule = (index: number) => {
    clearFeedback();
    setCheckForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, idx) => idx !== index),
    }));
  };

  const editCheckRule = (index: number) => {
    clearFeedback();
    setRuleDraftVisible(true);
    setCheckForm((prev) => {
      const rule = prev.rules[index];
      if (!rule) {
        return prev;
      }

      const remaining = prev.rules.filter((_, idx) => idx !== index);

      return {
        ...prev,
        rules: remaining,
        ruleDraft: {
          fieldKey: rule.fieldKey,
          operator: rule.operator,
          value: rule.value,
          message: rule.message,
        },
      };
    });
  };

  const addResponseBlock = () => {
    clearFeedback();
    setResponseBlockTitleError(false);
    const { title, itemsText, description, kind } = topicForm.responseBlockDraft;
    if (!title.trim()) {
      setResponseBlockTitleError(true);
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

    const payload: TopicResponseBlock = {
      kind,
      title: title.trim(),
      description: description.trim() || undefined,
      items,
    };

    setTopicForm((prev) => {
      const nextBlocks = [...prev.responses.textBlocks];
      if (
        editingResponseBlockIndex !== null &&
        editingResponseBlockIndex >= 0 &&
        editingResponseBlockIndex < nextBlocks.length
      ) {
        nextBlocks.splice(editingResponseBlockIndex, 1, payload);
      } else {
        nextBlocks.push(payload);
      }

      return {
        ...prev,
        responses: {
          textBlocks: nextBlocks,
        },
        responseBlockDraft: createEmptyResponseBlockDraft(),
      };
    });
    setEditingResponseBlockIndex(null);
    setResponseBlockTitleError(false);
  };

  const removeResponseBlock = (index: number) => {
    clearFeedback();
    setTopicForm((prev) => ({
      ...prev,
      responses: {
        textBlocks: prev.responses.textBlocks.filter((_, idx) => idx !== index),
      },
      responseBlockDraft:
        editingResponseBlockIndex === index
          ? createEmptyResponseBlockDraft()
          : prev.responseBlockDraft,
    }));

    if (editingResponseBlockIndex !== null) {
      if (editingResponseBlockIndex === index) {
        setEditingResponseBlockIndex(null);
        setResponseDraftVisible(false);
        setResponseBlockTitleError(false);
      } else if (editingResponseBlockIndex > index) {
        setEditingResponseBlockIndex(editingResponseBlockIndex - 1);
      }
    }
  };

  const editResponseBlock = (index: number) => {
    clearFeedback();
    setResponseDraftVisible(true);
    setEditingResponseBlockIndex(index);
    setResponseBlockTitleError(false);
    setTopicForm((prev) => {
      const block = prev.responses.textBlocks[index];
      if (!block) {
        return prev;
      }
      return {
        ...prev,
        responseBlockDraft: {
          kind: block.kind,
          title: block.title,
          description: block.description ?? '',
          itemsText: Array.isArray(block.items) ? block.items.join('\n') : '',
        },
      };
    });
  };

  const toggleResponseDraftForm = () => {
    if (responseDraftVisible) {
      setResponseDraftVisible(false);
      setEditingResponseBlockIndex(null);
      setResponseBlockTitleError(false);
      setTopicForm((prev) => ({
        ...prev,
        responseBlockDraft: createEmptyResponseBlockDraft(),
      }));
    } else {
      setResponseDraftVisible(true);
    }
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
      showSuccess(result?.message || 'Перебудову запущено');
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

  const ruleBuilderFields = fields;

  const ruleBuilderSelectedField = fieldsByKey.get(
    checkForm.ruleDraft.fieldKey
  );

  const ruleBuilderRequiresValue = operatorRequiresValue(
    checkForm.ruleDraft.operator
  );

  const ruleBuilderFieldOptions =
    ruleBuilderSelectedField?.options ?? [];

  const commitTagInput = () => {
    setTopicForm((prev) => {
      const next = prev.tagInput.trim();
      if (!next) {
        return { ...prev, tagInput: '' };
      }
      const exists = new Set(prev.tags.map((t) => t.toLowerCase()))
        .has(next.toLowerCase());
      if (exists) {
        return { ...prev, tagInput: '' };
      }
      return {
        ...prev,
        tags: [...prev.tags, next],
        tagInput: '',
      };
    });
  };

  const removeTag = (index: number) => {
    setTopicForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, idx) => idx !== index),
    }));
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
          {reindexing ? 'Запуск…' : 'Перебудувати базу знань'}
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
            onClick={() => handleTabChange(tab.id)}
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
          <h2 className="text-xl font-semibold">Поля</h2>
          <div className="flex gap-2">
            {fieldFormVisible ? (
              <button
                type="button"
                onClick={() => {
                  resetFieldFormState();
                  setFieldFormVisible(false);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {editingFieldId ? 'Скасувати редагування' : 'Приховати форму'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetFieldFormState();
                  setFieldFormVisible(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Створити поле
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Ключ</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Назва</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Тип</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Підказка</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((field) => (
                <tr key={field.id}>
                  <td className="px-3 py-2 font-mono text-xs">{field.key}</td>
                  <td className="px-3 py-2">{field.label}</td>
                  <td className="px-3 py-2">{FIELD_TYPE_LABELS[field.type]}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-[320px] truncate" title={field.extractHint || ''}>
                    {field.extractHint ? field.extractHint : '—'}
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

        {fieldFormVisible && (
          <form onSubmit={handleFieldSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Назва поля</label>
            <input
              required
              value={fieldForm.label}
              onChange={(event) => {
                const nextLabel = event.target.value;
                setFieldForm((prev) => {
                  const nextState = { ...prev, label: nextLabel };
                  if (!editingFieldId) {
                    const baseSlug = slugify(nextLabel);
                    const existingKeys = new Set(fields.map((field) => field.key));
                    const uniqueSlug = baseSlug
                      ? makeUniqueSlug(baseSlug, existingKeys)
                      : '';
                    nextState.key = uniqueSlug;
                  }
                  return nextState;
                });
              }}
              disabled={Boolean(editingFieldId)}
              className="w-full rounded-md border px-3 py-2 text-sm disabled:bg-gray-100"
              placeholder="Наприклад: Номер паспорта"
            />
            {!editingFieldId && (
              <p className="text-[11px] text-muted-foreground">
                Системний ключ зʼявиться автоматично після збереження.
              </p>
            )}
            {editingFieldId && (
              <p className="text-[11px] text-muted-foreground">
                Змінити назву можна лише створивши нове поле.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Тип</label>
            <select
              value={fieldForm.type}
              onChange={(event) =>
                setFieldForm((prev) => {
                  const nextType = event.target.value as FieldRecord['type'];
                  return {
                    ...prev,
                    type: nextType,
                    options: nextType === 'enum' ? prev.options : [],
                  };
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {fieldTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {FIELD_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Підказка для моделі (необовʼязково)</label>
            <input
              value={fieldForm.extractHint}
              onChange={(event) =>
                setFieldForm((prev) => ({
                  ...prev,
                  extractHint: event.target.value,
                }))
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Наприклад: Вкажіть ПІБ з документу"
            />
          </div>
          {fieldForm.type === 'enum' && (
            <div className="space-y-1 md:col-span-1">
              <label className="text-sm font-medium">Варіанти списку</label>
              <p className="text-[11px] text-muted-foreground">
                Значення для збереження створюються автоматично з назви варіанту.
              </p>
              <div className="space-y-2">
                {fieldForm.options.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Додайте варіанти, якщо поле має фіксований перелік значень.
                  </p>
                ) : (
                  fieldForm.options.map((option, index) => (
                    <div key={option.id} className="space-y-1 rounded-md border px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          {option.isEditable ? (
                            <input
                              value={option.label}
                              onChange={(event) =>
                                updateFieldOption(index, event.target.value)
                              }
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              placeholder={`Варіант ${index + 1}`}
                            />
                          ) : (
                            <p className="text-sm font-medium">{option.label}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFieldOption(index)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Видалити
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={addFieldOption}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Додати опцію
                </button>
              </div>
            </div>
          )}
          {/* Validators section removed */}
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
        )}
      </section>

      <section
        className={`space-y-4 rounded-lg border bg-white p-6 shadow-sm ${
          activeTab === 'documentTemplates' ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Шаблони документів</h2>
          <div className="flex gap-2">
            {templateFormVisible ? (
              <button
                type="button"
                onClick={() => {
                  resetTemplateFormState();
                  setTemplateFormVisible(false);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {editingTemplateId ? 'Скасувати редагування' : 'Приховати форму'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetTemplateFormState();
                  setTemplateFormVisible(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Створити шаблон
              </button>
            )}
          </div>
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
                      Поля: {template.fieldIds.length} · Перевірки: {template.checks?.length || 0}
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

        {templateFormVisible && (
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
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Перевірки</p>
            <p className="text-xs text-muted-foreground">
              Додайте перевірку та оберіть, чи вона працює з одним документом, чи з кількома.
            </p>
          </div>
          {checks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Створіть перевірки на вкладці «Перевірки», щоб додати їх до шаблону.
            </p>
          ) : (
            <div className="space-y-2">
              {templateForm.checks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Перевірки ще не додані.
                </p>
              ) : (
                templateForm.checks.map((ref, index) => {
                  const checkInfo = checks.find((item) => item.id === ref.checkId);
                  return (
                    <div
                      key={`${ref.checkId}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-3 text-xs"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {checkInfo?.description || 'Перевірка видалена'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Режим: {TEMPLATE_CHECK_MODE_LABELS[ref.mode]}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Важливість: {CHECK_SEVERITY_LABELS[checkInfo?.severity || 'medium']}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={ref.mode}
                          onChange={(event) =>
                            updateTemplateCheckMode(
                              index,
                              event.target.value as TemplateCheckMode
                            )
                          }
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          <option value="single_doc">Один документ</option>
                          <option value="multi_doc">Кілька документів</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeTemplateCheck(index)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Видалити
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_auto]">
                <select
                  value={templateForm.checkDraft.checkId}
                  onChange={(event) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      checkDraft: {
                        ...prev.checkDraft,
                        checkId: event.target.value,
                      },
                    }))
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Оберіть перевірку</option>
                  {checks.map((check) => (
                    <option
                      key={check.id}
                      value={check.id}
                      disabled={templateForm.checks.some((ref) => ref.checkId === check.id)}
                    >
                      {check.description}
                    </option>
                  ))}
                </select>
                <select
                  value={templateForm.checkDraft.mode}
                  onChange={(event) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      checkDraft: {
                        ...prev.checkDraft,
                        mode: event.target.value as TemplateCheckMode,
                      },
                    }))
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <option value="single_doc">Один документ</option>
                  <option value="multi_doc">Кілька документів</option>
                </select>
                <button
                  type="button"
                  onClick={addTemplateCheck}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-600 px-3 py-2 text-sm text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!templateForm.checkDraft.checkId}
                >
                  <span className="text-lg leading-none">＋</span>
                  Додати
                </button>
              </div>
            </div>
          )}
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
        )}
     </section>

      <section
        className={`space-y-4 rounded-lg border bg-white p-6 shadow-sm ${
          activeTab === 'checks' ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Перевірки</h2>
          <div className="flex gap-2">
            {checkFormVisible ? (
              <button
                type="button"
                onClick={() => {
                  resetCheckFormState();
                  setCheckFormVisible(false);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {editingCheckId ? 'Скасувати редагування' : 'Приховати форму'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetCheckFormState();
                  setCheckFormVisible(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Створити перевірку
              </button>
            )}
          </div>
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
                      Важливість: {CHECK_SEVERITY_LABELS[check.severity]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Використовується в:{' '}
                      {templates
                        .filter((template) =>
                          template.checks?.some(
                            (ref) => ref.checkId === check.id
                          )
                        )
                        .map((template) => template.name)
                        .join(', ') || 'жодному шаблоні'}
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

        {checkFormVisible && (
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
            <label className="text-sm font-medium">Критичність</label>
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
                  {CHECK_SEVERITY_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">
              Коментар / умова для колег (необов’язково)
            </label>
            <textarea
              value={checkForm.whenExpr}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  whenExpr: event.target.value,
                }))
              }
              className="h-24 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Наприклад: застосовуємо лише якщо сторони у шлюбі"
            />
            <p className="text-xs text-muted-foreground">
              Текст для команди. Логіка виконується за правилами нижче.
            </p>
          </div>
          <div className="space-y-3 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Правила перевірки</h3>
                <p className="text-[11px] text-muted-foreground">
                  Правила виконуються послідовно зверху вниз.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {checkForm.rules.length} шт.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRuleDraftVisible((prev) => !prev);
                    resetRuleDraft();
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-600 px-3 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                >
                  <span className="text-lg leading-none">＋</span>
                  <span className="hidden sm:inline">Додати правило</span>
                </button>
              </div>
            </div>
            {checkForm.rules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Поки що правил немає. Натисніть «＋», щоб додати перше правило.
              </p>
            ) : (
              <div className="space-y-2">
                {checkForm.rules.map((rule, index) => {
                  const fieldInfo = fieldsByKey.get(rule.fieldKey);
                  const fieldLabel = fieldInfo?.label || rule.fieldKey;
                  const operatorLabel =
                    CHECK_RULE_OPERATORS.find((op) => op.value === rule.operator)?.label ||
                    rule.operator;
                  const requiresValue = operatorRequiresValue(rule.operator);
                  const messageText = rule.message || '—';

                  return (
                    <div
                      key={rule.id}
                      className="rounded-md border px-3 py-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold">{fieldLabel}</p>
                          <p className="text-muted-foreground">
                            {operatorLabel}
                            {requiresValue
                              ? ` → ${formatRuleValueForDisplay(rule.value, fieldInfo)}`
                              : ''}
                          </p>
                          <p>Дія: {messageText}</p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => editCheckRule(index)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Редагувати
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCheckRule(index)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Видалити
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {ruleDraftVisible && (
              <div className="space-y-3 rounded-md border px-3 py-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Поле</label>
                    <select
                      value={checkForm.ruleDraft.fieldKey}
                      onChange={(event) =>
                        setCheckForm((prev) => {
                          const nextFieldKey = event.target.value;
                          const nextField = fieldsByKey.get(nextFieldKey);
                          const prevField = fieldsByKey.get(prev.ruleDraft.fieldKey);
                          const resetValue =
                            (prevField?.type || '') !== (nextField?.type || '')
                              ? ''
                              : prev.ruleDraft.value;
                          return {
                            ...prev,
                            ruleDraft: {
                              ...prev.ruleDraft,
                              fieldKey: nextFieldKey,
                              value: resetValue,
                            },
                          };
                        })
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">Оберіть поле</option>
                      {ruleBuilderFields.map((field) => (
                        <option key={field.id ?? field.key} value={field.key}>
                          {field.label} ({field.key})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Оператор</label>
                    <select
                      value={checkForm.ruleDraft.operator}
                      onChange={(event) =>
                        setCheckForm((prev) => {
                          const nextOperator = event.target.value as CheckRuleRecord['operator'];
                          const requiresValue = operatorRequiresValue(nextOperator);
                          return {
                            ...prev,
                            ruleDraft: {
                              ...prev.ruleDraft,
                              operator: nextOperator,
                              value: requiresValue ? prev.ruleDraft.value : '',
                            },
                          };
                        })
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      {CHECK_RULE_OPERATORS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {ruleBuilderRequiresValue && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Значення</label>
                      {ruleBuilderSelectedField?.type === 'boolean' ? (
                        <select
                          value={checkForm.ruleDraft.value}
                          onChange={(event) =>
                            setCheckForm((prev) => ({
                              ...prev,
                              ruleDraft: {
                                ...prev.ruleDraft,
                                value: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          disabled={!checkForm.ruleDraft.fieldKey}
                        >
                          <option value="">Оберіть значення</option>
                          <option value="true">Так</option>
                          <option value="false">Ні</option>
                        </select>
                      ) : ruleBuilderSelectedField?.type === 'enum' &&
                        ruleBuilderFieldOptions.length > 0 ? (
                        <select
                          value={checkForm.ruleDraft.value}
                          onChange={(event) =>
                            setCheckForm((prev) => ({
                              ...prev,
                              ruleDraft: {
                                ...prev.ruleDraft,
                                value: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          disabled={!checkForm.ruleDraft.fieldKey}
                        >
                          <option value="">Оберіть значення</option>
                          {ruleBuilderFieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : ruleBuilderSelectedField?.type === 'number' ? (
                        <input
                          type="number"
                          value={checkForm.ruleDraft.value}
                          onChange={(event) =>
                            setCheckForm((prev) => ({
                              ...prev,
                              ruleDraft: {
                                ...prev.ruleDraft,
                                value: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          disabled={!checkForm.ruleDraft.fieldKey}
                        />
                      ) : ruleBuilderSelectedField?.type === 'date' ? (
                        <input
                          type="date"
                          value={checkForm.ruleDraft.value}
                          onChange={(event) =>
                            setCheckForm((prev) => ({
                              ...prev,
                              ruleDraft: {
                                ...prev.ruleDraft,
                                value: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          disabled={!checkForm.ruleDraft.fieldKey}
                        />
                      ) : (
                        <input
                          value={checkForm.ruleDraft.value}
                          onChange={(event) =>
                            setCheckForm((prev) => ({
                              ...prev,
                              ruleDraft: {
                                ...prev.ruleDraft,
                                value: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          placeholder="Очікуване значення"
                          disabled={!checkForm.ruleDraft.fieldKey}
                        />
                      )}
                    </div>
                  )}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium">
                      Що робити, якщо правило спрацює
                    </label>
                    <textarea
                      value={checkForm.ruleDraft.message}
                      onChange={(event) =>
                        setCheckForm((prev) => ({
                          ...prev,
                          ruleDraft: {
                            ...prev.ruleDraft,
                            message: event.target.value,
                          },
                        }))
                      }
                      className="h-20 w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Наприклад: Попросити клієнта оновити довідку"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRuleDraftVisible(false);
                      resetRuleDraft();
                    }}
                    className="rounded-md border px-3 py-2 text-xs text-muted-foreground transition hover:bg-gray-100"
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    onClick={addCheckRule}
                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    Зберегти правило
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">
              Загальний текст при помилці (необов’язково)
            </label>
            <textarea
              value={checkForm.onFail}
              onChange={(event) =>
                setCheckForm((prev) => ({
                  ...prev,
                  onFail: event.target.value,
                }))
              }
              className="h-24 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Що повідомити клієнту, якщо перевірка провалилась"
            />
          </div>
          {editingCheckId && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Використовується в шаблонах</label>
              <p className="text-xs text-muted-foreground">
                {templates
                  .filter((template) =>
                    template.checks?.some((ref) => ref.checkId === editingCheckId)
                  )
                  .map((template) => template.name)
                  .join(', ') || '—'}
              </p>
            </div>
          )}
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
        )}
      </section>

      <section
        className={`space-y-4 rounded-lg border bg-white p-6 shadow-sm ${
          activeTab === 'topics' ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Теми</h2>
          <div className="flex gap-2">
            {topicFormVisible ? (
              <button
                type="button"
                onClick={() => {
                  resetTopicFormState();
                  setTopicFormVisible(false);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {editingTopicId ? 'Скасувати редагування' : 'Приховати форму'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetTopicFormState();
                  setTopicFormVisible(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Створити тему
              </button>
            )}
          </div>
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
                          : 'Оновити тему у Базі знань'}
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

        {topicFormVisible && (
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
              <label className="text-sm font-medium">Теги</label>
              <div className="flex flex-wrap gap-2 rounded-md border px-2 py-2">
                {topicForm.tags.map((tag, index) => (
                  <span key={`${tag}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Видалити тег"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={topicForm.tagInput}
                  onChange={(event) =>
                    setTopicForm((prev) => ({ ...prev, tagInput: event.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault();
                      commitTagInput();
                    }
                  }}
                  onBlur={commitTagInput}
                  className="min-w-[140px] flex-1 rounded-md px-2 py-1 text-sm outline-none"
                  placeholder="Додати тег…"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Натисніть Enter або кому, щоб додати тег</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">FAQ</h3>
                <button
                  type="button"
                  onClick={() => setFaqDraftVisible((v) => !v)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {faqDraftVisible ? 'Приховати форму' : '＋ Додати'}
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
              {faqDraftVisible && (
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
                <div>
                  <button
                    type="button"
                    onClick={addFaqEntry}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Додати до FAQ
                  </button>
                </div>
              </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Документи</h3>
                <button
                  type="button"
                  onClick={() => setDocumentDraftVisible((v) => !v)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {documentDraftVisible ? 'Приховати форму' : '＋ Додати документ'}
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
              {documentDraftVisible && (
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
                          alias: (() => {
                            const selected = templates.find((t) => t.id === event.target.value);
                            const base = selected ? slugify(selected.name) : '';
                            const existing = new Set(prev.documents.map((d) => d.alias));
                            return base ? makeUniqueSlug(base, existing) : prev.documentDraft.alias;
                          })(),
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
                  <label className="text-xs font-medium">Системний alias</label>
                  <div className="rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
                    {topicForm.documentDraft.alias || '—'}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Alias генерується автоматично з назви шаблону</p>
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
                <div>
                  <button
                    type="button"
                    onClick={addDocumentEntry}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Додати документ
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Перевірки</h3>
            {checks.length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                Перевірок ще немає. Спочатку створіть їх на вкладці «Перевірки».{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('checks')}
                  className="text-blue-600 hover:underline"
                >
                  Відкрити «Перевірки»
                </button>
              </div>
            ) : (
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
            )}
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

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={toggleResponseDraftForm}
                className="text-xs text-blue-600 hover:underline"
              >
                {editingResponseBlockIndex !== null
                  ? 'Скасувати редагування'
                  : responseDraftVisible
                  ? 'Приховати форму'
                  : '＋ Додати блок'}
              </button>
            </div>
            {responseDraftVisible && (
            <div className="space-y-2 rounded-md border px-3 py-3">
              <div className="space-y-2">
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
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (responseBlockTitleError && nextValue.trim()) {
                        setResponseBlockTitleError(false);
                      }
                      setTopicForm((prev) => ({
                        ...prev,
                        responseBlockDraft: {
                          ...prev.responseBlockDraft,
                          title: nextValue,
                        },
                      }));
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm ${
                      responseBlockTitleError
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : ''
                    }`}
                    placeholder="Наприклад: Класичні відповіді"
                    aria-invalid={responseBlockTitleError ? 'true' : 'false'}
                    required={responseDraftVisible}
                  />
                  {responseBlockTitleError && (
                    <p className="text-[11px] text-red-600">
                      Додайте заголовок, щоб зберегти блок.
                    </p>
                  )}
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
                {editingResponseBlockIndex !== null ? 'Зберегти блок' : 'Додати блок'}
              </button>
            </div>
            )}
          </div>

          <button
            type="submit"
            disabled={topicSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {topicSubmitting
              ? 'Збереження…'
              : editingTopicId
              ? 'Зберегти тему'
              : 'Створити тему'}
          </button>
          </form>
        )}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  );
}
