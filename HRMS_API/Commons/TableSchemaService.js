export class TableSchemaService {
  constructor() {
    this.tableSchemas = {
      company: {
        columns: [
          "id",
          "companyName",
          "companyNameAmharic",
          "companyAddress",
          "companyAddressAmharic",
          "companyPhone",
          "companyEmail",
          "companyWebsite",
          "companyLogo",
          "companyEstablishedDate",
          "companyTinNumber",
          "status",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id"],
        relations: {}, // Company has no foreign key relations
      },
      outsourcingCompanies: {
        columns: [
          "id",
          "companyId",
          "companyName",
          "companyNameAmharic",
          "companyAddress",
          "companyAddressAmharic",
          "companyPhone",
          "companyEmail",
          "companyServiceType",
          "companyContractStartDate",
          "companyContractEndDate",
          "companyStatus",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "companyId"],
        relations: {
          company: {
            join: "LEFT JOIN company ON outsourcingCompanies.companyId = company.id",
            fields: ["companyName", "companyNameAmharic", "companyEmail"],
          },
        },
      },
      hrRoles: {
        columns: [
          "id",
          "roleName",
          "roleNameAmharic",
          "roleCode",
          "roleDescription",
          "roleDescriptionAmharic",
          "rolePermissions",
          "status",
          "createdAt",
        ],
        uuidFields: ["id"],
        relations: {}, // HR roles has no foreign key relations
      },
      college: {
        columns: [
          "id",
          "companyId",
          "collegeName",
          "collegeNameAmharic",
          "collegeDescription",
          "collegeDescriptionAmharic",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "companyId"],
        relations: {
          company: {
            join: "LEFT JOIN company ON college.companyId = company.id",
            fields: ["companyName", "companyNameAmharic", "companyEmail"],
          },
        },
      },
      department: {
        columns: [
          "id",
          "companyId",
          "collegeId",
          "departmentName",
          "departmentNameAmharic",
          "parentDepartmentId",
          "departmentDescription",
          "departmentDescriptionAmharic",
          "departmentType",
          "managerId",
          "departmentLevel",
          "departmentStatus",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "companyId", "collegeId", "managerId"],
        relations: {
          company: {
            join: "LEFT JOIN company ON department.companyId = company.id",
            fields: [
              "companyName",
              "companyNameAmharic",
              "companyEmail",
              "companyPhone",
            ],
          },
          college: {
            join: "LEFT JOIN college ON department.collegeId = college.id",
            fields: ["collegeName", "collegeNameAmharic"],
          },
          manager: {
            join: "LEFT JOIN employeePersonal manager ON department.managerId = manager.employeeId",
            fields: [
              "firstName",
              "lastName",
              "personalEmail",
              "personalPhone"
            ],
          },
        },
      },
      designations: {
        columns: [
          "id",
          "employeeId",
          "departmentId",
          "collegeId",
          "title",
          "titleAmharic",
          "jobDescription",
          "jobDescriptionAmharic",
          "gradeLevel",
          "minSalary",
          "maxSalary",
          "status",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "employeeId", "departmentId", "collegeId"],
        relations: {
          department: {
            join: "LEFT JOIN department ON designations.departmentId = department.id",
            fields: [
              "departmentName",
              "departmentNameAmharic",
              "departmentStatus",
              "departmentType",
            ],
          },
          company: {
            join: "LEFT JOIN company ON department.companyId = company.id",
            fields: ["companyName", "companyNameAmharic"],
          },
          college: {
            join: "LEFT JOIN college ON department.collegeId = college.id",
            fields: ["collegeName", "collegeNameAmharic"],
          },
          employee: {
            join: "LEFT JOIN employeePersonal emp ON designations.employeeId = emp.employeeId",
            fields: ["firstName", "lastName", "personalEmail"],
          },
        },
      },
      employee: {
        columns: [
          "id",
          "employeeCode",
          "companyId",
          "employeeCategory",
          "employeeType",
          "departmentId",
          "managerId",
          "hireDate",
          "employmentType",
          "employeeRole",
          "employmentStatus",
          "terminationDate",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: [
          "id",
          "companyId",
          "departmentId",
          "managerId",
        ],
        relations: {
          company: {
            join: "LEFT JOIN company ON employee.companyId = company.id",
            fields: ["companyName", "companyNameAmharic"],
          },
          department: {
            join: "LEFT JOIN department ON employee.departmentId = department.id",
            fields: [
              "departmentName",
              "departmentNameAmharic",
              "departmentStatus",
            ],
          },
          personal: {
            join: "LEFT JOIN employeePersonal personal ON employee.id = personal.employeeId",
            fields: [
              "firstName",
              "lastName",
              "personalEmail",
              "personalPhone",
            ],
          },
          employment: {
            join: "LEFT JOIN employeeEmployment employment ON employee.id = employment.employeeId",
            fields: ["officialEmail", "officialPhone", "salary"],
          },
          manager: {
            join: "LEFT JOIN employeePersonal manager ON employee.managerId = manager.employeeId",
            fields: ["firstName", "lastName"],
          },
          documents: {
            join: "LEFT JOIN employeeDocuments documents ON employee.id = documents.employeeId",
            fields: ["documentType", "documentName", "filePath", "isVerified"],
          },
          education: {
            join: "LEFT JOIN employeeEducation education ON employee.id = education.employeeId",
            fields: [
              "institutionName",
              "qualification",
              "fieldOfStudy",
              "grade",
            ],
          },
        },
      },
      attendance: {
        columns: [
          "id",
          "employeeId",
          "date",
          "checkIn",
          "checkOut",
          "status",
          "lateMinutes",
          "overtimeMinutes",
          "notes",
          "notesAmharic",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "employeeId"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON attendance.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
          personal: {
            join: "LEFT JOIN employeePersonal personal ON attendance.employeeId = personal.employeeId",
            fields: ["firstName", "lastName"],
          },
        },
      },
      leaveTypes: {
        columns: [
          "id",
          "leaveName",
          "leaveNameAmharic",
          "leaveDescription",
          "leaveDescriptionAmharic",
          "maxDaysPerYear",
          "carryForwardDays",
          "requiresApproval",
          "color",
          "createdAt",
        ],
        uuidFields: ["id"],
        relations: {},
      },
      leaveBalance: {
        columns: [
          "id",
          "employeeId",
          "leaveTypeId",
          "year",
          "totalAllocatedDays",
          "usedDays",
          "remainingDays",
          "carryForwardDays",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "employeeId", "leaveTypeId"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON leaveBalance.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
          leaveType: {
            join: "LEFT JOIN leaveTypes ON leaveBalance.leaveTypeId = leaveTypes.id",
            fields: ["leaveName", "maxDaysPerYear"],
          },
        },
      },
      leaveRequest: {
        columns: [
          "id",
          "employeeId",
          "leaveTypeId",
          "startDate",
          "endDate",
          "totalDays",
          "reason",
          "reasonAmharic",
          "status",
          "approvedBy",
          "approvedAt",
          "comments",
          "commentsAmharic",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "employeeId", "leaveTypeId", "approvedBy"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON leaveRequest.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
          leaveType: {
            join: "LEFT JOIN leaveTypes ON leaveRequest.leaveTypeId = leaveTypes.id",
            fields: ["leaveName", "maxDaysPerYear"],
          },
          approver: {
            join: "LEFT JOIN employeePersonal approver ON leaveRequest.approvedBy = approver.employeeId",
            fields: ["firstName", "lastName"],
          },
        },
      },
      recruitment: {
        columns: [
          "id",
          "jobTitle",
          "jobTitleAmharic",
          "departmentId",
          "designationId",
          "jobDescription",
          "jobDescriptionAmharic",
          "requirements",
          "requirementsAmharic",
          "vacancies",
          "experienceRequired",
          "salaryRange",
          "status",
          "postedDate",
          "closingDate",
          "createdBy",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: [
          "id",
          "departmentId",
          "designationId",
          "createdBy",
        ],
        relations: {
          department: {
            join: "LEFT JOIN department ON recruitment.departmentId = department.id",
            fields: ["departmentName", "departmentStatus"],
          },
          designation: {
            join: "LEFT JOIN designations ON recruitment.designationId = designations.id",
            fields: ["title", "gradeLevel"],
          },
          creator: {
            join: "LEFT JOIN users ON recruitment.createdBy = users.id",
            fields: ["username"],
          },
        },
      },
      applicant: {
        columns: [
          "id",
          "recruitmentId",
          "firstName",
          "firstNameAmharic",
          "lastName",
          "lastNameAmharic",
          "email",
          "PHONE",
          "resumeUrl",
          "coverLetter",
          "coverLetterAmharic",
          "currentCompany",
          "currentPosition",
          "totalExperience",
          "currentSalary",
          "expectedSalary",
          "noticePeriod",
          "status",
          "appliedDate",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "recruitmentId"],
        relations: {
          recruitment: {
            join: "LEFT JOIN recruitment ON applicant.recruitmentId = recruitment.id",
            fields: ["jobTitle", "status"],
          },
        },
      },
      interviewSchedule: {
        columns: [
          "id",
          "applicantId",
          "interviewDate",
          "interviewTime",
          "interviewType",
          "interviewers",
          "location",
          "locationAmharic",
          "status",
          "feedback",
          "feedbackAmharic",
          "rating",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "applicantId"],
        relations: {
          applicant: {
            join: "LEFT JOIN applicant ON interviewSchedule.applicantId = applicant.id",
            fields: ["firstName", "lastName", "email", "status"],
          },
        },
      },
      assetCategory: {
        columns: [
          "id",
          "categoryName",
          "categoryNameAmharic",
          "description",
          "descriptionAmharic",
          "createdAt",
        ],
        uuidFields: ["id"],
        relations: {},
      },
      assets: {
        columns: [
          "id",
          "assetName",
          "assetNameAmharic",
          "assetCategoryId",
          "serialNumber",
          "model",
          "purchaseDate",
          "purchaseCost",
          "currentValue",
          "status",
          "location",
          "locationAmharic",
          "notes",
          "notesAmharic",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "assetCategoryId"],
        relations: {
          category: {
        notices: {
          columns: [
            "id",
            "title",
            "titleAmharic",
            "content",
            "contentAmharic",
            "noticeType",
            "targetAudience",
            "targetDepartmentId",
            "targetEmployeeId",
            "publishDate",
            "expiryDate",
            "isPublished",
            "createdBy",
            "createdAt",
            "updatedAt",
          ],
          uuidFields: ["id", "targetDepartmentId", "targetEmployeeId", "createdBy"],
          relations: {
            targetDepartment: {
              join: "LEFT JOIN department ON notices.targetDepartmentId = department.id",
              fields: ["departmentName", "departmentStatus"],
            },
            targetEmployee: {
              join: "LEFT JOIN employeePersonal noticeEmployee ON notices.targetEmployeeId = noticeEmployee.employeeId",
              fields: ["firstName", "lastName"],
            },
            creator: {
              join: "LEFT JOIN users ON notices.createdBy = users.id",
              fields: ["username"],
            },
          },
        },
        notifications: {
          columns: [
            "id",
            "userId",
            "title",
            "titleAmharic",
            "message",
            "messageAmharic",
            "notificationType",
            "relatedModule",
            "relatedId",
            "isRead",
            "createdAt",
          ],
          uuidFields: ["id", "userId", "relatedId"],
          relations: {
            user: {
              join: "LEFT JOIN users ON notifications.userId = users.id",
              fields: ["username", "preferredLanguage"],
            },
            employee: {
              join: "LEFT JOIN employeePersonal notifEmployee ON users.employeeId = notifEmployee.employeeId",
              fields: ["firstName", "lastName"],
            },
          },
        },
            join: "LEFT JOIN assetCategory ON assets.assetCategoryId = assetCategory.id",
            fields: ["categoryName", "categoryNameAmharic"],
          },
        },
      },
      assetAssignment: {
        columns: [
          "id",
          "assetId",
          "employeeId",
          "assignedDate",
          "expectedReturnDate",
          "actualReturnDate",
          "assignmentReason",
          "assignmentReasonAmharic",
          "conditionAssigned",
          "conditionAssignedAmharic",
          "conditionReturned",
          "conditionReturnedAmharic",
          "status",
          "assignedBy",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "assetId", "employeeId", "assignedBy"],
        relations: {
          asset: {
            join: "LEFT JOIN assets ON assetAssignment.assetId = assets.id",
            fields: ["assetName", "serialNumber", "status"],
          },
          employee: {
            join: "LEFT JOIN employee ON assetAssignment.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
          assignedByUser: {
          payroll: {
            columns: [
              "id",
              "employeeId",
              "payPeriodStart",
              "payPeriodEnd",
              "basicSalary",
              "houseRentAllowance",
              "travelAllowance",
              "medicalAllowance",
              "overtimeAllowance",
              "otherAllowances",
              "totalEarnings",
              "taxDeduction",
              "providentFund",
              "leaveDeduction",
              "otherDeductions",
              "totalDeductions",
              "netSalary",
              "paymentDate",
              "paymentStatus",
              "generatedBy",
              "createdAt",
              "updatedAt",
            ],
            uuidFields: ["id", "employeeId", "generatedBy"],
            relations: {
              employee: {
                join: "LEFT JOIN employee ON payroll.employeeId = employee.id",
                fields: ["employeeCode", "employmentStatus", "employmentType"],
              },
              personal: {
                join: "LEFT JOIN employeePersonal payrollPersonal ON payroll.employeeId = payrollPersonal.employeeId",
                fields: ["firstName", "middleName", "lastName"],
              },
              department: {
                join: "LEFT JOIN department payrollDepartment ON employee.departmentId = payrollDepartment.id",
                fields: ["departmentName"],
              },
              designation: {
                join: "LEFT JOIN designations payrollDesignation ON employee.designationId = payrollDesignation.id",
                fields: ["title"],
              },
              generator: {
                join: "LEFT JOIN users payrollGenerator ON payroll.generatedBy = payrollGenerator.id",
                fields: ["username"],
              },
            },
          },
            join: "LEFT JOIN users ON assetAssignment.assignedBy = users.id",
            fields: ["username"],
          },
        },
      },
      benefits: {
        columns: [
          "id",
          "benefitName",
          "benefitNameAmharic",
          "description",
          "descriptionAmharic",
          "benefitType",
          "costToCompany",
          "isActive",
          "createdAt",
        ],
        uuidFields: ["id"],
        relations: {},
      },
      employeeBenefits: {
        columns: [
          "id",
          "employeeId",
          "benefitId",
          "enrollmentDate",
          "coverageAmount",
          "employeeContribution",
          "companyContribution",
          "status",
          "endDate",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "employeeId", "benefitId"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employeeBenefits.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
          benefit: {
            join: "LEFT JOIN benefits ON employeeBenefits.benefitId = benefits.id",
            fields: ["benefitName", "benefitType"],
          },
        },
      },
      employeePersonal: {
        columns: [
          "id",
          "employeeId",
          "firstName",
          "firstNameAmharic",
          "middleName",
          "middleNameAmharic",
          "lastName",
          "lastNameAmharic",
          "gender",
          "dateOfBirth",
          "personalEmail",
          "personalPhone",
          "emergencyContactName",
          "emergencyContactNameAmharic",
          "emergencyContactPhone",
          "address",
          "addressAmharic",
          "profilePicture",
        ],
        uuidFields: ["id", "employeeId"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employeePersonal.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
        },
      },
      // In TableSchemaService.js, add to tableSchemas object
      employeeDocuments: {
        columns: [
          "id",
          "employeeId",
          "documentType",
          "documentName",
          "documentNameAmharic",
          "fileName",
          "filePath",
          "fileSize",
          "mimeType",
          "issueDate",
          "expiryDate",
          "issuingAuthority",
          "description",
          "descriptionAmharic",
          "isVerified",
          "verifiedBy",
          "verifiedAt",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "employeeId", "verifiedBy"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employeeDocuments.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
          verifier: {
            join: "LEFT JOIN employee verifier ON employeeDocuments.verifiedBy = verifier.id",
            fields: ["employeeCode"],
          },
        },
      },

      employeeEducation: {
        columns: [
          "id",
          "employeeId",
          "institutionName",
          "institutionNameAmharic",
          "qualification",
          "qualificationAmharic",
          "fieldOfStudy",
          "fieldOfStudyAmharic",
          "startDate",
          "endDate",
          "graduationDate",
          "grade",
          "description",
          "descriptionAmharic",
          "documentId",
          "isVerified",
          "createdAt",
          "updatedAt",
        ],
        uuidFields: ["id", "employeeId", "documentId"],
        relations: {
          employee: {
            join: "LEFT JOIN employee ON employeeEducation.employeeId = employee.id",
            fields: ["employeeCode", "employmentStatus"],
          },
          document: {
            join: "LEFT JOIN employeeDocuments ON employeeEducation.documentId = employeeDocuments.id",
            fields: ["documentName", "filePath"],
          },
        },
      },
      // Add other employee tables similarly...
      // Add new tables here as you create them
    };
  }

  // Get all column names for a table
  getAllColumnNames(tableName) {
    const tableKey = tableName ? tableName.toLowerCase() : "";
    const schema = this.tableSchemas[tableKey] || this.tableSchemas[tableName];
    return schema ? schema.columns : ["*"];
  }

  // Get UUID fields for a table
  getUuidFields(tableName) {
    const tableKey = tableName ? tableName.toLowerCase() : "";
    const schema = this.tableSchemas[tableKey] || this.tableSchemas[tableName];
    return schema ? schema.uuidFields : ["id"];
  }

  // Check if a field is a UUID field
  isUuidField(tableName, fieldName) {
    const uuidFields = this.getUuidFields(tableName);
    return uuidFields.includes(fieldName) || fieldName === "id";
  }

  // Get valid relations for a table
  getValidRelations(tableName) {
    const tableKey = tableName ? tableName.toLowerCase() : "";
    const schema = this.tableSchemas[tableKey] || this.tableSchemas[tableName];
    return schema && schema.relations ? Object.keys(schema.relations) : [];
  }

  // Add related fields to SELECT query
  addRelatedFields(tableName, selectFields, include) {
    const tableKey = tableName ? tableName.toLowerCase() : "";
    const schema = this.tableSchemas[tableKey] || this.tableSchemas[tableName];
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
    const tableKey = tableName ? tableName.toLowerCase() : "";
    const schema = this.tableSchemas[tableKey] || this.tableSchemas[tableName];
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
    const tableKey = tableName ? tableName.toLowerCase() : "";
    return this.tableSchemas[tableKey] || this.tableSchemas[tableName] || null;
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
