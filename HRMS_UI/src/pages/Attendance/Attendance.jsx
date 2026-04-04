import React from "react";
import "./attendance.css";

const employees = [
  {
    name: "Alamirew Wagaw",
    dept: "Faculty of Engineering",
    morningIn: "07:54",
    morningOut: "12:05",
    morningStatus: "Present",
    afternoonIn: "13:28",
    afternoonOut: "--:--",
    afternoonStatus: "Present",
  },
  {
    name: "Mahilet Alemnew",
    dept: "Admin Services",
    morningIn: "08:15",
    morningOut: "12:10",
    morningStatus: "Late",
    afternoonIn: "13:30",
    afternoonOut: "--:--",
    afternoonStatus: "Present",
  },
  {
    name: "Belayneh Kassa",
    dept: "Registrar Office",
    morningIn: "--:--",
    morningOut: "--:--",
    morningStatus: "On Leave",
    afternoonIn: "--:--",
    afternoonOut: "--:--",
    afternoonStatus: "On Leave",
  },
  {
    name: "Tigist Zewde",
    dept: "Health Sciences",
    morningIn: "08:02",
    morningOut: "12:00",
    morningStatus: "Present",
    afternoonIn: "13:35",
    afternoonOut: "--:--",
    afternoonStatus: "Present",
  },
];

const Attendance = () => {
  return (
    <div className="container">

      {/* HEADER */}
      <div className="header">
        <h2 className="logo">Emerald Ledger</h2>
        <input
          type="text"
          placeholder="Search employees by name or ID..."
          className="search"
        />
        <div className="profile">Admin Portal</div>
      </div>

      {/* TITLE + BUTTON */}
      <div className="title-section">
        <div>
          <h1>Attendance Ledger</h1>
          <p>Monday, October 23, 2023 • Global Campus Shift</p>
        </div>
        <button className="new-btn">+ New Record</button>
      </div>

      {/* CARDS */}
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

      {/* TABLE HEADER */}
      <div className="table-header">
        <span>Employee Profile</span>
        <span>Morning Shift (08:00 - 12:00)</span>
        <span>Afternoon Shift (13:30 - 17:30)</span>
      </div>

      {/* ROWS */}
      {employees.map((emp, index) => (
        <div className="row" key={index}>
          
          {/* EMPLOYEE */}
          <div className="employee">
            <img
              src={`https://i.pravatar.cc/40?img=${index + 1}`}
              alt="avatar"
              className="avatar"
            />
            <div>
              <h4>{emp.name}</h4>
              <p>{emp.dept}</p>
            </div>
          </div>

          {/* MORNING */}
          <div className="shift">
            <div className="time">
              IN: {emp.morningIn} | OUT: {emp.morningOut}
            </div>
            <span className={`status ${emp.morningStatus.replace(" ", "-").toLowerCase()}`}>
              {emp.morningStatus}
            </span>
          </div>

          {/* AFTERNOON */}
          <div className="shift">
            <div className="time">
              IN: {emp.afternoonIn} | OUT: {emp.afternoonOut}
            </div>
            <span className={`status ${emp.afternoonStatus.replace(" ", "-").toLowerCase()}`}>
              {emp.afternoonStatus}
            </span>
          </div>

        </div>
      ))}

    </div>
  );
};

export default Attendance;
