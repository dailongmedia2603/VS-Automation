export type FormFieldConfig = {
  id: string;
  title: string;
  type: 'input' | 'textarea';
  placeholder: string;
};

export type PlanData = { [key: string]: any };

export type PlanStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
};