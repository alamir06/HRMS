import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { recommendationService } from '../../../services/recommendationService';
import { FileText, Plus, CheckCircle, XCircle, Clock, GraduationCap, Stethoscope, Building, FileBadge, Check, X, ShieldCheck, Home, Eye } from 'lucide-react';
import './MyRecommendations.css';
import injLogo from '../../../assets/inj-logo.jpg';
import { formatEthiopianDate } from '../../../utils/dateTime';

const REC_TYPES = [
  { id: 'EDUCATION', icon: <GraduationCap size={24} />, labelEn: 'Education', labelAm: 'ትምህርት' },
  { id: 'PROFESSIONAL_LICENSE', icon: <Stethoscope size={24} />, labelEn: 'Professional License', labelAm: 'የሙያ ፈቃድ' },
  { id: 'MAYOR_OFFICE', icon: <Building size={24} />, labelEn: 'Mayor Office', labelAm: 'ከንቲባ ጽ/ቤት' },
  { id: 'MINISTRY_OF_EDUCATION', icon: <Building size={24} />, labelEn: 'Ministry of Education', labelAm: 'ትምህርት ሚኒስቴር' },
  { id: 'WORK_EXPERIENCE', icon: <FileBadge size={24} />, labelEn: 'Work Experience', labelAm: 'የስራ ልምድ' },
  { id: 'GUARANTEE_LETTER', icon: <ShieldCheck size={24} />, labelEn: 'Guarantee Form', labelAm: 'የዋስትና መጠየቂያ' },
  { id: 'HOUSING_COOPERATIVE', icon: <Home size={24} />, labelEn: 'Housing Cooperative', labelAm: 'የቤቶች ማህበር' }
];

