export class TableSchemaService {
  constructor() {
    this.tableSchemas = {
      company: {
        columns: [
          "id",
          "company_name",
          "company_name_amharic",
          "company_address",
          "company_address_amharic",
          "company_phone",
          "company_email",
          "company_website",
          "company_logo",
          "company_established_date",
          "company_tin_number",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id"],
        relations: {}, // Company has no foreign key relations
      },
      hr_roles: {
        columns: [
          "id",
          "role_name",
          "role_name_amharic",
          "role_code",
          "role_description",
          "role_description_amharic",
          "role_permissions",
          "status",
          "created_at",
        ],
        uuidFields: ["id"],
        relations: {}, // HR roles has no foreign key relations
      },
      college: {
        columns: [
          "id",
          "company_id",
          "college_name",
          "college_name_amharic",
          "college_description",
          "college_description_amharic",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "company_id"],
        relations: {
          company: {
            join: "LEFT JOIN company ON college.company_id = company.id",
            fields: ["company_name", "company_name_amharic", "company_email"],
          },
        },
      },
      department: {
        columns: [
          "id",
          "company_id",
          "college_id",
          "department_name",
          "department_name_amharic",
          "department_description",
          "department_description_amharic",
          "manager_id",
          "department_status",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "company_id", "college_id", "manager_id"],
        relations: {
          company: {
            join: "LEFT JOIN company ON department.company_id = company.id",
            fields: [
              "company_name",
              "company_name_amharic",
              "company_email",
              "company_phone",
            ],
          },
          college: {
            join: "LEFT JOIN college ON department.college_id = college.id",
            fields: ["college_name", "college_name_amharic"],
          },
          manager: {
            join: "LEFT JOIN employee ON department.manager_id = employee.id",
            fields: ["first_name", "last_name", "email", "phone"],
          },
        },
      },
      designations: {
        columns: [
          "id",
          "department_id",
          "title",
          "title_amharic",
          "job_description",
          "job_description_amharic",
          "grade_level",
          "min_salary",
          "max_salary",
          "status",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "department_id"],
        relations: {
          department: {
            join: "LEFT JOIN department ON designations.department_id = department.id",
            fields: [
              "department_name",
              "department_name_amharic",
              "department_status",
            ],
          },
          company: {
            join: "LEFT JOIN company ON department.company_id = company.id",
            fields: ["company_name", "company_name_amharic"],
          },
          college: {
            join: "LEFT JOIN college ON department.college_id = college.id",
            fields: ["college_name", "college_name_amharic"],
          },
        },
      },
      // Add to tableSchemas object in TableSchemaService.js
   // Update the employee schema in TableSchemaService.js
employee: {
  columns: [
    "id",
    "employee_code",
    "company_id",
    "employee_category",
    "employee_type",
    "department_id",
    "designation_id",
    "manager_id",
    "hire_date",
    "employment_type",
    "employment_status",
    "termination_date",
    "created_at",
    "updated_at"
  ],
  uuidFields: [
    "id",
    "company_id",
    "department_id",
    "designation_id",
    "manager_id"
  ],
  relations: {
    // ... existing relations ...
    documents: {
      join: "LEFT JOIN employee_documents ON employee.id = employee_documents.employee_id",
      fields: ["document_type", "document_name", "file_path", "is_verified"]
    },
    education: {
      join: "LEFT JOIN employee_education ON employee.id = employee_education.employee_id",
      fields: ["institution_name", "qualification", "field_of_study", "grade"]
    }
    // ... rest of existing relations ...
  }
},
      employee_personal: {
        columns: [
          "id",
          "employee_id",
          "first_name",
          "first_name_amharic",
          "middle_name",
          "middle_name_amharic",
          "last_name",
          "last_name_amharic",
          "gender",
          "date_of_birth",
          "personal_email",
          "personal_phone",
          "emergency_contact_name",
          "emergency_contact_name_amharic",
          "emergency_contact_phone",
          "address",
          "address_amharic",
          "profile_picture",
        ],
        uuidFields: ["id", "employee_id"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employee_personal.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
        },
      },
      // In TableSchemaService.js, add to tableSchemas object
      employee_documents: {
        columns: [
          "id",
          "employee_id",
          "document_type",
          "document_name",
          "document_name_amharic",
          "file_name",
          "file_path",
          "file_size",
          "mime_type",
          "issue_date",
          "expiry_date",
          "issuing_authority",
          "description",
          "description_amharic",
          "is_verified",
          "verified_by",
          "verified_at",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "employee_id", "verified_by"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employee_documents.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
          verifier: {
            join: "LEFT JOIN employee verifier ON employee_documents.verified_by = verifier.id",
            fields: ["employee_code"],
          },
        },
      },

      employee_education: {
        columns: [
          "id",
          "employee_id",
          "institution_name",
          "institution_name_amharic",
          "qualification",
          "qualification_amharic",
          "field_of_study",
          "field_of_study_amharic",
          "start_date",
          "end_date",
          "graduation_date",
          "grade",
          "description",
          "description_amharic",
          "document_id",
          "is_verified",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "employee_id", "document_id"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employee_education.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
          document: {
            join: "LEFT JOIN employee_documents ON employee_education.document_id = employee_documents.id",
            fields: ["document_name", "file_path"],
          },
        },
      },
      // Add other employee tables similarly...
      // Add new tables here as you create them
    };
  }

  // Get all column names for a table
  getAllColumnNames(tableName) {
    const schema = this.tableSchemas[tableName];
    return schema ? schema.columns : ["*"];
  }

  // Get UUID fields for a table
  getUuidFields(tableName) {
    const schema = this.tableSchemas[tableName];
    return schema ? schema.uuidFields : ["id"];
  }

  // Check if a field is a UUID field
  isUuidField(tableName, fieldName) {
    const uuidFields = this.getUuidFields(tableName);
    return uuidFields.includes(fieldName) || fieldName === "id";
  }

  // Get valid relations for a table
  getValidRelations(tableName) {
    const schema = this.tableSchemas[tableName];
    return schema && schema.relations ? Object.keys(schema.relations) : [];
  }

  // Add related fields to SELECT query
  addRelatedFields(tableName, selectFields, include) {
    const schema = this.tableSchemas[tableName];
    if (!schema || !schema.relations || include.length === 0) {
      return selectFields;
    }

    let additionalFields = [];

    include.forEach((relation) => {
      const relationConfig = schema.relations[relation];
      if (relationConfig) {
        relationConfig.fields.forEach((field) => {
          additionalFields.push(`${relation}.${field} as ${relation}_${field}`);
        });
      }
    });

    return additionalFields.length > 0
      ? `${selectFields}, ${additionalFields.join(", ")}`
      : selectFields;
  }

  // Build JOIN clauses for query
  buildJoins(tableName, include) {
    const schema = this.tableSchemas[tableName];
    if (!schema || !schema.relations || include.length === 0) {
      return "";
    }

    let joins = "";

    include.forEach((relation) => {
      const relationConfig = schema.relations[relation];
      if (relationConfig) {
        joins += ` ${relationConfig.join}`;
      }
    });

    return joins;
  }

  // Validate include parameters
  validateIncludes(tableName, includeArray) {
    const validRelations = this.getValidRelations(tableName);
    const invalidIncludes = includeArray.filter(
      (inc) => !validRelations.includes(inc)
    );

    return {
      isValid: invalidIncludes.length === 0,
      invalidIncludes,
      validRelations,
    };
  }

  // Get table configuration
  getTableConfig(tableName) {
    return this.tableSchemas[tableName] || null;
  }

  // Add new table schema dynamically
  addTableSchema(tableName, schema) {
    this.tableSchemas[tableName] = schema;
  }

  // Update existing table schema
  updateTableSchema(tableName, updates) {
    if (this.tableSchemas[tableName]) {
      this.tableSchemas[tableName] = {
        ...this.tableSchemas[tableName],
        ...updates,
      };
    }
  }
}

// Create and export a singleton instance
export const tableSchemaService = new TableSchemaService();
