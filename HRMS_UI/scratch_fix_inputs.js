import fs from 'fs';

const jsxPath = './src/pages/HRManager/Recruitment/Recruitment.jsx';
let jsx = fs.readFileSync(jsxPath, 'utf8');

// Replace form-group with common-form-group
jsx = jsx.replace(/className="form-group"/g, 'className="common-form-group"');

// Inject common-form-input into all inputs
jsx = jsx.replace(/<input\\s+type="text"/g, '<input className="common-form-input" type="text"');
jsx = jsx.replace(/<input\\s+type="number"/g, '<input className="common-form-input" type="number"');

// Inject common-form-input into all selects
jsx = jsx.replace(/<select\\s+value=/g, '<select className="common-form-input" value=');

// Inject common-form-input into textareas
jsx = jsx.replace(/<textarea\\s+placeholder=/g, '<textarea className="common-form-input" placeholder=');

// Fix the required asterisk styling
jsx = jsx.replace(/\\*<\\/label>/g, '<span className="common-required-star">*</span></label>');

fs.writeFileSync(jsxPath, jsx, 'utf8');
console.log("Updated input classes!");
