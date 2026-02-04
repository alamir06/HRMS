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
          "status",
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
            join: "LEFT JOIN employee_personal manager ON department.manager_id = manager.employee_id",
            fields: [
              "first_name",
              "last_name",
              "personal_email",
              "personal_phone"
            ],
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
          "employee_role",
          "employment_status",
          "termination_date",
          "created_at",
          "updated_at",
        ],
        uuidFields: [
          "id",
          "company_id",
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
            fields: [
              "department_name",
              "department_name_amharic",
              "department_status",
            ],
          },
          designation: {
            join: "LEFT JOIN designations ON employee.designation_id = designations.id",
            fields: ["title", "title_amharic", "grade_level"],
          },
          personal: {
            join: "LEFT JOIN employee_personal personal ON employee.id = personal.employee_id",
            fields: [
              "first_name",
              "last_name",
              "personal_email",
              "personal_phone",
            ],
          },
          employment: {
            join: "LEFT JOIN employee_employment employment ON employee.id = employment.employee_id",
            fields: ["official_email", "official_phone", "salary"],
          },
          manager: {
            join: "LEFT JOIN employee_personal manager ON employee.manager_id = manager.employee_id",
            fields: ["first_name", "last_name"],
          },
          documents: {
            join: "LEFT JOIN employee_documents documents ON employee.id = documents.employee_id",
            fields: ["document_type", "document_name", "file_path", "is_verified"],
          },
          education: {
            join: "LEFT JOIN employee_education education ON employee.id = education.employee_id",
            fields: [
              "institution_name",
              "qualification",
              "field_of_study",
              "grade",
            ],
          },
        },
      },
      attendance: {
        columns: [
          "id",
          "employee_id",
          "date",
          "check_in",
          "check_out",
          "status",
          "late_minutes",
          "overtime_minutes",
          "notes",
          "notes_amharic",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "employee_id"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON attendance.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
          personal: {
            join: "LEFT JOIN employee_personal personal ON attendance.employee_id = personal.employee_id",
            fields: ["first_name", "last_name"],
          },
        },
      },
      leave_types: {
        columns: [
          "id",
          "leave_name",
          "leave_name_amharic",
          "leave_description",
          "leave_description_amharic",
          "max_days_per_year",
          "carry_forward_days",
          "requires_approval",
          "color",
          "created_at",
        ],
        uuidFields: ["id"],
        relations: {},
      },
      leave_balance: {
        columns: [
          "id",
          "employee_id",
          "leave_type_id",
          "year",
          "total_allocated_days",
          "used_days",
          "remaining_days",
          "carry_forward_days",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "employee_id", "leave_type_id"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON leave_balance.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
          leave_type: {
            join: "LEFT JOIN leave_types ON leave_balance.leave_type_id = leave_types.id",
            fields: ["leave_name", "max_days_per_year"],
          },
        },
      },
      leave_request: {
        columns: [
          "id",
          "employee_id",
          "leave_type_id",
          "start_date",
          "end_date",
          "total_days",
          "reason",
          "reason_amharic",
          "status",
          "approved_by",
          "approved_at",
          "comments",
          "comments_amharic",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "employee_id", "leave_type_id", "approved_by"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON leave_request.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
          leave_type: {
            join: "LEFT JOIN leave_types ON leave_request.leave_type_id = leave_types.id",
            fields: ["leave_name", "max_days_per_year"],
          },
          approver: {
            join: "LEFT JOIN employee_personal approver ON leave_request.approved_by = approver.employee_id",
            fields: ["first_name", "last_name"],
          },
        },
      },
      recruitment: {
        columns: [
          "id",
          "job_title",
          "job_title_amharic",
          "department_id",
          "designation_id",
          "job_description",
          "job_description_amharic",
          "requirements",
          "requirements_amharic",
          "vacancies",
          "experience_required",
          "salary_range",
          "status",
          "posted_date",
          "closing_date",
          "created_by",
          "created_at",
          "updated_at",
        ],
        uuidFields: [
          "id",
          "department_id",
          "designation_id",
          "created_by",
        ],
        relations: {
          department: {
            join: "LEFT JOIN department ON recruitment.department_id = department.id",
            fields: ["department_name", "department_status"],
          },
          designation: {
            join: "LEFT JOIN designations ON recruitment.designation_id = designations.id",
            fields: ["title", "grade_level"],
          },
          creator: {
            join: "LEFT JOIN users ON recruitment.created_by = users.id",
            fields: ["username"],
          },
        },
      },
      applicant: {
        columns: [
          "id",
          "recruitment_id",
          "first_name",
          "first_name_amharic",
          "last_name",
          "last_name_amharic",
          "email",
          "phone",
          "resume_url",
          "cover_letter",
          "cover_letter_amharic",
          "current_company",
          "current_position",
          "total_experience",
          "current_salary",
          "expected_salary",
          "notice_period",
          "status",
          "applied_date",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "recruitment_id"],
        relations: {
          recruitment: {
            join: "LEFT JOIN recruitment ON applicant.recruitment_id = recruitment.id",
            fields: ["job_title", "status"],
          },
        },
      },
      interview_schedule: {
        columns: [
          "id",
          "applicant_id",
          "interview_date",
          "interview_time",
          "interview_type",
          "interviewers",
          "location",
          "location_amharic",
          "status",
          "feedback",
          "feedback_amharic",
          "rating",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "applicant_id"],
        relations: {
          applicant: {
            join: "LEFT JOIN applicant ON interview_schedule.applicant_id = applicant.id",
            fields: ["first_name", "last_name", "email", "status"],
          },
        },
      },
      asset_category: {
        columns: [
          "id",
          "category_name",
          "category_name_amharic",
          "description",
          "description_amharic",
          "created_at",
        ],
        uuidFields: ["id"],
        relations: {},
      },
      assets: {
        columns: [
          "id",
          "asset_name",
          "asset_name_amharic",
          "asset_category_id",
          "serial_number",
          "model",
          "purchase_date",
          "purchase_cost",
          "current_value",
          "status",
          "location",
          "location_amharic",
          "notes",
          "notes_amharic",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "asset_category_id"],
        relations: {
          category: {
        notices: {
          columns: [
            "id",
            "title",
            "title_amharic",
            "content",
            "content_amharic",
            "notice_type",
            "target_audience",
            "target_department_id",
            "target_employee_id",
            "publish_date",
            "expiry_date",
            "is_published",
            "created_by",
            "created_at",
            "updated_at",
          ],
          uuidFields: ["id", "target_department_id", "target_employee_id", "created_by"],
          relations: {
            target_department: {
              join: "LEFT JOIN department ON notices.target_department_id = department.id",
              fields: ["department_name", "department_status"],
            },
            target_employee: {
              join: "LEFT JOIN employee_personal notice_employee ON notices.target_employee_id = notice_employee.employee_id",
              fields: ["first_name", "last_name"],
            },
            creator: {
              join: "LEFT JOIN users ON notices.created_by = users.id",
              fields: ["username"],
            },
          },
        },
        notifications: {
          columns: [
            "id",
            "user_id",
            "title",
            "title_amharic",
            "message",
            "message_amharic",
            "notification_type",
            "related_module",
            "related_id",
            "is_read",
            "created_at",
          ],
          uuidFields: ["id", "user_id", "related_id"],
          relations: {
            user: {
              join: "LEFT JOIN users ON notifications.user_id = users.id",
              fields: ["username", "preferred_language"],
            },
            employee: {
              join: "LEFT JOIN employee_personal notif_employee ON users.employee_id = notif_employee.employee_id",
              fields: ["first_name", "last_name"],
            },
          },
        },
            join: "LEFT JOIN asset_category ON assets.asset_category_id = asset_category.id",
            fields: ["category_name", "category_name_amharic"],
          },
        },
      },
      asset_assignment: {
        columns: [
          "id",
          "asset_id",
          "employee_id",
          "assigned_date",
          "expected_return_date",
          "actual_return_date",
          "assignment_reason",
          "assignment_reason_amharic",
          "condition_assigned",
          "condition_assigned_amharic",
          "condition_returned",
          "condition_returned_amharic",
          "status",
          "assigned_by",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "asset_id", "employee_id", "assigned_by"],
        relations: {
          asset: {
            join: "LEFT JOIN assets ON asset_assignment.asset_id = assets.id",
            fields: ["asset_name", "serial_number", "status"],
          },
          employee: {
            join: "LEFT JOIN employee ON asset_assignment.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
          assigned_by_user: {
          payroll: {
            columns: [
              "id",
              "employee_id",
              "pay_period_start",
              "pay_period_end",
              "basic_salary",
              "house_rent_allowance",
              "travel_allowance",
              "medical_allowance",
              "overtime_allowance",
              "other_allowances",
              "total_earnings",
              "tax_deduction",
              "provident_fund",
              "leave_deduction",
              "other_deductions",
              "total_deductions",
              "net_salary",
              "payment_date",
              "payment_status",
              "generated_by",
              "created_at",
              "updated_at",
            ],
            uuidFields: ["id", "employee_id", "generated_by"],
            relations: {
              employee: {
                join: "LEFT JOIN employee ON payroll.employee_id = employee.id",
                fields: ["employee_code", "employment_status", "employment_type"],
              },
              personal: {
                join: "LEFT JOIN employee_personal payroll_personal ON payroll.employee_id = payroll_personal.employee_id",
                fields: ["first_name", "middle_name", "last_name"],
              },
              department: {
                join: "LEFT JOIN department payroll_department ON employee.department_id = payroll_department.id",
                fields: ["department_name"],
              },
              designation: {
                join: "LEFT JOIN designations payroll_designation ON employee.designation_id = payroll_designation.id",
                fields: ["title"],
              },
              generator: {
                join: "LEFT JOIN users payroll_generator ON payroll.generated_by = payroll_generator.id",
                fields: ["username"],
              },
            },
          },
            join: "LEFT JOIN users ON asset_assignment.assigned_by = users.id",
            fields: ["username"],
          },
        },
      },
      benefits: {
        columns: [
          "id",
          "benefit_name",
          "benefit_name_amharic",
          "description",
          "description_amharic",
          "benefit_type",
          "cost_to_company",
          "is_active",
          "created_at",
        ],
        uuidFields: ["id"],
        relations: {},
      },
      employee_benefits: {
        columns: [
          "id",
          "employee_id",
          "benefit_id",
          "enrollment_date",
          "coverage_amount",
          "employee_contribution",
          "company_contribution",
          "status",
          "end_date",
          "created_at",
          "updated_at",
        ],
        uuidFields: ["id", "employee_id", "benefit_id"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employee_benefits.employee_id = employee.id",
            fields: ["employee_code", "employment_status"],
          },
          benefit: {
            join: "LEFT JOIN benefits ON employee_benefits.benefit_id = benefits.id",
            fields: ["benefit_name", "benefit_type"],
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
