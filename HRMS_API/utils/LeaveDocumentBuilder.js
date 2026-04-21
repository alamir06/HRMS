import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEAVE_DOC_LOGO_CID = 'inj-logo';
const LEAVE_DOC_STAMP_CID = 'hr-stamp';

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

export const getLeaveDocumentImageAttachments = () => {
  const imageMap = [
    { fileName: 'inj-logo.jpg', cid: LEAVE_DOC_LOGO_CID, contentType: 'image/jpeg' },
    { fileName: 'stamp.svg', cid: LEAVE_DOC_STAMP_CID, contentType: 'image/svg+xml' },
  ];

  return imageMap
    .map(({ fileName, cid, contentType }) => {
      const filePath = resolveImagePath(fileName);
      if (!filePath) {
        console.warn(`Could not locate image ${fileName} in assets or utils.`);
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

export const generateLeaveDocumentHTML = (employee, leave, balanceData = null) => {
  const logoSrc = `cid:${LEAVE_DOC_LOGO_CID}`;
  const stampSrc = `cid:${LEAVE_DOC_STAMP_CID}`;

  const isClearance = leave.leaveType === 'ORGANIZATION_LEAVE';

  const isAcademic = !!employee.collegeName;
  let jobProcessDisplay = employee.title || '';
  if (isAcademic && employee.role === 'EMPLOYEE') {
    jobProcessDisplay = 'Lecturer';
  } else if (!isAcademic) {
    jobProcessDisplay = employee.departmentName ? employee.departmentName + ' Manager' : 'Manager';
  }
  const caseTeamDisplay = employee.departmentName || 'N/A';
  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();

  const commonStyles = `
    body { font-family: 'Arial', sans-serif; color: #111; line-height: 1.5; font-size: 13px; }
    .container { max-width: 800px; margin: 0 auto; padding: 30px; background: #fff; border: 1px solid #ddd; }
    .header-box { display:flex; justify-content:space-between; align-items:center; border: 1px solid #000; padding:10px; margin-bottom: 20px;}
    .header-left { flex: 1; font-weight:bold; font-size:12px; }
    .header-middle { flex: 1; text-align:center; font-weight:bold; font-size:12px; }
    .header-right { flex: 1; text-align:right; font-weight:bold; font-size:12px; }
    .header-logo { text-align:center; margin:5px 0; }
    .header-logo img { max-width: 80px; height: auto; }
    .dotted-box { border-bottom: 1px dotted #000; display:inline-block; text-align:center; }
  `;

  // Matches perfectly with the uploaded image's 3-column header
  const headerHTML = `
    <div class="header-box">
      <div class="header-left">
        <div style="margin-bottom:3px;">በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ</div>
        <div style="margin-bottom:3px;">የትምህርት ሚኒስቴር</div>
        <div style="margin-bottom:3px;">የእንጅባራ ዩኒቨርሲቲ</div>
        <div>የብቃትና የሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</div>
      </div>
      <div class="header-middle">
        <div style="margin-bottom:3px;">እንጅባራ ዩኒቨርሲቲ</div>
        <div style="margin-bottom:3px;">INJIBARA UNIVERSITY</div>
        <div class="header-logo"><img src="${logoSrc}" alt="Logo" /></div>
      </div>
      <div class="header-right">
        <div style="margin-bottom:3px;">The Federal Democratic Republic of Ethiopia</div>
        <div style="margin-bottom:3px;">Ministry of Education</div>
        <div style="margin-bottom:3px;">Injibara University</div>
        <div>Competency & Human Resource Management Executive</div>
      </div>
    </div>
  `;

  const standardLeaveForm = `
    <html>
      <head><style>${commonStyles}</style></head>
      <body>
        <div class="container">
          ${headerHTML}
          
          <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:14px;">
            <div style="flex:1;">
              <div style="margin-bottom:10px;">
                <strong>ለአቶ/ወ/ሮ/ወ/ሪት:</strong> <u>${escapeHtml(fullName)}</u> &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>የመታወቂያ ቁጥር:</strong> <u>${escapeHtml(employee.employeeCode || '____________')}</u>
              </div>
              <div style="font-weight:bold; margin-top:20px;">
                <u style="font-size: 16px;">እንጅባራ ዩኒቨርሲቲ//</u>
              </div>
            </div>
            <div style="text-align:right; flex:0 0 200px;">
               <div style="margin-bottom:10px;"><strong>ቁጥር:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
               <div><strong>ቀን:</strong> <u>${new Date().toLocaleDateString()}</u></div>
            </div>
          </div>

          <div style="text-align: center; font-size: 18px; font-weight: bold; margin: 30px 0; text-decoration: underline;">
            የሠራተኞች ፈቃድ መጠየቂያ ፎርም
          </div>

          <ol style="line-height:2.2; font-size:14px; margin-bottom: 20px; padding-left:20px;">
            <li style="margin-bottom: 10px;"> 
              <strong>የሚሰሩበት የስራ ሂደት:</strong> <span style="margin-right: 20px;"><u>${escapeHtml(jobProcessDisplay)}</u></span>
              <strong>ኬዝ/ቲም ቡድን:</strong> <span><u>${escapeHtml(caseTeamDisplay)}</u></span>
            </li>
            <li style="margin-bottom: 15px;"> 
              <strong>ፈቃድ የተሰጠበት ምክንያት:</strong>
              <div style="margin-top: 5px; padding: 10px; border: 1px dashed #777; background: #fafafa; border-radius: 4px; display: block; max-width: 100%; word-wrap: break-word; overflow-wrap: break-word;">
                ${escapeHtml(leave.reason || 'N/A')}
              </div>
            </li>
            <li style="margin-bottom: 10px;"> 
              <strong>የጠየቁት ፈቃድ አይነት:</strong> <u>${escapeHtml(leave.leaveType.replace('_', ' '))}</u>
            </li>
            <li style="margin-bottom: 10px;">
              <strong>ፈቃድ የተጠየቀበት ጊዜ፡</strong> ከ <u>${new Date(leave.startDate).toLocaleDateString()}</u> እስከ <u>${new Date(leave.endDate).toLocaleDateString()}</u> 
              የ <u>${leave.totalDays}</u> የስራ ቀናት እንዲፈቀድልኝ እጠይቃለሁ:: <br/>
              <div style="margin-left: 20px; margin-top:5px;">
                <strong>ፊርማ:</strong> <u>(Electronic Request)</u> &nbsp;&nbsp;&nbsp;&nbsp; 
                <strong>ቀን:</strong> <u>${new Date(leave.createdAt).toLocaleDateString()}</u>
              </div>
            </li>
            <li style="margin-bottom: 10px;"> 
              <strong>ፈቃድ ይዘው የሚሄዱበት ቦታ:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&nbsp;&nbsp;&nbsp; 
              <strong>ስ.ቁጥር:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>
            </li>
            <li style="margin-bottom: 10px;"> 
              <strong>የፈቃድ ጠያቂው የቅርብ ሀላፊ አስተያየት:</strong> <u>${escapeHtml(leave.comments || 'System Approved')}</u><br/>
              <div style="margin-left: 20px; margin-top:5px;">
                <strong>ስም:</strong> <u>HR Manager</u> &nbsp;&nbsp;&nbsp;&nbsp; 
                <strong>ፊርማ:</strong> <u>(Approved)</u> &nbsp;&nbsp;&nbsp;&nbsp; 
                <strong>ቀን:</strong> <u>${new Date(leave.approvedAt ? leave.approvedAt : new Date()).toLocaleDateString()}</u>
              </div>
            </li>
          </ol>

          <div style="font-weight:bold; margin-bottom:10px; margin-top:30px; font-size:14px; text-decoration: underline;">በሰው ሀብት ልማት የሚሞላ</div>
          <div style="margin-left:20px; line-height:2.0; font-size:14px;">
            <strong>7. የእስካሁን የአመት ፈቃድ:</strong><br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; የ2015 ዓ/ም: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; የ2016 ዓ/ም: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; የ2017 ዓ/ም: <u>&nbsp;&nbsp;&nbsp;&nbsp;${balanceData ? balanceData.totalAllocatedDays : ''}&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>የተፈቀደ:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;${leave.totalDays}&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
          </div>
          
          <div style="margin-top:20px; line-height:2.0; font-size:14px; text-align: justify;">
            <strong>ቀሪ ፈቃድ:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;${balanceData ? balanceData.remainingDays : ''}&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀን ያለዎት ሲሆን 
            ከ <u>${new Date(leave.startDate).toLocaleDateString()}</u> ጀምሮ 
            እስከ <u>${new Date(leave.endDate).toLocaleDateString()}</u> ድረስ
              <u>${leave.totalDays}</u> የስራ ቀናት ፈቃድ የተሰጠዎት መሆኑን አውቀዉ 
            ከ <u>${new Date(leave.endDate).toLocaleDateString()}</u> ጀምሮ በመደበኛ ስራ ቦታዎ ላይ እንዲገኙ እናሳስባለን::
          </div>

          <div style="text-align:right; font-weight:bold; font-size:16px; margin-top:30px;">
            "ከሰላምታ ጋር"
          </div>

          <div style="text-align:center; margin-top:10px;">
            <img src="${stampSrc}" alt="Stamp" style="max-width:150px; opacity:0.8;" />
          </div>

          <div style="margin-top:30px; font-size:14px;">
            <div style="font-weight:bold; font-size:16px; text-decoration:underline;">ግልባጭ//</div>
            <ul style="list-style-type:none; padding-left:20px; line-height:2.0; font-weight:bold; margin-top:10px;">
              <li>➢ ለብቃትና የሰው ሀብት አስተዳደር ሥራ ክፍል</li>
              <li>➢ <span class="dotted-box" style="width:300px; text-align:left; border-bottom: 1px dashed black;">${employee.departmentName ? 'ለ ' + employee.departmentName + ' ት/ክፍል' : ''}</span></li>
              <li>➢ ለብቃትና የሰው ሀብት ልማት ቡድን</li>
              <li style="margin-left: 25px; text-decoration:underline; margin-top: 10px;">እንጅባራ ዩኒቨርሲቲ//</li>
            </ul>
            <div style="margin-top: 20px; text-decoration:underline;">
              <strong>ማሳሰቢያ:-</strong> ፈቃድዎን አንድ ቀን ቀድመው ማሳወቂያ ይጠበቅብዎታል:: በእጅጉን ጊዜ ተሰርቶ ይላካል::
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const clearanceForm = `
    <html>
      <head><style>${commonStyles}</style></head>
      <body>
        <div class="container">
          ${headerHTML}
          <div style="text-align:right; font-weight:bold;">ቀን: ${new Date().toLocaleDateString()}</div>
          <div style="text-align: center; font-size: 20px; font-weight: bold; margin: 30px 0; text-decoration: underline;">የመለቀቂያ ቅፅ</div>
          
          <div style="margin-bottom: 20px; line-height: 1.8;">
            <strong>ለአቶ/ወይዘሮ/ዶ/ር: <u>${escapeHtml(fullName)}</u></strong><br/>
            <strong>እንጅባራ ዩኒቨርሲቲ!</strong>
          </div>

          <div style="margin-top:20px; margin-bottom: 20px;"><strong>ጉዳዩ:- <u>የሥራ መልቀቂያ ማረጋገጫ ስለመስጠት</u></strong></div>

          <p style="text-indent: 40px; margin-top:20px; text-align: justify;">
             በእንጅባራ ዩኒቨርሲቲ በ <strong>${escapeHtml(employee.collegeName || '')}</strong> ኮሌጅ ስር በሚገኘው የ <strong>${escapeHtml(employee.departmentName || '')}</strong> ት/ክፍል ወስጥ በ <strong>${escapeHtml(employee.title || '')}</strong> የሥራ መደብ ላይ በ <strong>${escapeHtml(employee.salary || '')}</strong> ደመወዝ ተቀጥረው ሲያገለግሉ የነበረ ሲሆን እስከ <strong>${new Date(leave.startDate).toLocaleDateString()}</strong> ድረስ በማገልገል በተቋሙ የሥራ መለያየት ሂደት መሰረት አገልግሎታቸው የተጠናቀቀ ስለሆነ ይህ የመለቀቂያ ማረጋገጫ ተሰጥቷቸዋል።
          </p>
          
          <ol style="line-height:2.2; margin-top: 20px;">
            <li>የሠራተኛው ስም: <strong>${escapeHtml(fullName)}</strong></li>
            <li>የመታወቂያ ቁጥር: <strong>${escapeHtml(employee.employeeCode || '')}</strong></li>
            <li>የቅጥር ሁኔታ: <strong>Full Time</strong></li>
            <li>የስራ ክፍል: <strong>${escapeHtml(employee.departmentName || '')}</strong></li>
            <li>የስራ መደቡ: <strong>${escapeHtml(employee.title || '')}</strong></li>
            <li>የወርሃዊ ደመወዝ: <strong>${escapeHtml(employee.salary ? employee.salary + ' ETB' : '')}</strong></li>
            <li>የተቀጠሩበት ቀን: <strong>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : ''}</strong></li>
            <li>ለመጨረሻ ጊዜ የተከፈለዎ የወርሃዊ ደመወዝ እስከ: <strong>${new Date(leave.startDate).toLocaleDateString()}</strong></li>
            <li>ምክንያት: <strong>${escapeHtml(leave.reason || 'ORGANIZATION LEAVE (Termination)')}</strong></li>
          </ol>

          <p style="margin-top:20px;">የዩኒቨርሲቲውን ንብረት አስረክበው እና ከእዳ ነፃ መሆናቸውን አረጋግጠናል።</p>

          <div style="text-align:center; font-weight:bold; margin-top:40px; font-size: 18px;">ከሠላምታ ጋር</div>

          <div style="text-align:center; margin-top:10px;">
            <img src="${stampSrc}" alt="Stamp" style="max-width:150px; opacity:0.8;"/>
          </div>

          <div style="margin-top:40px; font-size:14px;">
            <p><strong><u>ግልባጭ (CC):</u></strong></p>
            <ul>
              <li>ለፕሬዚዳንት ጽ/ቤት</li>
              <li>ለአካዳሚክ ጉዳዮች ም/ፕሬዚዳንት</li>
              <li>ለአስተዳደር እና ልማት ም/ፕሬዚዳንት</li>
              <li>ለብቃትና የሰው ሀብት አስተዳደር ሥራ ክፍል</li>
              <li>ለ <strong>${employee.collegeName || '_______________'}</strong> ኮሌጅ / <strong>${employee.departmentName || '_______________'}</strong> ት/ክፍል</li>
              <li>እንጅባራ ዩኒቨርሲቲ</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;

  return isClearance ? clearanceForm : standardLeaveForm;
};
