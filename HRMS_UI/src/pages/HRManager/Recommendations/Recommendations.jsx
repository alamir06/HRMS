import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { recommendationService } from '../../../services/recommendationService';
import { 
  FileText, CheckCircle, XCircle, Clock, Eye, 
  Search, Filter, X, ChevronLeft, ChevronRight, GraduationCap, Stethoscope, Building, FileBadge, Check 
} from 'lucide-react';
import '../Leaves/LeaveRequests.css';
import ConfirmModal from '../../../components/common/ConfirmModal';
import injLogo from '../../../assets/inj-logo.jpg';
import { formatEthiopianDate } from '../../../utils/dateTime';

const REC_TYPES = [
  { id: 'EDUCATION', icon: <GraduationCap size={20} />, labelEn: 'Education' },
  { id: 'PROFESSIONAL_LICENSE', icon: <Stethoscope size={20} />, labelEn: 'Professional License' },
  { id: 'MAYOR_OFFICE', icon: <Building size={20} />, labelEn: 'Mayor Office' },
  { id: 'MINISTRY_OF_EDUCATION', icon: <Building size={20} />, labelEn: 'Ministry of Education' },
  { id: 'WORK_EXPERIENCE', icon: <FileBadge size={20} />, labelEn: 'Work Experience' },
  { id: 'GUARANTEE_LETTER', icon: <FileText size={20} />, labelEn: 'Guarantee Form' },
  { id: 'HOUSING_COOPERATIVE', icon: <Building size={20} />, labelEn: 'Housing Cooperative' }
];

