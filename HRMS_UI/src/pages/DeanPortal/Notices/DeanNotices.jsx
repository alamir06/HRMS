import React from 'react';
import NoticeModule from '../../../components/Notices/NoticeModule';

const DeanNotices = () => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NoticeModule 
        allowedAudiences={['COLLEGE_HEADS', 'HR_MANAGER']} 
        isEmployeeView={false} 
      />
    </div>
  );
};

export default DeanNotices;
