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
      employee: {
        columns: [
          "id",
          "employee_code",
          "company_id",
          "employee_category_id",
          "employee_type",
          "department_id",
          "designation_id",
          "manager_id",
          "hire_date",
          "employment_type",
          "employment_status",
          "termination_date",
          "created_at",
          "updated_at",
        ],
        uuidFields: [
          "id",
          "company_id",
          "employee_category_id",
          "department_id",
          "designation_id",
          "manager_id",
        ],
        relations: {
          company: {
            join: "LEFT JOIN company ON employee.company_id = company.id",
            fields: ["company_name", "company_name_amharic"],
          },
          department: {
            join: "LEFT JOIN department ON employee.department_id = department.id",
            fields: ["department_name", "department_name_amharic"],
          },
          designation: {
            join: "LEFT JOIN designations ON employee.designation_id = designations.id",
            fields: ["title", "title_amharic", "grade_level"],
          },
          manager: {
            join: "LEFT JOIN employee manager ON employee.manager_id = manager.id",
            fields: ["employee_code"],
          },
          personal: {
            join: "LEFT JOIN employee_personal ON employee.id = employee_personal.employee_id",
            fields: [
              "first_name",
              "first_name_amharic",
              "middle_name",
              "middle_name_amharic",
              "last_name",
              "last_name_amharic",
              "gender",
              "profile_picture",
            ],
          },
          employment: {
            join: "LEFT JOIN employee_employment ON employee.id = employee_employment.employee_id",
            fields: ["official_email", "official_phone", "salary"],
          },
          academic: {
            join: "LEFT JOIN employee_academic ON employee.id = employee_academic.employee_id",
            fields: [
              "academic_rank",
              "academic_rank_amharic",
              "academic_status",
            ],
          },
        },
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
