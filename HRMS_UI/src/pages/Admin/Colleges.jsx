import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  X,
  GraduationCap,
  CalendarClock,
  Download,
} from 'lucide-react';
import './Colleges.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const EMPTY_FORM = {
  collegeName: '',
  collegeNameAmharic: '',
  collegeDescription: '',
  collegeDescriptionAmharic: '',
};

const toDisplayDate = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString();
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const Colleges = () => {
  const [colleges, setColleges] = useState([]);
  const [stats, setStats] = useState({ totalColleges: 0, recentColleges: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(total / limit);
    return pages > 0 ? pages : 1;
  }, [total, limit]);

  const token = localStorage.getItem('adminToken');

  const authHeaders = useMemo(() => {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [token]);

  const fetchStats = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/colleges/stats/dashboard`, {
        headers: authHeaders,
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      if (payload?.success && payload?.data) {
        setStats({
          totalColleges: Number(payload.data.totalColleges || 0),
          recentColleges: Number(payload.data.recentColleges || 0),
        });
      }
    } catch {
      // Stats are secondary UI data, so keep page usable even if this request fails.
    }
  };

  const fetchColleges = async () => {
    if (!token) {
      setError('Missing auth token. Please log in again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`${API_BASE_URL}/colleges?${params.toString()}`, {
        headers: authHeaders,
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || 'Failed to fetch colleges.');
      }

      const list = Array.isArray(payload?.data) ? payload.data : [];
      setColleges(list);
      setTotal(Number(payload?.pagination?.total || list.length || 0));
    } catch (err) {
      setError(err.message || 'Unable to load college records.');
      setColleges([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(normalizeText(searchInput));
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    fetchColleges();
  }, [page, limit, search]);

  useEffect(() => {
    fetchStats();
  }, []);

  const openCreateModal = () => {
    setEditingCollege(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (college) => {
    setEditingCollege(college);
    setFormData({
      collegeName: college.collegeName || '',
      collegeNameAmharic: college.collegeNameAmharic || '',
      collegeDescription: college.collegeDescription || '',
      collegeDescriptionAmharic: college.collegeDescriptionAmharic || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCollege(null);
    setFormData(EMPTY_FORM);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!normalizeText(formData.collegeName)) {
      setError('College name is required.');
      return;
    }

    setIsSaving(true);
    setError('');

    const payload = {
      collegeName: normalizeText(formData.collegeName),
      collegeNameAmharic: normalizeText(formData.collegeNameAmharic) || null,
      collegeDescription: normalizeText(formData.collegeDescription) || null,
      collegeDescriptionAmharic: normalizeText(formData.collegeDescriptionAmharic) || null,
    };

    const isEdit = Boolean(editingCollege?.id);
    const endpoint = isEdit
      ? `${API_BASE_URL}/colleges/${editingCollege.id}`
      : `${API_BASE_URL}/colleges`;
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'Failed to save college.');
      }

      closeModal();
      await Promise.all([fetchColleges(), fetchStats()]);
    } catch (err) {
      setError(err.message || 'Unable to save college.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (college) => {
    const confirmed = window.confirm(`Delete "${college.collegeName}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/colleges/${college.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'Failed to delete college.');
      }

      await Promise.all([fetchColleges(), fetchStats()]);
    } catch (err) {
      setError(err.message || 'Unable to delete college.');
    }
  };

  const exportCsv = () => {
    if (!colleges.length) {
      return;
    }

    const header = ['College Name', 'Amharic Name', 'Description', 'Created At'];
    const rows = colleges.map((item) => [
      item.collegeName || '',
      item.collegeNameAmharic || '',
      item.collegeDescription || '',
      toDisplayDate(item.createdAt),
    ]);

    const csvContent = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `colleges-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <section className="colleges-page">
      <div className="colleges-hero">
        <div>
          <h2>College Management</h2>
          <p>Track, add, and maintain college records tied to your default company profile.</p>
        </div>
        <div className="colleges-hero-actions">
          <button type="button" className="btn btn-light" onClick={fetchColleges}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add College
          </button>
        </div>
      </div>

      <div className="colleges-metrics-grid">
        <article className="metric-card">
          <div className="metric-icon"><GraduationCap size={20} /></div>
          <div>
            <p>Total Colleges</p>
            <strong>{stats.totalColleges}</strong>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon metric-icon-soft"><CalendarClock size={20} /></div>
          <div>
            <p>Added in 30 Days</p>
            <strong>{stats.recentColleges}</strong>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon metric-icon-neutral"><Building2 size={20} /></div>
          <div>
            <p>Current Page Size</p>
            <strong>{limit}</strong>
          </div>
        </article>
      </div>

      <div className="colleges-panel">
        <div className="colleges-toolbar">
          <label className="search-box" htmlFor="searchCollegeInput">
            <Search size={16} />
            <input
              id="searchCollegeInput"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or description"
              type="text"
            />
          </label>

          <div className="toolbar-actions">
            <select
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button type="button" className="btn btn-light" onClick={exportCsv}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {error ? <p className="inline-error">{error}</p> : null}

        <div className="table-wrap">
          <table className="college-table">
            <thead>
              <tr>
                <th>College Name</th>
                <th>Name (Amharic)</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="table-state">Loading college records...</td>
                </tr>
              ) : colleges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-state">No colleges found.</td>
                </tr>
              ) : (
                colleges.map((college) => (
                  <tr key={college.id}>
                    <td>{college.collegeName}</td>
                    <td>{college.collegeNameAmharic || '-'}</td>
                    <td className="description-cell">{college.collegeDescription || '-'}</td>
                    <td>{toDisplayDate(college.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="icon-btn" onClick={() => openEditModal(college)}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDelete(college)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-row">
          <p>
            Showing {startIndex} to {endIndex} of {total} records
          </p>
          <div className="pagination-controls">
            <button type="button" className="btn btn-light" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button type="button" className="btn btn-light" onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingCollege ? 'Edit College' : 'Add College'}</h3>
              <button type="button" className="icon-btn" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <label>
                College Name *
                <input
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleFieldChange}
                  maxLength={255}
                  required
                />
              </label>
              <label>
                College Name (Amharic)
                <input
                  name="collegeNameAmharic"
                  value={formData.collegeNameAmharic}
                  onChange={handleFieldChange}
                  maxLength={255}
                />
              </label>
              <label>
                Description
                <textarea
                  name="collegeDescription"
                  value={formData.collegeDescription}
                  onChange={handleFieldChange}
                  maxLength={1000}
                  rows={3}
                />
              </label>
              <label>
                Description (Amharic)
                <textarea
                  name="collegeDescriptionAmharic"
                  value={formData.collegeDescriptionAmharic}
                  onChange={handleFieldChange}
                  maxLength={1000}
                  rows={3}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingCollege ? 'Update College' : 'Create College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Colleges;
