import nodeHtmlToImage from 'node-html-to-image';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateRecruitmentImage = async (jobs) => {
  if (!jobs || jobs.length === 0) return null;

  // Grab the first job's recruitmentType to determine layout
  const isAcademic = jobs[0].recruitmentType === "ACADEMIC";

  // Load physical stamp
  let stampSrc = "";
  try {
    const stampPath = path.join(__dirname, '../../utils/stamp.svg');
    if (fs.existsSync(stampPath)) {
      const stampBuffer = fs.readFileSync(stampPath);
      stampSrc = `data:image/svg+xml;base64,${stampBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error("Stamp missing:", err);
  }

  const formatRequirements = (reqStr) => {
    if (!reqStr) return "";
    return reqStr.replace(/,/g, '፤ ');
  };

  // Sort and calculate rowspans for Academic template
  if (isAcademic) {
    jobs.sort((a, b) => {
      const cA = a.collegeName || "N/A";
      const cB = b.collegeName || "N/A";
      if (cA !== cB) return cA.localeCompare(cB);
      const dA = a.departmentName || "N/A";
      const dB = b.departmentName || "N/A";
      return dA.localeCompare(dB);
    });

    let currentCollege = null;
    let currentDept = null;
    let collegeStartIndex = 0;
    let deptStartIndex = 0;
    let collegeCounter = 0;

    jobs.forEach((job, index) => {
      const cName = job.collegeName || "N/A";
      const dName = job.departmentName || "N/A";

      job.hideCollege = false;
      job.hideDept = false;

      if (cName !== currentCollege) {
        collegeCounter++;
        job.collegeIndex = collegeCounter;
        job.collegeRowspan = 1;
        collegeStartIndex = index;
        
        job.deptRowspan = 1;
        deptStartIndex = index;
        
        currentCollege = cName;
        currentDept = dName;
      } else {
        job.hideCollege = true;
        jobs[collegeStartIndex].collegeRowspan++;
        
        if (dName !== currentDept) {
          job.deptRowspan = 1;
          deptStartIndex = index;
          currentDept = dName;
        } else {
          job.hideDept = true;
          jobs[deptStartIndex].deptRowspan++;
        }
      }
    });
  }

  const administrativeHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { width: 1200px; padding: 40px; font-family: 'Times New Roman', Times, serif; background: white; color: black; margin: 0;}
        h2, h3, h4 { text-align: center; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top; }
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .footer { margin-top: 30px; font-size: 14px; line-height: 1.6; }
        .stamp-container { display: flex; justify-content: center; margin-top: 30px; }
        .stamp-container img { max-width: 150px; opacity: 0.8; }
      </style>
    </head>
    <body>
      <div style="background: #0b8255; color: white; padding: 20px; border-radius: 8px; width: 90%; margin: 0 auto 30px auto; display: block; text-align: center;">
        <h1 style="margin: 0; font-size: 32px; letter-spacing: 2px;">INJIBARA UNIVERSITY</h1>
        <h3 style="margin: 5px 0 0 0; font-weight: normal;">Human Resource Management</h3>
      </div>
      <h2>ክፍት የስራ መደብ ማስታወቂያ</h2>
      <h4>የኢንጅባራ ዩኒቨርሲቲ ከዚህ በታች በተገለፁት ክፍት የስራ መደቦች ላይ ሰራተኞችን አወዳድሮ ለመቅጠር ይፈልጋል፡፡</h4>
      
      <table>
        <thead>
          <tr>
            <th>ተ.ቁ</th>
            <th>የስራ መደቡ መጠሪያ</th>
            <th>ብዛት</th>
            <th>ደረጃ</th>
            <th>ደመወዝ</th>
            <th>የመደብ መ/ቁጥር</th>
            <th>የትምህርት ደረጃ</th>
            <th>አስፈላጊ የትምህርት ዝግጅት/እውቀት</th>
            <th>የስራ ልምድ አገልግሎት</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map((job, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><b>${job.jobTitleAmharic || job.jobTitle || ""}</b></td>
              <td>${job.vacancies}</td>
              <td>${job.level || "-"}</td>
              <td>${job.salaryRange || "As per scale"}</td>
              <td>${job.referenceNumber || "-"}</td>
              <td>${job.educationLevel || "-"}</td>
              <td>${formatRequirements(job.requirementsAmharic || job.requirements)}</td>
              <td>${job.experienceRequired || "-"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div style="font-weight: bold; margin-bottom: 5px; text-decoration: underline;">ማሳሰቢያ:-</div>
        <div style="white-space: pre-wrap; line-height: 1.8; padding-left: 10px;">${jobs[0].notesAmharic || "ከላይ ለተገለጹት የስራ መደቦች አመልካቾች ይህ ማስታወቂያ ከወጣበት ቀን ጀምሮ ባሉት ተከታታይ የስራ ቀናት ውስጥ ማመልከት ይችላሉ፡፡"}</div>
      </div>

      <div class="stamp-container">
         ${stampSrc ? `<img src="${stampSrc}" alt="Official Stamp" />` : ''}
      </div>
    </body>
    </html>
  `;

  const academicHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { width: 1200px; padding: 40px; font-family: 'Times New Roman', Times, serif; background: white; color: black; margin: 0;}
        h2, h3, h4 { text-align: center; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top;}
        th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        .footer { margin-top: 30px; font-size: 14px; line-height: 1.6;}
        .stamp-container { display: flex; justify-content: center; margin-top: 30px; }
        .stamp-container img { max-width: 150px; opacity: 0.8; }
      </style>
    </head>
    <body>
      <div style="background: #0b8255; color: white; padding: 20px; border-radius: 8px; width: 90%; margin: 0 auto 30px auto; display: block; text-align: center;">
        <h1 style="margin: 0; font-size: 32px; letter-spacing: 2px;">INJIBARA UNIVERSITY</h1>
        <h3 style="margin: 5px 0 0 0; font-weight: normal;">Academic Staff Recruitment</h3>
      </div>
      <h2>Vacancy Announcement</h2>
      <h4>Injibara University is seeking to fill the following vacant positions. Hence interested and qualified candidates are invited to apply.</h4>
      
      <table>
        <thead>
          <tr>
            <th>N/O</th>
            <th>College</th>
            <th>Department</th>
            <th>Field of Specialization</th>
            <th>Background (First or second degree)</th>
            <th>Academic Rank</th>
            <th>Required Number</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map((job) => `
            <tr>
              ${!job.hideCollege ? `<td rowspan="${job.collegeRowspan}">${job.collegeIndex}</td>` : ''}
              ${!job.hideCollege ? `<td rowspan="${job.collegeRowspan}">${job.collegeName || "N/A"}</td>` : ''}
              ${!job.hideDept ? `<td rowspan="${job.deptRowspan}">${job.departmentName || "N/A"}</td>` : ''}
              <td><b>${job.specialization || job.specializationAmharic || "-"}</b></td>
              <td>${job.educationLevel || "-"}</td>
              <td>${job.academicRank || job.academicRankAmharic || "-"}</td>
              <td>${job.vacancies}</td>
              <td>${job.remark || job.remarkAmharic || "-"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div style="font-weight: bold; margin-bottom: 5px; text-decoration: underline;">Notes:-</div>
        <div style="white-space: pre-wrap; line-height: 1.8; padding-left: 10px;">${jobs[0].notes || jobs[0].notesAmharic || "Applicants can apply within 10 consecutive working days from the date of this announcement."}</div>
      </div>

      <div class="stamp-container">
         ${stampSrc ? `<img src="${stampSrc}" alt="Official Stamp" />` : ''}
      </div>
    </body>
    </html>
  `;

  const htmlContent = isAcademic ? academicHTML : administrativeHTML;

  try {
    const image = await nodeHtmlToImage({
      html: htmlContent,
      transparent: false,
      puppeteerArgs: {
        defaultViewport: {
          width: 1200,
          height: 100,
          deviceScaleFactor: 2,
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    return image;
  } catch (error) {
    console.error("Failed to generate recruitment HTML image:", error);
    throw error;
  }
};
