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
  jobTitle: record.job_title,
  jobTitleAmharic: record.job_title_amharic,
  departmentId: record.department_id,
  designationId: record.designation_id,
  departmentName: record.department_name,
  designationName: record.designation_name,
  jobDescription: record.job_description,
  jobDescriptionAmharic: record.job_description_amharic,
  requirements: record.requirements,
  requirementsAmharic: record.requirements_amharic,
  vacancies: record.vacancies,
  experienceRequired: record.experience_required,
  salaryRange: record.salary_range,
  status: record.status,
  postedDate: record.posted_date,
  closingDate: record.closing_date,
  createdBy: record.created_by,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapApplicantRecord = (record) => ({
  id: record.id,
  recruitmentId: record.recruitment_id,
  recruitmentTitle: record.recruitment_job_title,
  firstName: record.first_name,
  firstNameAmharic: record.first_name_amharic,
  lastName: record.last_name,
  lastNameAmharic: record.last_name_amharic,
  email: record.email,
  phone: record.phone,
  resumeUrl: record.resume_url,
  coverLetter: record.cover_letter,
  coverLetterAmharic: record.cover_letter_amharic,
  currentCompany: record.current_company,
  currentPosition: record.current_position,
  totalExperience: record.total_experience,
  currentSalary: record.current_salary,
  expectedSalary: record.expected_salary,
  noticePeriod: record.notice_period,
  status: record.status,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const mapInterviewRecord = (record) => ({
  id: record.id,
  applicantId: record.applicant_id,
  interviewDate: record.interview_date,
  interviewTime: record.interview_time,
  interviewType: record.interview_type,
  interviewers: parseInterviewers(record.interviewers),
  location: record.location,
  locationAmharic: record.location_amharic,
  status: record.status,
  feedback: record.feedback,
  feedbackAmharic: record.feedback_amharic,
  rating: record.rating,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

export const createRecruitment = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      job_title,
      job_title_amharic,
      department_id,
      designation_id,
      job_description,
      job_description_amharic,
      requirements,
      requirements_amharic,
      vacancies,
      experience_required,
      salary_range,
      status = "draft",
      posted_date,
      closing_date,
      created_by,
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO recruitment (
        id, job_title, job_title_amharic, department_id, designation_id,
        job_description, job_description_amharic, requirements, requirements_amharic,
        vacancies, experience_required, salary_range, status, posted_date, closing_date,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(insertQuery, [
      id,
      job_title,
      job_title_amharic,
      department_id,
      designation_id,
      job_description,
      job_description_amharic,
      requirements,
      requirements_amharic,
      vacancies,
      experience_required,
      salary_range,
      status,
      posted_date,
      closing_date,
      created_by,
    ]);

    await connection.commit();

    if (status === "open") {
      await telegramNotifier.notifyJobPosting({
        id,
        title: job_title,
        description: job_description,
        requirements,
        closingDate: closing_date,
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
      SELECT r.*, d.name AS department_name, ds.name AS designation_name
      FROM recruitment r
      LEFT JOIN department d ON d.id = r.department_id
      LEFT JOIN designation ds ON ds.id = r.designation_id
      ORDER BY r.created_at DESC
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
      SELECT r.*, d.name AS department_name, ds.name AS designation_name
      FROM recruitment r
      LEFT JOIN department d ON d.id = r.department_id
      LEFT JOIN designation ds ON ds.id = r.designation_id
      WHERE r.id = ?
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
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (!setClauses.length) {
    return res.status(400).json({ success: false, message: "No valid fields provided" });
  }

  values.push(id);

  const query = `UPDATE recruitment SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = ?`;

  try {
    const [result] = await pool.execute(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Recruitment not found" });
    }

    if (fields.status === "open") {
      const [records] = await pool.query(
        `SELECT job_title, job_description, requirements, closing_date, vacancies FROM recruitment WHERE id = ?`,
        [id]
      );

      if (records.length > 0) {
        const record = records[0];
        await telegramNotifier.notifyJobPosting({
          id,
          title: record.job_title,
          description: record.job_description,
          requirements: record.requirements,
          closingDate: record.closing_date,
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
  const query = "DELETE FROM recruitment WHERE id = ?";

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
      recruitment_id,
      first_name,
      first_name_amharic,
      last_name,
      last_name_amharic,
      email,
      phone,
      resume_url,
      cover_letter,
      cover_letter_amharic,
      current_company,
      current_position,
      total_experience,
      current_salary,
      expected_salary,
      notice_period,
      status = "applied",
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO applicant (
        id, recruitment_id, first_name, first_name_amharic, last_name, last_name_amharic,
        email, phone, resume_url, cover_letter, cover_letter_amharic, current_company,
        current_position, total_experience, current_salary, expected_salary, notice_period, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(insertQuery, [
      id,
      recruitment_id,
      first_name,
      first_name_amharic,
      last_name,
      last_name_amharic,
      email,
      phone,
      resume_url,
      cover_letter,
      cover_letter_amharic,
      current_company,
      current_position,
      total_experience,
      current_salary,
      expected_salary,
      notice_period,
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
      SELECT a.*, r.job_title AS recruitment_job_title
      FROM applicant a
      LEFT JOIN recruitment r ON r.id = a.recruitment_id
      WHERE (? IS NULL OR a.recruitment_id = ?)
      ORDER BY a.created_at DESC
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

  const query = `UPDATE applicant SET status = ?, updated_at = NOW() WHERE id = ?`;

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
      applicant_id,
      interview_date,
      interview_time,
      interview_type,
      interviewers,
      location,
      location_amharic,
      status = "scheduled",
      feedback,
      feedback_amharic,
      rating,
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO interview (
        id, applicant_id, interview_date, interview_time, interview_type, interviewers,
        location, location_amharic, status, feedback, feedback_amharic, rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(insertQuery, [
      id,
      applicant_id,
      interview_date,
      interview_time,
      interview_type,
      interviewers ? JSON.stringify(interviewers) : null,
      location,
      location_amharic,
      status,
      feedback,
      feedback_amharic,
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
      SELECT i.*, a.first_name, a.last_name
      FROM interview i
      LEFT JOIN applicant a ON a.id = i.applicant_id
      WHERE (? IS NULL OR i.applicant_id = ?)
      ORDER BY i.interview_date DESC, i.interview_time DESC
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

  const query = `UPDATE interview SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = ?`;

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
