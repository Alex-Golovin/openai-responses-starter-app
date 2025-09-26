'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

type FieldValidatorType =
  | 'regex'
  | 'min_length'
  | 'forbid_patterns'
  | 'date_before';

type FieldValidatorRecord = {
  type: FieldValidatorType;
  value: unknown;
};

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
  validators?: FieldValidatorRecord[];
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
  rules: CheckRuleRecord[];
  severity: 'low' | 'medium' | 'high';
  onFail?: string;
};

type CheckRuleRecord = {
  target: {
    docTemplateId?: string | null;
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
  templateId: string;
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

const CHECK_TYPE_LABELS: Record<CheckRecord['type'], string> = {
  single_doc: 'Один документ',
  cross_doc: 'Порівняння документів',
};

const CHECK_SEVERITY_LABELS: Record<CheckRecord['severity'], string> = {
  low: 'Низька',
  medium: 'Середня',
  high: 'Висока',
};

const FIELD_VALIDATOR_OPTIONS: { value: FieldValidatorType; label: string }[] = [
  { value: 'regex', label: 'Відповідає регулярному виразу' },
  { value: 'min_length', label: 'Мінімальна кількість символів' },
  { value: 'forbid_patterns', label: 'Заборонені фрази/патерни' },
  { value: 'date_before', label: 'Дата має бути до' },
];

type FieldFormState = {
  key: string;
  label: string;
  type: FieldRecord['type'];
  options: FieldOptionForm[];
  extractHint: string;
  validators: FieldValidatorForm[];
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

type FieldValidatorForm = {
  id: string;
  type: FieldValidatorType;
  value: string;
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
  options: [],
  extractHint: '',
  validators: [],
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
  severity: 'medium',
  onFail: '',
  rules: [],
  ruleDraft: createEmptyRuleDraft(),
});

const createEmptyRuleDraft = (templateId = ''): CheckRuleDraft => ({
  templateId,
  fieldKey: '',
  operator: 'equals',
  value: '',
  message: '',
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

  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [topicForm, setTopicForm] = useState<TopicFormState>(() =>
    createEmptyTopicForm()
  );
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicSubmitting, setTopicSubmitting] = useState(false);
  const [topicFormVisible, setTopicFormVisible] = useState(false);

  const [activeTab, setActiveTab] = useState<
    (typeof ADMIN_TABS)[number]['id']
  >('topics');

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
  };

  const resetTopicFormState = () => {
    setTopicForm(createEmptyTopicForm());
    setEditingTopicId(null);
  };

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

  useEffect(() => {
    if (checkForm.type !== 'single_doc') {
      return;
    }

    setCheckForm((prev) => {
      if (prev.type !== 'single_doc') {
        return prev;
      }

      const templateId = prev.docTemplateId;
      let rulesChanged = false;
      const updatedRules = prev.rules.map((rule) => {
        if (rule.templateId === templateId) {
          return rule;
        }
        rulesChanged = true;
        return { ...rule, templateId };
      });

      const draftChanged = prev.ruleDraft.templateId !== templateId;

      if (!rulesChanged && !draftChanged) {
        return prev;
      }

      return {
        ...prev,
        rules: rulesChanged ? updatedRules : prev.rules,
        ruleDraft: draftChanged
          ? { ...prev.ruleDraft, templateId }
          : prev.ruleDraft,
      };
    });
  }, [checkForm.type, checkForm.docTemplateId, setCheckForm]);

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

  const fieldsById = useMemo(() => {
    const map = new Map<string, FieldRecord>();
    fields.forEach((field) => {
      map.set(field.id, field);
    });
    return map;
  }, [fields]);

  const fieldsByKey = useMemo(() => {
    const map = new Map<string, FieldRecord>();
    fields.forEach((field) => {
      map.set(field.key, field);
    });
    return map;
  }, [fields]);

  const templateFieldsMap = useMemo(() => {
    const map = new Map<string, FieldRecord[]>();
    templates.forEach((template) => {
      const templateFields = template.fieldIds
        .map((fieldId) => fieldsById.get(fieldId))
        .filter((field): field is FieldRecord => Boolean(field));
      map.set(template.id, templateFields);
    });
    return map;
  }, [templates, fieldsById]);

  const templateById = useMemo(() => {
    const map = new Map<string, DocumentTemplateRecord>();
    templates.forEach((template) => {
      map.set(template.id, template);
    });
    return map;
  }, [templates]);

  const getFieldsForTemplate = (templateId: string) => {
    if (!templateId) {
      return [];
    }
    return templateFieldsMap.get(templateId) ?? [];
  };

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

  const formatValidatorValueForInput = (
    validator: FieldValidatorRecord
  ): string => {
    if (validator.value === undefined || validator.value === null) {
      return '';
    }
    if (Array.isArray(validator.value)) {
      return validator.value.join('\n');
    }
    if (typeof validator.value === 'number') {
      return String(validator.value);
    }
    return String(validator.value);
  };

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

    const validatorsPayload: FieldValidatorRecord[] = [];
    for (let index = 0; index < fieldForm.validators.length; index += 1) {
      const validator = fieldForm.validators[index];
      const trimmedValue = validator.value.trim();

      if (!trimmedValue) {
        showError(`Вкажіть значення для валідації №${index + 1}`);
        return;
      }

      switch (validator.type) {
        case 'regex':
          validatorsPayload.push({ type: validator.type, value: trimmedValue });
          break;
        case 'min_length': {
          const parsed = Number(trimmedValue);
          if (!Number.isFinite(parsed) || parsed < 0) {
            showError(`Мінімальна довжина у валідації №${index + 1} має бути невід'ємним числом`);
            return;
          }
          validatorsPayload.push({ type: validator.type, value: parsed });
          break;
        }
        case 'forbid_patterns': {
          const patterns = trimmedValue
            .split('\n')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
          if (patterns.length === 0) {
            showError(`Додайте хоча б один заборонений патерн у валідації №${index + 1}`);
            return;
          }
          validatorsPayload.push({ type: validator.type, value: patterns });
          break;
        }
        case 'date_before':
          validatorsPayload.push({ type: validator.type, value: trimmedValue });
          break;
        default:
          showError(`Невідомий тип валідації у правилі №${index + 1}`);
          return;
      }
    }

    const payload = {
      key: fieldForm.key.trim(),
      label: fieldForm.label.trim(),
      type: fieldForm.type,
      options: optionsPayload,
      extractHint: fieldForm.extractHint.trim() || undefined,
      validators: validatorsPayload.length > 0 ? validatorsPayload : undefined,
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
        id: `${field.id}-${option.value}`,
        label: option.label,
        value: option.value,
        isEditable: false,
      })),
      extractHint: field.extractHint || '',
      validators: (field.validators || []).map((validator, index) => ({
        id: `${field.id}-validator-${index}`,
        type: validator.type,
        value: formatValidatorValueForInput(validator),
      })),
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

  const addFieldValidator = () => {
    setFieldForm((prev) => ({
      ...prev,
      validators: [
        ...prev.validators,
        {
          id: generateRuleId(),
          type: 'regex',
          value: '',
        },
      ],
    }));
  };

  const updateFieldValidatorType = (index: number, type: FieldValidatorType) => {
    setFieldForm((prev) => ({
      ...prev,
      validators: prev.validators.map((validator, idx) =>
        idx === index
          ? {
              ...validator,
              type,
              value: '',
            }
          : validator
      ),
    }));
  };

  const updateFieldValidatorValue = (index: number, value: string) => {
    setFieldForm((prev) => ({
      ...prev,
      validators: prev.validators.map((validator, idx) =>
        idx === index
          ? {
              ...validator,
              value,
            }
          : validator
      ),
    }));
  };

  const removeFieldValidator = (index: number) => {
    setFieldForm((prev) => ({
      ...prev,
      validators: prev.validators.filter((_, idx) => idx !== index),
    }));
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

    if (checkForm.type === 'single_doc' && !checkForm.docTemplateId) {
      showError('Оберіть шаблон документа для перевірки');
      return;
    }

    if (checkForm.rules.length === 0) {
      showError('Додайте принаймні одне правило');
      return;
    }

    const rules = [] as CheckRuleRecord[];

    for (let index = 0; index < checkForm.rules.length; index += 1) {
      const rule = checkForm.rules[index];
      const templateIdRaw =
        checkForm.type === 'single_doc' ? checkForm.docTemplateId : rule.templateId;

      const templateId = templateIdRaw?.trim();
      if (!templateId) {
        showError(`Правило ${index + 1}: оберіть шаблон документа`);
        return;
      }

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
          docTemplateId: templateId,
          fieldKey: rule.fieldKey,
        },
        operator: rule.operator,
        value: requiresValue ? value : undefined,
        message,
      });
    }

    const payload = {
      description: checkForm.description.trim(),
      type: checkForm.type,
      whenExpr: checkForm.whenExpr.trim() || undefined,
      docTemplateId:
        checkForm.type === 'single_doc' && checkForm.docTemplateId
          ? checkForm.docTemplateId
          : undefined,
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
    setCheckForm({
      description: check.description,
      type: check.type,
      whenExpr: check.whenExpr || '',
      docTemplateId: check.docTemplateId || '',
      severity: check.severity,
      onFail: check.onFail || '',
      rules: (check.rules || []).map((rule) => ({
        id: generateRuleId(),
        templateId:
          (typeof rule.target?.docTemplateId === 'string'
            ? rule.target.docTemplateId
            : rule.target?.docTemplateId?.toString()) ||
          check.docTemplateId ||
          '',
        fieldKey: rule.target?.fieldKey || '',
        operator: rule.operator,
        value: formatRuleValueForInput(rule),
        message: rule.message || '',
      })),
      ruleDraft: createEmptyRuleDraft(
        check.type === 'single_doc' ? check.docTemplateId || '' : ''
      ),
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

  const addCheckRule = () => {
    clearFeedback();

    const draft = checkForm.ruleDraft;
    const effectiveTemplateId =
      checkForm.type === 'single_doc' ? checkForm.docTemplateId : draft.templateId;

    if (checkForm.type === 'single_doc' && !checkForm.docTemplateId) {
      showError('Спочатку оберіть шаблон документа для перевірки');
      return;
    }

    if (!effectiveTemplateId) {
      showError('Оберіть шаблон документа для правила');
      return;
    }

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
          templateId:
            prev.type === 'single_doc' ? prev.docTemplateId : prev.ruleDraft.templateId,
          fieldKey: prev.ruleDraft.fieldKey,
          operator: prev.ruleDraft.operator,
          value: requiresValue ? prev.ruleDraft.value.trim() : '',
          message: prev.ruleDraft.message.trim(),
        },
      ],
      ruleDraft: createEmptyRuleDraft(
        prev.type === 'single_doc' ? prev.docTemplateId : ''
      ),
    }));
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
          templateId:
            prev.type === 'single_doc' ? prev.docTemplateId : rule.templateId,
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

  const ruleBuilderTemplateId =
    checkForm.type === 'single_doc'
      ? checkForm.docTemplateId
      : checkForm.ruleDraft.templateId;

  const ruleBuilderFields = ruleBuilderTemplateId
    ? getFieldsForTemplate(ruleBuilderTemplateId)
    : [];

  const ruleBuilderSelectedField = fieldsByKey.get(
    checkForm.ruleDraft.fieldKey
  );

  const ruleBuilderRequiresValue = operatorRequiresValue(
    checkForm.ruleDraft.operator
  );

  const ruleBuilderFieldOptions =
    ruleBuilderSelectedField?.options ?? [];

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
                <th className="px-3 py-2 text-left font-medium text-gray-700">Валідації</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((field) => (
                <tr key={field.id}>
                  <td className="px-3 py-2 font-mono text-xs">{field.key}</td>
                  <td className="px-3 py-2">{field.label}</td>
                  <td className="px-3 py-2">{FIELD_TYPE_LABELS[field.type]}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {field.validators && field.validators.length > 0
                      ? `${field.validators.length} правил`
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
            {editingFieldId && (
              <p className="text-[11px] text-muted-foreground">
                Змінити назву можна лише створивши нове поле.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Системний ключ</label>
            <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono text-gray-600">
              {fieldForm.key || '—'}
            </div>
            {!editingFieldId && (
              <p className="text-[11px] text-muted-foreground">
                Генерується автоматично за назвою поля.
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
                          <p className="text-[11px] text-muted-foreground">
                            Системний ключ:{' '}
                            <span className="font-mono">{option.value || '—'}</span>
                          </p>
                          {!option.isEditable && (
                            <p className="text-[11px] text-muted-foreground">
                              Щоб змінити назву, видаліть варіант та створіть новий.
                            </p>
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
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Валідації</label>
              <button
                type="button"
                onClick={addFieldValidator}
                className="text-xs text-blue-600 hover:underline"
              >
                Додати правило
              </button>
            </div>
            {fieldForm.validators.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Додайте правила валідації, якщо потрібно обмежити значення поля.
              </p>
            ) : (
              <div className="space-y-2">
                {fieldForm.validators.map((validator, index) => (
                  <div
                    key={validator.id}
                    className="space-y-2 rounded-md border px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Тип</label>
                            <select
                              value={validator.type}
                              onChange={(event) =>
                                updateFieldValidatorType(
                                  index,
                                  event.target.value as FieldValidatorType
                                )
                              }
                              className="w-full rounded-md border px-3 py-2 text-sm"
                            >
                              {FIELD_VALIDATOR_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Значення</label>
                            {validator.type === 'min_length' ? (
                              <input
                                type="number"
                                min={0}
                                value={validator.value}
                                onChange={(event) =>
                                  updateFieldValidatorValue(index, event.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="Наприклад, 3"
                              />
                            ) : validator.type === 'forbid_patterns' ? (
                              <textarea
                                value={validator.value}
                                onChange={(event) =>
                                  updateFieldValidatorValue(index, event.target.value)
                                }
                                className="h-24 w-full rounded-md border px-3 py-2 text-sm"
                                placeholder={'Фраза 1\nФраза 2'}
                              />
                            ) : validator.type === 'date_before' ? (
                              <input
                                type="date"
                                value={validator.value}
                                onChange={(event) =>
                                  updateFieldValidatorValue(index, event.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2 text-sm"
                              />
                            ) : (
                              <input
                                value={validator.value}
                                onChange={(event) =>
                                  updateFieldValidatorValue(index, event.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="Наприклад, ^[A-Z0-9]+$"
                              />
                            )}
                          </div>
                        </div>
                        {validator.type === 'regex' && (
                          <p className="text-[11px] text-muted-foreground">
                            Використовуйте синтаксис JavaScript RegExp.
                          </p>
                        )}
                        {validator.type === 'forbid_patterns' && (
                          <p className="text-[11px] text-muted-foreground">
                            Кожен рядок буде розцінений як окремий заборонений патерн.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFieldValidator(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                      {CHECK_TYPE_LABELS[check.type]} · {CHECK_SEVERITY_LABELS[check.severity]}
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
            <label className="text-sm font-medium">Тип</label>
            <select
              value={checkForm.type}
              onChange={(event) =>
                setCheckForm((prev) => {
                  const nextType = event.target.value as CheckRecord['type'];
                  if (prev.type === nextType) {
                    return prev;
                  }
                  if (nextType === 'single_doc') {
                    return {
                      ...prev,
                      type: nextType,
                      docTemplateId: '',
                      ruleDraft: createEmptyRuleDraft(''),
                    };
                  }
                  return {
                    ...prev,
                    type: nextType,
                    docTemplateId: '',
                    ruleDraft: createEmptyRuleDraft(''),
                  };
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {checkTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {CHECK_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
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
          {checkForm.type === 'single_doc' ? (
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Шаблон документа</label>
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
                <option value="">Оберіть шаблон</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Перевірка застосовується до цього документа.
              </p>
            </div>
          ) : (
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Перевірка між документами</label>
              <p className="text-xs text-muted-foreground">
                Для кожного правила нижче оберіть відповідний шаблон.
              </p>
            </div>
          )}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Правила перевірки</h3>
              <span className="text-xs text-muted-foreground">
                {checkForm.rules.length} шт.
              </span>
            </div>
            {checkForm.rules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Поки що правил немає. Додайте перше нижче.
              </p>
            ) : (
              <div className="space-y-2">
                {checkForm.rules.map((rule, index) => {
                  const templateName = rule.templateId
                    ? templateById.get(rule.templateId)?.name || 'Документ'
                    : 'Будь-який документ';
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
                            {templateName} · {operatorLabel}
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
            <div className="space-y-3 rounded-md border px-3 py-3">
              <div className="grid gap-2 md:grid-cols-2">
                {checkForm.type === 'cross_doc' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Шаблон документа</label>
                    <select
                      value={checkForm.ruleDraft.templateId}
                      onChange={(event) =>
                        setCheckForm((prev) => ({
                          ...prev,
                          ruleDraft: {
                            ...prev.ruleDraft,
                            templateId: event.target.value,
                            fieldKey: '',
                            value: '',
                          },
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">Оберіть шаблон</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                    disabled={!ruleBuilderTemplateId}
                  >
                    <option value="">Оберіть поле</option>
                    {ruleBuilderFields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label} ({field.key})
                      </option>
                    ))}
                  </select>
                  {!ruleBuilderTemplateId && (
                    <p className="text-[11px] text-muted-foreground">
                      Спочатку оберіть шаблон документа.
                    </p>
                  )}
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
              <button
                type="button"
                onClick={addCheckRule}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Додати правило
              </button>
            </div>
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
        )}
      </section>
    </div>
  );
}
