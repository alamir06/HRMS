import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";
import { createTelegramNotifier } from "../Commons/CommonServices.js";

const telegramNotifier = createTelegramNotifier();

const parseInterviewers = (value) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const mapRecruitmentRecord = (record) => ({
  id: record.id,
  jobTitle: record.jobTitle,
  jobTitleAmharic: record.jobTitleAmharic,
  departmentId: record.departmentId,
  designationId: record.designationId,
  level: record.level,
  referenceNumber: record.referenceNumber,
  educationLevel: record.educationLevel,
  recruitmentType: record.recruitmentType,
  specialization: record.specialization,
  specializationAmharic: record.specializationAmharic,
  academicRank: record.academicRank,
  academicRankAmharic: record.academicRankAmharic,
  remark: record.remark,
  remarkAmharic: record.remarkAmharic,
  departmentName: record.departmentName,
  designationName: record.designationName,
  jobDescription: record.jobDescription,
  jobDescriptionAmharic: record.jobDescriptionAmharic,
  requirements: record.requirements,
  requirementsAmharic: record.requirementsAmharic,
  vacancies: record.vacancies,
  experienceRequired: record.experienceRequired,
  salaryRange: record.salaryRange,
  status: record.status,
  postedDate: record.postedDate,
  closingDate: record.closingDate,
  createdBy: record.createdBy,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const mapApplicantRecord = (record) => ({
  id: record.id,
  recruitmentId: record.recruitmentId,
  recruitmentTitle: record.recruitmentJobTitle,
  firstName: record.firstName,
  firstNameAmharic: record.firstNameAmharic,
  lastName: record.lastName,
  lastNameAmharic: record.lastNameAmharic,
  email: record.email,
  phone: record.phone,
  resumeUrl: record.resumeUrl,
  coverLetter: record.coverLetter,
  coverLetterAmharic: record.coverLetterAmharic,
  currentCompany: record.currentCompany,
  currentPosition: record.currentPosition,
  totalExperience: record.totalExperience,
  currentSalary: record.currentSalary,
  expectedSalary: record.expectedSalary,
  noticePeriod: record.noticePeriod,
  status: record.status,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const mapInterviewRecord = (record) => ({
  id: record.id,
  applicantId: record.applicantId,
  interviewDate: record.interviewDate,
  interviewTime: record.interviewTime,
  interviewType: record.interviewType,
  interviewers: parseInterviewers(record.interviewers),
  location: record.location,
  locationAmharic: record.locationAmharic,
  status: record.status,
  feedback: record.feedback,
  feedbackAmharic: record.feedbackAmharic,
  rating: record.rating,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const createRecruitment = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      jobTitle,
      jobTitleAmharic,
      departmentId,
      designationId,
      level,
      referenceNumber,
      educationLevel,
      recruitmentType = 'ADMINISTRATIVE',
      specialization,
      specializationAmharic,
      academicRank,
      academicRankAmharic,
      remark,
      remarkAmharic,
      jobDescription,
      jobDescriptionAmharic,
      requirements,
      requirementsAmharic,
      vacancies,
      experienceRequired,
      salaryRange,
      status = "DRAFT",
      postedDate,
      closingDate,
    } = req.body;

    const createdBy = req.user.id;

    await connection.beginTransaction();

    const [deptRows] = await connection.query(
      "SELECT departmentType FROM department WHERE id = UUID_TO_BIN(?)",
      [departmentId]
    );

    if (deptRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    if (deptRows[0].departmentType !== recruitmentType) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Type mismatch: Cannot post an ${recruitmentType} vacancy to an ${deptRows[0].departmentType} department.`,
      });
    }

    const insertQuery = `
      INSERT INTO recruitment (
        id, jobTitle, jobTitleAmharic, departmentId, designationId,
        level, referenceNumber, educationLevel,
        recruitmentType, specialization, specializationAmharic, academicRank, academicRankAmharic, remark, remarkAmharic,
        jobDescription, jobDescriptionAmharic, requirements, requirementsAmharic,
        vacancies, experienceRequired, salaryRange, status, postedDate, closingDate,
        createdBy
      ) VALUES (UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UUID_TO_BIN(?))
    `;

    await connection.execute(insertQuery, [
      id,
      jobTitle || null,
      jobTitleAmharic || null,
      departmentId,
      designationId || null,
      level || null,
      referenceNumber || null,
      educationLevel || null,
      recruitmentType,
      specialization || null,
      specializationAmharic || null,
      academicRank || null,
      academicRankAmharic || null,
      remark || null,
      remarkAmharic || null,
      jobDescription || null,
      jobDescriptionAmharic || null,
      requirements || null,
      requirementsAmharic || null,
      vacancies,
      experienceRequired || null,
      salaryRange || null,
      status,
      postedDate || null,
      closingDate || null,
      createdBy,
    ]);

    await connection.commit();

    if (status === "OPEN") {
      await telegramNotifier.notifyJobPosting({
        id,
        title: jobTitle,
        description: jobDescription,
        requirements,
        closingDate: closingDate,
        vacancies,
      });
    }

    res.status(201).json({
      success: true,
      data: { id },
      message: "Recruitment created successfully",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const listRecruitment = async (_req, res, next) => {
  try {
    const query = `
      SELECT r.*, BIN_TO_UUID(r.id) as id, BIN_TO_UUID(r.departmentId) as departmentId, BIN_TO_UUID(r.designationId) as designationId, BIN_TO_UUID(r.createdBy) as createdBy, d.name AS departmentName, ds.name AS designationName
      FROM recruitment r
      LEFT JOIN department d ON d.id = r.departmentId
      LEFT JOIN designation ds ON ds.id = r.designationId
      ORDER BY r.createdAt DESC
    `;

    const [rows] = await pool.query(query);
    res.json({
      success: true,
      data: rows.map(mapRecruitmentRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const getRecruitmentById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT r.*, BIN_TO_UUID(r.id) as id, BIN_TO_UUID(r.departmentId) as departmentId, BIN_TO_UUID(r.designationId) as designationId, BIN_TO_UUID(r.createdBy) as createdBy, d.name AS departmentName, ds.name AS designationName
      FROM recruitment r
      LEFT JOIN department d ON d.id = r.departmentId
      LEFT JOIN designation ds ON ds.id = r.designationId
      WHERE r.id = UUID_TO_BIN(?)
    `;

    const [rows] = await pool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Recruitment not found" });
    }

    const recruitment = mapRecruitmentRecord(rows[0]);

    res.json({
      success: true,
      data: recruitment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRecruitment = async (req, res, next) => {
  const { id } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ success: false, message: "No fields provided for update" });
  }

  const allowedFields = [
    "jobTitle",
    "jobTitleAmharic",
    "departmentId",
    "designationId",
    "level",
    "referenceNumber",
    "educationLevel",
    "recruitmentType",
    "specialization",
    "specializationAmharic",
    "academicRank",
    "academicRankAmharic",
    "remark",
    "remarkAmharic",
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
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowedFields.includes(key)) {
      if (key === "departmentId" || key === "designationId") {
        setClauses.push(`${key} = UUID_TO_BIN(?)`);
        values.push(value);
      } else {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }
  }

  if (!setClauses.length) {
    return res.status(400).json({ success: false, message: "No valid fields provided" });
  }

  values.push(id);

  const query = `UPDATE recruitment SET ${setClauses.join(", ")}, updatedAt = NOW() WHERE id = UUID_TO_BIN(?)`;

  try {
    const [result] = await pool.execute(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Recruitment not found" });
    }

    if (fields.status === "OPEN") {
      const [records] = await pool.query(
        `SELECT jobTitle, jobDescription, requirements, closingDate, vacancies FROM recruitment WHERE id = ?`,
        [id]
      );

      if (records.length > 0) {
        const record = records[0];
        await telegramNotifier.notifyJobPosting({
          id,
          title: record.jobTitle,
          description: record.jobDescription,
          requirements: record.requirements,
          closingDate: record.closingDate,
          vacancies: record.vacancies,
        });
      }
    }

    res.json({ success: true, message: "Recruitment updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteRecruitment = async (req, res, next) => {
  const { id } = req.params;
  const query = "DELETE FROM recruitment WHERE id = UUID_TO_BIN(?)";

  try {
    const [result] = await pool.execute(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Recruitment not found" });
    }

    res.json({ success: true, message: "Recruitment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const createApplicant = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      recruitmentId,
      firstName,
      firstNameAmharic,
      lastName,
      lastNameAmharic,
      email,
      phone,
      resumeUrl,
      coverLetter,
      coverLetterAmharic,
      currentCompany,
      currentPosition,
      totalExperience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      status = "APPLIED",
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO applicant (
        id, recruitmentId, firstName, firstNameAmharic, lastName, lastNameAmharic,
        email, phone, resumeUrl, coverLetter, coverLetterAmharic, currentCompany,
        currentPosition, totalExperience, currentSalary, expectedSalary, noticePeriod, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(insertQuery, [
      id,
      recruitmentId,
      firstName,
      firstNameAmharic,
      lastName,
      lastNameAmharic,
      email,
      phone,
      resumeUrl,
      coverLetter,
      coverLetterAmharic,
      currentCompany,
      currentPosition,
      totalExperience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      status,
    ]);

    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id },
      message: "Applicant created successfully",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const listApplicants = async (req, res, next) => {
  const { recruitmentId } = req.query;
  try {
    const query = `
      SELECT a.*, r.jobTitle AS recruitmentJobTitle
      FROM applicant a
      LEFT JOIN recruitment r ON r.id = a.recruitmentId
      WHERE (? IS NULL OR a.recruitmentId = ?)
      ORDER BY a.createdAt DESC
    `;

    const idFilter = recruitmentId || null;
    const [rows] = await pool.query(query, [idFilter, idFilter]);

    res.json({
      success: true,
      data: rows.map(mapApplicantRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const updateApplicantStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" });
  }

  const query = `UPDATE applicant SET status = ?, updatedAt = NOW() WHERE id = ?`;

  try {
    const [result] = await pool.execute(query, [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Applicant not found" });
    }

    res.json({ success: true, message: "Applicant status updated" });
  } catch (error) {
    next(error);
  }
};

export const createInterview = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      applicantId,
      interviewDate,
      interviewTime,
      interviewType,
      interviewers,
      location,
      locationAmharic,
      status = "SCHEDULED",
      feedback,
      feedbackAmharic,
      rating,
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO interview (
        id, applicantId, interviewDate, interviewTime, interviewType, interviewers,
        location, locationAmharic, status, feedback, feedbackAmharic, rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(insertQuery, [
      id,
      applicantId,
      interviewDate,
      interviewTime,
      interviewType,
      interviewers ? JSON.stringify(interviewers) : null,
      location,
      locationAmharic,
      status,
      feedback,
      feedbackAmharic,
      rating,
    ]);

    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id },
      message: "Interview scheduled successfully",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const listInterviews = async (req, res, next) => {
  const { applicantId } = req.query;
  try {
    const query = `
      SELECT i.*, a.firstName, a.lastName
      FROM interview i
      LEFT JOIN applicant a ON a.id = i.applicantId
      WHERE (? IS NULL OR i.applicantId = ?)
      ORDER BY i.interviewDate DESC, i.interviewTime DESC
    `;

    const idFilter = applicantId || null;
    const [rows] = await pool.query(query, [idFilter, idFilter]);

    res.json({
      success: true,
      data: rows.map(mapInterviewRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const updateInterview = async (req, res, next) => {
  const { id } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ success: false, message: "No fields provided for update" });
  }

  const allowedFields = [
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
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!allowedFields.includes(key)) {
      continue;
    }

    if (typeof value === "undefined") {
      continue;
    }

    if (key === "interviewers") {
      setClauses.push(`${key} = ?`);
      values.push(value ? JSON.stringify(value) : null);
      continue;
    }

    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (!setClauses.length) {
    return res.status(400).json({ success: false, message: "No valid fields provided" });
  }

  values.push(id);

  const query = `UPDATE interview SET ${setClauses.join(", ")}, updatedAt = NOW() WHERE id = ?`;

  try {
    const [result] = await pool.execute(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    res.json({ success: true, message: "Interview updated successfully" });
  } catch (error) {
    next(error);
  }
};
