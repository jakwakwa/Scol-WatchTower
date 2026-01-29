export type FieldOption = {
	label: string;
	value: string;
};

export type BaseFieldType =
	| "text"
	| "textarea"
	| "email"
	| "tel"
	| "number"
	| "date"
	| "select"
	| "checkbox"
	| "checkbox-group"
	| "signature";

export type FieldDefinition =
	| {
			name: string;
			label: string;
			type: BaseFieldType;
			required?: boolean;
			placeholder?: string;
			description?: string;
			options?: FieldOption[];
			colSpan?: 1 | 2;
	  }
	| {
			name: string;
			label: string;
			type: "repeatable";
			minItems?: number;
			maxItems?: number;
			addLabel?: string;
			fields: Array<Exclude<FieldDefinition, { type: "repeatable" }>>;
	  };

export interface FormSectionDefinition {
	title: string;
	description?: string;
	columns?: 1 | 2;
	fields: FieldDefinition[];
}
