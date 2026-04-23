import React from 'react';
import NoticeModule from '../../../components/Notices/NoticeModule';

const HeadNotices = () => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NoticeModule 
        allowedAudiences={['DEPARTMENT', 'HR_MANAGER']} 
        isEmployeeView={false} 
      />
    </div>
  );
};

export default HeadNotices;
