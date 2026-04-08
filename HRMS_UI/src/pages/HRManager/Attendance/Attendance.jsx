import React, { useState } from "react";
import "./attendance.css";

const employees = [
  "Alamirew Wagaw",
  "Mahilet Alemnew",
  "Belayneh Kassa",
  "Tigist Zewde",
];

const statusOptions = ["Present", "Late", "On Leave"];

const Attendance = () => {
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [record, setRecord] = useState({
    employee: "",
    date: "2023-10-27",
    morningStatus: "Present",
    afternoonStatus: "Present",
    remarks: "",
  });

  const handleRecordChange = (field, value) => {
    setRecord((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container">
      <div className="top-bar">
        <div className="brand-group">
          <div className="brand-name">
            <span className="brand-label">HR Portal</span>
            <span className="brand-subtitle">Emerald Ledger</span>
          </div>
          <div className="search-wrapper">
            <span className="search-icon">🔎</span>
            <input
              type="text"
              placeholder="Search logs, employees or records..."
              className="search"
            />
          </div>
        </div>

        <div className="page-title-right">Attendance Ledger</div>
      </div>

      {isNewRecordOpen ? (
        <div className="new-record-page">
          <div className="record-header">
            <div>
              <h1>New Attendance Record</h1>
              <p>Log daily employee clock-in and status for the central ledger.</p>
            </div>
            <button className="cancel-link" onClick={() => setIsNewRecordOpen(false)}>
              ← Cancel Entry
            </button>
          </div>

          <div className="record-form-card">
            <div className="form-grid">
              <label>
                Employee Name
                <select
                  value={record.employee}
                  onChange={(e) => handleRecordChange("employee", e.target.value)}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Entry Date
                <input
                  type="date"
                  value={record.date}
                  onChange={(e) => handleRecordChange("date", e.target.value)}
                />
              </label>
            </div>

            <div className="shift-card">
              <div className="shift-card-header">
                <span className="shift-icon">☀️</span>
                <div>
                  <h3>Morning Shift</h3>
                </div>
              </div>
              <div className="shift-fields">
                <div className="shift-field">
                  <label>Check-in</label>
                  <div className="stamp-pill">STAMP: 08:58AM</div>
                </div>
                <div className="shift-field disabled">
                  <label>Check-out</label>
                  <div className="stamp-pill inactive">Pending check-in</div>
                </div>
                <div className="shift-field status-field">
                  <label>Status</label>
                  <select
                    value={record.morningStatus}
                    onChange={(e) => handleRecordChange("morningStatus", e.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="shift-card">
              <div className="shift-card-header">
                <span className="shift-icon">🌥️</span>
                <div>
                  <h3>Afternoon Shift</h3>
                </div>
              </div>
              <div className="shift-fields">
                <div className="shift-field">
                  <label>Check-in</label>
                  <div className="stamp-pill">STAMP: 02:05PM</div>
                </div>
                <div className="shift-field">
                  <label>Check-out</label>
                  <div className="stamp-pill">STAMP: 05:42PM</div>
                </div>
                <div className="shift-field status-field">
                  <label>Status</label>
                  <select
                    value={record.afternoonStatus}
                    onChange={(e) => handleRecordChange("afternoonStatus", e.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="remarks-section">
              <label>Internal Remarks</label>
              <textarea
                value={record.remarks}
                onChange={(e) => handleRecordChange("remarks", e.target.value)}
                placeholder="Any notable observations for this entry..."
              />
            </div>

            <div className="record-footer">
              <div className="secure-label">🔒 Secure ledger entry</div>
              <button className="save-btn">Save Record →</button>
            </div>
          </div>

          <div className="summary-row">
            <div className="summary-card">
              <span>Weekly Avg</span>
              <strong>38.5 hrs</strong>
            </div>
            <div className="summary-card">
              <span>Overtime Status</span>
              <strong className="eligible">Eligible</strong>
            </div>
            <div className="summary-card audit-card">
              <span>Audit Trail</span>
              <strong>Last modified by Admin at 08:45AM</strong>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="title-section">
            <div>
              <h1>Attendance Ledger</h1>
              <p>Monday, October 23, 2023 • Global Campus Shift</p>
            </div>
            <button className="new-btn" onClick={() => setIsNewRecordOpen(true)}>
              + New Record
            </button>
          </section>

          <div className="cards">
            <div className="card">
              <p>Total Staff</p>
              <h2>1,248</h2>
            </div>
            <div className="card">
              <p>Present Today</p>
              <h2>1,182</h2>
            </div>
            <div className="card red">
              <p>Late Arrival</p>
              <h2>42</h2>
            </div>
            <div className="card">
              <p>On Leave</p>
              <h2>24</h2>
            </div>
          </div>

          <div className="attendance-table">
            <div className="table-header">
              <span>Employee Profile</span>
              <span>Morning Shift (08:00 - 12:00)</span>
              <span>Afternoon Shift (13:30 - 17:30)</span>
            </div>

            {employees.map((name, index) => (
              <div className="row" key={index}>
                <div className="employee">
                  <img
                    src={`https://i.pravatar.cc/48?img=${index + 1}`}
                    alt="avatar"
                    className="avatar"
                  />
                  <div>
                    <h4>{name}</h4>
                    <p>Department</p>
                  </div>
                </div>

                <div className="shift-block">
                  <div className="shift-times">
                    <span className="time-pill">IN: 08:00</span>
                    <span className="time-pill">OUT: 12:00</span>
                  </div>
                  <div className="status-pill present">Present</div>
                </div>

                <div className="shift-block">
                  <div className="shift-times">
                    <span className="time-pill">IN: 13:30</span>
                    <span className="time-pill">OUT: 17:30</span>
                  </div>
                  <div className="status-pill present">Present</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;
