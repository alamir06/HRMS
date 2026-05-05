const fs = require('fs');

const files = [
  "d:\\Major Course\\Fifth Year\\GC Document\\HR\\Implementation\\HRMS\\HRMS_UI\\src\\pages\\EmployeePortal\\MyRecommendations\\MyRecommendations.jsx",
  "d:\\Major Course\\Fifth Year\\GC Document\\HR\\Implementation\\HRMS\\HRMS_UI\\src\\pages\\HRManager\\Recommendations\\Recommendations.jsx"
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Add import if not present
  if (!content.includes("formatEthiopianDate")) {
    content = content.replace(
      "import injLogo from '../../../assets/inj-logo.jpg';",
      "import injLogo from '../../../assets/inj-logo.jpg';\nimport { formatEthiopianDate } from '../../../utils/dateTime';"
    );
  }

  // Replace various date formats
  content = content.replace(/new Date\(req\.requestDate \|\| Date\.now\(\)\)\.toLocaleDateString\('am-ET'\)/g, "formatEthiopianDate(req.requestDate || new Date())");
  
  content = content.replace(/new Date\(req\.hireDate \|\| user\?\.hireDate\)\.toLocaleDateString\('am-ET'\)/g, "formatEthiopianDate(req.hireDate || user?.hireDate)");
  content = content.replace(/new Date\(req\.hireDate\)\.toLocaleDateString\('am-ET'\)/g, "formatEthiopianDate(req.hireDate)");
  
  content = content.replace(/new Date\(user\?\.dateOfBirth\)\.toLocaleDateString\('am-ET'\)/g, "formatEthiopianDate(user?.dateOfBirth)");
  content = content.replace(/new Date\(req\.dateOfBirth\)\.toLocaleDateString\('am-ET'\)/g, "formatEthiopianDate(req.dateOfBirth)");

  content = content.replace(/new Date\(\)\.toLocaleDateString\('am-ET'\)/g, "formatEthiopianDate(new Date())");

  // Table date
  content = content.replace(/new Date\(req\.requestDate\)\.toLocaleDateString\(\)/g, "formatEthiopianDate(req.requestDate)");

  fs.writeFileSync(file, content);
});

console.log("Done");
