import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './LandingContent.css';

const LandingContent = () => {
  const navigate = useNavigate();

  return (
    <section className="landing-content">
      <div className="container">
        <h1 className="content-title">
          Human Resource Information Management System
        </h1>
        <p className="content-subtitle">
          for Injibara University
        </p>
        <button className="btn-login-main" onClick={() => navigate('/login')}>
          Login <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
};

export default LandingContent;
