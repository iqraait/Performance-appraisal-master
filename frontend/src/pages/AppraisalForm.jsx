import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Info,
  ChevronDown,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import iqraaLogo from '../assets/iqraa-logo.png';

export default function AppraisalForm({ token, user, selectedBranch }) {
  const routeLocation = useLocation();

  // Query parameter parsing for direct links (e.g. /appraise?code=EMP001)
  const getQueryCode = () => {
    const params = new URLSearchParams(routeLocation.search);
    return params.get('code') || '';
  };

  const getQueryTab = () => {
    const params = new URLSearchParams(routeLocation.search);
    return params.get('tab') || 'form';
  };

  const isAdmin = user && (user.is_staff || user.is_superuser || user.role === 'department_admin' || user.role === 'superuser');
  const initialCode = getQueryCode() || (user && !isAdmin ? user.username : '');

  // Tabs state: 'form' or 'list'
  const [activeTab, setActiveTab] = useState(getQueryTab());

  // Employee details
  const [employeeCode, setEmployeeCode] = useState(initialCode);
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [branch, setBranch] = useState(selectedBranch || '');
  const [designation, setDesignation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [assignmentPeriod, setAssignmentPeriod] = useState('');
  const [incentivePeriods, setIncentivePeriods] = useState([]);
  const activePeriodObj = incentivePeriods.find(p => p.is_active);
  const activePeriodName = activePeriodObj ? activePeriodObj.name : '';

  // Performance Domains (0-20 each)
  const [scores, setScores] = useState({
    job_competence: 0,
    productivity_responsibility: 0,
    communication_teamwork: 0,
    professionalism_discipline: 0,
    initiative_improvement: 0
  });

  // Individual deductions state
  const [deductionDetails, setDeductionDetails] = useState({
    unapproved_absence: 0,
    late_attendance: 0,
    misconduct: 0,
    protocol_violation: 0,
    written_warning: 0
  });

  const totalDeduction = 
    Number(deductionDetails.unapproved_absence) +
    Number(deductionDetails.late_attendance) +
    Number(deductionDetails.misconduct) +
    Number(deductionDetails.protocol_violation) +
    Number(deductionDetails.written_warning);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Department active staff and score limit stats
  const [departmentStats, setDepartmentStats] = useState({
    activeStaff: 0,
    existingRestricted: 0,
    originalAppraisalScore: null
  });

  // Editing state
  const [editingAppraisalId, setEditingAppraisalId] = useState(null);
  
  // List of submissions for this code
  const [mySubmissions, setMySubmissions] = useState([]);

  // Historical appraisals for the employee currently loaded in evaluation form
  const [empHistory, setEmpHistory] = useState([]);
  const [loadingEmpHistory, setLoadingEmpHistory] = useState(false);

  // Cascading dropdown states for public landing access
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedLoc, setSelectedLoc] = useState('');
  const [selectedEmpCode, setSelectedEmpCode] = useState('');

  // Search input queries for cascading dropdowns
  const [deptQuery, setDeptQuery] = useState('');
  const [locQuery, setLocQuery] = useState('');
  const [empQuery, setEmpQuery] = useState('');

  // Visibility states for dropdown lists
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  
  // Operation statuses
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load incentive periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/periods/`, {
          headers: token ? { 'Authorization': `Token ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setIncentivePeriods(data);
          const active = data.find(p => p.is_active);
          if (active) {
            setAssignmentPeriod(prev => (!prev || prev === 'Annual' || prev === 'Monthly' || prev === 'Quarterly' || prev === 'Semi-Annual' ? active.name : prev));
          }
        }
      } catch (err) {
        console.error("Error loading incentive periods", err);
      }
    };
    fetchPeriods();
  }, [token]);

  // Load department -> locations mapping from metadata
  const [metaDepartments, setMetaDepartments] = useState([]);
  const [metaLocations, setMetaLocations] = useState([]);
  const [metaLocationsMap, setMetaLocationsMap] = useState({});
  useEffect(() => {
    const fetchMetaLocations = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/meta/departments-locations/`, {
          headers: token ? { 'Authorization': `Token ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data.departments) setMetaDepartments(data.departments);
          if (data.locations) setMetaLocations(data.locations);
          if (data.department_locations) {
            setMetaLocationsMap(data.department_locations);
          }
        }
      } catch (e) {
        console.error("Error loading location metadata", e);
      }
    };
    fetchMetaLocations();
  }, [token]);

  // Listen to tab/code query changes from Sidebar links or route queries
  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const tab = params.get('tab') || 'form';
    setActiveTab(tab);
    
    const code = params.get('code') || (user && !isAdmin ? user.username : '');
    if (code) {
      setEmployeeCode(code);
      fetchEmployeeDetails(code);
      fetchMySubmissions(code);
      fetchEmployeeHistory(code);
      fetchExistingAppraisal(code, assignmentPeriod);
    } else {
      setEmployeeCode('');
      setEmployeeName('');
      setDepartment('');
      setLocation('');
      setBranch(selectedBranch || '');
      setDesignation('');
      setDateOfJoining('');
      setEditingAppraisalId(null);
      if (tab === 'list') {
        fetchMySubmissions('');
      }
    }
  }, [routeLocation.search, user, selectedBranch]);
  

  // Pre-select department for Department Admin if they have assigned departments
  useEffect(() => {
    if (user && user.role === 'department_admin' && Array.isArray(user.departments) && user.departments.length > 0 && !selectedDept) {
      const defaultDept = user.departments[0];
      setSelectedDept(defaultDept);
      setDeptQuery(defaultDept);
    }
  }, [user, selectedDept]);

  // Location dropdown: by default nothing selected for department admin with multiple locations,
  // allowing them to click and choose from the dropdown as requested.

  // Load active employees list for the cascading dropdown selection flow
  useEffect(() => {
    const loadAllEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch(`http://${window.location.hostname}:8000/api/employees/?status=Active&branch=${encodeURIComponent(selectedBranch || '')}`, {
          headers: token ? { 'Authorization': `Token ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setAllEmployees(data);
        }
      } catch (err) {
        console.error("Error loading active employees", err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    if (token) {
      loadAllEmployees();
    }
  }, [token, selectedBranch]);

  const fetchEmployeeDetails = async (codeToFetch) => {
    const code = codeToFetch || employeeCode;
    if (!code) {
      triggerToast('Please enter an employee code', 'error');
      return;
    }
    if (user && user.role === 'department_admin' && String(code).trim().toLowerCase() === String(user.username).trim().toLowerCase()) {
      triggerToast('Self-appraisal is not permitted. Your appraisal must be conducted by your supervisor.', 'error');
      return;
    }
    
    setFetching(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/fetch/?code=${code}&branch=${encodeURIComponent(selectedBranch || '')}&department=${encodeURIComponent(selectedDept || '')}&location=${encodeURIComponent(selectedLoc || '')}`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      const data = await response.json();
      
      if (response.ok) {
        setEmployeeCode(data.employee_code || code);
        setEmployeeName(data.name || '');
        setDepartment(data.department || '');
        setLocation(data.location || '');
        setBranch(data.branch || selectedBranch || '');
        setDesignation(data.designation || '');
        setDateOfJoining(data.date_of_joining || '');
        const activeName = (incentivePeriods.find(p => p.is_active) || {}).name;
        const validPeriod = (data.assignment_period && !['Annual', 'Monthly', 'Quarterly', 'Semi-Annual'].includes(data.assignment_period))
          ? data.assignment_period
          : (data.active_period_name || activeName || 'July -- Sep');
        setAssignmentPeriod(validPeriod);
        
        const useLocCount = data.location && data.location_total_active > 0;
        setDepartmentStats({
          activeStaff: useLocCount ? data.location_total_active : (data.department_total_active || 0),
          existingRestricted: data.scope_existing_restricted !== undefined ? data.scope_existing_restricted : (useLocCount ? data.location_existing_ab : (data.department_existing_ab || 0)),
          originalAppraisalScore: null
        });
        
        triggerToast('Employee details fetched successfully!');
        fetchMySubmissions(code);
        fetchEmployeeHistory(code);
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
    const code = (codeToQuery !== undefined && codeToQuery !== null) ? codeToQuery : employeeCode;

    setLoadingHistory(true);
    try {
      const url = code 
        ? `http://${window.location.hostname}:8000/api/appraisals/?employee_code=${code}&branch=${encodeURIComponent(selectedBranch || '')}`
        : `http://${window.location.hostname}:8000/api/appraisals/?branch=${encodeURIComponent(selectedBranch || '')}`;
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (response.ok) {
        let data = await response.json();
        if (user && user.role === 'department_admin' && user.username) {
          const currentUsername = String(user.username).trim().toLowerCase();
          data = (Array.isArray(data) ? data : []).filter(item => 
            String(item.employee_code || '').trim().toLowerCase() !== currentUsername
          );
        }
        setMySubmissions(data);
      }
    } catch (err) {
      console.error('Failed to load submissions list', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchEmployeeHistory = async (codeToQuery) => {
    const code = (codeToQuery !== undefined && codeToQuery !== null) ? codeToQuery : employeeCode;
    if (!code) {
      setEmpHistory([]);
      return;
    }

    setLoadingEmpHistory(true);
    try {
      const url = `http://${window.location.hostname}:8000/api/appraisals/?employee_code=${encodeURIComponent(code)}&all_periods=true`;
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        const sorted = Array.isArray(data) ? [...data].sort((a, b) => new Date(b.submitted_date || 0) - new Date(a.submitted_date || 0)) : [];
        setEmpHistory(sorted);
      }
    } catch (err) {
      console.error('Failed to load employee appraisal history', err);
    } finally {
      setLoadingEmpHistory(false);
    }
  };

  const getScoreTierInfo = (score) => {
    const s = Number(score) || 0;
    if (s >= 2.70) return { label: '2.70 – 3.00 (Tier 1)', pct: '90% – 100%', color: '#00b87c', bg: '#ecfdf5', border: '#a7f3d0' };
    if (s >= 2.25) return { label: '2.25 – 2.69 (Tier 2)', pct: '75% – 89%', color: '#0066ff', bg: '#eff6ff', border: '#bfdbfe' };
    if (s >= 1.80) return { label: '1.80 – 2.24 (Tier 3)', pct: '60% – 74%', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' };
    if (s >= 1.50) return { label: '1.50 – 1.79 (Tier 4)', pct: '50% – 59%', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' };
    return { label: '< 1.50 (Tier 5)', pct: 'Below 50%', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
  };

  useEffect(() => {
    if (employeeCode) {
      fetchEmployeeHistory(employeeCode);
    } else {
      setEmpHistory([]);
    }
  }, [employeeCode]);


  const fetchExistingAppraisal = async (codeToQuery, periodToQuery) => {
    const code = codeToQuery || employeeCode;
    const activeName = (incentivePeriods.find(p => p.is_active) || {}).name;
    const period = (periodToQuery && !['Annual', 'Monthly', 'Quarterly', 'Semi-Annual'].includes(periodToQuery))
      ? periodToQuery
      : (activeName || assignmentPeriod);
    if (!code) return;

    try {
      const url = `http://${window.location.hostname}:8000/api/appraisals/?employee_code=${code}`;
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        const existing = data.find(sub => 
          sub.assignment_period === period || 
          (activeName && sub.assignment_period === activeName)
        ) || (data.length > 0 ? data[0] : null);
        if (existing) {
          setEditingAppraisalId(existing.id);
          setAssignmentPeriod(existing.assignment_period || activeName || 'July -- Sep');
          setScores({
            job_competence: existing.job_competence,
            productivity_responsibility: existing.productivity_responsibility,
            communication_teamwork: existing.communication_teamwork,
            professionalism_discipline: existing.professionalism_discipline,
            initiative_improvement: existing.initiative_improvement
          });
          setDeductionDetails({
            unapproved_absence: existing.total_deduction || 0,
            late_attendance: 0,
            misconduct: 0,
            protocol_violation: 0,
            written_warning: 0
          });
          if (existing.rating) {
            setLocationStats(prev => ({
              ...prev,
              originalAppraisalRating: existing.rating
            }));
          }
        } else {
          setEditingAppraisalId(null);
          setScores({
            job_competence: 0,
            productivity_responsibility: 0,
            communication_teamwork: 0,
            professionalism_discipline: 0,
            initiative_improvement: 0
          });
          setDeductionDetails({
            unapproved_absence: 0,
            late_attendance: 0,
            misconduct: 0,
            protocol_violation: 0,
            written_warning: 0
          });
          setDepartmentStats(prev => ({
            ...prev,
            originalAppraisalScore: null
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load existing appraisal draft', err);
    }
  };

  // Score Calculations
  const performanceTotal = 
    Number(scores.job_competence) +
    Number(scores.productivity_responsibility) +
    Number(scores.communication_teamwork) +
    Number(scores.professionalism_discipline) +
    Number(scores.initiative_improvement);

  const marksObtained = Math.max(0, performanceTotal - Number(totalDeduction));
  // Score basis: (marks * 3) / 100 e.g. 100 marks -> 3.00, 99 marks -> 2.97
  const finalScore = Number(((marksObtained * 3.0) / 100.0).toFixed(2));
  const finalScoreFormatted = ((marksObtained * 3.0) / 100.0).toFixed(2);

  const getRatingText = (score) => {
    return `${finalScoreFormatted} / 3.0`;
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

  const handleDetailDeductionChange = (field, value) => {
    const num = Number(value);
    let errors = { ...validationErrors };
    
    if (value === '' || isNaN(num) || num < 0) {
      errors.deductions = 'Deductions cannot be negative';
    } else {
      errors.deductions = null;
    }
    setValidationErrors(errors);

    const val = value === '' ? 0 : Math.max(0, num);
    setDeductionDetails(prev => ({ ...prev, [field]: val }));
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

    if (totalDeduction < 0) {
      errors.deductions = 'Required score >= 0';
      isValid = false;
    }

    // Check department-wise score limits
    const currentMarks = Math.max(0, performanceTotal - totalDeduction);
    const currentScore = Number(((currentMarks * 3.0) / 100.0).toFixed(2));
    const isManagerPool = (department && (department.trim().toLowerCase().includes('manager pool') || department.trim().toLowerCase().includes('manger pool'))) ||
                          (location && (location.trim().toLowerCase().includes('manager pool') || location.trim().toLowerCase().includes('manger pool')));
    
    if (departmentStats.activeStaff > 0 && !isManagerPool) {
      const activeCount = departmentStats.activeStaff;
      let thresholdScore = 2.25;
      let thresholdMarks = 75;
      let thresholdLabel = '2.25 - 3.0 (75% - 100%)';
      let maxAllowed = 10;
      let ruleDesc = '';

      if (activeCount <= 10) {
        thresholdScore = 2.70;
        thresholdMarks = 90;
        thresholdLabel = '2.7 - 3.0 (90% - 100%)';
        maxAllowed = Math.min(5, Math.ceil(activeCount * 0.5));
        ruleDesc = `teams with ≤ 10 staff (Max allowed: ${maxAllowed} out of ${activeCount} active staff for scores 2.70–3.00; remaining must be < 2.70 / < 90%)`;
      } else {
        thresholdScore = 2.25;
        thresholdMarks = 75;
        thresholdLabel = '2.25 - 3.0 (75% - 100%)';
        maxAllowed = Math.max(1, Math.ceil(activeCount * 0.5));
        ruleDesc = `teams with > 10 staff (Max allowed 50%: ${maxAllowed} out of ${activeCount} active staff for scores 2.25–3.00; remaining must be < 2.25 / < 75%)`;
      }

      const isCurrentRestricted = currentScore >= thresholdScore || currentMarks >= thresholdMarks;

      if (isCurrentRestricted) {
        const originalWasRestricted = departmentStats.originalAppraisalScore && departmentStats.originalAppraisalScore >= thresholdScore;
        const adjustedExisting = originalWasRestricted ? (departmentStats.existingRestricted || 0) - 1 : (departmentStats.existingRestricted || 0);

        if (adjustedExisting >= maxAllowed) {
          errors.ratingLimit = `Score Limit Exceeded: Only ${maxAllowed} out of ${activeCount} active staff in ${location ? `location '${location}'` : `department '${department}'`} can receive ${thresholdLabel}. Already assigned: ${adjustedExisting}. Please assign a score less than ${thresholdScore} (< ${thresholdMarks}%).`;
          isValid = false;
        }
      }
    }

    setValidationErrors(errors);
    return { isValid, errors };
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors } = validateForm();
    if (!isValid) {
      const errMsg = errors.ratingLimit || 'Please correct validation errors on the form.';
      triggerToast(errMsg, 'error');
      return;
    }

    if (user && user.role === 'department_admin' && String(employeeCode).trim().toLowerCase() === String(user.username).trim().toLowerCase()) {
      triggerToast('Self-appraisal is not permitted. You cannot submit an appraisal for yourself.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_code: employeeCode,
        employee_name: employeeName,
        department,
        location,
        branch: branch || selectedBranch || '',
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
        setDeductionDetails({
          unapproved_absence: 0,
          late_attendance: 0,
          misconduct: 0,
          protocol_violation: 0,
          written_warning: 0
        });
        setEditingAppraisalId(null);
        
        fetchMySubmissions(employeeCode);
        fetchEmployeeDetails(employeeCode);
        setActiveTab('list');
      } else {
        let errMsg = 'Failed to submit form';
        if (result.non_field_errors && result.non_field_errors.length > 0) {
          errMsg = result.non_field_errors[0];
        } else if (result.detail) {
          errMsg = result.detail;
        } else if (result.error) {
          errMsg = result.error;
        } else {
          const keys = Object.keys(result);
          if (keys.length > 0) {
            const firstErr = result[keys[0]];
            errMsg = Array.isArray(firstErr) ? `${keys[0]}: ${firstErr[0]}` : `${keys[0]}: ${firstErr}`;
          }
        }
        triggerToast(errMsg, 'error');
      }
    } catch (err) {
      triggerToast('Network error submitting appraisal.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDraft = async (appraisal) => {
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
    setDeductionDetails({
      unapproved_absence: appraisal.total_deduction || 0,
      late_attendance: 0,
      misconduct: 0,
      protocol_violation: 0,
      written_warning: 0
    });
    
    setEmployeeCode(appraisal.employee_code);
    setEmployeeName(appraisal.employee_name);
    setDepartment(appraisal.department);
    setLocation(appraisal.location || '');
    setDesignation(appraisal.designation);
    setDateOfJoining(appraisal.date_of_joining);
    setAssignmentPeriod(appraisal.assignment_period);

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/fetch/?code=${appraisal.employee_code}`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        const useLocCount = data.location && data.location_total_active > 0;
        setDepartmentStats({
          activeStaff: useLocCount ? data.location_total_active : (data.department_total_active || 0),
          existingRestricted: data.scope_existing_restricted !== undefined ? data.scope_existing_restricted : (useLocCount ? data.location_existing_ab : (data.department_existing_ab || 0)),
          originalAppraisalScore: appraisal.final_score
        });
      }
    } catch (err) {
      console.error('Error fetching department stats for draft edit', err);
    }
    
    setActiveTab('form');
    triggerToast('Draft appraisal loaded! Make changes and submit.');
  };

  const handleApproveDraft = async (appraisalId) => {
    if (!window.confirm("Once approved, you can no longer edit this appraisal. Do you want to finalize now?")) return;

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/appraisals/${appraisalId}/approve/?employee_code=${employeeCode}`, {
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
    const activePeriodObj = incentivePeriods.find(p => p.is_active);
    const activePeriodName = activePeriodObj ? activePeriodObj.name : '';
    const printPeriod = (appraisal.assignment_period && !['Annual', 'Monthly', 'Quarterly', 'Semi-Annual'].includes(appraisal.assignment_period))
      ? appraisal.assignment_period
      : (activePeriodName || appraisal.assignment_period || 'July -- Sep');

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
            <img src="/iqraa-logo.png" alt="IQRAA International Hospital & Research Centre" style="height: 48px; margin-bottom: 8px; object-fit: contain;" />
            <div class="title">PERFORMANCE APPRAISAL FORM</div>
          </div>
          <div class="grid">
            <div class="grid-cell"><strong>Employee Code:</strong> ${appraisal.employee_code}</div>
            <div class="grid-cell"><strong>Employee Name:</strong> ${appraisal.employee_name}</div>
            <div class="grid-cell"><strong>Department:</strong> ${appraisal.department}</div>
            <div class="grid-cell"><strong>Location:</strong> ${appraisal.location || ''}</div>
            <div class="grid-cell"><strong>Designation:</strong> ${appraisal.designation}</div>
            <div class="grid-cell"><strong>Date of Joining:</strong> ${appraisal.date_of_joining}</div>
            <div class="grid-cell"><strong>Incentive Period:</strong> ${printPeriod}</div>
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

  // Filter lists for cascading dropdown selectors
  const isDeptAdmin = Boolean(user && user.role === 'department_admin');
  const adminDepts = (isDeptAdmin && Array.isArray(user.departments))
    ? user.departments
    : [];
  const empDepts = [...new Set(allEmployees.flatMap(e => (e.department || '').split(',').map(s => s.trim())))].filter(Boolean);
  const departmentsList = isDeptAdmin
    ? [...new Set(adminDepts)].sort()
    : [...new Set([...adminDepts, ...empDepts])].sort();
  const filteredDepartmentsList = departmentsList.filter(d => 
    d.toLowerCase().includes(deptQuery.toLowerCase())
  );

  const adminLocs = (isDeptAdmin && Array.isArray(user.locations))
    ? user.locations
    : [];
  const empLocs = selectedDept
    ? [...new Set(
        allEmployees
          .filter(e => (e.department || '').split(',').map(s => s.trim().toLowerCase()).includes(selectedDept.trim().toLowerCase()))
          .flatMap(e => (e.location || '').split(',').map(s => s.trim()))
      )].filter(Boolean)
    : [];
  const metaDeptLocs = (metaLocationsMap && selectedDept && metaLocationsMap[selectedDept]) || [];
  
  // For department admin logins, strictly only show the locations tagged in their admin login.
  // If no locations are tagged, show [] (empty) so untagged admins see nothing.
  const locationsList = isDeptAdmin
    ? [...new Set(adminLocs)].sort()
    : [...new Set([...empLocs, ...metaDeptLocs, ...adminLocs])].sort();

  const filteredLocationsList = locationsList.filter(l => 
    l.toLowerCase().includes(locQuery.toLowerCase())
  );

  const adminBranches = (isDeptAdmin && Array.isArray(user.branches))
    ? user.branches
    : [];
  const hasBranchAccess = !isDeptAdmin || (adminBranches.length > 0 && (!selectedBranch || adminBranches.includes(selectedBranch)));

  const loggedInCode = (user && user.username) ? String(user.username).trim().toLowerCase() : '';
  const normalizeLoc = (str) => (str || '').replace(/^na[\\/]+/i, '').trim().toLowerCase();

  const filteredEmployeesList = (selectedDept && hasBranchAccess)
    ? allEmployees
        .filter(e => {
          const depts = (e.department || '').split(',').map(s => s.trim().toLowerCase());
          if (!depts.includes(selectedDept.trim().toLowerCase())) return false;
          
          if (selectedLoc) {
            const selRaw = selectedLoc.trim().toLowerCase();
            const selClean = normalizeLoc(selectedLoc);
            const locs = (e.location || '').split(',').map(s => s.trim());
            return locs.some(l => {
              const lRaw = l.toLowerCase();
              const lClean = normalizeLoc(l);
              return lRaw === selRaw || lClean === selClean || lRaw === selClean || lClean === selRaw;
            });
          }
          return true;
        })
        .filter(e => !loggedInCode || String(e.employee_code).trim().toLowerCase() !== loggedInCode)
        .sort((a, b) => String(a.employee_code).localeCompare(String(b.employee_code)))
    : [];
  const finalEmployeesList = filteredEmployeesList.filter(emp => {
    const code = String(emp.employee_code).toLowerCase();
    const name = String(emp.name).toLowerCase();
    const query = empQuery.toLowerCase();
    return code.includes(query) || name.includes(query);
  });

  const ratingText = getRatingText(finalScore);

  const isManagerPool = (department && (department.trim().toLowerCase().includes('manager pool') || department.trim().toLowerCase().includes('manger pool'))) ||
                        (location && (location.trim().toLowerCase().includes('manager pool') || location.trim().toLowerCase().includes('manger pool')));

  const activeCount = departmentStats.activeStaff || 0;
  let thresholdScore = 2.25;
  let thresholdMarks = 75;
  let thresholdLabel = '2.25 - 3.0 (75% - 100%)';
  let maxAllowed = 10;
  let ruleDesc = '';

  if (activeCount <= 10) {
    thresholdScore = 2.70;
    thresholdMarks = 90;
    thresholdLabel = '2.7 - 3.0 (90% - 100%)';
    maxAllowed = Math.min(5, Math.ceil(activeCount * 0.5));
    ruleDesc = `Staff ≤ 10: Max ${maxAllowed} of ${activeCount} staff can receive 2.70–3.00 (others < 2.70)`;
  } else {
    thresholdScore = 2.25;
    thresholdMarks = 75;
    thresholdLabel = '2.25 - 3.0 (75% - 100%)';
    maxAllowed = Math.max(1, Math.ceil(activeCount * 0.5));
    ruleDesc = `Staff > 10: Max 50% (${maxAllowed} of ${activeCount} staff) can receive 2.25–3.00 (≥ 75%)`;
  }

  const isCurrentRestricted = finalScore >= thresholdScore || marksObtained >= thresholdMarks;
  const originalWasRestricted = departmentStats.originalAppraisalScore && departmentStats.originalAppraisalScore >= thresholdScore;
  const adjustedExisting = originalWasRestricted ? (departmentStats.existingRestricted || 0) - 1 : (departmentStats.existingRestricted || 0);
  const isLimitExceeded = isCurrentRestricted && (activeCount > 0) && (adjustedExisting >= maxAllowed) && !isManagerPool;

  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px', transition: 'all 0.3s ease' }}>
      
      {/* Toast notifications */}
      {toast && (
        <div className={`alert-toast alert-${toast.type}`} style={{ zIndex: 1000, animation: 'fadeIn 0.2s ease-in-out' }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* STICKY TAB HEADER: Always visible */}
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

      {activeTab === 'form' && !(employeeName || initialCode) && (
        <div 
          style={{ 
            marginBottom: '24px', 
            padding: '40px', 
            backgroundColor: '#ffffff', 
            border: `1px solid ${borderLight}`,
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            maxWidth: '500px',
            margin: '0 auto 24px'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: lightBlueBg, color: primaryBlue, marginBottom: '16px' }}>
              <User size={32} />
            </div>
            <h2 style={{ fontSize: '22px', marginBottom: '8px', color: textDark, fontWeight: '700' }}>Employee Appraisal Access</h2>
            <p style={{ color: textMedium, fontSize: '14px', marginBottom: '24px' }}>
              Select your department, location, and name to access your evaluation form.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loadingEmployees ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <span className="spinner"></span>
              </div>
            ) : (
              <>
                <div className="form-group" style={{ textAlign: 'left', marginBottom: 0, position: 'relative' }}>
                  <label className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type or select department..."
                      value={deptQuery}
                      onChange={(e) => {
                        setDeptQuery(e.target.value);
                        setShowDeptDropdown(true);
                      }}
                      onFocus={() => setShowDeptDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setDeptQuery(selectedDept || '');
                          setShowDeptDropdown(false);
                        }, 200);
                      }}
                      style={{ fontSize: '13px', padding: '8px 36px 8px 12px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                    />
                    <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: textMedium, pointerEvents: 'none' }} />
                  </div>
                  {showDeptDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: `1px solid ${borderLight}`,
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {filteredDepartmentsList.length > 0 ? (
                        filteredDepartmentsList.map(d => (
                          <div
                            key={d}
                            onMouseDown={() => {
                              setSelectedDept(d);
                              setDeptQuery(d);
                              setShowDeptDropdown(false);
                              setSelectedLoc('');
                              setLocQuery('');
                              setSelectedEmpCode('');
                              setEmpQuery('');
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#000000',
                              backgroundColor: selectedDept === d ? lightBlueBg : 'transparent',
                              transition: 'background-color 0.1s ease',
                              textAlign: 'left'
                            }}
                          >
                            {d}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '10px 12px', fontSize: '13px', color: textMedium, textAlign: 'left' }}>
                          {isDeptAdmin && adminDepts.length === 0 ? 'No departments assigned to your account' : 'No departments found'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ textAlign: 'left', marginBottom: 0, position: 'relative' }}>
                  <label className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={
                        isDeptAdmin && adminLocs.length === 0
                          ? "No locations assigned to your account"
                          : selectedDept
                            ? "Type or select location..."
                            : "Select department first"
                      }
                      value={locQuery}
                      onChange={(e) => {
                        setLocQuery(e.target.value);
                        setShowLocDropdown(true);
                      }}
                      onFocus={() => { if (selectedDept) setShowLocDropdown(true); }}
                      onClick={() => { if (selectedDept) setShowLocDropdown(true); }}
                      onBlur={() => {
                        setTimeout(() => {
                          setLocQuery(selectedLoc || '');
                          setShowLocDropdown(false);
                        }, 200);
                      }}
                      disabled={!selectedDept || (isDeptAdmin && adminLocs.length === 0)}
                      style={{ fontSize: '13px', padding: '8px 36px 8px 12px', color: '#000000', backgroundColor: selectedDept && (!isDeptAdmin || adminLocs.length > 0) ? '#ffffff' : '#f1f5f9', borderColor: borderLight, cursor: selectedDept ? 'pointer' : 'default' }}
                    />
                    <ChevronDown size={16} onClick={() => { if (selectedDept && (!isDeptAdmin || adminLocs.length > 0)) setShowLocDropdown(prev => !prev); }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: textMedium, cursor: 'pointer' }} />
                  </div>
                  {showLocDropdown && selectedDept && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: `1px solid ${borderLight}`,
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {filteredLocationsList.length > 0 ? (
                        filteredLocationsList.map(l => (
                          <div
                            key={l}
                            onMouseDown={() => {
                              setSelectedLoc(l);
                              setLocQuery(l);
                              setShowLocDropdown(false);
                              setSelectedEmpCode('');
                              setEmpQuery('');
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#000000',
                              backgroundColor: selectedLoc === l ? lightBlueBg : 'transparent',
                              transition: 'background-color 0.1s ease',
                              textAlign: 'left'
                            }}
                          >
                            {l}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '10px 12px', fontSize: '13px', color: textMedium, textAlign: 'left' }}>
                          {isDeptAdmin && adminLocs.length === 0 ? 'No locations assigned to your account' : 'No locations found'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ textAlign: 'left', marginBottom: 0, position: 'relative' }}>
                  <label className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee Code & Name</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={selectedDept ? "Type to search by code or name..." : "Select department first"}
                      value={empQuery}
                      onChange={(e) => {
                        setEmpQuery(e.target.value);
                        setShowEmpDropdown(true);
                      }}
                      onFocus={() => { if (selectedDept) setShowEmpDropdown(true); }}
                      onBlur={() => {
                        setTimeout(() => {
                          const chosenEmp = filteredEmployeesList.find(e => e.employee_code === selectedEmpCode);
                          setEmpQuery(chosenEmp ? `${chosenEmp.employee_code} - ${chosenEmp.name}` : '');
                          setShowEmpDropdown(false);
                        }, 200);
                      }}
                      disabled={!selectedDept}
                      style={{ fontSize: '13px', padding: '8px 36px 8px 12px', color: '#000000', backgroundColor: selectedDept ? '#ffffff' : '#f1f5f9', borderColor: borderLight }}
                    />
                    <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: textMedium, pointerEvents: 'none' }} />
                  </div>
                  {showEmpDropdown && selectedDept && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: `1px solid ${borderLight}`,
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {finalEmployeesList.length > 0 ? (
                        finalEmployeesList.map(emp => (
                          <div
                            key={emp.employee_code}
                            onMouseDown={() => {
                              setSelectedEmpCode(emp.employee_code);
                              setEmployeeCode(emp.employee_code);
                              setEmpQuery(`${emp.employee_code} - ${emp.name}`);
                              setShowEmpDropdown(false);
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#000000',
                              backgroundColor: selectedEmpCode === emp.employee_code ? lightBlueBg : 'transparent',
                              transition: 'background-color 0.1s ease',
                              textAlign: 'left'
                            }}
                          >
                            <strong>{emp.employee_code}</strong> - {emp.name}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '10px 12px', fontSize: '13px', color: textMedium, textAlign: 'left' }}>No active employees found</div>
                      )}
                    </div>
                  )}
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={() => fetchEmployeeDetails(selectedEmpCode)} 
                  disabled={fetching || !selectedEmpCode}
                  style={{ backgroundColor: primaryBlue, borderColor: primaryBlue, width: '100%', marginTop: '8px', padding: '10px 16px', fontWeight: '600' }}
                >
                  {fetching ? 'Searching...' : 'Go to Form'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'form' && (employeeName || initialCode) && (
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'start' }}>
                    
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={iqraaLogo} alt="IQRAA Hospital" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
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
                              disabled={!isAdmin || (!!initialCode && !editingAppraisalId)}
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
                          <label htmlFor="form_dept" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Department</label>
                          <input
                            type="text"
                            id="form_dept"
                            list="appraisal-dept-datalist"
                            className="form-control"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            required
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          />
                          <datalist id="appraisal-dept-datalist">
                            {metaDepartments.map(d => (
                              <option key={d} value={d} />
                            ))}
                          </datalist>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_loc" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Location</label>
                          <input
                            type="text"
                            id="form_loc"
                            list="appraisal-loc-datalist"
                            className="form-control"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            required
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          />
                          <datalist id="appraisal-loc-datalist">
                            {(department && metaLocationsMap[department] ? metaLocationsMap[department] : metaLocations).map(l => (
                              <option key={l} value={l} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div className="grid-cols-2" style={{ gap: '12px', marginBottom: '12px' }}>
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
                      </div>

                      <div className="grid-cols-2" style={{ gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="form_period" className="form-label" style={{ color: textMedium, fontSize: '12px', fontWeight: '600' }}>Incentive Period</label>
                          <select 
                            id="form_period"
                            className="form-control" 
                            value={assignmentPeriod || activePeriodName || 'July -- Sep'} 
                            onChange={(e) => setAssignmentPeriod(e.target.value)}
                            style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                          >
                            {incentivePeriods.length > 0 ? (
                              incentivePeriods.map(p => (
                                <option key={p.id} value={p.name}>{p.name}{p.is_active ? ' (Active)' : ''}</option>
                              ))
                            ) : (
                              <>
                                {activePeriodName && <option value={activePeriodName}>{activePeriodName} (Active)</option>}
                                <option value="July -- Sep">July -- Sep (Active)</option>
                              </>
                            )}
                            {assignmentPeriod && !incentivePeriods.some(p => p.name === assignmentPeriod) && (
                              <option value={assignmentPeriod}>{assignmentPeriod}</option>
                            )}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          {/* Balanced empty spacing */}
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

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: textMedium }}>
                          <span>Net Marks Obtained:</span>
                          <strong style={{ color: textDark }}>{marksObtained} / 100</strong>
                        </div>

                        <div style={{ borderTop: `1px solid ${borderLight}`, paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: textDark, display: 'block' }}>Final Score (L3):</span>
                            <span style={{ fontSize: '11px', color: textMedium }}>(marks × 3 / 100)</span>
                          </div>
                          <span style={{ fontSize: '28px', fontWeight: '800', color: primaryBlue, fontFamily: 'Outfit' }}>{finalScoreFormatted}</span>
                        </div>

                        {activeCount > 0 && (
                          <div style={{ borderTop: `1px dashed ${borderLight}`, paddingTop: '12px', marginTop: '12px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: textMedium, marginBottom: '4px' }}>
                              <span>{location ? 'Loc Active Staff:' : 'Dept Active Staff:'}</span>
                              <strong style={{ color: textDark }}>{activeCount}</strong>
                            </div>
                            {!isManagerPool ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: textMedium, marginBottom: '4px' }}>
                                  <span>{thresholdLabel} Limit:</span>
                                  <strong style={{ color: textDark }}>{maxAllowed}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: textMedium }}>
                                  <span>Assigned ({thresholdLabel}):</span>
                                  <strong style={{ color: textDark }}>{adjustedExisting}</strong>
                                </div>
                              </>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: textMedium }}>
                                <span>Score Limit:</span>
                                <strong style={{ color: '#16a34a' }}>No Limit (Manager Pool)</strong>
                              </div>
                            )}
                          </div>
                        )}
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
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: primaryBlue, fontWeight: '700', letterSpacing: '0.05em' }}>Assessment Score (Level 3)</span>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: textDark, marginTop: '2px' }}>
                          {ratingText}
                        </div>

                        {isLimitExceeded && (
                          <div 
                            style={{ 
                              marginTop: '12px', 
                              padding: '12px', 
                              borderRadius: '6px', 
                              backgroundColor: '#fee2e2', 
                              border: '1px solid #fca5a5',
                              color: '#b91c1c',
                              fontSize: '11px',
                              textAlign: 'left',
                              display: 'flex',
                              gap: '6px',
                              alignItems: 'flex-start'
                            }}
                          >
                            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#dc2626' }} />
                            <div>
                              <strong style={{ display: 'block', marginBottom: '2px' }}>Score Limit Exceeded</strong>
                              Under the rule ({ruleDesc}), in {location ? 'location' : 'department'} <strong>{location || department}</strong> only <strong>{maxAllowed}</strong> staff can receive scores in {thresholdLabel}. Already assigned: <strong>{adjustedExisting}</strong>. Please assign a score less than {thresholdScore} (&lt; {thresholdMarks}%).
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Previous Appraisals & Progress History Widget */}
                      <div style={{ marginTop: '16px', borderTop: `1px solid ${borderLight}`, paddingTop: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: textDark, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TrendingUp size={14} color="#0066ff" />
                            <span>Previous Appraisals &amp; Progress History ({empHistory.length})</span>
                          </span>
                          {loadingEmpHistory && (
                            <span style={{ fontSize: '11px', color: textMedium }}>Loading...</span>
                          )}
                        </div>

                        {empHistory.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: `1px dashed ${borderLight}`, color: textMedium, fontSize: '11.5px' }}>
                            {loadingEmpHistory ? 'Loading history...' : 'No previous appraisals recorded (First Evaluation / Baseline)'}
                          </div>
                        ) : (
                          <>
                            {/* Performance Progress Graph / Comparison Bars */}
                            {(() => {
                              const previousAppr = empHistory.find(h => h.id !== editingAppraisalId) || empHistory[0];
                              const currentScoreNum = Number(finalScoreFormatted) || 0;
                              const prevScoreNum = Number(previousAppr?.final_score) || 0;
                              const scoreDiff = previousAppr ? Number((currentScoreNum - prevScoreNum).toFixed(2)) : null;
                              const markDiff = previousAppr && previousAppr.marks_obtained !== undefined ? (marksObtained - previousAppr.marks_obtained) : null;
                              
                              return (
                                <div style={{ backgroundColor: '#f8fafc', border: `1px solid ${borderLight}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: textDark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Score Progress Graph
                                    </span>
                                    {scoreDiff !== null && previousAppr.id !== editingAppraisalId && (
                                      <span style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '3px', 
                                        fontSize: '11px', 
                                        fontWeight: '700',
                                        color: scoreDiff >= 0 ? '#059669' : '#dc2626',
                                        backgroundColor: scoreDiff >= 0 ? '#ecfdf5' : '#fef2f2',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                      }}>
                                        {scoreDiff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff} pts {markDiff !== null ? `(${markDiff >= 0 ? `+${markDiff}` : markDiff} marks)` : ''} vs Prev
                                      </span>
                                    )}
                                  </div>

                                  {/* Live Current Form Bar */}
                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                                      <span style={{ fontWeight: '700', color: primaryBlue }}>
                                        Current: {assignmentPeriod || 'July -- Sep'}
                                      </span>
                                      <span style={{ fontWeight: '700', color: primaryBlue }}>
                                        {marksObtained} / 100 ({finalScoreFormatted} / 3.0)
                                      </span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ 
                                        width: `${Math.min(100, Math.max(0, (currentScoreNum / 3.0) * 100))}%`, 
                                        height: '100%', 
                                        backgroundColor: primaryBlue,
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease'
                                      }} />
                                    </div>
                                  </div>

                                  {/* Previous Appraisals Bars */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {empHistory.map((hist, hIdx) => {
                                      const hScore = Number(hist.final_score || 0);
                                      const hTier = getScoreTierInfo(hScore);
                                      const isCurrEditing = hist.id === editingAppraisalId;
                                      if (isCurrEditing) return null;
                                      return (
                                        <div key={hist.id || hIdx}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                                            <span style={{ color: textDark, fontWeight: '600' }}>
                                              {hist.assignment_period || 'Previous Period'}
                                            </span>
                                            <span style={{ fontWeight: '700', color: hTier.color }}>
                                              {hist.marks_obtained !== undefined ? `${hist.marks_obtained} marks ` : ''}({hScore.toFixed(2)} / 3.0)
                                            </span>
                                          </div>
                                          <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ 
                                              width: `${Math.min(100, Math.max(0, (hScore / 3.0) * 100))}%`, 
                                              height: '100%', 
                                              backgroundColor: hTier.color,
                                              borderRadius: '4px'
                                            }} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Previous Appraisals Table */}
                            <div style={{ 
                              border: `1px solid ${borderLight}`, 
                              borderRadius: '6px', 
                              overflowX: 'auto',
                              backgroundColor: '#ffffff'
                            }}>
                              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left', minWidth: '420px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${borderLight}` }}>
                                    <th style={{ padding: '6px 8px', fontWeight: '700', color: textDark }}>Period</th>
                                    <th style={{ padding: '6px 8px', fontWeight: '700', color: textDark, textAlign: 'center' }}>Score (3.0)</th>
                                    <th style={{ padding: '6px 8px', fontWeight: '700', color: textDark, textAlign: 'center' }}>Marks</th>
                                    <th style={{ padding: '6px 8px', fontWeight: '700', color: textDark, textAlign: 'center' }}>Deductions</th>
                                    <th style={{ padding: '6px 8px', fontWeight: '700', color: textDark, textAlign: 'center' }}>Rating Tier</th>
                                    <th style={{ padding: '6px 8px', fontWeight: '700', color: textDark }}>Date</th>
                                    <th style={{ padding: '6px 8px', fontWeight: '700', color: textDark, textAlign: 'center' }}>Progress</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {empHistory.map((appr, idx) => {
                                    const t = getScoreTierInfo(appr.final_score);
                                    const olderAppr = empHistory[idx + 1];
                                    const scoreDiff = olderAppr ? Number((appr.final_score - olderAppr.final_score).toFixed(2)) : null;
                                    const isCurr = appr.id === editingAppraisalId;
                                    return (
                                      <tr key={appr.id || idx} style={{ borderBottom: idx === empHistory.length - 1 ? 'none' : `1px solid ${borderLight}`, backgroundColor: isCurr ? '#f0f9ff' : 'transparent' }}>
                                        <td style={{ padding: '6px 8px', fontWeight: '600', color: textDark, whiteSpace: 'nowrap' }}>
                                          {appr.assignment_period || 'Annual'}
                                          {idx === 0 && (
                                            <span style={{ marginLeft: '4px', fontSize: '9px', backgroundColor: '#dbeafe', color: '#1e40af', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                                              Latest
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', color: primaryBlue }}>
                                          {Number(appr.final_score || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', color: '#00b87c' }}>
                                          {appr.marks_obtained !== undefined ? appr.marks_obtained : '-'}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', color: appr.total_deduction > 0 ? '#ef4444' : textMedium }}>
                                          {appr.total_deduction ? `-${appr.total_deduction}` : '0'}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                          {appr.rating && appr.rating.includes('(') ? (
                                            <span 
                                              style={{ 
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: appr.rating.includes('(A)') ? '#ecfdf5' : appr.rating.includes('(B)') ? '#eff6ff' : appr.rating.includes('(C)') ? '#f5f3ff' : appr.rating.includes('(D)') ? '#fff7ed' : '#fef2f2',
                                                color: appr.rating.includes('(A)') ? '#00b87c' : appr.rating.includes('(B)') ? '#0066ff' : appr.rating.includes('(C)') ? '#8b5cf6' : appr.rating.includes('(D)') ? '#f97316' : '#ef4444',
                                                border: `1px solid ${appr.rating.includes('(A)') ? '#a7f3d0' : appr.rating.includes('(B)') ? '#bfdbfe' : appr.rating.includes('(C)') ? '#ddd6fe' : appr.rating.includes('(D)') ? '#fed7aa' : '#fecaca'}`,
                                                fontWeight: 700
                                              }}
                                            >
                                              {appr.rating}
                                            </span>
                                          ) : t ? (
                                            <span 
                                              style={{ 
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: t.bg,
                                                color: t.color,
                                                border: `1px solid ${t.border}`,
                                                fontWeight: 700
                                              }}
                                            >
                                              {t.label}
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td style={{ padding: '6px 8px', color: textMedium, fontSize: '10.5px', whiteSpace: 'nowrap' }}>
                                          {appr.submitted_date ? new Date(appr.submitted_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                          {scoreDiff !== null ? (
                                            scoreDiff > 0 ? (
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#059669', fontSize: '10px', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '1px 5px', borderRadius: '4px' }}>
                                                <TrendingUp size={10} />
                                                +{scoreDiff}
                                              </span>
                                            ) : scoreDiff < 0 ? (
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#dc2626', fontSize: '10px', fontWeight: 700, backgroundColor: '#fef2f2', padding: '1px 5px', borderRadius: '4px' }}>
                                                <TrendingDown size={10} />
                                                {scoreDiff}
                                              </span>
                                            ) : (
                                              <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 600 }}>0.00</span>
                                            )
                                          ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic' }}>Baseline</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
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
                            <th style={{ color: textDark, width: '120px', textAlign: 'center' }}>Deduction Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Unapproved absence</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-2 marks/day</td>
                            <td style={{ color: '#000000' }}>Absence without written request or valid medical justification.</td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number"
                                className="form-control"
                                min="0"
                                value={deductionDetails.unapproved_absence}
                                onChange={(e) => handleDetailDeductionChange('unapproved_absence', e.target.value)}
                                style={{ width: '80px', textAlign: 'center', fontWeight: '600', padding: '4px 6px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                              />
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Late/early attendance</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-1 mark</td>
                            <td style={{ color: '#000000' }}>If the employee has &gt;3 instances of unexcused late/early checkouts.</td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number"
                                className="form-control"
                                min="0"
                                value={deductionDetails.late_attendance}
                                onChange={(e) => handleDetailDeductionChange('late_attendance', e.target.value)}
                                style={{ width: '80px', textAlign: 'center', fontWeight: '600', padding: '4px 6px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                              />
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Misconduct</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-2 to -5 marks</td>
                            <td style={{ color: '#000000' }}>Deduct according to investigation findings and warning severity.</td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number"
                                className="form-control"
                                min="0"
                                value={deductionDetails.misconduct}
                                onChange={(e) => handleDetailDeductionChange('misconduct', e.target.value)}
                                style={{ width: '80px', textAlign: 'center', fontWeight: '600', padding: '4px 6px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                              />
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Protocol violation</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-3 marks/incident</td>
                            <td style={{ color: '#000000' }}>Verified violation of patient care, safety, or clinical SOPs.</td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number"
                                className="form-control"
                                min="0"
                                value={deductionDetails.protocol_violation}
                                onChange={(e) => handleDetailDeductionChange('protocol_violation', e.target.value)}
                                style={{ width: '80px', textAlign: 'center', fontWeight: '600', padding: '4px 6px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                              />
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: '500', color: '#000000' }}>Disciplinary written warning</td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>-5 marks</td>
                            <td style={{ color: '#000000' }}>Issued written caution during the appraisal cycle.</td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number"
                                className="form-control"
                                min="0"
                                value={deductionDetails.written_warning}
                                onChange={(e) => handleDetailDeductionChange('written_warning', e.target.value)}
                                style={{ width: '80px', textAlign: 'center', fontWeight: '600', padding: '4px 6px', color: '#000000', backgroundColor: '#ffffff', borderColor: borderLight }}
                              />
                            </td>
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
                        <span style={{ fontSize: '13px', color: textMedium, fontWeight: '700' }}>Calculated Total Deduction:</span>
                        {validationErrors.deductions && (
                          <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                            {validationErrors.deductions}
                          </span>
                        )}
                      </div>
                      <span 
                        style={{ 
                          fontSize: '22px', 
                          fontWeight: '800', 
                          color: '#ef4444', 
                          fontFamily: 'Outfit',
                          marginRight: '16px'
                        }}
                      >
                        -{totalDeduction}
                      </span>
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
                    {/* Score Scale Legend
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
                    </div> */}

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
      )}

      {activeTab === 'list' && (
            
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
              <h2 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: textDark, fontWeight: '750' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} style={{ color: primaryBlue }} />
                  <span>Submitted Appraisals History</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: primaryBlue, backgroundColor: lightBlueBg, padding: '3px 10px', borderRadius: '12px', border: `1px solid ${borderLight}` }}>
                  Total: {mySubmissions.length} {mySubmissions.length === 1 ? 'record' : 'records'}
                </span>
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
                  {employeeCode ? 'No appraisals submitted for this employee code yet.' : 'No appraisals submitted yet.'}
                </p>
              ) : (
                <div className="table-container">
                  <table className="data-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ color: textDark }}>Employee Code</th>
                        <th style={{ color: textDark }}>Staff Name</th>
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
                          <td style={{ fontWeight: '600', color: textDark }}>{sub.employee_code}</td>
                          <td style={{ fontWeight: '500', color: textDark }}>{sub.employee_name}</td>
                          <td style={{ color: textDark }}>{new Date(sub.submitted_date).toLocaleDateString()}</td>
                          <td style={{ color: textDark }}>{sub.assignment_period}</td>
                          <td style={{ textAlign: 'center', color: textDark }}>{sub.performance_score}</td>
                          <td style={{ textAlign: 'center', color: sub.total_deduction > 0 ? '#ef4444' : textDark }}>
                            -{sub.total_deduction}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: primaryBlue }}>{sub.final_score}</td>
                          <td>
                            <span className={`rating-badge ${getRatingBadgeClass(sub.rating)}`}>
                              {sub.rating ? (() => {
                                return sub.rating.includes('(') ? sub.rating.split('(')[1].split(')')[0] : sub.rating;
                              })() : ''}
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

    </div>
  );
}