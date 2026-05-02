import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REC_DOC_LOGO_CID = 'inj-logo';
const REC_DOC_STAMP_CID = 'hr-stamp';

const resolveImagePath = (fileName) => {
  const candidatePaths = [
    path.join(__dirname, '..', '..', 'HRMS_UI', 'src', 'assets', fileName),
    path.join(__dirname, fileName),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const getRecommendationImageAttachments = () => {
  const imageMap = [
    { fileName: 'inj-logo.jpg', cid: REC_DOC_LOGO_CID, contentType: 'image/jpeg' },
    { fileName: 'stamp.svg', cid: REC_DOC_STAMP_CID, contentType: 'image/svg+xml' },
  ];

  return imageMap
    .map(({ fileName, cid, contentType }) => {
      const filePath = resolveImagePath(fileName);
      if (!filePath) {
        return null;
      }

      return {
        filename: fileName,
        path: filePath,
        cid,
        contentType,
      };
    })
    .filter(Boolean);
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const generateRecommendationHTML = (employee, recommendation, hrName) => {
  const logoSrc = `cid:${REC_DOC_LOGO_CID}`;
  const stampSrc = `cid:${REC_DOC_STAMP_CID}`;

  const fullName = `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.trim();
  const departmentName = employee.departmentName || '__________';
  const hireDate = employee.hireDate ? new Date(employee.hireDate).getFullYear() : '__________';
  const currentDate = new Date().toLocaleDateString('am-ET');

  const styles = {
    body: "font-family: 'Arial', sans-serif; color: #111; line-height: 1.6; font-size: 14px;",
    container: "max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; border: 1px solid #ddd; position: relative;",
    headerBox: "text-align: center; margin-bottom: 30px;",
    headerLogo: "margin-bottom: 10px;",
    headerLogoImg: "max-width: 100px; height: auto;",
    title: "text-align: center; font-size: 18px; font-weight: bold; margin: 30px 0; text-decoration: underline;",
    content: "text-align: justify; margin-bottom: 40px; text-indent: 40px;",
    signatureArea: "margin-top: 50px; text-align: right;",
    stampArea: "text-align: center; margin-top: -30px; margin-right: 150px;",
    refDate: "display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold;"
  };

  let title = '';
  let content = '';

  switch (recommendation.recommendationType) {
    case 'EDUCATION':
      title = 'የምስክር ወረቀት እንዲሰጠኝ ስለመጠየቅ';
      content = `
        ጉዳዩ የትምህርት ማስረጃን ለማምጣት ስለመፈለግ ማስረጃ እንዲሰጠኝ፤ <br/><br/>
        እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${escapeHtml(fullName)}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${escapeHtml(departmentName)}</strong> ክፍል ሰራተኛ ስሆን፣ 
        በ <strong>${escapeHtml(recommendation.institutionName || '_________________')}</strong> ገብቼ የ <strong>${escapeHtml(recommendation.degreeProgram || '_________________')}</strong> ትምህርቴን 
        ለመከታተል እንድችል ይህ የሥራ ልምድ እና የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።
      `;
      break;

    case 'PROFESSIONAL_LICENSE':
      title = 'ማስረጃ እንዲሰጠኝ ስለመጠየቅ';
      content = `
        ጉዳዩ፡- ለሙያ ፈቃድ ለማውጣት ማስረጃ እንዲሰጠኝ፤ <br/><br/>
        እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${escapeHtml(fullName)}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${escapeHtml(departmentName)}</strong> ክፍል ውስጥ 
        ከ <strong>${escapeHtml(hireDate)}</strong> ዓ.ም ጀምሮ በመስራት ላይ እገኛለሁ። ከጤና ሚኒስቴር / ከሚመለከተው የሙያ ፈቃድ ሰጪ አካል 
        የሙያ ፈቃድ ለማውጣት እንድችል ይህ የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።
      `;
      break;

    case 'MAYOR_OFFICE':
      title = 'ማስረጃ እንዲሰጠኝ ስለመጠየቅ';
      content = `
        ጉዳዩ፡- ለእንግዲህ ከተማ አስተዳደር ከንቲባ ጽ/ቤት ማስረጃ እንዲሰጠኝ፤ <br/><br/>
        እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${escapeHtml(fullName)}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${escapeHtml(departmentName)}</strong> ክፍል ሰራተኛ ስሆን፣ 
        ከ <strong>${escapeHtml(hireDate)}</strong> ዓ.ም ጀምሮ እያገለገልኩ እገኛለሁ። ለእንግዲህ ከተማ አስተዳደር ከንቲባ ጽ/ቤት 
        የምሰራበትን ሁኔታ የሚገልጽ የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።
      `;
      break;

    case 'MINISTRY_OF_EDUCATION':
      title = 'ማስረጃ እንዲሰጠኝ ስለመጠየቅ';
      content = `
        ጉዳዩ፡- ለትምህርት ሚኒስቴር ማስረጃ እንዲሰጠኝ፤ <br/><br/>
        እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${escapeHtml(fullName)}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${escapeHtml(departmentName)}</strong> ክፍል ሰራተኛ ስሆን፣ 
        ለትምህርት ሚኒስቴር ጉዳይ ለማስፈፀም እንዲረዳኝ ይህ የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።
      `;
      break;

    case 'WORK_EXPERIENCE':
    default:
      title = 'የሥራ ልምድ ማስረጃ እንዲሰጠኝ ስለመጠየቅ';
      content = `
        ጉዳዩ፡- የሥራ ልምድ ማስረጃ እንዲሰጠኝ፤ <br/><br/>
        እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${escapeHtml(fullName)}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${escapeHtml(departmentName)}</strong> ክፍል ሰራተኛ ስሆን፣ 
        ከ <strong>${escapeHtml(hireDate)}</strong> ዓ.ም ጀምሮ እስከ አሁን ድረስ በተለያዩ የሥራ መደቦች ላይ እያገለገልኩ እገኛለሁ። 
        ስለሆነም ይህንኑ የሥራ ልምዴን የሚገልጽ ህጋዊ የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።
      `;
      break;
  }

  return `
    <html>
      <body style="${styles.body}">
        <div style="${styles.container}">
          <div style="${styles.headerBox}">
            <div style="${styles.headerLogo}"><img src="${logoSrc}" alt="Logo" style="${styles.headerLogoImg}" /></div>
            <h2 style="margin: 5px 0; font-size: 22px;">እንጅባራ ዩኒቨርሲቲ</h2>
            <h3 style="margin: 5px 0; font-size: 18px;">INJIBARA UNIVERSITY</h3>
            <h4 style="margin: 5px 0; font-size: 16px;">የብቃትና የሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
          </div>

          <div style="${styles.refDate}">
            <div>ቁጥር፡ <u> ${recommendation.id.slice(0,8).toUpperCase()} </u></div>
            <div>ቀን፡ <u> ${currentDate} </u></div>
          </div>

          <div style="${styles.title}">${title}</div>

          <div style="${styles.content}">
            ${content}
          </div>

          <div style="${styles.signatureArea}">
            <div>"ከሰላምታ ጋር"</div>
            <div style="margin-top: 20px;">ፊርማ፡ _________________</div>
            <div style="margin-top: 10px;">ስም፡ <strong>${escapeHtml(hrName)}</strong></div>
            <div style="margin-top: 5px;">የሰው ሀብት አስተዳደር ኃላፊ</div>
          </div>

          <div style="${styles.stampArea}">
            <img src="${stampSrc}" alt="Stamp" style="max-width:150px; opacity:0.8;" />
          </div>

          <div style="margin-top: 50px; font-size: 12px; border-top: 1px solid #ccc; padding-top: 10px;">
            <p>ይህ ሰነድ በስርዓቱ የተረጋገጠ እና ትክክለኛ መሆኑን በሚመለከተው ክፍል ማረጋገጥ ይቻላል።</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
