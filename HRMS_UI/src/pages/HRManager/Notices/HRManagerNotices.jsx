import React from 'react';
import NoticeModule from '../../../components/Notices/NoticeModule';

const HRManagerNotices = () => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NoticeModule 
        allowedAudiences={['ALL', 'DEPARTMENT', 'COLLEGE', 'INDIVIDUAL']} 
        isEmployeeView={false} 
      />
    </div>
  );
};

export default HRManagerNotices;
