import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Edit, 
  Check, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  History, 
  FileCheck,
  User,
  Award,
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';

export default function AppraisalForm({ token, user }) {
  // Query parameter parsing for direct links (e.g. /appraise?code=EMP001)
  const getQueryCode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('code') || '';
  };

  const isAdmin = user && user.is_staff;
  const initialCode = getQueryCode() || (user && !user.is_staff ? user.username : '');

  // Tabs state: 'form' or 'list'
  const [activeTab, setActiveTab] = useState('form');

  // Employee details
  const [employeeCode, setEmployeeCode] = useState(initialCode);
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [assignmentPeriod, setAssignmentPeriod] = useState('Annual');

  // Performance Domains (0-20 each)
  const [scores, setScores] = useState({
    job_competence: 0,
    productivity_responsibility: 0,
    communication_teamwork: 0,
    professionalism_discipline: 0,
    initiative_improvement: 0
  });

  // Deduction manually entered
  const [totalDeduction, setTotalDeduction] = useState(0);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Editing state
  const [editingAppraisalId, setEditingAppraisalId] = useState(null);
  
  // List of submissions for this code
  const [mySubmissions, setMySubmissions] = useState([]);
  
  // Operation statuses
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auto-fetch employee details on mount if code is available
  useEffect(() => {
    if (initialCode) {
      setEmployeeCode(initialCode);
      fetchEmployeeDetails(initialCode);
      fetchMySubmissions(initialCode);
    }
  }, [initialCode]);

  const fetchEmployeeDetails = async (codeToFetch) => {
    const code = codeToFetch || employeeCode;
    if (!code) {
      triggerToast('Please enter an employee code', 'error');
      return;
    }
    
    setFetching(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/fetch/?code=${code}`);
      const data = await response.json();
      
      if (response.ok) {
        setEmployeeName(data.name || '');
        setDepartment(data.department || '');
        setDesignation(data.designation || '');
        setDateOfJoining(data.date_of_joining || '');
        setAssignmentPeriod(data.assignment_period || 'Annual');
        triggerToast('Employee details fetched successfully!');
        fetchMySubmissions(code);
        setValidationErrors(prev => ({ ...prev, employee: null }));
      } else {
        triggerToast(data.error || 'Employee not found', 'error');
      }
    } catch (err) {
      triggerToast('Error connecting to Employee database', 'error');
    } finally {
      setFetching(false);
    }
  };

  const fetchMySubmissions = async (codeToQuery) => {
    const code = codeToQuery || employeeCode;
    if (!code) return;

    setLoadingHistory(true);
    try {
      const url = `http://${window.location.hostname}:8000/api/appraisals/?employee_code=${code}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMySubmissions(data);
      }
    } catch (err) {
      console.error('Failed to load submissions list', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Score Calculations
  const performanceTotal = 
    Number(scores.job_competence) +
    Number(scores.productivity_responsibility) +
    Number(scores.communication_teamwork) +
    Number(scores.professionalism_discipline) +
    Number(scores.initiative_improvement);

  const finalScore = performanceTotal - Number(totalDeduction);

  const getRatingText = (score) => {
    if (score >= 90) return 'Outstanding (A)';
    if (score >= 75) return 'Very Good (B)';
    if (score >= 60) return 'Good (C)';
    if (score >= 50) return 'Needs Improvement (D)';
    return 'Unsatisfactory (E)';
  };

  const handleScoreChange = (field, value) => {
    const num = Number(value);
    let errors = { ...validationErrors };
    
    if (value === '' || isNaN(num) || num < 0 || num > 20) {
      errors[field] = 'Score must be between 0 and 20';
    } else {
      errors[field] = null;
    }
    setValidationErrors(errors);

    const val = value === '' ? '' : Math.max(0, Math.min(20, num));
    setScores(prev => ({ ...prev, [field]: val }));
  };

  const handleDeductionChange = (value) => {
    const num = Number(value);
    let errors = { ...validationErrors };
    
    if (value === '' || isNaN(num) || num < 0) {
      errors.deductions = 'Deductions cannot be negative';
    } else {
      errors.deductions = null;
    }
    setValidationErrors(errors);

    const deduction = value === '' ? '' : Math.max(0, num);
    setTotalDeduction(deduction);
  };

  const validateForm = () => {
    let errors = {};
    let isValid = true;

    if (!employeeName) {
      errors.employee = 'Employee details must be fetched first';
      isValid = false;
    }

    Object.keys(scores).forEach(key => {
      const s = scores[key];
      if (s === '' || s < 0 || s > 20) {
        errors[key] = 'Required score between 0 and 20';
        isValid = false;
      }
    });

    if (totalDeduction === '' || totalDeduction < 0) {
      errors.deductions = 'Required score >= 0';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      triggerToast('Please correct validation errors on the form.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_code: employeeCode,
        employee_name: employeeName,
        department,
        designation,
        date_of_joining: dateOfJoining,
        assignment_period: assignmentPeriod,
        job_competence: Number(scores.job_competence),
        productivity_responsibility: Number(scores.productivity_responsibility),
        communication_teamwork: Number(scores.communication_teamwork),
        professionalism_discipline: Number(scores.professionalism_discipline),
        initiative_improvement: Number(scores.initiative_improvement),
        total_deduction: Number(totalDeduction),
        status: 'Draft'
      };

      const url = editingAppraisalId 
        ? `http://${window.location.hostname}:8000/api/appraisals/${editingAppraisalId}/` 
        : `http://${window.location.hostname}:8000/api/appraisals/`;
      
      const method = editingAppraisalId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        triggerToast(editingAppraisalId ? 'Appraisal draft updated successfully!' : 'Appraisal draft saved successfully!', 'success');
        
        // Reset scores
        setScores({
          job_competence: 0,
          productivity_responsibility: 0,
          communication_teamwork: 0,
          professionalism_discipline: 0,
          initiative_improvement: 0
        });
        setTotalDeduction(0);
        setEditingAppraisalId(null);
        
        fetchMySubmissions(employeeCode);
        setActiveTab('list');
      } else {
        triggerToast(result.detail || 'Failed to submit form', 'error');
      }
    } catch (err) {
      triggerToast('Network error submitting appraisal.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDraft = (appraisal) => {
    if (appraisal.status === 'Approved') {
      triggerToast('Approved appraisals are locked and cannot be edited.', 'error');
      return;
    }
    
    setEditingAppraisalId(appraisal.id);
    setScores({
      job_competence: appraisal.job_competence,
      productivity_responsibility: appraisal.productivity_responsibility,
      communication_teamwork: appraisal.communication_teamwork,
      professionalism_discipline: appraisal.professionalism_discipline,
      initiative_improvement: appraisal.initiative_improvement
    });
    setTotalDeduction(appraisal.total_deduction);
    
    setEmployeeName(appraisal.employee_name);
    setDepartment(appraisal.department);
    setDesignation(appraisal.designation);
    setDateOfJoining(appraisal.date_of_joining);
    setAssignmentPeriod(appraisal.assignment_period);
    
    setActiveTab('form');
    triggerToast('Draft appraisal loaded! Make changes and submit.');
  };

  const handleApproveDraft = async (appraisalId) => {
    if (!window.confirm("Once approved, you can no longer edit this appraisal. Do you want to finalize now?")) return;

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/appraisals/${appraisalId}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        }
      });
      if (response.ok) {
        triggerToast('Appraisal approved and locked successfully!');
        fetchMySubmissions(employeeCode);
      } else {
        triggerToast('Failed to approve appraisal.', 'error');
      }
    } catch (err) {
      triggerToast('Connection error during approval.', 'error');
    }
  };

  const handlePrintSub = (appraisal) => {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
        <head>
          <title>Appraisal Print - ${appraisal.employee_name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: black; background: white; }
            .header { text-align: center; border-bottom: 3px double black; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; margin-top: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid black; margin-bottom: 20px; }
            .grid-cell { border: 1px solid black; padding: 8px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 8px; font-size: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .badge { display: inline-block; padding: 4px 8px; border: 1px solid black; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div style="font-size: 22px; font-weight: bold; color: #1a365d;">IQRAA</div>
            <div style="font-size: 11px; text-transform: uppercase;">International Hospital & Research Centre</div>
            <div class="title">PERFORMANCE APPRAISAL FORM</div>
          </div>
          <div class="grid">
            <div class="grid-cell"><strong>Employee Code:</strong> ${appraisal.employee_code}</div>
            <div class="grid-cell"><strong>Employee Name:</strong> ${appraisal.employee_name}</div>
            <div class="grid-cell"><strong>Department/Location:</strong> ${appraisal.department}</div>
            <div class="grid-cell"><strong>Designation:</strong> ${appraisal.designation}</div>
            <div class="grid-cell"><strong>Date of Joining:</strong> ${appraisal.date_of_joining}</div>
            <div class="grid-cell"><strong>Assessment Period:</strong> ${appraisal.assignment_period}</div>
          </div>
          <h3>Performance Domains</h3>
          <table>
            <thead>
              <tr><th>Domain</th><th>Criteria</th><th>Score</th></tr>
            </thead>
            <tbody>
              <tr><td>Job Competence</td><td>Knowledge, technical skills, quality, accuracy</td><td>${appraisal.job_competence} / 20</td></tr>
              <tr><td>Productivity & Responsibility</td><td>Output, efficiency, accountability</td><td>${appraisal.productivity_responsibility} / 20</td></tr>
              <tr><td>Communication & Teamwork</td><td>Communication, cooperation, patient interaction</td><td>${appraisal.communication_teamwork} / 20</td></tr>
              <tr><td>Professionalism & Discipline</td><td>Attendance, punctuality, ethics, policy compliance</td><td>${appraisal.professionalism_discipline} / 20</td></tr>
              <tr><td>Initiative & Continuous Improvement</td><td>Learning, problem-solving, innovation</td><td>${appraisal.initiative_improvement} / 20</td></tr>
              <tr class="total-row"><td>Performance Total</td><td>/100</td><td>${appraisal.performance_score} / 100</td></tr>
            </tbody>
          </table>
          <h3>Deductions & Final Score</h3>
          <table>
            <tbody>
              <tr><td>Performance Score (Total)</td><td>${appraisal.performance_score} / 100</td></tr>
              <tr><td>Less Deductions (Attendance/Misconduct)</td><td style="color: red;">-${appraisal.total_deduction}</td></tr>
              <tr class="total-row"><td>Final Appraisal Score</td><td>${appraisal.final_score} / 100</td></tr>
              <tr class="total-row"><td>Derived Rating</td><td><span class="badge">${appraisal.rating}</span></td></tr>
            </tbody>
          </table>
          <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 13px;">
            <div style="border-top: 1px solid black; padding-top: 5px;">Reviewer Signature</div>
            <div style="border-top: 1px solid black; padding-top: 5px;">Employee Signature</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getRatingBadgeClass = (r) => {
    if (!r) return '';
    if (r.includes('(A)')) return 'rating-a';
    if (r.includes('(B)')) return 'rating-b';
    if (r.includes('(C)')) return 'rating-c';
    if (r.includes('(D)')) return 'rating-d';
    return 'rating-e';
  };

  // Color variables mapped to global CSS variables (supporting Dark Blue + Orange + White theme)
  const primaryBlue = 'var(--primary)';
  const lightBlueBg = 'var(--bg-active)';
  const borderLight = 'var(--border-color)';
  const textDark = 'var(--text-main)';
  const textMedium = 'var(--text-muted)';

  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px', transition: 'all 0.3s ease' }}>
      
      {/* Toast notifications */}
      {toast && (
        <div className={`alert-toast alert-${toast.type}`} style={{ zIndex: 1000, animation: 'fadeIn 0.2s ease-in-out' }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Access Card if not fetched */}
      {!initialCode && !employeeName && (
        <div 
          style={{ 
            marginBottom: '24px', 
            padding: '40px', 
            textAlign: 'center', 
            backgroundColor: '#ffffff', 
            border: `1px solid ${borderLight}`,
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: lightBlueBg, color: primaryBlue, marginBottom: '16px' }}>
            <User size={32} />
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px', color: textDark, fontWeight: '700' }}>Employee Appraisal Access</h2>
          <p style={{ color: textMedium, fontSize: '14px', marginBottom: '24px', maxWidth: '460px', margin: '0 auto 24px' }}>
            Please enter your Employee Code to access the evaluation form and view history.
          </p>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '380px', margin: '0 auto' }}>
            <input
              type="text"
              id="emp_code_input"
              className="form-control"
              placeholder="e.g. EMP001"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              aria-label="Employee Code input"
              style={{ fontSize: '14px', borderColor: borderLight, color: '#000000', backgroundColor: '#ffffff' }}
            />
            <button 
              className="btn btn-primary" 
              onClick={() => fetchEmployeeDetails(employeeCode)} 
              disabled={fetching}
              style={{ backgroundColor: primaryBlue, borderColor: primaryBlue }}
            >
              {fetching ? 'Searching...' : 'Go to Form'}
            </button>
          </div>
        </div>
      )}

      {/* Form Tabs and Layout */}
      {(employeeName || initialCode) && (
        <>
          {/* STICKY TAB HEADER: Sticks at the top when scrolling down */}
          <div 
            style={{ 
              position: 'sticky', 
              top: '0', 
              zIndex: '99', 
              backgroundColor: '#f8fafc', 
              borderBottom: `2px solid ${borderLight}`,
              padding: '12px 0 6px',
              margin: '0 -24px 20px',
              paddingLeft: '24px',
              paddingRight: '24px',
              display: 'flex',
              gap: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <button 
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
              style={{ 
                color: activeTab === 'form' ? primaryBlue : textMedium, 
                borderBottomColor: activeTab === 'form' ? primaryBlue : 'transparent',
                fontWeight: '600',
                paddingBottom: '8px'
              }}
            >
              <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {editingAppraisalId ? 'Edit Appraisal Draft' : 'Appraisal Form'}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => { setActiveTab('list'); fetchMySubmissions(employeeCode); }}
              style={{ 
                color: activeTab === 'list' ? primaryBlue : textMedium, 
                borderBottomColor: activeTab === 'list' ? primaryBlue : 'transparent',
                fontWeight: '600',
                paddingBottom: '8px'
              }}
            >
              <History size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              My Appraisals ({mySubmissions.length})
            </button>
          </div>

          {activeTab === 'form' ? (
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* FETCHING SKELETON: Display pulsing outline cards while loading details */}
              {fetching ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="card skeleton-box" style={{ height: '180px', border: `1px solid ${borderLight}` }} />
                  <div className="card skeleton-box" style={{ height: '300px', border: `1px solid ${borderLight}` }} />
                </div>
              ) : (
                <>
                  {/* TWO COLUMN GRID: Employee Profile Details & Live Final Scores Side-by-Side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'stretch' }}>
                    
                    {/* Left Card: Employee Information (White with Blue accents) */}
                    <div 
                      style={{ 
                        backgroundColor: '#ffffff', 
                        border: `1px solid ${borderLight}`, 
                        borderRadius: '8px', 
                        padding: '24px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderLight}`, paddingBottom: '12px', marginBottom: '16px' }}>
                        <div>
                          <h2 style={{ fontSize: '18px', color: primaryBlue, margin: 0, fontWeight: '700' }}>IQRAA Hospital</h2>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: textMedium }}>Performance appraisal master</span>
                        </div>
                        <span 
                          style={{ 
                            padding: '3px 10px', 
                            borderRadius: '12px', 
                            fontSize: '10px', 
                            fontWeight: '600', 
                            backgroundColor: lightBlueBg, 
                            color: primaryBlue,
                            border: `1px solid #bfdbfe`
                          }}
                        >
                          {editingAppraisalId ? 'Edit Draft' : 'New Evaluation'}
                        </span>
                      </div>

                      {validationErrors.employee && (
                        <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={14} />
                          <span>{validationErrors.employee}</span>
                        </div>
                      )}

                      <div className="grid-cols-2" style={{ gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_code" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Employee Code</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              id="form_code"
                              className="form-control"
                              value={employeeCode}
                              onChange={(e) => setEmployeeCode(e.target.value)}
                              disabled={!isAdmin || !!initialCode}
                              required
                              style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                            />
                            {isAdmin && !initialCode && (
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => fetchEmployeeDetails(null)}
                                disabled={fetching}
                                style={{ padding: '6px 12px' }}
                              >
                                <Search size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_name" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Employee Name</label>
                          <input
                            type="text"
                            id="form_name"
                            className="form-control"
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                            required
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          />
                        </div>
                      </div>

                      <div className="grid-cols-2" style={{ gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_dept" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Department / Location</label>
                          <input
                            type="text"
                            id="form_dept"
                            className="form-control"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            required
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_desig" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Designation</label>
                          <input
                            type="text"
                            id="form_desig"
                            className="form-control"
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            required
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          />
                        </div>
                      </div>

                      <div className="grid-cols-2" style={{ gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_doj" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Date of Joining</label>
                          <input
                            type="date"
                            id="form_doj"
                            className="form-control"
                            value={dateOfJoining}
                            onChange={(e) => setDateOfJoining(e.target.value)}
                            required
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_period" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Assessment Period</label>
                          <select 
                            id="form_period"
                            className="form-control" 
                            value={assignmentPeriod} 
                            onChange={(e) => setAssignmentPeriod(e.target.value)}
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          >
                            <option value="Annual">Annual</option>
                            <option value="Semi-Annual">Semi-Annual</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: Final calculations Summary Panel */}
                    <div 
                      style={{ 
                        backgroundColor: '#ffffff', 
                        border: `1px solid ${borderLight}`, 
                        borderRadius: '8px', 
                        padding: '24px',
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: textMedium, marginBottom: '16px' }}>
                          Evaluation Summary
                        </h3>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: textMedium }}>
                          <span>Performance Subtotal:</span>
                          <strong style={{ color: textDark }}>{performanceTotal} / 100</strong>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: textMedium }}>
                          <span>Deductions Score:</span>
                          <strong style={{ color: '#ef4444' }}>-{totalDeduction}</strong>
                        </div>

                        <div style={{ borderTop: `1px solid ${borderLight}`, paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: textDark }}>Final Score:</span>
                          <span style={{ fontSize: '28px', fontWeight: '800', color: primaryBlue, fontFamily: 'Outfit' }}>{finalScore}</span>
                        </div>
                      </div>

                      <div 
                        style={{ 
                          backgroundColor: lightBlueBg, 
                          borderRadius: '6px', 
                          padding: '12px', 
                          textAlign: 'center', 
                          border: `1px solid #bfdbfe`,
                          marginTop: '16px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: primaryBlue, fontWeight: '700', letterSpacing: '0.05em' }}>Derived Grade</span>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: textDark, marginTop: '2px' }}>
                          {getRatingText(finalScore)}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* CARD 2: Compact Domain List */}
                  <div 
                    style={{ 
                      backgroundColor: '#ffffff', 
                      border: `1px solid ${borderLight}`, 
                      borderRadius: '8px', 
                      padding: '24px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <h3 style={{ fontSize: '15px', color: textDark, fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={18} style={{ color: primaryBlue }} />
                      <span>Performance Domains Evaluation (Score 0 - 20)</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {[
                        { key: 'job_competence', title: 'Job Competence', desc: 'Knowledge, technical skills, quality, accuracy' },
                        { key: 'productivity_responsibility', title: 'Productivity & Responsibility', desc: 'Output, work speed, efficiency, accountability' },
                        { key: 'communication_teamwork', title: 'Communication & Teamwork', desc: 'Active listening, teamwork, patient relationship management' },
                        { key: 'professionalism_discipline', title: 'Professionalism & Discipline', desc: 'Attendance, punctuality, code of conduct compliance' },
                        { key: 'initiative_improvement', title: 'Initiative & Continuous Improvement', desc: 'Training participation, innovation, problem-solving ability' }
                      ].map((dom, index) => (
                        <div 
                          key={dom.key} 
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 200px 80px', 
                            alignItems: 'center', 
                            gap: '20px',
                            padding: '14px 0',
                            borderBottom: index === 4 ? 'none' : `1px solid ${borderLight}`
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '14px', color: textDark, fontWeight: '600', margin: 0 }}>
                              {index + 1}. {dom.title}
                            </h4>
                            <p style={{ fontSize: '12px', color: textMedium, margin: '2px 0 0' }}>{dom.desc}</p>
                            {validationErrors[dom.key] && (
                              <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                {validationErrors[dom.key]}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="range" 
                              min="0" max="20" 
                              value={scores[dom.key]}
                              onChange={(e) => handleScoreChange(dom.key, e.target.value)}
                              aria-label={`${dom.title} rating slider`}
                              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                          </div>
                          <div>
                            <input 
                              type="number" 
                              className="form-control" 
                              min="0" max="20"
                              value={scores[dom.key]}
                              onChange={(e) => handleScoreChange(dom.key, e.target.value)}
                              aria-label={`${dom.title} numeric score`}
                              style={{ 
                                width: '70px', 
                                textAlign: 'center', 
                                fontWeight: '700', 
                                fontSize: '14px',
                                padding: '4px 6px',
                                color: '#000000',
                                backgroundColor: '#ffffff',
                                borderColor: validationErrors[dom.key] ? '#ef4444' : borderLight
                              }}
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div 
                      style={{ 
                        marginTop: '16px', 
                        paddingTop: '16px',
                        borderTop: `2px solid ${borderLight}`,
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: '700', color: textDark }}>Performance Total Score:</span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: primaryBlue }}>{performanceTotal} / 100</span>
                    </div>
                  </div>

                  {/* CARD 3: Negative Marking / Deductions (FULLY VISIBLE - RESTORED LIKE BEFORE) */}
                  <div 
                    style={{ 
                      backgroundColor: '#ffffff', 
                      border: `1px solid ${borderLight}`, 
                      borderRadius: '8px', 
                      padding: '24px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: `1px solid ${borderLight}`, paddingBottom: '12px' }}>
                      <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                      <span style={{ fontSize: '15px', color: textDark, fontWeight: '700' }}>Negative Marking (Deductions)</span>
                    </div>

                    <p style={{ fontSize: '13px', color: textMedium, marginBottom: '16px' }}>
                      Verify structural absences, warning events, or incident rules and enter the sum total to subtract:
                    </p>

                    <div className="table-container" style={{ marginBottom: '20px' }}>
                      <table className="iqraa-table" style={{ margin: 0 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ color: textDark }}>Issue type</th>
                            <th style={{ color: textDark }}>Deduction Scale</th>
                            <th style={{ color: textDark }}>Guideline Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Unapproved absence</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-2 marks/day</td>
                            <td style={{ color: '#000000' }}>Absence without written request or valid medical justification.</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Late/early attendance</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-1 mark</td>
                            <td style={{ color: '#000000' }}>If the employee has &gt;3 instances of unexcused late/early checkouts.</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Misconduct</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-2 to -5 marks</td>
                            <td style={{ color: '#000000' }}>Deduct according to investigation findings and warning severity.</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Protocol violation</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-3 marks/incident</td>
                            <td style={{ color: '#000000' }}>Verified violation of patient care, safety, or clinical SOPs.</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Disciplinary written warning</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-5 marks</td>
                            <td style={{ color: '#000000' }}>Issued written caution during the appraisal cycle.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div 
                      style={{ 
                        marginTop: '16px', 
                        paddingTop: '16px',
                        borderTop: `1px dashed ${borderLight}`,
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '13px', color: textMedium, fontWeight: '600' }}>Enter verified deductions score to subtract:</span>
                        {validationErrors.deductions && (
                          <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                            {validationErrors.deductions}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={totalDeduction}
                        onChange={(e) => handleDeductionChange(e.target.value)}
                        aria-label="Manual deductions score"
                        style={{ 
                          width: '90px', 
                          textAlign: 'center', 
                          fontWeight: '700', 
                          fontSize: '14px', 
                          borderColor: validationErrors.deductions ? '#ef4444' : '#f59e0b',
                          color: '#000000',
                          backgroundColor: '#ffffff'
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* CARD 4: Actions & Rating Legend Scale */}
                  <div 
                    style={{ 
                      backgroundColor: '#ffffff', 
                      border: `1px solid ${borderLight}`, 
                      borderRadius: '8px', 
                      padding: '20px 24px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    {/* Score Scale Legend */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="rating-badge rating-a" style={{ fontSize: '10px', padding: '2px 5px', color: '#1e3a8a', backgroundColor: '#dbeafe', borderColor: '#93c5fd' }}>A</span>
                        <span style={{ color: textMedium }}>90+ Outstanding</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="rating-badge rating-b" style={{ fontSize: '10px', padding: '2px 5px', color: '#065f46', backgroundColor: '#d1fae5', borderColor: '#6ee7b7' }}>B</span>
                        <span style={{ color: textMedium }}>75-89 Very Good</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="rating-badge rating-c" style={{ fontSize: '10px', padding: '2px 5px', color: '#92400e', backgroundColor: '#fef3c7', borderColor: '#fde047' }}>C</span>
                        <span style={{ color: textMedium }}>60-74 Good</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="rating-badge rating-d" style={{ fontSize: '10px', padding: '2px 5px', color: '#b45309', backgroundColor: '#ffedd5', borderColor: '#fdba74' }}>D</span>
                        <span style={{ color: textMedium }}>50-59 Needs Imp.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="rating-badge rating-e" style={{ fontSize: '10px', padding: '2px 5px', color: '#991b1b', backgroundColor: '#fee2e2', borderColor: '#fca5a5' }}>E</span>
                        <span style={{ color: textMedium }}>&lt;50 Unsat.</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      {editingAppraisalId && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={() => {
                            setEditingAppraisalId(null);
                            setScores({
                              job_competence: 0,
                              productivity_responsibility: 0,
                              communication_teamwork: 0,
                              professionalism_discipline: 0,
                              initiative_improvement: 0
                            });
                            setTotalDeduction(0);
                            setActiveTab('list');
                          }}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={submitting}
                        style={{ padding: '10px 24px', backgroundColor: primaryBlue, borderColor: primaryBlue, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <FileCheck size={16} />
                        <span>{submitting ? 'Saving...' : (editingAppraisalId ? 'Save Changes (Draft)' : 'Save Appraisal Draft')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

            </form>
          ) : (
            
            // Tab 2: My Appraisals Submission History List (Light styled)
            <div 
              style={{ 
                backgroundColor: '#ffffff', 
                border: `1px solid ${borderLight}`, 
                borderRadius: '8px', 
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <h2 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: textDark, fontWeight: '750' }}>
                <History size={18} style={{ color: primaryBlue }} />
                <span>Submitted Appraisals History</span>
              </h2>

              {/* SKELETON LOADER FOR HISTORY LIST */}
              {loadingHistory ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="skeleton-box skeleton-text" style={{ width: '100%', height: '35px' }} />
                  <div className="skeleton-box skeleton-text" style={{ width: '100%', height: '35px' }} />
                  <div className="skeleton-box skeleton-text" style={{ width: '100%', height: '35px' }} />
                </div>
              ) : mySubmissions.length === 0 ? (
                <p style={{ color: textMedium, fontSize: '13px', textAlign: 'center', padding: '30px' }}>
                  No appraisals submitted for this employee code yet.
                </p>
              ) : (
                <div className="table-container">
                  <table className="data-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ color: textDark }}>Submission Date</th>
                        <th style={{ color: textDark }}>Period</th>
                        <th style={{ textAlign: 'center', color: textDark }}>Perf. Score</th>
                        <th style={{ textAlign: 'center', color: textDark }}>Deductions</th>
                        <th style={{ textAlign: 'center', color: textDark }}>Final Score</th>
                        <th style={{ color: textDark }}>Rating</th>
                        <th style={{ color: textDark }}>Status</th>
                        <th style={{ color: textDark }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mySubmissions.map((sub) => (
                        <tr key={sub.id} style={{ borderBottom: `1px solid ${borderLight}` }}>
                          <td style={{ color: textDark }}>{new Date(sub.submitted_date).toLocaleDateString()}</td>
                          <td style={{ color: textDark }}>{sub.assignment_period}</td>
                          <td style={{ textAlign: 'center', color: textDark }}>{sub.performance_score}</td>
                          <td style={{ textAlign: 'center', color: sub.total_deduction > 0 ? '#ef4444' : textDark }}>
                            -{sub.total_deduction}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: primaryBlue }}>{sub.final_score}</td>
                          <td>
                            <span className={`rating-badge ${getRatingBadgeClass(sub.rating)}`}>
                              {sub.rating ? sub.rating.split(' ')[0] : ''}
                            </span>
                          </td>
                          <td>
                            <span 
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600',
                                backgroundColor: sub.status === 'Approved' ? '#d1fae5' : '#fef3c7',
                                color: sub.status === 'Approved' ? '#065f46' : '#d97706',
                                border: sub.status === 'Approved' ? '1px solid #a7f3d0' : '1px solid #fde047'
                              }}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {sub.status === 'Draft' ? (
                                <>
                                  <button 
                                    onClick={() => handleEditDraft(sub)} 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '11px', color: textDark, borderColor: borderLight }}
                                    title="Edit appraisal details"
                                  >
                                    <Edit size={11} style={{ marginRight: '3px' }} />
                                    <span>Edit</span>
                                  </button>
                                  <button 
                                    onClick={() => handleApproveDraft(sub.id)} 
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#059669', borderColor: '#059669', boxShadow: 'none' }}
                                    title="Finalize and lock appraisal"
                                  >
                                    <Check size={11} style={{ marginRight: '3px' }} />
                                    <span>Approve</span>
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: '11px', color: textMedium, fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                                  Locked
                                </span>
                              )}
                              <button 
                                onClick={() => handlePrintSub(sub)} 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', color: textDark, borderColor: borderLight }}
                                title="Print Appraisal Form"
                              >
                                <Printer size={11} style={{ marginRight: '3px' }} />
                                <span>Print</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