const Recommendations = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Action Modal State (for table buttons)
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    action: null,
    request: null,
    reason: '',
  });

  const getPaperContent = (req) => {
    if (!req) return { title: '', content: '' };
    const fullName = `${req.firstName || ''} ${req.lastName || ''}`.trim();
    const departmentName = req.departmentName || '__________';
    const hireDate = req.hireDate ? new Date(req.hireDate).getFullYear() : '__________';

    switch (req.recommendationType) {
      case 'EDUCATION':
        return {
          title: '',
          content: `
            <div style="display: flex; justify-content: space-between; margin-bottom: 50px; font-weight: bold;">
              <div>ቀን <u>&nbsp;&nbsp;${formatEthiopianDate(req.requestDate || new Date())}&nbsp;&nbsp;</u></div>
              <div>አ.ዲ. ቁጥር <u>&nbsp;&nbsp;${req.employeeCode || '____________'}&nbsp;&nbsp;</u></div>
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
              1. በእንጅባራ ዩኒቨርሲቲ የቅጥር ቀን <u>&nbsp;&nbsp;<strong>${req.hireDate ? formatEthiopianDate(req.hireDate) : '_____ወር_____ዓ/ም_____'}</strong>&nbsp;&nbsp;</u><br/>
              2. የሙያ መስክ (Specialization) <u>&nbsp;&nbsp;<strong>${req.fieldOfSpecialization || req.designationName || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              3. የአ.ዲ. ቁጥር <u>&nbsp;&nbsp;<strong>${req.employeeCode || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
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
              በዚህም መሰረት ከላይ ስማቸው የተጠቀሰው ከ <u>&nbsp;&nbsp;<strong>${req.hireDate ? formatEthiopianDate(req.hireDate) : '_____ወር_____ዓ/ም_____'}</strong>&nbsp;&nbsp;</u> ጀምሮ 
              በእንጅባራ ዩኒቨርሲቲ <u>&nbsp;&nbsp;<strong>${req.designationName || '_________________'}</strong>&nbsp;&nbsp;</u> ሆነው 
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
              1. በእንጅባራ ዩኒቨርሲቲ የቅጥር ቀን <u>&nbsp;&nbsp;<strong>${req.hireDate ? formatEthiopianDate(req.hireDate) : '_____ወር_____ዓ/ም_____'}</strong>&nbsp;&nbsp;</u><br/>
              2. የሙያ መስክ (Specialization) <u>&nbsp;&nbsp;<strong>${req.fieldOfSpecialization || req.designationName || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
              3. የአ.ዲ. ቁጥር <u>&nbsp;&nbsp;<strong>${req.employeeCode || '__________________________________'}</strong>&nbsp;&nbsp;</u><br/>
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
        let parsedReason = {};
        try {
          if (req.reason && req.reason.startsWith('{')) {
            parsedReason = JSON.parse(req.reason);
          }
        } catch (e) {}
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
              6. የተወለደበት ቀን <u>&nbsp;&nbsp;<strong>${req.dateOfBirth ? formatEthiopianDate(req.dateOfBirth) : '________ ወር ________ ዓ/ም _________'}</strong>&nbsp;&nbsp;</u><br/>
              7. የሥራ ክፍል ት/ቤት/ኮሌጅ <u>&nbsp;&nbsp;<strong>${departmentName}</strong>&nbsp;&nbsp;</u><br/>
              8. የሥራ መደብ መጠሪያ <u>&nbsp;&nbsp;<strong>${req.jobTitle || req.designationName || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              9. የሠራተኛው መታወቂያ ቁጥር <u>&nbsp;&nbsp;<strong>${req.employeeCode || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              10. የወር ደመወዝ መጠን <u>&nbsp;&nbsp;<strong>${req.salary ? req.salary + ' ብር' : '_________________'}</strong>&nbsp;&nbsp;</u><br/>
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
              2. የሥራ መደብ መጠሪያ <u>&nbsp;&nbsp;<strong>${req.jobTitle || req.designationName || '_________________'}</strong>&nbsp;&nbsp;</u><br/>
              3. የወር ደመወዝ <u>&nbsp;&nbsp;<strong>${req.salary ? req.salary + ' ብር' : '_________________'}</strong>&nbsp;&nbsp;</u> መሆኑን እገልፃለሁ፡፡<br/>
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
                  ከ ${req.hireDate ? formatEthiopianDate(req.hireDate) : '_____ወር_____ዓ/ም_____'} ጀምሮ ይህ ደብዳቤ ወጥቶ እስከሆነበት ድረስ በእንጅባራ ዩኒቨርሲቲ ስር 
                  በ${departmentName} ክፍል በ${req.designationName || '_________________'} ደረጃ የወር ደመወዝ ብር ${req.salary ? req.salary : '_________________'} 
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

  const handleDownloadPdf = () => {
    const printContent = document.getElementById('recommendation-paper-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>Recommendation Letter - ${selectedReq?.firstName} ${selectedReq?.lastName}</title>
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

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await recommendationService.getAllRequests({
        page: currentPage,
        limit: 10,
        search,
        status: statusFilter,
        type: typeFilter
      });
      setRequests(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (error) {
      toast.error('Failed to load recommendation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, search, statusFilter, typeFilter]);

  const handleStatusUpdate = async (status, reqId, reasonStr = '', addExp = '') => {
    if (status === 'REJECTED' && !reasonStr.trim()) {
      toast.error('Please provide a rejection reason');
      return false;
    }

    setIsSubmitting(true);
    try {
      await recommendationService.updateStatus(reqId, status, reasonStr, addExp);
      toast.success(`Recommendation ${status.toLowerCase()} successfully`);
      setSelectedReq(null);
      setRejectionReason('');
      fetchRequests();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update request');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const [approveWorkExpId, setApproveWorkExpId] = useState(null);
  const [additionalExperience, setAdditionalExperience] = useState('');

  const openActionModal = (request, action) => {
    if (request.recommendationType === 'WORK_EXPERIENCE' && action === 'approve') {
       setApproveWorkExpId(request.id);
       return;
    }
    setActionModal({
      isOpen: true,
      action,
      request,
      reason: '',
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      action: null,
      request: null,
      reason: '',
    });
  };

  const confirmAction = async () => {
    const success = await handleStatusUpdate(
      actionModal.action === 'approve' ? 'APPROVED' : 'REJECTED',
      actionModal.request.id,
      actionModal.reason
    );
    if (success) {
      closeActionModal();
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="recommendations-badge approved"><CheckCircle size={12} /> Approved</span>;
      case 'REJECTED':
        return <span className="recommendations-badge rejected"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="recommendations-badge pending"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <div className="hr-leave-request-container">
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 0.25rem 0' }}>Recommendations</h1>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>Review and manage employee recommendation letters</p>
      </div>

      {/* Filters */}
      <div className="hr-leave-request-top-toolbar">
        <label className="hr-leave-request-search-wrapper" htmlFor="searchRec">
          <Search size={18} color="var(--text-secondary)" />
          <input
            id="searchRec"
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        
        <div style={{ display: 'flex', gap: '0.5rem', flex: '0 0 auto' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="hr-leave-request-period-filter-trigger"
            style={{ minWidth: '160px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">All Types</option>
            {REC_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.labelEn}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="hr-leave-request-period-filter-trigger"
            style={{ minWidth: '140px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="hr-leave-request-table-card">
        <div className="hr-leave-request-responsive-wrapper">
          <table className="hr-leave-request-data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>No requests found.</td></tr>
              ) : (
                requests.map((req) => {
                  const typeInfo = REC_TYPES.find(t => t.id === req.recommendationType) || REC_TYPES[4];
                  let statusClass = 'hr-leave-request-badge-pending';
                  if (req.status === 'APPROVED') statusClass = 'hr-leave-request-badge-approved';
                  else if (req.status === 'REJECTED') statusClass = 'hr-leave-request-badge-rejected';

                  return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="hr-leave-request-avatar">
                            <img 
                              src={req.profilePicture ? `${apiOrigin}${req.profilePicture.startsWith('/') ? '' : '/'}${req.profilePicture}` : `https://ui-avatars.com/api/?name=${encodeURIComponent((req.firstName || "") + ' ' + (req.lastName || ""))}&background=0B8255&color=fff`} 
                              alt="Profile"
                              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((req.firstName || "") + ' ' + (req.lastName || ""))}&background=0B8255&color=fff` }}
                            />
                          </div>
                          <div className="hr-leave-request-col-primary-text">
                            {req.firstName} {req.lastName}
                          </div>
                        </div>
                      </td>
                      <td>{req.departmentName}</td>
                      <td>
                        <span className="hr-leave-request-type-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}>
                          <span style={{ display: 'inline-flex', color: '#059669' }}>{typeInfo.icon}</span>
                          {typeInfo.labelEn}
                        </span>
                      </td>
                      <td>
                        {formatEthiopianDate(req.requestDate)}
                      </td>
                      <td>
                        <span className={`hr-leave-request-badge ${statusClass}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <div className="hr-leave-request-table-actions" style={{ justifyContent: 'flex-start' }}>
                          <button
                            onClick={() => setSelectedReq(req)}
                            className="hr-leave-request-action-btn-light"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {req.status === 'PENDING' && (
                            <>
                              <button 
                                className="hr-leave-request-action-btn-light hr-leave-request-action-btn-success" 
                                onClick={() => openActionModal(req, 'approve')} 
                                title="Approve"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                className="hr-leave-request-action-btn-light hr-leave-request-action-btn-danger" 
                                onClick={() => openActionModal(req, 'reject')} 
                                title="Reject"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="hr-leave-request-table-footer">
          <div className="hr-leave-request-page-limit-selector">
            <span>Show</span>
            <select className="hr-leave-request-limit-dropdown" disabled>
              <option value="10">10</option>
            </select>
            <span>entries</span>
          </div>

          <div className="hr-leave-request-pagination-controls">
            <span>Page {currentPage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="hr-leave-request-page-btn"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="hr-leave-request-page-btn"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedReq && (
        <div className="hr-leave-request-modal-overlay" onClick={() => setSelectedReq(null)}>
          <div className="hr-leave-request-modal" onClick={e => e.stopPropagation()}>
            <div className="hr-leave-request-modal-header">
              <h2>Recommendation Request Details</h2>
              <button 
                onClick={() => setSelectedReq(null)}
                className="hr-leave-request-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="hr-leave-request-modal-body" style={{ background: '#f3f4f6', padding: '20px' }}>
               <div id="recommendation-paper-preview" style={{ 
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
                  {!['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE', 'EDUCATION', 'PROFESSIONAL_LICENSE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE'].includes(selectedReq.recommendationType) && (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ marginBottom: '10px' }}><img src={injLogo} alt="Logo" style={{ maxWidth: '100px', height: 'auto' }} /></div>
                        <h2 style={{ margin: '5px 0', fontSize: '22px' }}>እንጅባራ ዩኒቨርሲቲ</h2>
                        <h3 style={{ margin: '5px 0', fontSize: '18px' }}>INJIBARA UNIVERSITY</h3>
                        <h4 style={{ margin: '5px 0', fontSize: '16px' }}>የብቃትና የሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                        <div>ቁጥር፡ <u> {selectedReq.id.slice(0,8).toUpperCase()} </u></div>
                        <div>ቀን፡ <u> {formatEthiopianDate(new Date())} </u></div>
                      </div>
                    </>
                  )}

                  {['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE'].includes(selectedReq.recommendationType) && (
                    <div style={{ marginBottom: '30px' }}>
                      {selectedReq.recommendationType === 'GUARANTEE_LETTER' && (
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                          <h4 style={{ margin: '5px 0', fontSize: '18px', textDecoration: 'underline' }}>በእንጅባራ ዩኒቨርሲቲ</h4>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}>ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                        </div>
                      )}
                      {selectedReq.recommendationType === 'HOUSING_COOPERATIVE' && (
                        <div style={{ marginBottom: '30px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>ቀን፡ <u> {formatEthiopianDate(new Date())} </u></div>
                            <div>አይ/ቁጥር፡ <u> {selectedReq.id.slice(0,8).toUpperCase()} </u></div>
                          </div>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}>ለብቃትና ሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                          <h4 style={{ margin: '5px 0', fontSize: '16px' }}><u>እንጅባራ</u></h4>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', margin: '30px 0', textDecoration: 'underline' }}>
                    {getPaperContent(selectedReq).title}
                  </div>

                  <div style={{ textAlign: 'justify', marginBottom: '40px', textIndent: '40px' }} dangerouslySetInnerHTML={{ __html: getPaperContent(selectedReq).content }} />

                  {/* Conditional Footer Rendering */}
                  {!['GUARANTEE_LETTER', 'HOUSING_COOPERATIVE', 'EDUCATION', 'PROFESSIONAL_LICENSE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE'].includes(selectedReq.recommendationType) && (
                    <div style={{ marginTop: '50px', textAlign: 'right' }}>
                      <p style={{ margin: '0 0 40px 0' }}>ከሠላምታ ጋር፣</p>
                      <p style={{ margin: 0 }}>___________________________</p>
                      <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>የሰው ሀብት አስተዳደር</p>
                    </div>
                  )}
               </div>
            </div>
            
            <div className="hr-leave-request-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {selectedReq.status === 'APPROVED' && (
                <button 
                  style={{ padding: '8px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleDownloadPdf}
                >
                  <FileText size={16} /> Download PDF
                </button>
              )}
              <button 
                style={{ padding: '8px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => setSelectedReq(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={actionModal.isOpen}
        title={actionModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        content={
          <div className="hr-leave-request-action-modal-content">
            <p className="hr-leave-request-action-modal-message">
              Are you sure you want to {actionModal.action} this recommendation request?
            </p>
            <label className="hr-leave-request-action-modal-label" htmlFor="recActionReason">
              Reason {actionModal.action === 'reject' ? '<span class="req">*</span>' : ''}
            </label>
            <textarea
              id="recActionReason"
              className="hr-leave-request-action-modal-input"
              value={actionModal.reason}
              onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder={`Enter ${actionModal.action} reason...`}
              rows={4}
            />
          </div>
        }
        onConfirm={confirmAction}
        onClose={closeActionModal}
        isLoading={isSubmitting}
      />
      {/* Approve Work Experience Modal */}
      {approveWorkExpId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Approve Work Experience</h3>
              <button className="close-btn" onClick={() => { setApproveWorkExpId(null); setAdditionalExperience(''); }}><X /></button>
            </div>
            <div className="modal-body">
              <p>If the employee has transferred from another institution or has past relevant experience to include, enter it below. Otherwise, leave blank.</p>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>Additional Experience (እንዲሁም በተጨማሪ)</label>
                <textarea
                  value={additionalExperience}
                  onChange={(e) => setAdditionalExperience(e.target.value)}
                  placeholder="e.g. ከ 1/2/2010 ዓ.ም እስከ 29/2/2011 ዓ.ም ድረስ በወልዲያ ዩኒቨርሲቲ አገልግለዋል፡፡"
                  rows={4}
                  style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => { setApproveWorkExpId(null); setAdditionalExperience(''); }}>Cancel</button>
                <button 
                  className="btn btn-success" 
                  onClick={() => handleStatusUpdate(approveWorkExpId, 'APPROVED', '', additionalExperience)}
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Work Experience Modal */}
      {approveWorkExpId && (
        <div className="hr-leave-request-modal-overlay" onClick={() => { setApproveWorkExpId(null); setAdditionalExperience(''); }}>
          <div className="hr-leave-request-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="hr-leave-request-modal-header">
              <h2>Approve Work Experience</h2>
              <button 
                onClick={() => { setApproveWorkExpId(null); setAdditionalExperience(''); }}
                className="hr-leave-request-modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="hr-leave-request-modal-body">
              <p>If the employee has transferred from another institution or has past relevant experience to include, enter it below. Otherwise, leave blank.</p>
              <div className="hr-leave-request-form-group" style={{ marginTop: '15px' }}>
                <label>Additional Experience (እንዲሁም በተጨማሪ)</label>
                <textarea
                  value={additionalExperience}
                  onChange={(e) => setAdditionalExperience(e.target.value)}
                  placeholder="e.g. ከ 1/2/2010 ዓ.ም እስከ 29/2/2011 ዓ.ም ድረስ በወልዲያ ዩኒቨርሲቲ አገልግለዋል፡፡"
                  rows={4}
                  style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </div>
            </div>
            <div className="hr-leave-request-modal-footer">
              <button 
                className="hr-leave-request-btn-secondary" 
                onClick={() => { setApproveWorkExpId(null); setAdditionalExperience(''); }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="hr-leave-request-btn-primary hr-leave-request-btn-success" 
                onClick={async () => {
                   const success = await handleStatusUpdate('APPROVED', approveWorkExpId, '', additionalExperience);
                   if (success) {
                      setApproveWorkExpId(null);
                      setAdditionalExperience('');
                   }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Approving...' : 'Approve Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Recommendations;