const MyRecommendations = () => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewDetailsReq, setViewDetailsReq] = useState(null);
  
  // Form State
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    degreeProgram: '',
    institutionName: '',
    reason: '',
    guaranteeTypes: [], // Array of strings e.g. ['EMPLOYMENT', 'EDUCATION', 'LOAN']
    guaranteedPersonName: '',
    maritalStatus: '', // 'MARRIED', 'SINGLE', 'DIVORCED', 'WIDOWED'
    guaranteeTime: '' // 'FIRST', 'SECOND'
  });
  const [submitting, setSubmitting] = useState(false);

  const getPaperContent = (req) => {
    if (!req) return { title: '', content: '' };
    const fullName = `${req.firstName || user?.firstName || ''} ${req.lastName || user?.lastName || ''}`.trim();
    const departmentName = req.departmentName || user?.departmentName || '__________';
    const hireDate = req.hireDate || user?.hireDate ? new Date(req.hireDate || user?.hireDate).getFullYear() : '__________';
    
    // Attempt to parse JSON reason if applicable
    let parsedReason = {};
    try {
      if (req.reason && req.reason.startsWith('{')) {
        parsedReason = JSON.parse(req.reason);
      }
    } catch (e) {
      // Not JSON
    }

    switch (req.recommendationType) {
      case 'EDUCATION':
        return {
          title: '',
          content: `
            <div style="display: flex; justify-content: space-between; margin-bottom: 50px; font-weight: bold;">
              <div>ቀን <u>&nbsp;&nbsp;${formatEthiopianDate(req.requestDate || new Date())}&nbsp;&nbsp;</u></div>
              <div>አ.ዲ. ቁጥር <u>&nbsp;&nbsp;${req.employeeCode || user?.employeeCode || '____________'}&nbsp;&nbsp;</u></div>
            </div>
            <div style="font-weight: bold; margin-bottom: 20px;">
              ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ<br/>
              <u>እንጅባራ</u>
            </div>
            <div style="text-align: center; text-decoration: underline; font-weight: bold; margin-bottom: 30px;">
              ጉዳዩ የትምህርት ማስረጃዬን ለማምጣት ስለፈለግሁ ማስረጃ እንዲፃፍልኝ
            </div>
            <div style="line-height: 2;">
              እኔ ዶ/ር መ/ር/መ/ርት/አቶ/ወ/ሮ/ወ/ሪት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u><br/>
              1. ኮሌጅ <u>&nbsp;&nbsp;<strong>${req.collegeName || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              2. ትምህርት ክፍል <u>&nbsp;&nbsp;<strong>${departmentName}</strong>&nbsp;&nbsp;</u><br/>
              3. የመጀመሪያ ዲግሪዬን &nbsp;[${req.degreeProgram?.includes('1ኛ') ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}]<br/>
              4. የሁለተኛ ዲግሪዬን &nbsp;[${req.degreeProgram?.includes('2ኛ') ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}]<br/>
              5. የ3ኛ ዲግሪዬን &nbsp;[${req.degreeProgram?.includes('3ኛ') ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}]<br/>
              <br/>
              ከተማርኩበት <u>&nbsp;&nbsp;<strong>${req.institutionName || '__________________________________'}</strong>&nbsp;&nbsp;</u> ዩኒቨርሲቲ ለማምጣት ስለፈለግሁ ለአካዳሚክ ምክትል ፕሬዝዳንት ጽ/ቤት ማስረጃ እንዲፃፍልኝ ስል አመለክታለሁ፡፡
            </div>
            <div style="margin-top: 40px; text-align: center; float: right; width: 300px;">
              <p>«ከሰላምታ ጋር»</p>
              <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px; text-align: left; padding-left: 50px;">
                <div>ፊርማ ______________________</div>
                <div>ስም <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u></div>
              </div>
            </div>
            <div style="clear: both;"></div>
          `
        };
      case 'PROFESSIONAL_LICENSE':
        return {
          title: '',
          content: `
            <div style="text-align: center; margin-bottom: 40px; font-weight: bold;">
              ቀን <u>&nbsp;&nbsp;${formatEthiopianDate(req.requestDate || new Date())}&nbsp;&nbsp;</u>
            </div>
            <div style="font-weight: bold; margin-bottom: 20px;">
              ለብቃትና ለሰው ሀብት አስተዳደር ሥራ አስፈፃሚ<br/>
              <u>እንጅባራ ዩኒቨርሲቲ</u>
            </div>
            <div style="text-align: center; text-decoration: underline; font-weight: bold; margin-bottom: 30px;">
              ጉዳዩ፡ <u>ማስረጃ እንዲፃፍልኝ ስለመጠየቅ</u>
            </div>
            <div style="line-height: 2;">
              የእንጅባራ ዩኒቨርሲቲ የስራ ባልደረባ የሆንኩት ዶ/ር/አቶ/ወ/ሮ/ወ/ሪት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u><br/>
              <br/>
              1. በእንጅባራ ዩኒቨርሲቲ የቅጥር ቀን <u>&nbsp;&nbsp;<strong>${req.hireDate || user?.hireDate ? formatEthiopianDate(req.hireDate || user?.hireDate) : '_____ወር_____ዓ/ም_____'}</strong>&nbsp;&nbsp;</u><br/>
              2. የሙያ መስክ (Specialization) <u>&nbsp;&nbsp;<strong>${req.fieldOfSpecialization || user?.fieldOfSpecialization || req.designationName || user?.designationName || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              3. የአ.ዲ. ቁጥር <u>&nbsp;&nbsp;<strong>${req.employeeCode || user?.employeeCode || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              <br/>
              ከ <strong>${req.institutionName || 'አብክመ ጤና ቢሮ'}</strong> የሙያ ፈቃድ ለማውጣት ስለፈለግሁ ማስረጃ እንዲፃፍልኝ ስል አመልክታለሁ፡፡
            </div>
            <div style="margin-top: 50px; text-align: center; float: right; width: 350px;">
              <p>«ከሰላምታ ጋር»</p>
              <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px; text-align: left; padding-left: 50px;">
                <div>የአመልካች ፊርማ ______________________</div>
                <div>የአመልካች ስም አስከአያት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u></div>
              </div>
            </div>
            <div style="clear: both;"></div>
          `
        };
      case 'MAYOR_OFFICE':
        return {
          title: '',
          content: `
            <div style="font-weight: bold; margin-bottom: 20px;">
              ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ<br/>
              <u>እንጅባራ ፤</u>
            </div>
            <div style="text-align: center; font-weight: bold; margin-bottom: 30px;">
              ጉዳዩ፡- <u>ማስረጃ እንዲፃፍልኝ ስለመጠየቅ ፤</u>
            </div>
            <div style="line-height: 2;">
              የእንጅባራ ዩኒቨርሲቲ የስራ ባልደረባ የሆንኩት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u><br/>
              ከ <strong>${req.institutionName || 'እንጅባራ ከተማ አስተዳደር ከንቲባ ጽ/ቤት'}</strong> ${req.reason ? `<strong>${req.reason}</strong> ` : 'ቲን ናምበር ለማውጣት '}ስለፈለጉኝ 
              የእንጅባራ ዩኒቨርሲቲ ሰራተኛ ስለመሆኔ እና የቅጥር ዘመኔን የሚገልፅ ማስረጃ 
              ይፃፍልኝ ሲሉ በቀን <u>&nbsp;&nbsp;<strong>${formatEthiopianDate(req.requestDate || new Date())}</strong>&nbsp;&nbsp;</u> ባቀረቡት ማመልከቻ ጠይቀዋል፤፤<br/>
              <br/>
              በዚህም መሰረት ከላይ ስማቸው የተጠቀሰው ከ <u>&nbsp;&nbsp;<strong>${req.hireDate || user?.hireDate ? formatEthiopianDate(req.hireDate || user?.hireDate) : '_____ወር_____ዓ/ም_____'}</strong>&nbsp;&nbsp;</u> ጀምሮ 
              በእንጅባራ ዩኒቨርሲቲ <u>&nbsp;&nbsp;<strong>${req.designationName || user?.designationName || '_________________'}</strong>&nbsp;&nbsp;</u> ሆነው 
              በቋሚነት ተቀጥረው እያገለገሉ የሚገኙ መሆናቸውን እየገለፅን፤በእናንተ በኩል አስፈላጊውን 
              ትብብር እንዲደረግላቸው እናሳስባለን ፡፡
            </div>
            <div style="margin-top: 50px; text-align: center; float: right; width: 350px;">
              <p>«ከሰላምታ ጋር»</p>
            </div>
            <div style="clear: both;"></div>
          `
        };
      case 'MINISTRY_OF_EDUCATION':
        return {
          title: '',
          content: `
            <div style="text-align: center; margin-bottom: 40px; font-weight: bold;">
              ቀን <u>&nbsp;&nbsp;${formatEthiopianDate(req.requestDate || new Date())}&nbsp;&nbsp;</u>
            </div>
            <div style="font-weight: bold; margin-bottom: 20px;">
              ለ <strong>${req.institutionName || 'ትምህርት ሚኒስቴር'}</strong>
            </div>
            <div style="text-align: center; text-decoration: underline; font-weight: bold; margin-bottom: 30px;">
              ጉዳዩ፡ <u>ማስረጃ እንዲፃፍልኝ ስለመጠየቅ</u>
            </div>
            <div style="line-height: 2;">
              የእንጅባራ ዩኒቨርሲቲ የስራ ባልደረባ የሆንኩት ዶ/ር/አቶ/ወ/ሮ/ወ/ሪት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u><br/>
              <br/>
              1. በእንጅባራ ዩኒቨርሲቲ የቅጥር ቀን <u>&nbsp;&nbsp;<strong>${req.hireDate || user?.hireDate ? formatEthiopianDate(req.hireDate || user?.hireDate) : '_____ወር_____ዓ/ም_____'}</strong>&nbsp;&nbsp;</u><br/>
              2. የሙያ መስክ (Specialization) <u>&nbsp;&nbsp;<strong>${req.fieldOfSpecialization || user?.fieldOfSpecialization || req.designationName || user?.designationName || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              3. የአ.ዲ. ቁጥር <u>&nbsp;&nbsp;<strong>${req.employeeCode || user?.employeeCode || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              <br/>
              ጉዳይ ለማስፈፀም ${req.reason ? `(<strong>ምክንያት፡ ${req.reason}</strong>) ` : ''}እንዲረዳኝ ይህ የምስክር ወረቀት እንዲሰጠኝ ስል አመልክታለሁ፡፡
            </div>
            <div style="margin-top: 50px; text-align: center; float: right; width: 350px;">
              <p>«ከሰላምታ ጋር»</p>
              <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px; text-align: left; padding-left: 50px;">
                <div>የአመልካች ፊርማ ______________________</div>
                <div>የአመልካች ስም አስከአያት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u></div>
              </div>
            </div>
            <div style="clear: both;"></div>
          `
        };
      case 'GUARANTEE_LETTER':
        const gTypes = parsedReason.guaranteeTypes || [];
        return {
          title: 'የመምህራንና የአስተዳደር ሠራተኞች ማስረጃ መጠየቂያ ቅጽ',
          content: `
            <div style="line-height: 2;">
              1. ቅጹ የተሞላበት ቀን <u>&nbsp;&nbsp;${formatEthiopianDate(req.requestDate || new Date())}&nbsp;&nbsp;</u><br/>
              2. ማስረጃ እንዲፃፍለት ያመለከተው ሠራተኛ ስም ከነአያት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u><br/>
              3. የቅጥር ዋስትና &nbsp;[${gTypes.includes('EMPLOYMENT') ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}]<br/>
              4. የትምህርት ዋስትና &nbsp;[${gTypes.includes('EDUCATION') ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}]<br/>
              5. የገንዘብ ብድር ዋስትና &nbsp;[${gTypes.includes('LOAN') ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}]<br/>
              6. የተወለደበት ቀን <u>&nbsp;&nbsp;<strong>${user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('am-ET') : '________ ወር ________ ዓ/ም _________'}</strong>&nbsp;&nbsp;</u><br/>
              7. የሥራ ክፍል ት/ቤት/ኮሌጅ <u>&nbsp;&nbsp;<strong>${departmentName}</strong>&nbsp;&nbsp;</u><br/>
              8. የሥራ መደብ መጠሪያ <u>&nbsp;&nbsp;<strong>${req.jobTitle || user?.jobTitle || req.designationName || user?.designationName || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              9. የሠራተኛው መታወቂያ ቁጥር <u>&nbsp;&nbsp;<strong>${req.employeeCode || user?.employeeCode || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              10. የወር ደመወዝ መጠን <u>&nbsp;&nbsp;<strong>${req.salary || user?.salary ? (req.salary || user.salary) + ' ብር' : '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              11. ማስረጃ የሚፃፍለት መ/ቤት <u>&nbsp;&nbsp;<strong>${req.institutionName || parsedReason.institutionName || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              12. ዋስትና የምትሰጠው ሰው ስም ከነአያት <u>&nbsp;&nbsp;<strong>${parsedReason.guaranteedPersonName || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              13. የጋብቻ ሁኔታ &nbsp;&nbsp;&nbsp; ያገባ [${parsedReason.maritalStatus === 'MARRIED' ? '✔' : '&nbsp;&nbsp;'}] &nbsp;&nbsp; ያላገባ [${parsedReason.maritalStatus === 'SINGLE' ? '✔' : '&nbsp;&nbsp;'}] &nbsp;&nbsp; የፈታ [${parsedReason.maritalStatus === 'DIVORCED' ? '✔' : '&nbsp;&nbsp;'}] &nbsp;&nbsp; በሞት የተለየ [${parsedReason.maritalStatus === 'WIDOWED' ? '✔' : '&nbsp;&nbsp;'}]<br/>
              14. ዋስትና የሚገቡት &nbsp;&nbsp;&nbsp; ለመጀመሪያ ጊዜ [${parsedReason.guaranteeTime === 'FIRST' ? '✔' : '&nbsp;&nbsp;'}] &nbsp;&nbsp; ለሁለተኛ ጊዜ [${parsedReason.guaranteeTime === 'SECOND' ? '✔' : '&nbsp;&nbsp;'}]<br/>
              15. ከላይ ከተ/ቁ 1-14 የሰጠሁት መረጃ ትክክለኛ መሆኑን በማረጋገጥ ማስረጃ እንዲሰጠኝ እመለክታለሁ፡፡<br/><br/>
              <div style="text-align: center; margin-top: 20px;">«ከሠላምታ ጋር»</div>
              <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                <div>የአመልካች ፊርማ ______________________</div>
                <div>የአመልካች ስም <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u></div>
                <div>ቀን <u>&nbsp;&nbsp;${formatEthiopianDate(req.requestDate || new Date())}&nbsp;&nbsp;</u></div>
              </div>
            </div>
          `
        };
      case 'HOUSING_COOPERATIVE':
        return {
          title: 'ጉዳዩ፡ የማስረጃ እንዲፃፍልኝ ስለመጠየቅ',
          content: `
            እኔ ዶ/ር/ፕ/ር/መ/ር/ት/አቶ/ወ/ሮ/ወ/ሪት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u> 
            የቤቶች ማህበር ለመደራጀት ስለፈለግሁ በእንጅባራ ዩኒቨርሲቲ የቅጥር ዘመን እና የደመወዝ መጠን እና የስራ ድርሻ ተገልፆ 
            በእንጅባራ ከተ/አስ/ ህ/ሥ/ ማህበር ማደራጃ ጽ/ቤት እንዲፃፍልኝ እጠይቃለሁ፡፡<br/><br/>
            
            <div style="line-height: 2; margin-top: 20px;">
              1. በእንጅባራ ዩኒቨርሲቲ የቅጥር ዘመን <u>&nbsp;&nbsp;<strong>ከ ${hireDate} ዓ.ም ጀምሮ</strong>&nbsp;&nbsp;</u><br/>
              2. የሥራ መደብ መጠሪያ <u>&nbsp;&nbsp;<strong>${req.jobTitle || user?.jobTitle || req.designationName || user?.designationName || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              3. የወር ደመወዝ <u>&nbsp;&nbsp;<strong>${req.salary || user?.salary ? (req.salary || user.salary) + ' ብር' : '_________________'}</strong>&nbsp;&nbsp;</u> መሆኑን እገልፃለሁ፡፡<br/>
            </div>
            
            <br/>
            <div style="text-align: center; margin-top: 20px;">«ከሠላምታ ጋር»</div>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px; text-align: right;">
              <div>የአመልካች ፊርማ ______________________</div>
              <div>የአመልካች ስም <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u></div>
            </div>
          `
        };
      case 'WORK_EXPERIENCE':
      default:
        let parsedWorkReason = {};
        try {
          if (req.reason && req.reason.startsWith('{')) {
            parsedWorkReason = JSON.parse(req.reason);
          }
        } catch (e) {}
        const additionalExp = parsedWorkReason.additionalExperience || '';

        return {
          title: '',
          content: `
            <div style="font-weight: bold; margin-bottom: 20px;">
              ለ <u>&nbsp;&nbsp;<strong>${req.institutionName || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              <u>እንጅባራ ዩኒቨርሲቲ</u>
            </div>
            <div style="text-align: center; font-weight: bold; margin-bottom: 30px;">
              ጉዳዩ፡- <u>የስራ ልምድ ማስረጃ ስለመስጠት ፤</u>
            </div>
            <div style="line-height: 2;">
              የእንጅባራ ዩኒቨርሲቲ የስራ ባልደረባ የነበሩት <u>&nbsp;&nbsp;<strong>${fullName}</strong>&nbsp;&nbsp;</u> የስራ ልምድ ማስረጃ ኮፒ 
              እንዲሰጣቸው በቀን <u>&nbsp;&nbsp;${formatEthiopianDate(req.requestDate || new Date())}&nbsp;&nbsp;</u> በተፃፈ ማመልከቻ ጠይቀዋል፡፡<br/><br/>
              
              <strong><u>በዚህ መሰረት ፤</u></strong><br/>
              <ul style="list-style-type: none; padding-left: 20px; margin-bottom: 20px;">
                <li style="position: relative; padding-left: 20px;">
                  <span style="position: absolute; left: 0;">➢</span> 
                  ከ ${req.hireDate || user?.hireDate ? formatEthiopianDate(req.hireDate || user?.hireDate) : '_____ወር_____ዓ/ም_____'} ጀምሮ ይህ ደብዳቤ ወጥቶ እስከሆነበት ድረስ በእንጅባራ ዩኒቨርሲቲ ስር 
                  በ${user?.departmentName || '________'} ክፍል በ${req.designationName || user?.designationName || '_________________'} ደረጃ የወር ደመወዝ ብር ${req.salary || user?.salary ? req.salary || user?.salary : '_________________'} 
                  እየተከፈላቸው እያገለገሉ ያሉ መሆናቸውን እንገልፃለን፡፡
                </li>
              </ul>

              ${additionalExp ? `
              <strong><u>እንዲሁም በተጨማሪ</u></strong><br/>
              <div style="padding-left: 20px; white-space: pre-wrap;">${additionalExp.split('\n').map(line => line.trim() ? `• ${line}` : '').join('<br/>')}</div>
              ` : ''}
              
              <br/>
            </div>
            <div style="margin-top: 50px; text-align: center; float: right; width: 350px;">
              <p>«ከሰላምታ ጋር»</p>
              <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px; text-align: left; padding-left: 50px;">
                <div style="margin-top: 30px;"><u>&nbsp;&nbsp;<strong>${req.approverName || '______________________'}</strong>&nbsp;&nbsp;</u></div>
                <div>የሰው ሀብት አስተዳደር ቡድን መሪ</div>
              </div>
            </div>
            
            <div style="clear: both; margin-top: 50px;">
              <p><strong><u>ግልባጭ//</u></strong></p>
              <ul style="list-style-type: disc; padding-left: 40px;">
                <li>ለብቃትና ሰው ሀብት አስተዳደር ስራ አስፈፃሚ<br/>እንጅባራ ዩኒቨርሲቲ ፤</li>
              </ul>
            </div>
          `
        };
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await recommendationService.getAllRequests({});
      setRequests(res.data || []);
    } catch (error) {
      toast.error('Failed to load recommendation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'guaranteeTypes') {
      let currentTypes = [...formData.guaranteeTypes];
      if (checked) {
        currentTypes.push(value);
      } else {
        currentTypes = currentTypes.filter(t => t !== value);
      }
      setFormData(prev => ({ ...prev, guaranteeTypes: currentTypes }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectAllGuaranteeTypes = (e) => {
    if (e.target.checked) {
      setFormData(prev => ({ ...prev, guaranteeTypes: ['EMPLOYMENT', 'EDUCATION', 'LOAN'] }));
    } else {
      setFormData(prev => ({ ...prev, guaranteeTypes: [] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) {
      toast.error('Please select a recommendation type');
      return;
    }
    
    setSubmitting(true);
    try {
      let finalReason = formData.reason;
      let finalInstitutionName = formData.institutionName;
      if (selectedType === 'GUARANTEE_LETTER') {
        finalReason = JSON.stringify({
          guaranteeTypes: formData.guaranteeTypes,
          guaranteedPersonName: formData.guaranteedPersonName,
          maritalStatus: formData.maritalStatus,
          guaranteeTime: formData.guaranteeTime,
          institutionName: formData.institutionName
        });
      }

      await recommendationService.createRequest({
        recommendationType: selectedType,
        degreeProgram: formData.degreeProgram,
        institutionName: finalInstitutionName,
        reason: finalReason
      });
      toast.success('Recommendation request submitted successfully');
      setIsModalOpen(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedType('');
    setFormData({ 
      degreeProgram: '', 
      institutionName: '', 
      reason: '',
      guaranteeTypes: [],
      guaranteedPersonName: '',
      maritalStatus: '',
      guaranteeTime: ''
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="my-recommendations-badge approved"><CheckCircle size={14} /> Approved</span>;
      case 'REJECTED':
        return <span className="my-recommendations-badge rejected"><XCircle size={14} /> Rejected</span>;
      default:
        return <span className="my-recommendations-badge pending"><Clock size={14} /> Pending</span>;
    }
  };

  const handleDownloadPdf = () => {
    const printContent = document.getElementById('employee-recommendation-paper-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>Recommendation Letter - ${viewDetailsReq?.firstName || user?.firstName} ${viewDetailsReq?.lastName || user?.lastName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              @page { size: A4; margin: 20mm; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#fff;">
          ${printContent.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="my-recommendations-container">
      <div className="my-recommendations-header">
        <div className="my-recommendations-title">
          <h1>{isAmharic ? 'የምስክር ወረቀቶች' : 'My Recommendations'}</h1>
          <p>{isAmharic ? 'የምስክር ወረቀት ጥያቄዎችዎን ያስተዳድሩ' : 'Manage your recommendation letter requests'}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="my-recommendations-new-btn">
          <Plus size={20} />
          {isAmharic ? 'አዲስ ጥያቄ' : 'New Request'}
        </button>
      </div>

      <div className="my-recommendations-card">
        <div className="my-recommendations-table-wrapper">
          <table className="my-recommendations-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="my-recommendations-empty">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="4" className="my-recommendations-empty">
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                      <FileText size={48} color="#d1d5db" />
                      <p>{isAmharic ? 'ምንም የተጠየቀ የምስክር ወረቀት የለም' : 'No recommendation requests found'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const typeInfo = REC_TYPES.find(t => t.id === req.recommendationType) || REC_TYPES[4];
                  return (
                    <tr key={req.id}>
                      <td>
                        <div className="my-recommendations-type-col">
                          <div className="my-recommendations-icon-box">{typeInfo.icon}</div>
                          <div className="my-recommendations-type-info">
                            <p>{isAmharic ? typeInfo.labelAm : typeInfo.labelEn}</p>
                            {(req.degreeProgram || req.institutionName) && (
                              <span>{req.degreeProgram} {req.institutionName && `at ${req.institutionName}`}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="my-recommendations-date-col">
                        {formatEthiopianDate(req.requestDate)}
                      </td>
                      <td>
                        {getStatusBadge(req.status)}
                        {req.status === 'REJECTED' && req.rejectionReason && (
                          <div className="my-recommendations-reject-reason" title={req.rejectionReason}>
                            {req.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => setViewDetailsReq(req)}
                          className="my-recommendations-action-btn-view"
                          title="View Details"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="my-recommendations-modal-overlay" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="my-recommendations-modal-content" onClick={e => e.stopPropagation()}>
            <div className="my-recommendations-modal-header">
              <div className="my-recommendations-modal-title-col">
                <h2>{isAmharic ? 'አዲስ የምስክር ወረቀት ጥያቄ' : 'New Recommendation Request'}</h2>
                <p>Please fill in the formal request details below.</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="my-recommendations-modal-close" title="Close Modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="my-recommendations-req-card">
                <div className="my-recommendations-req-section-title">
                  <FileBadge size={16} color="#059669" /> {isAmharic ? 'የምስክር ወረቀት አይነት ይምረጡ' : 'Select Letter Type'}
                </div>
                <div className="my-recommendations-type-grid">
                  {REC_TYPES.map(type => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`my-recommendations-type-btn ${selectedType === type.id ? 'selected' : ''}`}
                    >
                      <div className="my-recommendations-type-icon-box">{type.icon}</div>
                      <div className="my-recommendations-type-name">
                        {isAmharic ? type.labelAm : type.labelEn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedType === 'EDUCATION' && (
                <div className="my-recommendations-req-card">
                  <div className="my-recommendations-req-section-title">
                    <GraduationCap size={16} color="#059669" /> {isAmharic ? 'የትምህርት ዝርዝር መረጃ' : 'Education Details'}
                  </div>
                  <div className="my-recommendations-input-grid">
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'የዲግሪ ፕሮግራም' : 'Degree Program'}</label>
                      <select
                        name="degreeProgram"
                        value={formData.degreeProgram}
                        onChange={handleInputChange}
                        required
                        className="my-recommendations-select"
                      >
                        <option value="">Select...</option>
                        <option value="1ኛ ዲግሪ (1st Degree)">1ኛ ዲግሪ (1st Degree)</option>
                        <option value="2ኛ ዲግሪ (2nd Degree)">2ኛ ዲግሪ (2nd Degree)</option>
                        <option value="3ኛ ዲግሪ (3rd Degree)">3ኛ ዲግሪ (3rd Degree)</option>
                      </select>
                    </div>
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'የዩኒቨርሲቲው ስም' : 'University Name'}</label>
                      <input
                        type="text"
                        name="institutionName"
                        value={formData.institutionName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Addis Ababa University"
                        className="my-recommendations-input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'PROFESSIONAL_LICENSE' && (
                <div className="my-recommendations-req-card">
                  <div className="my-recommendations-req-section-title">
                    <Stethoscope size={16} color="#059669" /> {isAmharic ? 'የሙያ ፈቃድ መረጃ' : 'Professional License Details'}
                  </div>
                  <div className="my-recommendations-input-grid">
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'የሙያ ፈቃድ ሰጪ አካል' : 'Licensing Body Name'}</label>
                      <input
                        type="text"
                        name="institutionName"
                        value={formData.institutionName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Ministry of Health"
                        className="my-recommendations-input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {['WORK_EXPERIENCE', 'MAYOR_OFFICE', 'MINISTRY_OF_EDUCATION'].includes(selectedType) && (
                <div className="my-recommendations-req-card">
                  <div className="my-recommendations-req-section-title">
                    <FileText size={16} color="#059669" /> {isAmharic ? 'ተጨማሪ መረጃ' : 'Additional Information'}
                  </div>
                  <div className="my-recommendations-input-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'ማስረጃ የሚፃፍለት መ/ቤት (ካለ)' : 'Target Institution (Optional)'}</label>
                      <input
                        type="text"
                        name="institutionName"
                        value={formData.institutionName}
                        onChange={handleInputChange}
                        placeholder="Name of the institution the letter is addressed to"
                        className="my-recommendations-input-field"
                      />
                    </div>
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'የመጠየቂያ ምክንያት' : 'Reason for Request'}</label>
                      <textarea
                        name="reason"
                        value={formData.reason}
                        onChange={handleInputChange}
                        required
                        placeholder="Briefly explain why you need this letter..."
                        className="my-recommendations-input-field"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'GUARANTEE_LETTER' && (
                <div className="my-recommendations-req-card">
                  <div className="my-recommendations-req-section-title">
                    <ShieldCheck size={16} color="#059669" /> {isAmharic ? 'የዋስትና መረጃ' : 'Guarantee Details'}
                  </div>
                  
                  <div className="my-recommendations-input-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="my-recommendations-input-group">
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{isAmharic ? 'የዋስትና አይነት (1 እና ከዚያ በላይ መምረጥ ይቻላል)' : 'Guarantee Types (Select one or more)'}</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '4px' }}>
                          <input type="checkbox" onChange={handleSelectAllGuaranteeTypes} checked={formData.guaranteeTypes.length === 3} />
                          Select All
                        </label>
                      </label>
                      <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" name="guaranteeTypes" value="EMPLOYMENT" checked={formData.guaranteeTypes.includes('EMPLOYMENT')} onChange={handleInputChange} />
                          የቅጥር ዋስትና (Employment)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" name="guaranteeTypes" value="EDUCATION" checked={formData.guaranteeTypes.includes('EDUCATION')} onChange={handleInputChange} />
                          የትምህርት ዋስትና (Education)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" name="guaranteeTypes" value="LOAN" checked={formData.guaranteeTypes.includes('LOAN')} onChange={handleInputChange} />
                          የገንዘብ ብድር (Loan)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="my-recommendations-input-grid">
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'ማስረጃ የሚፃፍለት መ/ቤት' : 'Target Institution Name'}</label>
                      <input type="text" name="institutionName" value={formData.institutionName} onChange={handleInputChange} required placeholder="Name of institution" className="my-recommendations-input-field" />
                    </div>
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'ዋስትና የምትሰጠው ሰው ስም ከነአያት' : 'Guaranteed Person Full Name'}</label>
                      <input type="text" name="guaranteedPersonName" value={formData.guaranteedPersonName} onChange={handleInputChange} required placeholder="Full name of person you are guaranteeing" className="my-recommendations-input-field" />
                    </div>
                    
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'የጋብቻ ሁኔታ' : 'Marital Status'}</label>
                      <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} required className="my-recommendations-select">
                        <option value="">Select...</option>
                        <option value="MARRIED">ያገባ (Married)</option>
                        <option value="SINGLE">ያላገባ (Single)</option>
                        <option value="DIVORCED">የፈታ (Divorced)</option>
                        <option value="WIDOWED">በሞት የተለየ (Widowed)</option>
                      </select>
                    </div>
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'ዋስትና የሚገቡት' : 'Guarantee Frequency'}</label>
                      <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input type="radio" name="guaranteeTime" value="FIRST" checked={formData.guaranteeTime === 'FIRST'} onChange={handleInputChange} required />
                          ለመጀመሪያ ጊዜ (First Time)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input type="radio" name="guaranteeTime" value="SECOND" checked={formData.guaranteeTime === 'SECOND'} onChange={handleInputChange} required />
                          ለሁለተኛ ጊዜ (Second Time)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="my-recommendations-modal-footer">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="my-recommendations-btn-cancel"
                >
                  Cancel Request
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedType}
                  className="my-recommendations-btn-submit"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Details / Print Modal */}
      {viewDetailsReq && (
        <div className="my-recommendations-modal-overlay" onClick={() => setViewDetailsReq(null)}>
          <div 
            className="my-recommendations-modal-content" 
            style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="my-recommendations-modal-header">
              <div className="my-recommendations-modal-title-col">
                <h2>Recommendation Request Details</h2>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  {getStatusBadge(viewDetailsReq.status)}
                </div>
              </div>
              <button onClick={() => setViewDetailsReq(null)} className="my-recommendations-modal-close" title="Close Modal">
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#f3f4f6', padding: '20px' }}>
               <div id="employee-recommendation-paper-preview" style={{ 
                 maxWidth: '800px', 
                 margin: '0 auto', 
                 padding: '40px', 
                 background: '#fff', 
                 boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                 borderRadius: '8px', 
                 fontFamily: "'Arial', sans-serif", 
                 color: '#111', 
                 lineHeight: '1.6', 
                 fontSize: '14px' 
               }}>
                  {/* Conditional Header Rendering */}
                  {!['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE', 'EDUCATION', 'PROFESSIONAL_LICENSE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE'].includes(viewDetailsReq.recommendationType) && (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ marginBottom: '10px' }}><img src={injLogo} alt="Logo" style={{ maxWidth: '100px', height: 'auto' }} /></div>
                        <h2 style={{ margin: '5px 0', fontSize: '22px' }}>እንጅባራ ዩኒቨርሲቲ</h2>
                        <h3 style={{ margin: '5px 0', fontSize: '18px' }}>INJIBARA UNIVERSITY</h3>
                        <h4 style={{ margin: '5px 0', fontSize: '16px' }}>የብቃትና የሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                        <div>ቁጥር፡ <u> {viewDetailsReq.id.slice(0,8).toUpperCase()} </u></div>
                        <div>ቀን፡ <u> {formatEthiopianDate(new Date())} </u></div>
                      </div>
                    </>
                  )}

                  {['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE'].includes(viewDetailsReq.recommendationType) && (
                    <div style={{ marginBottom: '30px' }}>
                      {viewDetailsReq.recommendationType === 'GUARANTEE_LETTER' && (
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                          <h4 style={{ margin: '5px 0', fontSize: '18px', textDecoration: 'underline' }}>በእንጅባራ ዩኒቨርሲቲ</h4>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}>ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                        </div>
                      )}
                      {viewDetailsReq.recommendationType === 'HOUSING_COOPERATIVE' && (
                        <div style={{ marginBottom: '30px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>ቀን፡ <u> {formatEthiopianDate(new Date())} </u></div>
                            <div>አይ/ቁጥር፡ <u> {viewDetailsReq.id.slice(0,8).toUpperCase()} </u></div>
                          </div>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}>ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}><u>እንጅባራ</u></h4>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', margin: '30px 0', textDecoration: 'underline' }}>
                    {getPaperContent(viewDetailsReq).title}
                  </div>

                  <div style={{ textAlign: 'justify', marginBottom: '40px', textIndent: '40px' }} dangerouslySetInnerHTML={{ __html: getPaperContent(viewDetailsReq).content }} />

                  {/* Conditional Footer Rendering */}
                  {!['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE', 'EDUCATION', 'PROFESSIONAL_LICENSE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE'].includes(viewDetailsReq.recommendationType) && (
                    <div style={{ marginTop: '50px', textAlign: 'right' }}>
                      <p style={{ margin: '0 0 40px 0' }}>ከሠላምታ ጋር፣</p>
                      {/* Show STAMP if Approved for Employee View */}
                      {viewDetailsReq.status === 'APPROVED' && (
                         <div style={{ color: '#059669', border: '3px solid #059669', borderRadius: '50%', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', margin: '0 0 10px auto', transform: 'rotate(-15deg)', opacity: 0.7 }}>
                            APPROVED &<br/>STAMPED
                         </div>
                      )}
                      {viewDetailsReq.status !== 'APPROVED' && (
                         <p style={{ margin: 0 }}>___________________________</p>
                      )}
                      <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>የሰው ሀብት አስተዳደር</p>
                    </div>
                  )}
                  
                  {['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE', 'EDUCATION', 'PROFESSIONAL_LICENSE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE'].includes(viewDetailsReq.recommendationType) && viewDetailsReq.status === 'APPROVED' && (
                      <div style={{ marginTop: '30px', textAlign: 'center' }}>
                         <div style={{ color: '#059669', border: '3px solid #059669', borderRadius: '50%', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', margin: '0 auto', transform: 'rotate(-15deg)', opacity: 0.7 }}>
                            APPROVED &<br/>STAMPED
                         </div>
                      </div>
                  )}
               </div>
            </div>

            <div className="my-recommendations-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {viewDetailsReq.status === 'APPROVED' && (
                <button 
                  style={{ padding: '8px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleDownloadPdf}
                >
                  <FileText size={16} /> Download PDF
                </button>
              )}
              <button 
                style={{ padding: '8px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => setViewDetailsReq(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Details / Print Modal */}
      {viewDetailsReq && (
        <div className="my-recommendations-modal-overlay" onClick={() => setViewDetailsReq(null)}>
          <div 
            className="my-recommendations-modal-content" 
            style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="my-recommendations-modal-header">
              <div className="my-recommendations-modal-title-col">
                <h2>Recommendation Request Details</h2>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  {getStatusBadge(viewDetailsReq.status)}
                </div>
              </div>
              <button onClick={() => setViewDetailsReq(null)} className="my-recommendations-modal-close" title="Close Modal">
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#f3f4f6', padding: '20px' }}>
               <div id="employee-recommendation-paper-preview" style={{ 
                 maxWidth: '800px', 
                 margin: '0 auto', 
                 padding: '40px', 
                 background: '#fff', 
                 boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                 borderRadius: '8px', 
                 fontFamily: "'Arial', sans-serif", 
                 color: '#111', 
                 lineHeight: '1.6', 
                 fontSize: '14px' 
               }}>
                  {/* Conditional Header Rendering */}
                  {!['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE'].includes(viewDetailsReq.recommendationType) && (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ marginBottom: '10px' }}><img src={injLogo} alt="Logo" style={{ maxWidth: '100px', height: 'auto' }} /></div>
                        <h2 style={{ margin: '5px 0', fontSize: '22px' }}>እንጅባራ ዩኒቨርሲቲ</h2>
                        <h3 style={{ margin: '5px 0', fontSize: '18px' }}>INJIBARA UNIVERSITY</h3>
                        <h4 style={{ margin: '5px 0', fontSize: '16px' }}>የብቃትና የሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                        <div>ቁጥር፡ <u> {viewDetailsReq.id.slice(0,8).toUpperCase()} </u></div>
                        <div>ቀን፡ <u> {formatEthiopianDate(new Date())} </u></div>
                      </div>
                    </>
                  )}

                  {['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE'].includes(viewDetailsReq.recommendationType) && (
                    <div style={{ marginBottom: '30px' }}>
                      {viewDetailsReq.recommendationType === 'GUARANTEE_LETTER' && (
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                          <h4 style={{ margin: '5px 0', fontSize: '18px', textDecoration: 'underline' }}>በእንጅባራ ዩኒቨርሲቲ</h4>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}>ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                        </div>
                      )}
                      {viewDetailsReq.recommendationType === 'HOUSING_COOPERATIVE' && (
                        <div style={{ marginBottom: '30px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>ቀን፡ <u> {formatEthiopianDate(new Date())} </u></div>
                            <div>አይ/ቁጥር፡ <u> {viewDetailsReq.id.slice(0,8).toUpperCase()} </u></div>
                          </div>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}>ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}><u>እንጅባራ</u></h4>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', margin: '30px 0', textDecoration: 'underline' }}>
                    {getPaperContent(viewDetailsReq).title}
                  </div>

                  <div style={{ textAlign: 'justify', marginBottom: '40px', textIndent: '40px' }} dangerouslySetInnerHTML={{ __html: getPaperContent(viewDetailsReq).content }} />

                  {/* Conditional Footer Rendering */}
                  {!['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE'].includes(viewDetailsReq.recommendationType) && (
                    <div style={{ marginTop: '50px', textAlign: 'right' }}>
                      <p style={{ margin: '0 0 40px 0' }}>ከሠላምታ ጋር፣</p>
                      {/* Show STAMP if Approved for Employee View */}
                      {viewDetailsReq.status === 'APPROVED' && (
                         <div style={{ color: '#059669', border: '3px solid #059669', borderRadius: '50%', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', margin: '0 0 10px auto', transform: 'rotate(-15deg)', opacity: 0.7 }}>
                            APPROVED &<br/>STAMPED
                         </div>
                      )}
                      {viewDetailsReq.status !== 'APPROVED' && (
                         <p style={{ margin: 0 }}>___________________________</p>
                      )}
                      <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>የሰው ሀብት አስተዳደር</p>
                    </div>
                  )}
                  
                  {['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE'].includes(viewDetailsReq.recommendationType) && viewDetailsReq.status === 'APPROVED' && (
                      <div style={{ marginTop: '30px', textAlign: 'center' }}>
                         <div style={{ color: '#059669', border: '3px solid #059669', borderRadius: '50%', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', margin: '0 auto', transform: 'rotate(-15deg)', opacity: 0.7 }}>
                            APPROVED &<br/>STAMPED
                         </div>
                      </div>
                  )}
               </div>
            </div>

            <div className="my-recommendations-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {viewDetailsReq.status === 'APPROVED' && (
                <button 
                  style={{ padding: '8px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleDownloadPdf}
                >
                  <FileText size={16} /> Download PDF
                </button>
              )}
              <button 
                style={{ padding: '8px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => setViewDetailsReq(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRecommendations;
